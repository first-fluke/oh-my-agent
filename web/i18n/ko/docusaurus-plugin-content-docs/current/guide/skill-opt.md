---
title: "스킬 최적화"
description: oma skill opt로 train, validation, 실행기 전용 final-test 게이트를 거치는 영속적 근거 기반 스킬 진화를 수행하는 방법을 다룹니다.
---

# 스킬 최적화

`oma skill optimize`는 `oma skill eval`이 산출하는 `utilityLift`를 최대화하도록 스킬의 `SKILL.md`를 진화시킵니다. 원시 롤아웃 근거, 범위가 지정된 영속 지식, 실행 가능한 스킬을 분리합니다. Wiki Maintainer가 관측 가능한 성공과 실패를 통합하고, Proposer가 그 지식으로 제한된 추가·삭제·교체 편집을 제안합니다. 후보는 held-out 검증 유용성을 높여야 하며, `--apply`에는 실행기 전용 최종 테스트의 향상도 필요합니다. 배포 시에는 별도의 wiki 조회 비용 없이 결과가 `SKILL.md`에 남습니다.

연구 근거: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

---

## 필수 의존성: 평가 태스크 픽스처

`oma skill optimize`는 평가 태스크 픽스처 없이는 돌지 않습니다. `.agents/eval/<skill>/`에 **태스크 픽스처가 최소 5개**(`MIN_TASKS = 5`) 있어야 합니다. 그보다 적으면 즉시 오류를 냅니다.

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

`.agents/eval/<skill>/` 디렉토리 규칙, 픽스처 스키마, 체커 종류, mock 재생을 위한 롤아웃 준비 방법은 [스킬 유용성 평가 가이드](/docs/guide/skill-eval)를 참고하세요.

---

## 동작 방식

픽스처는 **train**, **held-out validation**, **실행기 전용 final-test** 세트로 결정론적으로 나뉩니다(60/20/20). 나누기 전에 태스크를 ID로 정렬하므로 실행할 때마다 분할이 같고 무작위성이 개입하지 않습니다.

에폭마다(`--max-epochs`까지, 기본 8회) 다음을 수행합니다.

1. **현재 최선의 `SKILL.md`를 TRAIN 분할에서 채점합니다.** `oma skill eval`이 관측 가능한 태스크별 프롬프트, 출력, 향상을 반환합니다.
2. **Wiki Maintainer가 근거를 통합합니다.** 실패는 최대 5개, 성공은 최대 3개까지 근거가 연결된 패턴이 되며, OMA L1/L2/L3 메모리에서 범위가 맞는 패턴과 이전 게이트 결과를 회수합니다.
3. **Proposer가 후보 편집을 K개 냅니다**(`--edits-per-epoch`까지, 기본 4개). 영속 거부 이력의 동일 편집은 건너뜁니다.
4. **각 후보 편집에 대해:**
   - 편집을 메모리상의 `SKILL.md` 사본에 적용합니다.
   - 후보를 검증합니다(프론트매터의 `name`과 `description`이 살아 있어야 하고, 본문이 파싱돼야 합니다).
   - 텍스트 학습률 예산을 강제합니다. 순 문자 변화가 `--lr`(기본 600자)를 넘는 편집은 버립니다.
   - 후보를 **held-out 검증 분할**에서 다시 채점합니다.
5. **최선의 검증 후보를 수락하는 조건은** 검증 향상이 확실히 커지고(`Δlift > 0`) 음의 전이 항목이 퇴행 하한(`NEG_TRANSFER_FAIL = -0.1`)을 넘지 않는 경우뿐입니다. 모든 제안 게이트는 영속화됩니다.
6. **수락된 편집이 없는 에폭이 2회 연속되면 조기 종료합니다**(`OPT_EARLY_STOP_PATIENCE = 2`).
7. **진화가 끝난 뒤 숨겨진 최종 테스트를 실행합니다.** Maintainer와 Proposer는 이 태스크를 볼 수 없습니다. 최종 테스트가 실패하면 `--apply`를 막고 검증 승자를 거부 지식으로 기록합니다.

최적화기는 루프 도중 실제 `SKILL.md`를 절대 건드리지 않습니다. 항상 메모리상의 후보 사본에서만 작업합니다.

---

## 사용법

