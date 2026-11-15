import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { MusicSession } from "@welody/shared";
import { GoogleAiService } from "./google-ai.js";

const originalFetch = globalThis.fetch;

const session: MusicSession = {
  id: "session-test",
  preferredGenre: "Pop",
  source: "SIMULATOR",
  transcript: "함께 바다를 보니 좋다. 내 전화번호는 010-1234-5678이야.",
  startedAt: "2026-11-15T12:00:00.000Z",
  context: {
    vehicle: { speedKmh: 45, drivingState: "MOVING" },
    location: {
      latitude: 37.5665,
      longitude: 126.978,
      heading: 120,
      accuracyMeters: 8,
    },
    weather: { condition: "CLEAR", temperatureCelsius: 18 },
    time: {
      localTime: "14:20",
      timeZone: "Asia/Seoul",
      timestamp: "2026-11-15T05:20:00.000Z",
    },
  },
};

const validAnalysis = {
  emotions: ["warm"],
  theme: "바다를 함께 본 오후",
  recommendedGenre: "Bright Pop",
  tempo: "Mid-tempo",
  bpmTarget: 96,
  mood: "bright and affectionate",
  instruments: ["acoustic guitar", "soft piano"],
  vocalStyle: "Warm vocal",
  lyrics: {
    verse1: "바다 위로 빛이 내려",
    chorus: "우리의 노래가 되어",
    verse2: "바람 따라 웃음이 번져",
    bridge: "이 장면을 기억할게",
  },
  musicPrompt: "Create a warm original pop song.",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Google analysis uses redacted conversation and omits precise location", async () => {
  let requestBody = "";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return Response.json({ output_text: JSON.stringify(validAnalysis) });
  };
  const analysis = await new GoogleAiService("test-key").analyze(session);
  assert.equal(analysis.theme, validAnalysis.theme);
  assert.equal(requestBody.includes("010-1234-5678"), false);
  assert.equal(requestBody.includes("37.5665"), false);
});

test("Google analysis validates model response and removes returned phone numbers", async () => {
  globalThis.fetch = async () => Response.json({
    output_text: JSON.stringify({
      ...validAnalysis,
      lyrics: { ...validAnalysis.lyrics, chorus: "전화 010-1234-5678 대신 노래를" },
    }),
  });
  const analysis = await new GoogleAiService("test-key").analyze(session);
  assert.equal(analysis.lyrics.chorus.includes("010-1234-5678"), false);
});

test("Lyria audio response is decoded and provider quota errors are explicit", async () => {
  const encoded = Buffer.alloc(2048, 3).toString("base64");
  globalThis.fetch = async () => Response.json({
    status: "completed",
    output_audio: { data: encoded, mime_type: "audio/mpeg" },
  });
  const generated = await new GoogleAiService("test-key").generateMusic(
    validAnalysis,
    "Pop",
  );
  assert.equal(generated.audio.length, 2048);
  assert.equal(generated.mimeType, "audio/mpeg");

  globalThis.fetch = async () => new Response("sensitive provider details", { status: 429 });
  await assert.rejects(
    () => new GoogleAiService("test-key").generateMusic(validAnalysis, "Pop"),
    /HTTP 429/,
  );
});
