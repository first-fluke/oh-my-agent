---
title: "인시던트 회귀 사례"
sidebar_label: 인시던트 회귀 사례
description: 관측된 에이전트 실패를 기록하고 증거를 보존하며, 명시적인 회귀 계약으로 후보 하네스를 평가합니다.
---

# 인시던트 회귀 사례

`oma harness incident`은 관측된 실패를 회귀 사례와 그 뒤를 따르는 후보 평가에 연결합니다. 이 명령은 관찰 결과를 인과 가설과 분리해서 기록합니다. 프로세스가 실패했다는 사실만으로는 인시던트를 모델이 일으켰다고 단정할 수 없습니다.

## 후보 찾기

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

스캔은 `.agents/state/agent-runs/`를 읽어서 상태가 `failed`, `blocked`, `partial`인 실행만 남기고, 이미 캡처된 인시던트가 `source.runId`로 참조하는 실행은 버립니다. `--skeleton`은 실행 하나의 사양을 출력합니다. id와 에이전트, 원본 실행, 관측된 실패, 종료 코드, 그리고 러너가 보존한 경우 에이전트 출력의 마지막 부분까지 채워져 나옵니다. `expected_checks`는 `TODO`로 남는데, 어떤 동작이 올바른지는 스캔이 내릴 수 없는 판단이기 때문입니다. `oma agent spawn`과 `oma agent parallel`은 각 실행 로그의 마지막 64 KiB를 `.agents/state/agent-runs/<run-id>.output.txt`로 보관하고 실행 기록에서 그 파일을 참조합니다. 그래서 사양에 관찰 결과가 생략되면 `capture --run`이 그 출력을 관찰 결과로 가져오고, `incident promote`는 여기서 파생한 픽스처를 그 출력으로 검증할 수 있습니다. 빈칸을 채운 뒤 `--run <run-id>`으로 캡처하면 실행의 식별 정보와 워크스페이스 지문이 보존됩니다.

## 실패한 실행 자동 캡처

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

실행이 실패, 차단, 부분 완료로 끝났고 그 작업에 계약이 있었다면 손으로 사양을 작성할 필요가 없습니다. 기대 동작은 실행 전에 정해지는 계약의 수락 기준입니다. 실패한 검증 기록(receipt)이 다룬 기준이 곧 미달 기준 집합이고, 실행이 검증을 한 번도 하지 않았다면 모든 기준이 미달 집합입니다. opt-agent가 미달 기준을 `PASS only if …` 형태의 판정자용 채점 기준표(rubric)로 다시 쓰고, 판정자가 그 채점 기준표로 실행이 남긴 출력 자체를 채점하며, 그 출력이 실패할 때만 인시던트가 캡처됩니다. 실패가 통과해 버리는 채점 기준표는 실패를 담지 못하기 때문입니다. 사양은 `.agents/results/incidents/_specs/<id>.json`에 저장되고 실행의 식별 정보를 담아 캡처되며, 채점 기준표는 `output_judge` 수락 검사로 실립니다. 출력이나 프롬프트, 계약이 보존되지 않은 실행은 캡처할 수 없는 대상으로 이유와 함께 목록에 오릅니다.

`output_judge`는 채점으로 따지는 계약입니다. 기계적인 하네스 평가자는 이를 평가되지 않은 것으로 보고합니다. 이 항목의 목적은 `incident promote`가 같은 채점 기준표로부터 파생하는 스킬 회귀 픽스처입니다.

## 인시던트 캡처

프로젝트 안에 JSON 사양을 저장합니다.

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`, `evidence_files`, 의존성 픽스처 경로는 사양 파일을 기준으로 합니다. 명령 검사의 `checker` 경로는 프로젝트 상대 경로입니다. 검사 문법은 [하네스 평가](./harness-eval.md)를 보세요. 초기 디렉터리는 미리 제공한 실행 전 태스크 픽스처여야 하고 OMA·벤더 지시 파일이 없어야 하는데, 평가 대상인 하네스는 별도로 주입되기 때문입니다.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run`은 이미 존재하는 `.agents/state/agent-runs/<run-id>.json`을 가리킵니다. 실행/세션의 식별 정보와 벤더, 상태, 원래 워크스페이스 지문을 보존합니다. 사양에 준 프롬프트는 실행에 기록된 프롬프트보다 우선합니다. `source.trace_id`로 신고된 인시던트를 외부 트레이스에 연결할 수 있는데, 그 트레이스를 가져오거나 업로드하지는 않습니다.

