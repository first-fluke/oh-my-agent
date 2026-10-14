---
title: "가이드: 글로벌 설치"
sidebar_label: 전역 설치
description: 프로젝트별 설치 대신 OMA 글로벌 홈(~/.oma/)에 oh-my-agent을 설치해 모든 프로젝트에서 같은 스킬, 워크플로우, 규칙을 사용합니다. oma install --global, oma update --global, oma uninstall --global, OMA_HOME 오버라이드, oma doctor를 통한 이중 설치 감지, 플랫폼별 주의사항(sudo 거부, CI, WSL, cwd=HOME 가드)을 다룹니다.
---

## 글로벌 설치란?

기본적으로 `oma install`은 모든 항목을 현재 프로젝트 디렉토리에 한정해 설치합니다. SSOT는 `<cwd>/.agents/`에 위치하고, 벤더 설정은 `<cwd>/.claude/`, `<cwd>/.codex/` 등에 기록됩니다. **글로벌 설치**(`oma install --global`)는 oh-my-agent을 대신 OMA 글로벌 홈에 설치하므로, 새로운 프로젝트를 열 때마다 설치 단계를 반복하지 않아도 동일한 스킬, 워크플로우, 규칙을 모든 프로젝트에서 사용할 수 있습니다. SSOT는 `~/.oma/.agents/`에 위치하고, 벤더 설정은 그대로 `~/.claude/`, `~/.codex/` 등에 위치합니다.

## 프로젝트 vs 글로벌 비교

| 항목 | 프로젝트 (`oma install`) | 글로벌 (`oma install --global`, 기본 OMA 홈) |
|--------|------------------------|--------------------------------|
| SSOT 위치 | `<cwd>/.agents/` | `~/.oma/.agents/` |
| 벤더 설정 | `<cwd>/.claude/`, `<cwd>/.codex/` 등 | `~/.claude/`, `~/.codex/` 등 |
| Lock 파일 | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| 메타데이터 | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| 사용 사례 | 프로젝트별 커스터마이징 | 모든 프로젝트에 적용되는 개인 기본값 |
| oma-config.yaml 범위 | 프로젝트 한정 | 사용자 전체 기준값 |

두 방식은 공존할 수 있습니다. `oma doctor`는 두 설치가 모두 존재하면 함께 보고하며, 둘 사이의 드리프트가 있을 경우 이를 표시합니다.

글로벌 설치가 성공하면 사용자 기준 파일과 해석된 프로필을 확인합니다.

```bash
oma doctor --global --json
oma doctor --global --profile
```

첫 번째 명령은 설치 및 벤더 상태를 보고하고, 프로필 명령은 에이전트가 사용하는 모델 계획을 보여줍니다. `--global`(또는 `-g`)을 빼지 마세요. 이 옵션이 없으면 두 명령 모두 현재 디렉토리의 프로젝트를 검사하며, 해당 프로젝트의 설정을 글로벌 기본값 위에 덮어씌운 결과를 보여줍니다.

## 최초 실행 설정

머신에서 `oma install --global`을 처음 실행하면, 설치하기 전에 다음과 같은 설명 안내가 출력됩니다.

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

확인하면 설치가 이어집니다. 이후 설치 흐름은 프로젝트 설치와 동일한 인터랙티브 단계(언어, 모델 프리셋, 프로젝트 유형, 벤더 선택)를 따릅니다.

설치가 성공하면 다음 단계가 안내됩니다.

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 주의사항

### sudo 거부

`oma install`은 어떤 모드에서도 `sudo`로 실행하면 즉시 종료됩니다.

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

`sudo` 없이 일반 사용자 계정으로 명령을 실행하세요.

### CI 환경

CI 파이프라인 안에서 `oma install --global`을 실행하면 CI 러너의 HOME 디렉토리를 수정하게 됩니다. 일반적으로 이는 바람직하지 않습니다. 만약 부트스트래핑 파이프라인 등으로 꼭 필요하다면, oma는 다음과 같은 경고를 출력합니다.

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

