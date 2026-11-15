# Welody Architecture

## Runtime shape

```text
React + TypeScript Simulator
          | REST / JSON
          v
Express + TypeScript API
  |-- shared Zod contracts
  |-- context and geofence services
  |-- deterministic demo generation job
  |-- local JSON metadata and generated WAV preview
  `-- Open-Meteo weather adapter
```

The simulator sends `source: SIMULATOR` and the API stores the same source on each memory. Pleos SDK interfaces are intentionally not fabricated; an Android adapter remains a later integration.

## Boundaries

- `packages/shared` owns API schemas and transport types.
- `apps/simulator` owns simulation controls, the map, consent UX, and REST calls.
- `backend/src/services` contains context analysis, geofence calculations, weather retrieval, audio preview synthesis, and asynchronous job processing.
- `backend/src/store.ts` is the development persistence boundary. It atomically writes a local JSON snapshot. The Supabase schema scaffold is in `supabase/migrations/`.
- Weather provider failures are returned as API errors; unavailable weather remains optional context.

## Generation pipeline

`PENDING -> ANALYZING -> GENERATING_LYRICS -> GENERATING_MUSIC -> UPLOADING -> COMPLETED`

The local mode uses deterministic lyric/style construction and a generated 12-second WAV tone preview. This is a simulator implementation, not a Gemini or Lyria integration. Production providers should implement the same generation boundary only after verifying the provider's official model and response contract.

## Location replay

The nearby endpoint uses great-circle distance, a default radius of 150m, and rejects location fixes worse than 50m accuracy. The client tracks entry/exit locally to prevent repeated playback while remaining within one geofence. Production replay needs persistent per-user hysteresis and audio-focus/platform policy handling.
