# External providers and setup

## Google Gemini and Lyria

`DEMO_MODE=true` (the safe default) bypasses all Google generation requests. Set `DEMO_MODE=false` to activate live mode.

The backend calls Google's Interactions API. Configure these server-only variables in the root `.env`:

```env
AI_PROVIDER=google
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
LYRIA_MODEL=lyria-3.5
```

The same Google API key must have model access and usable billing/quota for both configured models. A model appearing in the model list does not guarantee generation quota. HTTP 429/403 responses are surfaced as failed generation jobs; the app does not silently substitute mock audio. For an offline UI demo only, set `AI_PROVIDER=mock`.

The simulator sends transcript text only after consent. The backend redacts common identifiers before sending to Gemini and does not send exact coordinates. Do not put the key in any `VITE_` variable or browser code.

## Supabase

1. Apply `supabase/migrations/202611150001_initial_schema.sql` in the Supabase SQL Editor.
2. Keep the bucket private; the migration creates the default `welody-music` bucket. A private bucket was created for the configured project during setup.
3. Configure the server:

```env
PERSISTENCE_PROVIDER=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
MUSIC_STORAGE_BUCKET=welody-music
```

`SUPABASE_SERVICE_ROLE_KEY` (legacy) is accepted as an alternative to `SUPABASE_SECRET_KEY`. Use a server-only secret/service-role key, never the anon/publishable key. This prototype does not implement end-user authentication; keep it private and do not deploy it publicly with the service key enabled.

The configured Supabase server key authenticated successfully, but the project did not yet contain the required tables when checked. Apply the migration before setting `PERSISTENCE_PROVIDER=supabase`. The REST adapter validates all requests and fails startup or the request if schema/bucket access is unavailable.

Run a real insert/select/delete round trip for sessions, location/lyrics metadata, jobs, playback history, and private audio:

```bash
npm run verify:supabase --workspace @welody/backend
```

The check uses temporary UUID records and removes them after success. It must not be reported as passed until the database migration has been applied and the script exits successfully.

## Pleos Connect

The vehicle app still requires a Pleos-enabled Android project, SDK access approvals, and official SDK artifacts/API references. These cannot be provisioned by Gemini/Supabase credentials or safely inferred. Until those are available, use the Web Simulator; no fake Pleos data provider is labeled as real.

## Running

```bash
npm install
npm run dev
npm run build
npm test
```

The API health response reports configured AI and persistence modes. The web UI continues to label the vehicle input as simulation data even when Google AI is live.
