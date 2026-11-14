---
title: "가이드: 설정 레퍼런스"
sidebar_label: 설정 레퍼런스
description: OMA 설정 파일의 위치, 적용 순서, 키별 타입과 기본값, 업데이트할 때 보존되거나 바뀌는 내용을 설명합니다.
---

# 설정 레퍼런스 {#configuration-reference}

OMA는 `.agents/oma-config.cue` 또는 `.agents/oma-config.yaml`에서 설정을 읽습니다. 컴퓨터마다 다른 설정을 공유 파일과 분리하려면 로컬 오버레이인 `.agents/oma-config.local.cue` 또는 `.agents/oma-config.local.yaml`을 사용합니다.

확인하려는 설정이 있는 프로젝트에서 다음 명령을 실행합니다.

```bash
oma doctor --profile
```

출력에는 선택한 프리셋과 에이전트별로 사용할 모델이 표시됩니다. 설정을 읽는 중 구문 오류가 발생하면 모델을 바꾸기 전에 가장 가까운 설정 계층부터 수정합니다.

## 어떤 파일이 우선하는가 {#which-file-wins}

로더는 `$OMA_HOME/.agents/`(기본값
`~/.oma/.agents/`)에서 전역 기본값을 읽은 다음, 현재 디렉토리에서 상위로 이동하며
가장 가까운 프로젝트 `.agents/` 디렉토리에서 멈춥니다. 선택된 각 디렉토리에서는 다음과 같이 적용합니다.

1. `oma-config.yaml`이 공유 값을 제공합니다.
2. `oma-config.cue`가 있고 유효하면 자신이 지정한 모든 키를 덮어씁니다. CUE가 지정하지 않은 YAML 키는 그대로 남습니다. CUE 파일을 평가할 수 없으면 OMA는 경고하고 YAML 파일만 사용합니다.
3. 로컬 파일 하나(`oma-config.local.cue` 또는 `.local.yaml`)를 공유 결과 위에 병합합니다.

