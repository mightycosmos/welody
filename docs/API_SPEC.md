# API Specification

The API uses JSON unless the response is audio. Validation errors return `400`; domain errors include a stable error code and message:

```json
{ "error": { "code": "INVALID_INPUT", "message": "..." } }
```

| Method | Path | Input / Result |
|---|---|---|
| GET | `/api/health` | Service status and `SIMULATION` mode |
| POST | `/api/sessions` | `{ "preferredGenre": "Pop", "source": "SIMULATOR" }` -> session |
| POST | `/api/sessions/:id/transcript` | `{ "text": "...", "consentConfirmed": true }` |
| POST | `/api/sessions/:id/context` | `{ "context": { vehicle, location, weather, time } }` |
| POST | `/api/sessions/:id/generate` | `202 { "jobId": "...", "status": "PENDING" }` |
| GET | `/api/jobs/:id` | Job state and progress |
| GET | `/api/memories` | `{ "memories": [...] }` |
| GET | `/api/memories/:id` | One music memory |
| DELETE | `/api/memories/:id` | `204` |
| GET | `/api/memories/nearby?latitude=&longitude=&accuracyMeters=&radiusMeters=` | Nearby eligible memories |
| POST | `/api/memories/:id/playback` | `{ "triggerType": "MANUAL" \| "GEOFENCE" }` |
| GET | `/api/audio/:memoryId.wav` | Generated simulator WAV preview |
| GET | `/api/weather?latitude=&longitude=` | Open-Meteo current conditions |

Vehicle context has `speedKmh` and `drivingState`. Location has latitude, longitude, heading, and accuracy in meters. Optional weather fields are omitted when unavailable. The context time includes local `HH:mm`, an IANA timezone, and an ISO timestamp with offset.

Transcript requests require an explicit consent flag. The local generation flow deletes transcript text after successful memory creation; the local session keeps non-sensitive context for development.

All endpoints are currently single-user simulator endpoints. Do not expose them publicly without authentication and authorization.
