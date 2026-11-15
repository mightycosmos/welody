import type {
  MusicAnalysis,
  MusicSession,
} from "@welody/shared";

const redactions: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[이메일]"],
  [/(?<!\d)(?:\+?82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g, "[전화번호]"],
  [/(?<!\d)\d{6}[-\s]\d{7}(?!\d)/g, "[식별번호]"],
  [/(?:[가-힣0-9]+(?:시|도|군|구|읍|면|동|리|로|길)\s*){1,5}\d+(?:-\d+)?(?:번지)?/g, "[주소]"],
  [/\b\d{2,4}[-\s]\d{3,4}[-\s]\d{4}\b/g, "[번호]"],
];

export function redactPersonalInformation(text: string): string {
  return redactions.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );
}

export function buildMusicAnalysis(session: MusicSession): MusicAnalysis {
  const context = session.context;
  if (!context) throw new Error("Session context is required for analysis");

  const transcript = redactPersonalInformation(session.transcript ?? "");
  const lowerTranscript = transcript.toLocaleLowerCase();
  const emotion = inferEmotion(lowerTranscript);
  const theme = summarizeTheme(transcript);
  const timeOfDay = getTimeOfDay(context.time.localTime);
  const mood = chooseMood(
    emotion,
    context.weather.condition,
    context.weather.temperatureCelsius,
    timeOfDay,
  );
  const tempo = context.vehicle.speedKmh >= 85
    ? "Upbeat, driving pulse"
    : context.vehicle.speedKmh <= 20
      ? "Slow, relaxed"
      : "Mid-tempo";
  const bpmTarget = Math.max(
    65,
    Math.min(140, Math.round(78 + context.vehicle.speedKmh * 0.35)),
  );
  const recommendedGenre = chooseGenre(
    session.preferredGenre,
    context.weather.condition,
    timeOfDay,
    context.vehicle.speedKmh,
  );
  const instruments = chooseInstruments(recommendedGenre, mood);
  const lyrics = buildLyrics(theme, mood, transcript);
  const musicPrompt = [
    `Create an original ${recommendedGenre} song.`,
    `Mood: ${mood}.`,
    `Tempo: ${tempo}, approximately ${bpmTarget} BPM.`,
    `Instruments: ${instruments.join(", ")}.`,
    `Vocal: warm and natural.`,
    `Story: ${theme}.`,
    `Environment: ${context.weather.condition ?? "weather unavailable"}, ${timeOfDay.toLowerCase()}, ${Math.round(context.vehicle.speedKmh)} km/h.`,
  ].join(" ");

  return {
    emotions: emotion,
    theme,
    recommendedGenre,
    tempo,
    bpmTarget,
    mood,
    instruments,
    vocalStyle: "Warm, intimate vocal",
    lyrics,
    musicPrompt,
  };
}

export function getTimeOfDay(localTime: string): string {
  const [hours] = localTime.split(":").map(Number);
  if (hours === undefined) throw new Error("Invalid local time");
  if (hours < 5) return "LATE_NIGHT";
  if (hours < 8) return "EARLY_MORNING";
  if (hours < 12) return "MORNING";
  if (hours < 17) return "AFTERNOON";
  if (hours < 20) return "EVENING";
  return "NIGHT";
}

function inferEmotion(text: string): string[] {
  const words: Array<[string[], string]> = [
    [["좋", "행복", "즐겁", "웃", "기쁘", "설레", "love", "happy"], "warm"],
    [["그립", "추억", "다시", "기억", "nostalg", "miss"], "nostalgic"],
    [["힘들", "슬프", "눈물", "외롭", "sad", "lonely"], "tender"],
    [["바다", "여행", "드라이브", "풍경", "sea", "travel"], "free-spirited"],
  ];
  const detected = words
    .filter(([hints]) => hints.some((hint) => text.includes(hint)))
    .map(([, emotion]) => emotion);
  return detected.length ? [...new Set(detected)] : ["reflective", "calm"];
}

function summarizeTheme(transcript: string): string {
  const sentence = transcript
    .split(/[.!?。！？\n]+/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!sentence) return "A quiet moment together on the road";
  const compact = sentence.replace(/\s+/g, " ");
  return compact.length > 90 ? `${compact.slice(0, 87)}…` : compact;
}

function chooseMood(
  emotion: string[],
  weather: string | undefined,
  temperature: number | undefined,
  timeOfDay: string,
): string {
  const base = emotion.includes("tender")
    ? "gentle and heartfelt"
    : emotion.includes("nostalgic")
      ? "warm and nostalgic"
      : emotion.includes("warm")
        ? "bright and affectionate"
        : "calm and reflective";
  const atmosphere =
    weather === "RAIN"
      ? " with a dreamy rainy-night atmosphere"
      : weather === "SNOW" || (temperature !== undefined && temperature < 3)
        ? " with a cozy winter glow"
        : timeOfDay === "NIGHT" || timeOfDay === "LATE_NIGHT"
          ? " under a soft night sky"
          : "";
  return `${base}${atmosphere}`;
}

function chooseGenre(
  preferred: string,
  weather: string | undefined,
  timeOfDay: string,
  speed: number,
): string {
  const descriptors: string[] = [];
  if (weather === "RAIN") descriptors.push("Dreamy");
  else if (weather === "SNOW") descriptors.push("Cozy");
  else if (weather === "CLEAR" && timeOfDay === "AFTERNOON") descriptors.push("Bright");
  if (speed >= 85) descriptors.push("Energetic");
  else if (timeOfDay === "NIGHT" || timeOfDay === "LATE_NIGHT") descriptors.push("Atmospheric");
  return descriptors.length ? `${descriptors[0]} ${preferred}` : preferred;
}

function chooseInstruments(genre: string, mood: string): string[] {
  const lower = genre.toLowerCase();
  if (lower.includes("rock")) return ["soft electric guitar", "warm bass", "gentle drums"];
  if (lower.includes("r&b")) return ["electric piano", "subtle synth bass", "laid-back drums"];
  if (lower.includes("acoustic") || lower.includes("indie")) {
    return ["acoustic guitar", "soft piano", "light percussion"];
  }
  if (lower.includes("edm") || lower.includes("synthwave")) {
    return ["warm synthesizer", "rounded bass", "gentle electronic drums"];
  }
  if (mood.includes("dreamy")) return ["soft electric piano", "ambient synth", "brush drums"];
  return ["soft electric piano", "warm synthesizer", "gentle drums"];
}

function buildLyrics(
  theme: string,
  mood: string,
  transcript: string,
): MusicAnalysis["lyrics"] {
  const sourceLine = transcript
    .split(/[.!?。！？\n]+/)
    .map((part) => part.trim())
    .find(Boolean);
  const safeLine = sourceLine
    ? sourceLine.replace(/[<>[\]{}]/g, "").slice(0, 70)
    : "조용히 번지는 우리만의 이야기";
  return {
    verse1: `${theme} 그 길 위에\n작은 빛 하나 내려와`,
    chorus: `${safeLine}\n이 순간을 노래로 기억해\n다시 만날 그 길 끝에서\n우리의 멜로디가 피어나`,
    verse2: `창밖의 계절이 바뀌어도\n${mood} 마음은 여기 남아`,
    bridge: `천천히 흘러가는 시간\n그 안에 우리가 있어`,
  };
}
