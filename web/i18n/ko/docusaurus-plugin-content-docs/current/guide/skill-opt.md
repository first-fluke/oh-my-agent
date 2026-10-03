---
title: "스킬 최적화"
sidebar_label: 스킬 최적화
description: 결정론적 train, validation, 실행기 전용 holdout 게이트를 거치는 영속적 근거 기반 스킬 진화를 위해 oma skill optimize를 사용하는 방법을 다룹니다.
---

# 스킬 최적화

`oma skill optimize`는 `oma skill eval`이 산출하는 `utilityLift`를 최대화하도록 스킬의 `SKILL.md`를 진화시킵니다. 원시 롤아웃 근거, 범위가 지정된 영속 지식, 실행 가능한 스킬을 분리합니다. Wiki Maintainer가 관측 가능한 성공과 실패를 통합하고, Proposer가 그 지식으로 제한된 추가·삭제·교체 편집을 제안합니다. 후보는 학습 또는 검증 유용성을 높이면서 어느 분할에서도 퇴행하지 않아야 하고, 태스크와 음의 전이 측정이 완전해야 합니다. `--apply`에는 완전히 측정되어 퇴행하지 않은 실행기 전용 최종 테스트와 검증된 라이브 격리도 필요합니다. 배포 시에는 별도의 wiki 조회 비용 없이 결과가 `SKILL.md`에 남습니다.

연구 근거: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

현재 CLI 최적화는 `--live`가 필요하며 모델 호출이 발생합니다. 기본(비라이브) 경로와 `--mock`은 기록된 제안을 불러오는 로더가 구현되어 있지 않아 제안을 생성하거나 재생할 수 없으므로 평가 전에 멈춥니다. 오프라인 재생에는 `oma skill eval --mock`을 쓰세요. 주입형 optimizer/scorer API는 오프라인 테스트용으로 계속 쓸 수 있습니다. `--live`와 `--mock`을 함께 지정하면 오류입니다.

---

## 필수 의존성: 평가 태스크 픽스처

`oma skill optimize`는 평가 태스크 픽스처 없이는 돌지 않습니다. `.agents/eval/<skill>/`에 **태스크 픽스처가 최소 5개**(`MIN_TASKS = 5`) 있어야 합니다. 그보다 적으면 즉시 오류를 냅니다.

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

`.agents/eval/<skill>/` 디렉토리 규칙, 픽스처 스키마, 체커 종류, mock 재생을 위한 롤아웃 준비 방법은 [스킬 유용성 평가 가이드](/docs/guide/skill-eval)를 참고하세요.

승격에는 다른 스킬에 속한 동일 도메인 이웃 태스크가 하나 이상 필요합니다. 후보의 검증 점수와 최종 후보 점수는 모두, 해당 점수를 평가한 분할의 이웃 태스크를 정확히 그 후보 본문으로 측정해야 합니다. 이웃 태스크가 없거나 짝지은 기록이 불완전하면 음의 전이가 없다는 것을 입증할 수 없습니다. 오프라인 평가는 일치하는 후보 기록만 재생할 수 있으므로, 새 후보를 생성하고 평가하려면 라이브 최적화를 쓰세요.

재생과 스위트 범위 지식은 실제 적용되는 기본 judge 루브릭과 채점기 프로토콜 리비전을 포함한 전체 태스크/평가자 계약에 묶여 있습니다. 이 출처 정보 업그레이드 이후에는 이전 기록과 이전 지식 범위에 새 근거가 필요하며, 옛 점수에 새 해시를 붙여 다시 표시해도 유효한 측정이 되지 않습니다.

---

## 동작 방식

픽스처는 task ID로 정렬한 뒤 **train**, **held-out validation**, **실행기 전용 final-test** 세트로 결정론적으로 나뉩니다. 픽스처가 5개 이상이면 목표 비율은 60/20/20이며 모든 partition에 최소 하나의 task가 있습니다. 예를 들어 픽스처가 8개이면 반올림 후 train 4개, validation 1개, final-test 3개 태스크가 됩니다. 같은 `group`을 선언한 픽스처는 함께 배정되므로, 표현만 바꾼 형제 픽스처가 train에 있는데 원본이 final-test에 있는 일은 생기지 않습니다. group이 3개 미만이면 task ID 기준 분할로 되돌아가며 경고합니다. final-test task는 이 local fixture set에서 나오며 Maintainer와 Proposer에게는 제공되지 않습니다. final-test task ID가 중복되거나 개발 분할과 겹치면 거부합니다.

