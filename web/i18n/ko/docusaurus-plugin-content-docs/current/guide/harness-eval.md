---
title: "하네스 평가"
sidebar_label: 하네스 평가
description: 짝지어진 격리 저장소 태스크와 결정론적 아티팩트 검사로 OMA 하네스 오버레이 전체를 평가합니다.
---

# 하네스 평가

`oma harness eval`은 대상 에이전트의 모델을 바꾸지 않은 채, 후보 OMA 하네스가 그 에이전트를 개선하는지 측정합니다. [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307)의 테스트 타임 평가 패턴을 따릅니다. 대상 모델은 고정하고, 하네스만 바꾸고, 같은 태스크에서 결과를 비교하는 방식입니다.

이 명령은 `oma skill eval`보다 큰 단위를 평가합니다.

| 명령 | 처치 대상 | 채점 대상 |
|:--------|:----------|:-------------|
| `oma skill eval` | `SKILL.md` 본문 하나 | 에이전트 출력 |
| `oma harness eval` | 범위가 지정된 `.agents/` 오버레이 | 저장소 워크스페이스에 만들어진 파일과 출력 |

스킬 평가는 "이 스킬이 도움이 되는가?"에 답합니다. 하네스 평가는 "이 스킬·워크플로우·규칙·에이전트 지시의 조합이 고정된 에이전트를 더 안정적으로 저장소 태스크를 끝내게 만드는가?"에 답합니다.

## 평가 모델

라이브 실행은 각 태스크를 짝지은 실험으로 평가합니다.

1. OMA가 초기 태스크 픽스처를 캡처합니다. 완전한 스냅샷을 두 갈래의 시작 파일로 쓰므로, 실행 중에 원본 픽스처가 바뀌어도 두 갈래는 같은 파일에서 출발합니다.
2. OMA가 현재의 `agents`, `config`, `rules`, `skills`, `workflows` 정의를 그 워크스페이스로 복사하고 선택한 벤더 형식으로 투사합니다.
3. OMA가 두 번째 새 워크스페이스에서 같은 준비를 반복한 뒤 거기에 후보 오버레이를 적용합니다.
4. 두 갈래 모두 같은 기본 에이전트, 벤더 경로, 프롬프트, 쓰기 권한, 타임아웃을 씁니다.
5. 결정론적 검사가 결과 워크스페이스와 선택적으로 에이전트 출력을 확인합니다. 신뢰할 수 있는 명령 검사는 그 뒤에 태스크 아티팩트의 새 사본에서 실행됩니다.

실제 프로젝트는 갈래의 작업 디렉토리로 절대 쓰지 않습니다. OMA는 검사와 임시 워크스페이스 정리에 앞서 원시 출력과 최종 태스크 아티팩트를 캡처합니다. 작업 디렉토리 밖의 접근에 대해서는 선택한 벤더 자체의 프로세스 샌드박스가 여전히 최종 권한을 갖습니다.

## 후보 레이아웃

후보 경로는 부분적인 `.agents/` 트리를 담은 디렉토리입니다.

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

`.agents/agents`, `.agents/rules`, `.agents/skills`, `.agents/workflows` 아래의 파일만 허용합니다. 훅, 평가 픽스처, 상태, 결과, 설정 파일, 심볼릭 링크, 벤더 에이전트 변형은 거부합니다. `model`, `tools`, `effort`, 실행 한도 같은 보호된 에이전트 프론트매터 필드는 baseline과 같아야 합니다. 실행 중인 에이전트가 채점 전에 보호된 `.agents/` 정의를 변형해도 그 갈래는 실패합니다.

## 스위트 형식

스위트는 YAML 파일 하나와 태스크마다 하나씩의 픽스처 디렉토리로 이루어집니다.

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

버전 2는 `validation`과 `final-test` 태스크를 모두 요구합니다. 각 태스크는 자신이 속한 분할을 선언해야 합니다. 기본값은 `validation`이며, 후보를 고른 뒤 별도로 최종 실행을 하려면 `--partition final-test`를 쓰세요. 두 분할은 픽스처 디렉토리를 공유하거나 중첩할 수 없습니다. 기록 파일은 픽스처 디렉토리, 후보 오버레이, 평가자 입력 밖에 두세요. 이후 실행이 최종 검사를 보지 못하도록 이런 위치는 거부합니다. 버전 1 스위트는 여전히 `exploratory`로 실행되지만 final-test로는 선택할 수 없습니다.

