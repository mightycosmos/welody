import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { Store } from "./store.js";
import { GenerationService } from "./services/generation.js";
import { createApp } from "./app.js";
import { GoogleAiService } from "./services/google-ai.js";
import { SupabaseService } from "./services/supabase.js";
import { ensurePreparedDemoSong } from "./services/audio.js";

const directory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(directory, "../..");
loadEnv({ path: resolve(projectRoot, ".env") });
const dataDirectory = resolve(projectRoot, process.env.DATA_DIR ?? "backend/data");
const demoSetting = process.env.DEMO_MODE ?? "true";
if (!["true", "false"].includes(demoSetting.toLowerCase())) {
  throw new Error("DEMO_MODE must be true or false.");
}
const demoMode = demoSetting.toLowerCase() === "true";
const aiProvider = demoMode
  ? "mock"
  : process.env.AI_PROVIDER ?? (process.env.GEMINI_API_KEY ? "google" : "mock");
if (!["google", "mock"].includes(aiProvider)) {
  throw new Error("AI_PROVIDER must be either 'google' or 'mock'.");
}
const persistenceProvider = demoMode ? "local" : process.env.PERSISTENCE_PROVIDER ?? "local";
if (!["supabase", "local"].includes(persistenceProvider)) {
  throw new Error("PERSISTENCE_PROVIDER must be either 'supabase' or 'local'.");
}
const supabase = persistenceProvider === "supabase"
  ? new SupabaseService(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      process.env.MUSIC_STORAGE_BUCKET ?? "welody-music",
    )
  : undefined;
if (aiProvider === "google" && !process.env.GEMINI_API_KEY) {
  throw new Error("AI_PROVIDER=google requires GEMINI_API_KEY.");
}
process.env.AI_PROVIDER = aiProvider;
process.env.PERSISTENCE_PROVIDER = persistenceProvider;
const store = new Store(resolve(dataDirectory, "welody.json"), supabase);
await store.initialize();
const preparedDemoSongPath = resolve(dataDirectory, "prepared-demo-song.wav");
await ensurePreparedDemoSong(
  preparedDemoSongPath,
  resolve(projectRoot, "backend/assets/demo-track.wav"),
);

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port");
}
const googleAi = aiProvider === "google"
  ? new GoogleAiService(
      process.env.GEMINI_API_KEY!,
      process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
      process.env.LYRIA_MODEL ?? "lyria-3.5",
    )
  : undefined;
const generation = new GenerationService(
  store,
  resolve(dataDirectory, "audio"),
  preparedDemoSongPath,
  process.env.API_PUBLIC_URL ?? `http://localhost:${port}`,
  googleAi,
  supabase,
  demoMode,
);
const app = createApp(
  store,
  generation,
  resolve(dataDirectory, "audio"),
  supabase,
  demoMode,
  googleAi,
);
app.listen(port, () => {
  console.log(`Welody API listening on port ${port} (demo: ${demoMode}, AI: ${aiProvider}, persistence: ${persistenceProvider})`);
});
