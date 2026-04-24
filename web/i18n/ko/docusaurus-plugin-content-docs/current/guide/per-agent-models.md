---
title: "가이드: 에이전트별 모델 설정"
description: oma-config.yaml과 models.yaml로 에이전트마다 CLI 벤더, 모델, 추론 수준을 따로 지정합니다. agent_cli_mapping, 런타임 프로파일, oma doctor --profile, models.yaml, 세션 쿼터 상한까지 다룹니다.
---

# 가이드: 에이전트별 모델 설정

## 개요

oh-my-agent는 `agent_cli_mapping`을 통해 **에이전트별 모델 선택**을 지원합니다. 각 에이전트(pm, backend, frontend, qa 등)가 전역 벤더 하나를 공유하지 않고, 서로 독립적으로 벤더·모델·추론 강도를 지정할 수 있습니다.

이 페이지에서 다루는 내용:

1. 3-파일 설정 계층
2. 이중 포맷 `agent_cli_mapping`
3. 런타임 프로파일 프리셋
4. `oma doctor --profile` 명령
5. `models.yaml`에서 사용자 정의 슬러그 추가
6. 세션 쿼터 상한

---

## 설정 파일 계층

oh-my-agent는 아래 세 파일을 우선순위(높은 것부터) 순서로 읽습니다.

| 파일 | 역할 | 편집 가능 |
|:-----|:-----|:---------|
| `.agents/oma-config.yaml` | 사용자 오버라이드 — 에이전트-CLI 매핑, 활성 프로파일, 세션 쿼터 | 예 |
| `.agents/config/models.yaml` | 사용자 제공 모델 슬러그 (내장 레지스트리에 추가) | 예 |
| `.agents/config/defaults.yaml` | 내장 Profile B 기본값 (5개 `runtime_profiles`, 안전한 폴백) | 아니요 — SSOT |

> `defaults.yaml`은 SSOT의 일부이므로 직접 수정하지 마세요. 모든 커스터마이징은 `oma-config.yaml`과 `models.yaml`에서 이루어집니다.

---

## 이중 포맷 `agent_cli_mapping`

`agent_cli_mapping`은 두 가지 값 형태를 함께 받아들여 점진적 마이그레이션이 가능합니다.

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # 레거시 — 벤더만 지정 (기본 모델 사용)
  backend:                            # 신규 AgentSpec 오브젝트
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**레거시 문자열 형식**: `agent: "vendor"` — 계속 동작하며, 해당 벤더의 기본 모델과 기본 effort를 매칭 런타임 프로파일을 통해 사용합니다.

**AgentSpec 오브젝트 형식**: `agent: { model, effort }` — 특정 모델 슬러그와 추론 강도(`low`, `medium`, `high`)를 못박습니다.

자유롭게 혼합 사용할 수 있습니다. 지정하지 않은 에이전트는 활성 `runtime_profile`로 폴백하고, 그 다음에는 `defaults.yaml`의 최상위 `agent_defaults`로 폴백합니다.

---

## 런타임 프로파일

`defaults.yaml`은 Profile B와 함께 5개의 `runtime_profiles`를 기본 제공합니다. `oma-config.yaml`에서 하나를 선택하세요.

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # 아래 옵션 참고
```

| 프로파일 | 모든 에이전트가 라우팅되는 곳 | 사용 시점 |
|:---------|:------------------------------|:----------|
| `claude-only` | Claude Code (Sonnet/Opus) | Anthropic 스택으로 통일 |
| `codex-only` | OpenAI Codex (GPT-5.x) | 순수 OpenAI 스택 |
| `gemini-only` | Gemini CLI | Google 중심 워크플로우 |
| `antigravity` | 혼합: impl→codex, architecture/qa/pm→claude, retrieval→gemini | 벤더별 강점 조합 |
| `qwen-only` | Qwen Code | 로컬 / 자체 호스팅 추론 |

프로파일은 에이전트마다 개별 수정 없이 전체 구성을 빠르게 바꾸는 지름길입니다.

---

## `oma doctor --profile`

`--profile` 플래그는 `oma-config.yaml`, `models.yaml`, `defaults.yaml`이 모두 병합된 **후의** 각 에이전트 벤더·모델·effort를 매트릭스로 보여줍니다.

```bash
oma doctor --profile
```

**출력 예시:**

```
oh-my-agent — Profile Health (runtime=claude)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ pm           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │
│ frontend     │ openai/gpt-5.4               │ codex    │ ✗ not logged in  │
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┘
```

각 행은 `oma-config.yaml` + 활성 프로파일 + `defaults.yaml` 병합 후 최종 결정된 모델 슬러그와, 해당 역할을 실행할 CLI에 로그인되어 있는지 여부를 보여줍니다. 서브에이전트가 예상 밖의 벤더를 선택할 때마다 이 명령을 활용하세요.

---

## `models.yaml`에 슬러그 추가

`models.yaml`은 선택 파일이며, 내장 레지스트리에 아직 없는 모델 슬러그를 등록할 때 사용합니다 — 새로 출시된 모델에 유용합니다.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

등록이 끝나면 `agent_cli_mapping`에서 해당 슬러그를 사용할 수 있습니다.

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

슬러그는 식별자이므로 벤더가 공개한 영문 문자열 그대로 유지하세요.

---

## 세션 쿼터 상한

`oma-config.yaml`에 `session.quota_cap`을 추가해 서브에이전트 폭주를 막습니다.

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # 세션 전체 토큰 상한
    spawn_count: 40          # 병렬 + 순차 서브에이전트 최대 개수
    per_vendor:              # 벤더별 토큰 서브 상한
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

상한에 도달하면 오케스트레이터는 추가 스폰을 거부하고 `QUOTA_EXCEEDED` 상태를 표면화합니다. 항목을 비워 두거나 `quota_cap` 자체를 생략하면 해당 차원은 비활성화됩니다.

---

## 전체 예시

실전 `oma-config.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