캡처된 매니페스트는 `.agents/results/incidents/<id>/incident.json`에 있습니다. 함께 준 초기 스냅샷과, 원본 증거와 검사 프로그램 파일의 해시, 수락 검사와 제한 사항, 매니페스트 해시가 기록됩니다. 기존 ID는 덮어쓸 수 없습니다. 민감한 관찰 텍스트는 마스킹되며, 마스킹은 정확한 재생에 대한 제한으로 보고됩니다. 스냅샷 수집은 지원하지 않는 파일을 거부하고 파일 개수와 총 용량에 한도를 둡니다. 증거 참조는 원본 파일마다 사본을 두는 대신 해시와 경로를 보존합니다.

선택 사항인 `cause` 객체는 `category`, `hypothesis`, `confidence`, `evidence`를 담습니다. 범주는 `model`, `tool`, `config`, `context`, `application`, `evaluator`, `unknown`입니다. 생략하면 원인은 `unknown`으로 남습니다.

## 스킬 픽스처로 승격

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

캡처한 인시던트는 실패한 에이전트가 실제로 사용한 스킬의 회귀 픽스처가 되므로, `oma skill optimize`가 그 스킬을 그 픽스처 상대로 고칠 수 있습니다. 스킬은 설치된 스킬 카탈로그에 인시던트 프롬프트를 라우팅해서 고르는데, `oma skill eval --routing`이 쓰는 것과 같은 설명 수준 프로브(모델 호출 1회)를 씁니다. 라우팅이 아무것도 고르지 못하면 `.agents/agents/<agent>.md`의 에이전트 정의에 있는 `skills:` 항목 중 첫 번째를 쓰고, 그것도 없으면 `oma-<agent>`라는 이름의 설치된 스킬을 씁니다. `--skill`이 이를 덮어쓰고, 세 가지 중 무엇이 결정했는지 승격에 `attribution`으로 기록됩니다. 픽스처는 `group: incident-<id>`를 붙여 `.agents/eval/<skill>/incident-<id>.yaml`에 쓰므로 train/validation/test 분할을 절대 넘어가지 않고, 승격은 인시던트 옆에 `promotion.json`으로 기록됩니다. 인시던트는 한 번만 승격됩니다.

검사 프로그램은 수락 검사에서 가져옵니다. 모든 검사가 `output_contains`이면 픽스처는 결정론적인 `assert`가 됩니다. 그렇지 않으면 그 검사들을 스킬 평가에서 돌릴 수 없으므로(파일과 명령이 없습니다) `--draft`는 opt-agent에게 `PASS only if`로 시작하고 관측된 실패를 지목하는 채점 기준표를 요청합니다. 어느 쪽이든, 기록된 실패 출력이 그 픽스처에 떨어지지 않을 때만 픽스처가 받아들여집니다. 관측 출력이 이미 만족시키는 assert나, 판정자가 그 출력에서 통과시키는 초안 채점 기준표는 회귀 사례가 아니므로 거부됩니다. 관측 출력이 없는 인시던트는 검증할 수 없어서 `--force`가 필요하고, 이는 제한 사항으로 기록됩니다.

