---
title: "가이드: 이미지 생성"
sidebar_label: 이미지 생성
description: oh-my-agent 이미지 생성 종합 가이드입니다. Codex(gpt-image-2), Pollinations(flux/zimage, 무료), Gemini Code Assist를 통한 Antigravity로의 멀티 벤더 디스패치, 참조 이미지, 비용 가드레일, 출력 레이아웃, 문제 해결, 공유 호출 패턴을 다룹니다.
---

# 이미지 생성

`oma-image`는 oh-my-agent의 멀티 벤더 이미지 라우터입니다. 자연어 프롬프트로 이미지를 생성하고, 인증된 벤더 CLI로 디스패치하며, 실행을 감사하거나 반복하는 데 필요한 입력과 프로바이더 결정을 기록한 매니페스트를 출력물 옆에 작성합니다. 라이브 프로바이더의 출력은 그래도 실행할 때마다 달라질 수 있습니다.

이 스킬은 "이미지 생성해줘", "이미지 만들어줘", "그림 만들어줘", "… 그려줘", "… 이미지" 같은 표현이나 벤더 이름(`gpt-image`, `nano-banana`, `pollinations`)에 반응해 활성화되며, 다른 스킬에 부수적으로 이미지가 필요할 때(히어로 샷, 썸네일, 제품 사진)도 활성화됩니다.

> **요약** 다음 중 하나가 필요합니다. `POLLINATIONS_API_KEY`(무료 `flux` / `zimage`), `codex login`(ChatGPT 플랜의 gpt-image-2), 또는 로그인된 `agy`입니다. `oma image doctor`를 실행한 뒤 `oma image generate "<prompt>" --vendor pollinations`를 실행하세요. 이미지와 `manifest.json`은 `.agents/results/images/{timestamp}-{shortid}/`에 저장됩니다.

---

## 사용할 때

- 이미지, 일러스트, 제품 사진, 콘셉트 아트, 히어로/랜딩 비주얼 생성
- 동일한 프롬프트를 여러 모델에서 나란히 비교 (`--vendor all`)
- oma 스킬을 로드하는 모든 런타임(Claude Code, Codex CLI, Antigravity, Cursor 등) 안에서 에셋 생성
- 다른 스킬(디자인, 마케팅, 문서)이 공유 인프라로서 이미지 파이프라인을 호출하도록 허용

## 사용하지 말아야 할 때

- 기존 이미지 편집 또는 보정 (범위 밖. 전용 도구 사용)
- 비디오 또는 오디오 생성 (범위 밖)
- 구조화된 데이터로 인라인 SVG / 벡터 합성 (템플릿 스킬 사용)
- 단순 리사이즈 / 포맷 변환 (생성 파이프라인이 아닌 이미지 라이브러리 사용)

---

## 한눈에 보는 벤더

이 스킬은 CLI 우선입니다. 벤더의 네이티브 CLI가 원시 이미지 바이트를 반환할 수 있으면 직접 API 키보다 서브프로세스 경로가 우선됩니다.