에폭마다(`--max-epochs`까지, 기본 8회) 다음을 수행합니다.

1. **현재 최선의 `SKILL.md`를 TRAIN 분할에서 채점합니다.** `oma skill eval`이 관측 가능한 태스크별 프롬프트, 출력, 향상을 반환합니다. 내부 분할의 모든 태스크에는 채점된 두 갈래가 모두 있어야 하며, 실패했거나 빠진 비교로 분모를 줄일 수는 없습니다.
2. **Wiki Maintainer가 근거를 통합합니다.** 실패는 최대 5개, 성공은 최대 3개까지 근거가 연결된 패턴이 됩니다. 실패는 학습 가치에 따라 고릅니다. 퇴행한 태스크가 먼저이고, 그다음은 두 갈래가 모두 실패한 태스크 중 실패가 가장 깊은 것입니다. 두 갈래가 이미 통과한 태스크는 다음 편집을 정하는 데 아무 단서도 주지 못하므로 제외합니다. 성공은 향상 순으로 순위를 매깁니다. OMA L1/L2/L3 메모리에서 범위가 맞는 패턴과 이전 게이트 결과를 회수합니다.
3. **Proposer가 후보 편집을 K개 냅니다**(`--edits-per-epoch`까지, 기본 4개). 영속 거부 이력의 동일 편집은 건너뜁니다.
4. **각 후보 편집에 대해:**
   - 편집을 메모리상의 `SKILL.md` 사본에 적용합니다.
   - 후보를 검증합니다(프론트매터의 `name`과 `description`이 살아 있어야 하고, 본문이 파싱돼야 합니다).
   - 텍스트 학습률 예산을 강제합니다. 순 문자 변화가 `--lr`(기본 600자)를 넘는 편집은 버립니다.
   - **held-out 검증 분할**의 모든 태스크(이웃 태스크는 baseline/후보를 짝지은 비교 포함)와 **held-in 학습 분할**의 모든 태스크(이웃 태스크 비교 없음)를 다시 채점합니다.
5. **유효한 최선의 후보를 수락합니다.** held-in/held-out 규칙에 따라 후보가 어느 분할에서도 잃는 것이 없고(`Δval ≥ 0`이고 `Δtrain ≥ 0`) 둘 중 하나 이상에서 얻는 것이 있어야 합니다. 후보는 `Δval + Δtrain` 순으로 순위를 매깁니다. 검증 향상이 반드시 엄격하게 커야 하는 것은 아닙니다. 검증 태스크를 이미 모두 통과하는 본문도 held-out 쪽 성과를 잃지 않고 학습 실패를 고칠 수 있기 때문이며, 그 수정이 일반화되는지는 최종 테스트가 가립니다. 태스크 커버리지가 완전해야 하고, 비어 있지 않은 음의 전이 샘플이 완전히 측정되어야 하며, `NEG_TRANSFER_FAIL = -0.1` 이하로 확인된 퇴행을 보이는 이웃 태스크가 없어야 합니다. 라이브 실행에서는 첫 짝지은 비교에서 퇴행한 이웃 태스크를 한 번 다시 측정하며, 기록되는 델타는 두 비교의 평균이고 재현된 퇴행(`confirmed: true`)만 후보를 거부합니다. mock 재생은 다시 측정할 수 없으므로 한 번의 시행에서 나온 퇴행이 그대로 인정됩니다. 라이브 보고서는 `isolation: "enforced"`를 선언해야 합니다. 제안 게이트 결과는 `deltaLift`(검증), `deltaTrainLift`, 판정의 근거가 된 이웃 태스크 델타와 함께 기록됩니다.
6. **수락된 편집이 없는 에폭이 2회 연속되면 조기 종료합니다**(`OPT_EARLY_STOP_PATIENCE = 2`).
7. **진화가 끝난 뒤 실행기 전용 최종 테스트를 실행합니다.** 원래 본문과 검증 승자 모두 final-test 태스크 전체의 점수를 갖춰야 합니다. 후보는 final-test lift를 잃어서는 안 됩니다(`candidateLift >= baselineLift`). 후보가 수락된 이유인 향상은 이미 개발 분할에서 확인했고, 작은 고정 테스트에서 엄격한 향상까지 요구하면 대부분의 수정이 승격될 수 없기 때문입니다. 후보 전용으로 완전한 음의 전이 검사도 한 번 더 통과해야 합니다. `finalTest.findings`는 원래 본문과 후보의 태스크별 lift를 나열하므로, 실패한 테스트가 진짜 퇴행인지 노이즈가 낀 태스크 하나 때문인지 읽어 낼 수 있습니다. 최종 테스트가 없거나 불완전하거나 실패하면 승격할 수 없습니다. 측정된 최종 실패는 감사 기록으로 남고, 이후 최적화의 거부 지식이 되지는 않습니다.

