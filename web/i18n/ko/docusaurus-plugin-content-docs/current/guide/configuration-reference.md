---
title: "가이드: 설정 레퍼런스"
sidebar_label: 설정 레퍼런스
description: OMA 설정 파일의 위치, 적용 순서, 키별 타입과 기본값, 업데이트할 때 보존되거나 바뀌는 내용을 설명합니다.
---

# 설정 레퍼런스 {#configuration-reference}

OMA는 `.agents/oma-config.cue` 또는 `.agents/oma-config.yaml`에서 설정을 읽습니다. 컴퓨터마다 다른 설정을 공유 파일과 분리하려면 `.agents/oma-config.local.cue` 또는 `.agents/oma-config.local.yaml`을 사용합니다. 이 로컬 설정은 공유 설정 위에 덮어 적용됩니다.

확인하려는 설정이 있는 프로젝트에서 다음 명령을 실행합니다.

```bash
oma doctor --profile
```

출력에는 선택한 프리셋과 에이전트별로 사용할 모델이 표시됩니다. 설정을 읽는 중 구문 오류가 발생하면 모델을 바꾸기 전에 오류가 난 설정 파일부터 수정합니다.

## 어떤 파일이 우선하는가 {#which-file-wins}

OMA는 현재 디렉토리에서 상위로 이동하며 공유 설정이나 로컬 설정이 있는 가장 가까운 `.agents/` 디렉토리를 찾습니다. 해당 디렉토리에서는 다음 순서로 설정을 적용합니다.

1. `oma-config.cue`를 먼저 평가합니다.
2. 공유 CUE 파일이 없거나 평가할 수 없으면 `oma-config.yaml`을 사용합니다.
3. 로컬 파일 하나(`oma-config.local.cue` 또는 `.local.yaml`)를 공유 설정 위에 병합합니다.
4. `OMA_MODEL_PRESET`이 설정되어 있으면 해당 프로세스의 `model_preset`을 덮어씁니다.

키와 값으로 이루어진 맵은 중첩된 항목까지 병합합니다. 배열, 단일 값, `null`은 기존 공유 값을 대체합니다. 두 형식의 로컬 파일을 함께 두면 오류가 발생합니다. 로컬 파일이 잘못되어도 개인 설정을 무시하고 계속 실행하지 않으며, 설정 로딩을 중단합니다.

이 규칙은 가장 가까운 설정 디렉토리를 선택합니다. 프로젝트와 홈의 설정을 항상 합치는 방식은 아닙니다. 전역 설치에서는 HOME이 설치 루트이므로 `~/.agents/oma-config.*`를 읽고, 프로젝트 명령은 가장 가까운 프로젝트 설정을 읽습니다. CLI 업데이트를 확인하는 `auto_update_cli`는 예외로 프로젝트, HOME, 활성화된 기본값 순으로 확인합니다.

## 최상위 키 {#top-level-keys}

다음 키는 현재 실행 코드의 스키마나 OMA의 각 기능에서 읽습니다. 일부 기능의 설정 블록에는 필요한 항목만 지정할 수 있습니다. 중첩된 값을 생략하면 해당 기능의 기본값을 유지합니다.

