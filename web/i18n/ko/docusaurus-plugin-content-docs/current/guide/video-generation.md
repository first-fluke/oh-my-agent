---
title: "가이드: 영상 생성"
sidebar_label: 영상 생성
description: oh-my-agent 영상 생성 완전 가이드입니다. 키가 선택 사항인 라우터가 스크립트, 내레이션, 비주얼, 자막, 관리되는 HyperFrames 컴포지터를 조합해 숏폼·설명·데모 모드의 실행 디렉토리를 만듭니다.
---

# 영상 생성

`oma-video`는 oh-my-agent의 영상 라우터입니다. 한 줄짜리 브리프에서 스크립트, 내레이션, 비주얼, 자막을 조합하고 실행 디렉토리에 계획을 기록합니다. 프로바이더 단계는 키가 없어도 로컬 또는 결정론적 폴백을 사용할 수 있지만, 실제 MP4를 만들려면 정상적인 컴포지터와 작성된 컴포지션이 필요합니다.

이 스킬은 *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast* 같은 키워드에서 자동 활성화되며, 다른 스킬에 부수적으로 영상이 필요할 때도 활성화됩니다.

---

## 사용 시기

- 브리프, README, 코드, 데이터를 짧은 클립으로 만들 때.
- 내레이션이 있는 설명 영상이나 데모·워크스루 녹화를 만들 때.
- "브리프 → `.mp4`" 파이프라인을 결정론적으로 다시 돌리고 싶을 때.

## 사용하지 말아야 할 때

- 정지 이미지 한 장이 필요할 때 → [`oma-image`](/docs/guide/image-generation)를 쓰세요.
- 실시간 화면 방송이나 스트리밍 → 범위 밖입니다(캡처는 감독하에 진행하며 스트리밍하지 않습니다).
- 내레이션 오디오만 필요할 때 → `oma-voice`를 쓰세요.

---

## 한눈에 보는 모드

| 모드 | 화면비 | 조합하는 것 |
|------|--------|------------------|
| `shorts` | 9:16 | 세로형 숏폼 클립 (스크립트 → 내레이션 → 비주얼 → 자막). |
| `explainer` | 16:9 | README, 코드, 데이터 브리프로 만드는 가로형 설명 영상. |
| `demo` | 파생됨 | `--capture`로 전달한 사람이 만든 녹화에서 제작하는 워크스루입니다. `--source web --url`은 감독하에 실행하는 헤디드 캡처의 컨텍스트를 제공하며 로그인 자동화는 하지 않습니다. |

모드가 합리적인 기본값을 정합니다. 값을 바꾸려면 필요한 플래그를 전달합니다.

---

## 빠른 시작

```bash
# 키가 없어도 계획할 수 있는 숏폼입니다. 실제 렌더링에는 컴포지터가 필요합니다.
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# 사람이 만든 녹화에서 데모를 만듭니다.
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

실행할 때마다 실행 디렉토리를 출력합니다. 고정된 `--seed`는 결정적인 계획 입력을 안정화하지만 라이브 프로바이더의 출력과 캡처 영상은 달라질 수 있습니다. 저장된 render-spec과 에셋을 다시 사용하려면 기존 실행 디렉토리를 다시 렌더링합니다.

`oma video generate --output json`을 셸로 호출하는 다른 도구는 stdout에서 JSON 봉투를 파싱합니다: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. `outputs` 키는 없습니다. 출력과 에셋 경로는 `manifestPath`의 매니페스트에서 읽으세요.

---

## CLI 레퍼런스

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # 툴체인 준비 상태 및 프로비저닝
oma video compose <runDir> --output json   # 실행 디렉토리의 컴포지션 스캐폴드 준비
oma video render <runDir> --output json    # render-spec.json에서 다시 렌더링
oma video provider list --output json      # 프로바이더 가용성과 키 상태
```

### 주요 플래그

