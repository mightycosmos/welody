import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { MusicAnalysis, MusicSession } from "@welody/shared";
import { Store } from "../store.js";
import { ensurePreparedDemoSong } from "./audio.js";
import { GenerationService } from "./generation.js";
import { GoogleAiService } from "./google-ai.js";

const session: MusicSession = {
  id: "demo-session-id",
  preferredGenre: "Indie Pop",
  source: "SIMULATOR",
  transcript: "오늘 함께 바다를 보러 와서 정말 행복하다.",
  startedAt: "2026-11-15T12:00:00.000Z",
  context: {
    vehicle: { speedKmh: 45, drivingState: "MOVING" },
    location: {
      latitude: 37.5665,
      longitude: 126.978,
      heading: 150,
      accuracyMeters: 8,
    },
    weather: {
      temperatureCelsius: 20,
      condition: "CLEAR",
      precipitationMm: 0,
    },
    time: {
      localTime: "14:20",
      timeZone: "Asia/Seoul",
      timestamp: "2026-11-15T05:20:00.000Z",
    },
  },
};

const generatedAnalysis: MusicAnalysis = {
  emotions: ["happy"],
  theme: "A happy drive by the sea",
  recommendedGenre: "Bright Indie Pop",
  tempo: "Mid-tempo",
  bpmTarget: 96,
  mood: "warm and bright",
  instruments: ["acoustic guitar"],
  vocalStyle: "Warm",
  lyrics: {
    verse1: "바다 위로 빛이 내려",
    chorus: "우리의 노래가 되어",
    verse2: "바람 따라 웃음이 번져",
    bridge: "이 장면을 기억할게",
  },
  musicPrompt: "Create an original warm indie pop song.",
};

class FailingGoogleAi extends GoogleAiService {
  constructor(
    private readonly failAt: "analysis" | "music",
  ) {
    super("test-key");
  }

  override async analyze(): Promise<MusicAnalysis> {
    if (this.failAt === "analysis") throw new Error("HTTP 429 quota exceeded");
    return generatedAnalysis;
  }

  override async generateMusic(): Promise<{ audio: Buffer; mimeType: string }> {
    throw new Error("HTTP 429 quota exceeded");
  }
}

class ForbiddenGoogleAi extends GoogleAiService {
  constructor() {
    super("test-key");
  }

  override async analyze(): Promise<MusicAnalysis> {
    throw new Error("Google AI must not be called in Demo Mode.");
  }

  override async generateMusic(): Promise<{ audio: Buffer; mimeType: string }> {
    throw new Error("Lyria must not be called in Demo Mode.");
  }
}

async function runGeneration(
  mode: "demo" | "google-fallback",
  google: GoogleAiService,
  demoMode: boolean,
) {
  const directory = await mkdtemp(join(tmpdir(), "welody-generation-"));
  const dataDirectory = join(directory, "data");
  const audioDirectory = join(dataDirectory, "audio");
  const demoSongPath = join(dataDirectory, "prepared-demo-song.wav");
  const store = new Store(join(dataDirectory, "welody.json"));
  await store.initialize();
  await ensurePreparedDemoSong(demoSongPath);
  const service = new GenerationService(
    store,
    audioDirectory,
    demoSongPath,
    "http://localhost:3000",
    google,
    undefined,
    demoMode,
  );
  const testSession = structuredClone(session);
  store.sessions.push(testSession);
  try {
    const started = await service.start(testSession);
    let completed = store.jobs.find((job) => job.id === started.id)!;
    for (let attempt = 0; attempt < 60 && !["COMPLETED", "FAILED"].includes(completed.status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      completed = store.jobs.find((job) => job.id === started.id)!;
    }
    return {
      directory,
      store,
      job: completed,
      demoSongPath,
      mode,
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

test("Demo Mode skips Google and saves the prepared audio into a playable memory", async () => {
  const result = await runGeneration("demo", new ForbiddenGoogleAi(), true);
  try {
    assert.equal(result.job.status, "COMPLETED");
    assert.equal(result.job.providerUsed, "DEMO");
    assert.equal(result.job.fallbackReason, undefined);
    assert.equal(result.store.memories.length, 1);
    assert.equal(result.store.memories[0]?.provider, "DEMO");
    assert.equal(result.store.sessions[0]?.transcript, undefined);
    const storedAudio = await readFile(join(
      result.directory,
      "data",
      "audio",
      `${result.store.memories[0]!.id}.wav`,
    ));
    assert.deepEqual(storedAudio, await readFile(result.demoSongPath));
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});

test("Google quota failures finish the same job with a prepared Demo fallback", async () => {
  const result = await runGeneration("google-fallback", new FailingGoogleAi("music"), false);
  try {
    assert.equal(result.job.status, "COMPLETED");
    assert.equal(result.job.providerUsed, "DEMO");
    assert.match(result.job.fallbackReason ?? "", /HTTP 429/);
    assert.equal(result.store.memories[0]?.provider, "DEMO");
    const storedAudio = await readFile(join(
      result.directory,
      "data",
      "audio",
      `${result.store.memories[0]!.id}.wav`,
    ));
    assert.deepEqual(storedAudio, await readFile(result.demoSongPath));
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});

test("Gemini quota failures use local analysis and still finish with Demo audio", async () => {
  const result = await runGeneration("google-fallback", new FailingGoogleAi("analysis"), false);
  try {
    assert.equal(result.job.status, "COMPLETED");
    assert.match(result.job.fallbackReason ?? "", /Gemini.*HTTP 429/);
    assert.equal(result.store.memories[0]?.provider, "DEMO");
  } finally {
    await rm(result.directory, { recursive: true, force: true });
  }
});
