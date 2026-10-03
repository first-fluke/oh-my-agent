---
title: "스킬 유용성 평가"
sidebar_label: 스킬 평가
description: oma skill eval용 평가 태스크 픽스처를 작성하는 방법, .agents/eval/ 디렉토리 규칙, 체커 종류, mock과 live 실행 모드를 다룹니다.
---

# 스킬 유용성 평가

`oma skill eval`은 스킬을 로딩했을 때 에이전트의 태스크 결과가 실제로 좋아지는지 측정합니다. "두 스킬이 중복인가?"를 묻는 `oma skill audit`과는 다른 질문, 곧 "이 스킬이 도움이 되는가?"에 답합니다.

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
| `domain` | 예 | 도메인 라벨(묶기와 음의 전이 이웃 태스크 선택에 씁니다) |
| `prompt` | 예 | 두 갈래에 모두 디스패치할 태스크 프롬프트 |
| `checker` | 아니오 | 갈래 출력을 채점하는 방식입니다. 생략하면 `{ type: judge }`가 기본값입니다. |
| `weight` | 예 | 가중 평균에 쓰는 상대 가중치(태스크 중요도가 다르지 않다면 `1`을 쓰세요) |
| `group` | 아니오 | 계열 라벨입니다. `oma skill optimize`는 같은 group을 공유하는 픽스처를 같은 train/validation/final-test 분할에 두므로, 거의 중복인 픽스처가 분할 경계를 넘어 새지 않습니다. |

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

기록은 쓰기 전에 낡았는지도 확인합니다. 스킬 본문, 프롬프트, 태스크/체커 계약, 실제 적용되는 judge 루브릭, 평가자 프로토콜 리비전이 바뀌면 영향받는 항목이 무효가 됩니다. 출처 정보가 없는 항목도 파일명과 개수를 밝히는 경고와 함께 버립니다. 그 결과 채점 가능한 태스크가 `MIN_TASKS`보다 적어지면 판정 대신 `coverage: "insufficient"`를 보고합니다.

:::note `oma skill optimize --mock`
최적화기는 후보 SKILL.md 본문을 채점합니다. 기록은 그것이 만들어진 본문에만 유효하므로, 후보 본문에는 맞는 롤아웃이 없어 커버리지 없음으로 보고됩니다. 후보를 채점하려면 `--live`를 쓰세요.
:::

CI에서 안전합니다. `OMA_SKILLEVAL_MOCK=1`을 설정하면 이 모드를 강제합니다.

```bash
oma skill eval --skill oma-scholar
```

### --live

`oma agent spawn --read-only`로 실제 에이전트 갈래를 스폰합니다. 태스크의 각 갈래는 자기만의 임시 워크스페이스에서 돌기 때문에, 한 갈래가 만든 파일이 다른 갈래에 영향을 주지 않습니다. 프로세스 실패, API 오류 엔벨로프(envelope), judge 실패가 생기면 짝지은 비교 전체를 채점과 기록에서 제외하며, 부분 출력은 진단용 데이터입니다.

디스패치 전에 태스크 수, 갈래 디스패치 수, judge 디스패치 수, 해석된 벤더를 나열한 비용 미리보기를 출력합니다. `y`로 확인하거나 `--yes`로 건너뛰세요.

다른 제어 옵션은 CI와 커버리지 조사에 유용합니다.

| 옵션 | 효과 |
| --- | --- |
| `--task-dir <path>` | `.agents/eval/<skill>`이 아닌 지정한 디렉토리의 픽스처를 평가합니다. |
| `--max-tasks <n>` | 제한된 live 실행에서 평가할 픽스처 수의 상한을 둡니다. |
| `--trials <n>` | 모든 갈래를 `n`회(1~10) 반복합니다. 먼저 시작하는 갈래는 시행마다 번갈아 바뀌고, 태스크별 점수는 평균을 내며, 보고서에 태스크 내 분산이 추가됩니다. `--neg-transfer`의 이웃 태스크는 한 번만 실행합니다. |
| `--neg-transfer` | 다른 스킬에 속한 동일 도메인 태스크에서 후보 스킬을 측정합니다. 기본값은 꺼짐입니다. |
| `--routing` | 활성화(activation)를 측정합니다. 태스크마다 모든 스킬의 `description`을 근거로 설치된 스킬 중 어느 것이 로딩될지 묻습니다. live는 직접 측정하고(태스크당 디스패치 1회 추가), mock은 같은 카탈로그에서 만든 라우팅 기록을 재생합니다. |
| `--require-coverage` | scoreable paired task가 5개 미만으로 남거나 요청한 음의 전이 검사가 불완전하면 non-zero로 종료합니다. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### 음의 전이 측정