| 플래그 | 용도 |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | 내레이션과 자막의 언어 태그. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (키가 필요 없는 정렬). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | 내레이션 음성, 또는 `none`(기본값입니다. 생략하면 자막 타이밍을 추정해 무음으로 렌더링합니다). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano`, 또는 `none`. |
| `--duration <sec>` | 목표 길이(초), 또는 `auto`. |
| `--compositor <c>` | `hyperframes`(기본값) \| `mpt`. |
| `--capture <path>` | 데모 모드의 입력 녹화 경로(`--source file`). |
| `--source <k>` | 데모 캡처 소스: `file` \| `web`. |
| `--url <url>` | `--source web`의 대상 URL(로컬, 스테이징, 프로덕션 모두 가능). |
| `--device <name>` | 웹 캡처의 디바이스 프레임입니다. 화면비 크기를 덮어씁니다. |
| `--ready-selector <css>` | 웹 캡처 전에 기다릴 CSS 선택자입니다. |
| `--show-cursor` | 웹 캡처에 커서를 표시합니다. |
| `--polish` | 캡처한 화면 위에 HyperFrames 컴포지션을 겹칩니다. |
| `--capture-timeout <sec>` | 라이브 웹 캡처의 최대 실행 시간입니다. |
| `--capture-stop <mode>` | CI에서 사용할 비대화형 종료 방식입니다: `duration:<sec>` 또는 `selector:<css>`. |
| `--output-dir <path>` | 실행 디렉토리의 기본 경로입니다. `$PWD` 외부 경로에는 `--allow-external-output`이 필요합니다. |
| `--allow-external-output` | `$PWD` 외부의 출력 경로를 허용합니다. |
| `--max-usd <n>` | 확인 전에 적용할 최대 예상 비용입니다. |
| `--seed <n>` | 결정론적 시드. |
| `--dry-run` | 스크립트, render-spec, 매니페스트만 내보내고 렌더링은 건너뜁니다. |
| `--script <path>` | 에이전트가 작성한 `script.json`을 주입합니다(스켈레톤을 대체하며 내레이션, 화면 텍스트, 장면별 비주얼 프롬프트를 제어합니다). |
| `-y, --yes` | 비용 확인 프롬프트를 생략합니다. |
| `--timeout <duration>` | 실행 제한 시간입니다. |
| `--output <f>` | CLI 출력: `text`(기본값) \| `json`. |
| `--no-brief-in-manifest` | 브리프 원문 대신 SHA-256을 매니페스트에 저장합니다. |

---

## 키가 선택 사항인 프로바이더

프로바이더 단계는 **실제 경로**를 우선 사용하고, 해당 단계가 지원하면 **결정론적 폴백**을 사용합니다. 키가 없으면 추정 타이밍이나 로컬 에셋을 포함한 계획을 만들 수 있습니다. 컴포지터는 마지막에 필요한 단계이며 일반적인 플레이스홀더 폴백이 없습니다.

| 기능 | 실제 경로 | 폴백 |
|------------|-------------|----------|
| 스크립트 | 키가 있으면 LLM | 브리프에서 만드는 결정론적 개요 |
| 음성 | `oma-voice` (Voicebox, 로컬) | 타이밍 추정, 오디오 없음 |
| 비주얼 | `oma-image` / `oma-slide` / 스톡 | 플레이스홀더 에셋 |
| 자막 | 키가 필요 없는 강제 정렬 | 단어 타이밍 추정 |
| 캡처 | 감독하의 브라우저 웹 캡처(`--source web`) 또는 녹화 파일(`--source file --capture`) | "직접 녹화하세요" 안내 프로토콜 |
| 컴포지터 | HyperFrames(벤더링) 또는 MoneyPrinterTurbo | 컴포지터 폴백 없음. 진단과 함께 실행이 실패합니다 |

자격 증명을 자동화하지 않습니다. 캡처 중 화면 로그인은 사람이 직접 하며, URL과 쿼리 토큰은 로그와 매니페스트에서 마스킹합니다.

자막은 **정적 윈도 큐**로 렌더링합니다. 현재 프레임에서 활성인 자막 한 줄을 CSS로 줄바꿈해 보여주며, 단어 단위 애니메이션은 없습니다.

---

## 툴체인과 `doctor`

무거운 툴체인(관리되는 HyperFrames 프로젝트의 `node_modules`, 임베드된 Pretendard 폰트, MoneyPrinterTurbo 체크아웃, 캡처용 브라우저, Chrome Headless Shell)은 **필요할 때 프로비저닝**하며 패키지에 담아 배포하지 않습니다. 옵션 없는 `doctor`는 보고만 하고 아무것도 설치하지 않습니다.

```bash
oma video doctor
```

`node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle`, `cap` 상태를 보고하고, 빠진 항목의 설치 힌트를 출력합니다. 키가 필요 없는 기본 구성(Node + Chromium + FFmpeg + `oma-image`)도 프로바이더 단계에 사용할 수 있지만 실제 `.mp4`에는 컴포지터와 작성된 컴포지션이 필요합니다.

툴체인을 준비하려면 설치 플래그를 쓰세요.

```bash
oma video doctor --install             # HyperFrames CLI + GSAP + Chrome Headless Shell + Pretendard font fetch
oma video doctor --upgrade             # 최신 버전 확인을 즉시 강제합니다.
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
oma video doctor --install-strudel    # Strudel 준비
```

`--install`은 임베드된 Pretendard 폰트(고정 릴리스)도 벤더링된 프로젝트로 내려받습니다. 이 폰트는 결정성 경계의 일부입니다. 네트워크가 실패하면 경고하고 렌더링은 시스템 폰트로 폴백하는데, 브라우저와 운영체제 차이도 출력에 영향을 줄 수 있습니다.

---

## 출력 레이아웃

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # 장면과 내레이션
├── render-spec.json     # 결정적인 렌더링 계약
├── timing.json          # 세그먼트별 타이밍(voicebox-stt 또는 추정값)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, 로컬 에셋과 툴체인 링크
├── {mode}-{slug}.mp4    # 렌더링된 결과(슬러그는 스크립트 제목에서 생성)
└── manifest.json        # 프로바이더, 에셋, 비용, 경고
```

