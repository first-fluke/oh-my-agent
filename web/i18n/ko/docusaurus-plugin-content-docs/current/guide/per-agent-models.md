---
title: "가이드: 에이전트별 모델 설정"
description: oma-config.yaml의 model_preset으로 각 에이전트가 사용할 AI 모델을 설정합니다. 빌트인 프리셋, 에이전트별 오버라이드, 인라인 모델 정의, extends 기반 커스텀 프리셋, oma doctor --profile, 그리고 레거시 agent_cli_mapping에서 넘어오는 마이그레이션을 다룹니다.
---

# 가이드: 에이전트별 모델 설정

## 개요

`model_preset`은 모든 에이전트가 사용할 모델을 결정하는 단일 개념입니다. 빌트인 프리셋 중 하나를 선택하면 모든 에이전트(pm, backend, frontend, qa 등)가 해당 벤더 스택에 적합한 모델로 자동 연결됩니다. 필요한 경우 개별 에이전트를 오버라이드할 수 있습니다. 팀이 비표준 조합을 사용한다면 추가 프리셋을 정의하면 됩니다.

모든 설정은 `.agents/oma-config.yaml` 단일 파일에 모여 있습니다.

이 페이지에서 다루는 내용:

1. 빌트인 프리셋
2. `agents:` 맵으로 개별 에이전트 오버라이드하기
3. `models:`로 커스텀 모델 슬러그 인라인 등록하기
4. `custom_presets:`와 `extends:`로 커스텀 프리셋 정의하기
5. `oma doctor --profile`로 해석된 설정 확인하기
6. 레거시 `agent_cli_mapping`에서 마이그레이션하기

---

## 빌트인 프리셋

`model_preset`을 빌트인 키 중 하나로 설정합니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| 키 | 설명 | 적합한 사용자 |
|:----|:-----------|:---------|
| `antigravity` | 모든 에이전트가 Antigravity CLI(`agy`)를 사용합니다. 구현/아키텍처 역할은 Gemini 3.1 Pro, 오케스트레이션 및 검색 역할은 Gemini 3.5 Flash를 사용합니다. 모델 선택은 `agy` 내부 설정으로 처리되며, `--model`이나 `--thinking-budget` 플래그는 노출되지 않습니다. | Antigravity CLI 사용자 |
| `claude` | 모든 에이전트가 Claude (Sonnet/Opus) 사용 | Claude Max 구독자 |
| `codex` | 모든 에이전트가 effort 레벨이 적용된 OpenAI Codex (GPT-5.x) 사용 | ChatGPT Plus/Pro 사용자 |
| `gemini` | 모든 에이전트가 Gemini CLI 사용, 구현 역할에는 thinking 활성화 | Google AI Pro 사용자 |
| `qwen` | 모든 에이전트를 Qwen Code로 외부 라우팅. 이진 thinking 방식(effort 레벨 없음) | 로컬 또는 자체 호스팅 추론 |
| `cursor` | 모든 에이전트가 Cursor `composer-2.5` 사용 (orchestrator/qa/pm/docs/explore은 `composer-2.5-fast`) | Cursor Pro / Pro Student 사용자 |
| `mixed` | 혼합 구성: 구현 역할은 Codex, architecture/qa/pm은 Claude, explore은 Gemini | 에이전트별 설정 부담 없이 벤더별 강점을 활용하고 싶을 때 |

빌트인 프리셋은 CLI 패키지에 포함되어 제공되며, `oh-my-agent`을 업그레이드하면 자동으로 갱신됩니다. 별도로 관리할 로컬 파일이 없습니다.

---

## 개별 에이전트 오버라이드

`agents:` 맵을 사용해 활성 프리셋 위에 특정 에이전트만 오버라이드합니다. 나열한 에이전트만 영향을 받고, 나머지는 프리셋 기본값을 그대로 유지합니다.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

각 항목은 `AgentSpec` 객체입니다.

| 필드 | 타입 | 필수 여부 | 설명 |
|:------|:-----|:---------|:-----------|
| `model` | string | 필수 | 모델 슬러그 (빌트인 또는 사용자 정의) |
| `effort` | `low` \| `medium` \| `high` | 선택 | 추론 effort (지원하지 않는 모델에서는 무시됨) |
| `thinking` | boolean | 선택 | 확장 thinking 활성화 (모델별 동작) |
| `memory` | `user` \| `project` \| `local` | 선택 | 에이전트의 메모리 스코프 |

유효한 에이전트 ID: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

병합은 얕게 이루어집니다. 오버라이드에 정의한 각 필드가 해당 필드의 프리셋 값을 대체하며, 생략한 필드는 프리셋 값을 그대로 유지합니다.

---

## 모델 슬러그 인라인 등록

