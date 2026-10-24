# My Gym Trainer — 나만의 헬스케어 트레이너 앱

아파트 단지 헬스장, 다른 단지 헬스장, 학교 철봉처럼 **장소마다 기구가 다른 환경**에서도 루틴이 꼬이지 않게 도와주는 아이폰·아이패드·안드로이드 앱입니다. (Expo / React Native)

## 핵심 아이디어: 루틴은 "부위(움직임 패턴)"로, 운동은 "장소"에 맞게

- 루틴은 `수평 밀기(가슴)`, `수직 당기기(광배)`, `힌지(하체 뒤)` 같은 **움직임 패턴**으로 짭니다.
- 운동하러 간 장소의 기구로 각 패턴을 **그 곳에서 할 수 있는 운동으로 바꿔 끼웁니다.**
  - 단지 헬스장: 덤벨 벤치프레스, 랫풀다운, 레그프레스 …
  - 학교 철봉: 딥스, 네거티브 풀업, 인버티드 로우, 맨몸 스쿼트 …
- 분할 순서(전신 A → B → C, 푸시/풀/레그 등)는 **장소와 상관없이 마지막 운동 다음 데이로 이어집니다.**
- 같은 장소에서 전에 했던 운동을 우선 골라 기록이 이어지고, 장소별 기구 세팅(덤벨 최대 무게, 증가 단위)을 넘으면 무게 대신 반복 수·템포로 강도를 맞춰 줍니다.

## 기능

| 탭 | 내용 |
| --- | --- |
| **오늘** | 날짜와 한 줄 안내, 활동 칼로리·운동 시간·걸음 수(iOS)·물 게이지, 오늘의 루틴 목록, 남은 일정, 하단 고정 **운동 시작** 버튼 |
| **운동** | 분할 프로그램, 장소 선택 → 그 장소 기구로 만든 루틴, 운동 교체, 운동 기록(세트별 무게·반복, 휴식 타이머), 점진적 과부하 자동 제안 |
| **장소** | 장소 등록, **기구 사진 촬영 → AI(무료 Gemini)가 기구 인식**, 기구 직접 체크, 기구별 최대 무게·증가 단위, 루틴 소화율 |
| **식단** | 목표 칼로리·탄단지 계산, 한식 위주 하루 식단(아침·점심·저녁·간식), 못 먹는 음식 제외, 다시 짜기 |
| **내 몸** | BMI(대한비만학회 기준), 체지방률(둘레로 추정), 기초대사량·하루 소비 칼로리, FFMI, 허리/키 비율, 체중 추세 분석, 권장 취침 시각(90분 수면 주기) |
| 기타 | AI 코치(내 몸·루틴·기록을 아는 상태로 질문 답변), 물·식사·취침 매일 알림 |

