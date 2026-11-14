---
title: 플러그인 훅과 프로젝트 부트스트랩 수리
description: 마켓플레이스 훅 경로, Bash 준비, 프로젝트 부트스트랩 기록을 회귀 픽스처로 어떻게 고쳤는지 봅니다.
---

# 플러그인 훅과 프로젝트 부트스트랩 수리

[`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c)의 플러그인 수리는 훅 디스패치와 부트스트랩 동작을 다뤘습니다. 부모인 `82649cbd`가 이 비교의 이전 상태입니다.

## 실패 메커니즘

[이전 훅 매니페스트](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json)는 `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/` 아래 파일을 호출했습니다. 그 경로는 생성된 파일에 의존하며, 플러그인 캐시가 새것인 픽스처는 그 파일을 플러그인 디렉토리에 넣지 않습니다.

[이전 부트스트랩](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh)은 내려받은 Bash 설치 프로그램을 `sh -c`로 실행하기도 했습니다. 성공 표시는 공유 플러그인 데이터에 있었고, 빠른 경로는 그 표시, CLI 버전, 프로젝트 설정 파일의 존재만 확인했습니다. 그래서 설정 파일이 있는 두 번째 프로젝트는 자신의 연결을 건너뛸 수 있었습니다.

## 수리

[새 디스패처](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh)는 설치된 CLI를 호출합니다. 일치하는 실행 가능한 프로젝트 훅이 이미 이벤트를 소유하면, 마켓플레이스 훅은 그 훅에 양보해서 이벤트가 두 번 디스패치되지 않게 합니다.

[새 부트스트랩](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh)은 다음을 합니다.

- Bash 설치 프로그램을 Bash로 실행하고, 준비 실패를 확인합니다.
- 전역 설치 설정이 상속되어 있어도 프로젝트 설치를 강제합니다.
- 그 프로젝트의 `.agents/state/plugin-bootstrap.version`에 기록을 저장합니다.
- 기록을 다시 사용하기 전에 설정, 버전 메타데이터, 실행 가능한 래퍼, 등록된 이벤트를 확인합니다.
- 성공 기록을 남기지 않은 채 실패한 설치의 진단을 `.agents/state/plugin-bootstrap.last-error.log`에 유지합니다.

## 회귀 검사 재현

Bun과 저장소 개발 의존성이 이미 있는 `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c`의 일회용 checkout을 사용합니다. 그 루트에서 다음을 실행합니다.

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

픽스처는 서로 다른 경계를 다룹니다.

| 픽스처 | 단언이 확인하는 것 |
|---|---|
| [부트스트랩](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Bash만 사용하는 준비, 프로젝트별 기록, CUE만 있는 설정, 불완전한 연결, 버전 실패, 유지된 진단입니다. |
| [훅 디스패치](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | 새 캐시에서의 디스패치, 핸들러 시간 예산, 페이로드 보존, 일치하는 프로젝트 훅의 소유, 그 소유가 없거나 잘못되었을 때의 폴백입니다. |
| [설치 통합](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | 프로젝트 설치 두 번, 보존된 사용자 설정, 두 등록에 걸친 prompt/Stop 전달 한 번, 연결 실패 후의 재시도입니다. |

이 픽스처는 임시 디렉토리와 가짜 CLI 명령을 만듭니다. 통합 픽스처는 실제 훅 컴포저를 사용합니다. 마켓플레이스 설치나 모델 호출 없이 셸 디스패치와 기록된 효과를 확인합니다. 이 스위트는 Windows에서 건너뜁니다.

## 실제 세션에서 아직 확인할 것

픽스처가 통과해도 Claude Code 세션이 동작한다고 확정되지는 않습니다. 실제 대상 프로젝트에서 기록과 설정을 살펴보고, `oma doctor`를 실행하고, 세션을 다시 시작한 다음, 관련 prompt와 Stop 동작을 실행하면서 관측된 효과를 확인합니다. CLI 사용 가능 여부, 자격 증명, 프로바이더 동작, 호스트 훅 정책에는 각자의 근거가 필요합니다.

다른 실패에 같은 재현, 수정, 검증 방식을 쓰려면 [실패하는 테스트 디버그](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)부터 시작합니다. 프로젝트 런타임이 언제 필요한지는 [설정 선택](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/)이 설명합니다.
