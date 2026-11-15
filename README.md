# Welody (윌로디)

> **Turn every journey into a song.**
>
> 우리가 함께한 순간, 그 순간의 날씨와 풍경, 그리고 대화를 하나의 노래로 기억합니다.

---

## 1. Project Overview

### 1.1 서비스 소개

**Welody(윌로디)**는 차량 안에서 나눈 대화와 그 순간의 위치·날씨·주행 정보를 음악 메모리로 남기는 위치 기반 서비스다.

현재 저장소에서 실행할 수 있는 앱은 React/TypeScript 웹 시뮬레이터와 Node.js 백엔드다. 시연 모드에서는 샘플 대화와 환경 데이터, 준비된 음원으로 음악 생성부터 위치 기반 메모리 재생까지 확인할 수 있다. 실제 Pleos Connect 앱 및 SDK 연결은 아직 구현되지 않았다.

제품의 목표는 차량 인포테인먼트 시스템에서 장르를 선택하고 대화를 기록해, AI 음악으로 만든 뒤 당시의 위치와 함께 저장하는 것이다. 실제 Pleos 마이크 입력과 Google 음악 생성은 시연 모드와 구분되며, 외부 API·SDK의 사용 가능 여부에 따라 별도 설정이 필요하다.

이때 사용자가 선택한 음악 장르만 반영하는 것이 아니라, 음악이 만들어지는 순간의 다양한 데이터를 함께 활용한다.

- 차량 속도
- 차량 위치
- 이동 방향
- 현재 날씨
- 외부 온도
- 현재 시간 및 시간대
- 사용자가 선택한 음악 장르
- 대화 내용과 감정

이러한 정보를 종합하여 그 순간에 가장 잘 어울리는 음악을 생성한다.

생성된 음악은 당시의 위치 정보와 연결하여 저장한다. 이후 차량이 같은 장소를 다시 방문하면 해당 장소에서 만들어졌던 노래를 재생한다.

### 1.2 핵심 컨셉

**장소가 추억을 재생하는 버튼이 된다.**

일반적인 음악 서비스가 사용자의 취향에 맞는 음악을 추천한다면, Welody는 사용자가 실제로 경험했던 순간에 어울리는 음악을 직접 만들어 저장한다.

예를 들어 다음과 같은 상황을 생각할 수 있다.

- 빠른 속도로 고속도로를 달리는 중이라면 역동적인 록 또는 EDM
- 추운 겨울날이라면 따뜻한 어쿠스틱 또는 감성적인 발라드
- 비가 내리는 밤이라면 몽환적인 R&B 또는 로파이
- 따뜻한 봄날 드라이브라면 밝고 경쾌한 인디 팝
- 친구들과 즐겁게 대화하는 순간이라면 신나는 팝이나 힙합

이러한 환경 데이터와 대화 내용을 결합해 하나뿐인 노래를 만든다.

### 1.3 핵심 사용자 경험

1. 사용자가 차량에서 Welody를 실행한다.
2. 원하는 음악 장르를 선택한다.
3. '대화 녹음하기' 버튼을 누른다.
4. Pleos SpeechToText SDK가 차량 마이크를 이용해 대화를 텍스트로 변환한다.
5. 차량 데이터, 위치 데이터, 날씨 데이터, 시간 데이터를 수집한다.
6. AI가 대화 내용과 환경 데이터를 분석한다.
7. AI가 가사와 음악 생성 프롬프트를 작성한다.
8. Google Lyria 3.5가 음악을 생성한다.
9. 생성된 음악과 당시의 위치 및 환경 정보를 저장한다.
10. 이후 해당 장소를 다시 방문하면 저장된 음악을 재생한다.

---

## 2. Development Environment

Welody는 두 가지 실행 환경을 지원해야 한다.

### 2.1 Pleos Connect App

실제 차량에서 실행되는 최종 애플리케이션이다.

- Platform: Pleos Connect
- OS: Android Automotive OS (AAOS)
- Language: Kotlin
- UI: Jetpack Compose
- Vehicle API: Pleos Vehicle SDK
- Speech Recognition: Pleos SpeechToText SDK
- Location: Pleos FusedLocation SDK
- Audio Playback: Android Media3 (ExoPlayer) 또는 Pleos 환경에서 지원되는 미디어 재생 방식
- Backend Communication: HTTPS REST API

실제 차량에 연결되었을 때는 Pleos SDK를 통해 차량의 데이터를 수집해야 한다.

### 2.2 Web Simulator

현재 실제 Pleos Connect Emulator를 사용할 수 없는 개발 상황을 고려하여 브라우저에서 실행되는 개발용 시뮬레이터를 구축한다.

Web Simulator는 Pleos SDK 없이 Welody의 핵심 기능을 테스트할 수 있어야 한다.

- 가상 차량 속도 조절
- 가상 GPS 위치 변경
- 가상 이동 방향 변경
- 날씨 및 외부 온도 설정
- 현재 시간 변경
- 음악 장르 선택
- 대화 텍스트 직접 입력
- AI 가사 생성
- AI 음악 생성
- 생성된 음악 재생
- 저장된 음악 목록 확인
- 지도에서 음악 생성 위치 확인
- 특정 위치 재방문 시 음악 재생 테스트

**중요:** Web Simulator는 실제 Pleos SDK를 흉내 내는 테스트 환경이다. 실제 차량 데이터가 들어오는 것처럼 표시해서는 안 되며, 시뮬레이션 데이터와 실제 SDK 데이터는 반드시 구분해야 한다.

### 2.3 권장 기술 스택

| 영역 | 기술 |
|---|---|
| 차량 앱 | Kotlin, Jetpack Compose |
| 차량 플랫폼 | Pleos Connect / AAOS |
| 차량 데이터 | Pleos Vehicle SDK |
| 음성 인식 | Pleos SpeechToText SDK |
| 위치 데이터 | Pleos FusedLocation SDK |
| 웹 시뮬레이터 | React, TypeScript, Vite |
| 웹 지도 | Leaflet 또는 MapLibre |
| Backend | Node.js, TypeScript, Express |
| Database | Supabase PostgreSQL |
| Audio Storage | Supabase Storage |
| 대화 분석 및 가사 | Gemini API |
| 음악 생성 | Google Lyria 3.5 |
| 날씨 데이터 | Open-Meteo API |
| API 통신 | REST API |
| Version Control | Git, GitHub |

기술 스택은 모듈화하여 구성하고, 특정 외부 서비스에 대한 의존성이 핵심 비즈니스 로직에 직접 들어가지 않도록 한다.

