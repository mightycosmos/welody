import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { SupabaseService } from "./supabase.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Supabase persistence loads expected tables and uploads audio privately", async () => {
  const requests: Array<{ url: string; method: string; headers: Headers }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
    });
    return new Response(init?.method === "POST" ? null : "[]", { status: 200 });
  };

  const service = new SupabaseService(
    "https://demo-project.supabase.co",
    "sb_secret_test",
    "welody-music",
  );
  const snapshot = await service.loadSnapshot();
  assert.deepEqual(snapshot, {
    sessions: [],
    memories: [],
    jobs: [],
    playbackHistory: [],
  });
  await service.saveSnapshot({
    sessions: [{
      id: "00000000-0000-4000-8000-000000000001",
      preferredGenre: "Pop",
      source: "SIMULATOR",
      startedAt: "2026-11-15T00:00:00.000Z",
    }],
    memories: [],
    jobs: [],
    playbackHistory: [],
  });
  await service.uploadAudio("memory-id", Buffer.alloc(1024), "audio/mpeg");

  assert.equal(requests.length, 6);
  assert.ok(requests.some((request) => request.url.endsWith("/rest/v1/music_sessions?select=*")));
  const insert = requests.find((request) => request.url.includes("/rest/v1/music_sessions?on_conflict=id"))!;
  assert.equal(insert.headers.get("content-type"), "application/json");
  const upload = requests.at(-1)!;
  assert.equal(upload.method, "POST");
  assert.ok(upload.url.endsWith("/storage/v1/object/welody-music/memory-id.mp3"));
  assert.equal(upload.headers.get("authorization"), "Bearer sb_secret_test");
});

test("Supabase requires a trusted project URL and non-empty server key", () => {
  assert.throws(
    () => new SupabaseService("http://demo-project.supabase.co", "secret", "bucket"),
    /https Supabase project URL/,
  );
  assert.throws(
    () => new SupabaseService("https://demo-project.supabase.co", "", "bucket"),
    /secret\/service-role key/,
  );
});
