---
title: 중요한 기본값
description: 라우팅, 모델 선택, 프로바이더, 업데이트, 텔레메트리, 브라우저 MCP, Serena 전송, 워크플로우 복구에 영향을 주는 oh-my-agent의 기본값을 설명합니다.
---

# 중요한 기본값

첫 프로젝트를 바로 사용할 수 있도록 기본값을 정하고, 사용자가 소유한 설정은 안정적으로 유지합니다. 기본값은 런타임에 해석되므로 키를 생략했을 때와 빈 값을 명시했을 때의 동작이 다를 수 있습니다. OMA는 작동하지만 예상과 다르게 동작할 때 이 페이지부터 확인하세요.

## 첫 실행에 영향을 주는 기본값

| 영역 | 기본값 | 결과 | 오버라이드 |
|---|---|---|---|
| 응답 언어 | `en` | 프로젝트 설정이 다른 지원 언어를 선택하지 않으면 에이전트와 워크플로우가 영어로 응답합니다. 호스트나 워크플로우가 지원하는 경우 사용자의 명시적인 언어 지시나 세션 언어가 프로젝트 기본값을 덮어쓸 수 있습니다. | `.agents/oma-config.yaml` 또는 `.cue`의 `language` |
| 모델 라우팅 | `auto` | 현재 런타임의 네이티브 에이전트 설정을 사용합니다. 알 수 없는 런타임은 `default_cli`가 설정된 경우 그 값으로 폴백합니다. | `model_preset`, `default_cli`, `agents.<id>` |
| 코드 인텔리전스 | `serena` | 새로 설치하면 Serena 설치를 시도하고 MCP 설정을 연결합니다. | `providers.code_intelligence: gortex` 또는 `serena` |
| 코드 검색 가드 | `block` | 코드 인텔리전스 프로바이더가 설정된 동안에는 PreToolUse 훅이 네이티브 `Grep`/`Glob`과 재귀 셸 검색(`rg`, `grep -r`, `find -name`)을 거부하고, 에이전트가 프로바이더의 도구를 쓰도록 안내합니다. 확인된 제외 대상 안에서만 이루어지는 검색과 프로젝트 밖 경로의 검색은 허용됩니다. 훅은 프로젝트 소스용 우회 방법을 안내하지 않습니다. | `providers.code_intelligence_guard: off` |
| 시맨틱 메모리 | `agentmemory` | 사용 가능한 경우 Agent Memory를 시맨틱 메모리로 선택합니다. | `providers.semantic_memory: honcho` 또는 `none` |
| 웹 검색 | `native` | 별도 프로바이더를 선택하지 않으면 런타임의 네이티브 웹 채널을 사용합니다. | `providers.web` |
| 문서 프로바이더 | `context7` | 스킬이 요청하면 Context7 프로바이더로 문서를 조회합니다. | `providers.docs` |
| 텔레메트리 | 비활성화 | 링크할 때 OMA가 벤더 옵트아웃 설정을 작성합니다. | `telemetry: true` |
| CLI 자동 업데이트 | 활성화 | 비활성화하지 않으면 CLI가 업데이트를 확인합니다. | `auto_update_cli: false` |
| 날짜 형식 | `ISO` | 프로젝트가 형식을 설정하지 않으면 ISO 형식으로 날짜를 표시합니다. | `date_format: US` 또는 `EU` |
| 시간대 | 시스템 시간대 | `timezone`을 생략하면 예약 및 보고 시간이 호스트 시간대를 따릅니다. | `timezone: Australia/Sydney` 또는 다른 IANA 이름 |
| Serena 전송 | `bridge` | 세션이 프로젝트별 Serena 서버 하나를 공유하며, 브리지를 사용할 수 없으면 세션별 stdio로 폴백합니다. | `serena.mode: stdio` |
| Serena 자동 업데이트 | 활성화 | 가능한 경우 `oma update`가 로컬 Serena 도구를 업그레이드합니다. | `serena.auto_update: false` |
| 브라우저 DevTools MCP | 설정되지 않음 | 기존 브라우저 항목을 유지하며, 새 대화형 설치에서는 `aside`를 제안합니다. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]`, 또는 `[]` |
| Serena Reaper | 예약 경로 비활성화 | `serena_reaper.enabled: false`이면 주기적인 정리가 비활성화됩니다. 대화형 `oma serena reap`은 계속 실행됩니다. | `serena_reaper.enabled: true`와 `oma serena reaper enable` |

프로바이더 이름과 기본값은 런타임 로더와 설치 프로그램 프롬프트에서 가져옵니다. 설치 프로그램이 생성하는 설정 파일에는 사용 가능한 섹션의 주석이 포함되어 있으므로 해당 주석을 버전에 맞는 스키마 안내로 사용하세요.

## 설정 우선순위

OMA는 현재 작업 디렉토리에서 위로 올라가며 가장 가까운 `.agents/` 디렉토리를 찾습니다. `oma-config.cue`가 있으면 읽고, 공유 CUE 평가에 실패할 때 `oma-config.yaml`로 폴백합니다. 프로젝트 로컬 오버레이인 `oma-config.local.cue` 또는 `oma-config.local.yaml`은 그 위에 병합됩니다. 로컬 오버레이는 하나만 유지하세요. `OMA_MODEL_PRESET`은 프로세스의 `model_preset`을 덮어쓸 수 있습니다. 로컬 설정이 잘못되면 다른 값을 조용히 선택하지 않고 로딩이 중단됩니다.

고정 프리셋 순서를 적용하기 전에 모델 라우팅에는 두 가지 예외가 있습니다.

- `model_preset: auto`이면 현재 런타임의 네이티브 에이전트/모델 설정을 사용합니다. 명시적인 `agents.<id>` 오버라이드는 여전히 우선하며, 알 수 없는 런타임은 `default_cli`를 사용할 수 있습니다.
- `model_preset: free`이면 자식 스폰이 로컬 FreeLLMAPI 게이트웨이를 사용합니다. `free.model`은 게이트웨이 모델을 선택하고 에이전트별 모델 고정을 대체합니다. 생략하면 `FREELLM_MODEL` 또는 프로바이더 폴백 `auto`를 사용합니다.

고정 또는 사용자 정의 프리셋에서 실제 순서는 다음과 같습니다.

1. `agents.<id>`의 명시적 오버라이드
2. 일치하는 `model_preset` 항목, 빌트인 또는 `custom_presets`
3. 역할에 항목이 없을 때 프리셋의 `orchestrator` 항목
4. 앞선 단계에서 계획이 해석되지 않을 때 벤더 폴백으로 사용하는 `default_cli`

`free` 프리셋은 세 프로바이더 설정 모두에 기본값을 제공합니다. `base_url`은 `http://127.0.0.1:31415/v1`, `api_key_env`는 `FREELLM_API_KEY`이며 호환성 별칭으로 `FREELLMAPI_API_KEY`도 허용되고, `model`은 `auto`입니다. 선택한 환경 변수에 사용할 수 있는 API 키가 여전히 필요하며 벤더 폴백은 없습니다. 시스템별로 남겨야 하는 값은 `oma-config.local.yaml`에 설정하거나 프로세스 수준 오버라이드에 `FREELLM_BASE_URL`과 `FREELLM_MODEL`을 사용하세요.

