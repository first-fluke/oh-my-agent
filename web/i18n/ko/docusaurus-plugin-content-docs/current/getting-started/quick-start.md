---
title: 빠른 시작
description: 설치부터 검증까지 범위가 정해진 태스크 하나를 실행하는 과정을 예상 출력, 복구 방법과 함께 설명합니다.
---

# 빠른 시작

범위가 좁은 태스크 하나로 결과를 확인하세요. 이미 사용하는 코딩 에이전트에 스킬을 불러오거나, 프로젝트 훅, 전문 에이전트, 워크플로우가 필요하면 런타임을 설치합니다. 선택할 수 있는 경로와 각 경로의 의존성은 [설정 선택](./choose-setup.md)에서 설명합니다.

## 1. 설정 선택 {#1-install}

아래의 읽기 전용 Git 태스크를 실행하려면 에이전트에게 스킬을 불러와 그 지침과 지원 디렉토리를 읽도록 요청하세요.

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

이어서 3단계의 태스크를 진행하세요. 스킬의 CLI 작업, 다른 스킬, 프로젝트 규칙, 외부 서비스는 별도의 의존성으로 남습니다. 이 스킬을 불러와도 OMA 설치 프로그램은 실행되지 않습니다.

### 필요할 때 런타임 설치

런타임 부트스트랩은 `bun`, `uv`, Serena, CUE, 전역 `oma` 명령을 준비할 수 있습니다. 이미 사용하는 AI CLI 또는 IDE를 선택하세요. 프로바이더와 브라우저 통합은 실행하려는 태스크에 따라 달라집니다.

프로젝트 디렉토리에서 부트스트랩 설치 프로그램을 실행합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Windows PowerShell에서는 다음을 실행합니다.

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