---

## 3. System Architecture

전체 시스템은 다음과 같은 구조로 개발한다.

```text
                  W E L O D Y
                       |
          +------------+------------+
          |                         |
    Pleos Connect App          Web Simulator
          |                         |
          |                    Simulation Data
          |                         |
          +------------+------------+
                       |
                  REST API
                       |
                Backend Server
                       |
          +------------+------------+
          |            |            |
      AI Service   Data Service  Location Service
          |            |            |
     Gemini API    PostgreSQL   Open-Meteo API
          |
      Lyrics Generation
          |
     Google Lyria 3.5
          |
      Audio Generation
          |
     Supabase Storage
          |
       Music Memory
          |
       Database
```

### 3.1 핵심 설계 원칙

1. Pleos SDK에 직접 의존하는 코드는 Android 앱의 Data Provider 계층에만 작성한다.
2. Web Simulator는 별도의 Simulation Data Provider를 사용한다.
3. 두 환경은 동일한 데이터 모델과 Backend API를 사용한다.
4. AI API Key는 절대 클라이언트 앱이나 웹 프론트엔드에 노출하지 않는다.
5. AI 음악 생성은 비동기 작업으로 처리한다.
6. 음성 파일은 저장하지 않고 SpeechToText SDK가 반환한 텍스트만 사용한다.
7. 실제 데이터와 시뮬레이션 데이터를 명확하게 구분한다.

---

## 4. Core Features

### 4.1 Music Genre Selection

사용자는 대화 기록을 시작하기 전에 원하는 음악 장르를 선택할 수 있어야 한다.

초기 지원 장르:

- Pop
- Indie Pop
- Rock
- Hip-hop
- R&B
- Ballad
- Jazz
- Lo-fi
- EDM
- Acoustic
- Classical
- Synthwave

선택한 장르는 음악 생성 과정에서 기본적인 음악적 방향을 결정한다.

단, 사용자가 선택한 장르가 최종 음악을 완전히 결정하지는 않는다.

차량 상태와 주변 환경을 분석한 AI가 사용자의 장르 선택을 유지하면서 세부적인 분위기, 템포, 악기, 멜로디 스타일을 조정해야 한다.

예를 들어 사용자가 Pop을 선택했을 때:

- 빠른 속도 + 낮: Energetic Pop
- 느린 속도 + 비 오는 밤: Dreamy Pop
- 추운 겨울 + 새벽: Emotional Pop

### 4.2 Conversation to Text

사용자가 '대화 녹음하기' 버튼을 누르면 Pleos SpeechToText SDK를 실행한다.

구현 요구사항:

- 사용자의 명시적인 동의 이후에만 음성 인식을 시작한다.
- SDK의 `initialize()`를 호출한다.
- 결과 리스너를 등록한다.
- `request()`를 호출해 음성 인식을 시작한다.
- `onUpdated(stt, completed)`를 통해 인식된 텍스트를 수집한다.
- 중간 결과와 최종 결과를 구분한다.
- 사용자가 종료 버튼을 누르면 `stop()`을 호출한다.
- SDK 사용이 끝나면 리스너와 리소스를 해제한다.

음성 인식은 반드시 Pleos SpeechToText SDK를 사용한다.

차량 마이크에서 입력된 원본 음성 데이터를 외부 음성 인식 API로 전송하지 않는다.

Welody는 원본 음성 파일을 저장하지 않는다. 음성 인식 결과로 반환된 텍스트만 저장하고 AI 처리에 사용한다.

**주의:** SpeechToText SDK가 제공하는 연속 인식 시간, 세션 제한, 다중 화자 인식 능력은 실제 SDK 환경에서 검증해야 한다. 현재 설계는 이러한 기능이 지원된다는 전제하에 작성하되, 구현부는 교체할 수 있도록 모듈화한다.

### 4.3 Vehicle Data Collection

음악을 생성하는 순간의 차량 상태를 수집한다.

우선 수집할 데이터:

| 데이터 | 활용 |
|---|---|
| Vehicle Speed | 음악 템포와 에너지 |
| Vehicle Location | 음악 생성 위치 저장 |
| Heading | 이동 방향 및 장소 재방문 판정 |
| Timestamp | 시간대별 분위기 |
| Driving State | 주행 상황에 따른 음악 분위기 |

속도 데이터 예시:

- 0~20km/h: Calm, Relaxed
- 20~60km/h: Moderate, Smooth
- 60~100km/h: Energetic
- 100km/h 이상: Dynamic, Powerful

위 값은 초기 음악 프롬프트 설계를 위한 예시 기준이다. 실제 차량 속도 데이터의 단위와 API 반환 형식을 확인하고 변환한다.

속도가 높다고 무조건 빠른 BPM을 생성하지 않는다. 속도는 음악의 에너지와 리듬을 조절하는 하나의 요소로 활용한다.

**Pleos 연동 주의사항**

- Pleos Vehicle SDK에서 실제 지원되는 데이터 API를 확인한다.
- 각 API의 Capability와 필요한 권한을 확인한다.
- 승인되지 않은 차량 권한을 임의로 사용하지 않는다.
- SDK의 비동기 콜백과 리소스 해제 규칙을 준수한다.
- 속도 데이터를 읽을 수 없다면 임의의 값을 실제 데이터처럼 사용하지 않는다.
- Web Simulator에서는 가상 속도를 사용한다.

실제 차량 속도는 Pleos에서 지원하는 공식 데이터 접근 방식을 우선 사용한다. 필요한 경우 AAOS `CarPropertyManager`의 `PERF_VEHICLE_SPEED` 지원 여부와 접근 권한도 검토한다.

### 4.4 Location Data Collection

Pleos FusedLocation SDK를 사용하여 차량 위치를 수집한다.

필수 데이터:

- Latitude
- Longitude
- Altitude (가능한 경우)
- Heading
- Timestamp
- Accuracy / Confidence

위치 데이터는 두 가지 용도로 사용한다.

1. 노래가 생성된 장소를 저장한다.
2. 차량이 이전에 노래를 만들었던 장소에 다시 진입했는지 확인한다.

위치 데이터는 단순한 좌표 하나가 아니라 시간과 함께 기록한다.

음악 생성 시점의 위치를 `Music Memory`에 연결한다.

위치 수신이 실패하거나 정확도가 낮으면 해당 위치의 신뢰도를 낮게 표시하고 잘못된 재생을 방지한다.

