---
title: "스킬 유용성 평가"
description: oma skills eval용 평가 태스크 픽스처를 작성하는 방법, .agents/eval/ 디렉토리 규칙, 체커 종류, mock과 live 실행 모드를 다룹니다.
---

# 스킬 유용성 평가

`oma skills eval`은 스킬을 로딩했을 때 에이전트의 태스크 결과가 실제로 좋아지는지 측정합니다. "두 스킬이 중복인가?"를 묻는 `oma skills audit`과는 다른 질문, 곧 "이 스킬이 도움이 되는가?"에 답합니다.

설계는 두 연구 결과를 따릅니다. WikiSkill(arXiv:2608.27454)은 원시 경험, 영속 지식, 실행 가능한 스킬을 분리하면서 진화에 held-out 게이트를 둡니다. SkillLens(arXiv:2605.23899)는 스킬 유용성이 설명의 구별성과 무관함을 보여줍니다. 구별되는 스킬도 쓸모없을 수 있고, 겹치는 스킬도 도움이 될 수 있습니다.

---

## 동작 방식

태스크 픽스처마다 두 갈래를 실행합니다.

1. **baseline 갈래**: 스킬을 뺀 상태로 에이전트에 태스크 프롬프트를 디스패치합니다.
2. **treatment 갈래**: 프롬프트 앞에 `SKILL.md`를 붙인 뒤 같은 태스크를 디스패치합니다.

각 갈래는 태스크의 체커가 채점합니다(0은 실패, 1은 통과). 주요 지표는 다음과 같습니다.

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

`utilityLift ≥ 5%`이면 스킬이 통과합니다. 그 아래면 향상이 미미하다고 경고하거나, 향상이 없다고 실패 처리합니다. 판정을 내리려면 채점 가능한 태스크가 최소 5개 필요합니다.

---

## `.agents/eval/<skill>/` 규칙

태스크 픽스처는 `.agents/eval/<skill>/` 아래에 둡니다. 이 경로는 `.agents/` 안이지만 스킬 디렉토리 밖이므로, `oma update`가 사용자가 작성한 평가를 덮어쓰지 않고 살려 둡니다.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

`_`로 시작하는 파일은 태스크 픽스처를 로딩할 때 건너뜁니다. `_rollouts/` 하위 디렉토리에는 이전 `--live --record` 실행에서 기록한 출력이 들어 있습니다.

---

## 태스크 픽스처 스키마

각 픽스처는 다음 필드를 갖는 YAML 파일입니다.

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| 필드 | 필수 | 설명 |
|:------|:---------|:-----------|
| `id` | 예 | 이 태스크의 고유 식별자(롤아웃 파일명과 보고서에 씁니다) |
| `skill` | 예 | 평가 대상 스킬(상위 디렉토리 이름과 일치해야 합니다) |
| `domain` | 예 | 도메인 라벨(묶기와 향후 음의 전이 탐지에 씁니다) |
| `prompt` | 예 | 두 갈래에 모두 디스패치할 태스크 프롬프트 |
| `checker` | 아니오 | 갈래 출력을 채점하는 방식입니다. 생략하면 `{ type: judge }`가 기본값입니다. |
| `weight` | 예 | 가중 평균에 쓰는 상대 가중치(태스크 중요도가 다르지 않다면 `1`을 쓰세요) |

### 체커 종류

#### judge (기본값)

LLM이 루브릭을 기준으로 갈래 출력을 평가해 PASS 또는 FAIL을 반환합니다. `checker`를 생략하거나 `checker.type`이 없으면 이 방식이 기본값입니다.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

`rubric` 필드는 선택 사항입니다. 생략하면 기본 루브릭인 "Does the answer correctly and completely satisfy the task prompt?"를 씁니다.

간단히 쓰려면 루브릭을 최상위에 적어도 됩니다.

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**중요:** `--mock` 모드에서 judge 태스크는 `_rollouts/`에 미리 기록된 판정이 있어야 합니다. 기록된 판정이 없으면 그 태스크는 경고와 함께 보고서에서 제외됩니다. 먼저 `--live --record`로 롤아웃을 채우세요.

갈래 자체가 통째로 빠진 경우에는 체커 종류와 무관하게 같은 규칙이 적용됩니다. 0점으로 채점하지 않고 태스크를 제외합니다. 데이터가 없는 것은 틀린 답이 아니며, 0점으로 매기면 두 갈래가 모두 0이 되어 향상이 0인 결과가 `decision: "fail"`로 읽히기 때문입니다. 제외 때문에 채점 개수가 `MIN_TASKS` 아래로 내려가면 `coverage: "insufficient"`로 드러납니다.

#### assert (선택)

결정론적 부분 문자열 검사입니다. 기대 출력이 정확히 정해진 계약·형식·도구 호출 검증에 쓰세요.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

`expect_contains`의 모든 문자열이 갈래 출력에 있으면 통과합니다.