| 벤더 | 전략 | 모델 | 트리거 | 비용 |
|---|---|---|---|---|
| `pollinations` | 직접 HTTP | 무료: `flux`, `zimage`. 크레딧 필요: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` 설정 (무료 가입: [enter.pollinations.ai](https://enter.pollinations.ai)) | `flux` / `zimage`는 무료 |
| `codex` | CLI 우선 (ChatGPT OAuth로 `codex exec`) | `gpt-image-2` | `codex login` (API 키 불필요) | ChatGPT 플랜에 청구 |
| `antigravity` | Gemini Code Assist 구독을 사용하는 `agy` CLI | 모델은 `agy`가 내부에서 선택 | `agy` 설치 및 로그인 | Code Assist를 통한 이미지별 추가 요금 없음 |

`--vendor`가 실행할 벤더를 고르는 방식은 다음과 같습니다.

| `--vendor` | 실행되는 벤더 | 출력 폴더 | Exit 5가 되는 경우 |
|---|---|---|---|
| `auto` (기본값) | 상태 확인을 통과한 모든 벤더 | 둘 이상 실행되면 `{timestamp}-{shortid}-compare/` | 정상인 벤더가 하나도 없을 때 |
| `all` | 활성화된 모든 벤더 | 둘 이상 실행되면 `{timestamp}-{shortid}-compare/` | 요청한 벤더 중 하나라도 비정상일 때 |
| `codex`, `pollinations`, `antigravity` | 해당 벤더 | `{timestamp}-{shortid}/` | 해당 벤더가 비정상일 때 |

내장 벤더 모드는 `auto`이며, 상태 확인을 통과한 프로바이더를 **모두** 병렬로 실행합니다. 무료 경로만 쓰려면 `--vendor pollinations`를 전달하세요. Pollinations의 `flux`와 `zimage` 모델은 이미지별로 무료지만 `POLLINATIONS_API_KEY`가 필요하고, Codex와 Antigravity는 각각 로그인이 필요합니다. 유료로 추정되는 실행에는 여전히 비용 확인 가드레일이 적용됩니다.

---

## 빠른 시작

처음 생성하기 전에 어떤 프로바이더가 준비되었는지 확인하고, 지원되는 방법 중 하나로 인증합니다.

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

텍스트 모드 실행이 성공하면 다음과 같은 진행 상황이 출력됩니다(경로는 예시입니다).

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## 스킬로 사용하기

`oma-image`는 스킬입니다. 자연어로 자동 활성화되며, 명시적으로 호출할 수도 있습니다. 진입 경로는 세 가지입니다.

### 1. 자연어 (자동 활성화)

oma 스킬을 로드하는 런타임(Claude Code, Codex CLI, Antigravity, Cursor 등)에서는 이미지를 설명하기만 하면 됩니다. "이미지 생성해줘", "그림 만들어줘", "… 그려줘", "… 이미지" 같은 표현이 스킬을 활성화하며, 설명으로 스킬을 매칭하는 런타임은 "콘셉트 아트"나 "히어로 샷" 같은 요청에도 이 스킬을 선택할 수 있습니다.

CLI 플래그를 외울 필요가 없습니다. 자연어로 말하면 스킬이 알맞은 옵션으로 매핑합니다:

| 자연어 | 스킬이 추론 |
|---|---|
| "codex로" / "gpt-image-2로" / "무료 flux로" | `--vendor codex` / `--vendor pollinations` |
| "벤더 비교" / "나란히" | `--vendor all` |
| "세로" / "가로" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "고품질" / "초안" | `--quality high` / `--quality low` |
| "세 가지 변형" / "3개 뽑아줘" | `-n 3` |
| "./hero에 저장" / "docs/assets로" | `--output-dir <dir>` |
| 첨부 이미지 + "야간으로 바꿔줘" | `-r <첨부 경로>` |
| "비용만 추정" / "드라이런" | `--dry-run` |

예시:

> "랜딩 히어로용으로 산 너머 일출, 가로, 고품질로 만들어줘."
> "세라믹 머그 제품 사진을 모든 벤더로 비교, 각각 세 장씩."
> "이 수달 사진을 codex로 드라마틱한 야간 분위기로." (참조 이미지 첨부 시)

에이전트는 [브리프를 해석](#clarification-protocol)하고, 빠진 부분은 기본값으로 채운 뒤 추론된 플래그로 `oma image generate`를 호출합니다. 정확한 플래그 값을 직접 통제하고 싶을 때는 슬래시 커맨드를 쓰세요.

### 2. 명시적 슬래시 커맨드

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

모든 CLI 플래그(`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …)가 슬래시 커맨드에서도 그대로 동작하며, 동일한 `oma image generate` 파이프라인으로 전달됩니다.

### 3. 다른 스킬에서 (공유 인프라)

다른 스킬(디자인, 마케팅, 문서)은 공유 인프라로 이 파이프라인을 JSON 출력과 함께 호출합니다:

```bash
oma image generate "<prompt>" --output json
```

`--output json`을 쓰면 stdout은 JSON 객체 하나 `{exitCode, manifestPath, runs}`입니다. `runs`의 각 항목은 벤더, 상태, 출력 파일을 보고합니다. 전체 기록은 `manifestPath`를 읽으세요. `--dry-run`은 계획 앞에 텍스트 헤더 `[oma image] dry-run plan:`을 출력하므로, 파싱할 때는 그 줄을 건너뛰세요.

---

## CLI 레퍼런스

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### 주요 플래그