### 4.5 Weather Data Collection

현재 위치와 시간을 기준으로 날씨 데이터를 가져온다.

초기 날씨 API는 Open-Meteo를 사용한다.

수집할 데이터:

- Temperature
- Weather Condition
- Precipitation
- Cloud Cover
- Wind Speed

예시:

| 날씨 | 음악에 반영할 분위기 |
|---|---|
| 맑음 | Bright, Warm, Cheerful |
| 흐림 | Soft, Mellow, Nostalgic |
| 비 | Emotional, Dreamy, Atmospheric |
| 눈 | Warm, Cinematic, Gentle |
| 강풍 | Dramatic, Dynamic |
| 더운 날씨 | Light, Refreshing |
| 추운 날씨 | Warm, Intimate, Cozy |

날씨 데이터는 음악 생성 시점에 한 번 수집하고 Music Memory에 저장한다.

API 요청 실패 시 날씨를 임의로 만들어내지 않는다. 해당 정보 없이 음악을 생성할 수 있도록 처리한다.

날씨 API는 서버에서 호출하는 것을 기본으로 하며, 좌표와 시간 정보를 사용한다.

### 4.6 Time-based Music Context

음악을 생성한 시간대도 음악 분위기에 반영한다.

| 시간대 | 추천 분위기 |
|---|---|
| 05:00~08:00 | Fresh, Peaceful |
| 08:00~12:00 | Bright, Energetic |
| 12:00~17:00 | Relaxed, Light |
| 17:00~20:00 | Warm, Nostalgic |
| 20:00~23:00 | Emotional, Dreamy |
| 23:00~05:00 | Deep, Ambient, Intimate |

실제 시간은 차량의 현지 시간대를 기준으로 처리한다.

### 4.7 AI Music Context Engine

Welody에서 가장 중요한 핵심 로직이다.

사용자가 선택한 장르, 대화 텍스트, 차량 상태, 위치, 날씨, 시간 데이터를 하나의 Context Object로 통합한다.

예시 Context Object:

```json
{
  "preferredGenre": "Pop",
  "conversationText": "오늘 바다를 보러 와서 정말 좋다. 다음에도 같이 오자.",
  "vehicle": {
    "speedKmh": 75,
    "drivingState": "MOVING"
  },
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "heading": 180,
    "accuracyMeters": 8
  },
  "weather": {
    "temperatureCelsius": 4,
    "condition": "CLOUDY",
    "precipitationMm": 0
  },
  "time": {
    "localTime": "21:30",
    "timeOfDay": "NIGHT",
    "season": "WINTER"
  }
}
```

AI는 이 데이터를 바탕으로 다음 정보를 생성한다.

```json
{
  "emotion": ["nostalgic", "warm", "happy"],
  "theme": "A memorable night drive with someone special",
  "recommendedGenre": "Dreamy Pop",
  "tempo": "Mid-tempo",
  "bpmTarget": 100,
  "mood": "Warm and nostalgic",
  "instruments": [
    "Soft electric piano",
    "Warm synthesizer",
    "Gentle electronic drums"
  ],
  "vocalStyle": "Soft male vocal",
  "lyrics": {
    "verse1": "...",
    "chorus": "...",
    "verse2": "...",
    "bridge": "..."
  },
  "musicPrompt": "..."
}
```

위 JSON은 결과 구조를 설명하기 위한 예시이며 실제 AI 응답은 검증된 JSON Schema에 맞춰 파싱한다.

#### Context Engine의 우선순위

음악을 결정하는 데 다음 요소를 사용한다.

1. 대화 내용과 감정: 노래의 스토리와 가사 결정
2. 사용자가 선택한 장르: 기본적인 음악 스타일 결정
3. 날씨와 계절: 음악의 질감과 분위기 결정
4. 시간대: 멜로디와 감정적 분위기 결정
5. 차량 속도: 에너지, 리듬, 템포 결정

환경 데이터가 누락되더라도 나머지 정보로 음악을 생성할 수 있어야 한다.

환경 데이터가 사용자 대화의 의미보다 지나치게 큰 영향을 주지 않도록 한다.

### 4.8 AI Lyrics Generation

Gemini API를 이용하여 대화 내용을 가사로 변환한다.

단순히 대화 내용을 그대로 복사하지 않는다.

AI가 수행해야 하는 작업:

- 대화의 핵심 주제 추출
- 감정 분석
- 대화에 등장하는 주요 사건과 추억 추출
- 노래에 어울리는 스토리 구성
- 자연스러운 가사 생성
- Verse, Chorus, Bridge 등 음악적 구조 생성

가사는 대화의 의미와 감정을 보존해야 한다.

개인정보, 전화번호, 주소 등 민감한 정보가 가사에 포함되지 않도록 필터링한다.

### 4.9 AI Music Generation - Google Lyria 3.5

음악 생성은 Google Lyria 3.5를 사용한다.

Model ID:

`lyria-3.5`

Google Gemini API의 Interactions API를 이용한다.

음악 생성 요청에는 다음 내용을 포함한다.

- AI가 생성한 가사
- 사용자가 선택한 기본 장르
- AI가 분석한 음악 스타일
- BPM 또는 템포 방향
- 분위기
- 악기 구성
- 보컬 스타일
- 곡의 전체적인 구조
- 음악의 길이

음악 생성 요청 예시:

```text
Create a full-length Korean dreamy pop song.

Genre: Dreamy Pop
Mood: Warm, nostalgic, emotional
Tempo: Mid-tempo, approximately 100 BPM
Instruments: Soft electric piano, warm synthesizers,
gentle electronic drums.
Vocal: Soft male vocal.

The song should capture the feeling of a memorable
night drive during a cold winter evening.

Lyrics:

[Verse 1]
...

[Chorus]
...

[Verse 2]
...

[Bridge]
...
```

생성된 결과에서 다음 정보를 확보한다.

- Audio file
- Generated lyrics (가능한 경우)
- Generation status
- Generation metadata

오디오 결과를 서버에 저장하고 음악 파일 URL을 Music Memory와 연결한다.

**중요:** API Key는 반드시 Backend에서 관리한다. Android 앱이나 Web Simulator의 소스 코드에 Google API Key를 넣지 않는다.

음악 생성은 시간이 걸릴 수 있으므로 비동기 Job으로 구현한다.

사용자에게 다음 상태를 표시한다.

- Analyzing Conversation
- Creating Lyrics
- Composing Music
- Saving Your Memory
- Completed
- Failed