프로젝트의 공유/로컬 결과는 전역 공유/로컬 결과를 덮어씁니다.
`OMA_MODEL_PRESET`이 설정되어 있으면 모든 파일 계층을 적용한 뒤 `model_preset`을 덮어씁니다.
전체 순서, 흐름도, 문제 해결 방법은
[설정 로딩](/docs/guide/oma-config-semantics#precedence-table)에 있습니다.

키와 값으로 이루어진 맵은 중첩된 항목까지 병합합니다. 배열, 단일 값, `null`은 기존 공유 값을 대체합니다. 두 형식의 로컬 파일을 함께 두면 오류가 발생합니다. 로컬 파일이 잘못되면 개인 설정이 조용히 무시되지 않도록 설정 로딩을 중단합니다.

서로 다른 상위 프로젝트 루트는 병합하지 않습니다. 가장 가까운 프로젝트의
`.agents/`가 비어 있어도 그 경계는 유지됩니다. 은퇴한 `~/.agents/` 설치는
마이그레이션 입력일 뿐 프로젝트 폴백으로 읽지 않습니다. 전역 기본값은
현재 프로젝트의 식별 정보나 메모리 범위를 바꾸지 않습니다.

## 최상위 키 {#top-level-keys}

다음 키는 현재 실행 코드의 스키마나 OMA의 각 기능에서 읽습니다. 일부(sparse)로 표시된 키는 의도적으로 필요한 항목만 지정하는 설정입니다. 중첩된 값을 생략하면 코드의 기본값을 유지합니다.

| 키 | 타입 또는 허용 값 | 생략했을 때 기본값 | 목적 |
| --- | --- | --- | --- |
| `language` | 문자열 | `en` | 워크플로우와 스킬이 사용하는 응답 언어입니다. 설치는 기존 값을 유지하거나, 묻지 않고 시스템 언어로 초기화합니다. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | 배포 템플릿에서는 `balanced` | `oma-translation`의 문체를 선택합니다. |
| `date_format` | `ISO`, `US`, `EU` | 배포 템플릿에서는 `ISO`; 생략하면 명시적인 지정 없음 | 날짜 표시 형식을 정합니다. |
| `timezone` | IANA 시간대 이름 | 시스템 시간대 | 예약 작업과 보고서의 날짜에 적용할 시간대입니다. |
| `auto_update_cli` | 불리언 | `true` | 백그라운드에서 CLI 버전을 확인합니다. `false`로 끌 수 있습니다. |
| `telemetry` | 불리언 | `false` | 설치·업데이트·연동 파일을 갱신할 때 벤더의 텔레메트리 수집 설정에 동의할지 정합니다. |
| `model_preset` | 비어 있지 않은 문자열 | 새 템플릿에서는 `auto` | 기본 제공 또는 사용자 정의 모델 프리셋입니다. `OMA_MODEL_PRESET`으로 현재 프로세스에서만 바꿀 수 있습니다. |
| `free` | `base_url`, `api_key_env`, `model` | 지정 없음 | `providers.free`의 예전 표기입니다. 그쪽의 `model`은 `default_model`입니다. 여전히 읽히며 `oma update`가 옮깁니다. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory`, `brave`·`exa`·`honcho` 자격 증명 섹션, 그 외 `<name>` → LLM 프로바이더 객체 | `context7`, `native`, `serena`, `block`, `agentmemory`. 자격 증명이나 LLM 프로바이더는 없음 | 문서, 검색, 코드 인텔리전스, 시맨틱 메모리 프로바이더를 고르고, 자격 증명 참조를 담으며, 에이전트를 보낼 LLM 엔드포인트를 선언합니다. [프로바이더](#providers)를 참고하세요. |
| `brave`, `exa`, `honcho` | `providers` 아래와 같음 | 지정 없음 | `providers.brave`, `providers.exa`, `providers.honcho`의 예전 최상위 표기입니다. 여전히 읽히며 `oma update`가 옮깁니다. |
| `agents` | 에이전트 ID → `model`, 선택적 `effort`, `thinking`, `memory`. `default` → `cli`, `effort`, `thinking`, `memory` | 프리셋 해석. `default.cli`는 `claude`로 폴백(`codex`는 프로바이더 경로) | 선택한 프리셋 위에 적용할 에이전트별 설정입니다. `effort`는 `none`, `low`, `medium`, `high`, `xhigh`이고 `memory`는 `user`, `project`, `local`입니다. `agents.default`는 자체 값을 하나도 설정하지 않은 모든 역할에 그 필드를 채우고, `cli`(`claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi` 중 하나)는 다른 곳에서 벤더를 고르지 않을 때 씁니다. `auto`에서 런타임을 감지하지 못한 경우, 또는 프로바이더 경로에서 `--vendor`, `OMA_RUNTIME_VENDOR`, 감지된 런타임 다음입니다. `<provider>/<model-id>` 모델은 그 역할을 해당 LLM 프로바이더로 보냅니다. |
| `models` | 모델 식별자 → CLI 매핑 | 지정 없음 | 지원하는 벤더 CLI에서 사용할 모델을 직접 정의합니다. |
| `custom_presets` | 프리셋 → `description`, 선택적 `extends`, `agent_defaults` | 지정 없음 | 사용자 정의 프리셋입니다. `extends`로 기본 제공 프리셋을 상속할 수 있습니다. |
| `vendors` | 선택한 벤더 ID의 `string[]` (YAML과 CUE) | 생략 시: `oma link`는 연동 가능한 모든 벤더, `oma update`는 프로젝트 디렉토리가 있는 벤더를 사용 | `oma install`과 `oma update`가 어떤 벤더의 연동 파일을 생성할지 선택합니다. 벤더별 실행 방식은 관리되는 오케스트레이션 설정에 있습니다. [벤더 선택 및 디스패치 메타데이터](#vendor-selection-and-dispatch-metadata)를 참고하세요. |
| `default_cli` | 벤더 ID | 지정 없음 | `agents.default.cli`의 예전 표기입니다. 여전히 읽히며 `oma update`가 옮깁니다. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | 생략한 항목은 제한 없음 | 다음 에이전트 스폰 전에 확인하는 기록된 토큰 사용량과 스폰 상한입니다. [세션 사용량 상한](#session-quota-caps)을 참고하세요. |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | 지원하는 터미널 호스트에서는 자동, `false`, `1400` | 네이티브 파일 편집 전후의 Serena 진단을 비교합니다. [진단 피드백](#diagnostic-feedback)을 참고하세요. |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | `oma docs verify`의 동작과 검사 제외 항목입니다. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena MCP의 전송 방식과 업데이트 동작입니다. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` 또는 `[]` | 지정하지 않으면 기존 설정 유지 | 연동 설정을 갱신할 때 사용할 브라우저 DevTools MCP를 선택합니다. 명시적인 빈 목록은 선택된 브라우저 항목을 제거합니다. |
| `video` | 필요한 값만 지정하는 스킬 설정 맵 | 스킬 기본값; [영상 생성](/docs/guide/video-generation) 참고 | 영상 생성 경로, 프로바이더 순서, 출력, 비용, 제한, HyperFrames 갱신 설정입니다. |
| `image` | 필요한 값만 지정하는 스킬 설정 맵 | 스킬 기본값; [이미지 생성](/docs/guide/image-generation) 참고 | 이미지 벤더, 크기, 품질, 출력, 비교, 비용 설정입니다. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto`; 나머지 키는 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) 참고 | 음성 백엔드(`auto`, `voicebox`, `voicestudio`; `oma video` 내레이션도 같은 설정 사용), 프로필, 출력, 길이 설정입니다. |
| `hwp` | `format`, `version.*`, `output.*` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#extract-hwp-family-documents) 참고 | Kordoc 형식, 버전 채널, 출력 위치입니다. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#extract-pdf-content) 참고 | PDF 추출, OCR, 이미지, 덮어쓰기 설정입니다. |
| `scholar` | `base_url` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#search-and-validate-scholarly-material) 참고 | Knows 연결 주소의 호스트입니다. 프로토콜 구조는 스킬에서 정합니다. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | 스킬 기본값; [다이어그램 엔진](/docs/guide/diagram-engine) 참고 | Mermaid/archify 선택과 archify 고정·품질 설정입니다. 폐기된 `archify.managed`, `archify.channel`, `archify.check_interval_min`은 안내와 함께 무시되며 `oma update`가 제거합니다. |
| `market` | `path`, `python`, `save_dir` | 스킬 기본값; [시장 조사](/docs/guide/market-research) 참고 | last30days 엔진 고정, 인터프리터, 결과 위치입니다. 폐기된 `managed`, `channel`, `check_interval_min`은 안내와 함께 무시되며 `oma update`가 제거합니다. |

배포 템플릿에는 개별 기능이 해석하는 설정 블록도 있습니다. 현재 키와 기본값은 다음과 같습니다.

| 블록 | 담당 기능이 읽는 키 | 기본값 | 효과 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | 세션 100개 유지; 50일보다 오래된 Serena 산출물 정리; `0`이면 경과 일수에 따른 정리 비활성화 | `oma memory gc`의 기본값입니다. 명령 옵션이 이 값보다 우선합니다. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | 예약된 Serena 언어 서버 정리를 제어합니다. `oma serena reap`을 직접 실행하는 경우와 별개이며, 예약된 조용한 실행은 명시적으로 켜야 동작합니다. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | 종료 훅에서 코드 줄 수를 제한하는 검사를 켜고 파일별 상한을 설정합니다. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | 배포 템플릿은 Conventional Commits와 PR 보호를 켜고 템플릿의 공동 작성자·파일명 목록을 사용 | SCM 스킬, 커밋 훅, 비밀정보 패턴 검사를 제어합니다. 공동 작성자 표시를 켜기 전에 템플릿의 신원 정보를 자신의 값으로 바꿉니다. |

이 블록은 설정 파서가 그대로 전달하고 해당 기능이나 워크플로우가 해석합니다. `serena_reaper` 파서는 위에 나온 snake_case 키만 읽고 camelCase는 무시합니다. 배포 템플릿에는 아직 camelCase(`keepWarm`, `idleMinutes`, `graceSeconds`)가 표시되어 있고, 배포된 CUE 스키마는 스키마 블록 안의 snake_case 키를 거부하므로(`field not allowed`) 이 키는 `oma-config.yaml`이나 로컬 YAML 오버레이에 설정하세요. 중첩 키를 추가하기 전에 해당 기능의 가이드를 확인합니다. 이 페이지는 여기에 나열된 기능이 읽는 키만 다룹니다.

## 중첩 객체의 키와 기본값 {#exact-nested-objects}

### 프로바이더 {#providers}

`providers`는 기능마다 프로바이더 하나를 선택합니다.

| 키 | 허용 값 | 기본값 |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | 검색 프로바이더 ID(영문 소문자, 숫자, `_`, `-`). 예: `native`, `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

선택자용 자격 증명 또는 연결 섹션을 담는 예약 키는 세 개입니다. `web`용 `providers.brave`와 `providers.exa`(`api_key_env` 또는 `api_key_vault`), `semantic_memory`용 `providers.honcho`([Honcho 의미 기반 메모리](#honcho-semantic-memory) 참고)입니다. 예전 최상위 표기도 여전히 읽습니다.

`providers` 아래의 다른 키는 **LLM 프로바이더**입니다. OpenAI 또는 Anthropic과 호환되는 엔드포인트로, `oma agent spawn`이 자식 CLI를 그 CLI 자신의 계정 대신 이 경로로 보낼 수 있습니다. 값은 객체입니다.

| 필드 | 허용 값 | 필수 | 목적 |
| --- | --- | --- | --- |
| `base_url` | 자격 증명, 쿼리, 프래그먼트가 없는 절대 HTTP(S) URL. 없으면 `/v1`을 붙임 | 예 | 엔드포인트입니다. |
| `api_key_env` | 환경 변수 이름 | 예(`free`는 예외이며 기본값은 `FREELLM_API_KEY`) | 키를 읽는 위치입니다. 파일에는 키를 넣지 않습니다. `base_url`도 `free`에서만 선택입니다(`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions`(기본값), `responses`, `anthropic_messages`, `multi` | 아니오 | 엔드포인트가 쓰는 와이어 프로토콜입니다. 자식 CLI를 고릅니다. `chat_completions` → Codex 또는 Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi`(셋을 모두 제공하는 게이트웨이) → Codex, Claude, Qwen입니다. |
| `default_model` | 모델 ID | 프로바이더를 `model_preset`으로 쓸 때 | `model_preset: <name>`에서 모든 역할이 쓰는 모델입니다. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free`는 로컬 FreeLLMAPI 게이트웨이용 빌트인 프로바이더입니다. 모든 필드에 기본값이 있고, `FREELLM_BASE_URL`과 `FREELLM_MODEL`이 파일 값을 덮어쓰며, 레거시 최상위 `free:` 블록도 여전히 읽습니다. 그 `model`이 여기서의 `default_model`입니다. [커스텀 LLM 프로바이더](/docs/guide/per-agent-models#custom-llm-providers)를 참고하세요.

`code_intelligence_guard`는 PreToolUse 검색 가드를 제어합니다. 확인된 프로바이더 제외 대상이나 프로젝트 밖 경로로 한정된 네이티브 검색은 우회 없이 허용됩니다. 가드는 Serena의 제외 설정과 활성화된 gitignore 규칙, 또는 Gortex의 제외 목록을 읽으며, 디렉토리 이름으로 의존성을 추정하지 않습니다.

훅은 `OMA_CI_ALLOW_NATIVE`를 언급하지 않습니다. `OMA_CI_ALLOW_NATIVE=1`을 앞에 붙인 셸 검색이 가드를 우회하는 대상은 프로젝트 밖 리소스와 가드가 인식하지 못한 무시 대상 경로뿐이며, 프로젝트 소스는 해당하지 않습니다.

### Honcho 의미 기반 메모리 {#honcho-semantic-memory}

`providers.honcho` 맵(예전 최상위 `honcho`도 여전히 읽음)은 `HonchoConfigSchema`로 검증됩니다. 키 이름과 실제 실행 동작은 다음과 같습니다.

| 키 | 형태 | 실제 기본값 또는 제약 |
| --- | --- | --- |
| `base_url` | URL 문자열 | `https://api.honcho.dev`; 루프백 HTTP를 제외하면 HTTPS가 필요합니다. 인증정보, 쿼리 문자열, 프래그먼트는 허용하지 않습니다. |
| `workspace_id` | 영문자, 숫자, `_`, `-`로 이루어진 1~128자 | 프로바이더가 시작될 때 필수입니다. 저장된 값이 없으면 대화형 설치 프로그램이 초기값으로 `oma`를 넣습니다. |
| `project_id` | 앞뒤 공백을 제거한 1~128자 문자열 | 생략하면 현재 OMA 프로젝트 루트를 사용합니다. |
| `api_key_env` | 환경 변수 이름 | `HONCHO_API_KEY`. 루프백이 아닌 주소에는 이 변수 또는 `api_key_vault`가 필요합니다. |
| `api_key_vault` | 비밀정보 저장소의 키 이름(`A-Z`, `a-z`, 숫자, `.`, `_`, `-`; 1~64자) | 생략하면 저장소에서 찾지 않습니다. 환경 변수와 저장소를 모두 지정하면 환경 변수의 값을 먼저 사용합니다. |
| `timeout_ms` | 정수 `100`~`30000` | `5000`밀리초입니다. 상태 확인이나 메모리 요청에 같은 제한 시간을 적용합니다. |
| `max_results` | 정수 `1`~`50` | 메모리 조회 결과 `8`개입니다. |
| `max_tokens` | 정수 `128`~`16000` | 조회한 내용과 추론한 맥락에 사용할 UTF-8 바이트 `2000`개입니다. |
| `recall_mode` | `messages` 또는 `hybrid` | 새로 선택하면 설치 프로그램이 `messages`를 기록합니다. 값을 생략하면 프로바이더의 맥락 표현 요청과 메시지 조회를 모두 활성화합니다. |

예를 들어 원격 워크스페이스에서도 비밀정보를 YAML에 직접 넣지 않고 저장소의 키 이름을 지정할 수 있습니다.

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

저장된 URL 없이 Honcho를 설정할 때 설치 프로그램은 대화형·비대화형 모드 모두 초기 URL로 `http://127.0.0.1:8000`을 사용합니다. 이 설치 초기값은 위에 설명한 프로바이더의 실행 시 기본값과 다릅니다. 프로바이더를 선택한 뒤 `oma memory status`로 확인합니다. 워크스페이스나 인증정보가 없으면 다른 메모리 프로바이더로 조용히 전환하지 않고 사용할 수 없는 상태로 보고합니다.

### 세션 사용량 상한 {#session-quota-caps}

`session.quota_cap`에는 필요한 항목만 지정할 수 있습니다. 모든 필드는 선택 사항이며, 생략하면 해당 항목은 제한하지 않습니다. 값은 `_` 구분자 없이 쓴 0 이상의 정수여야 합니다(YAML은 `2_000_000`을 문자열로 읽으므로 해당 항목은 제한되지 않습니다). `per_vendor`에는 `claude`, `codex`, `antigravity` 같은 디스패치 벤더 ID별 토큰 예산을 지정합니다.

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

상한은 사용자 CUE 설정, 사용자 YAML 설정, 배포된 기본 설정 순으로 확인합니다. 에이전트를 실행하기 전에 OMA는 `spawn_count`, 전체 `tokens`, `per_vendor`를 이 순서로 검사합니다. 사용량이 설정값 이상이면 다음 실행을 막고 처음으로 상한에 도달한 항목을 보고합니다.

실행이 시작되면 OMA는 입력 토큰 추정치를 예약합니다. 실행 후 지원되는 네이티브 트랜스크립트를 쓸 수 있으면, 기록된 입력·캐시·출력 사용량이 그 추정치를 대체하고 스폰은 다시 세지 않습니다. 그렇지 않으면 기록은 프롬프트 길이로 명시적으로 추정된 상태로 남습니다. 네이티브 서브에이전트가 수집 범위 밖에 있으면 관측된 루트 세션 사용량은 partial로 표시됩니다. 따라서 토큰 상한은 쓸 수 있는 관측에 의존합니다. 이미 실행 중인 자식을 중단하지 않으며 청구 한도를 보장하지도 않습니다. `spawn_count`가 가장 예측 가능한 상한입니다.

### 세션 실행 예산 {#session-execution-budget}

OMA가 관리하는 CLI 디스패치와 검증의 경과 시간을 제한하려면 `session.execution`을 설정합니다. 양의 `timeout_seconds` 또는 시간대가 있는 ISO 8601 `deadline` 중 하나를 사용합니다.

```yaml
session:
  execution:
    timeout_seconds: 1800
```

`oma agent spawn`, `parallel`, `review`, `resume`, `begin`, `verify` 명령은 `--timeout-seconds` 또는 `--deadline`을 받습니다. 준비, 실행, 재시도, 검사는 하나의 절대 deadline을 공유합니다. 설정된 값, 상속된 값, 저장된 값 중 가장 이른 deadline이 우선하며, 재시도와 재개는 시계를 초기화하지 않습니다. `session.execution`과 두 플래그를 모두 생략하면 부모가 deadline을 넘기지 않은 한 이 차원은 제한되지 않습니다.

실행 이력은 `.agents/state/executions/` 아래에 남습니다. 취소나 타임아웃은 그 세션의 이후 실행을 막고 중지 이유를 기록합니다. 이 제어는 관리되는 CLI 경로로 시작한 프로세스를 다룹니다. 네이티브 벤더 에이전트와 임의의 셸 작업은 호스트의 취소 수단이 필요하고, CPU·RAM·저장소 상한은 프로바이더 지원이 필요합니다.

관리되는 자식 CLI는 `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE`, `OMA_EXECUTION_ID`를 상속합니다. 상태 경로와 실행 ID가 묶인 상속 참조를 이루며, 다른 세션의 원장이나 형식이 잘못된 원장, 서로 맞지 않는 원장은 쓰기 전에 거부됩니다. OMA 자식을 감쌀 때는 상속된 환경을 모두 전달하세요. 이 변수를 설정해도 관련 없는 프로그램에 deadline 적용이 추가되지는 않습니다.

취소되면 OMA는 신규 진입을 멈추고, 소유한 계산을 제한된 범위에서 종료하려고 합니다. 로그, 결과, worktree, 등록된 리소스 메타데이터는 유지합니다. 산출물이나 외부 리소스를 지우려면 요청이나 명시적인 보존 정책이 필요합니다. 종료가 실패하면 완전히 정리된 것으로 보고하지 않고 그대로 보이게 둡니다.

### 진단 피드백 {#diagnostic-feedback}

지원하는 터미널 호스트에서는 OMA가 네이티브 파일 편집 전후의 오류와 경고를 비교하고, 새로 보고된 진단을 다음 도구 피드백에 넣습니다. Serena가 유효한 코드 인텔리전스 프로바이더일 때(프로바이더를 지정하지 않으면 기본값) 이미 실행 중이고 프로젝트가 일치하는 Serena HTTP 데몬을 사용합니다. 데몬을 시작하거나 빌드를 실행하지는 않습니다. Serena 자신의 심볼 편집은 이미 진단을 제공하므로 제외합니다.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

이 피드백을 끄려면 `enabled: false`로 설정합니다. 호스트가 이미 편집 진단을 제공하면 `host_diagnostics: true`로 설정합니다. Cursor와 Antigravity는 자동으로 건너뜁니다. 프로젝트 로컬 오버라이드는 일반적인 설정 계층을 따릅니다. 환경 변수 오버라이드는 `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS`, `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`입니다.

타임아웃은 편집 전 또는 편집 후 훅 전체를 다루며 100~10,000밀리초로 제한됩니다. 느린 프로바이더는 더 큰 타임아웃을 쓸 수 있습니다. 조회가 실패하거나 시간 초과되면 피드백을 건너뛰고 짧은 대기 시간을 시작합니다. 깨끗한 진단 결과로 세지 않습니다. 편집 전 기준선이 없거나 오래되어도 피드백을 건너뜁니다. 각 훅은 파일을 최대 3개까지 확인하고, 새 오류나 경고를 최대 8개까지 보고합니다.

### 벤더 선택 및 디스패치 메타데이터 {#vendor-selection-and-dispatch-metadata}

사용자 소유의 `.agents/oma-config.yaml`에서 `vendors`는 연동할 벤더 ID의 목록입니다.

```yaml
vendors:
  - claude
  - codex
  - pi
```

목록을 지정하면 정확히 그 벤더만 선택하고, `vendors: []`는 아무 벤더도 선택하지 않습니다. `vendors` 키가 없으면 `oma link`는 OMA의 연동 가능 벤더 레지스트리에 있는 모든 벤더를 대상으로 하고, `oma update`는 프로젝트 디렉토리가 이미 있는 벤더만 대상으로 합니다. 이 목록은 설치와 업데이트 시 생성할 연동 파일을 정하며, 벤더별 명령 실행 방식을 정의하는 맵은 아닙니다.

배포된 `.agents/oma-config.cue` 스키마는 `vendors`를 같은 목록(`[...string]`)으로 정의합니다. 이전 CUE 템플릿은 이를 아무도 읽지 않는 `vendors.pi` 객체(`#VendorsConfig`)로 정의했습니다. 에이전트 실행 코드는 아래의 관리되는 오케스트레이션 레지스트리에서 벤더별 실행 방식을 읽습니다. `oma-config.cue`에 아직 `vendors?: #VendorsConfig`가 선언되어 있다면, 그곳에 선택 목록을 넣기 전에 `vendors?: [...string]`으로 바꾸세요.

관리되는 `.agents/skills/oma-orchestration/config/cli-config.yaml`에 벤더별 실행 설정이 있습니다. 각 `vendors.<id>` 항목은 다음 필드를 지원합니다.

| 필드 | 형태 | 용도 |
| --- | --- | --- |
| `command` | 실행 파일 이름을 담은 문자열 | 실행할 바이너리입니다. |
| `subcommand` | 문자열 | `codex exec`처럼 옵션 앞에 넣을 하위 명령입니다. |
| `prompt_flag` | 문자열, 또는 비활성화 값 `none`/`null` | 프롬프트 앞에 붙일 옵션입니다. 비활성화하면 프롬프트를 위치 인자로 전달합니다. |
| `auto_approve_flag` | 문자열 | 쓰기가 허용된 실행에서 벤더의 승인 확인을 건너뛰는 옵션입니다. 읽기 전용 모드에서는 사용하지 않습니다. |
| `read_only_flag` | 문자열 | 벤더의 읽기 전용 옵션입니다. 없으면 실행 명령을 구성할 때 벤더별 대체값을 사용하거나 경고합니다. |
| `output_format_flag` | 문자열 | 프로그램이 읽을 수 있는 출력 형식을 선택하는 옵션입니다. |
| `output_format` | 문자열 | `output_format_flag`에 전달할 값입니다. |
| `model_flag` | 문자열 | `default_model` 앞에 붙일 옵션입니다. |
| `default_model` | 문자열 | 결정된 실행 계획에 모델이 없을 때 사용할 모델입니다. |
| `isolation_env` | `NAME=value` 형식의 문자열 | 선택적으로 지정할 환경 변수입니다. 안전하지 않은 로더·인터프리터 키는 거부하고, `$$`는 현재 프로세스 ID로 확장합니다. |
| `isolation_flags` | 셸 인자 형식의 문자열 | 추가 격리 인자입니다. 개별 argv 토큰으로 나누어 전달합니다. |

이 관리 파일은 OMA 업데이트가 다시 생성합니다. 사용할 모델을 바꾸려면 사용자 소유의 `agents`, `models`, `custom_presets` 키를 편집합니다. 벤더별 실행 설정은 관리되는 오케스트레이션 데이터를 유지하거나 벤더 어댑터를 디버깅할 때만 사용합니다. 이전 템플릿에서 주석 처리된 `vendors.pi` 객체는 대체 설정을 설명하는 메타데이터이며, 벤더 선택 목록이나 관리되는 디스패치 레지스트리를 대신하지 않습니다.

## 자주 변경하는 설정 {#common-changes}

프로젝트에는 고정 프리셋을 선택하고 개인 설정은 로컬 파일에 둡니다.

**공유 파일**(커밋함):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**로컬 오버레이**(Git에서 무시함):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
    effort: high
```

코드 분석과 메모리에 사용할 프로바이더를 명시적으로 선택합니다.

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

업데이트 중 브라우저 설정을 그대로 유지하거나, 의도적으로 제거합니다.

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## 업데이트와 파일 소유권 규칙 {#update-and-ownership-rules}

`.agents/oma-config.yaml`은 사용자 소유입니다. `oma update`는 기존 내용을 보존하며, 새로 배포된 최상위 템플릿 키를 `# Added by oma update` 표시 아래에 덧붙일 수 있습니다. `oma update --force`는 사용자 설정, MCP 설정, 스택 디렉토리를 교체할 수 있으므로 해당 설정을 초기화하려는 경우에만 사용합니다. 로컬 오버레이 파일에는 계속 컴퓨터별 비공개 값을 둘 수 있습니다.

API 키를 이 파일에 직접 넣지 않습니다. `api_key_env` 또는 `api_key_vault`에는 참조할 이름을 지정하고, 실제 인증정보는 해당 비밀정보 저장소나 환경 변수에 둡니다.

모델 선택의 세부 규칙은 [에이전트별 모델 설정](/docs/guide/per-agent-models)을, 설정 계층과 오류 처리 규칙은 [oma-config 동작 규칙](/docs/guide/oma-config-semantics)을 참고하세요.
