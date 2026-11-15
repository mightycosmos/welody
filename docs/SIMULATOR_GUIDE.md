# Web Simulator Guide

1. Make sure the private root `.env` contains `DEMO_MODE=true` (the `.env.example` default), then run `npm install` and `npm run dev` from the repository root.
2. Open `http://localhost:5173`; the `SIMULATION MODE` badge is always visible.
3. Use a quick scenario or adjust speed, coordinates, heading, weather, temperature, and local time.
4. The demo conversation and environment are prefilled. Apply a quick scenario, click the map, or edit latitude/longitude to try a different drive.
5. Select a genre, confirm the local demo-processing consent, and select **노래 만들기**.
6. Follow analysis, lyrics, composition, and save steps. The 36-second prepared demo track is saved as a location memory and playback starts automatically when browser autoplay permits.
7. Click a memory to view its details. **이 장소로 이동** moves the simulated vehicle to its coordinates; the 150m geofence can trigger playback. Leave the geofence and re-enter to test another trigger.
8. Use the weather button to fetch real current weather for the selected coordinates. On failure, the UI shows the error and keeps the configured simulation values.

This simulator does not access the microphone or call Google/Open-Meteo in Demo Mode. It plays an original prepared synthesized WAV track, not a Lyria-generated song.
