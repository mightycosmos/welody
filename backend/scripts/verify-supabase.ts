import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SupabaseService } from "../src/services/supabase.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "../..");
loadEnv({ path: resolve(projectRoot, ".env") });

const service = new SupabaseService(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  process.env.MUSIC_STORAGE_BUCKET ?? "welody-music",
);
const result = await service.verifyRoundTrip();
console.log(
  `Supabase verified: INSERT + SELECT + DELETE for session, memory metadata, job, playback history; private audio upload/download/delete (${result.audioBytes} bytes). Temporary database rows were removed.`,
);
