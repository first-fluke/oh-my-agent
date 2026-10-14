---
title: oh-my-agent을 선택하는 이유
description: 저장소가 관리하는 에이전트 스킬, 워크플로우, 멀티 벤더 디스패치, 명시적 검증이 필요할 때 oh-my-agent을 선택합니다.
---

# oh-my-agent을 선택하는 이유

oh-my-agent은 팀이 이미 사용하는 에이전트 CLI 주변에 저장소가 관리하는 계층을 추가합니다. `.agents/` 디렉토리에 [스킬](./glossary.md#skill), [워크플로우](./glossary.md#workflow), [에이전트 정의](./glossary.md#agent-definition), 규칙, 모델 설정이 들어갑니다. 벤더 네이티브 파일은 이 [단일 진실 원천](./glossary.md#ssot)에서 생성되므로 동작을 프로젝트와 함께 검토하고 변경할 수 있습니다.

## 저장소에 조율 계층이 필요할 때 선택하세요

다음 중 하나 이상이 필요하다면 OMA가 적합할 수 있습니다.

- **여러 에이전트 호스트 또는 벤더**: `model_preset: auto`는 현재 런타임의 네이티브 설정을 사용합니다. 고정 프리셋과 사용자 정의 프리셋은 역할을 다른 벤더로 라우팅할 수 있으며, 네이티브 방식으로 처리하지 않는 디스패치는 `oma agent spawn`이 담당합니다.
- **반복 가능한 팀 워크플로우**: `/work`는 범위가 정해진 한 태스크를 처리하고, `/orchestrate`는 위임된 작업을 조율하며, `/ultrawork`는 리뷰 단계가 있는 병렬 작업을 실행하고, `/ralph`는 명시적인 judge 단계와 함께 태스크를 반복합니다.
- **저장소가 소유하는 지침**: 스킬, 워크플로우, 규칙, 에이전트 정의가 코드 옆에 있습니다. `oma link`는 선택한 파일을 지원되는 벤더 형식으로 투사합니다.
- **기계적 검사와 파일로 보존되는 결과**: 에이전트 실행은 구조화된 상태 및 결과 실행 기록을 작성할 수 있으며, `oma verify agent <agent-type>`와 `oma docs verify`로 명시적인 검사를 실행할 수 있습니다.

프로젝트가 한 호스트만 사용하고 공유 스킬, 워크플로우, 벤더 라우팅이 필요하지 않다면 추가되는 `.agents/` 파일과 CLI 명령이 설정 비용을 정당화하지 못할 수 있습니다. OMA는 조율 계층이며 호스트의 모델이나 에디터, 프로젝트별 인수 기준을 대신하지 않습니다.

## 검증은 필요한 명령을 직접 선택합니다

backend, frontend, mobile, QA, debug 또는 planning 역할에 해당하는 검사를 실행하려면 `oma verify agent <agent-type> --workspace <path>`를 사용합니다. 검증기는 정적 검사와 테스트, 타입 검사, SQL 검사, `flutter analyze` 같은 설정된 명령을 함께 실행합니다. 자세한 내용은 [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts)를 참고하세요. 보고서에는 각 검사 결과가 표시됩니다. 이 검사를 통과해도 기능이 제품 또는 도메인 요구사항을 충족한다는 뜻은 아니므로 태스크의 인수 기준을 계속 검토해야 합니다.

`/ralph`를 선택하면 별도의 [judge](./glossary.md#judge) 단계가 추가됩니다. 반복마다 선언한 기준을 다시 확인하고 워크플로우 아티팩트를 기록하지만, 일반 프롬프트마다 실행되는 게이트는 아닙니다. 스킬 로딩만으로 모든 워크플로우나 검증 명령이 시작되지도 않습니다.

## 디스패치 결과를 확인할 수 있습니다

`oma doctor --profile`은 각 디스패치 역할에 해석된 벤더와 모델을 보여줍니다. 현재 호스트가 역할을 처리하지 않을 때 명시적인 CLI 경로로 `oma agent spawn <agent-id> <prompt> <session-id>`를 사용합니다. 모델 해석 규칙과 프로바이더별 동작은 [중요한 기본값](./important-defaults.md)과 [에이전트별 모델](../guide/per-agent-models.md)에 설명되어 있습니다.

훅은 관련 호스트 통합이 활성화된 경우에만 워크플로우를 활성화할 수 있습니다. 네이티브 스킬 라우팅은 호스트가 수행하고, 워크플로우 라우팅은 선택한 워크플로우 또는 훅을 따릅니다. 일반 프롬프트만으로 특정 스킬이나 게이트가 실행된다고 보장할 수 없습니다.

선택적인 조율 제어는 [세션 쿼터 상한](../guide/configuration-reference.md#session-quota-caps), [`/orchestrate` 재시도와 탐색 루프](../core-concepts/workflows.md#orchestrate), [워크스페이스 할당](../core-concepts/parallel-execution.md#workspace-aware-pattern)에서 설명합니다.

## 실무적인 절충

OMA는 라우팅, 실행 단계, 검사, 출력 파일을 정의할 공용 장소를 팀에 제공합니다. 대신 팀은 저장소 설정을 최신 상태로 유지하고 어떤 워크플로우와 검증 명령을 인수 계약에 포함할지 결정해야 합니다. 구성원 사이의 일관성이 가장 작은 설치보다 중요할 때 이 절충이 유용합니다.

이 포지셔닝을 처음 논의한 내용은 [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)에서 확인할 수 있습니다.

## 다음 단계

- [빠른 시작](./quick-start.md): 설치하고, 설정을 확인하고, 범위가 정해진 태스크 하나를 실행합니다
- [중요한 기본값](./important-defaults.md): 설치 프로그램이 켜는 기능과 변경 방법
- [설치](./installation.md#presets): 사용할 워크플로우를 포함하는 스킬 프리셋을 고릅니다
- [워크플로우](../core-concepts/workflows.md): `/work`, `/orchestrate`, `/ultrawork`, `/ralph`를 언제 사용하는지
- [문제 해결](../guide/troubleshooting.md): 설치, 벤더, 훅 문제를 해결하는 방법
