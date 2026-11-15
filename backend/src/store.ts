import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  GenerationJob,
  MusicMemory,
  MusicSession,
  PlaybackRecord,
} from "@welody/shared";
import type { DatabaseSnapshot, SupabaseService } from "./services/supabase.js";

interface Database extends DatabaseSnapshot {
  sessions: MusicSession[];
  memories: MusicMemory[];
  jobs: GenerationJob[];
  playbackHistory: PlaybackRecord[];
}

const emptyDatabase = (): Database => ({
  sessions: [],
  memories: [],
  jobs: [],
  playbackHistory: [],
});

export class Store {
  private data: Database = emptyDatabase();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly remote?: SupabaseService,
  ) {}

  async initialize(): Promise<void> {
    if (this.remote) {
      this.data = await this.remote.loadSnapshot();
      return;
    }
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(contents);
      if (!isDatabase(parsed)) {
        throw new Error(`Invalid local database format in ${this.filePath}`);
      }
      this.data = parsed;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        this.data = emptyDatabase();
        await this.persist();
        return;
      }
      throw error;
    }
  }

  get sessions(): MusicSession[] {
    return this.data.sessions;
  }

  get memories(): MusicMemory[] {
    return this.data.memories;
  }

  get jobs(): GenerationJob[] {
    return this.data.jobs;
  }

  get playbackHistory(): PlaybackRecord[] {
    return this.data.playbackHistory;
  }

  removePlaybackForMemory(memoryId: string): void {
    this.data.playbackHistory = this.data.playbackHistory.filter(
      (record) => record.memoryId !== memoryId,
    );
  }

  async persist(): Promise<void> {
    if (this.remote) {
      const snapshot = structuredClone(this.data);
      this.writeQueue = this.writeQueue.then(
        () => this.remote!.saveSnapshot(snapshot),
        () => this.remote!.saveSnapshot(snapshot),
      );
      return this.writeQueue;
    }
    const write = async () => {
      const temporaryPath = join(
        dirname(this.filePath),
        `.welody-${process.pid}.tmp`,
      );
      await writeFile(temporaryPath, JSON.stringify(this.data, null, 2), "utf8");
      await rename(temporaryPath, this.filePath);
    };
    const nextWrite = this.writeQueue.then(write, write);
    this.writeQueue = nextWrite;
    return nextWrite;
  }

  async deleteRemoteMemory(memoryId: string, extension: "mp3" | "wav"): Promise<void> {
    if (this.remote) await this.remote.deleteMemory(memoryId, extension);
  }
}

function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["sessions", "memories", "jobs", "playbackHistory"].every((key) =>
    Array.isArray(record[key]),
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
