---
title: "가이드: 이미지 생성"
description: oh-my-agent 이미지 생성 종합 가이드 — Codex(gpt-image-2), Pollinations(flux/zimage, 무료), Gemini를 통한 멀티 벤더 디스패치, 참조 이미지, 비용 가드레일, 출력 레이아웃, 트러블슈팅, 공유 호출 패턴.
---

# 이미지 생성

`oma-image`는 oh-my-agent의 멀티 벤더 이미지 라우터입니다. 자연어 프롬프트로부터 이미지를 생성하고, 인증된 벤더 CLI 중 어느 것으로든 디스패치하며, 출력물 옆에 결정적인 매니페스트를 작성하여 모든 실행을 재현 가능하게 만듭니다.

이 스킬은 *image*, *illustration*, *visual asset*, *concept art* 같은 키워드 또는 다른 스킬이 부수 효과로 이미지를 필요로 할 때(히어로 샷, 썸네일, 제품 사진) 자동 활성화됩니다.

---

## 사용할 때

- 이미지, 일러스트, 제품 사진, 콘셉트 아트, 히어로/랜딩 비주얼 생성
- 동일한 프롬프트를 여러 모델에서 나란히 비교 (`--vendor all`)
- 에디터 워크플로우(Claude Code, Codex, Gemini CLI) 내부에서 에셋 생성
- 다른 스킬(디자인, 마케팅, 문서)이 공유 인프라로서 이미지 파이프라인을 호출하도록 허용

## 사용하지 말아야 할 때

- 기존 이미지 편집 또는 보정 — 범위 밖 (전용 도구 사용)
- 비디오 또는 오디오 생성 — 범위 밖
- 구조화된 데이터로부터 인라인 SVG / 벡터 합성 — 템플릿 스킬 사용
- 단순 리사이즈 / 포맷 변환 — 생성 파이프라인이 아닌 이미지 라이브러리 사용

---

## 한눈에 보는 벤더

이 스킬은 CLI 우선입니다. 벤더의 네이티브 CLI가 원시 이미지 바이트를 반환할 수 있으면 직접 API 키보다 서브프로세스 경로가 우선됩니다.

| 벤더 | 전략 | 모델 | 트리거 | 비용 |
|---|---|---|---|---|
| `pollinations` | 직접 HTTP | 무료: `flux`, `zimage`. 크레딧 필요: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` 설정 (https://enter.pollinations.ai 에서 무료 가입) | `flux` / `zimage`는 무료 |
| `codex` | CLI 우선 — ChatGPT OAuth로 `codex exec` | `gpt-image-2` | `codex login` (API 키 불필요) | ChatGPT 플랜에 청구 |
| `gemini` | CLI 우선 → 직접 API 폴백 | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` 또는 `GEMINI_API_KEY` + 결제 | 기본 비활성화; 결제 필요 |

`flux` / `zimage`가 무료이므로 키워드 자동 트리거가 안전한 `pollinations`가 기본 벤더입니다.

---

## 빠른 시작

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img`는 `oma image`의 별칭입니다.

---

## 슬래시 커맨드 (에디터 내부)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

슬래시 커맨드는 동일한 `oma image generate` 파이프라인으로 전달됩니다 — 모든 CLI 플래그가 여기서도 동작합니다.

---

## CLI 레퍼런스

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### 주요 플래그

| 플래그 | 용도 |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini`, 또는 `all`. `all` 사용 시 요청한 모든 벤더가 인증되어 있어야 함 (엄격 모드). |
| `-n, --count <n>` | 벤더당 이미지 개수, 1–5 (월 타임 제한). |
| `--size <size>` | 비율: `1024x1024` (정사각형), `1024x1536` (세로형), `1536x1024` (가로형), 또는 `auto`. |
| `--quality <level>` | `low`, `medium`, `high`, 또는 `auto` (벤더 기본값). |
| `--out <dir>` | 출력 디렉토리. 기본값은 `.agents/results/images/{timestamp}/`. `$PWD` 외부 경로는 `--allow-external-out`이 필요. |
| `-r, --reference <path>` | 최대 10개의 참조 이미지 (PNG/JPEG/GIF/WebP, 각 ≤ 5 MB). 반복 또는 쉼표 구분. `codex`와 `gemini`에서 지원; `pollinations`에서는 거부됨. |
| `-y, --yes` | `$0.20` 이상으로 추정되는 실행에서 비용 확인 프롬프트를 생략. `OMA_IMAGE_YES=1`로도 가능. |
| `--no-prompt-in-manifest` | `manifest.json`에 원문 대신 프롬프트의 SHA-256 저장. |
| `--dry-run` | 비용 없이 계획과 비용 추정값만 출력. |
| `--format text\|json` | CLI 출력 포맷. JSON은 다른 스킬을 위한 통합 인터페이스. |
| `--strategy <list>` | Gemini 전용 에스컬레이션, 예: `mcp,stream,api`. `vendors.gemini.strategies`를 오버라이드. |

