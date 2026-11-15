import { z } from "zod";

export const genres = [
  "Pop",
  "Indie Pop",
  "Rock",
  "Hip-hop",
  "R&B",
  "Ballad",
  "Jazz",
  "Lo-fi",
  "EDM",
  "Acoustic",
  "Classical",
  "Synthwave",
] as const;

export const weatherConditions = [
  "CLEAR",
  "CLOUDY",
  "RAIN",
  "SNOW",
  "WINDY",
] as const;

export const sessionSources = ["SIMULATOR", "PLEOS"] as const;

export const jobStatuses = [
  "PENDING",
  "ANALYZING",
  "GENERATING_LYRICS",
  "GENERATING_MUSIC",
  "UPLOADING",
  "COMPLETED",
  "FAILED",
] as const;

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  heading: z.number().min(0).max(360),
  accuracyMeters: z.number().min(0).max(100_000),
});

export const contextSchema = z.object({
  vehicle: z.object({
    speedKmh: z.number().min(0).max(300),
    drivingState: z.enum(["PARKED", "MOVING"]),
  }),
  location: locationSchema,
  weather: z.object({
    temperatureCelsius: z.number().min(-100).max(100).optional(),
    condition: z.enum(weatherConditions).optional(),
    precipitationMm: z.number().min(0).optional(),
    cloudCoverPercent: z.number().min(0).max(100).optional(),
    windSpeedKmh: z.number().min(0).optional(),
  }),
  time: z.object({
    localTime: z.string().regex(/^\d{2}:\d{2}$/),
    timeZone: z.string().min(1).max(100),
    timestamp: z.string().datetime({ offset: true }),
  }),
});

export const createSessionSchema = z.object({
  preferredGenre: z.enum(genres),
  source: z.enum(sessionSources),
});

export const transcriptSchema = z.object({
  text: z.string().trim().min(1).max(10_000),
  consentConfirmed: z.literal(true),
});

export const contextRequestSchema = z.object({ context: contextSchema });

export interface MusicSession {
  id: string;
  preferredGenre: (typeof genres)[number];
  source: (typeof sessionSources)[number];
  transcript?: string;
  context?: z.infer<typeof contextSchema>;
  startedAt: string;
  endedAt?: string;
}

export interface MusicAnalysis {
  emotions: string[];
  theme: string;
  recommendedGenre: string;
  tempo: string;
  bpmTarget: number;
  mood: string;
  instruments: string[];
  vocalStyle: string;
  lyrics: {
    verse1: string;
    chorus: string;
    verse2: string;
    bridge: string;
  };
  musicPrompt: string;
}

export interface MusicMemory {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  lyrics: string;
  genre: string;
  audioUrl: string;
  source: (typeof sessionSources)[number];
  location: z.infer<typeof locationSchema>;
  environment: {
    speedKmh: number;
    temperatureCelsius?: number;
    weather?: (typeof weatherConditions)[number];
    timeOfDay: string;
  };
  analysis: MusicAnalysis;
  provider?: "GOOGLE" | "DEMO";
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  sessionId: string;
  status: (typeof jobStatuses)[number];
  progress: number;
  error?: string;
  fallbackReason?: string;
  providerUsed?: "GOOGLE" | "DEMO";
  memoryId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PlaybackRecord {
  id: string;
  memoryId: string;
  playedAt: string;
  triggerType: "MANUAL" | "GEOFENCE";
}

export interface NearbyMemory extends MusicMemory {
  distanceMeters: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
