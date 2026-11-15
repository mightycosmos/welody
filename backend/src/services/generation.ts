import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  GenerationJob,
  MusicAnalysis,
  MusicMemory,
  MusicSession,
} from "@welody/shared";
import { buildMusicAnalysis, getTimeOfDay, redactPersonalInformation } from "./context-engine.js";
import { Store } from "../store.js";
import { GoogleAiService } from "./google-ai.js";
import { SupabaseService } from "./supabase.js";

export class GenerationService {
  constructor(
    private readonly store: Store,
    private readonly audioDirectory: string,
    private readonly preparedDemoSongPath: string,
    private readonly apiOrigin: string,
    private readonly googleAi?: GoogleAiService,
    private readonly supabase?: SupabaseService,
    private readonly demoMode = true,
  ) {}

  async start(session: MusicSession): Promise<GenerationJob> {
    if (!session.context) throw new Error("Context is required");
    if (!session.transcript?.trim()) throw new Error("Transcript is required");
    const job: GenerationJob = {
      id: randomUUID(),
      sessionId: session.id,
      status: "PENDING",
      progress: 0,
      providerUsed: this.googleAi && !this.demoMode ? "GOOGLE" : "DEMO",
      startedAt: new Date().toISOString(),
    };
    this.store.jobs.push(job);
    await this.store.persist();
    void this.process(job, session).catch(async (error: unknown) => {
      job.status = "FAILED";
      job.error = error instanceof Error ? error.message : "Music generation failed";
      job.completedAt = new Date().toISOString();
      try {
        await this.store.persist();
      } catch (persistenceError) {
        console.error("Could not persist failed generation job:", persistenceError);
      }
    });
    return job;
  }

  private async process(job: GenerationJob, session: MusicSession): Promise<void> {
    job.status = "ANALYZING";
    job.progress = 12;
    await this.persistAfterDelay();

    job.status = "GENERATING_LYRICS";
    job.progress = 35;
    let analysis: MusicAnalysis;
    if (this.googleAi && !this.demoMode) {
      try {
        analysis = await this.googleAi.analyze(session);
      } catch (error) {
        job.fallbackReason = formatFallbackReason("Gemini", error);
        job.providerUsed = "DEMO";
        analysis = buildMusicAnalysis(session);
      }
    } else {
      analysis = buildMusicAnalysis(session);
    }
    await this.persistAfterDelay();

    job.status = "GENERATING_MUSIC";
    job.progress = 65;
    await this.persistAfterDelay();

    const memoryId = randomUUID();
    let audioExtension: "mp3" | "wav" = "wav";
    let audioContentType = "audio/wav";
    let audioBytes: Buffer;
    if (this.googleAi && !this.demoMode && !job.fallbackReason) {
      try {
        const generated = await this.googleAi.generateMusic(analysis, session.preferredGenre);
        audioBytes = generated.audio;
        audioContentType = generated.mimeType;
        audioExtension = generated.mimeType.includes("mpeg") ? "mp3" : "wav";
      } catch (error) {
        job.fallbackReason = formatFallbackReason("Lyria", error);
        job.providerUsed = "DEMO";
        audioBytes = await readFile(this.preparedDemoSongPath);
      }
    } else {
      audioBytes = await readFile(this.preparedDemoSongPath);
    }
    job.status = "UPLOADING";
    job.progress = 88;
    if (this.supabase) {
      await this.supabase.uploadAudio(memoryId, audioBytes, audioContentType);
    } else {
      await mkdir(this.audioDirectory, { recursive: true });
      await writeFile(join(this.audioDirectory, `${memoryId}.${audioExtension}`), audioBytes);
    }
    await this.persistAfterDelay();

    const context = session.context!;
    const lyrics = Object.values(analysis.lyrics).join("\n\n");
    const memory: MusicMemory = {
      id: memoryId,
      sessionId: session.id,
      title: makeTitle(analysis.theme, context.time.localTime),
      summary: `A ${analysis.mood} ${session.source.toLowerCase()} memory from a ${context.weather.condition?.toLowerCase() ?? "changing"} drive.`,
      lyrics: redactPersonalInformation(lyrics),
      genre: analysis.recommendedGenre,
      audioUrl: `${this.apiOrigin}/api/audio/${memoryId}.${audioExtension}`,
      source: session.source,
      location: context.location,
      environment: {
        speedKmh: context.vehicle.speedKmh,
        temperatureCelsius: context.weather.temperatureCelsius,
        weather: context.weather.condition,
        timeOfDay: getTimeOfDay(context.time.localTime),
      },
      analysis,
      provider: job.providerUsed ?? "DEMO",
      createdAt: new Date().toISOString(),
    };
    this.store.memories.unshift(memory);
    job.status = "COMPLETED";
    job.progress = 100;
    job.memoryId = memoryId;
    job.completedAt = new Date().toISOString();
    session.transcript = undefined;
    await this.store.persist();
  }

  private async persistAfterDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await this.store.persist();
  }
}

function makeTitle(theme: string, localTime: string): string {
  const [hours] = localTime.split(":").map(Number);
  const timeTitle =
    hours !== undefined && hours >= 20
      ? "밤의 드라이브"
      : hours !== undefined && hours >= 5 && hours < 11
        ? "아침의 멜로디"
        : "우리의 장면";
  return `${theme.slice(0, 24)} · ${timeTitle}`;
}

function formatFallbackReason(provider: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : "unknown provider error";
  return `${provider} unavailable; used prepared demo track (${reason})`;
}
