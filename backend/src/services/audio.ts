import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensurePreparedDemoSong(
  filePath: string,
  bundledAssetPath?: string,
): Promise<void> {
  try {
    await access(filePath);
    return;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  if (bundledAssetPath) {
    await mkdir(dirname(filePath), { recursive: true });
    await copyFile(bundledAssetPath, filePath);
    return;
  }

  const sampleRate = 22_050;
  const durationSeconds = 36;
  const sampleCount = sampleRate * durationSeconds;
  const bytes = Buffer.alloc(44 + sampleCount * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(sampleCount * 2, 40);

  const scale = 2 ** (1 / 12);
  const note = (semitone: number) => 220 * scale ** semitone;
  const chords = [
    [0, 4, 7, 11],
    [-5, -1, 2, 7],
    [-3, 0, 4, 7],
    [-8, -5, -1, 2],
  ];
  const melody = [12, 16, 19, 16, 14, 16, 19, 23, 21, 19, 16, 14, 12, 14, 16, 19];
  const beatSeconds = 60 / 92;

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const beat = Math.floor(time / beatSeconds);
    const beatPhase = (time % beatSeconds) / beatSeconds;
    const chord = chords[Math.floor(beat / 8) % chords.length]!;
    const fadeIn = Math.min(1, time / 1.4);
    const fadeOut = Math.min(1, (durationSeconds - time) / 2.4);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const bass = note(chord[0]! - 12);
    let sample =
      Math.sin(2 * Math.PI * bass * time) * 0.13 +
      Math.sin(2 * Math.PI * note(chord[0]!) * time) * 0.045;

    for (let voice = 1; voice < chord.length; voice += 1) {
      const frequency = note(chord[voice]!);
      sample += Math.sin(2 * Math.PI * frequency * time) * 0.035;
      sample += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.008;
    }

    if (beat % 2 === 0 && beatPhase < 0.35) {
      const kick = Math.sin(2 * Math.PI * (72 - beatPhase * 95) * time);
      sample += kick * Math.exp(-beatPhase * 14) * 0.15;
    }
    if (beat % 4 === 2 && beatPhase < 0.2) {
      sample += (Math.random() * 2 - 1) * Math.exp(-beatPhase * 28) * 0.035;
    }

    const melodyIndex = beat % melody.length;
    if (beat % 2 === 1 && beatPhase < 0.68) {
      const melodyFrequency = note(melody[melodyIndex]!);
      const pluck = Math.exp(-beatPhase * 4.5);
      sample += (Math.sin(2 * Math.PI * melodyFrequency * time) * 0.10 +
        Math.sin(2 * Math.PI * melodyFrequency * 2 * time) * 0.018) * pluck;
    }

    const value = Math.max(-1, Math.min(1, sample * envelope));
    bytes.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" }).catch(async (error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") return;
    throw error;
  });
}