#### regex (선택)

결정론적 정규식 매칭입니다. 정확한 문자열이 아니라 패턴이 필요할 때 쓰세요.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

200자를 넘는 패턴은 0점 처리합니다(ReDoS 임시 방어). 출력은 매칭 전에 10,000자로 잘립니다.

---

## 실행 모드

### --mock (기본값)

`_rollouts/`에 기록된 롤아웃을 재생합니다. 완전히 결정론적이고 오프라인이며 LLM을 호출하지 않습니다.

- `assert`와 `regex` 체커는 기록된 출력 문자열로 점수를 계산합니다.
- `judge` 체커는 `--live --record`가 기록한 `score` 필드를 재생합니다.

judge 태스크에 `_rollouts/`의 기록 점수가 없으면 콘솔 경고와 함께 보고서에서 제외합니다. 덕분에 mock 모드가 철저히 오프라인으로 유지됩니다.

기록은 쓰기 전에 낡았는지도 확인합니다. 다른 SKILL.md 본문에서 기록된 treatment 항목, 픽스처의 `prompt`가 바뀐 항목, 출처 추적이 도입되기 전의 항목은 모두 파일명과 개수를 밝히는 경고와 함께 버립니다. 그 결과 채점 가능한 태스크가 `MIN_TASKS`보다 적어지면 판정 대신 `coverage: "insufficient"`를 보고합니다. 편집된 스킬이 예전 점수를 물려받는 일은 없습니다.

:::note `oma skills opt --mock`
최적화기는 후보 SKILL.md 본문을 채점합니다. 기록은 그것이 만들어진 본문에만 유효하므로, 후보 본문에는 맞는 롤아웃이 없어 커버리지 없음으로 보고됩니다. 후보를 채점하려면 `--live`를 쓰세요.
:::

CI에서 안전합니다. `OMA_SKILLEVAL_MOCK=1`을 설정하면 이 모드를 강제합니다.

```bash
oma skills eval --skill oma-scholar
```

### --live

`oma agent:spawn --read-only`로 실제 에이전트 갈래를 스폰합니다. 프로젝트 파일이 수정되지 않도록 두 갈래 모두 임시 워크스페이스에서 돌립니다.

디스패치 전에 태스크 수, 갈래 디스패치 수, judge 디스패치 수, 해석된 벤더를 나열한 비용 미리보기를 출력합니다. `y`로 확인하거나 `--yes`로 건너뛰세요.

```bash
# Preview and confirm
oma skills eval --skill oma-scholar --live

# Skip confirmation
oma skills eval --skill oma-scholar --live --yes
```

#### 스킬 격리 (baseline을 정직하게 유지하기) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift`는 **baseline 갈래가 대상 스킬 없이 돌아갈 때만** 의미가 있습니다. 문제는 디스패치된 에이전트가 자기 런타임에 설치된 모든 스킬을 자동으로 로딩한다는 점입니다. 순진하게 만든 baseline은 *없어야 할* 그 스킬을 그대로 물고 들어가 비교를 오염시킵니다(baseline ≈ treatment, 향상 ≈ 0).

이를 막기 위해 `--live`는 **두 갈래 모두를 격리된 임시 워크스페이스**에서 돌립니다. 그 워크스페이스의 스킬 디렉토리에는 설치된 스킬이 **대상 스킬만 빼고** 전부 들어 있습니다. treatment 갈래는 주입된 `SKILL.md`(프롬프트 앞에 붙임)로**만** 대상 스킬을 다시 넣습니다. 따라서 주입이 유일한 통제 변수입니다. baseline은 스킬 없음, treatment는 후보 `SKILL.md`입니다.

이 방식이 통하는 이유는 대부분의 벤더가 스킬을 **작업 디렉토리 기준**(예: `<cwd>/.claude/skills`, `<cwd>/.codex/skills`)으로 탐색하기 때문입니다. 깨끗한 작업 디렉토리는 스킬을 실제로 감춥니다. 보고서는 `isolation` 필드로 격리가 얼마나 지켜졌는지 밝힙니다.

| 상태 | 의미 |
|---|---|
| `enforced` | cwd 기준 벤더이고 HOME 경로에도 대상 스킬이 없습니다. 완전히 격리됐습니다. |
| `best-effort` | cwd 기준 벤더이지만 스킬의 HOME 사본도 존재하거나(또는 벤더를 알 수 없음), 프로젝트 사본은 감췄지만 HOME 사본이 샐 수 있습니다. 신뢰도 낮음으로 표시합니다. |
| `unavailable` | HOME 기반 벤더입니다(예: `~/.gemini/antigravity-cli/skills`를 읽는 **antigravity**). 깨끗한 cwd로는 감출 수 없습니다. 경고를 출력하고 결과를 신뢰도 낮음으로 표시합니다. |
| n/a | mock 모드입니다. 라이브 디스패치가 없습니다. |

