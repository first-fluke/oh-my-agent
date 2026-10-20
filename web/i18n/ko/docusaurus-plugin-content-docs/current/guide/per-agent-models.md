---
title: "가이드: 에이전트별 모델 설정"
sidebar_label: 에이전트별 모델
description: oma-config.yaml의 model_preset으로 각 에이전트가 사용할 AI 모델을 설정합니다. 빌트인 프리셋과 역할별 모델, 모델과 CLI 해석 표, 에이전트별 오버라이드, 인라인 모델 정의, extends 기반 커스텀 프리셋, oma doctor --profile, 쿼터 상한, pi/OpenCode/Kimi 전송 방식을 다룹니다.
---

# 가이드: 에이전트별 모델 설정

## 개요

새 설치에서 `model_preset: auto`가 기본값입니다. 설정하지 않은 에이전트는 현재 벤더의 네이티브 에이전트 정의와 모델 설정을 사용합니다. 모델을 고정하려면 고정 프리셋을 선택하고, 다른 모델이나 벤더가 필요하면 개별 에이전트를 오버라이드하세요. 재설치와 업데이트에서는 기존의 명시적 프리셋을 보존합니다.

공유 설정은 `.agents/oma-config.yaml`에 있고, `.agents/oma-config.cue`가 있으면 그 키가 같은 YAML 키를 오버라이드합니다. Git에서 제외되는 선택적 local 파일은 현재 컴퓨터의 설정을 오버라이드합니다.

전체 최상위 키와 우선순위는 [설정 레퍼런스](/docs/guide/configuration-reference)를 참고하세요.

설정 항목:

1. 빌트인 프리셋과 각 역할이 받는 모델
2. OMA가 에이전트의 모델과 CLI를 해석하는 방식
3. 로컬 설정과 FreeLLMAPI(`free`) 프리셋
4. `agents:` 맵으로 개별 에이전트 오버라이드하기
5. `models:`로 커스텀 모델 슬러그 인라인 등록하기
6. `custom_presets:`와 `extends:`로 커스텀 프리셋 정의하기
7. `oma doctor --profile`로 해석된 설정 확인하기
8. 레거시 `agent_cli_mapping`에서 마이그레이션하기, 세션 쿼터 상한
9. pi, OpenCode, Kimi Code CLI를 통한 디스패치

---

## 빌트인 프리셋 {#built-in-presets}

`model_preset`을 빌트인 키 중 하나로 설정합니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| 키 | 설명 | 적합한 사용자 |
|:----|:-----------|:---------|
| `auto` | 현재 런타임의 에이전트/모델 설정을 따르며 모델 또는 effort 플래그를 주입하지 않습니다. | 새 설치의 기본값 |
| `free` | OMA가 스폰한 Codex, Claude 또는 Qwen 프로세스를 위한 특수 게이트웨이 모드이며, 빌트인 프리셋 레지스트리와 별도로 해석됩니다. | 로컬 FreeLLMAPI 게이트웨이 |
| `antigravity` | 모든 에이전트가 Antigravity CLI(`agy`)를 사용합니다. 구현, 아키텍처, QA는 Gemini 3.1 Pro, 오케스트레이션, PM, 문서화, explore는 Gemini 3.6 Flash를 사용합니다. agy 1.1 이상에서는 OMA가 `agy models`의 표시 ID(예: `--model "Gemini 3.1 Pro (High)"`)를 전달하고 `effort`를 모델이 공개하는 tier로 매핑합니다. agy 1.0에는 `--model`이 없으므로 agy 자체 설정이 결정합니다. agy에는 `--thinking-budget`이 없습니다. | Antigravity CLI 사용자 |
| `claude` | 모든 에이전트가 Claude를 사용합니다. architecture는 Opus, explore는 Haiku, 그 외 모든 역할은 Sonnet | Claude Max 구독자 |
| `codex` | 모든 에이전트가 OpenAI Codex(GPT-5.5가 대부분의 역할, GPT-5.4-mini가 explore에 사용)를 effort 레벨과 함께 사용합니다. | ChatGPT Plus/Pro 사용자 |
| `qwen` | 모든 에이전트가 Qwen Code를 사용합니다. 벤더가 일치하는 Qwen 세션은 생성된 네이티브 에이전트를 사용할 수 있고, 다른 런타임은 CLI 디스패치를 사용합니다. | 로컬 또는 자체 호스팅 추론 |
| `kiro` | 모든 에이전트가 Kiro CLI를 사용합니다. Sonnet은 구현/아키텍처를, Haiku는 오케스트레이션/explore를 담당합니다. | Kiro 사용자 |
| `cursor` | 모든 에이전트가 Cursor `composer-2.5` 사용 (orchestrator/qa/pm/docs/explore은 `composer-2.5-fast`) | Cursor Pro / Pro Student 사용자 |
| `mixed` | orchestrator, architecture(Opus), qa, pm, docs는 Claude, 구현 역할은 Codex GPT-5.5, explore는 GPT-5.4-mini | 에이전트별 설정 부담 없이 벤더별 강점을 활용하고 싶을 때 |