이 경고는 `CI`가 `true` 또는 `1`일 때 나타납니다. 이 값만으로도 설치가 비대화형으로 전환되므로, 입력을 기다리지 않고 기본값으로 진행합니다. CI 밖에서는 `--yes` 또는 `OMA_YES=1`로 같은 비대화형 동작을 얻을 수 있습니다.

### WSL: Linux HOME vs Windows USERPROFILE

oma가 Windows Subsystem for Linux 내부에서 실행 중임을 감지하면 다음과 같이 안내합니다.

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL 설치와 PowerShell 설치는 서로 독립적입니다. 양쪽 모두에서 글로벌 설치 효과를 얻으려면 WSL에서 한 번, PowerShell에서 한 번 각각 `oma install --global`을 실행하세요.

### cwd = HOME 가드 (프로젝트 모드)

`--global` 없는 `oma link`와 `oma update`는 현재 디렉토리가 HOME인 동안 실행을 거부합니다. 프로젝트 모드에서는 `<cwd>/.claude/settings.json`이 `~/.claude/settings.json`과 같은 파일, 즉 전역 Claude Code 설정이 됩니다. 프로젝트 범위 렌더링은 이 파일의 `$HOME/.claude/hooks/...` 명령을 `$CLAUDE_PROJECT_DIR/...`로 다시 쓰므로, 자체 `.claude/hooks/`가 없는 프로젝트에서는 모든 훅과 상태 바가 깨집니다. 글로벌 설치에는 대신 `oma link --global` / `oma update --global`을 사용하거나, 먼저 `cd`로 프로젝트 디렉토리에 들어가세요.

현재 디렉토리가 HOME인 상태에서 `--global` 없이 `oma install`을 실행하면, oma는 다음과 같이 경고합니다.

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

비대화형 또는 CI 모드에서는 자동으로 중단됩니다. 사용자 전체 설치가 의도라면 `--global`을 사용하세요.

## 글로벌 설치 다시 링크하기

`oma link`는 다시 설치하지 않고 SSOT에서 벤더 네이티브 파일만 재생성합니다. `install`, `update`와 마찬가지로 설치 컨텍스트에서 대상을 해석하므로, `~/.oma/.agents/`를 정리하려면 `--global`을 전달하세요. `$HOME`뿐 아니라 어느 디렉토리에서 실행해도 동작합니다.

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

`--global`이 없으면 `oma link`는 `<cwd>/.agents/`를 대상으로 삼습니다. 그래서 설치가 글로벌인 상태에서 프로젝트 안에서 실행하면 거기에 `.agents/` 디렉토리가 없다고 보고합니다.

## 제거

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

uninstall 명령은 oma가 소유한 파일과 사용자가 소유한 파일을 구분합니다. `.agents/state/` 아래의 `managed-skills.json`에 OMA 관리 대상으로 기록된 스킬만 제거하며, 생성된 Copilot 프롬프트 파일은 `<!-- oma:generated -->` 마커로 식별합니다. 사용자 소유 콘텐츠(`oma-config.yaml`, `mcp.json`, 관리 대상으로 기록되지 않은 skill)는 절대 삭제되지 않습니다. 정확한 목록을 보려면 먼저 `--dry-run`을 실행하세요.

프로젝트 설치를 제거하려면 `--global`을 생략합니다.

```bash
oma uninstall [--dry-run]
```

## OMA_HOME 오버라이드

