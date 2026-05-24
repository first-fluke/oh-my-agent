---
title: "가이드: 글로벌 설치"
description: 프로젝트마다 설치하는 대신 사용자 HOME(~/.agents/)에 oh-my-agent를 설치하여, 동일한 skill, workflow, rule을 모든 프로젝트에 적용합니다. oma install --global, oma update --global, oma uninstall --global, OMA_HOME 오버라이드, oma doctor를 통한 이중 설치 감지, 그리고 플랫폼별 주의사항(sudo 거부, CI, WSL, cwd=HOME 가드)을 다룹니다.
---

## 글로벌 설치란?

기본적으로 `oma install`은 모든 항목을 현재 프로젝트 디렉토리에 한정해 설치합니다. SSOT는 `<cwd>/.agents/`에 위치하고, 벤더 설정은 `<cwd>/.claude/`, `<cwd>/.codex/` 등에 기록됩니다. **글로벌 설치**(`oma install --global`)는 oh-my-agent를 사용자 HOME에 설치하므로, 새로운 프로젝트를 열 때마다 설치 단계를 반복하지 않아도 동일한 skill, workflow, rule을 모든 프로젝트에서 사용할 수 있습니다. SSOT는 `~/.agents/`에, 벤더 설정은 `~/.claude/`, `~/.codex/` 등에 위치합니다.

## 프로젝트 vs 글로벌 비교

| 항목 | 프로젝트 (`oma install`) | 글로벌 (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT 위치 | `<cwd>/.agents/` | `~/.agents/` |
| 벤더 설정 | `<cwd>/.claude/`, `<cwd>/.codex/` 등 | `~/.claude/`, `~/.codex/` 등 |
| Lock 파일 | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| 메타데이터 | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| 사용 사례 | 프로젝트별 커스터마이징 | 모든 프로젝트에 적용되는 개인 기본값 |
| oma-config.yaml 범위 | 프로젝트 한정 | 사용자 전체 기준값 |

두 방식은 공존할 수 있습니다. `oma doctor`는 두 설치가 모두 존재하면 함께 보고하며, 둘 사이의 드리프트가 있을 경우 이를 표시합니다.

## 최초 실행 설정

머신에서 `oma install --global`을 처음 실행하면, 설치를 진행하기 전에 다음과 같은 설명 안내가 출력됩니다.

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

확인하면 진행됩니다. 이후의 설치 흐름은 프로젝트 설치와 동일한 인터랙티브 단계(언어, 모델 프리셋, 프로젝트 유형, 벤더 선택)를 따릅니다.

설치가 성공하면 다음 단계가 안내됩니다.

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 주의사항

### sudo 거부

`oma install`은 어떤 모드에서도 `sudo`로 실행하면 즉시 종료됩니다.

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

`sudo` 없이 일반 사용자 계정으로 명령을 실행하시기 바랍니다.

### CI 환경

CI 파이프라인 안에서 `oma install --global`을 실행하면 CI 러너의 HOME 디렉토리를 수정하게 됩니다. 일반적으로 이는 바람직하지 않습니다. 만약 부트스트래핑 파이프라인 등으로 꼭 필요하다면, oma는 다음과 같은 경고를 출력합니다.

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

`--yes` 또는 `OMA_YES=1`이 설정되어 있으면 설치가 계속 진행됩니다. 이러한 옵션이 없으면 경고가 표시된 뒤 인터랙티브 모드로 계속되며, 대부분의 CI 환경에서는 응답이 없어 멈추게 됩니다.

### WSL: Linux HOME vs Windows USERPROFILE

oma가 Windows Subsystem for Linux 내부에서 실행 중임을 감지하면 다음과 같이 안내합니다.

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL 설치와 PowerShell 설치는 서로 독립적입니다. 양쪽 모두에서 글로벌 설치 효과를 얻으려면 WSL에서 한 번, PowerShell에서 한 번 각각 `oma install --global`을 실행하시기 바랍니다.

### cwd = HOME 경고 (프로젝트 모드)

현재 디렉토리가 HOME인 상태에서 `--global` 없이 `oma install`을 실행하면, oma는 다음과 같이 경고합니다.

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

비대화형 또는 CI 모드에서는 자동으로 중단됩니다. 사용자 전체 설치가 의도라면 `--global`을 사용하시기 바랍니다.

## 제거

```bash
# 무엇이 제거될지 미리보기 (실제로는 아무것도 삭제하지 않음)
oma uninstall --global --dry-run

# 글로벌 설치 제거
oma uninstall --global
```

uninstall 명령은 oma가 소유한 파일과 사용자가 소유한 파일을 구분합니다. 사용자 소유 콘텐츠(oma-config.yaml, mcp.json, `<!-- oma:generated -->` 마커가 없는 커스텀 skill)는 절대 삭제되지 않습니다.

프로젝트 설치를 제거하려면 `--global`을 생략합니다.

```bash
oma uninstall [--dry-run]
```

## OMA_HOME 오버라이드

테스트나 스테이징 목적으로 모든 oma 동작을 임의의 디렉토리로 리다이렉트할 수 있습니다.

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME`은 `--global`과 `process.cwd()`보다 우선합니다. 금지된 시스템 경로(`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`)는 `OMA_HOME`을 통해서도 거부됩니다. 경로는 절대 경로여야 하며 쓰기 가능해야 합니다.