빌트인 프리셋은 CLI 패키지에 포함되어 제공되며, `oh-my-agent`을 업그레이드하면 자동으로 갱신됩니다. `gemini`는 `antigravity`로 리디렉션되는 호환성 alias이며 현재 별도의 프리셋이 아닙니다. 로컬 프리셋 파일은 필요하지 않습니다.

### 역할별 모델 {#models-per-role}

고정 프리셋은 다음 registry 슬러그를 할당합니다. 소유자 접두사는 생략했습니다. 앞의 여섯 열은 각각 `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/`, `cursor/`이고, `mixed`에서는 Claude 모델이 `anthropic/`, GPT 모델이 `openai/`입니다. 기준 소스는 `cli/platform/built-in-presets.ts`입니다.

| 역할 | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

괄호 안의 값은 프리셋의 `effort`(Codex) 또는 `thinking: true`(Qwen)입니다. `eval`처럼 프리셋에 나열되지 않은 역할은 해당 프리셋의 `orchestrator` 항목을 사용합니다.

---

## OMA가 에이전트의 모델과 CLI를 해석하는 방식 {#how-oma-resolves-an-agents-model-and-cli}

`OMA_MODEL_PRESET`이 설정되어 있으면 가장 먼저 `model_preset`을 대체합니다([설정 로딩](/docs/guide/oma-config-semantics#precedence-table) 참고). 그런 다음 해석기가 다음 중 한 행을 고릅니다.

| `model_preset` | `agents.<id>` 설정 여부 | CLI에 전달되는 모델 | 에이전트를 실행하는 CLI |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | 무시됨 | `FREELLM_MODEL`, 없으면 `free.model`, 없으면 `auto`(모든 역할) | `--vendor`, 없으면 `OMA_RUNTIME_VENDOR`, 없으면 감지된 런타임(Codex, Claude, Qwen인 경우), 없으면 `default_cli`, 없으면 `codex`. `codex`, `claude`, `qwen`만 허용됩니다. |
| `auto` | 아니오 | 없음. 벤더 자체의 에이전트와 세션 설정이 적용됩니다. | `--vendor`, 없으면 지원되는 `OMA_RUNTIME_VENDOR`, 없으면 감지된 런타임, 없으면 `default_cli`, 없으면 `claude`. 지원되지 않는 값은 오류입니다. |
| `auto` | 예 | 오버라이드의 `model` | 해당 모델의 `cli`, 그다음 아래의 벤더 오버라이드 규칙 |
| 빌트인, alias, 커스텀 | 아니오 | 해당 역할의 프리셋 항목, 없으면 프리셋의 `orchestrator` 항목 | 해당 모델의 `cli`, 그다음 아래의 벤더 오버라이드 규칙 |
| 빌트인, alias, 커스텀 | 예 | 프리셋 항목에 오버라이드를 얕게 병합한 값(오버라이드 필드가 우선) | 해당 모델의 `cli`, 그다음 아래의 벤더 오버라이드 규칙 |

나머지 요소는 다음과 같이 맞물립니다.

- **프리셋 조회.** OMA는 빌트인 이름을 먼저 확인하고, 그다음 alias(`gemini`는 경고와 함께 `antigravity`로 리디렉션), 그다음 `custom_presets`를 확인합니다. 빌트인 이름을 가진 커스텀 프리셋은 무시됩니다. 알 수 없는 이름이면 유효한 이름 목록과 함께 `Unknown model_preset "..."`로 중단합니다.
- **모델 조회.** 슬러그는 먼저 `models:`에서, 그다음 빌트인 registry에서 찾습니다. 알 수 없는 슬러그이거나 `api_only: true`인 스펙이면 디스패치를 중단합니다.
- **벤더 오버라이드 규칙.** 모델 기반 행에서 `--vendor` 또는 `OMA_RUNTIME_VENDOR`가 벤더를 지정하면, `pi`는 항상 실행을 넘겨받습니다(실제 프로바이더 모델만 해당. [pi를 통한 디스패치](#dispatching-through-pi-transport-runtime) 참고). 다른 벤더는 모델의 `supports.native_dispatch_from`에 나열된 경우에만 넘겨받습니다. 그렇지 않으면 OMA는 경고하고 모델 자체의 `cli`를 유지합니다.
- **Effort.** CLI에 effort 플래그가 없는 모델(Claude Code)에서는 경고와 함께 `effort`를 버립니다. pi에서는 유지하며, pi가 이를 `--thinking`으로 매핑합니다.

## 자동 디스패치 {#auto-dispatch}

`auto`에서는 가능하면 OMA가 현재 런타임의 네이티브 서브에이전트 경로를 사용합니다. 벤더가 다른 에이전트나 네이티브 디스패치를 지원하지 않는 런타임은 `oma agent spawn`을 사용합니다. `auto`는 고정된 벤더 프리셋으로 확장되지 않습니다. 상속된 계획에는 OMA의 모델 또는 effort 플래그가 주입되지 않습니다. 외부 CLI 프로세스는 해당 CLI에 저장된 기본값을 사용하므로, 상위 세션에서만 선택한 모델과 다를 수 있습니다.

`oma doctor --profile`은 상속된 에이전트에는 `(vendor agent default)`를, 명시적 오버라이드에는 해석된 모델을 표시합니다. 네이티브 에이전트 파일은 벤더 정의를 유지하며, auto 모드의 동일 벤더 오버라이드는 install/update에서 파일을 생성할 때 적용됩니다.

## 로컬 설정 {#local-configuration}

공유 설정 옆에 `.agents/oma-config.local.cue` 또는 `.agents/oma-config.local.yaml` 중 **하나**를 만드세요. install, link, update는 두 경로를 모두 `.gitignore`에 추가하며, update는 `--force`를 사용해도 기존 local 파일을 보존합니다.

OMA는 가장 가까운 프로젝트 설정 디렉토리를 선택합니다. 그 디렉토리 안에서는 공유 CUE에 설정된 키가 공유 YAML의 같은 키를 오버라이드하고, local 파일이 공유 값을 오버라이드합니다. 전체 순서는 [우선순위 표](/docs/guide/oma-config-semantics#precedence-table)에 있습니다. CUE 파일은 병합 전에 독립적으로 평가되므로 공유 `model_preset: "auto"`를 local `"free"`로 바꿀 수 있습니다. 객체는 재귀적으로 병합하고 배열·스칼라·`null`은 공유 값을 대체합니다. 잘못된 local 파일, local CUE에 필요한 CUE 실행 파일의 부재, 또는 두 local 형식의 동시 존재는 shared 기본값을 사용할 수 있는 상태가 아니라 오류입니다.

명령 옵션과 지원되는 환경 오버라이드는 유효한 파일 설정보다 우선합니다. `oma doctor --profile`에서 사용된 파일을 확인할 수 있습니다. local 파일은 Git clone이나 새 worktree에 함께 옮겨지지 않습니다. Free 모드 하위 프로세스는 `OMA_MODEL_PRESET=free`와 해석된 게이트웨이 환경을 상속하므로 중첩된 OMA 스폰에서도 경로가 유지됩니다. 독립적으로 시작한 세션에는 자체 local 설정이나 환경 변수가 필요합니다. install/setup 명령이 저장하는 설정은 여전히 공유 설정을 대상으로 하며, 런타임에서는 local 오버라이드가 계속 우선합니다.

## FreeLLMAPI 프리셋 {#freellmapi-preset}

공유 파일에는 `model_preset: auto`를 유지하고 local에서 활성화하세요.

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

동등한 YAML 파일은 다음과 같습니다.

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

FreeLLMAPI를 별도로 시작하고 통합 키를 `FREELLM_API_KEY`로 export하세요. 기본 키 변수를 선택한 경우 OMA는 upstream의 `FREELLMAPI_API_KEY`도 받으며, 둘 다 설정되어 있으면 표준 변수가 우선합니다. 사용자 지정 `api_key_env`는 해당 변수만 읽습니다. 키 자체는 절대 설정 파일에 넣지 마세요. `OMA_MODEL_PRESET`은 프리셋을 오버라이드합니다. `FREELLM_BASE_URL`과 `FREELLM_MODEL`은 각각 해당 파일 설정을 오버라이드합니다. 예시의 값이 기본값이므로, 서버와 키가 준비되어 있으면 `model_preset: free`만으로 충분합니다.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Free 모드는 기존 `agents.*.model` 고정이 있는 역할을 포함해 OMA가 디스패치하는 모든 역할에 `free.model`을 사용합니다. 그 고정 값을 유료 구독으로 해석하지 않습니다. `auto`, 게이트웨이 모델 ID, 또는 `auto:coding` 같은 이름 있는 게이트웨이 체인을 선택하세요(체인은 FreeLLMAPI에서 먼저 만들어야 합니다).

Transport는 [OMA가 에이전트의 모델과 CLI를 해석하는 방식](#how-oma-resolves-an-agents-model-and-cli)의 `free` 행을 따릅니다. Codex, Claude, Qwen transport만 지원됩니다. 명시적으로 선택한 미지원 transport는 오류입니다.

| Transport | Gateway endpoint | CLI base URL |
|:--|:--|:--|
| Codex | `/v1/responses` | `/v1` 포함 |
| Claude | `/v1/messages` | 서버 루트. OMA가 `/v1` 접미사를 제거 |
| Qwen | `/v1/chat/completions` | `/v1` 포함 |

상위 세션이 같은 벤더를 사용하더라도 `oma agent spawn`을 사용하세요. OMA는 게이트웨이 연결과 자격 증명을 해당 하위 프로세스에만 주입합니다. 프리셋을 바꿔도 이미 열려 있는 호스트 세션이나 호스트 네이티브 서브에이전트 도구의 모델은 바뀌지 않습니다. Codex에는 호출 인자를 통해 커스텀 Responses 프로바이더를 전달하고, 키는 하위 프로세스 환경에 둡니다. Claude와 Qwen에는 호환 엔드포인트 설정을 전달합니다. 경로나 키를 덮어쓰게 되는 충돌하는 Claude/Qwen 설정은 실행 전에 보고하며, OMA는 해당 파일을 다시 쓰지 않습니다.

스폰과 리뷰는 에이전트를 시작하기 전에 인증된 `GET /v1/models`를 확인합니다. 키 누락, 연결 실패, HTTP 인증 오류가 있으면 실행을 중단합니다. `oma doctor --profile`은 키를 출력하지 않고 유효한 URL/모델, 환경 오버라이드, 키 존재 여부, 서버 준비 상태를 보여 줍니다. 준비 상태가 모델에 태스크를 완료할 만큼의 쿼터가 있음을 보장하지는 않습니다.

FreeLLMAPI가 요청 수준의 프로바이더 페일오버를 담당합니다. OMA의 명시적인 체크포인트 기반 벤더 페일오버는 별개의 프로세스 복구 메커니즘이며, free 모드에서는 모든 후속 벤더도 지원되는 FreeLLMAPI transport를 사용해야 합니다. 유료 벤더 설정으로 자동 복귀하지 않습니다.

free 프리셋은 에이전트 추론을 설정합니다. 기존 메모리 서비스의 임베딩 설정은 바꾸지 않습니다. FreeLLMAPI는 `/v1/embeddings`도 제공하므로, 벡터 저장소를 별도로 설정할 때는 모델 계열을 고정해 기존 벡터가 호환되는 공간을 유지하게 하세요.

Upstream 참고 자료: [클라이언트 설정](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API와 임베딩 계열](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## 개별 에이전트 오버라이드 {#overriding-individual-agents}

`agents:` 맵을 사용해 활성 프리셋 위에 특정 에이전트만 오버라이드합니다. 나열한 에이전트만 영향을 받고, 나머지는 auto 모드에서는 벤더 설정을, 고정 프리셋을 선택했다면 그 프리셋 기본값을 따릅니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

각 항목은 `AgentSpec` 객체입니다.

| 필드 | 타입 | 필수 여부 | 설명 |
|:------|:-----|:---------|:-----------|
| `model` | string | 필수 | 모델 슬러그 (빌트인 또는 사용자 정의) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | 선택 | 추론 effort (지원하지 않는 모델에서는 무시됨) |
| `thinking` | boolean | 선택 | 확장 thinking 활성화 (모델별 동작) |
| `memory` | `user` \| `project` \| `local` | 선택 | 에이전트의 메모리 스코프 |

유효한 에이전트 ID: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`, `eval`. 빌트인 프리셋은 `eval`을 정의하지 않으므로, 오버라이드하지 않으면 프리셋의 `orchestrator` 항목을 사용합니다.

병합은 얕게 이루어집니다. 오버라이드에 정의한 각 필드가 해당 필드의 프리셋 값을 대체하며, 생략한 필드는 프리셋 값을 그대로 유지합니다.

---

## 모델 슬러그 인라인 등록 {#inlining-model-slugs}

빌트인 레지스트리에 아직 없는 모델 슬러그는 `models:` 아래에 등록합니다. 등록한 슬러그는 `agents:`나 `custom_presets:`에서 참조할 수 있습니다.

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

`agents:`에서 참조하는 등록 슬러그에는 두 가지 규칙이 적용됩니다.

1. **키는 `owner/model` 형식이어야 합니다.** `agents.<id>.model`이 `owner/model`
   패턴으로 검증하므로 `my-fast-model` 같은 단순 키는 거부됩니다.
   `antigravity/gemini-3.1-pro-low`처럼 슬래시가 들어간 키(또는 벤더 자체의
   `provider/model` 슬러그)를 쓰세요.
2. **스펙은 완전하고 유효해야 합니다.** 해석 시점에 `cli`, `cli_model`, `auth_hint`, 그리고 모든
   `supports` 필드가 필요합니다. `cli`는 `antigravity`, `claude`, `codex`, `commandcode`,
   `cursor`, `grok`, `kimi`, `kiro`, `qwen`, `opencode` 중 하나여야 하고,
   `native_dispatch_from` 항목은 `antigravity`, `claude`, `codex`, `cursor`, `kimi`,
   `kiro`, `opencode`, `qwen` 중 하나여야 합니다. `gemini`는 어느 쪽에도 유효한 값이
   아닙니다. 유효하지 않은 스펙은
   `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`를
   기록하며, 코어 레지스트리에 해당 슬러그가 없으면 알 수 없는 슬러그 오류로 디스패치를 중단합니다.

> 사용자 정의 슬러그가 빌트인 슬러그와 충돌하면 사용자 정의가 우선 적용되며 경고가 출력됩니다.

---

## 커스텀 프리셋 {#custom-presets}

`custom_presets:`에 추가 프리셋을 정의할 수 있습니다. `extends:`를 사용하면 빌트인 프리셋의 모든 에이전트 기본값을 상속하고 필요한 에이전트만 오버라이드할 수 있습니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

`extends:`가 없으면 최소한 `orchestrator`를 정의하세요. 프리셋이 생략한 모든 역할은 `orchestrator` 항목을 사용합니다. `extends:`를 사용하면 명시한 항목만 오버라이드되고 나머지는 베이스 프리셋에서 상속됩니다. `extends`에는 빌트인 프리셋이나 다른 커스텀 프리셋을 지정할 수 있으며, 순환 체인은 오류입니다. 빌트인과 같은 이름(예: `claude`)의 커스텀 프리셋은 무시되고 빌트인이 우선합니다.

---

## `oma doctor --profile`

`oma doctor --profile`을 실행하면 프리셋 기본값, `custom_presets`, `agents:` 오버라이드가 모두 병합된 후의 최종 모델 매트릭스를 확인할 수 있습니다.

```bash
oma doctor --profile
```

**출력 예시** (축약본: `backend` 오버라이드가 있는 `model_preset: mixed`. 실제 실행에서는 13개 역할이 모두 나열되며, 터미널은 각 섹션을 프레임 안에 그립니다):

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

각 행은 역할, 해석된 모델 슬러그, 실행하는 CLI, 인증 상태를 보여줍니다. 역할 셀에는 출처 태그가 붙습니다. `(preset)`, `(override)`, 또는 `auto`에서 벤더 설정을 상속하는 에이전트의 `(vendor)`입니다. Role 열의 너비는 14자이므로 위 예시처럼 긴 태그는 잘립니다. 서브에이전트가 예상치 못한 벤더를 선택할 때마다 이 명령으로 확인하세요.

---

## 레거시 `agent_cli_mapping`에서 마이그레이션

마이그레이션 008은 `oma install`과 `oma update` 실행 시 자동으로 동작합니다. 레거시 프로젝트를 그 자리에서 변환합니다.

| 레거시 설정 | 마이그레이션 008 적용 후 결과 |
|:-------------|:--------------------------|
| 모든 항목이 동일한 벤더 (예: 전부 `claude`) | `model_preset`이 해당 벤더의 프리셋으로 설정됨(레거시 `gemini`는 `antigravity`로 매핑), `agents:` 없음 |
| 혼합 벤더 | 가장 빈도 높은 벤더가 `model_preset`으로, 나머지는 `agents:` 오버라이드로 |
| `AgentSpec` 객체 값 | `agents:`로 그대로 이동 |
| `models.yaml` 내용 | `oma-config.yaml.models`에 인라인으로 통합 |
| 커스터마이즈된 `defaults.yaml` | `custom_presets.user-customized`로 보존되며 경고 출력 |

변경 전 원본은 `.agents/backup/008-model-preset/<timestamp>-<pid>/`에 백업됩니다(글로벌 설치는 `~/.oma/backup/008-model-preset/...`). 마이그레이션은 멱등적입니다. 이미 `model_preset`이 있으면 건너뜁니다.

<!-- oma-docs:ignore-start -->
마이그레이션이 끝나면 `.agents/config/defaults.yaml`, `.agents/config/models.yaml`, 그리고 `.agents/config/` 디렉토리가 제거됩니다.
<!-- oma-docs:ignore-end -->

---

## 세션 쿼터 상한 {#session-quota-cap}

서브에이전트의 무분별한 스폰을 제한하려면 `oma-config.yaml`에 `session.quota_cap`을 추가합니다.

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

상한에 도달하면 `oma agent spawn`은 다음 스폰을 거부하고 `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)`로 실패합니다. 토큰 사용량은 프롬프트 길이로 추정하므로 `spawn_count`가 가장 예측 가능한 상한입니다. 필드 규칙: [세션 쿼터 상한](/docs/guide/configuration-reference#session-quota-caps).

---

## 전체 예시 {#full-example}

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2000000
    spawn_count: 40
```

`oma doctor --profile`로 해석 결과를 확인한 뒤, 평소처럼 워크플로우를 시작하세요.

---

## pi(전송 런타임)를 통한 디스패치 {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi)(Earendil)는 모델 소유자가 아니라
여러 프로바이더를 중계하는 프록시 런타임입니다. 실제 프로바이더 모델
(Anthropic, OpenAI, Google)을 하나의 CLI에서 모두 돌릴 수 있습니다. oma는 pi를
**전송 오버레이**로 다룹니다. `model_preset`과 `agents:` 오버라이드는 그대로
두고, 특정 에이전트를 실행하는 CLI만 pi로 바뀝니다.

`--vendor pi` 오버라이드로 어떤 에이전트든 pi를 통해 디스패치합니다.

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

이때 일어나는 일은 다음과 같습니다.

- 프리셋과 오버라이드에서 해석된 에이전트별 모델(예: `openai/gpt-5.5`)이 pi의
  `--model <provider/id>` 형식으로 변환되고, `effort`는 pi의 `--thinking`
  수준으로 변환됩니다. **서브에이전트별 모델은 pi에서도 네이티브와 똑같이
  동작합니다.** 에이전트마다 다른 모델을 쓸 수 있습니다.
- pi에는 참조할 벤더 측 에이전트 파일이 없으므로, 에이전트의 페르소나(시스템
  프롬프트)는 `.agents/agents/<id>.md`에서 인라인으로 삽입됩니다.
- 인증은 pi 자체 설정을 그대로 따릅니다(`~/.pi/agent/auth.json` 또는 환경의
  프로바이더 API 키). `oma doctor`는 다른 CLI와 함께 pi의 설치 및 인증 상태를
  보고합니다.

**제약:** pi는 실제 프로바이더 모델만 실행합니다. CLI 전용 프리셋(`cursor`,
`kiro`, `qwen`, `antigravity`)은 각자의 CLI 안에서만 존재하는 모델을 가리키므로,
pi를 통한 디스패치는 명확한 오류와 함께 거부됩니다. 에이전트를 pi로 라우팅할
때는 `claude`, `codex`, `mixed`, 또는 모델이 `anthropic/`, `openai/`, `google/`
슬러그인 `agents.<id>` 오버라이드를 쓰세요. `gemini`는 `antigravity`의 alias이므로
pi가 거부합니다.

> pi의 모델 카탈로그는 릴리스에 묶여 있고 인증으로 게이트됩니다. 해석된 슬러그가
> 설치된 pi가 노출하는 것과 맞지 않으면 `pi --list-models`를 확인하세요. pi의
> `--model` 매칭은 퍼지 방식이라 대부분의 프로바이더 슬러그는 그대로 해석됩니다.

### pi 내장 레지스트리 밖의 모델 (예: Z.ai GLM)

pi는 `--model`을 **내장 모델 레지스트리**와 대조해 해석하며, `defaultProvider`
설정은 모델을 아예 전달하지 않았을 때만 참조합니다. Z.ai의 경우 pi는 GLM id의
일부만 제공하므로(pi 0.80.x 기준 `glm-4.7`, `glm-4.5-air`, `glm-5-turbo`,
`glm-5.1`, `glm-5v-turbo`), 그 밖의 GLM id를 가리키는 프리셋은 해석에
실패합니다.

처리 방법은 두 가지입니다.

1. **레지스트리 id 사용**: 프리셋을 레지스트리 모델 id로 제한합니다.
   `provider/id` 형식(예: `zai/glm-4.7`)을 쓰면 프로바이더를 명시적으로 고정할
   수 있고, oma는 이를 pi의 `--model`로 그대로 전달합니다.
2. **미등록 id 등록**: pi 확장으로 직접 등록합니다. `api` 필드에는 pi의 **api
   어댑터 id**(`openai-completions`, `anthropic-messages` 등)를 적어야 하며,
   프로바이더 이름이 아닙니다. `"zai"` 같은 프로바이더 이름이나 `"openai"` 같은
   축약형은 어댑터 id가 아니어서 디스패치 시점에
   `No API provider registered for api: …`로 실패합니다.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

id를 프리셋에 연결하기 전에 `pi --list-models`로 확인하세요.

---

## OpenCode를 통한 디스패치

[OpenCode](https://opencode.ai)는 확장 계열 벤더입니다. pi와 마찬가지로 모델
소유자가 아니라 자체 카탈로그의 모델을 실행하는 CLI입니다. 무료 `opencode`
프로바이더, 저비용 `opencode-go` 구독 플랜, 그리고 `opencode-zen` 게이트웨이가
여기에 포함됩니다. oma는 이를 **인프로세스 플러그인 벤더**로 통합합니다.
opencode는 설정 파일 기반 훅을 등록하는 대신 `.opencode/plugins/oma/`를 자동으로
로드하며, 생성된 `.opencode/agents/<id>.md` 파일에서 각 에이전트의 페르소나를
해석합니다.

### 명시적 디스패치

`--vendor opencode` 오버라이드로 어떤 에이전트든 opencode를 통해 라우팅합니다.

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

이 명령은 `opencode run --agent pm --dir <workspace> "<prompt>"`를 실행합니다.
프롬프트는 **마지막에 오는 위치 인자**입니다. opencode의 `-p` 플래그는
프롬프트가 아니라 `--password`를 의미합니다.

### 에이전트별 OpenCode 모델

특정 에이전트를 opencode 모델로 라우팅하려면, 해당 모델을 `models:` 아래에
등록하고 `agents:`에서 참조합니다. 두 가지 요건이 적용됩니다(자세한 내용은
[모델 슬러그 인라인 등록](#inlining-model-slugs) 참고).

1. **슬러그는 `owner/model` 형식이어야 합니다.** opencode의 `provider/model`
   슬러그를 레지스트리 키로 사용합니다. 단순 이름은 `agents.<id>.model` 스키마에서
   거부됩니다.
2. **스펙은 완전해야 합니다.** `cli`, `cli_model`, `auth_hint`, 그리고 모든
   `supports` 필드가 필요합니다. 불완전한 스펙은 검증에 실패하고, OMA가 경고를
   기록한 뒤 코어 레지스트리로 폴백하므로 해당 에이전트는 opencode로 라우팅되지 않습니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

라우팅된 각 에이전트는 `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`를 디스패치합니다. 이 구성은
가볍고 빠른 역할(pm, qa, docs, explore)에 적합하며, 더 무거운 구현 에이전트는
Codex/Claude 등에 그대로 둘 수 있습니다.

### 모델 슬러그 검증

opencode의 카탈로그는 구독 및 로그인으로 게이트되어 있어, oma는 opencode 모델
슬러그를 하드코딩하지 **않습니다**. 설치된 카탈로그를 기준으로 슬러그를
검증하세요.

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe`는 슬러그가 `opencode models`에 나열되어 있으면 `accepted`,
나열되어 있지 않으면 `rejected`, 프로바이더에 로그인이나 구독이 필요하면
`auth_required`를 보고합니다.

### 인증 및 생성된 파일

- **인증:** `opencode auth login`은 자격 증명을
  `~/.local/share/opencode/auth.json`에 프로바이더별로 하나씩 저장합니다.
  `oma auth status` / `oma doctor`는 프로바이더 중 하나라도 자격 증명이 있으면
  opencode를 인증됨으로 보고합니다. 반면
  `oma doctor --profile`은 프로바이더를 구분합니다. 각 행은 등록된 `cli_model`의
  프로바이더 접두사로 확인하므로 `cli_model: zai-coding-plan/glm-5.3` 모델은
  `zai-coding-plan` 자격 증명으로 확인합니다. 등록된 `provider/model` 형식의
  `cli_model`이 없는 행은 인증 실패로 단정하지 않고 `? unknown`으로 보고합니다.
- **생성된 파일:** `oma link`(또는 `oma link opencode`)는 에이전트마다
  `.opencode/agents/<id>.md` 페르소나 하나와 `.opencode/plugins/oma/` 브릿지를
  작성합니다. 이 파일은 `.agents/` SSOT에서 생성되므로 직접 편집하지 마시고,
  재생성하려면 `oma link`를 다시 실행하세요.

> **지속적 워크플로우 참고:** opencode의 `session.idle` 이벤트(Claude의 `Stop`
> 훅에 가장 가까운 대응물)는 알림 전용이며 세션 종료를 막을 수 없습니다. 따라서
> 지속적 워크플로우(orchestrate / work / ultrawork)는 opencode에서 **저하된 Stop
> 시맨틱**으로 동작합니다. 워크플로우 보강이 세션을 열어 둔 채 이루어지는 대신
> 다음 메시지 시점에 일어납니다.

---

## Kimi Code CLI를 통한 디스패치

[Kimi Code CLI](https://www.kimi.com/code)는 **훅**을 글로벌 설정
(`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`)에서만 읽습니다. 그래서
`oma install`과 `oma link`는 Antigravity와 마찬가지로 명시적 동의를 받은 뒤 Kimi
훅 체인과 스킬 심볼릭 링크를 HOME에 씁니다. Kimi는 oma의 SSOT `.agents/skills/`도
직접 스캔하므로 스킬은 어느 쪽이든 프로젝트 전역에서 해석됩니다. **MCP**는 HOME에
쓸 필요가 없고 프로젝트 범위로 동작하며, 모드에 따라
`<cwd>/.kimi-code/mcp.json`(프로젝트) 또는 `~/.kimi-code/mcp.json`(글로벌)에
기록됩니다.

### 명시적 디스패치

`--vendor kimi` 오버라이드로 어떤 에이전트든 Kimi를 통해 라우팅합니다.

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

이 명령은 `kimi -p "<prompt>"`를 실행합니다. Kimi의 `-p`(비대화형) 모드는 `auto`
권한 정책에서 일반 도구 호출을 자동 승인하므로, oma는 `--yolo`나 `--auto`를 붙이지
**않습니다**(둘은 `-p`와 함께 쓸 수 없습니다).

### 에이전트별 Kimi 모델

opencode와 마찬가지로 oma는 Kimi 모델 카탈로그를 하드코딩하지 **않습니다**(Kimi의
라인업은 프로바이더와 구독에 따라 달라집니다). 특정 에이전트를 Kimi 모델로
라우팅하려면 `models:` 아래에 `cli: kimi`로 완전한 스펙을 등록하고 `agents:`에서
참조합니다.

레지스트리 키는 `owner/model` 형식이어야 하며(단순 이름은 `agents.<id>.model`
스키마에서 거부됩니다), `cli_model`은 `kimi --model`에 그대로 전달되는 별칭입니다.
Kimi가 문서로 안내하는 코딩 별칭은 `kimi-code/kimi-for-coding`입니다. 확정하기
전에 `kimi --model <alias>`로 구독이 노출하는 별칭을 확인하세요.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

라우팅된 각 에이전트는 `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`를
디스패치합니다.

> **지속적 워크플로우 참고:** Kimi가 문서로 안내하는 Stop 차단 경로는 종료 코드 2와
> stderr이지만, `oma hook run` 라우터는 항상 0으로 종료하고 stdout으로 방언을
> 내보냅니다. oma는 최선의 노력으로 `permissionDecision: "deny"`(그리고 Claude
> 스타일의 `decision: "block"`)를 내보내므로, Kimi에서 지속적 워크플로우는 완만하게
> 저하된 형태로 동작합니다.