### 4.10 Music Memory

Welody에서 생성된 음악은 단순한 음악 파일이 아니다.

음악 파일과 함께 생성 당시의 환경 정보, 대화의 요약, 위치 데이터를 저장해야 한다.

Music Memory의 기본 구조:

```json
{
  "id": "memory_001",
  "title": "Our Winter Night",
  "audioUrl": "https://storage.example.com/music.mp3",
  "lyrics": "...",
  "genre": "Dreamy Pop",
  "summary": "A memorable conversation during a winter night drive.",
  "createdAt": "2026-11-15T21:30:00+09:00",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "heading": 180,
    "accuracyMeters": 8
  },
  "environment": {
    "speedKmh": 75,
    "temperatureCelsius": 4,
    "weather": "CLOUDY",
    "timeOfDay": "NIGHT"
  },
  "status": "COMPLETED"
}
```

실제 데이터베이스에서는 사용자 ID와 생성 작업 ID를 포함한다.

대화 원문은 별도 보관 여부를 최소화하고, 음악 생성에 필요한 정보만 저장한다. 기본 정책은 원본 음성 미저장, 대화 텍스트의 제한적 저장 또는 생성 완료 후 삭제다.

### 4.11 Location-based Music Playback

Welody의 핵심 차별화 기능이다.

차량이 과거에 음악을 생성했던 장소에 다시 진입하면 해당 Music Memory를 찾아 재생한다.

기본 로직:

1. 현재 차량 위치를 수신한다.
2. 저장된 Music Memory의 위치와 현재 위치를 비교한다.
3. 일정 반경 안에 진입했는지 확인한다.
4. 위치 정확도와 진행 상태를 확인한다.
5. 이미 재생한 음악인지 확인한다.
6. 재생 조건이 충족되면 음악을 재생한다.

초기 Geofence 설정:

- 기본 반경: 150m
- 위치 정확도 기준: 50m 이내를 우선 사용
- 진입 확인: 연속 위치 업데이트로 확인
- 중복 재생 방지: 동일 Memory의 재생 기록 관리
- 재생 종료 후 일정 시간 동안 같은 Memory 재알림 방지

위 수치는 초기 시뮬레이터 설정이며 실제 차량 테스트를 통해 조정한다.

위치 오차로 인해 같은 음악이 반복적으로 재생되지 않도록 Hysteresis 또는 재진입 상태 관리를 구현한다.

같은 장소에 여러 개의 Music Memory가 존재하면 다음 기준으로 처리한다.

- 가장 최근에 생성된 노래
- 사용자와 장소의 관련성이 높은 노래
- 여러 노래가 존재하면 선택 목록 제공

운전자에게 불필요한 시각적 조작을 요구하지 않는다. 자동 재생 여부는 사용자가 설정할 수 있어야 하며, 기본적으로 차량의 오디오 포커스 정책을 준수한다.

백그라운드 위치 접근 및 자동 재생 가능 여부는 Pleos의 실제 정책과 SDK 지원 범위를 검증한다.

---

## 5. Web Simulator Specification

실제 Pleos Emulator 없이도 전체 기능을 개발하고 검증할 수 있도록 웹 시뮬레이터를 구축한다.

Web Simulator는 단순한 정적 UI가 아니라 실제 앱의 주요 동작을 재현하는 인터랙티브 개발 도구여야 한다.

### 5.1 Simulator Layout

화면은 크게 세 영역으로 구성한다.

#### A. Vehicle Dashboard

가상의 차량 상태를 표시한다.

- Vehicle Speed
- Current Location
- Heading
- Current Time
- Weather
- Outside Temperature
- Driving State

사용자가 직접 값을 변경할 수 있어야 한다.

#### B. Welody App Preview

실제 Pleos 앱과 유사한 UI를 웹에서 확인한다.

- Welody 로고
- 음악 장르 선택
- 대화 기록 시작 버튼
- 대화 기록 중 상태 표시
- 대화 텍스트 표시
- 음악 생성 진행 상태
- 생성된 음악 플레이어
- Music Memory 목록

#### C. Simulation Controls

개발자가 상황을 임의로 만들 수 있는 컨트롤 영역이다.

| 컨트롤 | 동작 |
|---|---|
| Speed Slider | 가상 속도 변경 |
| Latitude / Longitude | 가상 위치 변경 |
| Heading | 진행 방향 변경 |
| Weather Select | 날씨 변경 |
| Temperature Slider | 외부 온도 변경 |
| Time Picker | 현재 시간 변경 |
| Genre Select | 음악 장르 선택 |
| Conversation Input | 대화 텍스트 입력 |
| Start Recording | 시뮬레이션 대화 기록 시작 |
| Stop Recording | 대화 기록 종료 |
| Generate Song | AI 음악 생성 |
| Move to Memory | 저장된 음악 위치로 이동 |
| Reset Simulation | 시뮬레이션 초기화 |

### 5.2 Simulator Conversation Mode

실제 마이크 없이 대화 텍스트를 직접 입력할 수 있어야 한다.

예시:

```text
오늘 날씨 정말 좋다.
이렇게 바다 보면서 드라이브하니까 기분이 좋네.
다음에는 겨울에 눈 오는 날에도 같이 오자.
```

사용자가 텍스트를 입력하고 종료 버튼을 누르면 실제 Pleos SDK가 텍스트를 반환한 것과 동일한 데이터 구조로 Backend에 전달한다.

Simulator는 다음 두 가지 모드를 지원한다.

- Manual Text Mode: 텍스트 직접 입력
- Sample Conversation Mode: 미리 준비한 예시 대화 사용

실제 마이크를 사용할 수 없는 환경에서는 음성 녹음 UI를 흉내 내기보다는 텍스트 입력을 통해 동일한 후속 과정을 검증한다.

### 5.3 Simulator Location Replay

지도에서 현재 차량 위치를 변경할 수 있어야 한다.

저장된 Music Memory 위치를 지도에 Marker로 표시한다.

사용자가 차량 위치를 이동시켜 특정 Memory의 Geofence 안으로 진입하면 음악이 재생되는 과정을 시뮬레이션한다.

다음 테스트 시나리오를 제공한다.

**Scenario A: Winter Night Drive**

- Genre: Pop
- Speed: 75 km/h
- Temperature: -3°C
- Weather: Snow
- Time: 22:30

예상 음악 스타일: Emotional Dreamy Pop

**Scenario B: Sunny Spring Drive**