## 루프 닫기

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback`은 배포 피드백 루프를 한 개의 명령으로 묶은 것입니다. `--scan-runs`를 붙이면 계약이 있는 미캡처 실패 실행을 먼저 모두 캡처하고(위 참고), 캡처했으나 픽스처가 없는 인시던트를 모두 승격하며(필요하면 채점 기준표를 초안 작성), 영향받은 스킬을 묶은 뒤, `--live`로 각 스킬을 넓어진 스위트 상대로 일반 게이트(held-in/held-out 수락, 확인된 음의 전이, 실행기 소유 최종 테스트) 아래에서 한 번씩 최적화합니다. `.agents/results/feedback/feedback-<ts>.json`의 보고서에는 승격과, 이유와 함께 건너뛴 인시던트와, diff를 포함한 각 스킬의 결과가 실리므로, 관측된 실패에서 후보 편집까지의 연결이 감사 가능한 단일 기록이 됩니다. 공유 모델 호출 한도, 지속되는 재시도, 프로젝트 스킬 오버레이를 갖춘 예약 실행에는 [프로젝트 하네스 진화](/docs/guide/harness-evolution)를 활성화하세요. 적용된 변경은 다음 세션의 상태 스냅샷이 알려줍니다.

사람이 남기는 판단: 작업 계약이 없는 실행은 기대 동작이 기록되지 않으므로 `incident scan` 목록에만 오르고 사양을 통해서만 캡처됩니다. `--skeleton`이 그 사양의 초안을 만듭니다.

## 내보내서 평가

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

내보내기는 저장된 초기 스냅샷과 사례 한 개의 탐색용 스위트를 파일로 만들어냅니다. 매니페스트 해시와 원본 실행/트레이스의 식별 정보가 태스크와 함께 평가와 기록으로 따라갑니다. 내보낸 파일이나 프롬프트, 에이전트, 검사, 고정된 검사 프로그램 소스가 바뀌면 재사용이 무효가 됩니다. 수락 계약을 바꾸려면 인시던트 ID를 새로 만드세요.

기본값으로 `reproduce`는 라이브 baseline/후보 비교를 새로 시작하고 이를 기록합니다. `--yes`를 주지 않으면 일반 라이브 비용 확인이 적용됩니다. 이 명령은 Codex를 포함해 하네스 태스크에 설정된 에이전트 벤더를 쓰며, 스킬 최적화 도구의 보호된 컴파일러 프로필을 태스크 실행에 강제하지는 않습니다.

초기 상태를 캡처하지 않았다면 `capture`와 `show`는 여전히 동작하지만, 실행 가능한 내보내기와 실행 재현은 증거 누락 오류로 중단됩니다. 과거 실행의 현재 작업 트리는 그 실행의 원래 상태를 증명할 수 없습니다. 별도로 제공한 초기 스냅샷도 그 과거 실행과 동등하다는 것을 증명하지 못하며, 보고서는 이 제한을 명시합니다.

## 증거 연산 선택

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| 연산 | 발생하는 일 |
|---|---|
| `inspect` | 저장된 판정을 읽고 집계합니다. 검사도 에이전트도 실행하지 않습니다. |
| `rescore` | 저장된 원시 증거에 현재의 출력/파일 검사를 적용합니다. 옛 통과/실패 필드는 무시됩니다. |
| `fixture-replay` | 제공한 도구 응답 데이터와 파일 변경을 기록된 초기 상태 상대로 재생합니다. 모델도 도구 프로세스도 실행하지 않습니다. |
| `rerun` | 기록된 초기 상태에서 실제 baseline/후보 에이전트 호출을 시작합니다. 일반 모델 사용량이 발생합니다. |

수락 계약을 고쳐야 한다면 하네스 스위트를 따로 만들고, 같은 스위트/태스크/인시던트 식별 정보와 프롬프트로 `oma harness eval --action rescore`를 쓰세요. 내보낸 인시던트 스위트 자체는 바꿀 수 없습니다. 원시 증거 요구 사항과 도구 트랜스크립트 형식은 [기록 및 재생 세부 사항](./harness-eval.md)을 보세요.

외부 의존성은 `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }` 형태로 선언하세요. 픽스처 의존성은 완전한 하네스 트랜스크립트 형식을 사용한 파일을 가리키되, 인시던트 ID를 `taskId`로 씁니다. 오프라인 인시던트 재생은 live/unavailable 의존성과 없는 픽스처 파일, 달라진 픽스처 해시와, 이름으로 찾을 수 없는 응답, 고정된 트랜스크립트와 다른 요청/응답/파일 변경을 거부합니다. 그래도 작성자가 모든 외부 의존성을 선언했는지는 보증하지 못합니다. 라이브 재실행이 과거와 같은 외부 서비스 동작을 보증하지도 못합니다.

캡처와 내보내기, 평가는 인시던트와 후보/baseline 해시, 실행 모드, 교정되거나 회귀한 태스크 ID를 연결하는 로컬 `harness.incident.*` 이벤트를 발생시킵니다. 사례 한 개의 인시던트는 회귀 증거일 뿐, validation과 최종 테스트 스위트를 대신하지 못합니다. 현재 하네스 프로필은 `promotionReady: false`를 보고하므로, 이 연산들로 보호된 최종 테스트 격리가 성립하지 않고 후보가 자동으로 승격되지도 않습니다.
