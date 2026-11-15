import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudSnow,
  Compass,
  Disc3,
  Gauge,
  Headphones,
  MapPin,
  Mic,
  Navigation,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Thermometer,
  Trash2,
  Wind,
  X,
} from "lucide-react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type {
  GenerationJob,
  MusicMemory,
  NearbyMemory,
} from "@welody/shared";
import { genres } from "@welody/shared";
import { api } from "./api";

type WeatherCode = "CLEAR" | "CLOUDY" | "RAIN" | "SNOW" | "WINDY";
type SimulatorState = {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  temperature: number;
  weather: WeatherCode;
  time: string;
};

const defaults: SimulatorState = {
  latitude: 37.5665,
  longitude: 126.978,
  heading: 150,
  speed: 58,
  temperature: 18,
  weather: "CLEAR",
  time: "14:20",
};

const scenarios: Array<{
  name: string;
  genre: string;
  speed: number;
  temperature: number;
  weather: WeatherCode;
  time: string;
  latitude: number;
  longitude: number;
}> = [
  { name: "겨울밤 드라이브", genre: "Pop", speed: 75, temperature: -3, weather: "SNOW", time: "22:30", latitude: 37.5665, longitude: 126.978 },
  { name: "봄날의 햇살", genre: "Indie Pop", speed: 45, temperature: 20, weather: "CLEAR", time: "14:00", latitude: 37.5512, longitude: 126.9882 },
  { name: "비 내리는 밤", genre: "R&B", speed: 30, temperature: 10, weather: "RAIN", time: "23:00", latitude: 37.5796, longitude: 126.977 },
  { name: "고속도로", genre: "Rock", speed: 110, temperature: 18, weather: "CLEAR", time: "16:00", latitude: 37.5445, longitude: 127.055 },
];

const sampleConversation =
  "오늘 바다를 보러 와서 정말 좋다. 이렇게 같이 드라이브하니까 마음이 편안해. 다음에도 꼭 다시 오자.";

const weatherOptions: Array<{ value: WeatherCode; label: string; Icon: typeof Sun }> = [
  { value: "CLEAR", label: "맑음", Icon: Sun },
  { value: "CLOUDY", label: "흐림", Icon: Cloud },
  { value: "RAIN", label: "비", Icon: CloudDrizzle },
  { value: "SNOW", label: "눈", Icon: CloudSnow },
  { value: "WINDY", label: "바람", Icon: Wind },
];