`--neg-transfer`를 쓰면 선택한 이웃 태스크마다 두 번 실행합니다. 먼저 후보 없이 새 baseline을 돌리고, 이어서 후보 본문을 그대로 주입한 treatment를 돌립니다. 이웃은 같은 `domain`에 속한 다른 스킬의 태스크입니다. 같은 도메인을 공유하는 다른 스킬이 없으면 대신 범위가 제한된 교차 도메인 샘플(최대 6개 태스크, 다른 스킬들에 고르게 분산)을 쓰며, 이때 `negativeTransferCoverage.scope`는 `cross-domain`을 보고합니다. 이는 주입된 본문의 간섭이 자기 도메인 안에만 머무르지 않고, 도메인이 하나뿐이라는 이유로 검사가 불가능해져서는 안 되기 때문입니다. 두 갈래는 같은 평가자와 서로 분리된 빈 워크스페이스를 씁니다. 델타는 treatment 점수에서 baseline 점수를 뺀 값이며, 음수는 후보가 그 이웃 태스크를 해쳤다는 뜻입니다. live 미리보기에는 이런 추가 갈래와 judge 디스패치도 포함됩니다. `--max-tasks`는 이웃 샘플에도 상한을 두며, 태스크가 빠지면 경고합니다.

후보별 비교를 `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/` 아래에 저장하려면 `--live --neg-transfer --record`를 쓰세요. mock 재생에는 후보 식별 정보, 본문 해시, 전체 태스크/체커 해시가 일치해야 하고 두 갈래가 비교 ID를 공유해야 합니다. 이웃 태스크의 일반 평가 기록으로는 이 측정을 대신할 수 없습니다.

각 `negativeTransfer` 항목에는 `trials`(`delta`의 근거가 되는 짝지은 비교 횟수)가 들어 있습니다. 최적화는 후보를 거부하기 전에 퇴행한 이웃 태스크를 한 번 다시 측정하고 `confirmed`를 추가합니다(반복에서도 퇴행하면 `true`, 아니면 `false`). `oma skill eval --neg-transfer`는 비교를 한 번만 하고 그 결과를 보고합니다. 보고서에는 `status`, `expected`, `scored`를 담은 `negativeTransferCoverage`가 포함됩니다. `status`는 플래그가 없으면 `not-requested`, 선택한 모든 이웃 태스크에 유효한 짝지은 결과가 있고 샘플이 비어 있지 않으면 `measured`, 이웃이 0개이거나 비교가 하나라도 빠졌으면 `insufficient`입니다. 따라서 `negativeTransfer` 배열이 비어 있다고 해서 퇴행이 없다는 사실이 입증되지는 않습니다. 요청한 음의 전이 커버리지가 불충분하면 JSON `ok`가 false입니다.

#### 스킬 격리 (baseline을 정직하게 유지하기) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift`는 **baseline 갈래가 대상 스킬 없이 돌아갈 때만** 의미가 있습니다. 문제는 디스패치된 에이전트가 자기 런타임에 설치된 모든 스킬을 자동으로 로딩한다는 점입니다. 순진하게 만든 baseline은 *없어야 할* 그 스킬을 그대로 물고 들어가 비교를 오염시킵니다(baseline ≈ treatment, 향상 ≈ 0).

이를 막기 위해 `--live`는 **두 갈래를 각각 별도의 임시 워크스페이스**에서 돌립니다. 보호된 Claude와 Codex 프로필은 스킬/지시 파일의 자동 탐색과 에이전트 도구를 끕니다. treatment는 주입된 `SKILL.md`로**만** 대상 스킬을 받습니다. 탐색용(exploratory) 프로필은 대상 스킬을 뺀 필터링된 스킬 디렉토리를 쓰지만, 그것만으로는 격리가 입증되지 않습니다.

깨끗한 작업 디렉토리는 프로젝트 로컬의 스킬 탐색을 감추지만, 런타임 격리는 벤더 프로필에도 좌우됩니다. 보고서는 `isolation` 필드로 검증된 수준을 밝힙니다.

