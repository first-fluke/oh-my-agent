---
title: "스킬 최적화"
description: oma skills opt로 SKILL.md 편집을 반복 제안하고 held-out 검증 분할에서 수락하며, 측정된 유용성 향상을 최대화하는 방법을 다룹니다.
---

# 스킬 최적화

`oma skills opt`는 `oma skills eval`이 산출하는 `utilityLift`를 최대화하도록 스킬의 `SKILL.md`를 최적화합니다. 이 명령은 스킬 문서를 얼어붙은 에이전트의 학습 가능한 "외부 상태"로 다룹니다. 최적화 LLM이 범위가 제한된 추가·삭제·교체 편집을 제안하면, 각 편집을 후보 사본에 적용하고 평가 하네스로 다시 채점한 뒤, **held-out 검증 향상이 확실히 커질 때만 수락**해 음의 전이로 인한 퇴행을 막습니다. 배포 시점에는 추론 비용이 전혀 들지 않습니다. 결과물은 더 나은 `SKILL.md` 하나뿐입니다.

연구 근거는 SkillOpt, *Executive Strategy for Self-Evolving Agent Skills*(arXiv:2605.23904, MSRA)입니다.

---

## 필수 의존성: 평가 태스크 픽스처

`oma skills opt`는 평가 태스크 픽스처 없이는 돌지 않습니다. `.agents/eval/<skill>/`에 **태스크 픽스처가 최소 5개**(`MIN_TASKS = 5`) 있어야 합니다. 그보다 적으면 즉시 오류를 냅니다.

```
[oma skills opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

`.agents/eval/<skill>/` 디렉토리 규칙, 픽스처 스키마, 체커 종류, mock 재생을 위한 롤아웃 준비 방법은 [스킬 유용성 평가 가이드](/docs/guide/skill-eval)를 참고하세요.

---

## 동작 방식

픽스처는 **train 세트**와 **held-out 검증 세트**로 결정론적으로 나뉩니다(기본 50대 50, `OPT_TRAIN_VAL_SPLIT = 0.5`로 조절). 분할은 실행할 때마다 동일합니다. 나누기 전에 태스크를 ID로 정렬하므로 무작위성이 개입하지 않습니다.

에폭마다(`--max-epochs`까지, 기본 8회) 다음을 수행합니다.

1. **현재 최선의 `SKILL.md`를 TRAIN 분할에서 채점합니다.** `oma skills eval`이 태스크별 향상을 포함한 결과를 반환합니다.
2. **최적화 LLM이 후보 편집을 K개 제안합니다**(`--edits-per-epoch`까지, 기본 4개). 이미 거부된 편집 버퍼에 있는 편집은 건너뜁니다.
3. **각 후보 편집에 대해:**
   - 편집을 메모리상의 `SKILL.md` 사본에 적용합니다.
   - 후보를 검증합니다(프론트매터의 `name`과 `description`이 살아 있어야 하고, 본문이 파싱돼야 합니다).
   - 텍스트 학습률 예산을 강제합니다. 순 문자 변화가 `--lr`(기본 600자)를 넘는 편집은 버립니다.
   - 후보를 **held-out 검증 분할**에서 다시 채점합니다.
4. **최선의 후보를 수락하는 조건은** 검증 향상이 확실히 커지고(`Δlift > 0`) 음의 전이 항목이 퇴행 하한(`NEG_TRANSFER_FAIL = -0.1`)을 넘지 않는 경우뿐입니다. 거부된 에폭에서 제안된 편집은 모두 거부 버퍼에 들어갑니다.
5. **수락된 편집이 없는 에폭이 2회 연속되면 조기 종료합니다**(`OPT_EARLY_STOP_PATIENCE = 2`).

최적화기는 루프 도중 실제 `SKILL.md`를 절대 건드리지 않습니다. 항상 메모리상의 후보 사본에서만 작업합니다.

---

## 사용법

```
oma skills opt --skill <id>
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
| `--dry-run` | **기본값** | 편집을 제안하고 diff를 출력하며, 아무것도 쓰지 않습니다. |
| `--apply` | 없음 | 수락된 편집을 `SKILL.md`에 적용합니다. 쓰기 전에 원본을 `SKILL.md.bak`으로 백업합니다. 검증된 개선이 있을 때만 실행됩니다. |
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
# Propose edits (dry-run, mock mode — writes nothing, fully offline)
oma skills opt --skill oma-scholar --mock --dry-run
```

출력 예시입니다.

```
[oma skills opt] skill: oma-scholar, tasks: 8 (train: 4, val: 4), dry-run: true

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