빌트인 레지스트리에 아직 없는 모델 슬러그는 `models:` 아래에 등록합니다. 등록한 슬러그는 `agents:`나 `custom_presets:` 어디에서든 사용할 수 있습니다.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```

`agents:`에서 참조하는 등록 슬러그에는 두 가지 규칙이 적용됩니다.

1. **키는 `owner/model` 형식이어야 합니다.** `agents.<id>.model`이 `owner/model`
   패턴으로 검증하므로 `my-fast-model` 같은 단순 키는 거부됩니다. `google/gemini-3-flash-fast`
   처럼 슬래시가 들어간 키(또는 벤더 자체의 `provider/model` 슬러그)를 쓰세요.
2. **스펙은 완전해야 합니다.** 해석 시점에 `cli`, `cli_model`, `auth_hint`, 그리고 모든
   `supports` 불리언이 필요합니다. 불완전한 스펙은 설정 파서는 통과하지만 모델 레지스트리
   검증에서 실패하고 조용히 코어 레지스트리로 폴백합니다.

> 사용자 정의 슬러그가 빌트인 슬러그와 충돌하면 사용자 정의가 우선 적용되며 경고가 출력됩니다.

---

## 커스텀 프리셋

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

`extends:`가 없으면 11개 에이전트 역할 모두에 대해 `agent_defaults`를 제공해야 합니다. `extends:`를 사용하면 명시한 항목만 오버라이드되고 나머지는 베이스 프리셋에서 상속됩니다.

---

## `oma doctor --profile`

`oma doctor --profile`을 실행하면 프리셋 기본값, `custom_presets`, `agents:` 오버라이드가 모두 병합된 후의 최종 모델 매트릭스를 확인할 수 있습니다.

```bash
oma doctor --profile
```

**출력 예시:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

각 행은 해석된 모델 슬러그와 그 값을 적용한 출처(`(preset)` 또는 `(override)`)를 보여줍니다. 서브에이전트가 예상치 못한 벤더를 선택할 때마다 이 명령으로 확인하세요.

---

## 레거시 `agent_cli_mapping`에서 마이그레이션

마이그레이션 008은 `oma install`과 `oma update` 실행 시 자동으로 동작합니다. 레거시 프로젝트를 그 자리에서 변환합니다.

| 레거시 설정 | 마이그레이션 008 적용 후 결과 |
|:-------------|:--------------------------|
| 모든 항목이 동일한 벤더 (예: 전부 `gemini`) | `model_preset: gemini`, `agents:` 없음 |
| 혼합 벤더 | 가장 빈도 높은 벤더가 `model_preset`으로, 나머지는 `agents:` 오버라이드로 |
| `AgentSpec` 객체 값 | `agents:`로 그대로 이동 |
| `models.yaml` 내용 | `oma-config.yaml.models`에 인라인으로 통합 |
| 커스터마이즈된 `defaults.yaml` | `custom_presets.user-customized`로 보존되며 경고 출력 |

변경 전 원본은 `.agents/.backup-pre-008-{timestamp}/`에 백업됩니다. 마이그레이션은 멱등성을 보장합니다(이미 `model_preset`이 존재하면 건너뜁니다).

마이그레이션이 끝나면 `.agents/config/defaults.yaml`, `.agents/config/models.yaml`, 그리고 `.agents/config/` 디렉토리가 제거됩니다.

---

## 세션 쿼터 상한

`session.quota_cap`은 변경되지 않았습니다. 서브에이전트의 무분별한 스폰을 제한하려면 `oma-config.yaml`에 추가합니다.

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

상한에 도달하면 오케스트레이터는 추가 스폰을 거부하고 `QUOTA_EXCEEDED` 상태를 표면화합니다.

---

## 전체 예시

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

`oma doctor --profile`로 해석 결과를 확인한 뒤, 평소처럼 워크플로우를 시작하세요.

---

## pi(전송 런타임)를 통한 디스패치

[pi](https://github.com/earendil-works/pi)(Earendil)는 모델 소유자가 아니라
여러 프로바이더를 중계하는 프록시 런타임입니다. 실제 프로바이더 모델
(Anthropic, OpenAI, Google)을 하나의 CLI에서 모두 돌릴 수 있습니다. oma는 pi를
**전송 오버레이**로 다룹니다. `model_preset`과 `agents:` 오버라이드는 그대로
두고, 특정 에이전트를 실행하는 CLI만 pi로 바뀝니다.

`-m pi` 오버라이드로 어떤 에이전트든 pi를 통해 디스패치합니다.

```bash
oma agent:spawn backend "Implement the export endpoint" <session> -m pi
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
때는 실제 프로바이더 프리셋(`claude`, `codex`, `gemini`, `mixed`)을 쓰세요.

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

`-m opencode` 오버라이드로 어떤 에이전트든 opencode를 통해 라우팅합니다.

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
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
   `supports` 불리언이 필요합니다. 불완전한 스펙은 검증에 실패하고 조용히 코어
   레지스트리로 폴백합니다. 따라서 해당 에이전트는 opencode로 라우팅되지 않습니다.

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
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe`는 슬러그가 `opencode models`에 나열되어 있으면 `accepted`,
나열되어 있지 않으면 `rejected`, 프로바이더에 로그인이나 구독이 필요하면
`auth_required`를 보고합니다.

### 인증 및 생성된 파일

- **인증:** `opencode auth login`은 자격 증명을
  `~/.local/share/opencode/auth.json`에 프로바이더별로 하나씩 저장합니다.
  `oma auth:status` / `oma doctor`는 프로바이더 중 하나라도 자격 증명이 있으면
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

`-m kimi` 오버라이드로 어떤 에이전트든 Kimi를 통해 라우팅합니다.

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m kimi
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
> stderr이지만, `oma hook` 라우터는 항상 0으로 종료하고 stdout으로 방언을
> 내보냅니다. oma는 최선의 노력으로 `permissionDecision: "deny"`(그리고 Claude
> 스타일의 `decision: "block"`)를 내보내므로, Kimi에서 지속적 워크플로우는 완만하게
> 저하된 형태로 동작합니다.