| 상태 | 의미 |
|---|---|
| `enforced` | 유효한 대상 ID가 있고 HOME 사본이 없는 보호된 Claude, 또는 탐색/도구 차단과 런타임 스레드 검사를 갖춘 네이티브 Codex입니다. 런타임 계약이 실패하면 디스패치를 중단합니다. |
| `best-effort` | 보호된 텍스트 프로필이 없는 런타임, 유효하지 않은 대상 ID, 또는 Claude의 HOME 사본이 있는 경우입니다. 격리가 검증되지 않았습니다. |
| `unavailable` | HOME 기반 벤더입니다(예: `~/.gemini/antigravity-cli/skills`를 읽는 **antigravity**). 깨끗한 cwd로는 감출 수 없습니다. 경고를 출력하고 결과를 신뢰도 낮음으로 표시합니다. |
| n/a | mock 모드입니다. 라이브 디스패치가 없습니다. |

다른 런타임 프로필은 탐색용 평가에 계속 쓸 수 있지만, `best-effort`와 `unavailable` 결과는 라이브 최적화의 승격을 막습니다. 평가 벤더는 프로젝트의 모델 설정을 따릅니다. Codex는 `app-server` 위에서 네이티브 CLI 로그인과 설정된 모델/제공자를 사용하며, 조용히 Claude나 API 키 클라이언트로 바꾸지 않습니다. 보호된 Codex 계약은 macOS/Linux에서 네이티브 파일 자격 증명 저장소와 기존 `auth.json`이 있는 CLI 0.154.x를 대상으로 합니다. 비공개 임시 설정 홈은 원본 설정/인증 파일을 참조하되 공유 부트스트랩 상태는 제외하며, 자격 증명은 복사하지 않고 네이티브 갱신은 원본 인증 파일을 사용합니다. 키링, 자동(auto), 임시(ephemeral) 자격 증명 저장소는 현재 지원하지 않습니다. 지원하지 않는 버전, 저장 방식, 계약 실패는 디스패치 오류가 됩니다.

judge는 새 임시 디렉토리에서 최적화 메모리를 끈 채 실행됩니다. Claude와 Codex judge는 평가 갈래와 같은 보호된 텍스트 전송 경로를 씁니다. judge 벤더 설정은 그 실행 동안 고정됩니다.

### --live --record

라이브 갈래를 실행하고 캡처한 출력(judge 체커 태스크의 judge 판정 포함)을 `_rollouts/<hash>.json`에 씁니다. 파일명은 태스크 ID 집합의 결정론적 SHA-256 해시이며, 날짜나 난수 기반이 아닙니다.

이후 재생을 오프라인으로 유지하려면 자기 머신에서 이 명령으로 `--mock` 실행의 씨앗을 만드세요.

각 항목은 나중에 재생할 때 아직 유효한지 판단할 수 있도록 출처 정보를 담습니다.