diff는 최적화기가 쓰려는 내용을 보여줍니다. `--dry-run`에서는 아무것도 저장하지 않습니다.

---

## 검증된 개선 적용하기

제안된 diff가 마음에 들면 `--apply`로 다시 실행하세요.

```bash
# Apply accepted edits (backs up original as SKILL.md.bak)
oma skills opt --skill oma-scholar --mock --apply
```

`--apply`는 최적화가 held-out 검증 분할에서 확실한 양의 개선을 찾았을 때만 파일을 씁니다. 쓰기 전에 원본 `SKILL.md`를 `.bak`으로 백업합니다. 무엇이 바뀌었는지 검토할 수 있도록 diff는 항상 출력합니다.

---

## 라이브 모드

라이브 모드는 실제 최적화 LLM을 호출하고 에폭마다 라이브 평가 갈래를 다시 돌립니다. 비용이 큽니다. 에폭마다 검증 태스크별로 평가 갈래 두 개(baseline과 treatment)를 돌리고, 여기에 최적화 LLM 호출이 더해집니다.

```bash
# Cost preview + confirm
oma skills opt --skill oma-scholar --live

# Skip confirmation
oma skills opt --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skills opt --skill oma-scholar --live --apply --yes
```

비용 미리보기는 LLM을 호출하기 전에 태스크 수, 에폭 수, 예상 갈래 디스패치 수, 해석된 벤더를 나열합니다.

---

## JSON 출력

```bash
oma skills opt --skill oma-scholar --json
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
  "_split": { "trainCount": 4, "valCount": 4 }
}
```

최종 향상이 baseline을 넘거나 `applied`가 `true`이면 `ok`가 `true`입니다.

---

## `oma-*` 스킬의 SSOT 유의 사항

ID가 `oma-`로 시작하는 스킬은 oh-my-agent가 소유하며 **`oma update`가 덮어씁니다**. 이런 스킬에는 `--apply`를 권장하지 않습니다. 기본값인 `--dry-run`으로 제안된 diff를 검토하고, 개선이 의미 있다면 레지스트리에 업스트림으로 반영하세요. 사용자가 직접 만든 스킬에는 `--apply`가 안전합니다.

대상 스킬이 oma 소유일 때는 다음과 같이 경고를 출력합니다.

```
[oma skills opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## 과적합 방지

최적화기는 편집을 제안할 때 TRAIN 분할의 롤아웃 결과만 봅니다. **수락 게이트는 항상 held-out VALIDATION 분할을 씁니다.** 학습 세트의 향상은 키우지만 held-out 세트에서 퇴행하는 편집은 거부합니다. train과 validation 향상을 모두 보고하므로 과적합이 눈에 보입니다.

---

## CI 통합

`--mock` 모드에서 `oma skills opt`는 완전히 결정론적이고 오프라인이며 LLM을 호출하지 않습니다. 제안된 스킬 diff가 기록된 롤아웃 대비 여전히 향상을 보이는지 CI에서 확인할 때 쓰세요.

```bash
oma skills opt --skill oma-scholar --mock --json
```

종료 코드:
- `0`: 최적화가 완료됨 (개선 여부와 무관)
- `1`: 픽스처가 `MIN_TASKS`보다 적거나 `--skill` 인자가 잘못됨

---

## 함께 보기

- [스킬 유용성 평가](/docs/guide/skill-eval): 태스크 픽스처 작성, 체커 종류, mock과 live 모드, `_rollouts/` 디렉토리.
- [CLI 명령](/docs/cli-interfaces/commands): 모든 스킬 관리 명령의 플래그 레퍼런스.