- Genre: Indie Pop
- Speed: 45 km/h
- Temperature: 20°C
- Weather: Sunny
- Time: 14:00

예상 음악 스타일: Bright Acoustic Indie Pop

**Scenario C: Rainy Night**

- Genre: R&B
- Speed: 30 km/h
- Temperature: 10°C
- Weather: Rain
- Time: 23:00

예상 음악 스타일: Atmospheric Slow R&B

**Scenario D: Highway Drive**

- Genre: Rock
- Speed: 110 km/h
- Temperature: 18°C
- Weather: Clear
- Time: 16:00

예상 음악 스타일: Energetic Alternative Rock

위 시나리오는 음악 생성 프롬프트를 검증하기 위한 예시다. 실제 모델의 결과가 반드시 동일한 장르나 BPM을 생성한다는 의미는 아니다.

### 5.4 Simulator and Real App Data Contract

실제 Pleos 앱과 Web Simulator는 동일한 Backend API와 데이터 모델을 사용한다.

차이는 데이터 공급자에만 있어야 한다.

```text
Pleos App
  -> PleosVehicleDataProvider
  -> PleosLocationDataProvider
  -> PleosSpeechProvider
  -> Backend

Web Simulator
  -> SimulationVehicleDataProvider
  -> SimulationLocationDataProvider
  -> ManualConversationProvider
  -> Backend
```

Backend에서는 데이터가 실제 차량에서 왔는지 시뮬레이터에서 왔는지 구분할 수 있어야 한다.

예시:

```json
{
  "source": "SIMULATOR"
}
```

실제 차량 앱에서는:

```json
{
  "source": "PLEOS"
}
```

시뮬레이터 데이터는 실제 차량 데이터로 오인되지 않도록 UI에도 `SIMULATION MODE` 표시를 제공한다.

---

## 6. Backend API Design

초기 Backend API는 다음 구조로 구현한다.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions` | 대화 기록 세션 생성 |
| POST | `/api/sessions/:id/transcript` | 대화 텍스트 저장 및 추가 |
| POST | `/api/sessions/:id/context` | 차량 및 환경 데이터 저장 |
| POST | `/api/sessions/:id/generate` | AI 음악 생성 시작 |
| GET | `/api/jobs/:id` | 음악 생성 작업 상태 조회 |
| GET | `/api/memories` | 저장된 음악 목록 |
| GET | `/api/memories/:id` | 음악 상세 정보 |
| DELETE | `/api/memories/:id` | 음악 메모리 삭제 |
| POST | `/api/memories/:id/playback` | 재생 기록 저장 |
| GET | `/api/memories/nearby` | 현재 위치 주변 음악 조회 |

모든 API는 적절한 입력 검증과 오류 처리를 포함한다.

### 6.1 Song Generation Pipeline

```text
POST /api/sessions/:id/generate
             |
             v
       Validate Input
             |
             v
       Analyze Context
             |
             v
      Generate Lyrics
             |
             v
       Build Music Prompt
             |
             v
       Call Lyria 3.5
             |
             v
       Receive MP3 Data
             |
             v
       Upload to Storage
             |
             v
      Save Music Memory
             |
             v
          COMPLETED
```

음악 생성은 비동기 방식으로 처리한다.

API 요청이 들어오면 Job ID를 즉시 반환하고, 클라이언트는 Job 상태를 조회한다.

실패 시에는 재시도할 수 있도록 오류 코드와 상태를 저장한다.

---

## 7. Database Design

Supabase PostgreSQL을 사용한다.

### 7.1 users

사용자 정보

- id
- created_at

### 7.2 music_sessions

대화 및 음악 생성 세션

- id
- user_id
- preferred_genre
- transcript
- transcript_status
- source
- started_at
- ended_at

대화 원문은 서비스에 꼭 필요한 경우에만 저장한다. 사용자 동의 및 보관 정책을 적용하고, 기본적으로 장기 보관하지 않는다.

### 7.3 music_memories

생성된 음악 메모리

- id
- user_id
- session_id
- title
- summary
- lyrics
- genre
- audio_url
- latitude
- longitude
- altitude
- heading
- location_accuracy
- vehicle_speed
- temperature
- weather_condition
- precipitation
- time_of_day
- music_prompt
- created_at

### 7.4 playback_history

음악 재생 이력

- id
- user_id
- memory_id
- played_at
- trigger_type

### 7.5 generation_jobs

AI 음악 생성 작업

- id
- session_id
- status
- error_message
- started_at
- completed_at

상태 값:

- PENDING
- ANALYZING
- GENERATING_LYRICS
- GENERATING_MUSIC
- UPLOADING
- COMPLETED
- FAILED

---

## 8. Project Structure

초기 프로젝트는 다음과 같은 구조를 권장한다.

```text
welody/
│
├── README.md
├── .gitignore
├── .env.example
│
├── apps/
│   │
│   ├── android/
│   │   ├── app/
│   │   ├── build.gradle.kts
│   │   └── settings.gradle.kts
│   │
│   └── simulator/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── simulator/
│       │   └── types/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── gemini.service.ts
│   │   │   │   └── lyria.service.ts
│   │   │   ├── weather/
│   │   │   │   └── weather.service.ts
│   │   │   ├── music/
│   │   │   │   └── music-memory.service.ts
│   │   │   └── location/
│   │   │       └── geofence.service.ts
│   │   ├── jobs/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── types/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── PLEOS_INTEGRATION.md
│   └── SIMULATOR_GUIDE.md
│
└── supabase/
    └── migrations/
```

실제 구현 시 필요에 따라 파일을 추가할 수 있지만, 앱, 시뮬레이터, 백엔드의 책임을 명확히 분리한다.

---

## 9. Pleos SDK Integration Rules

Pleos SDK의 공식 문서를 기준으로 구현한다.

공식 문서:

- Pleos Connect SDK Overview: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/
- SpeechToText: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/SpeechToText/intro
- FusedLocation: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/FusedLocation/intro
- Vehicle SDK: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro
- My Project SDK Access: https://document.pleos.ai/en/docs/pleos-only/create-my-project

### 9.1 SDK Availability

SDK의 사용 가능 여부는 Pleos Playground의 My Project에서 확인한다.

SDK 문서에 기능이 존재한다는 사실만으로 실제 프로젝트에서 해당 SDK를 사용할 수 있다고 가정하지 않는다.

현재 문서의 접근 상태와 실제 프로젝트의 접근 상태가 다를 수 있으므로 다음 상태를 확인한다.

- Not Available Yet
- Request Required
- Under Review
- Ready to Use
- Rejected

SpeechToText와 FusedLocation이 실제 프로젝트에서 사용 불가능한 경우에도 Web Simulator 개발은 계속 진행할 수 있어야 한다.

### 9.2 SpeechToText

SDK의 공식 생명주기를 따른다.

```text
Create SpeechToText
       |