`oma doctor --profile`로 해석 결과를 확인한 뒤 평소처럼 워크플로우를 시작하세요.


## 설정 파일 소유권

| 파일 | 소유자 | 편집 가능 여부 |
|------|--------|---------------|
| `.agents/config/defaults.yaml` | oh-my-agent와 함께 배포되는 SSOT | 아니요 — 읽기 전용으로 취급 |
| `.agents/oma-config.yaml` | 사용자 | 예 — 여기서 커스터마이징 |
| `.agents/config/models.yaml` | 사용자 | 예 — 새 슬러그는 여기에 추가 |

`defaults.yaml`에는 `version:` 필드가 있어, 새 oh-my-agent 릴리스에서 runtime_profiles 추가, 새 Profile B 슬러그 등록, effort 매트릭스 조정 등의 업그레이드를 자동으로 받을 수 있습니다. 직접 편집하면 이러한 업그레이드를 자동으로 받을 수 없게 됩니다.

## `defaults.yaml` 업그레이드

최신 oh-my-agent 릴리스를 pull한 뒤 `oma install`을 실행하면, 인스톨러가 로컬 `defaults.yaml` 버전과 번들 버전을 비교합니다.

- **일치** → 변경 없음, 조용히 종료.
- **불일치** → 경고 메시지:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **불일치 + `--update-defaults`** → 번들 버전이 로컬 파일을 덮어씁니다:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`models.yaml`은 인스톨러가 절대 수정하지 않습니다. `oma-config.yaml` 역시 보존되지만, 한 가지 예외가 있습니다. `oma install`은 설치 중 답변한 내용을 바탕으로 `language:` 줄을 재작성하고 `vendors:` 블록을 갱신합니다. 그 외에 추가한 필드(예: `agent_cli_mapping`, `active_profile`, `session.quota_cap`)는 실행 간에 그대로 유지됩니다.

## 5.16.0 이전 설치에서 업그레이드

에이전트별 model/effort 기능이 추가되기 이전 프로젝트라면:

1. 프로젝트 루트에서 `oma install`(또는 `oma update`)을 실행합니다. 인스톨러가 `.agents/config/`에 새 `defaults.yaml`을 생성하고, 마이그레이션 `003-oma-config`를 실행하여 기존 `.agents/config/user-preferences.yaml`이 있다면 자동으로 `.agents/oma-config.yaml`로 이전합니다.
2. `oma doctor --profile`을 실행합니다. 기존의 `agent_cli_mapping: { backend: "gemini" }` 값은 `runtime_profiles.gemini-only.agent_defaults.backend`를 통해 해석되므로, 매트릭스에 올바른 슬러그와 CLI가 자동으로 표시됩니다.
3. (선택) 에이전트별 `model`, `effort`, `thinking`, `memory` 오버라이드가 필요한 경우 `oma-config.yaml`의 레거시 문자열 항목을 새 AgentSpec 형식으로 전환합니다.
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. `defaults.yaml`을 직접 커스터마이징했다면, `oma install`이 덮어쓰는 대신 버전 불일치 경고를 표시합니다. 커스터마이징 내용을 `oma-config.yaml` / `models.yaml`로 옮긴 뒤 `oma install --update-defaults`를 실행하여 새 SSOT를 수락하세요.

`agent:spawn`에 대한 파괴적 변경은 없습니다 — 레거시 설정은 graceful fallback을 통해 계속 동작하므로 자신의 속도에 맞춰 마이그레이션할 수 있습니다.
