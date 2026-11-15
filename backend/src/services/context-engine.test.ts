import assert from "node:assert/strict";
import test from "node:test";
import type { MusicSession } from "@welody/shared";
import {
  buildMusicAnalysis,
  getTimeOfDay,
  redactPersonalInformation,
} from "./context-engine.js";
import { distanceInMeters, isInsideGeofence } from "./geofence.js";

const session: MusicSession = {
  id: "session-test",
  preferredGenre: "Pop",
  source: "SIMULATOR",
  transcript: "오늘 바다를 보러 와서 정말 좋다. 010-1234-5678로 연락해.",
  startedAt: "2026-11-15T12:00:00.000Z",
  context: {
    vehicle: { speedKmh: 75, drivingState: "MOVING" },
    location: {
      latitude: 37.5665,
      longitude: 126.978,
      heading: 180,
      accuracyMeters: 8,
    },
    weather: {
      temperatureCelsius: -3,
      condition: "SNOW",
      precipitationMm: 0,
    },
    time: {
      localTime: "22:30",
      timeZone: "Asia/Seoul",
      timestamp: "2026-11-15T13:30:00.000Z",
    },
  },
};

test("context engine blends genre with weather, time, speed, and conversation", () => {
  const analysis = buildMusicAnalysis(session);
  assert.equal(analysis.recommendedGenre, "Cozy Pop");
  assert.ok(analysis.mood.includes("winter"));
  assert.ok(analysis.emotions.includes("warm"));
  assert.ok(analysis.musicPrompt.includes("75 km/h"));
  assert.equal(analysis.lyrics.chorus.includes("010-1234-5678"), false);
});

test("personal identifiers are redacted before lyrics are generated", () => {
  const redacted = redactPersonalInformation(
    "메일 test@example.com, 전화 010-1234-5678, 주소 서울특별시 종로구 세종대로 1",
  );
  assert.equal(redacted.includes("test@example.com"), false);
  assert.equal(redacted.includes("010-1234-5678"), false);
  assert.ok(redacted.includes("[이메일]"));
  assert.ok(redacted.includes("[전화번호]"));
  assert.ok(redacted.includes("[주소]"));
});

test("time bands include late night and early morning boundaries", () => {
  assert.equal(getTimeOfDay("04:59"), "LATE_NIGHT");
  assert.equal(getTimeOfDay("05:00"), "EARLY_MORNING");
  assert.equal(getTimeOfDay("20:00"), "NIGHT");
});

test("geofence uses great-circle distance and rejects unreliable fixes", () => {
  const origin = { latitude: 37.5665, longitude: 126.978, accuracyMeters: 8 };
  const near = { latitude: 37.567, longitude: 126.978, accuracyMeters: 8 };
  const far = { latitude: 37.57, longitude: 126.978, accuracyMeters: 8 };
  assert.ok(distanceInMeters(origin, near) < 100);
  assert.ok(distanceInMeters(origin, far) > 150);
  assert.equal(isInsideGeofence(90, 8), true);
  assert.equal(isInsideGeofence(90, 51), false);
  assert.equal(isInsideGeofence(151, 8), false);
});