Initialize
       |
Add Result Listener
       |
Set Locale (Korean)
       |
Request
       |
Receive onUpdated()
       |
Stop
       |
Remove Listener
       |
Release
```

실제 메서드와 Listener의 정확한 시그니처는 설치된 SDK 버전의 공식 API Reference를 따른다.

### 9.3 FusedLocation

다음 기능을 중심으로 구현한다.

- `getLastKnownLocation()`
- `registerFusedLocationCallback()`
- `unregisterFusedLocationCallback()`
- `isSupported()`
- `release()`

위치 접근 권한과 백그라운드 동작 정책을 확인한다.

### 9.4 Vehicle SDK

Vehicle SDK의 `initialize()`를 통해 연결하고 필요한 도메인 객체를 획득한다.

차량 데이터는 지원 Capability를 확인한 뒤 읽는다.

등록한 Callback은 반드시 해제하고, SDK 사용이 끝나면 `release()`를 호출한다.

필요한 최소 권한만 선언한다.

### 9.5 SDK Adapter Pattern

실제 Pleos SDK 구현을 다음 인터페이스와 분리한다.

```kotlin
interface VehicleDataProvider {
    suspend fun getCurrentVehicleData(): VehicleData
}

interface LocationDataProvider {
    suspend fun getCurrentLocation(): LocationData
}

interface SpeechProvider {
    fun startRecognition()
    fun stopRecognition()
}
```

위 코드는 아키텍처를 설명하는 개념적 인터페이스다. 실제 구현에서는 SDK Listener와 Android 생명주기에 맞춰 구체화한다.

Web Simulator에서는 동일한 데이터 모델을 반환하는 별도의 Simulation Provider를 사용한다.

---

## 10. Security and Privacy

Welody는 차량 내부 대화와 위치 데이터를 다루므로 개인정보 보호를 중요하게 취급한다.

반드시 지켜야 할 사항:

1. 사용자 동의 없이 음성 인식을 시작하지 않는다.
2. 녹음 또는 대화 기록이 활성화된 상태를 명확하게 표시한다.
3. 사용자가 언제든 대화 기록을 중단할 수 있어야 한다.
4. 원본 음성 파일을 저장하지 않는다.
5. 차량 마이크의 원본 오디오를 외부 음성 인식 API에 보내지 않는다.
6. Pleos SpeechToText SDK를 사용하여 텍스트로 변환한다.
7. 외부 AI API로 텍스트를 전달하기 전에 사용자에게 데이터 처리 내용을 안내한다.
8. 개인정보가 가사에 포함되지 않도록 필터링한다.
9. Google API Key와 Supabase Service Role Key를 클라이언트에 노출하지 않는다.
10. 사용자가 생성된 Music Memory를 삭제할 수 있어야 한다.
11. 위치 데이터는 음악 생성 및 재생에 필요한 범위에서만 보관한다.
12. 실제 차량 데이터와 시뮬레이터 데이터의 저장 및 표시를 구분한다.

차량 탑승자 여러 명의 대화를 처리하는 경우 참여자 모두의 동의가 확보되어야 한다.

공모전의 음성 데이터 처리 규정과 Pleos App Market 정책을 반드시 준수한다.

---

## 11. UI/UX Design Direction

Welody는 차량 인포테인먼트 화면에 적합한 직관적인 디자인을 사용한다.

디자인 키워드:

- Minimal
- Premium
- Emotional
- Calm
- Modern
- Music-oriented

### Main Screen

화면 구성:

1. Welody Logo
2. 현재 음악 장르
3. 현재 차량 및 환경 정보
4. 대화 기록 시작 버튼
5. 최근 생성된 음악
6. Music Memory 접근 버튼

### Recording Screen

화면 구성:

- Recording Indicator
- Recording Duration
- Recognized Conversation Text
- Stop Recording Button

대화 기록이 활성화되었음을 쉽게 알 수 있어야 한다.

### Music Generation Screen

화면 구성:

- AI가 분석한 감정
- 선택된 음악 장르
- 환경 분석 결과
- 음악 생성 진행 상태
- 생성 완료 후 음악 플레이어

### Music Memory Screen

화면 구성:

- 생성된 음악 목록
- 음악 제목
- 생성 날짜
- 음악 장르
- 생성 위치
- 재생 버튼
- 지도에서 위치 보기
- 삭제 버튼

실제 차량 화면에서는 운전 중 복잡한 조작을 요구하지 않는다.

---

## 12. Development Roadmap

개발은 다음 순서로 진행한다.

### Phase 1. Project Foundation

- 프로젝트 폴더 구조 생성
- Backend 초기 설정
- React Web Simulator 초기 설정
- 공통 데이터 모델 정의
- API 통신 구조 설정
- 환경변수 설정

완료 기준: 웹 시뮬레이터와 Backend가 정상적으로 통신한다.

### Phase 2. Web Simulator

- 차량 데이터 대시보드
- 속도 조절
- 위치 조절
- 날씨 변경
- 시간 변경
- 음악 장르 선택
- 대화 텍스트 입력
- 시뮬레이션 상태 표시

완료 기준: 실제 Pleos SDK 없이 다양한 환경을 재현할 수 있다.

### Phase 3. AI Context Engine

- 대화 분석
- 감정 추출
- 가사 생성
- 환경 데이터 분석
- 음악 스타일 결정
- Lyria Prompt 생성

완료 기준: 입력 데이터에 따라 서로 다른 음악 생성 프롬프트가 만들어진다.

### Phase 4. Lyria Music Generation

- Google Gemini API 연결
- Lyria 3.5 연결
- 음악 생성 Job 처리
- MP3 데이터 수신
- Supabase Storage 저장
- 음악 플레이어 구현

완료 기준: 사용자가 입력한 대화와 환경 데이터를 기반으로 실제 음악을 생성하고 재생할 수 있다.

### Phase 5. Music Memory

- 데이터베이스 연동
- 음악 메모리 저장
- 지도에 생성 위치 표시
- 저장된 음악 목록
- 상세 화면
- 삭제 기능

완료 기준: 생성된 음악이 위치 정보와 함께 영구 저장된다.

### Phase 6. Location-based Replay

- Geofence 구현
- 현재 위치와 저장 위치 비교
- 재방문 감지
- 중복 재생 방지
- 음악 자동 재생 또는 알림
- 시뮬레이터에서 위치 이동 테스트

완료 기준: 시뮬레이터에서 저장된 장소에 다시 진입하면 해당 음악이 재생된다.

### Phase 7. Pleos Integration

- Pleos Connect Android 프로젝트 설정
- Pleos SDK 의존성 추가
- SDK 접근 권한 확인
- SpeechToText 연결
- Vehicle SDK 연결
- FusedLocation 연결
- Backend 연결
- 실제 차량 환경 테스트

완료 기준: Web Simulator에서 검증한 동일한 서비스 흐름을 Pleos 앱에서도 실행할 수 있다.

---

## 13. Important Instructions for GitHub Copilot

GitHub Copilot은 다음 지침을 반드시 준수해야 한다.

### 13.1 Development Principles

- README의 서비스 목적과 아키텍처를 먼저 이해한다.
- 기능을 한 번에 모두 구현하지 않는다.
- 각 Phase를 순차적으로 구현한다.
- 파일을 생성하기 전에 기존 프로젝트 구조를 확인한다.
- 기존 구현을 불필요하게 삭제하거나 교체하지 않는다.
- TypeScript의 타입 안정성을 유지한다.
- API 응답 형식과 데이터 모델을 일관되게 유지한다.
- 컴포넌트와 서비스의 책임을 분리한다.
- 모든 비동기 작업에 오류 처리를 적용한다.
- 로딩, 성공, 실패 상태를 UI에 표시한다.
- 사용하지 않는 라이브러리를 추가하지 않는다.
- 실제 SDK의 API와 권한을 추측해서 작성하지 않는다.

### 13.2 API and SDK Rules

- Pleos 공식 문서를 우선 참고한다.
- 공식 문서에 없는 SDK API를 임의로 만들어내지 않는다.
- SDK 버전은 공식 문서와 실제 Maven Repository를 확인한다.
- Pleos SDK를 사용할 수 없는 경우 Simulator Provider로 개발한다.
- 실제 SDK 구현은 Adapter Pattern으로 분리한다.
- 실제 차량 데이터와 시뮬레이션 데이터를 구분한다.
- 외부 API Key를 Frontend에 저장하지 않는다.

### 13.3 AI Rules

- 대화 텍스트 분석과 음악 생성은 서로 다른 단계로 처리한다.
- Gemini API로 대화의 핵심 내용과 감정을 분석한다.
- 사용자가 선택한 장르를 기본 조건으로 유지한다.
- 차량, 날씨, 시간 데이터를 음악 생성 프롬프트에 반영한다.
- Lyria 3.5의 공식 API 문서에 맞춰 구현한다.
- Lyria API 호출과 MP3 저장은 Backend에서 처리한다.
- 음악 생성이 실패하더라도 세션 데이터가 유실되지 않도록 한다.

### 13.4 Simulator Rules

- Web Simulator는 실제 Pleos SDK 없이 실행 가능해야 한다.
- 시뮬레이터에서 입력한 값이 실제 차량 데이터처럼 표시되어서는 안 된다.
- 시뮬레이터와 실제 앱이 동일한 Backend API를 사용해야 한다.
- 가상 위치 이동으로 Geofence를 테스트할 수 있어야 한다.
- AI API 연결이 없는 경우에도 Mock Mode로 전체 UI 흐름을 테스트할 수 있어야 한다.

### 13.5 Code Quality

- 중요한 로직에는 주석을 작성한다.
- 함수와 변수 이름은 의미가 명확해야 한다.
- 환경변수는 `.env.example`에 문서화한다.
- 에러 메시지는 개발자가 원인을 파악할 수 있도록 구체적으로 작성한다.
- 기능 구현 후 해당 기능을 테스트한다.
- 개발 완료 시 변경한 파일과 실행 방법을 요약한다.

---

## 14. Environment Variables

`.env.example` 파일에는 다음 항목을 정의한다.

```env
# Backend
PORT=3000
NODE_ENV=development
DATA_DIR=./backend/data
AI_PROVIDER=mock
PERSISTENCE_PROVIDER=local
API_PUBLIC_URL=http://localhost:3000