태스크 ID는 고유해야 합니다. 픽스처 경로와 검사 경로는 프로젝트와 태스크 워크스페이스 안에 있어야 합니다. 스위트와 픽스처도 모든 갈래에 복사되는 baseline 정의 밖에 있어야 합니다. 픽스처에는 심볼릭 링크나 에이전트 하네스 제어 표면(`.agents`, `.codex`, `.claude`, 벤더 스킬 디렉토리, 루트 에이전트 지시 파일 등)이 들어갈 수 없습니다. 태스크 데이터가 어느 한쪽 갈래의 통제된 하네스를 가리는 것을 막기 위해서입니다.

`node_modules`나 `.venv` 같은 생성 의존성 디렉토리는 baseline 하네스에서 복사하지 않습니다. 결정론적 헬퍼 소스와 의존성 매니페스트는 스킬에 커밋하고, 검사에 런타임 의존성이 필요하면 태스크 픽스처에서 준비하세요.

### 검사 유형

| 유형 | 필드 | 통과 조건 |
|:-----|:-------|:---------------|
| `file_exists` | `path` | 갈래가 끝난 뒤 해당 경로가 존재합니다. |
| `file_not_exists` | `path` | 해당 경로가 존재하지 않습니다. |
| `file_contains` | `path`, `value` | 파일이 존재하고 값을 포함합니다. |
| `file_not_contains` | `path`, `value` | 파일이 존재하고 값을 포함하지 않습니다. |
| `output_contains` | `value` | 캡처한 에이전트 출력이 값을 포함합니다. |
| `output_not_contains` | `value` | 캡처한 에이전트 출력이 값을 포함하지 않습니다. |
| `output_judge` | `rubric` | 인시던트에 실리는 채점 계약입니다. 기계적 평가자는 이를 평가되지 않은 것으로 보고합니다([인시던트 회귀 사례](./harness-incidents.md) 참고). |
| `file_json_equals` | `path`, `value`, 선택 사항인 `pointer` | 파싱한 파일 JSON이 `value`와 같습니다. `pointer`를 주면 JSON Pointer가 가리키는 위치에서 비교합니다. |
| `output_json_equals` | `value`, 선택 사항인 `pointer` | 캡처한 출력이 유효한 JSON이고 `value`와 같습니다. `pointer`를 주면 JSON Pointer가 가리키는 위치에서 비교합니다. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | 신뢰할 수 있는 하위 프로세스가 타임아웃 안에 끝나고 지정한 종료 코드를 반환합니다. |

JSON 단언은 타입까지 포함해 파싱된 값을 비교합니다. 성공했다는 문장만으로는 JSON 상태 단언을 만족할 수 없습니다. `pointer`는 `/result/count` 같은 JSON Pointer 문법을 쓰며 기본값은 값 전체입니다.

