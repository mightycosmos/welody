import { randomUUID } from "node:crypto";
import type {
  GenerationJob,
  MusicMemory,
  MusicSession,
  PlaybackRecord,
} from "@welody/shared";

export interface DatabaseSnapshot {
  sessions: MusicSession[];
  memories: MusicMemory[];
  jobs: GenerationJob[];
  playbackHistory: PlaybackRecord[];
}

export class SupabaseService {
  private readonly origin: string;

  constructor(
    url: string,
    private readonly secretKey: string,
    private readonly bucket: string,
  ) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
      throw new Error("SUPABASE_URL must be an https Supabase project URL.");
    }
    if (!secretKey) throw new Error("A Supabase secret/service-role key is required.");
    this.origin = parsed.origin;
  }

  async loadSnapshot(): Promise<DatabaseSnapshot> {
    const [sessions, memories, jobs, playbackHistory] = await Promise.all([
      this.rest<Array<Record<string, unknown>>>("music_sessions?select=*"),
      this.rest<Array<Record<string, unknown>>>("music_memories?select=*"),
      this.rest<Array<Record<string, unknown>>>("generation_jobs?select=*"),
      this.rest<Array<Record<string, unknown>>>("playback_history?select=*"),
    ]);
    return {
      sessions: sessions.map(readSession),
      memories: memories.map(readMemory),
      jobs: jobs.map(readJob),
      playbackHistory: playbackHistory.map(readPlayback),
    };
  }

  async saveSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
    if (snapshot.sessions.length) {
      await this.upsert("music_sessions", snapshot.sessions.map(writeSession));
    }
    if (snapshot.memories.length) {
      await this.upsert("music_memories", snapshot.memories.map(writeMemory));
    }
    if (snapshot.jobs.length) {
      await this.upsert("generation_jobs", snapshot.jobs.map(writeJob));
    }
    if (snapshot.playbackHistory.length) {
      await this.upsert("playback_history", snapshot.playbackHistory.map(writePlayback));
    }
  }

  async uploadAudio(id: string, audio: Buffer, contentType: string): Promise<void> {
    await this.request(
      `/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeURIComponent(`${id}.${extensionFor(contentType)}`)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(audio),
      },
    );
  }

  async downloadAudio(id: string, extension: "mp3" | "wav"): Promise<Buffer> {
    const response = await this.request(
      `/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeURIComponent(`${id}.${extension}`)}`,
    );
    return Buffer.from(await response.arrayBuffer());
  }

  async deleteAudio(id: string, extension: "mp3" | "wav"): Promise<void> {
    await this.request(
      `/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeURIComponent(`${id}.${extension}`)}`,
      { method: "DELETE" },
    );
  }

  async deleteMemory(id: string, extension: "mp3" | "wav"): Promise<void> {
    await this.request(`/rest/v1/music_memories?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await this.deleteAudio(id, extension);
  }

  async verifyRoundTrip(): Promise<{ sessionId: string; memoryId: string; audioBytes: number }> {
    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const memoryId = randomUUID();
    const jobId = randomUUID();
    const playbackId = randomUUID();
    const analysis = {
      emotions: ["calm"],
      theme: "Supabase integration check",
      recommendedGenre: "Acoustic",
      tempo: "Slow",
      bpmTarget: 80,
      mood: "calm",
      instruments: ["piano"],
      vocalStyle: "soft",
      lyrics: {
        verse1: "A test line",
        chorus: "A test chorus",
        verse2: "A test verse",
        bridge: "A test bridge",
      },
      musicPrompt: "Integration verification only",
    };
    const session: MusicSession = {
      id: sessionId,
      preferredGenre: "Acoustic",
      source: "SIMULATOR",
      transcript: "Temporary integration test conversation",
      startedAt: now,
      endedAt: now,
      context: {
        vehicle: { speedKmh: 20, drivingState: "MOVING" },
        location: {
          latitude: 37.5665,
          longitude: 126.978,
          heading: 90,
          accuracyMeters: 8,
        },
        weather: { condition: "CLEAR", temperatureCelsius: 18 },
        time: { localTime: "14:20", timeZone: "Asia/Seoul", timestamp: now },
      },
    };
    const memory: MusicMemory = {
      id: memoryId,
      sessionId,
      title: "Supabase integration check",
      summary: "Temporary test record. Safe to delete.",
      lyrics: "Test verse\nTest chorus",
      genre: "Acoustic",
      audioUrl: `/api/audio/${memoryId}.wav`,
      source: "SIMULATOR",
      location: {
        latitude: 37.5665,
        longitude: 126.978,
        heading: 90,
        accuracyMeters: 8,
      },
      environment: {
        speedKmh: 20,
        temperatureCelsius: 18,
        weather: "CLEAR",
        timeOfDay: "AFTERNOON",
      },
      analysis,
      provider: "DEMO",
      createdAt: now,
    };
    const audio = Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt ", "binary");
    const job: GenerationJob = {
      id: jobId,
      sessionId,
      status: "COMPLETED",
      progress: 100,
      providerUsed: "DEMO",
      memoryId,
      startedAt: now,
      completedAt: now,
    };
    const playback: PlaybackRecord = {
      id: playbackId,
      memoryId,
      playedAt: now,
      triggerType: "MANUAL",
    };

    let sessionWritten = false;
    let memoryWritten = false;
    try {
      await this.upsert("music_sessions", [writeSession(session)]);
      sessionWritten = true;
      await this.upsert("music_memories", [writeMemory(memory)]);
      memoryWritten = true;
      await this.upsert("generation_jobs", [writeJob(job)]);
      await this.upsert("playback_history", [writePlayback(playback)]);
      await this.uploadAudio(memoryId, audio, "audio/wav");

      const readMemory = await this.rest<Array<Record<string, unknown>>>(
        `music_memories?id=eq.${memoryId}&select=*`,
      );
      const readSession = await this.rest<Array<Record<string, unknown>>>(
        `music_sessions?id=eq.${sessionId}&select=*`,
      );
      const readJobs = await this.rest<Array<Record<string, unknown>>>(
        `generation_jobs?id=eq.${jobId}&select=*`,
      );
      const readPlayback = await this.rest<Array<Record<string, unknown>>>(
        `playback_history?id=eq.${playbackId}&select=*`,
      );
      if (
        readMemory.length !== 1 ||
        readSession.length !== 1 ||
        readJobs.length !== 1 ||
        readPlayback.length !== 1 ||
        readMemory[0]?.lyrics !== memory.lyrics ||
        Number(readMemory[0]?.latitude) !== memory.location.latitude ||
        Number(readMemory[0]?.longitude) !== memory.location.longitude ||
        typeof readMemory[0]?.created_at !== "string" ||
        Date.parse(String(readMemory[0].created_at)) !== Date.parse(now) ||
        readJobs[0]?.memory_id !== memoryId
      ) {
        throw new Error("Supabase integration row verification did not match the inserted data.");
      }

      const downloadedAudio = await this.downloadAudio(memoryId, "wav");
      if (!downloadedAudio.equals(audio)) {
        throw new Error("Supabase audio download did not match the uploaded test bytes.");
      }
      return { sessionId, memoryId, audioBytes: downloadedAudio.length };
    } finally {
      if (memoryWritten) {
        await this.deleteMemory(memoryId, "wav").catch((error: unknown) => {
          console.error("Could not clean up the temporary Supabase test memory:", error);
        });
      }
      if (sessionWritten) {
        await this.request(`/rest/v1/music_sessions?id=eq.${sessionId}`, {
          method: "DELETE",
        }).catch((error: unknown) => {
          console.error("Could not clean up the temporary Supabase test session:", error);
        });
      }
    }
  }

  private async upsert(table: string, rows: Array<Record<string, unknown>>): Promise<void> {
    await this.request(`/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
  }

  private async rest<T>(path: string): Promise<T> {
    const response = await this.request(`/rest/v1/${path}`);
    return response.json() as Promise<T>;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.origin), {
        ...init,
        headers: {
          apikey: this.secretKey,
          Authorization: `Bearer ${this.secretKey}`,
          ...init.headers,
        },
        signal: init.signal ?? AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : "network error";
      throw new Error(`Supabase request failed before a response (${reason}).`);
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body: unknown = await response.clone().json();
        if (body && typeof body === "object") {
          const record = body as Record<string, unknown>;
          const safeParts = [record.code, record.message, record.hint]
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.replaceAll(this.secretKey, "[redacted]").slice(0, 180));
          detail = safeParts.join(" — ");
        }
      } catch {
        detail = "";
      }
      throw new Error(
        `Supabase request failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}. Check the project URL, secret key, migration, and storage bucket.`,
      );
    }
    return response;
  }
}

function readSession(row: Record<string, unknown>): MusicSession {
  return {
    id: requiredString(row.id, "session.id"),
    preferredGenre: requiredString(row.preferred_genre, "session.preferred_genre") as MusicSession["preferredGenre"],
    source: requiredString(row.source, "session.source") as MusicSession["source"],
    transcript: optionalString(row.transcript),
    context: row.context as MusicSession["context"],
    startedAt: requiredString(row.started_at, "session.started_at"),
    endedAt: optionalString(row.ended_at),
  };
}

function writeSession(session: MusicSession): Record<string, unknown> {
  return {
    id: session.id,
    preferred_genre: session.preferredGenre,
    transcript: session.transcript ?? null,
    transcript_status: session.transcript ? "TEMPORARY" : "DELETED",
    source: session.source,
    context: session.context ?? null,
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
  };
}

function readJob(row: Record<string, unknown>): GenerationJob {
  return {
    id: requiredString(row.id, "job.id"),
    sessionId: requiredString(row.session_id, "job.session_id"),
    status: requiredString(row.status, "job.status") as GenerationJob["status"],
    progress: Number(row.progress),
    error: optionalString(row.error_message),
    fallbackReason: optionalString(row.fallback_reason),
    providerUsed: optionalString(row.provider_used) as GenerationJob["providerUsed"],
    memoryId: optionalString(row.memory_id),
    startedAt: requiredString(row.started_at, "job.started_at"),
    completedAt: optionalString(row.completed_at),
  };
}

function writeJob(job: GenerationJob): Record<string, unknown> {
  return {
    id: job.id,
    session_id: job.sessionId,
    status: job.status,
    progress: job.progress,
    error_message: job.error ?? null,
    fallback_reason: job.fallbackReason ?? null,
    provider_used: job.providerUsed ?? null,
    memory_id: job.memoryId ?? null,
    started_at: job.startedAt,
    completed_at: job.completedAt ?? null,
  };
}

function readMemory(row: Record<string, unknown>): MusicMemory {
  const analysis = row.analysis;
  if (!analysis || typeof analysis !== "object") {
    throw new Error("Supabase memory row is missing its analysis object.");
  }
  return {
    id: requiredString(row.id, "memory.id"),
    sessionId: requiredString(row.session_id, "memory.session_id"),
    title: requiredString(row.title, "memory.title"),
    summary: requiredString(row.summary, "memory.summary"),
    lyrics: requiredString(row.lyrics, "memory.lyrics"),
    genre: requiredString(row.genre, "memory.genre"),
    audioUrl: requiredString(row.audio_url, "memory.audio_url"),
    source: requiredString(row.source, "memory.source") as MusicMemory["source"],
    location: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      altitude: optionalNumber(row.altitude),
      heading: Number(row.heading),
      accuracyMeters: Number(row.location_accuracy),
    },
    environment: {
      speedKmh: Number(row.vehicle_speed),
      temperatureCelsius: optionalNumber(row.temperature),
      weather: optionalString(row.weather_condition) as MusicMemory["environment"]["weather"],
      timeOfDay: requiredString(row.time_of_day, "memory.time_of_day"),
    },
    analysis: analysis as MusicMemory["analysis"],
    provider: optionalString(row.provider) as MusicMemory["provider"],
    createdAt: requiredString(row.created_at, "memory.created_at"),
  };
}

function writeMemory(memory: MusicMemory): Record<string, unknown> {
  const extension = memory.audioUrl.endsWith(".mp3") ? "mp3" : "wav";
  return {
    id: memory.id,
    session_id: memory.sessionId,
    title: memory.title,
    summary: memory.summary,
    lyrics: memory.lyrics,
    genre: memory.genre,
    audio_url: memory.audioUrl,
    audio_extension: extension,
    source: memory.source,
    latitude: memory.location.latitude,
    longitude: memory.location.longitude,
    altitude: memory.location.altitude ?? null,
    heading: memory.location.heading,
    location_accuracy: memory.location.accuracyMeters,
    vehicle_speed: memory.environment.speedKmh,
    temperature: memory.environment.temperatureCelsius ?? null,
    weather_condition: memory.environment.weather ?? null,
    time_of_day: memory.environment.timeOfDay,
    analysis: memory.analysis,
    provider: memory.provider ?? "DEMO",
    created_at: memory.createdAt,
  };
}

function readPlayback(row: Record<string, unknown>): PlaybackRecord {
  return {
    id: requiredString(row.id, "playback.id"),
    memoryId: requiredString(row.memory_id, "playback.memory_id"),
    playedAt: requiredString(row.played_at, "playback.played_at"),
    triggerType: requiredString(row.trigger_type, "playback.trigger_type") as PlaybackRecord["triggerType"],
  };
}

function writePlayback(record: PlaybackRecord): Record<string, unknown> {
  return {
    id: record.id,
    memory_id: record.memoryId,
    played_at: record.playedAt,
    trigger_type: record.triggerType,
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Supabase returned an invalid ${field}.`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function extensionFor(contentType: string): "mp3" | "wav" {
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  throw new Error(`Unsupported audio content type: ${contentType}`);
}