---

## 참조 이미지

스타일, 피사체 정체성, 또는 구도를 안내하기 위해 최대 10개의 참조 이미지를 첨부합니다.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| 벤더 | 참조 지원 | 방식 |
|---|---|---|
| `codex` (gpt-image-2) | 예 | `codex exec`에 `-i <path>` 전달 |
| `gemini` (2.5-flash-image) | 예 | 요청에 base64 `inlineData` 인라인 |
| `pollinations` | 아니오 | exit code 4로 거부 (URL 호스팅 필요) |

### 첨부 이미지 위치

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, 시스템 메시지에 `[Image: source: <path>]`로 노출. 세션 스코프; 나중에 재사용하려면 영구 위치로 복사 필요.
- **Antigravity** — 워크스페이스 업로드 디렉토리 (IDE가 정확한 경로 표시)
- **호스트로서의 Codex CLI** — 명시적으로 전달해야 함; 대화 내 첨부는 전달되지 않음

사용자가 이미지를 첨부하고 그것을 기반으로 생성 또는 편집을 요청하면, 호출하는 에이전트는 **반드시** 산문으로 묘사하지 말고 `--reference <path>`로 전달해야 합니다. 로컬 CLI가 너무 오래되어 `--reference`를 지원하지 않으면 `oma update`를 실행한 뒤 재시도합니다.

---

## 출력 레이아웃

모든 실행은 타임스탬프와 해시 접미사가 붙은 디렉토리로 `.agents/results/images/`에 기록됩니다:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json`은 벤더, 모델, 프롬프트(또는 그것의 SHA-256), 사이즈, 품질, 비용을 기록합니다 — 매니페스트 하나만으로도 모든 실행을 재현할 수 있습니다.

---

## 비용, 안전성, 취소

1. **비용 가드레일** — `$0.20` 이상으로 추정되는 실행은 확인을 요청합니다. `-y` 또는 `OMA_IMAGE_YES=1`로 우회. 기본 `pollinations` (flux/zimage)는 무료이므로 자동으로 프롬프트가 생략됩니다.
2. **경로 안전성** — `$PWD` 외부의 출력 경로는 예기치 않은 쓰기를 피하기 위해 `--allow-external-out`이 필요합니다.
3. **취소 가능** — `Ctrl+C` (SIGINT/SIGTERM)는 진행 중인 모든 프로바이더 호출과 오케스트레이터를 함께 중단시킵니다.
4. **결정적 출력** — `manifest.json`은 항상 이미지 옆에 작성됩니다.
5. **최대 `n` = 5** — 쿼터가 아닌 월 타임 제한입니다.
6. **Exit code** — `oma search fetch`와 정렬됨: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## 명확화 프로토콜

`oma image generate`를 호출하기 전에, 호출하는 에이전트는 다음 체크리스트를 실행합니다. 누락되어 있고 추론할 수 없는 것이 있으면 먼저 질문하거나, 프롬프트를 보강하고 그 확장을 사용자에게 보여 승인을 받습니다.

**필수:**
- **피사체** — 이미지의 주된 대상은 무엇인가? (사물, 사람, 장면)
- **세팅 / 배경** — 어디에 있는가?

**강력 권장 (없고 추론 불가능하면 질문):**
- **스타일** — 사진 같은 사실주의, 일러스트, 3D 렌더, 유화, 콘셉트 아트, 플랫 벡터?
- **무드 / 조명** — 밝은 vs 무거운, 따뜻한 vs 차가운, 극적 vs 미니멀
- **사용 컨텍스트** — 히어로 이미지, 아이콘, 썸네일, 제품 샷, 포스터?
- **종횡비** — 정사각형, 세로형, 또는 가로형

*"a red apple"*과 같은 짧은 프롬프트의 경우, 에이전트는 후속 질문을 하지 **않습니다**. 대신 인라인으로 보강하여 사용자에게 보여줍니다:

> 사용자: "a red apple"
> 에이전트: "다음과 같이 생성하겠습니다: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. 진행해도 괜찮을까요, 아니면 다른 스타일/구도를 원하시나요?"

사용자가 완전한 크리에이티브 브리프(피사체 + 스타일 + 조명 + 구도 중 2개 이상)를 작성한 경우, 그 프롬프트는 그대로 존중됩니다 — 명확화도, 보강도 없음.

**출력 언어.** 생성 프롬프트는 영어로 프로바이더에 전송됩니다 (이미지 모델은 주로 영어 캡션으로 학습됨). 사용자가 다른 언어로 작성한 경우, 에이전트는 번역하여 보강 단계에서 보여주어 사용자가 잘못 읽은 부분을 수정할 수 있도록 합니다.

---

## 공유 호출 (다른 스킬에서)

다른 스킬은 공유 인프라로서 이미지 생성을 호출합니다:

```bash
oma image generate "<prompt>" --format json
```

stdout으로 작성되는 JSON 매니페스트에는 출력 경로, 벤더, 모델, 비용이 포함되어 — 파싱과 체이닝이 쉽습니다.

---

## 설정

- **프로젝트 설정:** `config/image-config.yaml`
- **환경 변수:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — 기본 벤더 오버라이드 (그 외에는 `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — 기본 출력 디렉토리 오버라이드
  - `OMA_IMAGE_YES` — 비용 확인을 우회하려면 `1`
  - `POLLINATIONS_API_KEY` — pollinations 벤더에 필요 (무료 가입)
  - `GEMINI_API_KEY` — gemini 벤더가 직접 API로 폴백할 때 필요
  - `OMA_IMAGE_GEMINI_STRATEGIES` — gemini의 쉼표 구분 에스컬레이션 순서 (`mcp,stream,api`)

