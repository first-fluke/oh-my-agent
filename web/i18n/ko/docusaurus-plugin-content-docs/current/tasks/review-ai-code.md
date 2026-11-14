---
title: 머지 전에 AI 코드 리뷰
description: 범위가 정해진 diff와 재현 가능한 발견으로, AI가 작성한 코드의 버그, 빠진 검사, 회귀를 리뷰합니다.
---

# 머지 전에 AI 코드 리뷰

의도한 동작에 맞춰 변경을 리뷰하려면 `oma-qa`를 사용합니다. diff와 프로젝트가 이미 가진 검사부터 시작합니다.

## 스킬 불러오기

코딩 에이전트에게 이 명령을 실행한 다음, 반환된 지침과 지원 디렉토리를 읽도록 요청합니다.

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## 입력 제공

- 변경 또는 `origin/main` 같은 로컬 비교 ref입니다.
- 기대 동작, 특히 권한, 데이터 변경, 실패 처리입니다.
- 기존 lint/테스트 명령과 환경 제한입니다.

## 태스크 전달

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## 결과 확인

재현 방법이나 결정적인 코드 근거, 제안된 수정, 실제로 실행한 명령이 있는 정렬된 발견을 기대합니다. 확인된 결함이 없어도 보고서는 살펴본 범위와 남은 공백을 밝혀야 합니다.

인용된 위치를 각각 열고 트리거가 그곳에 도달하는지 확인합니다. 근거로 쓴 좁은 검사를 다시 실행합니다. 없는 도구나 테스트하지 않은 경로는 검증 공백입니다. 리뷰 요약만으로는 변경을 출하해도 안전하다고 확정되지 않습니다.

## 의존성과 다음 단계

에이전트는 diff, 로컬 소스, 프로젝트가 이미 가진 검사 도구에 접근할 수 있어야 합니다. 브라우저, 보안, 성능 검사에는 그에 맞는 대상과 도구가 필요합니다. 스킬을 불러와도 그 의존성이 준비되지는 않습니다.

확인된 실패가 있으면 [실패하는 테스트 디버그](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)로 이어갑니다. 프로젝트 훅이나 팀 워크플로우가 필요하면 `oma-qa`가 포함된 [런타임 설정](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)을 고릅니다.