설정은 기존 응답 언어를 유지하거나 시스템 언어를 자동으로 감지합니다. 대화형 설정에서 CLI 벤더, [기능 프로바이더](./glossary.md#capability-provider), [모델 프리셋](./glossary.md#model-preset), 프로젝트 [스킬 프리셋](./glossary.md#skill-preset), 스택 변형을 선택합니다. 첫 실행에서는 기본값을 유지하고 이미 사용하는 벤더를 선택하며 저장소에 가장 가까운 프로젝트 프리셋을 고르세요. 각 프리셋에 포함된 스킬과 [프리셋 밖의 스킬이 필요한 워크플로우](./installation.md#workflows-that-need-skills-outside-a-preset)는 [프리셋](./installation.md#presets)을 참고하세요.

이미 `bun`이 있다면 설치 프로그램을 직접 실행합니다.

```bash
bunx oh-my-agent@latest
```

부트스트랩 스크립트는 현재 프로젝트에 설치합니다. HOME 수준에 설치하려면 `oma install --global`을 사용하세요. 프로젝트 설치와 전역 설치를 함께 사용할 때는 먼저 [전역 설치](../guide/global-install.md)를 읽으세요.


## 2. 결과 확인

스킬을 임시로 불러온 경우에는 에이전트가 선택한 지침을 읽었는지 확인하고 태스크 자체를 검증하세요. 런타임을 설치한 경우에는 같은 프로젝트 디렉토리에서 상태 점검을 실행합니다.

```bash
oma doctor
```

텍스트 명령은 `CLI Status`, `Skills Status` 같은 섹션이 있는 보고서를 출력한 뒤 셸 종료 코드를 반환합니다. 정확한 행은 프로젝트에 설치된 호스트에 따라 달라집니다.

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor`는 선택 사항인 통합의 문제를 경고로 보고할 수 있습니다. 기본 AgentMemory 준비 상태는 `oma install`과 `oma update` 중에 확인하며, 설치, 시작, 상태 점검 중 하나라도 실패하면 해당 명령이 중단됩니다. `providers.semantic_memory: none` 또는 `honcho`를 선택하거나 `OMA_NO_AGENTMEMORY=1`을 설정하면 이 준비 단계를 건너뜁니다.

기계 판독이 가능한 상태가 필요하면 `oma doctor --json`을 사용하세요. 이 명령은 보고서에 문제가 있을 때 0이 아닌 종료 코드를 반환합니다. 각 표준 에이전트 역할에 해석된 모델과 CLI를 확인하려면 `oma doctor --profile`을 사용하세요.

`oma`를 사용할 수 없지만 Bun이 설치되어 있다면 전역 명령 없이 같은 검사를 실행합니다.

```bash
bunx oh-my-agent@latest doctor
```

그래도 명령을 찾을 수 없다면 새 셸을 열거나 패키지 매니저의 bin 디렉토리를 `PATH`에 추가하세요. `oma` 명령을 설치하는 방법은 [설치](./installation.md#method-3-global-install)에 있습니다. `oma doctor`가 잘못된 설정을 보고하면 표시된 필드를 고친 뒤 다시 실행합니다. 복구를 위해 `.agents/oma-config.yaml`을 삭제하지 마세요. 이 파일은 업데이트 사이에 설정을 보존하는 사용자 소유 설정입니다.

## 3. 작은 태스크 하나 실행

AI 도구에서 기존 Git 저장소를 엽니다. 불러온 `oma-scm` 스킬을 사용하거나, 이름 있는 런타임 프리셋이 설치한 사본을 사용하세요. Custom 선택을 사용했다면 이 예시를 위해 `oma-scm`을 포함하세요.

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

보고된 브랜치와 변경 사항을 실제 Git 출력과 비교하세요. 에이전트는 어떤 명령을 실행했는지와 각 명령의 종료 코드를 보고해야 합니다. 이 읽기 전용 태스크에는 코드 테스트나 빌드가 필요하지 않습니다.

평범한 프롬프트는 워크플로우를 시작하지 않습니다. 프롬프트 훅이 활성화된 곳에서는 권고 성격의 스킬 힌트가 추가됩니다. 스킬 라우팅은 호스트 또는 선택한 워크플로우가 수행하므로, 임의의 호스트 프롬프트만으로 훅이나 특정 스킬이 실행된다고 보장할 수 없습니다. 실행 계약은 저장소 관례를 확인하고 요청된 읽기 전용 범위를 지키며 어떤 검사를 실행했는지 보고해야 합니다. 정확한 파일과 명령은 프로젝트에 따라 달라집니다.

API와 UI 경계를 넘는 태스크에는 `/work` 또는 `/orchestrate`를 명시적으로 선택합니다. 단일 도메인이라면 [단일 스킬 실행](../guide/single-skill.md)을 계속 읽으세요. 더 긴 예시는 [사용 가이드](../guide/usage.md)에 있습니다.

## 4. 규모를 키우기 전에 기본값 확인

스킬을 임시로 불러오는 것만으로는 이 런타임 기본값이 설정되지 않습니다. 프로젝트 훅, 프로바이더 설정, 팀 워크플로우가 필요하면 [설정 선택](./choose-setup.md)의 런타임 경로를 사용하세요.

OMA는 `model_preset: auto`, 코드 인텔리전스의 Serena, 시맨틱 메모리의 Agent Memory, 네이티브 웹 검색, 비활성화된 텔레메트리로 시작합니다. Serena는 공유 `bridge` 전송을 사용하고 별도 설정이 없으면 자동으로 업데이트됩니다. 브라우저 DevTools MCP는 선택 사항이며, 새 대화형 설정에서는 먼저 Aside를 제안합니다. 동작과 오버라이드 키는 [중요한 기본값](./important-defaults.md)에서 확인하세요.

관리되는 태스크가 멈추면 먼저 `oma agent status <session-id> [agent-id]`를 실행한 다음 `.agents/state/agent-runs/`의 실행 기록과 주입된 구조화 클레임 경로를 확인합니다. 이 기록에는 실행, 태스크, 워크스페이스, 종료 코드, 검증 상태가 표시됩니다. `.agents/state/memories/` 아래의 사람이 읽는 `result-*.md`와 `progress-*.md`가 있으면 추가 맥락을 제공합니다. 실행이 더 이상 활성 상태가 아님을 확인한 뒤 실패한 가장 작은 명령만 다시 실행하세요. [지속 워크플로우](./glossary.md#persistent-workflow)는 완료되거나 `workflow done`이라고 말할 때까지 활성 상태로 남습니다. 상태 파일 복구는 [워크플로우](../core-concepts/workflows.md#persistent-mode-mechanics)를 참고하세요.

## 다음 단계

- 스킬 하나, 런타임 프리셋, Claude Code 플러그인 중에서 고르려면 [설정 선택](./choose-setup.md)
- 우선순위, 프로바이더, 복구 선택은 [중요한 기본값](./important-defaults.md)
- 프리셋, 벤더 설정, 전역 설치, 업데이트는 [설치](./installation.md)
- 33개 스킬 패키지와 디스패치 역할은 [에이전트](../core-concepts/agents.md)
- 계획, 병렬 실행, QA, 지속 모드는 [워크플로우](../core-concepts/workflows.md)
- 설치, 벤더, 훅이 예상대로 동작하지 않을 때는 [문제 해결](../guide/troubleshooting.md)