| 플래그 | 용도 |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity`, 또는 `all`. `all`을 사용하면 요청한 모든 벤더가 정상이어야 합니다(엄격 모드). |
| `-n, --count <n>` | 벤더당 이미지 개수, 1–5 (wall-clock 시간 제한). 기본값 1. |
| `--size <size>` | 각 변이 16에서 3840 사이의 16의 배수이고 종횡비가 1:3에서 3:1 사이인 `WxH`(예: `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), 또는 `auto`. 기본값 `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high`, 또는 `auto` (기본값). |
| `--output-dir <dir>` | 출력 디렉토리이며, 파일이 이 디렉토리에 바로 저장됩니다. 기본값은 `.agents/results/images/{timestamp}-{shortid}/`입니다. `$PWD` 외부 경로에는 `--allow-external-output`이 필요합니다. |
| `--allow-external-output` | `$PWD` 외부의 출력 디렉토리를 허용합니다. |
| `--model <name>` | 이 실행의 **모든** 벤더에 적용되는 모델 오버라이드이므로 `--vendor` 하나와 함께 쓰세요(예: `--vendor pollinations --model zimage`). `antigravity`는 `agy`가 모델을 선택하므로 무시합니다. |
| `-r, --reference <path>` | 최대 10개의 참조 이미지(PNG/JPEG/GIF/WebP, 각 ≤ 5 MB). 반복하거나 쉼표로 구분합니다. `codex`와 `antigravity`에서 지원하며 `pollinations`에서는 거부됩니다. |
| `-y, --yes` | `$0.20` 이상으로 추정되는 실행에서 비용 확인 프롬프트를 생략. `OMA_IMAGE_YES=1`로도 가능. |
| `--no-prompt-in-manifest` | `manifest.json`에 원문 대신 프롬프트의 SHA-256 저장. |
| `--dry-run` | 비용 없이 계획과 비용 추정값만 출력. |
| `--output text\|json` | CLI 출력 형식입니다. JSON은 다른 스킬이 사용하는 통합 인터페이스입니다. |
| `--timeout <duration>` | 이미지별 제한 시간입니다. 기본값 180초. |

---

## 참조 이미지

스타일, 피사체 정체성, 또는 구도를 안내하기 위해 최대 10개의 참조 이미지를 첨부합니다.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| 벤더 | 참조 지원 | 방식 |
|---|---|---|
| `codex` (gpt-image-2) | 예 | `codex exec`에 `-i <path>` 전달 |
| `antigravity` | 예 | 참조 이미지를 실행별 디렉토리에 복사하고 `agy`가 접근하도록 합니다 |
| `pollinations` | 아니오 | exit code 4로 거부 (URL 호스팅 필요) |

### 첨부 이미지 위치

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, 시스템 메시지에 `[Image: source: <path>]`로 노출. 세션 스코프이며, 나중에 재사용하려면 영구 위치로 복사 필요.
- **Antigravity**: 워크스페이스 업로드 디렉토리 (IDE가 정확한 경로 표시)
- **호스트로서의 Codex CLI**: 명시적으로 전달해야 함. 대화 내 첨부는 전달되지 않음

사용자가 이미지를 첨부하고 그것을 기반으로 생성 또는 편집을 요청하면, 호출하는 에이전트는 **반드시** 말로 풀어 설명하지 말고 `--reference <path>`로 전달해야 합니다. 로컬 CLI가 너무 오래되어 `--reference`를 지원하지 않으면 `oma update`를 실행한 뒤 재시도합니다.

---

## 출력 레이아웃

기본적으로 각 실행은 `.agents/results/images/` 아래에 타임스탬프와 해시 접미사가 붙은 폴더에 기록됩니다. `--output-dir`을 지정하면 파일이 그 디렉토리에 바로 저장됩니다.

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json`은 벤더, 모델, 프롬프트(또는 그 SHA-256), 크기, 품질, 비용을 기록하므로 요청을 감사하고 반복할 수 있습니다. 라이브 프로바이더가 동일한 픽셀을 생성하도록 강제하지는 않습니다.

---

## 비용, 안전성, 취소

1. **비용 가드레일**: `$0.20` 이상으로 추정되는 실행은 확인을 요청합니다. 대화형 터미널이 없으면 `--yes`를 안내하는 메시지와 함께 exit 1로 종료합니다. `-y` 또는 `OMA_IMAGE_YES=1`로 우회할 수 있습니다. 무료가 보장되는 것은 `flux` / `zimage`를 쓰는 `--vendor pollinations`뿐이며, `auto`에는 로그인된 Codex도 포함될 수 있습니다.
2. **경로 안전성**: 예상치 못한 쓰기를 막기 위해 `$PWD` 외부의 출력 경로에는 `--allow-external-output`이 필요합니다.
3. **취소 가능**: `Ctrl+C` (SIGINT/SIGTERM)는 진행 중인 모든 프로바이더 호출과 오케스트레이터를 함께 중단시킵니다.
4. **안정적인 실행 기록**: `manifest.json`은 항상 이미지 옆에 작성됩니다.
5. **최대 `n` = 5**: 쿼터가 아니라 wall-clock 시간 제한입니다.
6. **Exit code**: `oma search fetch`와 정렬됨. `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## 에이전트가 브리프를 해석하는 방식 {#clarification-protocol}

에이전트는 사용자가 말한 내용을 사용하고, 빠진 부분은 배경, 스타일, 조명, 종횡비에 대한 합리적인 크리에이티브 기본값으로 채웁니다. 빠진 선택이 결과를 크게 바꿀 때만 질문하며, 사용자가 생성을 요청한 뒤에는 보강된 프롬프트에 대한 승인을 받으려고 멈추지 않습니다. 명시적인 문구, 이미지 안에 들어갈 텍스트, 참조 의도는 그대로 유지됩니다.

