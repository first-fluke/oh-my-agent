---
title: "하네스 평가"
description: 짝지어진 격리 저장소 태스크와 결정론적 아티팩트 검사로 OMA 하네스 오버레이 전체를 평가합니다.
---

# 하네스 평가

`oma harness eval`은 대상 에이전트의 모델을 바꾸지 않은 채, 후보 OMA 하네스가 그 에이전트를 개선하는지 측정합니다. [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307)의 테스트 타임 평가 패턴을 따릅니다. 대상 모델은 고정하고, 하네스만 바꾸고, 같은 태스크에서 결과를 비교하는 방식입니다.

이 명령은 `oma skills eval`보다 큰 단위를 평가합니다.

| 명령 | 처치 대상 | 채점 대상 |
|:--------|:----------|:-------------|
| `oma skills eval` | `SKILL.md` 본문 하나 | 에이전트 출력 |
| `oma harness eval` | 범위가 지정된 `.agents/` 오버레이 | 저장소 워크스페이스에 만들어진 파일과 출력 |

스킬 평가는 "이 스킬이 도움이 되는가?"에 답합니다. 하네스 평가는 "이 스킬·워크플로우·규칙·에이전트 지시의 조합이 고정된 에이전트를 더 안정적으로 저장소 태스크를 끝내게 만드는가?"에 답합니다.

## 평가 모델

모든 태스크는 짝지은 실험으로 돌아갑니다.

1. OMA가 태스크 픽스처를 새 baseline 워크스페이스로 복사합니다.
2. OMA가 현재의 `agents`, `config`, `rules`, `skills`, `workflows` 정의를 그 워크스페이스로 복사하고 선택한 벤더 형식으로 투사합니다.
3. OMA가 두 번째 새 워크스페이스에서 같은 준비를 반복한 뒤 거기에 후보 오버레이를 적용합니다.
4. 두 갈래 모두 같은 기본 에이전트, 벤더 경로, 프롬프트, 쓰기 권한, 타임아웃을 씁니다.
5. 결정론적 검사가 결과 워크스페이스와 선택적으로 에이전트 출력을 확인합니다.

실제 프로젝트는 갈래의 작업 디렉토리로 절대 쓰지 않습니다. 임시 갈래 워크스페이스는 채점 후 제거하며, 그 작업 디렉토리 밖의 접근에 대해서는 선택한 벤더 자체의 프로세스 샌드박스가 여전히 최종 권한을 갖습니다.

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
schema_version: 1
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
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
```

태스크 ID는 고유해야 합니다. 픽스처 경로와 검사 경로는 프로젝트와 태스크 워크스페이스 안에 있어야 합니다. 픽스처에는 심볼릭 링크나 에이전트 하네스 제어 표면(`.agents`, `.codex`, `.claude`, 벤더 스킬 디렉토리, 루트 에이전트 지시 파일 등)이 들어갈 수 없습니다. 태스크 데이터가 어느 한쪽 갈래의 통제된 하네스를 가리는 것을 막기 위해서입니다.

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

아티팩트 검사는 의도적으로 결정론적입니다. 첫 버전은 변경 가능한 패키지 스크립트를 판정자로 쓰지 않습니다. 평가받는 에이전트가 그 스크립트나 테스트를 고쳐서 평가 자체를 무력화할 수 있기 때문입니다.

## 실행과 기록

라이브 모드는 태스크마다 두 번 디스패치하고, 비용 미리보기를 출력하며, 확인을 요구합니다.

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record
```

비대화형으로 실행하려면 `--yes`를, 갈래별 wall-clock 한도를 동일하게 두려면 `--timeout-minutes`를 쓰세요. 라이브 실행은 선택한 벤더가 프로젝트 워크스페이스를 기준으로 하네스 파일을 찾을 때만 가능합니다. HOME 기반 탐색은 거부하는데, baseline이 전역 설치된 후보 콘텐츠를 볼 수 있기 때문입니다.

`--record`는 스위트 옆 `_runs/` 아래에 해시로 주소를 매긴 JSON 기록을 씁니다. 이 기록은 결과를 세 가지 입력에 묶습니다.

- 스위트, 프롬프트, 검사, 픽스처 내용
- 현재 baseline 하네스 정의
- 후보 오버레이 내용

mock 모드가 기본값이며 모델을 호출하지 않습니다. 세 해시가 모두 그대로일 때만 기록을 재생합니다.

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --mock --require-coverage
```

## 지표와 판정 게이트

태스크는 모든 검사를 통과해야만 통과합니다. 점수는 짝지은 태스크에 대한 가중 평균입니다.

```text
lift = candidateScore - baselineScore
```

OMA는 다음도 함께 보고합니다.

- 교정된 태스크: baseline이 실패하고 candidate가 통과한 경우
- 회귀한 태스크: baseline이 통과하고 candidate가 실패한 경우
- 커버리지: 짝지어 채점 가능한 태스크가 최소 5개 필요

후보는 향상 폭이 최소 5%p이고 회귀가 하나도 없을 때 통과합니다. 회귀가 있으면 무조건 실패합니다. 향상 폭이 0 이상이지만 5%p에 못 미치면 경고이고, 짝지은 태스크가 5개 미만이면 `insufficient` 판정이 납니다. CI에서 커버리지 부족을 0이 아닌 코드로 끝내려면 `--require-coverage`를 붙이세요.

## 현재 경계

이것은 평가의 토대이지 하네스 자동 최적화가 아닙니다. 빌더가 외부에서 후보 오버레이를 만들고, 이 명령을 수락 게이트로 쓰는 방식입니다. 숨겨진 최종 테스트 스위트, 확률적 시행 반복, 신뢰할 수 있는 외부 테스트 러너, 토큰 회계, 중첩 서브에이전트 호출의 모델 강제 고정, 자동 `harness opt` 루프는 앞으로의 확장으로 남아 있습니다. 중첩 호출 고정이 생기기 전까지, 모델 하나를 고정해 측정하려는 스위트는 다른 설정 에이전트 역할을 스폰하는 후보 워크플로우를 피하는 편이 좋습니다.