| 키 | 타입 또는 허용 값 | 생략했을 때 기본값 | 목적 |
| --- | --- | --- | --- |
| `language` | 문자열 | `en` | 워크플로우와 스킬이 사용하는 응답 언어입니다. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | 배포 템플릿에서는 `balanced` | `oma-translation`의 문체를 선택합니다. |
| `date_format` | `ISO`, `US`, `EU` | 배포 템플릿에서는 `ISO`; 생략하면 명시적인 지정 없음 | 날짜 표시 형식을 정합니다. |
| `timezone` | IANA 시간대 이름 | 시스템 시간대 | 예약 작업과 보고서의 날짜에 적용할 시간대입니다. |
| `auto_update_cli` | 불리언 | `true` | 백그라운드에서 CLI 버전을 확인합니다. `false`로 끌 수 있습니다. |
| `telemetry` | 불리언 | `false` | 설치·업데이트·연동 파일을 갱신할 때 벤더의 텔레메트리 수집 설정에 동의할지 정합니다. |
| `model_preset` | 비어 있지 않은 문자열 | 새 템플릿에서는 `auto` | 기본 제공 또는 사용자 정의 모델 프리셋입니다. `OMA_MODEL_PRESET`으로 현재 프로세스에서만 바꿀 수 있습니다. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | `free` 프리셋의 FreeLLMAPI 연결 설정입니다. `FREELLM_BASE_URL`과 `FREELLM_MODEL`이 파일 값보다 우선합니다. API 키 자체가 아닌 환경 변수 이름을 지정합니다. [에이전트별 모델 설정](/docs/guide/per-agent-models#freellmapi-preset)을 참고하세요. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | 문서 조회, 웹 검색, 코드 분석, 의미 기반 메모리에 사용할 도구를 선택합니다. 코드 분석은 `serena` 또는 `gortex`, 의미 기반 메모리는 `agentmemory`, `honcho`, `none`을 허용합니다. `code_intelligence_guard`(`block` 또는 `off`)는 PreToolUse 검색 가드를 제어합니다. 확인된 제공자 제외 대상이나 프로젝트 밖 경로로 한정된 네이티브 검색은 우회 없이 허용됩니다. 가드는 Serena의 제외 설정과 활성화된 gitignore 규칙, 또는 Gortex의 제외 목록을 읽으며, 디렉토리 이름으로 의존성을 추정하지 않습니다. 훅은 `OMA_CI_ALLOW_NATIVE`를 언급하지 않습니다. `OMA_CI_ALLOW_NATIVE=1`을 앞에 붙인 셸 검색이 가드를 우회하는 대상은 프로젝트 밖 리소스와 가드가 인식하지 못한 무시 대상 경로뿐이며, 프로젝트 소스는 해당하지 않습니다. |
| `brave` | `api_key_env` 또는 `api_key_vault` | 지정 없음 | Brave 검색 인증정보를 어디에서 읽을지 지정합니다. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | [Honcho 세부 설정](#honcho-semantic-memory) 참고 | Honcho 의미 기반 메모리의 연결 설정입니다. |
| `agents` | 에이전트 ID → `model`, 선택적 `effort`, `thinking`, `memory` | 프리셋에 따라 결정 | 선택한 프리셋 위에 적용할 에이전트별 설정입니다. `effort`는 `none`, `low`, `medium`, `high`, `xhigh`, `memory`는 `user`, `project`, `local`을 허용합니다. |
| `models` | 모델 식별자 → CLI 매핑 | 지정 없음 | 지원하는 벤더 CLI에서 사용할 모델을 직접 정의합니다. |
| `custom_presets` | 프리셋 → `description`, 선택적 `extends`, `agent_defaults` | 지정 없음 | 사용자 정의 프리셋입니다. `extends`로 기본 제공 프리셋을 상속할 수 있습니다. |
| `vendors` | YAML: 선택한 벤더 ID의 `string[]`; CUE 템플릿: 선택적 `vendors.pi` 대체 설정 맵 | YAML 목록에서는 연동 가능한 모든 벤더 | YAML에서 `oma install`과 `oma update`가 어떤 벤더의 연동 파일을 생성할지 선택합니다. 벤더별 실행 방식은 관리되는 오케스트레이션 설정에 있습니다. [벤더 선택 및 디스패치 메타데이터](#vendor-selection-and-dispatch-metadata)를 참고하세요. |
| `default_cli` | 문자열 | 사용하는 기능의 대체값 | 사용할 모델을 결정하지 못했을 때 벤더만 선택하는 기존 대체 설정입니다. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | 생략한 항목은 제한 없음 | 다음 에이전트를 실행하기 전에 확인하는 토큰 수와 실행 횟수의 상한입니다. [세션 사용량 상한](#session-quota-caps)을 참고하세요. |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | `oma docs verify`의 동작과 검사 제외 항목입니다. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena MCP의 전송 방식과 업데이트 동작입니다. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` 또는 `[]` | 지정하지 않으면 기존 설정 유지 | 연동 설정을 갱신할 때 사용할 브라우저 DevTools MCP를 선택합니다. 명시적인 빈 목록은 브라우저 항목을 제거합니다. |
| `video` | 필요한 값만 지정하는 스킬 설정 맵 | 스킬 기본값; [영상 생성](/docs/guide/video-generation) 참고 | 영상 생성 경로, 제공자 순서, 출력, 비용, 제한, HyperFrames 갱신 설정입니다. |
| `image` | 필요한 값만 지정하는 스킬 설정 맵 | 스킬 기본값; [이미지 생성](/docs/guide/image-generation) 참고 | 이미지 벤더, 크기, 품질, 출력, 비교, 비용 설정입니다. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) 참고 | Voicebox 프로필, 출력, 길이 설정입니다. |
| `hwp` | `format`, `version.*`, `output.*` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#extract-hwp-family-documents) 참고 | Kordoc 형식, 버전 채널, 출력 위치입니다. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#extract-pdf-content) 참고 | PDF 추출, OCR, 이미지, 덮어쓰기 설정입니다. |
| `scholar` | `base_url` | 스킬 기본값; [콘텐츠 및 리서치 워크플로우](/docs/guide/content-and-research#search-and-validate-scholarly-material) 참고 | Knows 연결 주소의 호스트입니다. 프로토콜 구조는 스킬에서 정합니다. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | 스킬 기본값; [다이어그램 엔진](/docs/guide/diagram-engine) 참고 | Mermaid/archify 선택과 관리되는 엔진의 설정입니다. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | 스킬 기본값; [시장 조사](/docs/guide/market-research) 참고 | 관리되는 last30days 엔진을 찾는 방법과 결과 저장 위치입니다. |

배포 템플릿에는 개별 기능이 해석하는 설정 블록도 있습니다. 현재 키와 기본값은 다음과 같습니다.

| 블록 | 담당 기능이 읽는 키 | 기본값 | 효과 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | 세션 100개 유지; 50일보다 오래된 Serena 산출물 정리; `0`이면 경과 일수에 따른 정리 비활성화 | `oma memory gc`의 기본값입니다. 명령 옵션이 이 값보다 우선합니다. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | 예약된 Serena 언어 서버 정리를 제어합니다. `oma serena reap`을 직접 실행하는 경우와 별개이며, 예약된 조용한 실행은 명시적으로 켜야 동작합니다. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | 종료 훅에서 코드 줄 수를 제한하는 검사를 켜고 파일별 상한을 설정합니다. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | 배포 템플릿은 Conventional Commits와 PR 보호를 켜고 템플릿의 공동 작성자·파일명 목록을 사용 | SCM 스킬, 커밋 훅, 비밀정보 패턴 검사를 제어합니다. 공동 작성자 표시를 켜기 전에 템플릿의 신원 정보를 자신의 값으로 바꿉니다. |

이 블록은 설정 파서가 그대로 전달하고 해당 기능이나 워크플로우가 해석합니다. 이전 템플릿의 주석에 camelCase가 쓰였더라도 `serena_reaper` 파서는 위에 나온 snake_case 키를 읽습니다. 중첩 키를 추가하기 전에 해당 기능의 가이드를 확인합니다. 이 페이지는 확인된 구현에서 읽는 키만 다룹니다.

## 중첩 객체의 키와 기본값 {#exact-nested-objects}

### Honcho 의미 기반 메모리 {#honcho-semantic-memory}

`honcho` 맵은 `HonchoConfigSchema`로 검증됩니다. 키 이름과 실제 실행 동작은 다음과 같습니다.

| 키 | 형태 | 실제 기본값 또는 제약 |
| --- | --- | --- |
| `base_url` | URL 문자열 | `https://api.honcho.dev`; 루프백 HTTP를 제외하면 HTTPS가 필요합니다. 인증정보, 쿼리 문자열, 프래그먼트는 허용하지 않습니다. |
| `workspace_id` | 영문자, 숫자, `_`, `-`로 이루어진 1~128자 | 제공자가 시작될 때 필수입니다. 저장된 값이 없으면 대화형 설치 프로그램이 초기값으로 `oma`를 넣습니다. |
| `project_id` | 앞뒤 공백을 제거한 1~128자 문자열 | 생략하면 현재 OMA 프로젝트 루트를 사용합니다. |
| `api_key_env` | 환경 변수 이름 | `HONCHO_API_KEY`. 루프백이 아닌 주소에는 이 변수 또는 `api_key_vault`가 필요합니다. |
| `api_key_vault` | 비밀정보 저장소의 키 이름(`A-Z`, `a-z`, 숫자, `.`, `_`, `-`; 1~64자) | 생략하면 저장소에서 찾지 않습니다. 환경 변수와 저장소를 모두 지정하면 환경 변수의 값을 먼저 사용합니다. |
| `timeout_ms` | 정수 `100`~`30000` | `5000`밀리초입니다. 상태 확인이나 메모리 요청에 같은 제한 시간을 적용합니다. |
| `max_results` | 정수 `1`~`50` | 메모리 조회 결과 8개입니다. |
| `max_tokens` | 정수 `128`~`16000` | 조회한 내용과 추론한 맥락에 사용할 UTF-8 바이트 2,000개입니다. |
| `recall_mode` | `messages` 또는 `hybrid` | 새로 선택하면 설치 프로그램이 `messages`를 기록합니다. 값을 생략하면 제공자의 맥락 표현 요청과 메시지 조회를 모두 활성화합니다. |

원격 워크스페이스에서도 비밀정보를 YAML에 직접 넣지 않고 저장소의 키 이름을 지정할 수 있습니다.

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

저장된 URL 없이 Honcho를 설정할 때 설치 프로그램은 대화형·비대화형 모드 모두 초기 URL로 `http://127.0.0.1:8000`을 사용합니다. 이 설치 초기값은 위에 설명한 제공자의 실행 시 기본값과 다릅니다. 제공자를 선택한 뒤 `oma memory status`로 확인합니다. 워크스페이스나 인증정보가 없으면 다른 메모리 제공자로 전환하지 않고 사용할 수 없는 상태로 보고합니다.

### 세션 사용량 상한 {#session-quota-caps}

`session.quota_cap`에는 필요한 항목만 지정할 수 있습니다. 모든 필드는 선택 사항이며, 생략하면 해당 항목은 제한하지 않습니다. 값은 0 이상의 정수여야 합니다. `per_vendor`에는 벤더 이름별 토큰 예산을 지정합니다.

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

상한은 사용자 CUE 설정, 사용자 YAML 설정, 배포된 기본 설정 순으로 확인합니다. 에이전트를 실행하기 전에 OMA는 `spawn_count`, 전체 `tokens`, `per_vendor`를 이 순서로 검사합니다. 사용량이 설정값 이상이면 다음 실행을 막고 처음으로 상한에 도달한 항목을 보고합니다. 이 사용량은 청구 금액의 추정치가 아니라 기록된 토큰 수입니다.

### 벤더 선택 및 디스패치 메타데이터 {#vendor-selection-and-dispatch-metadata}

사용자 소유의 `.agents/oma-config.yaml`에서 `vendors`는 연동할 벤더 ID의 목록입니다.

```yaml
vendors:
  - claude
  - codex
  - pi
```

목록이 없거나 비어 있으면 OMA에 등록된 연동 가능한 벤더를 모두 선택합니다. 이 목록은 설치와 업데이트 시 생성할 연동 파일을 정합니다. 벤더별 명령 실행 방법을 정의하는 설정은 별도로 관리합니다.

배포된 `.agents/oma-config.cue` 스키마는 `command`, `prompt_flag`, `model_flag`, `default_model`, `thinking_flag` 필드가 있는 `vendors.pi` 객체도 허용합니다. 이 블록은 CUE 템플릿에 타입이 정의된 대체 설정입니다. 현재 에이전트 실행 코드는 아래의 관리되는 오케스트레이션 설정에서 벤더별 실행 방식을 읽으므로, `vendors.pi`를 YAML의 벤더 선택 목록 대신 사용하지 않습니다.

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

이 관리 파일은 OMA 업데이트가 다시 생성합니다. 사용할 모델을 바꾸려면 사용자 소유의 `agents`, `models`, `custom_presets` 키를 편집합니다. 벤더별 실행 설정은 관리되는 오케스트레이션 데이터를 유지하거나 벤더 어댑터를 디버깅할 때만 확인합니다. 이전 템플릿에서 주석 처리된 `vendors.pi` 객체는 대체 설정을 설명하는 메타데이터이며, 벤더 선택 목록이나 관리되는 실행 설정을 대신하지 않습니다.

## 자주 변경하는 설정 {#common-changes}

프로젝트에는 고정 프리셋을 선택하고 개인 설정은 로컬 파일에 둡니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

코드 분석과 메모리에 사용할 도구를 명시적으로 선택합니다.

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

업데이트 중 브라우저 설정을 유지하려면 관련 키를 생략하고, 제거하려면 빈 목록을 지정합니다.

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## 업데이트와 파일 소유권 규칙 {#update-and-ownership-rules}

`.agents/oma-config.yaml`은 사용자 소유입니다. `oma update`는 기존 내용을 보존하며, 새로 배포된 최상위 템플릿 키를 `# Added by oma update` 표시 아래에 덧붙일 수 있습니다. `oma update --force`는 사용자 설정, MCP 설정, 스택 디렉토리를 교체할 수 있으므로 해당 설정을 초기화하려는 경우에만 사용합니다. 로컬 설정 파일에는 계속 컴퓨터별 비공개 값을 둘 수 있습니다.

API 키를 이 파일에 직접 넣지 않습니다. `api_key_env` 또는 `api_key_vault`에는 참조할 이름을 지정하고, 실제 인증정보는 해당 비밀정보 저장소나 환경 변수에 둡니다.

모델 선택의 세부 규칙은 [에이전트별 모델 설정](/docs/guide/per-agent-models)을, 설정 계층과 오류 처리 규칙은 [oma-config 동작 규칙](/docs/guide/oma-config-semantics)을 참고하세요.