### 디자인
- 매트 블랙(#121214) 바탕과 #1A1A1E 카드, 흰색 숫자와 라이트 그레이(#9EA4B0) 보조 글자만 쓰는 모노톤 다크 테마입니다.
- 진행 상태는 얇은 흰색 게이지 바로만 표시하고, 핵심 숫자는 크고 굵게 보여 줍니다. 유색은 삭제 버튼의 경고색 하나뿐입니다.

### 아이패드
- 폭이 넓으면 하단 탭 대신 **왼쪽 사이드바**로 바뀌고(가로 모드에선 라벨까지 표시), 카드가 **2~3열 그리드**로 배치됩니다.
- 가로/세로 회전 모두 지원 (`ios.supportsTablet: true`, `orientation: default`).

## 실행

```bash
npm install
npx expo start          # Expo 개발 서버 (QR로 휴대폰/아이패드에서 열기)
npm run ios             # iOS 시뮬레이터 (macOS)
npm run android
npm run web             # 브라우저에서 미리보기 (알림 제외)
```

카메라·알림·보안 저장소 같은 네이티브 기능은 개발 빌드에서 가장 확실하게 동작합니다.

```bash
npx eas-cli@latest build --profile development --platform ios   # 아이폰/아이패드용 개발 빌드
```

### 휴대폰에 설치하기

**가장 빠른 방법 — Expo Go로 바로 실행 (무료, 컴퓨터 필요)**
1. 휴대폰에 앱스토어/플레이스토어에서 **Expo Go** 설치
2. 컴퓨터에서 `git clone` → `git checkout claude/healthcare-trainer-app-e2l5g2` → `npm install` → `npx expo start`
3. 아이폰은 기본 카메라 앱, 안드로이드는 Expo Go 앱으로 화면의 QR 코드를 찍으면 실행됩니다.
   (컴퓨터와 휴대폰이 다른 Wi-Fi면 `npx expo start --tunnel`)
   스토어의 Expo Go가 이 프로젝트의 Expo SDK(58)를 지원하지 않으면 아래 설치 파일 방식을 쓰세요.

**계속 쓰는 앱으로 설치 — EAS Build (Expo 계정 무료)**
- 안드로이드: `npx eas-cli@latest build -p android --profile preview` → 빌드가 끝나면 나오는 링크/QR로 APK를 받아 설치
- 아이폰·아이패드: Apple 개발자 프로그램(연 $99)이 필요합니다. `npx eas-cli@latest device:create`로 기기를 등록한 뒤 `npx eas-cli@latest build -p ios --profile preview`
- 빌드 서버에는 `.env`가 올라가지 않으니, 키를 넣어 빌드하려면 `npx eas-cli@latest env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value <키> --environment preview`로 등록하세요(앱 설정 화면에 입력해도 됩니다).

### AI 기능 설정 (선택)
기구 사진 인식과 AI 코치는 **Google AI Studio의 Gemini API 무료 등급**을 사용합니다(유료 API 불필요).
1. 구글 계정으로 [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에서 'API 키 만들기' (카드 등록 없음)
2. 둘 중 하나로 키를 넣습니다.
   - 앱의 **오늘 → 톱니바퀴(설정)** 에 입력하거나,
   - `.env.example`을 `.env`로 복사해 `EXPO_PUBLIC_GEMINI_API_KEY=` 뒤에 키를 넣고 앱을 다시 실행하면 입력 없이 바로 동작합니다. 이 키는 앱 안에 그대로 들어가니 본인 기기용 빌드에만 쓰고, `.env`는 커밋되지 않도록 `.gitignore`에 넣어 두었습니다.

- 앱이 키로 쓸 수 있는 모델 목록을 조회해, 하루 무료 한도가 가장 큰 **Flash-Lite** 모델부터 쓰고 한도에 걸리면 Flash → Gemma 순으로 자동 전환합니다.
- 무료 한도는 모델별로 다르며(예: Flash-Lite 계열은 하루 수백 회 수준) 구글이 수시로 바꿉니다. 정확한 한도는 AI Studio에서 확인하세요.
- 무료 등급에서는 보낸 사진·질문이 구글의 모델 개선에 쓰일 수 있습니다(EU·영국·스위스 제외).
키는 기기의 보안 저장소(SecureStore)에만 저장됩니다. 키가 없어도 기구를 직접 체크하면 루틴·식단·분석 등 모든 기본 기능을 쓸 수 있습니다.

## 개발

```bash
npm test            # 계산 로직 단위 테스트 (Jest)
npm run typecheck   # TypeScript
npx eslint src      # 린트
```

### 구조

```
src/
  app/                 화면(Expo Router)
    (tabs)/            오늘·운동·장소·식단·내 몸 탭 (아이패드에서는 사이드바)
    place/             장소 추가 / 상세(사진 인식, 기구 세팅)
    session.tsx        운동 기록
    coach.tsx          AI 코치
    profile.tsx        내 정보
    settings.tsx       API 키, 알림, 데이터
  data/                기구 카탈로그, 운동 DB(패턴·필요 기구), 음식 영양 DB
  lib/
    body.ts            BMI·BMR·TDEE·탄단지·물·체지방·분석
    routine.ts         프로그램 생성, 장소별 운동 배정, 다음 데이 계산
    progress.ts        점진적 과부하(장소별 최대 무게 반영)
    schedule.ts        기상 기준 물·식사·운동·수면 일정
    diet.ts            식단 생성
    ai.ts              Gemini 무료 API 연동(기구 인식, 코치, 모델 자동 전환)
    ai-utils.ts        모델 순위, 응답 JSON 해석·검증
    notifications.ts   매일 반복 알림
  store/useStore.ts    기기 저장 상태(zustand + AsyncStorage)
```

모든 데이터는 기기에만 저장됩니다. 건강 수치는 일반적인 공식에 따른 추정치이며 의학적 진단을 대신하지 않습니다.
