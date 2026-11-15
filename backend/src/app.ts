import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import {
  contextRequestSchema,
  createSessionSchema,
  transcriptSchema,
} from "@welody/shared";
import type { Store } from "./store.js";
import { GenerationService } from "./services/generation.js";
import { distanceInMeters, isInsideGeofence } from "./services/geofence.js";
import { fetchCurrentWeather } from "./services/weather.js";
import type { SupabaseService } from "./services/supabase.js";
import type { GoogleAiService } from "./services/google-ai.js";

export function createApp(
  store: Store,
  generation: GenerationService,
  audioDirectory: string,
  supabase?: SupabaseService,
  demoMode = process.env.DEMO_MODE === "true",
  googleAi?: GoogleAiService,
): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      mode: demoMode ? "DEMO" : process.env.AI_PROVIDER === "google" ? "AI_CONFIGURED" : "SIMULATION",
      demoMode,
      persistence: demoMode ? "LOCAL" : process.env.PERSISTENCE_PROVIDER === "supabase" ? "SUPABASE" : "LOCAL",
    });
  });

  app.get("/api/demo/config", (_request, response) => {
    if (!demoMode) {
      return sendError(response, 404, "DEMO_MODE_DISABLED", "Demo presets are only available when DEMO_MODE=true.");
    }
    response.json({
      conversationText: "오늘 바다를 보러 와서 정말 좋다. 이렇게 같이 드라이브하니까 마음이 편안해. 다음에도 꼭 다시 오자.",
      preferredGenre: "Indie Pop",
      vehicle: { speedKmh: 58, drivingState: "MOVING" },
      location: { latitude: 37.5665, longitude: 126.978, heading: 150, accuracyMeters: 8 },
      weather: { temperatureCelsius: 18, condition: "CLEAR", precipitationMm: 0 },
      time: { localTime: "14:20", timeZone: "Asia/Seoul" },
      scenarios: [
        { name: "겨울밤 드라이브", preferredGenre: "Pop", speedKmh: 75, temperatureCelsius: -3, condition: "SNOW", localTime: "22:30", latitude: 37.5665, longitude: 126.978 },
        { name: "봄날의 햇살", preferredGenre: "Indie Pop", speedKmh: 45, temperatureCelsius: 20, condition: "CLEAR", localTime: "14:00", latitude: 37.5512, longitude: 126.9882 },
        { name: "비 내리는 밤", preferredGenre: "R&B", speedKmh: 30, temperatureCelsius: 10, condition: "RAIN", localTime: "23:00", latitude: 37.5796, longitude: 126.977 },
        { name: "고속도로", preferredGenre: "Rock", speedKmh: 110, temperatureCelsius: 18, condition: "CLEAR", localTime: "16:00", latitude: 37.5445, longitude: 127.055 },
      ],
    });
  });

  app.get("/api/providers/google/models", asyncRoute(async (_request, response) => {
    if (!googleAi || demoMode) {
      return sendError(response, 409, "GOOGLE_AI_DISABLED", "Google AI is disabled in Demo Mode.");
    }
    response.json(await googleAi.checkModelAccess());
  }));

  app.get("/api/audio/:filename", (request, response, next) => {
    const filename = getRouteParam(request, "filename");
    const match = filename.match(/^([0-9a-f-]{36})\.(wav|mp3)$/i);
    if (!match) {
      return sendError(response, 400, "INVALID_AUDIO_ID", "Audio file identifier is invalid.");
    }
    if (supabase) {
      void supabase.downloadAudio(match[1]!, match[2]!.toLowerCase() as "wav" | "mp3")
        .then((audio) => {
          response.type(match[2]!.toLowerCase() === "mp3" ? "audio/mpeg" : "audio/wav");
          response.send(audio);
        })
        .catch(next);
      return;
    }
    response.sendFile(resolve(audioDirectory, filename), (error) => {
      if (error) next(error);
    });
  });

  app.post("/api/sessions", asyncRoute(async (request, response) => {
    const input = createSessionSchema.parse(request.body);
    const session = {
      id: randomUUID(),
      preferredGenre: input.preferredGenre,
      source: input.source,
      startedAt: new Date().toISOString(),
    };
    store.sessions.unshift(session);
    await store.persist();
    response.status(201).json(session);
  }));

  app.post("/api/sessions/:id/transcript", asyncRoute(async (request, response) => {
    const input = transcriptSchema.parse(request.body);
    const session = findSession(store, getRouteParam(request, "id"));
    if (session.source === "PLEOS") {
      return sendError(response, 501, "PLEOS_NOT_CONFIGURED", "Pleos data providers are not configured.");
    }
    session.transcript = input.text;
    session.endedAt = new Date().toISOString();
    await store.persist();
    response.json({ accepted: true });
  }));

  app.post("/api/sessions/:id/context", asyncRoute(async (request, response) => {
    const { context } = contextRequestSchema.parse(request.body);
    const session = findSession(store, getRouteParam(request, "id"));
    session.context = context;
    await store.persist();
    response.json({ accepted: true, source: session.source });
  }));

  app.post("/api/sessions/:id/generate", asyncRoute(async (request, response) => {
    const session = findSession(store, getRouteParam(request, "id"));
    if (!session.transcript) {
      return sendError(response, 409, "TRANSCRIPT_REQUIRED", "Add a conversation before generating music.");
    }
    if (!session.context) {
      return sendError(response, 409, "CONTEXT_REQUIRED", "Save vehicle and environment context first.");
    }
    if (session.source !== "SIMULATOR") {
      return sendError(response, 501, "PLEOS_NOT_CONFIGURED", "Pleos data providers are not configured.");
    }
    const job = await generation.start(session);
    response.status(202).json({ jobId: job.id, status: job.status });
  }));

  app.get("/api/jobs/:id", (request, response) => {
    const id = getRouteParam(request, "id");
    const job = store.jobs.find((candidate) => candidate.id === id);
    if (!job) return sendError(response, 404, "JOB_NOT_FOUND", "Generation job was not found.");
    response.json(job);
  });

  app.get("/api/memories", (request, response) => {
    const memories = [...store.memories].sort(
      (left, right) => right.createdAt.localeCompare(left.createdAt),
    );
    response.json({ memories });
  });

  app.get("/api/memories/nearby", (request, response) => {
    const querySchema = z.object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      accuracyMeters: z.coerce.number().min(0).max(100_000).default(0),
      radiusMeters: z.coerce.number().min(10).max(5_000).default(150),
    });
    const query = querySchema.parse(request.query);
    const current = {
      latitude: query.latitude,
      longitude: query.longitude,
      accuracyMeters: query.accuracyMeters,
    };
    const memories = store.memories
      .map((memory) => ({
        ...memory,
        distanceMeters: Math.round(distanceInMeters(current, memory.location)),
      }))
      .filter((memory) =>
        isInsideGeofence(memory.distanceMeters, current.accuracyMeters, query.radiusMeters),
      )
      .sort((left, right) => left.distanceMeters - right.distanceMeters);
    response.json({ memories, radiusMeters: query.radiusMeters });
  });

  app.get("/api/memories/:id", (request, response) => {
    const memory = store.memories.find((candidate) => candidate.id === getRouteParam(request, "id"));
    if (!memory) return sendError(response, 404, "MEMORY_NOT_FOUND", "Music memory was not found.");
    response.json(memory);
  });

  app.delete("/api/memories/:id", asyncRoute(async (request, response) => {
    const id = getRouteParam(request, "id");
    const index = store.memories.findIndex((candidate) => candidate.id === id);
    if (index === -1) return sendError(response, 404, "MEMORY_NOT_FOUND", "Music memory was not found.");
    const memory = store.memories[index]!;
    const extension = memory.audioUrl.endsWith(".mp3") ? "mp3" : "wav";
    store.memories.splice(index, 1);
    store.removePlaybackForMemory(id);
    for (const job of store.jobs) {
      if (job.memoryId === id) job.memoryId = undefined;
    }
    if (supabase) {
      await store.persist();
      await supabase.deleteMemory(id, extension);
    } else {
      await store.persist();
      await rm(resolve(audioDirectory, `${id}.${extension}`), { force: true });
    }
    response.status(204).end();
  }));

  app.post("/api/memories/:id/playback", asyncRoute(async (request, response) => {
    const memory = store.memories.find((candidate) => candidate.id === getRouteParam(request, "id"));
    if (!memory) return sendError(response, 404, "MEMORY_NOT_FOUND", "Music memory was not found.");
    const body = z.object({ triggerType: z.enum(["MANUAL", "GEOFENCE"]) }).parse(request.body);
    const record = {
      id: randomUUID(),
      memoryId: memory.id,
      playedAt: new Date().toISOString(),
      triggerType: body.triggerType,
    };
    store.playbackHistory.unshift(record);
    await store.persist();
    response.status(201).json(record);
  }));

  app.get("/api/weather", asyncRoute(async (request, response) => {
    const query = z.object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
    }).parse(request.query);
    try {
      response.json(await fetchCurrentWeather(query.latitude, query.longitude));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown weather provider error";
      sendError(response, 502, "WEATHER_UNAVAILABLE", `Could not retrieve weather: ${message}`);
    }
  }));

  app.use(((error: unknown, _request: Request, response: Response, _next) => {
    if (error instanceof ApiHttpError) {
      return sendError(response, error.status, error.code, error.message);
    }
    if (error instanceof ZodError) {
      return sendError(response, 400, "INVALID_INPUT", error.issues.map((issue) =>
        `${issue.path.join(".") || "request"}: ${issue.message}`,
      ).join("; "));
    }
    if (
      error instanceof SyntaxError &&
      "type" in error &&
      error.type === "entity.parse.failed"
    ) {
      return sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
    }
    if (isNodeError(error) && error.code === "ENOENT") {
      return sendError(response, 404, "RESOURCE_NOT_FOUND", "Requested resource was not found.");
    }
    console.error("Unhandled API error:", error);
    return sendError(response, 500, "INTERNAL_ERROR", "An unexpected server error occurred.");
  }) satisfies ErrorRequestHandler);

  return app;
}

function findSession(store: Store, id: string) {
  const session = store.sessions.find((candidate) => candidate.id === id);
  if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session was not found.");
  return session;
}

function getRouteParam(request: Request, key: string): string {
  const value = request.params[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiHttpError(400, "INVALID_ROUTE", `Route parameter "${key}" is invalid.`);
  }
  return value;
}

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): Response {
  return response.status(status).json({ error: { code, message } });
}

class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<unknown>,
) {
  return (request: Request, response: Response, next: express.NextFunction) => {
    void handler(request, response).catch(next);
  };
}