| 사용자 입력 | 진행 방식 |
|---|---|
| "a red apple" | 바로 생성합니다. 배경, 스타일, 조명, 크기는 에이전트가 채웁니다 |
| "a red apple as a flat vector icon, 512x512" | 지정한 스타일과 크기를 그대로 사용합니다 |
| "something for the homepage" | 결과를 바꾸는 요소이므로 피사체에 대해 한 가지를 질문합니다 |

프로바이더에 실제로 전송된 내용은 `manifest.json`의 `prompt` 필드에서 확인하세요(`--no-prompt-in-manifest`를 쓰면 SHA-256으로 저장됩니다).

---

## 설정

- **프로젝트 설정:** `.agents/oma-config.yaml`의 `image:` 섹션입니다. 레거시 `config/image-config.yaml`은 더 이상 읽지 않습니다.
- **환경 변수:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: 설정된 기본 벤더(`auto`)를 덮어씁니다. `--vendor` 플래그 자체의 기본값은 `auto`이므로, 특정 벤더가 필요하면 명령마다 `--vendor`를 전달하세요.
  - `OMA_IMAGE_DEFAULT_OUT`: 기본 출력 디렉토리 오버라이드
  - `OMA_IMAGE_YES`: 비용 확인을 우회하려면 `1`
  - `POLLINATIONS_API_KEY`: pollinations 벤더에 필요 (무료 가입)

---

## 문제 해결 {#troubleshooting}

| 증상 | 가능한 원인 | 해결 |
|---|---|---|
| Exit code `5` (auth-required) | 선택한 벤더가 인증되지 않음 | `oma image doctor`로 로그인이 필요한 벤더를 확인합니다. 그런 다음 `codex login`, `agy` 로그인, 또는 `POLLINATIONS_API_KEY` 설정을 진행합니다. |
| `--reference`에서 Exit code `4` | `pollinations`가 참조를 거부했거나 파일이 너무 크거나 형식이 잘못됨 | `--vendor codex` 또는 `--vendor antigravity`로 전환합니다. 각 참조는 5 MB 이하이고 PNG/JPEG/GIF/WebP여야 합니다. |
| `--reference`가 인식되지 않음 | 로컬 CLI가 오래됨 | `oma update`를 실행하고 재시도. 말로 풀어 설명하는 방식으로 되돌아가지 말 것. |
| 비용 확인이 자동화를 차단 | 실행이 `$0.20` 이상으로 추정됨 | `-y`를 전달하거나 `OMA_IMAGE_YES=1`을 설정합니다. 더 나은 방법은 무료 `pollinations`로 전환하는 것입니다. |
| `--vendor all`이 즉시 중단됨 | 요청한 벤더 중 하나가 정상이 아님 (엄격 모드) | 누락된 벤더를 설치하거나 로그인하고, 또는 특정 `--vendor`를 선택. |
| 출력이 예상치 못한 디렉토리에 작성됨 | 기본값은 `.agents/results/images/{timestamp}-{shortid}/` | `--output-dir <dir>`를 전달합니다. `$PWD` 외부 경로에는 `--allow-external-output`이 필요합니다. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (exit 1) | `--output-dir`가 프로젝트 외부를 가리킴 | `--allow-external-output`으로 다시 실행하거나(메시지에는 여전히 예전 플래그 이름이 표시됩니다) 프로젝트 내부 디렉토리를 선택합니다. |
| 여러 벤더가 실행되고 폴더 이름이 `-compare`로 끝남 | `--vendor auto`는 정상인 벤더를 모두 실행함 | 벤더 하나만 실행하려면 `--vendor`를 하나 지정합니다. |
| Antigravity가 상태 확인 후 실패함 | `agy --version`은 설치 여부만 확인하고 로그인을 확인하지 않음 | Gemini Code Assist에 로그인한 뒤 `oma image doctor`와 `--vendor antigravity`로 다시 실행합니다. |

---

## 다음 단계

- [영상 생성](./video-generation.md): `oma-video`는 `oma-image`를 시각 자료 프로바이더로 재사용합니다
- [콘텐츠와 리서치 워크플로우](./content-and-research.md): 다른 콘텐츠 기능과 그 전제 조건
- [스킬](../core-concepts/skills.md): `oma-image`를 구동하는 2계층 스킬 아키텍처
- [CLI 명령: image](../cli-interfaces/commands.md#image): `oma image` 전체 명령 레퍼런스
- [CLI 옵션](../cli-interfaces/options.md): 글로벌 옵션 매트릭스