---

## 트러블슈팅

| 증상 | 가능한 원인 | 해결 |
|---|---|---|
| Exit code `5` (auth-required) | 선택한 벤더가 인증되지 않음 | `oma image doctor`를 실행하여 어떤 벤더가 로그인이 필요한지 확인. 그 후 `codex login` / `POLLINATIONS_API_KEY` 설정 / `gemini auth login`. |
| `--reference`에서 Exit code `4` | `pollinations`가 참조를 거부했거나, 파일이 너무 크거나 포맷이 잘못됨 | `--vendor codex` 또는 `--vendor gemini`로 전환. 각 참조는 ≤ 5 MB이고 PNG/JPEG/GIF/WebP여야 함. |
| `--reference`가 인식되지 않음 | 로컬 CLI가 오래됨 | `oma update`를 실행하고 재시도. 산문 묘사로 폴백하지 말 것. |
| 비용 확인이 자동화를 차단 | 실행이 `$0.20` 이상으로 추정됨 | `-y`를 전달하거나 `OMA_IMAGE_YES=1` 설정. 더 나은 방법: 무료 `pollinations`로 전환. |
| `--vendor all`이 즉시 중단됨 | 요청한 벤더 중 하나가 인증되지 않음 (엄격 모드) | 누락된 벤더를 인증하거나, 특정 `--vendor`를 선택. |
| 출력이 예상치 못한 디렉토리에 작성됨 | 기본값은 `.agents/results/images/{timestamp}/` | `--out <dir>` 전달. `$PWD` 외부 경로는 `--allow-external-out` 필요. |
| Gemini가 이미지 바이트를 반환하지 않음 | Gemini CLI의 에이전틱 루프가 stdout으로 원시 `inlineData`를 내보내지 않음 (0.38 기준) | 프로바이더가 자동으로 직접 API로 폴백. `GEMINI_API_KEY`를 설정하고 결제 활성화 확인. |

---

## 관련 문서

- [Skills](/docs/core-concepts/skills) — `oma-image`를 구동하는 2계층 스킬 아키텍처
- [CLI Commands](/docs/cli-interfaces/commands) — `oma image` 전체 커맨드 레퍼런스
- [CLI Options](/docs/cli-interfaces/options) — 글로벌 옵션 매트릭스