## 예상과 다르게 작동할 수 있는 기본값

`mcp.devtools_browsers` 키를 생략하면 현재 브라우저 항목을 그대로 둡니다. 빈 목록을 명시하면 조정할 때 브라우저 항목을 제거합니다. 브라우저 MCP 프로세스는 에이전트 세션마다 실행되므로 브라우저를 조작하는 태스크에서만 활성화하세요.

기본 Serena `bridge` 모드는 여러 에이전트가 한 프로젝트에서 작업할 때 중복 언어 서버 프로세스를 줄입니다. 로컬 브리지를 시작할 수 없거나 프로세스를 엄격히 격리해야 하면 `stdio`를 복구 선택으로 사용합니다. Serena는 다음 도구 호출 때 언어 서버 자식을 자체 복구하며, 메모리 reaper는 별도 기능이므로 일반 사용에 활성화할 필요가 없습니다.

기본 텔레메트리 설정은 옵트아웃입니다. `telemetry: true`로 설정하면 다음 링크/업데이트에서 OMA의 벤더 옵트아웃 항목을 제거하여 텔레메트리에 의존하는 벤더 기능을 다시 활성화할 수 있습니다. 이 설정은 벤더 통합 변경을 제어하며, OMA가 자체 회계를 위해 작성하는 세션 비용 파일에는 영향을 주지 않습니다.

## 복구 경로

| 증상 | 먼저 확인할 것 | 복구 |
|---|---|---|
| 벤더 파일이 오래됨 | `oma doctor`와 `oma link --dry-run` | `.agents/`를 원본으로 유지하면서 `oma link <vendor>`를 실행합니다. |
| 모델이 허용되지 않음 | `oma doctor --profile` | `auto`로 전환하거나 빌트인 프리셋을 사용하거나 `models:` 아래에 모델 슬러그를 정의합니다. |
| Serena 도구가 시간 초과됨 | `oma doctor`와 프로바이더 섹션 | `serena.mode: stdio`를 시도합니다. 메모리 압력이 원인이면 `oma serena reap --dry-run`으로 미리 확인합니다. |
| 지속 워크플로우가 멈추지 않음 | `.agents/state/*-state.json` | `workflow done`이라고 말하고, 워크플로우가 정리되지 않은 경우에만 상태 파일을 확인합니다. |
| 예약된 reaper가 아무 일도 하지 않음 | `oma doctor`의 Serena Reaper 섹션 | `serena_reaper.enabled: true`로 설정한 다음 `oma serena reaper enable`을 실행합니다. |
| 로컬 설정으로 시작이 깨짐 | `oma doctor`의 오류 경로 | 로컬 오버레이를 고치거나 제거합니다. `.cue`와 `.yaml` 오버레이를 둘 다 만들지 마세요. |

[설치](./installation.md), [에이전트별 모델](../guide/per-agent-models.md), [OMA 설정 의미](../guide/oma-config-semantics.md)로 이어서 읽을 수 있습니다.