OMA가 소유한 글로벌 데이터를 다른 위치로 옮기려면 `OMA_HOME`을 절대 경로로 설정합니다.

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME`은 글로벌 저장소 루트이며 프로젝트 설치 대상이 아닙니다. 위 값을 사용하면 글로벌 정의는 `/tmp/oma-test/.agents/`에 위치하고, 프로젝트 설치와 링크는 계속 `<cwd>/.agents/`를 사용합니다. 벤더 네이티브 설정과 인증 정보는 `OMA_HOME` 밖에 남습니다. 글로벌 OpenCode 통합 파일은 실제 HOME 디렉토리 아래의 `~/.config/opencode/`에 기록됩니다.

`OMA_STATE_HOME`은 프로필/L1/프로젝트 런타임 저장소에 대한 명시적인 예외입니다. 절대 경로여야 하며 `u/`를 포함합니다. 설정하지 않으면 프로필은 `OMA_HOME`을 따릅니다. `XDG_CONFIG_HOME`은 더 이상 OMA 상태의 위치를 바꾸지 않으며 OMA의 OpenCode 출력 경로도 바꾸지 않습니다. OS 키체인 비밀값, AgentMemory/Honcho 데이터, 관리형 툴체인 캐시는 기존 소유자 위치에 그대로 남습니다.

## 글로벌 저장소 구조

글로벌 데이터는 기본적으로 `~/.oma` 아래에 저장됩니다. `OMA_HOME`이 설정되어 있으면 `~/.oma`를 그 값으로 바꿔 읽으세요.

| 데이터 | 위치 |
|---|---|
| 글로벌 정의, 설정, 설치 메타데이터 | `~/.oma/.agents/` |
| 스케줄 매니페스트, 캡처된 환경, 실행 로그 | `~/.oma/schedule/` |
| 글로벌 백업 | `~/.oma/backup/` |
| Serena 레지스트리, 잠금, 로그 | `~/.oma/state/serena/` |
| Vault 키 이름 인덱스 | `~/.oma/state/vault-index.json` |
| 프로필, L1 세션, 프로젝트 런타임 | `~/.oma/u/<profile>/` (`OMA_STATE_HOME`이 설정되면 `<OMA_STATE_HOME>/u/<profile>/`) |

글로벌 설정은 기본값을 제공합니다. 가장 가까운 프로젝트의 `.agents/oma-config.*`와
그 로컬 오버레이가 이를 덮어쓰며, 서로 다른 상위 프로젝트 루트는 병합하지 않습니다.
전체 순서는 [설정 로딩](./oma-config-semantics.md#precedence-table)을 참고하세요.
프로젝트가 `semantic_memory: none`을 선택하면 글로벌 설정이 AgentMemory를
선택하더라도 메모리는 비활성화된 상태로 유지됩니다.

## 기존 설치

홈 마이그레이션은 `~/.agents/`와 `~/.config/oma/`에 있는 OMA 소유 데이터를
새 구조로 복사합니다. 원본은 그대로 남지만, 검증된 OMA 소유 스킬 디렉토리는
탐색용 링크로 변환됩니다. 이때 기존 경로가 마이그레이션된 스킬을 가리키는 링크로
바뀌기 전에 원래 내용을 `~/.oma/backup/legacy-global-skills/` 아래에 보관합니다.
기존 대상 파일은 덮어쓰지 않으며, 충돌과 사용 중인 데이터는 재시도 대상으로
보고됩니다. Vault 인덱스는 키 이름만 병합하고 비밀값을 OS 키체인 밖으로 옮기지
않습니다. 사용자 스킬과 외부 링크는 그대로 두며, 벤더 인증 파일도 옮기지
않습니다. 런타임 리더는 새 경로만
사용합니다.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

글로벌 설치와 업데이트는 글로벌 파일을 쓰기 전에 마이그레이션을 실행합니다.
프로젝트 설치/업데이트는 관련 없는 글로벌 데이터를 마이그레이션하지 않고 통합된
루트를 사용합니다. 마이그레이션은 OS 작업 등록을 바꾸지 않으므로, 스케줄이 있다면
마이그레이션 후 `oma schedule sync`를 실행하세요. 실행 중인 서비스나 러너가 있으면
데이터 이동이 미뤄질 수 있으니, 해당 프로세스를 끝낸 뒤 마이그레이션을 다시 실행하세요.

## 함께 보기

- [설정 로딩](./oma-config-semantics.md): 글로벌, 프로젝트, 로컬 설정 파일이 병합되는 방식
- [기존 프로젝트 통합](./integration.md): 프로젝트 모드 설치, 검증, 롤백
- [자동 업데이트](./automated-updates.md): CI에서 `oma update` 실행