명령 검사는 신뢰할 수 있는 스위트 소유자가 작성합니다.

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker`의 상대 경로는 스위트 파일을 기준으로 해석합니다. 이 파일은 모든 픽스처, 후보 오버레이, baseline `.agents` 정의 밖에 저장된 독립적인 일반 소스 파일이어야 합니다. `argv[0]`은 프로젝트 밖에 있는 실행 파일의 절대 경로여야 하고, `{checker}`는 인자 하나 전체여야 합니다. OMA는 셸 보간 없이 인자를 직접 전달합니다. 타임아웃은 300,000밀리초를 넘지 않는 양의 정수여야 합니다. 종료 코드는 0 이상 255 이하의 정수입니다.

디스패치 전에 OMA는 검사 프로그램 소스 바이트를 스냅샷으로 저장하고, 평가자 정의와 실행 파일의 해시를 계산합니다. 디스패치가 끝나면 태스크 아티팩트를 별도의 임시 워크스페이스로 복사하고, 스냅샷으로 저장한 검사 프로그램을 그 아티팩트 바깥에 기록한 뒤 그 임시 워크스페이스에서 호출합니다. 명령마다 새 사본을 받으므로 한 검사 프로그램이 다음 검사의 입력을 바꿀 수 없습니다. 생성된 하네스 투사 결과는 제외하고, 아티팩트의 심볼릭 링크는 거부합니다. 갈래가 도는 동안 검사 프로그램 소스가 바뀌면 그 갈래는 실패하며, 수정된 소스가 스냅샷을 대신하는 일은 없습니다. 검사 프로그램은 아티팩트나 애플리케이션 동작을 고정된 단언으로 확인해야 하며, 후보가 고칠 수 있는 테스트나 패키지 스크립트에 판정을 맡겨서는 안 됩니다.

검사와 검사 프로그램 경로는 에이전트 프롬프트나 픽스처에 추가하지 않습니다. 선택한 태스크의 입력은 그 실행 중에 반드시 보입니다. 이 방식은 평가자의 무결성을 지키고 분할을 분리하지만, 같은 사용자 권한의 프로세스가 호스트의 다른 파일을 읽는 것까지 막지는 않습니다.

## 실행과 기록

라이브 모드는 선택한 태스크마다 두 번 디스패치하고, 디스패치 미리보기를 출력하며, 확인을 요구합니다.

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

비대화형으로 실행하려면 `--yes`를, 갈래별 wall-clock 한도를 동일하게 두려면 `--timeout-minutes`를 쓰세요. 라이브 실행은 선택한 벤더가 프로젝트 워크스페이스를 기준으로 하네스 파일을 찾을 때만 가능합니다. HOME 기반 탐색은 거부하는데, baseline이 전역 설치된 후보 콘텐츠를 볼 수 있기 때문입니다.

`--record`는 변경할 수 없는 버전 2 JSON 기록을 씁니다. 기본 위치는 스위트 옆의 `_runs/`이며, 파일명에 baseline/candidate 해시가 들어갑니다. 라이브 실행을 다시 하려면 새 `--record-file`을 쓰세요. 이미 있는 대상 파일은 디스패치 전에 거부합니다. 기록에는 다음이 보존됩니다.

- 스위트 식별 정보, 분할, 프롬프트와 픽스처의 출처, baseline/candidate 해시, 평가자/검사 프로그램/실행 파일 해시
- 원본 출력과 그 해시(실패한 디스패치에서 얻을 수 있는 진단용 stdout 포함)
- 파일 바이트, 파일별 해시, 파일/디렉토리 모드, 매니페스트 다이제스트를 담은 초기 및 최종 아티팩트 매니페스트
- 검사 프로그램 참조, 갈래 결과, 제공된 경우 인시던트 식별 정보, 재실행의 원본 기록 해시

태스크 스냅샷은 파일당 5 MiB, 전체 32 MiB, 항목 2,000개로 제한합니다. 심볼릭 링크, 특수 파일, 비밀 값이 들어 있는 경로, 읽을 수 없는 파일, 크기 한도를 넘는 데이터는 누락 항목으로 기록합니다. 복사된 하네스 제어 파일은 최종 태스크 아티팩트에서 제외합니다. 불완전한 스냅샷은 명시적인 증거 한계로 남으며, 고정된 재실행에 쓸 수 없고 파일 재채점의 요건도 충족하지 못합니다. 원래 디스패치가 성공했다면 원시 출력은 출력만 보는 검사에 계속 쓸 수 있습니다.

기록에는 자체 무결성 해시가 있습니다. 기록이나 아티팩트 해시가 바뀌면 거부합니다. 이 해시는 증거를 식별할 뿐, 프로세스 격리를 보증하거나 결과를 승격 가능한 상태로 만들지는 않습니다.

### 실행 조건

모든 라이브 또는 재실행 평가는 첫 디스패치 전에 실행 매니페스트를 확정해 기록에 `manifest`로 저장합니다. 이 매니페스트는 판정이 서술하는 조건을 명시하므로, 저장된 점수를 다른 모델, CLI, OMA 빌드의 증거로 착각하는 일이 없습니다.

| 필드 | 의미 |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | 확정된 디스패치 경로와 CLI 실행 파일 이름입니다. |
| `model`, `modelSource` | OMA가 에이전트 계획이나 벤더 기본값에서 확정한 모델입니다. `vendor-session`은 벤더 자체의 세션 설정이 모델을 고르며 OMA가 고정하지 않았다는 뜻입니다. |
| `effort`, `thinking` | 에이전트 계획에 있으면 거기서 가져온 추론 설정입니다. |
| `cliVersion`, `cliVersionStatus` | `<command> --version`의 첫 줄(`probed`)입니다. 버전 확인에 실패하면 `unavailable`입니다. |
| `omaVersion`, `platform`, `arch`, `node` | 호스트와 OMA 빌드입니다. |
| `environmentPolicy` | 갈래가 받은 환경 변수의 이름, 강제로 설정한 항목, 제외한 변수의 개수입니다. 값은 기록하지 않습니다. |
| `memory`, `confinement` | 모든 갈래에서 `memory: disabled`입니다. `confinement`는 디스패치가 제한하는 것과 제한하지 않는 것(임시 워크스페이스, 제한 없는 네트워크, 상속된 자격 증명, 벤더 기본 도구)을 밝힙니다. |
| `manifestHash` | 위 조건의 식별자입니다. |

매니페스트는 서술일 뿐 보증이 아닙니다. OMA가 확정한 내용을 기록하며, `confinement` 필드는 네트워크와 자격 증명 격리가 강제되지 않는다고 명시합니다. `promotionReady`는 계속 `false`입니다.

### 환경 정책

두 갈래는 허용 목록(allowlist)으로 걸러 낸 같은 환경을 받습니다. 기본 변수(`PATH`, `HOME`, 로캘, 임시 디렉토리, 프록시, 인증서 설정), 모든 `OMA_*` 변수, 대상 벤더의 자격 증명 접두사와 런타임 감지 접두사가 붙은 변수는 그대로 전달하고, 디스패치 빌더가 해당 호출을 위해 추가한 항목은 유지합니다. 나머지는 모두 제외하므로 후보가 배포 토큰이나 다른 제공자의 키에 우연히 닿는 일이 없습니다. `OMA_NO_AGENTMEMORY=1`은 강제로 설정하므로 벤더 메모리가 baseline과 후보 갈래 사이에 맥락을 옮길 수 없습니다.

태스크가 실제로 필요로 하는 변수를 추가로 전달하려면 `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2`를 설정하세요. 그 이름은 매니페스트의 `environmentPolicy.extra`에 나타납니다. 알려진 접두사 집합이 없는 벤더에서는 매니페스트가 `vendorKnown: false`를 보고하며, 기본 변수, `OMA_*`, 추가 전달 항목만 프로세스에 도달합니다.

## 기록 재사용

이 명령은 네 가지 동작을 구분합니다.

| 동작 | 수행하는 작업 | 에이전트/모델 호출 |
|:-------|:---------------|:------------------|
| `inspect` | 출처 검증을 거친 뒤 저장된 갈래 판정을 집계합니다. 검사는 실행하지 않습니다. | 없음 |
| `rescore` | 원래 기록된 원시 출력과 아티팩트 바이트에 현재의 출력/파일 검사를 적용합니다. | 없음 |
| `fixture-replay` | 제공된 도구 요청 트랜스크립트와 대조한 뒤 그 픽스처 응답과 파일 변경을 재생하고, 지원되는 검사를 적용합니다. | 없음 |
| `rerun` | 기록된 초기 스냅샷으로 시작한 새 워크스페이스에서 설정된 에이전트를 실행합니다. | 선택한 태스크당 두 번 |

`--action inspect`가 기본값입니다. `--mock`은 `inspect`의 별칭이며 다른 동작과 함께 쓸 수 없습니다. `inspect`도 `fixture-replay`도 에이전트를 다시 실행하지 않습니다.

### 저장된 판정 확인

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

`inspect`는 원래의 스위트, 분할, 평가자, baseline, candidate 해시가 모두 일치해야 합니다. 검사 프로그램을 호출하지도 출력을 다시 평가하지도 않고 기록된 점수를 보여 줍니다. 버전 1 기록은 필요한 출처 정보가 일치하면 계속 확인할 수 있습니다. 분할/평가자 출처 정보가 없는 더 오래된 기록은 현재 CLI 검증을 통과하지 못합니다. 레거시 판정은 새 원시 증거로 취급할 수 없습니다. 재채점, 픽스처 재생, 고정된 재실행이 필요하면 새 라이브 기록을 수집하세요.

### 원본 증거 재채점

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

재채점은 현재의 검사를 사용하며 원래의 `passed` 값과 검사 판정은 무시합니다. 스위트 식별 정보, 태스크 ID/프롬프트/인시던트 식별 정보, baseline, candidate, 선택한 분할은 여전히 일치해야 합니다. 검사 정의는 바뀔 수 있으며, 새 결과는 원본 바이트가 그 검사들에서 어떤 결과를 내는지 보여 줍니다. 현재의 픽스처 파일을 바꿔도 기록된 최종 아티팩트는 대체되지 않습니다.

명령 검사는 기록이 외부 런타임과 환경을 고정하지 않으므로 오프라인 재채점에 충분하지 않습니다. 제외되었거나 불완전한 아티팩트를 대상으로 하는 검사도 충분하지 않습니다. 원래 디스패치가 실패했다면 진단용 출력만 남는데, 이는 재채점으로도 유효한 측정이 될 수 없습니다. 현재의 수락 기준에 명령 실행이 필요하면 라이브 재실행을 쓰세요.

### 도구 픽스처 재생

트랜스크립트 파일에는 객체 하나, 또는 태스크 ID가 서로 다른 객체의 배열이 들어갑니다. 선택한 태스크마다 트랜스크립트를 하나씩 제공하세요.

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

요청은 도구 이름과 요청 값 기준으로 단계 순서와 정확히 일치해야 합니다. `writes`와 `removes`는 선택 사항이며, 상대 경로로 지정한 태스크 파일 변경입니다. 워크스페이스를 벗어나거나 하네스 제어 파일을 수정할 수 없습니다. 도구 이름은 데이터일 뿐이며 트랜스크립트의 어떤 명령도 실행하지 않습니다. `output`은 픽스처 데이터이고, 출력 검사에 필요하면 반드시 있어야 합니다.

선언한 의존성마다 `name`, `repeatability`(`fixture`, `live`, `unavailable` 중 하나)가 있고, 선택적으로 `reason`과 `fixture` 참조를 둘 수 있습니다. `fixture` 의존성에는 그 도구 이름과 일치하는 단계가 필요합니다. `live`나 `unavailable` 의존성이 있으면 재생만으로는 충분하지 않습니다. 선택 필드인 `fixture`는 설명용이며, 재생은 그 경로를 불러오지 않고 제공된 단계를 사용합니다. 트랜스크립트 재생은 선언된 의존성을 검증할 뿐, 과거의 모든 의존성이 캡처되었다는 것까지 증명하지는 않습니다.

기록된 두 갈래는 같은 완전한 초기 스냅샷을 가져야 합니다. OMA는 같은 트랜스크립트를 각 갈래에 적용하고 현재의 출력/파일 검사를 실행합니다. 명령 검사에는 라이브 재실행이 필요합니다. 이 결과는 제공된 픽스처 순서를 재생할 수 있다는 것을 보여 줄 뿐, 후보의 동작이 개선되었다는 것이나 모델이 재현된다는 것을 증명하지는 못합니다.

### 고정된 초기 파일에서 에이전트 재실행

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

재실행에는 일치하는 스위트/태스크 식별 정보가 필요하고, 원래 두 갈래의 완전한 초기 스냅샷이 서로 동일해야 합니다. 현재의 baseline, 후보, 설정된 벤더/모델 경로, 현재의 검사를 사용해 실제 에이전트 호출을 시작합니다. 원래의 최종 아티팩트는 시작 상태로 쓰지 않습니다. 따라서 원본 픽스처를 나중에 고쳐도 기록된 초기 상태가 조용히 바뀌는 일은 없습니다.

재실행의 디스패치 미리보기, 확인, 타임아웃 동작은 라이브 실행과 같습니다. 바뀐 후보를 쓸 수도 있으며, 원본 기록은 `--record-file`로 명시해 선택하세요. `--record`를 붙이면 원본 기록 해시와 연결된 새 파일을 원본 옆에 `-rerun-<timestamp>.json`으로 끝나는 이름으로 저장합니다. 원본 기록은 그대로 보존됩니다.

고정된 파일은 외부 서비스 상태, 시간에 따른 동작, 모델 샘플링을 재현하지 않습니다. 재실행은 명시된 조건에서 얻는 새로운 동작 증거이며, 원래의 에이전트 궤적이 결정론적으로 재현되었다는 주장이 아닙니다.

### 재생 시 기록된 조건

`inspect`, `rescore`, `fixture-replay`는 기록에 저장된 매니페스트를 `conditions: "recorded"`로 보고하며, 매니페스트가 도입되기 전의 기록은 `conditions: "unavailable"`로 보고합니다. OMA는 현재 조건도 확정해 벤더, 디스패치 모드, 모델, effort, thinking, CLI 버전, OMA 버전, 호스트에서 달라진 점을 모두 재생 제한 사항이자 승격 차단 요인으로 나열합니다.

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

CLI 버전은 기록 자체에 확인된(`probed`) 버전이 있을 때만 재생 시 확인합니다. 확인하지 않은 쌍은 같다고 보지 않고 비교할 수 없다고 보고합니다. 기록된 판정은 원래 조건에서는 계속 볼 수 있습니다. 하지만 라이브 또는 재실행 평가가 매니페스트가 일치하는 기록을 새로 만들기 전까지는, 현재 조건에서 후보가 어떤지 보여 주는 증거가 되지 못합니다.

### 사용량

벤더가 사용량을 보고하면 각 갈래는 `usage`를 저장합니다. 입력 토큰과 출력 토큰, USD 비용, 경과 시간, 출력 대부분을 만든 모델이 담깁니다. 평가는 이를 합산해 `usage`로 두며, `status`는 `actual`, `partial`(일부 갈래가 아무것도 보고하지 않음), `unknown` 중 하나입니다. 벤더 결과 엔벨로프(envelope)는 검사를 실행하기 전과 출력을 기록하기 전에 풀어 두므로, `output_contains`와 `output_json_equals`는 그것을 감싼 JSON 부가 정보가 아니라 에이전트의 답을 봅니다. 이 필드에는 엔벨로프 안의 사용량이 반영됩니다.

### 보고서 라벨

보고서에는 `executionMode`, `evidenceStatus`(`complete`, `insufficient`, `legacy` 중 하나), `replayLimitations`가 담기고, 가능하면 `sourceRecordHash`도 담깁니다. 라이브 및 재실행 보고서에는 `manifest`, `conditions: "current"`, `traceSession`이 더해집니다. 증거 완전성은 현재 동작이 확인하거나 평가할 수 있는 범위를 설명합니다. 상속된 인시던트 제한 사항은 현재의 파일 캡처가 완전해도 계속 표시됩니다. `promotionReady`는 모든 모드에서 `false`로 유지됩니다.

## 트레이스 이벤트

라이브 또는 재실행 평가는 로컬 세션 `oma-harness-<suite-id>`에 서로 연결된 이벤트를 씁니다.

| 이벤트 | 페이로드 |
|---|---|
| `harness.eval.started` | 동작, 스위트/baseline/candidate/평가자 해시, 분할, 매니페스트 해시, 확정된 벤더, 모델, CLI 버전, 태스크 수입니다. |
| `harness.arm.completed` | 갈래마다 하나씩 생깁니다. 태스크, 갈래, 통과 여부, 소요 시간, 출력 해시, 디스패치 오류, 종료 코드, 타임아웃 플래그, 갈래 트레이스를 담습니다. `parentEventId`는 시작 이벤트를 가리킵니다. |
| `harness.eval.completed` | 판정, lift, 증거 상태를 담으며, `--record`를 썼다면 기록 경로와 해시도 담습니다. |

한 평가의 모든 이벤트는 `causalityKey`를 공유합니다. 이벤트를 쓰지 못하면 보고서는 조용히 빠뜨리는 대신 `Trace event <kind> was not recorded`를 재생 제한 사항으로 나열합니다.

갈래 실행마다 기록에는 `diagnostics`와 `trace`도 저장됩니다.

- `diagnostics`: 종료 코드, 시그널, 타임아웃 플래그, stderr의 마지막 8 KiB와 `stderrStatus`(`captured`, `truncated`, `unavailable` 중 하나)
- `trace`: 하네스가 관측할 수 있었던 내용입니다. `output`은 `complete`, `partial`(실패한 프로세스가 그래도 stdout을 남긴 경우), `unavailable` 중 하나입니다. `artifacts`는 최종 스냅샷이 완전한지 알려 줍니다. `changedPaths`는 고정된 초기 워크스페이스를 기준으로 갈래가 추가, 수정, 삭제한 파일을 나열하며 최대 200개이고 넘으면 `changedPathsTruncated`로 표시합니다. `toolCalls`는 벤더 CLI가 도구별 관측값을 하네스에 노출하지 않으므로 항상 `unsupported`입니다.

따라서 실패한 갈래도 부분 출력, stderr 끝부분, 종료 상태, 파일 변경을 보존하므로, 마지막 오류를 갈래가 바꾼 내용까지 거슬러 추적할 수 있습니다. 관측하지 못했다는 사실도 하나의 상태로 기록되므로, 정상 실행으로 읽히는 일은 없습니다.

## 지표와 판정 게이트

태스크는 모든 검사를 통과해야만 통과합니다. 점수는 짝지은 태스크에 대한 가중 평균입니다.

```text
lift = candidateScore - baselineScore
```

OMA는 다음도 함께 보고합니다.

- 교정된 태스크: baseline이 실패하고 candidate가 통과한 경우
- 회귀한 태스크: baseline이 통과하고 candidate가 실패한 경우
- 커버리지: 짝지어 채점 가능한 태스크가 최소 5개 필요

점수 판정은 향상 폭이 최소 5%p이고 회귀가 하나도 없을 때 `pass`입니다. 회귀가 있으면 무조건 실패합니다. 향상 폭이 0 이상이지만 5%p에 못 미치면 경고이고, 짝지은 태스크가 5개 미만이면 `insufficient` 판정이 납니다. CI에서 커버리지 부족을 0이 아닌 코드로 끝내려면 `--require-coverage`를 붙이세요. 한쪽 arm이 없거나, 기록 hash가 오래되었거나, 결정론적 검사가 완료되지 않았다면 점수는 근거로 사용할 수 없습니다. 라이브 디스패치 오류와 평가자 무결성 오류는 판정을 실패로 만들며, 성공적인 향상으로 셀 수 없습니다. 재채점과 픽스처 재생은 증거가 불충분한 갈래를 채점 가능한 쌍에서 제외하고, 부족한 증거를 후보의 회귀로 취급하는 대신 `insufficient` 판정을 보고합니다.

통과한 점수가 승격 자격을 입증하지는 않습니다. 보고서에는 분할, 평가자 해시, `promotionReady: false`, 명시적인 차단 요인이 담깁니다. 레거시 실행과 validation 실행에는 final-test 증거가 없습니다. 현재의 디스패치 경로는 파일시스템 접근 격리를 보증하지 않으므로, final-test 실행이라 해도 보호된 최종 평가를 주장하거나 승격을 승인할 수 없습니다. 이 필드는 실행 제공자가 그 경계를 입증할 수 있을 때까지 false로 유지됩니다.

## 현재 경계

후보 오버레이는 외부에서 만들며, 이 명령은 빌더나 자동 `harness opt` 루프를 구현하지 않습니다. 아티팩트 캡처, 오프라인 재채점, 도구 픽스처 재생, 고정된 파일을 쓰는 재실행, 분할 선택, 스냅샷으로 저장한 평가자, 실행 매니페스트, 환경 허용 목록, 연결된 트레이스 이벤트는 사용할 수 있습니다. 그러나 held-out 데이터를 OS 수준에서 비밀로 유지하는 것, 네트워크나 자격 증명 격리, 확률적 시행 반복, 토큰 회계, 중첩 서브에이전트 호출의 모델 강제 고정은 확립되지 않았습니다. 환경 허용 목록은 벤더 프로세스가 상속하는 변수를 제한할 뿐, 벤더 CLI가 자체 자격 증명 저장소를 읽거나 네트워크에 접근하는 것까지 막지는 않습니다. 중첩 호출 고정이 생기기 전까지, 모델 하나를 고정해 측정하려는 스위트는 다른 설정 에이전트 역할을 스폰하는 후보 워크플로우를 피하는 편이 좋습니다.