격리가 `enforced`가 아니면 한 줄짜리 경고를 출력하며, 결과는 신뢰도 낮음으로 다뤄야 합니다. 깨끗한 신호를 얻으려면 HOME 기반 벤더가 아니라 **cwd 기준이라 격리 가능한 벤더**(claude, codex, qwen)로 평가하세요. 평가 벤더는 `.agents/oma-config.yaml`의 `model_preset`을 따르므로, 기본 벤더가 cwd 기준인 프리셋을 고르면 됩니다.

### --live --record

라이브 갈래를 실행하고 캡처한 출력(judge 체커 태스크의 judge 판정 포함)을 `_rollouts/<hash>.json`에 씁니다. 파일명은 태스크 ID 집합의 결정론적 SHA-256 해시이며, 날짜나 난수 기반이 아닙니다.

이후 재생을 오프라인으로 유지하려면 자기 머신에서 이 명령으로 `--mock` 실행의 씨앗을 만드세요.

각 항목은 나중에 재생할 때 아직 유효한지 판단할 수 있도록 출처 정보를 담습니다.

| 필드 | 기록 대상 | 비교 대상 |
|---|---|---|
| `skillBodyHash` | `treatment`만 | 평가 중인 SKILL.md 본문 |
| `promptHash` | 두 갈래 모두 | 픽스처의 현재 `prompt` |

baseline 갈래는 스킬을 빼고 돌리므로 SKILL.md를 고쳐도 무효화되지 않습니다. treatment 갈래만 다시 기록합니다.

:::caution `_rollouts/`는 로컬 전용입니다. 커밋하지 마세요
기록은 그것이 만들어진 정확한 SKILL.md 본문에만 재생됩니다. 스킬을 고치면 다음 `--mock` 실행에서 treatment 기록이 버려지므로, 커밋해 둔 기록은 SKILL.md가 바뀔 때마다 낡아지고 받아 가는 모두에게 경고를 띄웁니다. 이 디렉토리는 gitignore 대상이니 로컬에서만 기록하세요.
:::

```bash
oma skills eval --skill oma-scholar --live --record --yes
```

---

## 최소한으로 동작하는 픽스처 세트

판정을 내리려면 픽스처가 5개 필요합니다(`MIN_TASKS = 5`). 가상의 `oma-scholar` 스킬을 위한 최소 세트는 다음과 같습니다.

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

같은 식으로 최소 세 개를 더 만드세요. 그다음 실행합니다.

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skills eval --skill oma-scholar --live --record --yes

# Offline replay
oma skills eval --skill oma-scholar --json
```

---

## 보고서 읽기

**텍스트 출력:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [codex]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON 출력** (`--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0 }
  ],
  "negativeTransfer": [],
  "isolation": "enforced",
  "isolationVendor": "codex"
}
```

`ok`는 `coverage === "ok"`이고 `decision === "pass"`일 때만 `true`입니다. `isolation` 필드는 baseline 갈래가 정말로 대상 스킬 없이 돌았는지 알려 줍니다([스킬 격리](#skill-isolation-keeping-the-baseline-honest) 참고). `--mock` 모드에서는 `isolation`이 `"n/a"`입니다.

---

## CI 통합

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skills eval --skill oma-scholar --json --require-coverage
```

종료 코드:
- `0`: pass 또는 warn
- `1`: fail, 또는 `--require-coverage`와 함께 커버리지 부족

---

## live와 mock 선택하기

열린 형태의 태스크에서 실제 유용성을 측정할 때는 judge 체커와 함께 `--live`를 사용합니다. `--mock`은 이전에 기록한 judge 판정을 오프라인으로 재생하거나 결정론적 `assert`/`regex` 계약 검사를 실행할 때 사용합니다.

mock의 결정성은 `--live --record` 도중 judge의 이진 판정(PASS/FAIL)을 롤아웃 항목에 기록해 두고, 이후 `--mock` 실행에서 그 점수를 재생하는 방식으로 유지합니다. LLM을 다시 호출하지 않습니다.

**데이터 유출 관련:** `--live` 중에는 judge가 후보 갈래의 출력을 채점을 위해 설정된 벤더로 보냅니다. 라이브 실행을 시작할 때마다 한 번씩 경고를 출력합니다.

---

## 스킬과 함께 평가 태스크 배포하기

스킬은 `.agents/eval/<skill>/`에 픽스처를 두는 방식으로 평가 태스크 세트를 함께 배포할 수 있습니다. 이 파일은 스킬 디렉토리 밖에 있는 사용자 작성 파일이므로 `oma update`에도 살아남습니다. `oma-skill-creation`로 새 스킬을 만들 때 대응하는 `eval/` 픽스처 세트를 함께 추가하면, 이후 작성자가 스킬의 효과를 검증할 수단을 갖게 됩니다. 스킬 작성 워크플로우는 `.agents/skills/oma-skill-creation/SKILL.md`를 참고하세요.