| 필드 | 기록 대상 | 비교 대상 |
|---|---|---|
| `skillBodyHash` | `treatment`만 | 평가 중인 SKILL.md 본문 |
| `promptHash` | 두 갈래 모두 | 픽스처의 현재 `prompt` |
| `taskHash` | 두 갈래 모두 | 전체 태스크, 실제 적용되는 체커/기본 judge 루브릭, `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | 두 갈래 모두(`--trials` > 1) | 한 번의 반복에서 나온 baseline과 treatment를 짝짓는 값입니다. 시행이 한 번이면 없습니다. |
| `judgeResponse` | judge 태스크 | 저장된 `score`를 감사할 수 있도록 남겨 두는, 엔벨로프를 푼 judge의 판정 텍스트(길이 제한 있음) |

갈래 출력은 답변 텍스트로 기록합니다. 벤더 CLI가 JSON 결과 엔벨로프를 반환하면 `result` 필드를 저장하고 채점하며, 엔벨로프의 부가 정보는 `assert`/`regex` 체커가 매칭하거나 judge 파서가 읽는 일이 없습니다.

baseline 갈래는 스킬을 빼고 돌리므로 SKILL.md만 고쳐서는 그 기록이 무효화되지 않습니다. 태스크나 평가자 계약이 바뀌면 두 갈래 모두 무효가 됩니다. live 기록은 두 갈래를 다시 모두 실행합니다.

전체 태스크/평가자 출처 정보가 도입되기 전의 기록은 `--live --record`(이웃 비교는 `--neg-transfer`도 함께)로 다시 만들어야 합니다. 옛 점수에 새 해시를 붙여도 그 점수를 검증할 수는 없습니다. 같은 계약이 최적화 스위트의 식별 정보에도 반영되므로, 갱신된 계약에서는 이전의 스위트 범위 지식을 재사용하지 않습니다. 채점기 동작, judge 프롬프트/판정 파싱, 그 밖의 암묵적인 평가자 동작이 바뀌면 `SKILL_EVAL_PROTOCOL_REVISION`을 올려 두세요.

:::caution `_rollouts/`는 로컬 전용입니다. 커밋하지 마세요
기록은 그것이 만들어진 정확한 SKILL.md 본문에만 재생됩니다. 스킬을 고치면 다음 `--mock` 실행에서 treatment 기록이 버려지므로, 커밋해 둔 기록은 SKILL.md가 바뀔 때마다 낡아지고 받아 가는 모두에게 경고를 띄웁니다. 이 디렉토리는 gitignore 대상이니 로컬에서만 기록하세요.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

성공한 live 실행의 보고서에는 baseline 및 treatment 수, `utilityLift`, `coverage: "ok"`, 격리 상태, pass/warn/fail 판정이 포함됩니다. 이후 mock 실행은 태스크 프롬프트와 treatment skill 본문이 여전히 일치하는 기록만 재사용합니다.

---

### 동시성과 디스패치 타임아웃

live 갈래, 이웃 갈래, judge 호출, 라우팅 프로브는 `OMA_SKILL_EVAL_CONCURRENCY`가 정하는 크기(기본 4, 최대 16)의 서브프로세스 풀에서 실행됩니다. 한 시행의 두 갈래는 항상 서로 분리된 빈 디렉토리에서 함께 실행되고, 먼저 시작하는 갈래는 시행마다 번갈아 바뀌며, 결과는 태스크 순서를 유지하므로 기록과 점수는 직렬 실행과 같습니다. 직렬로 실행하려면 이 변수를 1로 설정하세요.

각 live 갈래와 judge 호출은 `OMA_SKILL_EVAL_TIMEOUT_MS`(기본 180000)가 지나면 강제 종료됩니다. 한 번의 느린 응답은 답이 아니라 전송 실패이므로, 시간 초과된 디스패치는 태스크를 보고서에서 제외하기 전에 한 번 재시도합니다. 두 번째 시간 초과는 그 태스크를 제외하며(최적화에서는 해당 분할의 커버리지가 실패합니다), 정당하게 긴 답이 필요한 픽스처에는 한도를 높이세요.

## 라우팅: 스킬이 선택되는가?

`utilityLift`는 본문이 로딩된 뒤 무엇을 하는지를 측정합니다. 스킬을 로딩할지는 벤더가 프론트매터의 `description`을 보고 정하므로, 더 나은 본문이라도 한 번도 선택되지 않으면 개선이 아닙니다. `--routing`은 태스크 프롬프트를 설치된 모든 스킬의 이름과 설명과 함께 같은 보호된 모델에 보내, 로딩할 스킬 하나(또는 `NONE`)를 고르게 합니다. 대상 스킬이 선택되면 활성화(activation), 다른 스킬이 선택되면 오라우팅(misroute), `NONE`이면 미선택(miss)입니다.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

JSON 보고서에는 `status`, 개수, `activationRate`, `misroutedTo`, `catalogSize`를 담은 `routing`이 들어가며, `findings`의 각 항목에는 `routing: target | other | none | unparsed`가 들어 있습니다. `--record`를 쓰면 선택 결과가 카탈로그 해시와 함께 `_rollouts/<hash>.routing.json`에 저장됩니다. 이후의 `--mock --routing`은 모든 description과 태스크가 그대로일 때만 이를 재생하며, 그렇지 않으면 `status`가 `stale`이 되고 아무것도 집계하지 않습니다.

이 측정은 보호된 전송 경로에서 description을 카탈로그와 견주어 평가합니다. 보호된 프로필이 의도적으로 끄는 벤더 자체의 탐색 메커니즘은 사용하지 않으며, 로딩된 스킬의 절차가 지켜지는지도 측정하지 않습니다. 그것은 여전히 유용성 측정의 몫입니다.

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
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## 보고서 읽기

**텍스트 출력:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

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
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage`는 채점된 갈래에서 벤더가 보고한 값과 그 갈래의 judge 호출에서 보고한 값을 따로 합산합니다. 디스패치 횟수, 입력 토큰과 출력 토큰(캐시 읽기·쓰기 포함), USD 비용이 들어갑니다. `status`는 모든 디스패치가 사용량을 보고하면 `actual`, 일부만 보고하면 `partial`, 하나도 보고하지 않으면 `unknown`입니다(Codex 브리지 같은 텍스트 전용 전송 경로는 아무것도 보고하지 않습니다). 기록된 롤아웃은 항목마다 `usage`와 `judgeUsage`를 담고 있으므로, mock 재생은 0이 아니라 재사용하는 기록의 비용을 보고합니다.