function App() {
  const [sim, setSim] = useState(defaults);
  const [genre, setGenre] = useState<string>("Indie Pop");
  const [conversation, setConversation] = useState("");
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [memories, setMemories] = useState<MusicMemory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MusicMemory | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("SIMULATION MODE");
  const audioRef = useRef<HTMLAudioElement>(null);
  const generatedRef = useRef<HTMLDivElement>(null);
  const triggeredMemories = useRef(new Set<string>());
  const effectSequence = useRef(0);
  const previousPosition = useRef<{ latitude: number; longitude: number } | null>(null);

  const loadMemories = useCallback(async () => {
    const savedMemories = await api.getMemories();
    setMemories(savedMemories);
    return savedMemories;
  }, []);

  useEffect(() => {
    void loadMemories().catch((error: unknown) => setNotice(errorMessage(error)));
  }, [loadMemories]);

  useEffect(() => {
    void api.getHealth().then(async (health) => {
      setDemoMode(health.demoMode);
      setSourceLabel(
        health.demoMode
          ? "DEMO MODE · PREPARED AUDIO"
          : `${health.persistence} · ${health.mode === "AI_CONFIGURED" ? "AI CONFIGURED" : "SIMULATION"}`,
      );
      if (health.demoMode) {
        const demo = await api.getDemoConfig();
        setConversation(demo.conversationText);
        setGenre(demo.preferredGenre);
        setSim({
          latitude: demo.location.latitude,
          longitude: demo.location.longitude,
          heading: demo.location.heading,
          speed: demo.vehicle.speedKmh,
          temperature: demo.weather.temperatureCelsius,
          weather: demo.weather.condition,
          time: demo.time.localTime,
        });
      }
    }).catch((error: unknown) => setNotice(errorMessage(error)));
  }, []);

  useEffect(() => {
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
    const timer = window.setInterval(() => {
      void api.getJob(job.id).then((nextJob) => {
        setJob(nextJob);
        if (nextJob.status === "COMPLETED") {
          setNotice(
            nextJob.fallbackReason
              ? "실제 AI 생성이 제한되어 준비된 데모 음원으로 이어서 저장했어요."
              : nextJob.providerUsed === "GOOGLE"
                ? "실제 AI 생성 음원이 완성되어 위치와 함께 저장됐어요."
                : "데모 음원이 완성되어 위치와 함께 저장됐어요.",
          );
          void loadMemories().then(async (savedMemories) => {
            const memory = savedMemories.find((entry) => entry.id === nextJob.memoryId);
            if (!memory) return;
            try {
              await playMemory(memory, "MANUAL");
              setNotice("음악 메모리를 저장하고 재생을 시작했어요.");
            } catch {
              setSelectedMemory(memory);
              setNotice("음악 메모리는 저장됐어요. 재생 버튼을 눌러 음악을 들어보세요.");
            }
          }).catch((error: unknown) => setNotice(errorMessage(error)));
          generatedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (nextJob.status === "FAILED") {
          setNotice(nextJob.error ?? "음악 생성에 실패했습니다.");
        }
      }).catch((error: unknown) => {
        setNotice(errorMessage(error));
      });
    }, 750);
    return () => window.clearInterval(timer);
  }, [job, loadMemories]);

  useEffect(() => {
    const current = { latitude: sim.latitude, longitude: sim.longitude };
    const previous = previousPosition.current;
    previousPosition.current = current;
    if (!geofenceEnabled || !previous) return;
    const moved = previous.latitude !== current.latitude || previous.longitude !== current.longitude;
    if (!moved) return;

    const sequence = ++effectSequence.current;
    const timer = window.setTimeout(() => {
      void api.getNearby(sim.latitude, sim.longitude, 8).then(async ({ memories: nearby }) => {
        if (sequence !== effectSequence.current) return;
        const nearbyIds = new Set(nearby.map((memory) => memory.id));
        for (const id of triggeredMemories.current) {
          if (!nearbyIds.has(id)) triggeredMemories.current.delete(id);
        }
        const next = nearby.find((memory) => !triggeredMemories.current.has(memory.id));
        if (!next) return;
        triggeredMemories.current.add(next.id);
        await playMemory(next, "GEOFENCE");
        setNotice(`장소에 저장된 노래를 발견했어요 · ${next.title}`);
      }).catch((error: unknown) => setNotice(errorMessage(error)));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [sim.latitude, sim.longitude, geofenceEnabled]);

  const formattedTime = useMemo(() => sim.time, [sim.time]);
  const progress = job?.progress ?? 0;
  const isGenerating = Boolean(job && !["COMPLETED", "FAILED"].includes(job.status));

  async function playMemory(memory: MusicMemory | NearbyMemory, triggerType: "MANUAL" | "GEOFENCE") {
    await api.recordPlayback(memory.id, triggerType);
    setPlayingId(memory.id);
    setSelectedMemory(memory);
    window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = memory.audioUrl;
      void audio.play().catch(() => {
        setNotice("재생하려면 플레이어의 재생 버튼을 눌러주세요.");
      });
    }, 0);
  }

  async function generateSong() {
    if (!conversation.trim()) {
      setNotice("먼저 오늘의 대화를 입력해주세요.");
      return;
    }
    if (!consent) {
      setNotice("대화 텍스트를 AI 음악 생성에 사용하는 데 동의해주세요.");
      return;
    }
    setBusy(true);
    setJob(null);
    setNotice("");
    try {
      const session = await api.createSession(genre);
      await api.saveTranscript(session.id, conversation);
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
      await api.saveContext(session.id, {
        vehicle: { speedKmh: sim.speed, drivingState: sim.speed > 0 ? "MOVING" : "PARKED" },
        location: {
          latitude: sim.latitude,
          longitude: sim.longitude,
          heading: sim.heading,
          accuracyMeters: 8,
        },
        weather: {
          temperatureCelsius: sim.temperature,
          condition: sim.weather,
          precipitationMm: sim.weather === "RAIN" ? 1.2 : 0,
        },
        time: {
          localTime: sim.time,
          timeZone: browserTimeZone,
          timestamp: new Date().toISOString(),
        },
      });
      const response = await api.generate(session.id);
      setJob(await api.getJob(response.jobId));
      setNotice("환경과 대화를 분석하고 있어요.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function applyScenario(scenario: (typeof scenarios)[number]) {
    triggeredMemories.current.clear();
    setGenre(scenario.genre);
    setSim((current) => ({ ...current, ...scenario }));
    setNotice(`${scenario.name} 시나리오를 적용했어요.`);
  }

  function updateSim<K extends keyof SimulatorState>(key: K, value: SimulatorState[K]) {
    setSim((current) => ({ ...current, [key]: value }));
  }

  async function applyLiveWeather() {
    if (demoMode) {
      setNotice("Demo Mode에서는 미리 준비된 시연 날씨를 사용합니다.");
      return;
    }
    setWeatherLoading(true);
    try {
      const weather = await api.getWeather(sim.latitude, sim.longitude);
      setSim((current) => ({
        ...current,
        temperature: Math.round(weather.temperatureCelsius),
        weather: weather.condition,
      }));
      setNotice("현재 위치의 날씨를 불러왔어요.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setWeatherLoading(false);
    }
  }

  async function removeMemory(memory: MusicMemory) {
    if (!window.confirm(`"${memory.title}" 메모리를 삭제할까요?`)) return;
    try {
      await api.deleteMemory(memory.id);
      setMemories((current) => current.filter((entry) => entry.id !== memory.id));
      if (playingId === memory.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      setNotice("음악 메모리를 삭제했어요.");
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    setPlayingId(null);
  }

  const selectedWeather = weatherOptions.find((option) => option.value === sim.weather)!;
  const SelectedWeatherIcon = selectedWeather.Icon;
  const jobStage = job ? statusLabel(job.status) : "대화를 들려주세요";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Welody 홈">
          <div className="brand-mark"><AudioLines size={20} strokeWidth={2.2} /></div>
          <span>welody<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> 개발 시뮬레이터</div>
        <div className="topbar-right">
          <span className="simulation-pill"><span />{sourceLabel}</span>
          <button className="avatar-button" title="시뮬레이터 설정"><CircleHelp size={18} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR DRIVE, YOUR SONG</span>
              <h1>오늘의 장면</h1>
              <p>그 순간의 공기까지, 노래로 기억해요.</p>
            </div>
            <button className="icon-button" aria-label="시뮬레이션 초기화" onClick={() => {
              setSim(defaults);
              setGenre("Indie Pop");
              setConversation("");
              setConsent(false);
              setJob(null);
              setRecording(false);
              triggeredMemories.current.clear();
              setNotice("시뮬레이션을 초기화했어요.");
            }}><RotateCcw size={16} /></button>
          </div>

          <section className="control-section">
            <div className="section-title"><span>01</span><h2>지금의 드라이브</h2><i /></div>
            <div className="drive-card">
              <div className="drive-topline">
                <div className="drive-location"><MapPin size={14} /><span>서울 · 시뮬레이션 위치</span></div>
                <button className="mini-link" onClick={() => setGeofenceEnabled((value) => !value)}>
                  <span className={geofenceEnabled ? "toggle-dot enabled" : "toggle-dot"} />
                  자동 재생 {geofenceEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="drive-stats">
                <div className="speed-stat">
                  <div className="speed-value">{sim.speed}<span>km/h</span></div>
                  <span className="stat-caption">현재 속도</span>
                  <Gauge className="speed-gauge" size={18} />
                </div>
                <div className="drive-divider" />
                <div className="weather-stat">
                  <SelectedWeatherIcon size={28} strokeWidth={1.6} />
                  <div><strong>{sim.temperature}°</strong><span>{selectedWeather.label}</span></div>
                </div>
                <div className="drive-divider" />
                <div className="time-stat">
                  <span className="digital-time">{formattedTime}</span>
                  <span className="stat-caption">현지 시각</span>
                </div>
              </div>
              <div className="direction-line"><Compass size={14} /><span>{sim.heading}° · {sim.speed > 0 ? "주행 중" : "정차"}</span><span className="coords">{sim.latitude.toFixed(4)}, {sim.longitude.toFixed(4)}</span></div>
            </div>
          </section>

          <section className="control-section compact">
            <div className="section-title"><span>02</span><h2>환경 설정</h2><i /></div>
            <label className="range-control">
              <span className="range-label"><span><Gauge size={14} />차량 속도</span><b>{sim.speed}<small> km/h</small></b></span>
              <input aria-label="차량 속도" type="range" min="0" max="140" value={sim.speed} onChange={(event) => updateSim("speed", Number(event.target.value))} />
              <span className="range-ends"><span>정차</span><span>고속 주행</span></span>
            </label>
            <div className="weather-controls">
              <div className="field-label"><span><Cloud size={14} />날씨</span><button className="mini-link" onClick={() => void applyLiveWeather()} disabled={weatherLoading || demoMode}>{weatherLoading ? "불러오는 중…" : demoMode ? "시연 데이터" : "실시간 날씨"}</button></div>
              <div className="weather-picks">
                {weatherOptions.map(({ value, label, Icon }) => (
                  <button key={value} className={`weather-pick ${sim.weather === value ? "selected" : ""}`} onClick={() => updateSim("weather", value)} aria-label={label} title={label}>
                    <Icon size={17} /><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="range-control temperature-control">
              <span className="range-label"><span><Thermometer size={14} />외부 온도</span><b>{sim.temperature}<small> °C</small></b></span>
              <input aria-label="외부 온도" type="range" min="-15" max="40" value={sim.temperature} onChange={(event) => updateSim("temperature", Number(event.target.value))} />
            </div>
            <div className="inline-fields">
              <label className="select-field"><span><Navigation size={13} />이동 방향</span>
                <div className="select-wrap"><select value={sim.heading} onChange={(event) => updateSim("heading", Number(event.target.value))}>
                  <option value={0}>북쪽 · 0°</option><option value={45}>북동쪽 · 45°</option><option value={90}>동쪽 · 90°</option><option value={135}>남동쪽 · 135°</option><option value={180}>남쪽 · 180°</option><option value={225}>남서쪽 · 225°</option><option value={270}>서쪽 · 270°</option><option value={315}>북서쪽 · 315°</option>
                </select><ChevronDown size={14} /></div>
              </label>
              <label className="select-field"><span><Activity size={13} />현지 시각</span><input type="time" value={sim.time} onChange={(event) => updateSim("time", event.target.value)} /></label>
            </div>
            <div className="inline-fields location-fields">
              <label className="select-field"><span><MapPin size={13} />위도</span><input type="number" min="-90" max="90" step="0.0001" value={sim.latitude} onChange={(event) => updateSim("latitude", Number(event.target.value))} /></label>
              <label className="select-field"><span><MapPin size={13} />경도</span><input type="number" min="-180" max="180" step="0.0001" value={sim.longitude} onChange={(event) => updateSim("longitude", Number(event.target.value))} /></label>
            </div>
            <span className="map-hint">지도 위를 클릭하거나 좌표를 입력해 위치를 이동하세요.</span>
          </section>

          <section className="control-section genre-section">
            <div className="section-title"><span>03</span><h2>오늘의 장르</h2><i /></div>
            <div className="genre-grid">
              {genres.map((item, index) => (
                <button key={item} className={`genre-chip ${genre === item ? "active" : ""}`} onClick={() => setGenre(item)}>
                  <span className="genre-icon">{genreGlyph(item, index)}</span>{item}
                </button>
              ))}
            </div>
          </section>

          <section className="control-section scenario-section">
            <div className="section-title"><span>04</span><h2>빠른 시나리오</h2><i /></div>
            <div className="scenario-list">
              {scenarios.map((scenario, index) => (
                <button key={scenario.name} onClick={() => applyScenario(scenario)} className="scenario-button">
                  <span className={`scenario-orb orb-${index}`}><ScenarioIcon index={index} /></span>
                  <span className="scenario-info"><b>{scenario.name}</b><small>{scenario.weather === "SNOW" ? "눈" : scenario.weather === "RAIN" ? "비" : "맑음"} · {scenario.time} · {scenario.genre}</small></span>
                  <ArrowUpRight size={14} className="scenario-arrow" />
                </button>
              ))}
            </div>
          </section>

          <div className="privacy-note"><span className="privacy-lock">⌑</span><span>시뮬레이션 데이터는 실제 차량 데이터와 분리되어 저장됩니다.</span></div>
        </aside>

        <section className="main-content">
          <div className="welcome-row">
            <div><span className="eyebrow">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()}</span><h2>안녕하세요, <em>오늘을 담아볼까요?</em></h2></div>
            <div className="mood-weather"><span className="sun-halo"><SelectedWeatherIcon size={20} /></span><span><b>{sim.temperature}° · {selectedWeather.label}</b><small>서울, 지금 이 순간</small></span></div>
          </div>
          <div className="main-grid">
            <div className="left-column">
              <section className="creation-card">
                <div className="creation-art">
                  <div className="art-glow glow-one" /><div className="art-glow glow-two" />
                  <div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-ring ring-three" />
                  <div className="art-center"><AudioLines size={36} strokeWidth={1.2} /></div>
                  <div className="art-label"><span>W</span> MOMENT NO. 001</div>
                  <div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div><div className="art-spark spark-c">✧</div>
                </div>
                <div className="creation-content">
                  <div className="creation-header"><div><span className="eyebrow">A SONG FROM THIS MOMENT</span><h3>이 순간을 노래로</h3></div><div className="step-count">01 <span>/ 02</span></div></div>
                  <p className="creation-desc">함께 나눈 대화와 지금의 풍경을<br />세상에 하나뿐인 노래로 만들어드려요.</p>
                  <label className="conversation-label" htmlFor="conversation">오늘의 대화 <span>텍스트 직접 입력 · 음성 파일은 저장하지 않아요</span></label>
                  <textarea id="conversation" value={conversation} disabled={recording || isGenerating} placeholder="오늘 함께 나눈 이야기를 적어주세요…&#10;예: 오늘 바다를 보러 와서 정말 좋다. 다음에도 같이 오자." onChange={(event) => setConversation(event.target.value)} />
                  <div className="input-footer">
                    <button className="sample-link" onClick={() => setConversation(sampleConversation)}><Plus size={13} /> 예시 대화 채우기</button>
                    <span>{conversation.length} / 10,000</span>
                  </div>
                  <div className={`consent-box ${consent ? "checked" : ""}`}>
                    <button aria-pressed={consent} aria-label="AI 처리 동의" className="checkbox" onClick={() => setConsent((value) => !value)}>{consent && <Check size={12} />}</button>
                    <p>{demoMode ? "대화 텍스트를 시연용 음악 메모리 생성에 사용합니다." : "대화 텍스트를 AI 음악 생성에 전달하는 것에 동의합니다."}<br /><span>{demoMode ? "데모 모드에서는 외부 AI로 전송하지 않고 생성 후 원문을 삭제합니다." : "개인정보는 가사에 포함되지 않도록 처리됩니다."}</span></p>
                    <button className="consent-help" title="데이터 처리 방식"><CircleHelp size={15} /></button>
                  </div>
                  <div className="create-actions">
                    <button className={`record-button ${recording ? "recording" : ""}`} onClick={() => {
                      if (!consent) {
                        setNotice("먼저 데이터 처리에 동의해주세요.");
                        return;
                      }
                      if (!recording) {
                        if (!conversation.trim() && demoMode) setConversation(sampleConversation);
                        setRecording(true);
                        setNotice(demoMode
                          ? "샘플 대화 시뮬레이션 기록 중 · 실제 마이크는 사용하지 않아요."
                          : "텍스트 시뮬레이션 기록 중 · 실제 마이크는 사용하지 않아요.");
                      } else {
                        setRecording(false);
                        setNotice("대화 텍스트 기록을 마쳤어요.");
                      }
                    }}><span className="record-icon">{recording ? <span className="record-square" /> : <Mic size={16} />}</span>{recording ? "기록 종료" : "대화 기록 시작"}</button>
                    <button className="generate-button" disabled={!conversation.trim() || !consent || busy || isGenerating} onClick={() => void generateSong()}>
                      {busy || isGenerating ? <><span className="spinner" />{busy ? "준비 중" : "노래를 만드는 중"}</> : <><Sparkles size={16} /> 노래 만들기 <ArrowUpRight size={15} /></>}
                    </button>
                  </div>
                  {notice && <div className="notice" role="status"><span /><p>{notice}</p><button aria-label="알림 닫기" onClick={() => setNotice("")}><X size={14} /></button></div>}
                </div>
              </section>

              <section className="progress-card">
                <div className="progress-heading"><div><span className="eyebrow">YOUR MEMORY IN THE MAKING</span><h3>{isGenerating ? "노래가 만들어지고 있어요" : job?.status === "COMPLETED" ? "당신의 노래가 완성됐어요" : "여기서 기억이 시작돼요"}</h3></div><div className={`progress-disc ${isGenerating ? "spinning" : ""}`}><Disc3 size={24} /></div></div>
                <p className="progress-copy">{isGenerating ? `${jobStage} · 잠시만 기다려주세요.` : job?.status === "COMPLETED" ? `${job.providerUsed === "GOOGLE" ? "실제 AI 생성 음원" : "준비된 데모 음원"}이 이 순간의 위치와 함께 저장됐어요.` : "대화를 입력하고 노래 만들기를 누르면 진행 상황을 보여드릴게요."}</p>
                <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
                <div className="progress-steps">
                  {[
                    ["ANALYZING", "대화 분석"], ["GENERATING_LYRICS", "가사 만들기"],
                    ["GENERATING_MUSIC", "멜로디 작곡"], ["UPLOADING", "기억 저장"],
                  ].map(([status, label], index) => {
                    const isDone = Boolean(job && statusOrder(job.status) > statusOrder(status));
                    const isActive = job?.status === status;
                    return <div key={status} className={`progress-step ${isDone ? "done" : ""} ${isActive ? "current" : ""}`}><span>{isDone ? <Check size={10} /> : index + 1}</span>{label}</div>;
                  })}
                </div>
                {job?.status === "FAILED" && <div className="failure-box">{job.error ?? "생성에 실패했습니다."}</div>}
              </section>

              <section className="memories-section" ref={generatedRef}>
                <div className="memories-header"><div><span className="eyebrow">YOUR PERSONAL SOUNDTRACK</span><h3>장소에 남긴 노래 <span>{memories.length.toString().padStart(2, "0")}</span></h3></div><button className="text-button" onClick={() => void loadMemories()}><RotateCcw size={13} /> 새로고침</button></div>
                {memories.length === 0 ? (
                  <div className="empty-memories"><div><Headphones size={22} /></div><p>아직 저장된 노래가 없어요.<br /><span>첫 번째 기억을 노래로 만들어보세요.</span></p></div>
                ) : (
                  <div className="memory-list">
                    {memories.slice(0, 5).map((memory, index) => (
                      <article key={memory.id} className={`memory-row ${playingId === memory.id ? "playing" : ""}`} onClick={() => setSelectedMemory(memory)}>
                        <div className={`memory-cover cover-${index % 4}`}><AudioLines size={18} /></div>
                        <div className="memory-main"><b>{memory.title}</b><span>{memory.genre} <i /> {formatDate(memory.createdAt)}</span></div>
                        <div className="memory-place"><MapPin size={12} /><span>{memory.location.latitude.toFixed(3)}, {memory.location.longitude.toFixed(3)}</span></div>
                        <button className="memory-play" title={playingId === memory.id ? "일시정지" : "재생"} onClick={(event) => {
                          event.stopPropagation();
                          if (playingId === memory.id) stopAudio();
                          else void playMemory(memory, "MANUAL").catch((error: unknown) => setNotice(errorMessage(error)));
                        }}>{playingId === memory.id ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
                        <button className="memory-delete" aria-label={`${memory.title} 삭제`} onClick={(event) => { event.stopPropagation(); void removeMemory(memory); }}><Trash2 size={14} /></button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="right-column">
              <section className="map-card">
                <div className="map-heading"><div><span className="eyebrow">MEMORY MAP</span><h3>기억이 머문 곳</h3></div><button className="map-search" title="현재 위치로 이동" onClick={() => setSim((current) => ({ ...current, latitude: defaults.latitude, longitude: defaults.longitude }))}><Search size={16} /></button></div>
                <div className="map-wrapper">
                  <MapContainer center={[sim.latitude, sim.longitude]} zoom={13} zoomControl={false} scrollWheelZoom className="memory-map">
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapUpdater latitude={sim.latitude} longitude={sim.longitude} />
                    <MapClickHandler onLocation={(latitude, longitude) => setSim((current) => ({ ...current, latitude, longitude }))} />
                    <Circle center={[sim.latitude, sim.longitude]} radius={150} pathOptions={{ color: "#b4dfbd", fillColor: "#b4dfbd", fillOpacity: 0.08, weight: 1, dashArray: "5 5" }} />
                    <CircleMarker center={[sim.latitude, sim.longitude]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#3d9d65", fillOpacity: 1 }}>
                      <Tooltip direction="top" offset={[0, -8]}>내 위치 · SIMULATION</Tooltip>
                    </CircleMarker>
                    {memories.map((memory) => (
                      <CircleMarker key={memory.id} center={[memory.location.latitude, memory.location.longitude]} radius={playingId === memory.id ? 11 : 7} pathOptions={{ color: "#fff", weight: 2, fillColor: playingId === memory.id ? "#d28f63" : "#b58b6a", fillOpacity: 1 }} eventHandlers={{ click: () => setSelectedMemory(memory) }}>
                        <Tooltip direction="top" offset={[0, -6]}>{memory.title}</Tooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                  <div className="map-overlay"><span className="map-key"><i className="key-location" /> 현재 위치</span><span className="map-key"><i className="key-memory" /> 음악 기억 {memories.length}</span></div>
                  <button className="map-recenter" title="현재 위치" onClick={() => setSim((current) => ({ ...current }))}><Navigation size={15} /></button>
                </div>
                <div className="map-footer"><div><span className="location-pulse" /><span>차량의 현재 위치</span></div><button onClick={() => setGeofenceEnabled((value) => !value)}>반경 150m <ChevronDown size={13} /></button></div>
              </section>

              <section className="environment-card">
                <div className="environment-heading"><div><span className="eyebrow">MOMENT SIGNATURE</span><h3>이 순간의 조각들</h3></div><Sparkles size={16} /></div>
                <div className="environment-items">
                  <div className="environment-item"><span className="environment-icon speed-icon"><Gauge size={15} /></span><div><small>주행 에너지</small><b>{sim.speed >= 85 ? "다이내믹" : sim.speed <= 20 ? "고요한" : "부드러운"}</b></div><span className="environment-value">{sim.speed} km/h</span></div>
                  <div className="environment-item"><span className="environment-icon weather-icon"><SelectedWeatherIcon size={15} /></span><div><small>하늘의 표정</small><b>{weatherMood(sim.weather)}</b></div><span className="environment-value">{sim.temperature}°C</span></div>
                  <div className="environment-item"><span className="environment-icon time-icon"><Disc3 size={15} /></span><div><small>시간의 결</small><b>{timeMood(sim.time)}</b></div><span className="environment-value">{sim.time}</span></div>
                </div>
                <div className="signature-footer"><span>당신의 선택</span><b><span className="genre-dot" />{genre}</b><ArrowDownRight size={16} /></div>
              </section>

              <section className="replay-card">
                <div className="replay-icon"><Radio size={17} /></div>
                <div><b>장소가 노래를 기억해요</b><p>저장된 장소 반경 150m 안으로 이동하면<br />그날의 멜로디를 다시 만날 수 있어요.</p></div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <footer className="bottom-bar">
        <span><span className="footer-led" /> W E L O D Y <i>·</i> EVERY PLACE HAS A SONG</span>
        <span><span className="footer-privacy">⌑</span> 이 시뮬레이터는 실제 차량 데이터를 사용하지 않습니다</span>
        <span>v0.1.0 <i>·</i> <a href="https://document.pleos.ai/" target="_blank" rel="noreferrer">SIMULATOR MVP</a></span>
      </footer>

      {selectedMemory && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMemory(null); }}>
          <section className="memory-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" aria-label="닫기" onClick={() => setSelectedMemory(null)}><X size={17} /></button>
            <div className="modal-art"><AudioLines size={32} /><span>YOUR MEMORY</span></div>
            <span className="eyebrow">A SONG FROM {formatDate(selectedMemory.createdAt).toUpperCase()}</span>
            <h2 id="modal-title">{selectedMemory.title}</h2>
            <p className="modal-summary">{selectedMemory.summary}</p>
            <div className="modal-meta"><span><MapPin size={13} />{selectedMemory.location.latitude.toFixed(4)}, {selectedMemory.location.longitude.toFixed(4)}</span><span>{selectedMemory.genre}</span><span>{selectedMemory.environment.weather ?? "날씨 정보 없음"} · {selectedMemory.environment.speedKmh} km/h</span></div>
            <div className="lyrics-box"><span className="eyebrow">LYRICS</span><p>{selectedMemory.lyrics}</p></div>
            <button className="move-to-memory" onClick={() => {
              setSim((current) => ({
                ...current,
                latitude: selectedMemory.location.latitude,
                longitude: selectedMemory.location.longitude,
              }));
              setSelectedMemory(null);
              setNotice("저장된 장소로 이동했어요. 지오펜스 재생을 확인해보세요.");
            }}><Navigation size={14} /> 이 장소로 이동</button>
            <button className="modal-play" onClick={() => {
              if (playingId === selectedMemory.id) stopAudio();
              else void playMemory(selectedMemory, "MANUAL").catch((error: unknown) => setNotice(errorMessage(error)));
            }}>{playingId === selectedMemory.id ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}{playingId === selectedMemory.id ? "잠시 멈추기" : "이 순간 다시 듣기"}</button>
          </section>
        </div>
      )}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => { if (audioRef.current?.ended) setPlayingId(null); }} />
    </main>
  );
}

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
  }, [latitude, longitude, map]);
  return null;
}

function MapClickHandler({
  onLocation,
}: {
  onLocation: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onLocation(Number(event.latlng.lat.toFixed(5)), Number(event.latlng.lng.toFixed(5)));
    },
  });
  return null;
}

function ScenarioIcon({ index }: { index: number }) {
  if (index === 0) return <CloudSnow size={15} />;
  if (index === 1) return <Sun size={15} />;
  if (index === 2) return <CloudDrizzle size={15} />;
  return <Wind size={15} />;
}

function genreGlyph(genre: string, index: number) {
  const glyphs = ["♫", "✳", "⌁", "◖", "≈", "♡", "♬", "☾", "✧", "⌇", "♩", "◉"];
  return genre === "Classical" ? <span>♬</span> : <span>{glyphs[index % glyphs.length]}</span>;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "생성 대기 중",
    ANALYZING: "대화와 환경 분석 중",
    GENERATING_LYRICS: "가사 만들기",
    GENERATING_MUSIC: "멜로디 작곡",
    UPLOADING: "기억 저장 중",
    COMPLETED: "완성",
    FAILED: "생성 실패",
  };
  return labels[status] ?? status;
}

function statusOrder(status: string) {
  return ["PENDING", "ANALYZING", "GENERATING_LYRICS", "GENERATING_MUSIC", "UPLOADING", "COMPLETED", "FAILED"].indexOf(status);
}

function weatherMood(weather: WeatherCode) {
  return { CLEAR: "맑고 따뜻한", CLOUDY: "차분한", RAIN: "촉촉한", SNOW: "포근한", WINDY: "드라마틱한" }[weather];
}

function timeMood(time: string) {
  const hour = Number(time.split(":")[0]);
  if (hour < 5 || hour >= 23) return "깊어지는 밤";
  if (hour < 8) return "고요한 새벽";
  if (hour < 12) return "산뜻한 오전";
  if (hour < 17) return "나른한 오후";
  if (hour < 20) return "따뜻한 저녁";
  return "감성적인 밤";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
}

export default App;
