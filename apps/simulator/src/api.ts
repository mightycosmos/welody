import type {
  GenerationJob,
  MusicMemory,
  MusicSession,
  NearbyMemory,
} from "@welody/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as
      | { error?: { code?: string; message?: string } }
      | undefined;
    throw new ApiRequestError(
      body?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () =>
    request<{
      status: string;
      mode: "DEMO" | "AI_CONFIGURED" | "SIMULATION";
      demoMode: boolean;
      persistence: "SUPABASE" | "LOCAL";
    }>("/api/health"),
  getDemoConfig: () =>
    request<{
      conversationText: string;
      preferredGenre: string;
      vehicle: { speedKmh: number; drivingState: "PARKED" | "MOVING" };
      location: { latitude: number; longitude: number; heading: number; accuracyMeters: number };
      weather: { temperatureCelsius: number; condition: WeatherCode; precipitationMm: number };
      time: { localTime: string; timeZone: string };
      scenarios: Array<{
        name: string;
        preferredGenre: string;
        speedKmh: number;
        temperatureCelsius: number;
        condition: WeatherCode;
        localTime: string;
        latitude: number;
        longitude: number;
      }>;
    }>("/api/demo/config"),
  createSession: (preferredGenre: string) =>
    request<MusicSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ preferredGenre, source: "SIMULATOR" }),
    }),
  saveTranscript: (sessionId: string, text: string) =>
    request<{ accepted: boolean }>(`/api/sessions/${sessionId}/transcript`, {
      method: "POST",
      body: JSON.stringify({ text, consentConfirmed: true }),
    }),
  saveContext: (sessionId: string, context: unknown) =>
    request<{ accepted: boolean; source: string }>(`/api/sessions/${sessionId}/context`, {
      method: "POST",
      body: JSON.stringify({ context }),
    }),
  generate: (sessionId: string) =>
    request<{ jobId: string; status: string }>(`/api/sessions/${sessionId}/generate`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getJob: (jobId: string) => request<GenerationJob>(`/api/jobs/${jobId}`),
  getMemories: async () =>
    (await request<{ memories: MusicMemory[] }>("/api/memories")).memories,
  getNearby: (latitude: number, longitude: number, accuracyMeters: number) => {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      accuracyMeters: String(accuracyMeters),
      radiusMeters: "150",
    });
    return request<{ memories: NearbyMemory[]; radiusMeters: number }>(
      `/api/memories/nearby?${query}`,
    );
  },
  recordPlayback: (memoryId: string, triggerType: "MANUAL" | "GEOFENCE") =>
    request(`/api/memories/${memoryId}/playback`, {
      method: "POST",
      body: JSON.stringify({ triggerType }),
    }),
  deleteMemory: (memoryId: string) =>
    request<void>(`/api/memories/${memoryId}`, { method: "DELETE" }),
  getWeather: (latitude: number, longitude: number) => {
    const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
    return request<{
      temperatureCelsius: number;
      condition: "CLEAR" | "CLOUDY" | "RAIN" | "SNOW" | "WINDY";
      precipitationMm: number;
      cloudCoverPercent?: number;
      windSpeedKmh?: number;
    }>(`/api/weather?${query}`);
  },
};

type WeatherCode = "CLEAR" | "CLOUDY" | "RAIN" | "SNOW" | "WINDY";