`repeatability`는 태스크 수준의 변동과 재실행 변동을 구분합니다. `liftCi95`는 태스크별 lift를 짝지어 계산한 95% t 신뢰구간입니다(채점된 태스크가 2개 미만이면 null). `--trials`가 2 이상이면 `withinTaskStdDev`는 시행별 lift의 태스크별 표준편차를 평균한 값이며, `status`는 구간이 lift가 있는 쪽에서 0을 포함하지 않을 때만 `stable`입니다. 그렇지 않으면 `unstable`이고 `pass`는 `warn`으로 강등됩니다. 시행이 한 번인 실행은 `single-trial`을 보고합니다. lift를 보일 수는 있어도 그 lift가 반복된다는 것은 보일 수 없습니다.

`ok`는 `coverage === "ok"`이고 `decision === "pass"`이며 요청한 음의 전이 검사가 충분한 커버리지를 갖췄을 때만 `true`입니다. `isolation` 필드는 baseline 갈래가 정말로 대상 스킬 없이 돌았는지 알려 줍니다([스킬 격리](#skill-isolation-keeping-the-baseline-honest) 참고). `--mock` 모드에서는 `isolation`이 `"n/a"`입니다.

---

## CI 통합

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

종료 코드:
- `0`: pass 또는 warn
- `1`: fail, 또는 `--require-coverage`와 함께 태스크/음의 전이 커버리지 부족

---

## live와 mock 선택하기

열린 형태의 태스크에서 실제 유용성을 측정할 때는 judge 체커와 함께 `--live`를 사용합니다. `--mock`은 이전에 기록한 judge 판정을 오프라인으로 재생하거나 결정론적 `assert`/`regex` 계약 검사를 실행할 때 사용합니다.

mock의 결정성은 `--live --record` 도중 judge의 이진 판정(PASS/FAIL)을 롤아웃 항목에 기록해 두고, 이후 `--mock` 실행에서 그 점수를 재생하는 방식으로 유지합니다. LLM을 다시 호출하지 않습니다.

**데이터 유출 관련:** `--live` 중에는 judge가 후보 갈래의 출력을 채점을 위해 설정된 벤더로 보냅니다. 라이브 실행을 시작할 때마다 한 번씩 경고를 출력합니다.

mock 실행이 커버리지 부족을 보고하면 폐기되었거나 누락된 `_rollouts` 항목에 관한 경고를 확인한 뒤 픽스처 또는 스킬을 수정하고 live 기록을 다시 실행하세요. 라이브 승격에는 `isolation: "enforced"`로 동작하는 보호된 Claude 또는 Codex 프로필이 필요하며, 다른 프로필은 탐색용으로 남습니다.

---

## 스킬과 함께 평가 태스크 배포하기

스킬은 `.agents/eval/<skill>/`에 픽스처를 두는 방식으로 평가 태스크 세트를 함께 배포할 수 있습니다. 이 파일은 스킬 디렉토리 밖에 있는 사용자 작성 파일이므로 `oma update`에도 살아남습니다. `oma-skill-creation`로 새 스킬을 만들 때 대응하는 `eval/` 픽스처 세트를 함께 추가하면, 이후 작성자가 스킬의 효과를 검증할 수단을 갖게 됩니다. 스킬 작성 워크플로우는 `.agents/skills/oma-skill-creation/SKILL.md`를 참고하세요.