```
oma skill optimize --skill <id>
               [--dry-run | --apply]
               [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### 플래그

| 플래그 | 기본값 | 설명 |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | 최적화할 스킬 ID(단순 이름이며 경로 구분자를 쓰지 않습니다). |
| `--dry-run` | **기본값** | 편집과 diff를 제안하되 `SKILL.md`는 바꾸지 않습니다. 생성된 근거와 진화 이벤트는 영속화합니다. |
| `--apply` | 없음 | 수락된 편집을 `SKILL.md`에 적용합니다. 원본을 백업한 뒤 원자적으로 쓰며, 검증과 최종 테스트 게이트가 모두 통과할 때만 실행됩니다. |
| `--mock` | **기본값** | `_rollouts/`에 기록된 최적화 편집과 평가 판정을 재생합니다. 결정론적이고 오프라인이며 CI에서 안전합니다. |
| `--live` | 없음 | 실제 LLM 최적화를 디스패치합니다. 에폭마다 실제 모델 호출이 발생합니다. 비용 미리보기를 출력하고 `--yes`가 없으면 확인을 받습니다. |
| `--max-epochs <n>` | `8` | 최대 최적화 에폭 수. |
| `--edits-per-epoch <k>` | `4` | 최적화 LLM이 에폭당 제안하는 후보 편집 수. |
| `--lr <chars>` | `600` | 텍스트 학습률 예산으로, 수락된 편집당 순 문자 변화의 상한입니다. |
| `--yes` | 없음 | 비용 미리보기 확인을 생략합니다. `--live`와 함께일 때만 의미가 있습니다. |
| `--json` | 없음 | CI/CD용 JSON으로 출력합니다. |
| `--output <format>` | `text` | 출력 형식 (`text` 또는 `json`). |

---

## 최소 실행 예제

```bash
# Propose edits (dry-run, mock mode — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run
```

출력 예시입니다.

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 4), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 18.5%  finalLift: 32.0%
  epochs: 3  acceptedEdits: 2  rejected: 6

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

diff는 최적화기가 쓰려는 내용을 보여줍니다. `--dry-run`에서는 `SKILL.md`를 바꾸지 않지만, 다음 실행을 위한 진화 근거와 게이트 결과는 저장합니다.

---

## 검증된 개선 적용하기

제안된 diff가 마음에 들면 `--apply`로 다시 실행하세요.

```bash
# Apply accepted edits (backs up original as SKILL.md.bak)
oma skill optimize --skill oma-scholar --mock --apply
```

`--apply`는 held-out 검증과 실행기 전용 최종 테스트에서 모두 확실한 양의 개선을 찾았을 때만 파일을 씁니다. 원본을 백업한 뒤 원자적으로 쓰며, 무엇이 바뀌었는지 검토할 수 있도록 diff를 항상 출력합니다.

---

## 라이브 모드

라이브 모드는 실제 Maintainer와 Proposer를 호출하고 에폭마다 라이브 평가 갈래를 다시 돌립니다. 채점 태스크마다 baseline과 treatment 호출이 있고, judge 픽스처에는 채점 호출이 추가되며, 최종 테스트는 원본과 후보를 각각 채점합니다. 비용 미리보기는 실제 분할을 바탕으로 하위 모델 호출 상한을 보여줍니다. 각 호출의 제한 시간은 120초이며, Claude 평가 갈래에서는 주변 도구, 스킬, MCP, AgentMemory를 차단합니다.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

비용 미리보기는 LLM을 호출하기 전에 하위 모델 호출 수의 상한을 표시합니다.

---

## JSON 출력

```bash
oma skill optimize --skill oma-scholar --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.1850,
  "finalLift": 0.3200,
  "epochCount": 3,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 6,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": { "baselineLift": 0.10, "candidateLift": 0.25, "passed": true },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

검증 향상이 있고 실행기 전용 최종 테스트가 실패하지 않았을 때만(또는 후보가 적용됐을 때) `ok`가 `true`입니다.

---

## `oma-*` 스킬의 SSOT 유의 사항

ID가 `oma-`로 시작하는 스킬은 oh-my-agent가 소유하며 **`oma update`가 덮어씁니다**. 이런 스킬에는 `--apply`를 권장하지 않습니다. 기본값인 `--dry-run`으로 제안된 diff를 검토하고, 개선이 의미 있다면 레지스트리에 업스트림으로 반영하세요. 사용자가 직접 만든 스킬에는 `--apply`가 안전합니다.

대상 스킬이 oma 소유일 때는 다음과 같이 경고를 출력합니다.

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## 과적합 방지

Maintainer와 Proposer는 TRAIN 롤아웃 근거만 봅니다. 후보 선택은 held-out VALIDATION 분할을 쓰고, 실행기 전용 TEST 분할은 진화가 끝날 때까지 숨깁니다. 검증 승자가 최종 테스트를 개선하지 못하면 적용하지 않고 영속 거부 이력에 추가합니다.

---

## CI 통합

`--mock` 모드에서 `oma skill optimize`는 완전히 결정론적이고 오프라인이며 LLM을 호출하지 않습니다. 제안된 스킬 diff가 기록된 롤아웃 대비 여전히 향상을 보이는지 CI에서 확인할 때 쓰세요.

```bash
oma skill optimize --skill oma-scholar --mock --json
```

종료 코드:
- `0`: 최적화가 완료됨 (개선 여부와 무관)
- `1`: 픽스처가 `MIN_TASKS`보다 적거나 `--skill` 인자가 잘못됨

---

## 함께 보기

- [스킬 유용성 평가](/docs/guide/skill-eval): 태스크 픽스처 작성, 체커 종류, mock과 live 모드, `_rollouts/` 디렉토리.
- [CLI 명령](/docs/cli-interfaces/commands): 모든 스킬 관리 명령의 플래그 레퍼런스.
