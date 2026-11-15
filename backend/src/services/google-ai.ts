import { z } from "zod";
import type { MusicAnalysis } from "@welody/shared";
import type { MusicSession } from "@welody/shared";
import { redactPersonalInformation } from "./context-engine.js";

const endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";
const analysisSchema = z.object({
  emotions: z.array(z.string()).min(1).max(5),
  theme: z.string().min(1).max(160),
  recommendedGenre: z.string().min(1).max(80),
  tempo: z.string().min(1).max(80),
  bpmTarget: z.number().int().min(50).max(180),
  mood: z.string().min(1).max(160),
  instruments: z.array(z.string()).min(1).max(8),
  vocalStyle: z.string().min(1).max(100),
  lyrics: z.object({
    verse1: z.string().min(1).max(1200),
    chorus: z.string().min(1).max(1200),
    verse2: z.string().min(1).max(1200),
    bridge: z.string().min(1).max(1200),
  }),
  musicPrompt: z.string().min(1).max(2000),
});

interface InteractionResponse {
  status?: string;
  output_text?: string;
  output_audio?: { data?: string; mime_type?: string };
  steps?: Array<{
    type?: string;
    text?: string;
    data?: string;
    mime_type?: string;
    content?: Array<{ type?: string; text?: string; data?: string; mime_type?: string }>;
  }>;
}

export class GoogleAiService {
  constructor(
    private readonly apiKey: string,
    private readonly geminiModel = "gemini-3.5-flash",
    private readonly lyriaModel = "lyria-3.5",
  ) {}

  async checkModelAccess(): Promise<{
    geminiModel: string;
    geminiAvailable: boolean;
    lyriaModel: string;
    lyriaAvailable: boolean;
  }> {
    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
        {
          headers: { "x-goog-api-key": this.apiKey },
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.name : "network error";
      throw new Error(`Google model access check failed (${reason}).`);
    }
    if (!response.ok) {
      throw new Error(
        `Google model access check failed (HTTP ${response.status}).`,
      );
    }
    const body = await response.json() as { models?: Array<{ name?: string }> };
    const names = new Set((body.models ?? []).map((model) =>
      (model.name ?? "").replace(/^models\//, ""),
    ));
    return {
      geminiModel: this.geminiModel,
      geminiAvailable: names.has(this.geminiModel),
      lyriaModel: this.lyriaModel,
      lyriaAvailable: names.has(this.lyriaModel),
    };
  }

  async analyze(session: MusicSession): Promise<MusicAnalysis> {
    if (!session.context || !session.transcript) {
      throw new Error("Conversation and context are required for AI analysis.");
    }

    const transcript = redactPersonalInformation(session.transcript);
    const response = await this.createInteraction(
      this.geminiModel,
      [
        "You create original, privacy-preserving song concepts and Korean lyrics.",
        "Return only a JSON object with keys emotions, theme, recommendedGenre, tempo, bpmTarget, mood, instruments, vocalStyle, lyrics, musicPrompt.",
        "lyrics must contain verse1, chorus, verse2, bridge as natural Korean song lyrics.",
        "Do not include names, phone numbers, email addresses, street addresses, or other identifying details.",
        `Keep the user's selected genre as the base style: ${session.preferredGenre}.`,
        `Conversation (personal identifiers already redacted): ${transcript}`,
        `Moment context: ${JSON.stringify({
          vehicle: session.context.vehicle,
          weather: session.context.weather,
          localTime: session.context.time.localTime,
        })}`,
      ].join("\n"),
    );

    if (!response.output_text) {
      throw new Error("Gemini returned no text for the music analysis.");
    }
    let value: unknown;
    try {
      value = JSON.parse(stripJsonFence(response.output_text));
    } catch {
      throw new Error("Gemini returned invalid JSON for the music analysis.");
    }
    const analysis = analysisSchema.parse(value);
    return {
      ...analysis,
      emotions: analysis.emotions.map(redactPersonalInformation),
      theme: redactPersonalInformation(analysis.theme),
      recommendedGenre: redactPersonalInformation(analysis.recommendedGenre),
      tempo: redactPersonalInformation(analysis.tempo),
      mood: redactPersonalInformation(analysis.mood),
      instruments: analysis.instruments.map(redactPersonalInformation),
      vocalStyle: redactPersonalInformation(analysis.vocalStyle),
      lyrics: {
        verse1: redactPersonalInformation(analysis.lyrics.verse1),
        chorus: redactPersonalInformation(analysis.lyrics.chorus),
        verse2: redactPersonalInformation(analysis.lyrics.verse2),
        bridge: redactPersonalInformation(analysis.lyrics.bridge),
      },
      musicPrompt: redactPersonalInformation(analysis.musicPrompt),
    };
  }

  async generateMusic(
    analysis: MusicAnalysis,
    preferredGenre: string,
  ): Promise<{ audio: Buffer; mimeType: string; lyrics?: string }> {
    const prompt = [
      `Create an original full-length Korean ${preferredGenre} song.`,
      analysis.musicPrompt,
      `Vocal direction: ${analysis.vocalStyle}.`,
      "Use the following original lyrics and preserve the verse/chorus structure:",
      `[Verse 1]\n${analysis.lyrics.verse1}`,
      `[Chorus]\n${analysis.lyrics.chorus}`,
      `[Verse 2]\n${analysis.lyrics.verse2}`,
      `[Bridge]\n${analysis.lyrics.bridge}`,
    ].join("\n\n");
    const response = await this.createInteraction(this.lyriaModel, prompt);
    const audio = response.output_audio?.data ?? findAudioData(response);
    if (!audio) {
      throw new Error(`Lyria returned no audio output (status: ${response.status ?? "unknown"}).`);
    }
    const bytes = Buffer.from(audio, "base64");
    if (bytes.length < 1024) {
      throw new Error("Lyria returned an empty or truncated audio file.");
    }
    return {
      audio: bytes,
      mimeType: response.output_audio?.mime_type ?? findAudioMimeType(response) ?? "audio/mpeg",
      lyrics: response.output_text,
    };
  }

  private async createInteraction(
    model: string,
    input: string,
  ): Promise<InteractionResponse> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({ model, input }),
        signal: AbortSignal.timeout(240_000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : "network error";
      throw new Error(`Google AI request failed before a response (${reason}).`);
    }
    if (!response.ok) {
      throw new Error(
        `Google AI request failed (HTTP ${response.status}). Check the API key, model access, billing, and quota.`,
      );
    }
    return response.json() as Promise<InteractionResponse>;
  }
}

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function findAudioData(response: InteractionResponse): string | undefined {
  for (const step of response.steps ?? []) {
    if (step.type?.toLowerCase().includes("audio") && step.data) return step.data;
    for (const item of step.content ?? []) {
      if (item.type?.toLowerCase().includes("audio") && item.data) return item.data;
    }
  }
  return undefined;
}

function findAudioMimeType(response: InteractionResponse): string | undefined {
  for (const step of response.steps ?? []) {
    if (step.type?.toLowerCase().includes("audio") && step.mime_type) return step.mime_type;
    for (const item of step.content ?? []) {
      if (item.type?.toLowerCase().includes("audio") && item.mime_type) return item.mime_type;
    }
  }
  return undefined;
}