최적화기는 루프 도중 메모리상의 후보 사본에서 작업합니다.

측정되지 않은 후보는 `insufficient-coverage`, `negative-transfer-unmeasured`, `unverified-isolation` 같은 사유와 함께 `inconclusive`로 기록됩니다. 이런 후보는 학습된 거부 이력에서 제외되며, 평가 조건을 바로잡은 뒤 다시 시도할 수 있습니다. 확인된 이웃 태스크 퇴행, 어느 한 분할에서 점수를 잃는 경우(`split-regression`), 어느 분할에서도 향상이 없는 경우(`no-validation-lift`)는 거부입니다. 평가가 불완전하거나 Maintainer가 저하(`degraded`)되었음을 나타내는 진단은 승격을 막습니다.

---

## 사용법

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### 플래그

| 플래그 | 기본값 | 설명 |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | 최적화할 스킬 ID(단순 이름이며 경로 구분자를 쓰지 않습니다). |
| `--dry-run` | **기본값** | 편집과 diff를 제안하되 `SKILL.md`는 바꾸지 않습니다. 생성된 근거와 진화 이벤트는 영속화합니다. |
| `--apply` | 없음 | 완전한 최종 테스트와 음의 전이 근거를 포함한 모든 승격 게이트를 통과하면 검증된 후보를 씁니다. 원본을 백업한 뒤 원자적으로 쓰며, OMA 소유 스킬이면 `--yes`도 필요합니다. |
| `--mock` | 비라이브 기본값 | CLI 제안 재생은 구현되어 있지 않으므로 이 경로는 평가 전에 멈춥니다. 오프라인 평가 재생에는 `oma skill eval --mock`을 쓰세요. |
| `--live` | 없음 | 현재 CLI 최적화에 필수입니다. 실제 모델 호출이 발생하며, 비용 미리보기를 출력하고 `--yes`가 없으면 확인을 받습니다. |
| `--max-epochs <n>` | `8` | 최대 최적화 에폭 수. |
| `--edits-per-epoch <k>` | `4` | 최적화 LLM이 에폭당 제안하는 후보 편집 수. |
| `--lr <chars>` | `600` | 텍스트 학습률 예산으로, 수락된 편집당 순 문자 변화의 상한입니다. |
| `--yes` | 없음 | 라이브 비용 미리보기 확인을 생략하며, OMA 소유 스킬을 적용할 때는 덮어쓰기를 확인한 것으로 간주합니다. |
| `--json` | 없음 | CI/CD용 JSON으로 출력합니다. |
| `--output <format>` | `text` | 출력 형식 (`text` 또는 `json`). |

---

## 최소 실행 예제

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

픽스처 8개와 모든 승격 게이트를 통과하는 후보를 가정한 출력 예시입니다.

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

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
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### 아티팩트로서의 절차