`render-spec.json`과 에셋이 결정성의 경계입니다. 라이브 캡처는 매니페스트에 `nondeterministic`으로 기록됩니다.

---

## 트러블슈팅

| 증상 | 원인과 해결 |
|---------|-------------|
| MP4가 생성되지 않음 | 컴포지터, 컴포지션, 또는 툴체인 확인이 실패했습니다. `oma video doctor`를 실행한 뒤 `oma video compose <runDir>`로 진단을 확인하고 컴포지션을 수정한 다음 `oma video render <runDir>`를 다시 실행합니다. |
| 내레이션이 무음(`source: estimated`) | Voicebox에 접근할 수 없습니다. `oma-voice` 서버를 켜거나 추정 타이밍을 그대로 받아들이세요. |
| `--source web`이 녹화 대신 안내 프로토콜을 출력 | TTY가 없거나 브라우저 캡처 런타임을 사용할 수 없습니다. 캡처 런타임이 준비된 대화형 터미널에서 실행하거나 녹화 파일을 `--capture`로 전달합니다. |
| 첫 실행이 느림 | HyperFrames 브라우저나 MPT 체크아웃을 한 번 준비하는 중입니다. 이후 실행은 캐시를 재사용합니다. |

---

## 최신 HyperFrames 사용과 컴포지션 작성

oh-my-agent는 HyperFrames 컴포지션 코드를 함께 제공하지 않습니다. 각 실행은 최신 npm HyperFrames과 `heygen-com/hyperframes`를 바탕으로 `<runDir>/hyperframes/` 프로젝트를 만들며, 생성된 스캐폴드의 `AUTHORING.md`와 `.agents/skills/oma-video/resources/hyperframes-authoring/`의 모드 사양을 읽고 에이전트가 컴포지션을 작성합니다.

```bash
oma video generate "…"                     # render-spec.json과 <runDir>/hyperframes/ 생성(컴포지션 작성 대기)
oma video compose <runDir> --output json   # 스캐폴드를 갱신하고 계약 출력(멱등적)
# AUTHORING.md에 따라 hyperframes/index.html을 작성합니다.
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; 실패 시 종료 코드 1
```

- 최신 버전 확인은 `video.hyperframes.check_interval_min`(기본 60분, `0`이면 모든 compose 호출)의 적용을 받습니다. `oma update`도 이 주기를 따르고 `oma video doctor --upgrade`는 확인을 강제로 실행하며, 오프라인 실행은 캐시된 툴체인을 사용하고 `stale` 상태를 보고합니다.
- 재현성의 기준은 실행 디렉토리의 `render-spec.json`, 작성된 컴포지션 소스, 생성된 HyperFrames 패키지 메타데이터에 기록된 툴체인 버전입니다. 같은 실행을 다시 렌더링하면 해당 계약을 재사용하고, 새 실행은 최신 HyperFrames을 확인합니다.
- HTML lint나 렌더링 실패를 플레이스홀더로 숨기지 않습니다. 테스트 전용 `OMA_VIDEO_MOCK=1`에서만 플레이스홀더가 허용됩니다. `oma video render`는 진단과 함께 종료 코드 1을 반환하므로 컴포지션을 수정한 뒤 다시 실행합니다.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = 모든 compose 호출에서 확인
```

---

## 관련 문서

- [`/video` 워크플로우](/docs/core-concepts/workflows): 브리프 → 스크립트 → 에셋 → render-spec → HyperFrames 파이프라인.
- [이미지 생성](/docs/guide/image-generation): 영상 비주얼 프로바이더로도 재사용하는 정지 이미지 라우터.
