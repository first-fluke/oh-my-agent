---
title: "가이드: 영상 생성"
description: oh-my-agent 영상 생성 완전 가이드입니다. 키가 선택 사항인 3계층 라우터가 스크립트, 내레이션, 비주얼, 자막, 벤더링된 Remotion 컴포지터를 조합해 숏폼·설명·데모 모드에서 재현 가능한 실행 디렉토리를 만듭니다.
---

# 영상 생성

`oma-video`는 oh-my-agent의 영상 라우터입니다. 한 줄짜리 브리프에서 스크립트, 내레이션, 비주얼, 자막을 조합하고, 벤더링된 컴포지터로 렌더링해 재현 가능한 실행 디렉토리를 만듭니다. 모든 단계가 결정론적 폴백으로 저하되므로 **API 키가 하나도 없어도** 실행이 완료됩니다.

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
| `demo` | 유도됨 | 화면 녹화로 만드는 워크스루입니다. 미리 녹화한 파일(`--source file`)이나 감독하에 진행하는 헤디드 웹 캡처(`--source web`)를 씁니다. |

모드가 합리적인 기본값을 정하며, 모든 기본값은 플래그로 덮어쓸 수 있습니다.

---

## 빠른 시작

```bash
# Key-free short — script, captions, and a placeholder-free local render
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a supervised web capture of a running app (you drive the flow; ENTER stops)
oma video generate "product walkthrough" --mode demo --source web --url http://localhost:3000 --polish
```

실행할 때마다 실행 디렉토리를 출력합니다. 같은 `--seed`로 다시 돌리면 같은 스크립트와 render-spec이 재현됩니다.

`oma video generate --output json`을 셸로 호출하는 다른 도구는 stdout에서 JSON 봉투를 파싱합니다: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. `outputs` 키는 없습니다. 출력과 에셋 경로는 `manifestPath`의 매니페스트에서 읽으세요.

---

## CLI 레퍼런스

```
oma video generate <brief...> [options]
oma video doctor [--install|--install-mpt]  # toolchain readiness / provisioning
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
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
| `--compositor <c>` | `remotion`(기본값) \| `mpt`. |
| `--source <k>` | 데모 캡처 소스: `file` \| `web`. |
| `--url <url>` | `--source web`의 대상 URL(로컬, 스테이징, 프로덕션 모두 가능). |
| `--polish` | 캡처한 화면 위에 Remotion 컴포지션을 겹칩니다. |
| `--duration <sec>` | 목표 길이, 또는 `auto`. |
| `--seed <n>` | 결정론적 시드. |
| `--dry-run` | 스크립트, render-spec, 매니페스트만 내보내고 렌더링은 건너뜁니다. |
| `--script <path>` | 에이전트가 작성한 `script.json`을 주입합니다(스켈레톤을 대체하며 내레이션, 화면 텍스트, 장면별 비주얼 프롬프트를 제어합니다). |
| `-y, --yes` | 비용 확인 프롬프트를 생략합니다. |
| `--format <f>` | CLI 출력: `text`(기본값) \| `json`. |

---

## 키가 선택 사항인 프로바이더

모든 기능은 **실제 경로**와 **결정론적 폴백**을 함께 갖춘 프로바이더로 해석됩니다(백엔드 규칙 11). 그래서 키나 도구가 없다고 실행이 통째로 실패하는 일이 없습니다.

| 기능 | 실제 경로 | 폴백 |
|------------|-------------|----------|
| 스크립트 | 키가 있으면 LLM | 브리프에서 만드는 결정론적 개요 |
| 음성 | `oma-voice` (Voicebox, 로컬) | 타이밍 추정, 오디오 없음 |
| 비주얼 | `oma-image` / `oma-slide` / 스톡 | 플레이스홀더 에셋 |
| 자막 | 키가 필요 없는 강제 정렬 | 단어 타이밍 추정 |
| 캡처 | 감독하의 브라우저 웹 캡처(`--source web`) 또는 Cap(`--source file`) | "직접 녹화하세요" 안내 프로토콜 |
| 컴포지터 | Remotion(벤더링) 또는 MoneyPrinterTurbo | 결정론적 플레이스홀더 mp4 |

자격 증명을 자동화하지 않습니다. 캡처 중 화면 로그인은 사람이 직접 하며, URL과 쿼리 토큰은 로그와 매니페스트에서 마스킹합니다.

자막은 **정적 윈도 큐**로 렌더링합니다. 현재 프레임에서 활성인 자막 한 줄을 CSS로 줄바꿈해 보여주며, 단어 단위 애니메이션은 없습니다.

---

## 툴체인과 `doctor`

무거운 툴체인(벤더링된 Remotion 프로젝트의 `node_modules`, 임베드된 Pretendard 폰트, MoneyPrinterTurbo 체크아웃, 캡처용 브라우저, Chrome Headless Shell)은 **필요할 때 프로비저닝**하며 패키지에 담아 배포하지 않습니다. 옵션 없는 `doctor`는 보고만 하고 아무것도 설치하지 않습니다.

```bash
oma video doctor
```

`node`, `chromium`, `ffmpeg`, `remotion-project`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle`, `cap` 상태를 보고하고, 빠진 항목의 설치 힌트를 출력합니다. 키가 필요 없는 기본 구성(Node + Chromium + FFmpeg + `oma-image`)만으로도 실제 `.mp4`를 만들 수 있습니다.

툴체인을 준비하려면 설치 플래그를 쓰세요.

```bash
oma video doctor --install             # vendored Remotion deps + Chrome Headless Shell + Pretendard font fetch
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install`은 임베드된 Pretendard 폰트(고정 릴리스)도 벤더링된 프로젝트로 내려받습니다. 이 폰트는 결정성 경계의 일부입니다. 네트워크가 실패하면 경고하고 렌더링은 시스템 폰트로 폴백하는데, 머신 간 바이트 단위로 동일한 출력은 폰트가 있을 때만 보장됩니다.

---

## 출력 레이아웃

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json`과 에셋이 결정성의 경계입니다. 라이브 캡처는 매니페스트에 `nondeterministic`으로 기록됩니다.

---

## 트러블슈팅

| 증상 | 원인과 해결 |
|---------|-------------|
| 출력이 mp4가 아니라 아주 작은 텍스트 파일 | 컴포지터가 플레이스홀더로 폴백했습니다. `oma video doctor`를 실행해 표시된 도구를 준비하세요. |
| 내레이션이 무음(`source: estimated`) | Voicebox에 접근할 수 없습니다. `oma-voice` 서버를 켜거나 추정 타이밍을 그대로 받아들이세요. |
| `--source web`이 녹화 대신 안내 프로토콜을 출력 | TTY가 없거나(CI) 브라우저 캡처 런타임이 없어 안내 폴백으로 넘어갔습니다. 캡처 런타임이 준비된 대화형 터미널을 사용하거나 `--capture`로 녹화 파일을 전달하세요. |
| 첫 실행이 느림 | Remotion 브라우저나 MPT 체크아웃을 한 번 준비하는 중입니다. 이후 실행은 캐시를 재사용합니다. |

---

## 관련 문서

- [`/video` 워크플로우](/docs/core-concepts/workflows): 브리프 → 스크립트 → 에셋 → render-spec → Remotion 파이프라인.
- [이미지 생성](/docs/guide/image-generation): 영상 비주얼 프로바이더로도 재사용하는 정지 이미지 라우터.