# Google Gemini / Lyria (server only; choose AI_PROVIDER=google)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
LYRIA_MODEL=lyria-3.5

# Supabase (server only; apply migration before choosing PERSISTENCE_PROVIDER=supabase)
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MUSIC_STORAGE_BUCKET=welody-music

# Weather
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast

# Simulator
VITE_API_BASE_URL=http://localhost:3000
```

실제 비밀 키는 `.env`에만 저장하며 GitHub에 업로드하지 않는다.

---

## 15. MVP Definition

첫 번째 MVP는 다음 기능을 반드시 구현한다.

- [ ] 웹 시뮬레이터 실행
- [ ] 음악 장르 선택
- [ ] 가상 차량 속도 변경
- [ ] 가상 위치 변경
- [ ] 날씨 및 시간 변경
- [ ] 대화 텍스트 입력
- [ ] 대화 내용 분석
- [ ] 환경 데이터 분석
- [ ] 가사 생성
- [ ] Lyria 3.5 음악 생성
- [ ] MP3 저장
- [ ] 음악 재생
- [ ] Music Memory 저장
- [ ] 생성 위치 지도 표시
- [ ] 위치 재방문 시 음악 재생 테스트

초기 MVP에서는 실제 차량 마이크와 Pleos SDK 연결을 제외하고 Web Simulator를 통해 전체 흐름을 먼저 완성한다.

그다음 실제 Pleos SDK를 연결한다.

---

## 16. Final Product Vision

Welody가 궁극적으로 제공하는 경험은 단순히 AI가 음악을 만들어주는 것이 아니다.

누군가와 나눈 대화, 함께 지나간 도로, 당시의 날씨와 시간, 차량의 움직임이 하나의 노래로 남는다.

그리고 시간이 흘러 다시 그 장소를 지나갈 때, 그날의 노래가 다시 재생된다.

**Welody — Every place has a song. Every song has a memory.**

---

## 17. 현재 구현 및 로컬 실행

현재 저장소에는 README의 MVP 중 **Web Simulator, Backend API, 컨텍스트 분석, Music Memory, 지도 및 지오펜스 재생 흐름**이 구현되어 있다. 시연은 `DEMO_MODE=true`로 외부 AI·DB 요청 없이 수행하며, 실제 API 연결은 `DEMO_MODE=false`로 전환한다.

### 심사 제출 정보

| 항목 | 내용 |
|---|---|
| 앱 이름 | Welody (윌로디) |
| 한 줄 소개 | 대화와 주행 순간을 노래로 기억하고, 장소에서 다시 재생하는 위치 기반 음악 메모리 |
| 제출 가능한 앱 | 브라우저에서 실행하는 Web Simulator |
| Pleos Connect 에뮬레이터 | 사용하지 않음. 개발 환경에서 에뮬레이터 및 Pleos SDK에 접근할 수 없어 버전 정보가 없음 |
| 화면 규격 | Pleos 화면 규격은 미확정. 웹 시뮬레이터 시연 캡처는 브라우저 뷰포트 1440 × 1000 px 기준이며, Pleos 에뮬레이터 해상도를 의미하지 않음 |
| APK / GitHub Release | Android APK는 아직 빌드하지 않았고 등록된 Release도 없음. [GitHub Releases](https://github.com/mightycosmos/welody/releases)에서 추후 배포 예정 |

### 테스트 환경 및 필요한 설정

- 확인한 환경: Ubuntu 24.04, Node.js 24.22.2, npm 11.19.1. Node.js 20 이상 필요.
- 지도 타일 표시에는 인터넷 연결이 필요하다. Demo Mode의 대화 분석·음악 재생에는 외부 API 키가 필요하지 않다.
- `.env.example`을 루트 `.env`로 복사한 뒤 실행한다. 기본 `DEMO_MODE=true`는 시연에 필요한 설정을 포함한다.

```bash
npm install
cp .env.example .env
npm run dev
```

- Web Simulator: `http://localhost:5173`
- Backend health check: `http://localhost:3000/api/health`

