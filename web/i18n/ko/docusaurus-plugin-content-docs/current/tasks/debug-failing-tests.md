---
title: 실패하는 테스트 디버그
description: 테스트 실패를 재현하고 원인을 좁힌 다음, 범위를 제한한 수정을 하고 프로젝트의 기존 테스트 러너로 회귀를 확인합니다.
---

# 실패하는 테스트 디버그

실패하는 명령, 스택 트레이스, 반복되는 잘못된 결과가 있을 때 `oma-debug`를 사용합니다.

## 스킬 불러오기

코딩 에이전트에게 이 명령을 실행하고, 지침과 지원 디렉토리를 읽도록 요청합니다.

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## 입력 제공

- 실패한 명령 그대로와, 관련된 실패 출력 전체입니다.
- 기대 동작, checkout/ref, 런타임 버전, 필요한 로컬 서비스입니다.
- 의심하는 파일이나 최근 변경, 그리고 허용된 편집 범위입니다.

## 태스크 전달

이 구체적인 예는 이 저장소의 플러그인 부트스트랩 회귀 픽스처를 사용합니다. 다른 프로젝트에서는 자신의 실패 명령을 사용하세요.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## 결과 확인

재현된 실패, 인과 경로, 범위가 제한된 패치, 그 실패에 묶인 회귀 테스트를 기대합니다. 보고서는 사용할 수 없는 환경과 진단된 코드 결함을 구분해야 합니다.

회귀가 원래 동작에서는 실패하고 수정 뒤에는 통과하는지 확인합니다. 같은 환경에서 안내된 명령을 다시 실행한 다음, 관련 테스트 결과를 살펴봅니다. 재현이 계속 막혀 있으면 정확한 차단 요인과 그때 쓸 수 있는 더 약한 근거를 기대합니다.

## 의존성과 다음 단계

에이전트는 프로젝트의 테스트 러너와 설정된 소스 탐색 도구를 사용합니다. 이 예에는 이미 있는 Bun과 저장소 개발 의존성이 필요합니다. 이 플러그인 픽스처는 Windows에서 건너뜁니다. 자신의 플랫폼이 지원하는 실패 테스트를 사용하세요. 스킬을 불러와도 의존성이 설치되거나 없는 서비스가 고쳐지지는 않습니다.

실제 소스 변경과 픽스처 경계는 [플러그인 훅 수리 예](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/)를 참고하세요. 관리되는 실행이나 프로젝트 훅이 필요하면 `oma-debug`가 포함된 [런타임 설정](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)을 고릅니다.
