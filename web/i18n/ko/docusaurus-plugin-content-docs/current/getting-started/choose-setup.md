---
title: 설정 선택
description: 태스크용 OMA 스킬 하나를 불러오거나, 도메인 프리셋을 고르거나, 런타임 의존성과 함께 Claude Code 플러그인을 설치합니다.
---

# 설정 선택

완료하려는 태스크의 진입점을 고릅니다.

| 필요한 것 | 진입점 | 설정되는 것 |
|---|---|---|
| 현재 에이전트에서 범위가 좁은 태스크 하나 | [스킬 하나 불러오기](#load-one-skill) | 임시 디렉토리의 지침과 지원 파일 |
| 프로젝트 훅, 전문 에이전트, 워크플로우 | [스킬 프리셋 설치](#install-a-skill-preset) | 선택한 스킬이 포함된 OMA 런타임 통합 |
| Claude Code 마켓플레이스 설치 | [플러그인 설치](#install-the-claude-code-plugin) | OMA 플러그인과 프로젝트 부트스트랩 |
| Copilot CLI, Kiro, Qwen Code, Hermes, Codex 패키지 설치 | [Agent Plugins 패키지](../guide/vendor-capabilities.md#agent-plugins-package) | 모든 호스트용 스킬과 MCP 서버. Copilot은 에이전트, 명령, 규칙, 부트스트랩 훅도 받습니다 |

## 스킬 하나 불러오기 {#load-one-skill}

코딩 에이전트에게 태스크에 맞는 명령을 실행하고, 반환된 지침을 읽도록 요청합니다. `skills use`는 지침과 지원 디렉토리 경로를 출력합니다. 다른 에이전트를 띄우거나 OMA 설치 프로그램을 실행하지는 않습니다.

| 태스크 | 명령 | 첫 요청 |
|---|---|---|
| 관리 화면 디자인 또는 기존 UI 리뷰 | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| 재현 가능한 버그 | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| 아키텍처 결정 | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

선택한 폴더에는 공유 지침 참조가 포함됩니다. 그 폴더 밖의 의존성은 그대로 명시됩니다. 다른 도메인 스킬, 프로젝트 규칙, CLI 작업, 브라우저 도구, 외부 엔진이 여전히 필요할 수 있습니다. 요청한 작업에 대해 선택한 스킬의 의존성을 읽으세요. 태스크에 훅이나 관리되는 실행이 필요하면 런타임을 설치합니다.

디자인 작업에서 `oma-design`은 관리 화면과 제품 인터페이스 방향에는 Interface Design을, 그 밖의 웹 아트 디렉션에는 Taste를, 기존 UI의 비평·감사·다듬기에는 Impeccable을 고릅니다. 프로젝트의 스택과 `DESIGN.md`는 구현 계약과 디자인 계약으로 남습니다.

## 스킬 프리셋 설치 {#install-a-skill-preset}

CLI를 한 번 설치한 다음 프로젝트의 스킬을 선택합니다.

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

CLI가 이미 설치되어 있으면 두 번째 명령부터 시작할 수 있습니다. 프리셋 이름과 프로바이더 옵션은 `oma install --help`를 사용하세요. [부트스트랩 설치 프로그램](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install)도 대화형 설정 전에 런타임 의존성을 준비합니다.

| 프리셋 | 첫 태스크 | 적용할 수 있는 워크플로우 예 |
|---|---|---|
| `frontend` | 설정 페이지를 계획한 다음 폼을 구현 | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | 인증이 있는 API 엔드포인트를 계획 | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | 논문을 찾고 근거를 비교 | 인용을 단 문헌 검색을 요청 |
| `all` | UI, API, 데이터에 걸친 기능을 조율 | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

`--preset`은 [이름이 있는 프리셋](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets)을 받습니다. 알 수 없는 이름, 빈 값, `custom`은 설치 전에 거부됩니다. 스킬을 하나씩 고르려면 `oma install`을 대화형으로 실행하고 Custom을 선택합니다. `--preset`이 없으면 무인 `--yes`/CI 설정은 `all`을 고릅니다.

frontend 프리셋은 스킬 8개를 선택합니다. 프리셋이 고르는 것은 스킬 내용입니다. 설치 프로그램은 공유 파일, 모든 워크플로우와 에이전트 정의, 훅, 프로바이더를 그대로 설정합니다. 일부 워크플로우는 도메인 프리셋 밖의 스킬이 필요합니다. 사용하기 전에 [워크플로우 의존성](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)을 확인하거나, 모든 워크플로우를 쓰려면 `all`을 선택하세요. 이미 설치된 환경에 더 작은 프리셋을 적용해도 다른 스킬은 제거되지 않습니다.

프로바이더 선택은 프리셋과 독립입니다. 예를 들어 프로젝트에 시맨틱 메모리 서비스가 필요 없으면 `--semantic-memory none`을 추가합니다. 런타임이 설정하는 다른 파일과 통합은 [설치 프로그램이 함께 하는 일](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)을 참고하세요.

설치 요약은 선택한 스킬을 나열하고, 유지된 스킬을 포함해 있는 스킬 매니페스트를 검사합니다. 조건부 분기를 포함한 정적인 워크플로우와 에이전트 참조를 참조된 스킬 매니페스트로 보고합니다. 태스크에 필요한데 없거나 읽을 수 없는 항목은 `oma doctor`로 고칩니다. 이 검사는 리소스 내용, 도구, 프로바이더, 자격 증명, 실행을 검증하지 않습니다.

## Claude Code 플러그인 설치 {#install-the-claude-code-plugin}

Claude Code 안에서 다음 명령을 실행합니다.

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

도메인 플러그인에는 `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent`, `oma-research@oh-my-agent`를 고릅니다. 전체 `oma` 항목은 스킬 선택을 모두 유지합니다. 도메인 항목은 그에 맞는 프리셋으로 부트스트랩합니다.

플러그인의 세션 시작 훅은 필요할 때 CLI를 준비하고, 현재 프로젝트에 `oma install --yes`를 실행합니다. 이 경로는 런타임 설정을 수행합니다. 성공 기록은 그 프로젝트에 속하고, 플러그인의 이벤트 훅은 설치된 CLI를 사용합니다. 플러그인 훅에는 Windows를 포함해 Bash가 필요합니다. 부트스트랩 타임아웃은 600초입니다. 실패하면 수동 설정 단계를 보고하고, 프로젝트 로그를 `.agents/state/plugin-bootstrap.last-error.log`에 남깁니다. 기록은 CLI 버전, 프로젝트 설정, 훅 검사가 통과한 뒤에만 다시 사용됩니다. 부트스트랩이 완료를 보고하면 세션을 다시 시작하세요.

설정 중 구성과 의존성 선택을 직접 하려면 `oma install`을 사용합니다. 전체 플러그인의 무인 부트스트랩은 `all` 스킬 프리셋을 사용하고, 각 도메인 플러그인은 자신이 고른 프리셋을 전달합니다. 더 작은 프리셋은 프로젝트에 이미 설치된 다른 스킬을 유지합니다.

## 결과 확인 {#check-the-result}

불러온 스킬이라면 에이전트가 선택한 지침을 읽었는지 확인하고, 태스크에서 실제로 실행한 검사를 보고받습니다. 런타임 설치라면 `oma doctor`를 실행하고 프리셋의 첫 요청을 시도합니다. 요청한 태스크가 그 프로바이더를 쓰면 doctor의 프로바이더 경고가 중요합니다.