테스트와 빌드는 다음 명령으로 확인한다.

```bash
npm test
npm run build
```

실제 AI 연결을 시험하려면 `.env`에서 `DEMO_MODE=false`, `AI_PROVIDER=google`을 설정하고 서버 전용 `GEMINI_API_KEY`를 입력한다. 실제 Supabase 저장을 사용할 경우 `PERSISTENCE_PROVIDER=supabase`, `SUPABASE_URL`, 서버 전용 `SUPABASE_SECRET_KEY`(또는 `SUPABASE_SERVICE_ROLE_KEY`)를 설정하고 `supabase/migrations/`의 마이그레이션을 먼저 적용해야 한다. 키를 프론트엔드에 입력하지 않는다.

### 로컬 데이터 저장

생성된 음악과 세션 메타데이터는 개발용 로컬 JSON 저장소(`backend/data/`)에 유지된다. 실제 배포 전에는 Supabase migration을 적용하고 저장소 구현을 PostgreSQL 및 Supabase Storage로 전환해야 한다.

### 시뮬레이터에서 확인할 수 있는 동작

- 차량 속도, 위치(좌표 입력 또는 지도 클릭), 이동 방향, 날씨, 온도, 시간 및 장르 변경
- 동의 후 대화 텍스트 입력, 샘플 대화 사용, 비동기 생성 Job 진행 상태 확인
- 음악 메모리 목록/상세 확인, 지도 Marker, 재생 기록 및 메모리 삭제
- Geofence 반경 150m와 위치 정확도 검증, 저장된 Memory 위치로 이동해 재방문 재생 테스트
- 현재 좌표의 Open-Meteo 날씨 조회 (실패 시 오류 표시, 임의 데이터 대체 없음)
- Demo Mode에서 미리 채워진 대화/환경 시나리오와 36초 오리지널 WAV 음원으로 생성 Job, 저장, 재생 흐름 수행
- Google 생성 실패 시 Job이 중단되지 않고 Demo 음원으로 전환 (Job 결과에 공급자와 대체 사유 표시)

### 현재 시뮬레이션 범위와 다음 단계

- `DEMO_MODE=true`이면 Google/Supabase 요청을 하지 않고 로컬 Demo 저장소, 미리 준비된 시나리오, 36초 오리지널 WAV 음원을 사용한다. 화면·REST·Job·메모리·재생·지오펜스 흐름은 실제 모드와 동일하다.
- `DEMO_MODE=false` 및 `AI_PROVIDER=google`이면 Backend가 Google Interactions API의 Gemini 모델로 가사/스타일을 분석하고 Lyria 모델로 음악을 생성한다. API Key는 Backend에서만 사용한다. 모델 목록 접근과 실제 생성 성공은 별도로 확인하며 생성 실패 시 준비된 Demo 음원으로 자연스럽게 전환한다.
- Google AI는 계정의 결제·사용량 할당량에 따라 실패할 수 있다. Job은 실패 사유를 표시하며, API 할당량 오류를 모의 성공으로 숨기지 않는다.
- `PERSISTENCE_PROVIDER=supabase`이면 Supabase PostgreSQL 및 비공개 Storage 버킷에 연결한다. 기본 `local`은 개발용 JSON과 로컬 오디오 저장소다. Supabase를 켜기 전에 `supabase/migrations/`의 SQL을 SQL Editor에서 적용하고 서버용 Secret/Service Role 키를 설정해야 한다.
- 실제 Pleos Android 앱과 Vehicle, FusedLocation, SpeechToText SDK 연결은 MVP 이후 단계다. SDK의 API/권한을 추측한 구현은 포함하지 않는다.
- 시뮬레이터는 마이크를 사용하지 않는다. 대화 텍스트의 AI 처리에 대한 명시적 동의를 받은 뒤 세션으로 전달하며, 생성 완료 후 원문 대화 텍스트를 삭제한다.
- 프로토타입은 단일 개발자 로컬 실행을 위한 것이며 사용자 인증 및 다중 사용자 데이터 격리는 포함하지 않는다. 외부 공개 배포 전에 인증·인가, 비밀키 관리, 영구 저장소 및 삭제 정책을 적용해야 한다.

Supabase DB의 테스트 INSERT/SELECT와 음원 Storage 업로드/다운로드는 `npm run verify:supabase --workspace @welody/backend`로 검증한다. 상세 API 계약과 시뮬레이터 안내는 [docs/API_SPEC.md](./docs/API_SPEC.md), [docs/SIMULATOR_GUIDE.md](./docs/SIMULATOR_GUIDE.md)를 참고한다. 실서비스 API 설정은 [docs/PROVIDERS.md](./docs/PROVIDERS.md)를 참고한다.