최적화기와 maintainer 프롬프트가 곧 개선 절차입니다. 내장 기본값으로 배포되며 `.agents/evolution/` 아래의 파일로 덮어쓸 수 있습니다. 이 디렉토리는 사용자 소유이므로, `.agents/eval/`과 달리 설치 매니페스트가 복사하지 않고 `oma update`가 제거하지도 않습니다.

| 파일 | 역할 | 필수 플레이스홀더 |
|---|---|---|
| `optimizer.md` | 학습 근거와 영속 지식에서 SKILL.md 편집을 제안합니다 | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}`(`{{knowledge}}`도 있음) |
| `maintainer.md` | 근거를 재사용 가능한 패턴으로 통합합니다 | `{{evidence}}`, `{{priorFacts}}`(`{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`도 있음) |
| `constitution.yaml` | 루프가 절대 써서는 안 되는 영역, 메타 최적화가 바꿀 수 있는 절차 부분, 메타 실행에서 기본으로 쓰는 정답 기준 `anchors`, 디스패치 예산 | 자기 자신을 `immutable` 아래에 나열해야 합니다 |

`budget.max_dispatches_per_run`(기본값 `null`, 무제한)은 라이브 실행에서 강제됩니다. 하위 모델 호출(태스크 갈래, 이웃 갈래, judge, 최적화기, maintainer)은 하나당 1단위씩 차감하고, 한도를 넘게 될 호출은 실행되기 전에 거부합니다. 그러면 루프가 `budget:exhausted` 진단과 함께 멈추고, 최종 테스트는 건너뛰며, 승격은 차단되고, 결과에 `budget: { limit, used }`가 보고됩니다. 어느 쪽이든 사용량은 실행 요약에 기록되므로, 절차를 향상뿐 아니라 비용으로도 비교할 수 있습니다.

`oma skill procedure`는 현재 적용 중인 출처와 해시를 출력하며, `--export`는 기본값을 편집용으로 내보내되 기존 파일은 덮어쓰지 않습니다. 필수 플레이스홀더를 빠뜨린 템플릿은 조용히 품질이 떨어지는 대신 거부됩니다. 모든 실행은 `procedure`(부분별 해시와 통합 해시)와 `memory`를 결과, 실행 요약, 승격 계보에 기록하므로, 한 절차에서 나온 근거가 다른 절차의 것과 혼동되는 일이 없습니다.

최적화기의 응답은 서식에 한해서만 관대하게 읽습니다. 코드 펜스와 빈 줄은 무시하지만, 유효한 `EDIT:` 줄(또는 단독 `NO_ACTION`)이 아닌 내용 줄은 모두 `parse-error`이며, 진단에는 이제 처음 어긋난 줄이 포함되므로 실패를 추적할 수 있습니다.

### 메모리 어블레이션과 장기 통계

`--memory none`은 빈 지식에서 실행을 시작하되(회수한 패턴도 게이트 이력도 없음) 그 실행은 그대로 기록합니다. 같은 예산에서 `--memory recall`(기본값) 실행과 `--memory none` 실행을 비교하는 것이 영속 지식이 도움이 되는지 가리는 검증입니다. 루프가 경험에서 학습한다는 주장에는 메모리가 존재한다는 사실이 아니라 이 비교가 필요합니다.

`oma skill evolution-stats --skill <id>`는 `.agents/results/skill-evolution/<id>/*.jsonl`에 기록된 스킬의 모든 실행을 집계합니다. 상태별 실행 수, 게이트 결과별 제안 수와 수락률, 검증된 개선(최종 테스트를 통과하고 승격 자격이 있는 경우), 적용과 롤백, 평균 최종 lift, 계측된 실행의 모델 호출 수와 검증된 개선당 호출 수(실행 하나가 아니라 과정 전체의 비용), 그리고 같은 수치를 메모리 모드별과 절차 해시별로 나눈 값이 나옵니다. 메타 최적화 보고서는 현재 절차와 각 후보의 내부 실행당 평균 호출 수를 보여 주므로, 더 많은 비용을 써서 향상에서 이긴 절차는 그렇게 드러납니다.

### 메타 최적화: 후보가 되는 절차

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live`는 최적화기(또는 maintainer) 프롬프트를 시험 대상으로 삼습니다. 먼저 지정한 held-out 스킬마다 현재 절차로 내부 루프(`oma skill optimize --dry-run`)를 `--repeats`회 실행합니다. 이어서 proposer에게 템플릿의 작은 편집을 최대 `--candidates`개 요청하고, 각 후보 아래에서 같은 `--max-epochs`와 `--edits-per-epoch` 예산으로 내부 루프를 다시 실행합니다. 그리고 내부 루프가 달성한 학습 lift와 검증 lift 향상의 합을 기준으로, 각 후보를 현재 절차와 (스킬, 반복) 단위로 짝지어 비교합니다.

후보는 다음 조건을 모두 만족할 때만 승격됩니다. 향상 차이의 짝지은 부트스트랩 95% 구간이 0보다 위에 있고(시드 고정, 리샘플 1000회), 짝이 3개 이상 있으며, 현재 절차에서 개선된 스킬 가운데 후보 절차에서 그 향상의 절반 넘게 잃는 스킬이 없어야 합니다. 평가가 막힌 내부 실행(커버리지 부족, 검증되지 않은 격리, 예산 소진)은 실패로 보고하고 짝에서 제외하므로, 장애가 한쪽 갈래의 향상 0으로 집계되는 일은 없습니다. held-out 스킬에는 개선 여지(headroom)가 있어야 합니다. 현재 본문이 이미 만점을 받는 스킬은 어떤 절차에서도 향상을 보일 수 없습니다. `--anchor`는 선택에는 절대 쓰지 않고 현재 절차와 승리한 절차에서 한 번씩 실행해 드리프트를 보여 주는 스킬을 지정합니다. 이 플래그가 없으면 constitution의 `anchors` 목록이 적용되므로, 한 번 선언한 정답 기준 집합이 모든 메타 실행에서 검사됩니다. `--apply`를 쓰면 승리한 템플릿을 `.agents/evolution/<target>.md`에 쓰며, 타임스탬프가 붙은 백업과 unified diff 패치, 그리고 `.agents/results/skill-evolution/_procedure/promotions.jsonl`의 기록을 함께 남깁니다. 이 기록에는 부모와 후보 해시, constitution 해시, 증거(스킬, 반복, 예산, 짝, 구간)가 담깁니다. `--apply`가 없으면 아무것도 쓰지 않습니다.

고정된 채로 유지되는 것: 모든 스킬의 final-test 분할은 선택 과정에서 절대 읽지 않으며(지표는 학습 향상과 검증 향상의 합), 평가자와 최적화 코드는 constitution에서 `immutable`로 나열되고, constitution 자체는 대상이 될 수 없으며, 대상은 `meta_targets`에 있어야 합니다. 내부 실행은 기본적으로 `--memory none`을 쓰므로, 절차는 이전 실행에서 회수한 지식이 아니라 자신이 만든 편집으로 평가받습니다. 한 갈래의 내부 실행은 스킬 사이에서 겹쳐 실행되지만(`OMA_META_CONCURRENCY`, 기본 최대 4) 스킬 하나의 반복은 직렬로 유지되는데, 스킬마다 근거가 자기만의 아티팩트 파일에 기록되기 때문입니다. 모든 내부 실행은 자신이 사용한 통합 절차 해시를 기록하므로, `oma skill evolution-stats`가 이후 결과를 그것을 만든 절차에 귀속시킬 수 있습니다.

이는 자기 개선 시스템에 관한 서베이가 설명하는 L5 형태입니다(Self-Harness의 held-in/held-out 승격, 부트스트랩 구간을 쓰는 ADAS의 반복 평가, AlphaEvolve처럼 고정된 평가자). 절차는 시스템이 고치지만, 바깥쪽 판정은 루프가 건드릴 수 없는 곳에 남습니다. 비용은 스킬 × 반복 × (1 + 후보)만큼의 내부 실행으로 늘어나며, 이 명령은 상한을 출력하고 `--yes`가 없으면 확인을 받습니다.

### 승격 계보

`--apply`로 쓸 때마다 `.agents/results/skill-evolution/<skill>/promotions.jsonl`에 기록이 추가되고, 그 옆의 `promotions/<candidate-hash>.patch`에 검토 가능한 unified diff가 작성됩니다. 기록에는 부모와 후보 본문의 해시, 설치 경로, 백업 경로, 그리고 쓰기를 뒷받침한 근거가 적힙니다. 검증과 최종 테스트 lift, 승격 판정, 픽스처 스위트 해시, 평가자 프로토콜 리비전, 소스/대상 런타임이 그 근거입니다. `oma skill promotions --skill <id>`는 이 로그를 나열합니다.

`oma skill rollback --skill <id>`는 가장 최근의 적용이 교체한 본문을 복원합니다. 설치된 파일이 그 적용의 후보와 더 이상 일치하지 않으면(이후에 직접 고친 내용이 버려지게 되므로), 백업이 기록된 부모와 일치하지 않으면, 또는 그 적용이 이미 롤백되었으면 거부합니다. 롤백이 성공하면 `reverses`가 그 적용을 가리키는 항목이 같은 로그에 추가됩니다. OMA 소유 스킬은 `oma update`가 설치된 사본을 덮어쓰므로, 소스 저장소나 사용자 오버레이에 가져갈 산출물은 패치입니다. 기록에는 `omaOwned: true`가 표시되어 이후의 업데이트를 퇴행으로 오해하는 일이 없습니다.

`--apply`에는 검증 손실이 없는 수락된 편집이 하나 이상 있고, `finalTest.passed: true`이며, `promotion.eligible: true`여야 합니다. 이 게이트는 내부 태스크 커버리지가 완전하고, 후보 전용 음의 전이 샘플이 비어 있지 않으며 완전히 측정되었고, 라이브 격리가 강제되었을 것을 요구합니다. 최종 테스트가 없거나 측정이 불완전하거나 컴파일러 진단이 저하되었으면 쓰기가 막힙니다. 원본 `SKILL.md`는 원자적 쓰기 전에 백업되고, 검토할 수 있도록 diff가 출력됩니다.

라이브 평가는 보호된 Claude 또는 네이티브 Codex 프로필로 격리 게이트를 충족할 수 있습니다. Claude는 HOME/대상 검사를 그대로 유지합니다. Codex는 프롬프트를 제출하기 전에 임시 app-server 스레드에 지시 출처와 도구 환경이 없는지 확인합니다. 다른 런타임 프로필은 탐색용으로 남습니다.

### 무엇이 진화했는지 보기

루프는 세 곳에서 스스로를 알리며, 모두 주장이 아니라 추가 전용(append-only) 계보 로그에서 읽어 옵니다.

- `oma skill promotions --all`은 모든 스킬과 절차에 걸친 변경마다 한 문장씩 출력합니다. 무엇이 편집되었는지(수락된 편집의 앵커와 교체 내용), 전후의 held-in 및 held-out lift, 최종 테스트를 통과했는지, 그리고 절차 승격이라면 짝지은 향상 차이와 그 구간, 측정에 쓴 스킬이 들어갑니다. `--skill <id>`를 주면 스킬 하나로 좁힙니다. 이 버전이 쓴 적용 기록에는 수락된 편집과 학습 lift가 담기며, 더 오래된 기록은 해시로 대체됩니다.
- `oma doctor`는 **Evolution** 항목을 보여 줍니다. 적용되고 롤백된 스킬 편집, 스킬별 최신 변경, 절차 승격, 그리고 피드백을 기다리는 항목(픽스처 없이 캡처된 인시던트, 아직 캡처되지 않은 실패 실행)과 그것을 처리할 명령이 나옵니다.
- 세션을 시작할 때 상태 스냅샷 훅이 `harness evolved since your last session` 블록을 주입합니다. 이 블록은 직전에 알림을 보여 준 세션 이후에 기록된 승격을 나열하며, 각 변경은 한 번만 알립니다. 마커는 `.agents/state/evolution-notice.json`에 있습니다.

예산이 정해진 피드백 사이클을 예약 실행하려면 [프로젝트 하네스 진화](./harness-evolution.md)를 활성화하세요.

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

자동 사이클은 통과한 변경을 프로젝트 오버레이로 적용하고, 미완료 작업은 재시도를 위해 남겨 두며, 사이클 전체가 하나의 디스패치 한도를 공유합니다. 기본 스케줄은 매일 현지 시각 03:00입니다. 적용 없이 평가만 하려면 `--mode propose`를, 스케줄을 멈추려면 `oma harness evolution disable`을 쓰세요. 절차 메타 최적화는 여전히 별도의 수동 명령입니다.

---

## 라이브 모드

라이브 모드는 실제 Maintainer와 Proposer를 호출하고 에폭마다 라이브 평가 갈래를 다시 돌립니다. 채점 태스크마다 baseline과 treatment 호출이 있고, judge 픽스처에는 채점 호출이 추가되며, 최종 테스트는 원본과 후보를 각각 채점합니다. 비용 미리보기는 실제 분할을 바탕으로 한 상한을 보여줍니다. 여기에는 초기 검증 baseline, 학습 및 컴파일러 호출, 후보 검증 호출, 두 번의 최종 테스트 채점, 후보마다 수행하는 짝지은 이웃 태스크 검사와 최종 후보의 같은 검사가 포함됩니다. 각 호출의 제한 시간은 120초입니다. 보호된 Claude와 Codex 갈래는 도구, 자동 지시 탐색, MCP, 최적화 메모리를 차단합니다.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

비용 미리보기는 LLM을 호출하기 전에 하위 모델 호출 수의 상한을 표시합니다.

Maintainer, Proposer, 평가 갈래, judge는 새 임시 디렉토리에서 보호된 텍스트 전송 경로를 공유합니다. Claude는 제한된 CLI 프로필을 씁니다. Codex는 기존 CLI 로그인, 선택한 모델/제공자, 추론 노력(reasoning effort) 설정으로 네이티브 `codex app-server`를 사용하며, API 키 클라이언트로 대체하지 않고 Claude로 폴백하지도 않습니다. Codex 프로필은 macOS/Linux에서 네이티브 파일 자격 증명 저장소와 기존 `auth.json`이 있는 CLI 0.154.x를 대상으로 합니다. 호출마다 원본 설정/인증 파일을 참조하되 자격 증명 내용은 복사하지 않는 비공개 임시 `CODEX_HOME`을 마련합니다. 네이티브 토큰 갱신은 여전히 원본 인증 파일을 사용합니다. 공유 부트스트랩 상태는 제외하며, 임시 상태는 이후 정리됩니다. 키링, 자동(auto), 임시(ephemeral) 자격 증명 저장소는 현재 지원하지 않습니다. 스레드 계약은 모델 입력을 보내기 전에 확인하며, 지원하지 않는 버전, 저장 방식, 프로토콜 실패는 디스패치를 종료합니다. 컴파일러 프로세스가 에이전트 도구로 숨겨 둔 픽스처를 읽지 못하도록 도구, 시작 시 지시 탐색, MCP 접근, 세션 저장은 꺼 둡니다. 다른 컴파일러 벤더는 검증된 전송 경로가 생기기 전까지 명시적으로 실패합니다.

최적화기는 유효한 편집에는 `proposed`를, 명시적인 `NO_ACTION` 응답에만 `no-action`을 보고합니다. 프로세스/API 실패는 `dispatch-error`가 되고, 유효한 편집이 없는 잘못된 형식의 응답은 `parse-error`가 됩니다. 이런 오류가 빈 편집 목록으로 바뀌는 일은 없습니다. Maintainer가 검증된 패턴을 제공하지 못하면 디스패치 또는 파싱 사유와 함께 `degraded`를 보고하고, 폴백 패턴은 영속 지식에서 제외되며, 그 실행은 후보를 승격할 수 없습니다. 평가 실패는 학습된 거부 이력이 아니라 `diagnostics`와 제안 게이트 기록에 나타납니다.

---

## JSON 출력

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok`가 `true`이려면 `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true`, `promotion.eligible === true`가 모두 성립해야 합니다. `baselineTrainLift`와 `finalTrainLift`는 검증 lift와 함께 held-in 분할의 lift를 보고합니다. 같은 조건이 `--apply`의 관문이기도 합니다. 학습 실패를 고치는 것만으로 수락된 편집은 최종 테스트도 통과해야 파일에 기록됩니다. 최종 테스트나 `promotion` 객체가 없으면 `ok: true`가 될 수 없습니다. `_split` count는 실행에 사용한 실제 local fixture partition을 보여 줍니다.

예를 들어 측정되지 않은 후보는 다음과 같은 보고서 발췌를 낼 수 있습니다.

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

다시 시도하기 전에 `diagnostics`, `promotion.reasons`, 그리고 있다면 `finalTest.blocker`를 확인하세요. `inconclusive` 제안은 `rejectedCount`를 늘리지 않습니다. 측정된 최종 테스트 실패는 해당 실행의 감사용 거부 횟수를 늘릴 수 있지만, 영속 거부 지식에서는 계속 제외됩니다.

---

## `oma-*` 스킬의 SSOT 유의 사항

ID가 `oma-`로 시작하는 스킬은 oh-my-agent가 소유하며 **`oma update`가 덮어씁니다**. 이런 스킬에는 `--apply`를 권장하지 않습니다. 기본값인 `--dry-run`으로 제안된 diff를 검토하고, 개선이 의미 있다면 레지스트리에 업스트림으로 반영하세요. 사용자가 직접 만든 스킬에는 `--apply`가 안전합니다.

대상 스킬이 oma 소유일 때는 다음과 같이 경고를 출력합니다.

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## 과적합 방지

Maintainer와 Proposer는 TRAIN 롤아웃 근거를 받습니다. 후보 선택은 held-out VALIDATION 분할을 쓰고, 별도의 TEST 분할은 실행기가 소유합니다. 컴파일러가 도구 없이 실행되므로 숨겨 둔 그 픽스처와 평가자에는 워크스페이스로 접근할 수 없습니다.

최종 테스트가 실패하면 적용이 막힙니다. 그 결과는 감사용으로 남지만, 최종 테스트 게이트 결과도 `inconclusive` 제안도 영속 최적화 지식에 반영되지 않습니다. 기록기, 이력 재로딩, 의미 기반 회수 경로도 레거시 최종 테스트 결과를 제외하므로, 이후 실행이 과거 최종 테스트의 성공이나 실패를 학습 피드백으로 쓸 수 없습니다.

---

## CI 통합

기존 후보별 기록을 오프라인으로 CI에서 검사하려면 평가 재생을 쓰세요.

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

CLI 최적화 자체는 `--live`가 필요하며, 아직 기록된 제안을 재생하는 어댑터가 없습니다. `oma skill optimize --mock`을 완전한 오프라인 최적화기로 설명한 이전 안내는 잘못되었습니다. 오프라인 재생 작업은 `oma skill eval --mock`으로 옮기거나, 라이브 최적화를 명시적으로 켜서 모델 비용을 감수하세요. 최적화 실행에서는 JSON의 `ok`와 `promotion.eligible`을 확인하세요. 종료 코드 0은 승격할 만한 후보를 찾지 못하고 끝난 실행도 포함합니다.

최적화 종료 코드:
- `0`: 최적화가 완료됨 (개선 여부와 무관)
- `1`: 잘못된 입력 또는 실행 실패. 비라이브 CLI 최적화, 충돌하는 `--live --mock` 플래그, 부족한 픽스처 수, 지원하지 않는 컴파일러 벤더, 최적화기 디스패치 실패, 잘못된 형식의 최적화기 출력을 포함합니다.

---

## 함께 보기

- [스킬 유용성 평가](/docs/guide/skill-eval): 태스크 픽스처 작성, 체커 종류, mock과 live 모드, `_rollouts/` 디렉토리.
- [CLI 명령](/docs/cli-interfaces/commands): 모든 스킬 관리 명령의 플래그 레퍼런스.
