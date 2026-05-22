---
title: "가이드: 에이전트별 모델 설정"
description: oma-config.yaml의 model_preset으로 각 에이전트가 사용할 AI 모델을 설정합니다. 빌트인 프리셋, 에이전트별 오버라이드, 인라인 모델 정의, extends 기반 커스텀 프리셋, oma doctor --profile, 그리고 레거시 agent_cli_mapping에서의 마이그레이션을 다룹니다.
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
| `cursor` | 모든 에이전트가 Cursor `composer-2.5` 사용 (orchestrator/qa/pm/docs/retrieval은 `composer-2.5-fast`) | Cursor Pro / Pro Student 사용자 |
| `mixed` | 혼합 구성: 구현 역할은 Codex, architecture/qa/pm은 Claude, retrieval은 Gemini | 에이전트별 설정 부담 없이 벤더별 강점을 활용하고 싶을 때 |

빌트인 프리셋은 CLI 패키지에 포함되어 제공되며, `oh-my-agent`를 업그레이드하면 자동으로 갱신됩니다. 별도로 관리할 로컬 파일이 없습니다.

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

유효한 에이전트 ID: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

병합은 얕게 이루어집니다. 오버라이드에 정의한 각 필드가 해당 필드의 프리셋 값을 대체하며, 생략한 필드는 프리셋 값을 그대로 유지합니다.

---

## 모델 슬러그 인라인 등록

빌트인 레지스트리에 아직 없는 모델 슬러그는 `models:` 아래에 등록합니다. 등록한 슬러그는 `agents:`나 `custom_presets:` 어디에서든 사용할 수 있습니다.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

각 행은 해석된 모델 슬러그와 그 값을 적용한 출처(`(preset)` 또는 `(override)`)를 보여줍니다. 서브에이전트가 예상치 못한 벤더를 선택할 때마다 이 명령으로 확인하시기 바랍니다.

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

`oma doctor --profile`로 해석 결과를 확인한 뒤, 평소처럼 워크플로우를 시작하시기 바랍니다.
