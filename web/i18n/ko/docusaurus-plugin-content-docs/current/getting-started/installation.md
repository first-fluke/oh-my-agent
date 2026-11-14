---
title: 설치
description: oh-my-agent 설치, 스킬과 프로바이더 선택, 생성된 프로젝트 파일, 모델과 런타임 기본값, `oma doctor`를 통한 검증을 설명합니다.
---

# 설치

태스크 하나만 처리하려면 [단일 스킬](./choose-setup.md#load-one-skill)부터 시작하세요. 프로젝트 훅과 팀 워크플로우가 필요하면 아래의 런타임 설치를 사용합니다. [설정 방식 선택 가이드](./choose-setup.md)는 지침 로딩, 스킬 프리셋, Claude Code 마켓플레이스 설치를 구분해서 설명합니다.

Grok Bot에서는 [Grok Bot 설치 페이지](/grok-bot/)를 사용하세요. 기본 **Add to Grok Bot** 링크에는 승인된 Cursor Marketplace 등록이 필요하므로 등록 심사 중에는 사용할 수 없습니다. 별도의 [수동 설치 가이드](https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md)는 Bot 컴퓨터용 `oma install --target grok-bot`을 설명합니다. 아래의 Grok Build 런타임 통합은 이와 다른 설치 대상입니다.

## AI 에이전트로 설치 {#install-with-an-ai-agent}

코딩 에이전트에 다음 문장을 붙여 넣으세요:

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

[에이전트 설치 가이드](https://github.com/first-fluke/oh-my-agent/blob/main/docs/agent-install.md)는 CLI 준비, 비대화형 프로젝트 설정, `oma doctor`를 통한 검증을 다룹니다.

## 사전 요구사항

- **AI 기반 IDE 또는 CLI**: Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot, Hermes 등 지원되는 호스트 하나 이상
- **bun**: JavaScript 런타임 및 패키지 매니저 (설치 스크립트에서 없으면 자동 설치)
- **uv**: Python 패키지 매니저 (없으면 부트스트랩 스크립트가 설치를 제안)
- **코드 인텔리전스 프로바이더**: Serena가 기본 프로바이더입니다. 프로바이더 설정에서 선택하면 Gortex도 지원합니다. 설치 프로그램은 `uv tool install`로 Serena를 부트스트랩할 수 있으며 선택적 의존성을 사용할 수 없을 때 경고 후 계속합니다. Gortex를 선택하면 프로젝트 모드의 `oma install`과 `oma update`가 아직 추적되지 않은 프로젝트를 Gortex 데몬에 등록하고(`gortex track`), OMA가 생성한 디렉토리를 Gortex CLI로 해당 프로젝트의 제외 목록에 추가합니다. 프로젝트 트리에는 아무것도 쓰지 않습니다. Gortex 자체는 별도로 설치해야 합니다.

설치 프로그램은 기능별로 통합을 분류합니다. 훅 벤더는 Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro, Qwen이고, OpenCode와 pi는 확장 브리지를 사용하며, GitHub Copilot과 Hermes에는 스킬 링크를 제공하고, ZCode에는 워크플로우 명령을 제공합니다. 여러 벤더를 선택할 수 있지만 첫 태스크에는 사용할 호스트만 있으면 됩니다.

---

## 방법 1: 한 줄 설치

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

두 부트스트랩 스크립트는 동일하게 동작합니다:
1. 플랫폼을 감지합니다 (macOS, Linux, 또는 Windows)
2. bun과 uv(선택한 경우 serena도)를 확인하고, 없으면 설치합니다
3. PATH에 `oma`가 아직 없으면 `bun install --global oh-my-agent`로 `oma` 명령을 전역 설치합니다 (훅과 워크플로우가 이 명령을 호출합니다)
4. 프리셋과 프로바이더 선택이 포함된 대화형 설치 프로그램을 실행합니다
5. 선택한 스킬과 설정으로 `.agents/`를 생성합니다
6. 런타임 통합 레이어를 설정합니다 (감지된 벤더용 훅, 심볼릭 링크, 설정)
7. 코드 인텔리전스와 메모리 MCP 서버를 설정합니다

선택적 의존성 설치가 실패해도 부트스트랩은 계속 진행하고 후속 명령을 보고합니다. AgentMemory는 기본 시맨틱 메모리 프로바이더이며, 설치, 시작 또는 헬스 체크가 실패하면 `oma install`과 `oma update`도 실패합니다. `providers.semantic_memory: none` 또는 `honcho`를 선택하거나 `OMA_NO_AGENTMEMORY=1`을 설정하면 AgentMemory 자동 준비를 건너뜁니다. 설치 프로그램이 끝나면 `oma doctor`를 실행하세요.

### 설치 프로그램이 기본으로 함께 하는 일 {#what-the-installer-also-does-by-default}

- **Aside 브라우저 MCP**: 대화형 설정에서 미리 선택되며, 선택을 유지한 경우에 한해 설치되어 있지 않으면 `curl -fsSL https://releases.aside.com/install.sh | bash`로 설치됩니다. 브라우저 MCP 단계에서, 또는 나중에 `oma update mcp`로 선택을 해제할 수 있습니다.
- **AgentMemory 서비스**: `bun install -g @agentmemory/agentmemory`로 설치되고 로그인 서비스(launchd, systemd 사용자 유닛 또는 Windows 예약 작업)로 등록됩니다.
- **CUE**: 부트스트랩 스크립트가 `brew install cue`(macOS/Linux) 또는 `winget`(Windows)으로 설치하며, Serena가 코드 인텔리전스 프로바이더이면 `oma install`도 한 번 더 설치합니다.
- **프로젝트 밖에 쓰는 파일**: `~/.claude.json`(프로젝트를 신뢰할 수 있는 Claude Code 워크스페이스로 표시), `~/.serena/`(OMA 컨텍스트, 응답 크기 하한, 프로젝트 등록), `~/.cursor/cli-config.json`(Cursor의 커밋 attribution 끄기), `~/.grok/config.toml`(텔레메트리), `~/.gemini/antigravity-cli/`(HUD)이며, 각각 선택한 벤더에 대해서만 씁니다. 홈 디렉터리의 벤더 폴더(Antigravity, Hermes, Kimi)에 스킬을 링크할 때는 먼저 묻습니다.
- **텔레메트리 옵트아웃**: Claude `DISABLE_TELEMETRY=1`(이 값은 Claude Code Remote Control도 끕니다)과 Gemini, Qwen, Codex, Grok의 사용 통계를 끕니다. 벤더 기본값을 유지하려면 `telemetry: true`를 설정하세요.
- **Claude Code 설정**: `.claude/settings.json`에서 설정되지 않은 키를 채웁니다. `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180`과 auto memory, adaptive thinking, 오류 보고, 내장 git 지침을 끄는 env 플래그가 포함됩니다. 이미 설정한 값은 유지됩니다.
- **공동 작성자 트레일러**: Claude Code의 커밋 attribution이 `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`이 되고, PR에는 "Generated with oh-my-agent" 줄이 붙습니다. 끄려면 `scm.co_author.enabled: false`를 설정하세요.
- **commit-msg 가드**: `.githooks/commit-msg`는 `.githooks/co-authors.allow`나 `scm.co_author.email`에 없는 `Co-authored-by` 주소를 거부합니다. `git config --local core.hooksPath .githooks`는 다른 훅이 활성화되어 있지 않을 때만 설정되며, 그렇지 않으면 oma가 가드를 체인으로 연결하는 방법을 출력합니다. 사용하지 않으려면 `scm.co_author.enforce_hook: false`를 설정하세요.
- **백그라운드 업데이트**: `oma update`는 백그라운드에서 `oma` CLI를 업데이트하고(멈추려면 `auto_update_cli: false` 또는 `OMA_SKIP_VERSION_CHECK=1`), `uv tool upgrade serena-agent --prerelease=allow`를 실행합니다(멈추려면 `serena.auto_update: false`).
- **Serena 정리 타이머**: Serena가 기본 `bridge` 모드일 때, 공유 Serena 서버를 처음 시작한 에이전트 세션이 유휴 상태인 공유 Serena 서버를 5분마다 중지하는 타이머를 등록합니다(launchd `dev.oma.serena-daemon-gc`, systemd 사용자 타이머 `oma-serena-daemon-gc.timer` 또는 Windows 예약 작업 `OMA Serena Daemon GC`). 공유 서버와 타이머를 건너뛰려면 `serena.mode: stdio`를 설정하세요. `oma uninstall`은 이 타이머를 제거하지 않습니다.
- **비대화형 실행**(`-y`, `OMA_YES=1`, `CI=true`)은 `--preset`으로 다른 프리셋을 선택하지 않는 한 `All` 스킬 프리셋을 사용하며, `model_preset: auto`와 백엔드 언어 Python을 사용합니다. `mcp.devtools_browsers`에 이미 브라우저가 들어 있지 않으면 브라우저 MCP를 선택하지 않습니다(Aside 설치 스크립트도 건너뜁니다).

---

## 방법 2: bunx를 통한 수동 설치

```bash
bunx oh-my-agent@latest
```

의존성 자동 설치 과정 없이 대화형 설치 프로그램을 바로 실행합니다. bun이 미리 설치되어 있어야 합니다.

설치 프로그램이 [스킬 프리셋](./glossary.md#skill-preset) 선택을 안내합니다. 현재 프리셋은 `cli/constants/skill-data.ts`의 `PRESETS`에 정의되어 있습니다.

### 프리셋 {#presets}

저장소에 필요한 작업에 맞는 프리셋을 고르세요. 아래 스킬 이름에서는 `oma-` 접두사를 생략했습니다.

| 프리셋 | 이런 프로젝트일 때 선택 | 포함 스킬 | 개수 |
|--------|-------------------------------|-----------------|-------|
| **all** | 어떤 프로젝트든, 또는 모든 워크플로우가 바로 동작하길 원할 때 | 레지스트리의 모든 스킬 | 33 |
| **fullstack** | 백엔드와 Terraform 인프라를 갖춘 웹·모바일 클라이언트 | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | 백엔드와 데이터베이스를 갖춘 웹 프론트엔드 | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | 백엔드와 데이터베이스를 갖춘 모바일 앱 | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | 웹 UI만 | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | 데이터베이스를 갖춘 API 또는 서비스 | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | 모바일 앱만 | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | 인프라, CI/CD, 관측성(observability) 작업 | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | 보안 스캔, 코드 리뷰, 수정 | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | 논문, 시장 조사, PDF/HWP 변환 | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | 디자인 에셋, 이미지, 음성, 글 콘텐츠 | design, image, voice, academic-writing, translation, scm | 6 |

프리셋은 스킬 묶음이며 스킬마다 서브에이전트 정의를 하나씩 만들지 않습니다. `all` 프리셋은 실제 스킬 레지스트리에서 확장되므로 저장소에 따라 목록이 늘어날 수 있습니다. 도메인 프리셋은 해당 분야의 스킬만 포함합니다.

커맨드 라인에서 프리셋 선택:

```bash
oma install --preset frontend --yes
```

`--preset`은 위 표의 이름을 사용하며 대화형 스킬 프롬프트와 비대화형 `all` 기본값보다 우선합니다. 알 수 없는 이름은 설치가 시작되기 전에 거부됩니다. 이 옵션을 생략하면 기존 선택 흐름이 유지됩니다. 이 옵션은 스킬을 선택하며, 공유 파일, 에이전트, 워크플로우, 훅, 프로바이더 설정은 여전히 런타임 설치 프로그램을 따릅니다. 더 작은 프리셋으로 재설치하면 이전에 설치된 스킬이 유지됩니다. Custom 선택은 대화형 메뉴에서만 사용할 수 있으며 `--preset`에는 `custom`이나 빈 값을 넣을 수 없습니다.

설치가 끝나면 선택한 스킬 목록과 워크플로우 가용성 보고서를 확인하세요. 워크플로우는 필수 스킬 매니페스트의 이름과 설명이 유효할 때만 노출됩니다. 기존에 유지된 스킬도 이 요구사항을 충족할 수 있습니다. 조건부 참조는 별도로 보고되며 선택한 프리셋을 확장하지 않습니다. 이 검사는 매니페스트만 다루므로 도구, 프로바이더, 자격 증명, 실행 여부는 별도로 확인해야 합니다.

### 프리셋 밖의 스킬이 필요한 워크플로우 {#workflows-that-need-skills-outside-a-preset}

모든 프리셋이 워크플로우와 에이전트 정의를 복사하지만, 명령과 프롬프트는 필수 스킬을 사용할 수 있는 워크플로우에 대해서만 노출됩니다. 예를 들어 새로 설치한 frontend 환경에서는 `oma-coordination`이 없기 때문에 `/work`를 사용할 수 없으며, 기존 PM과 QA 스킬만으로도 다른 진입 요구사항은 충족됩니다. 설치 프로그램은 `all`로 전환하지 않고 누락된 스킬을 보고합니다.

| 워크플로우 | 필수 진입 스킬 | 포함하는 프리셋 |
|----------|-------------|-------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | 모든 프리셋 |

분기별 참조는 권고 사항으로 남습니다. 예를 들어 `/convert`는 입력을 확인한 뒤 PDF, HWP, 또는 영상 도구를 고르며, `/ralph`와 `/ultrawork`는 리팩터링 분기에서 `oma-refactor`를 필요로 할 수 있습니다. 이러한 참조는 무조건적인 진입 요구사항이 아닙니다.

누락되었거나 잘못된 매니페스트를 진단하려면 `oma doctor`를 실행하세요. 누락된 스킬을 추가하려면 `oma install`을 실행해 **Select individually**를 선택하세요. 매니페스트를 고친 뒤에는 `oma link`를 실행해 워크플로우 노출을 새로 고침하세요. 재설치도 이를 갱신합니다. OMA 전역 설치에는 동일한 `--global` 범위를 사용하세요. 사용할 수 없는 OMA 명령이 제거되더라도 기존 사용자 명령은 유지됩니다.

### 도메인 플러그인 {#domain-plugins}

Claude Code 마켓플레이스 사용자는 `oh-my-agent` 마켓플레이스를 추가한 뒤 도메인 엔트리를 선택할 수 있습니다:

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

도메인 엔트리는 각각 frontend 8개, security 6개, research 8개 스킬과 이에 맞는 네이티브 에이전트 구성을 포함합니다. 세션 부트스트랩은 해당 프리셋을 런타임 설치 프로그램에 전달합니다. 공유 런타임 설정과 기존에 설치된 스킬은 위에서 설명한 설치 프로그램 동작을 따릅니다. `oma` 엔트리는 전체 플러그인을 유지합니다. 생성된 Codex 마켓플레이스 카탈로그와 Grok Build 및 ZCode 카탈로그에도 동일한 도메인 루트가 선언됩니다. Antigravity CLI(생성된 트리 또는 `oma-antigravity-plugin.tar.gz` 릴리스 아티팩트에 대한 `agy plugin install ./antigravity-plugin`), Grok Build CLI, ZCode, Kimi Code(`/plugins install`)는 각각 자체 생성된 매니페스트를 읽습니다. 호스트별 정확한 절차는 [Claude 호환 플러그인 호스트](../guide/vendor-capabilities.md#claude-compatible-plugin-hosts)를 참고하세요.

고정된 호스트 CI 작업은 새 러너에서 로컬 마켓플레이스를 등록하고, 도메인 엔트리를 설치한 뒤, 생성된 인벤토리를 검사합니다. 이러한 검사는 모델 호출 없이 실행됩니다. 런타임 자격 증명, 외부 프로바이더, 첫 태스크의 성공 여부는 여전히 별도 검증이 필요합니다. 릴리스 검사에서는 모든 도메인 루트의 두 매니페스트가 CLI 버전과 일치하고 Release Please 버전 업데이터를 갖추었는지도 요구합니다.

공유 리소스(`_shared/`)는 프리셋에 관계없이 항상 설치됩니다. 여기에는 핵심 라우팅, 컨텍스트 로딩, 프롬프트 구조, 벤더 감지, 실행 프로토콜, 메모리 프로토콜이 포함됩니다.

### 생성되는 항목

설치 후 프로젝트에 다음 내용이 포함됩니다.

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 20, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

설치 프로그램은 선택한 호스트에 필요한 벤더 디렉토리만 만듭니다. 훅 원본은 `.agents/hooks/core/`에 남고 생성된 벤더 파일은 통합 출력입니다. 오래된 프로젝트에서는 Serena가 레거시 `.serena/memories/` 디렉토리를 사용할 수도 있습니다.

---

## 방법 3: 전역 설치 {#method-3-global-install}

CLI에서 직접 사용하려면(대시보드, 에이전트 스폰, 진단 등) oh-my-agent을 전역으로 설치하세요:

:::note
이 섹션은 `oma` 명령을 설치합니다. 스킬, 워크플로우, 룰을 모든 프로젝트용 OMA 글로벌 홈(`~/.oma/.agents/`)에 설치하는 `oma install --global`과는 다릅니다. [글로벌 설치](../guide/global-install.md)를 참고하세요.
:::

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

이렇게 하면 `oma` 명령이 전역으로 설치되어 어디서든 모든 CLI 명령을 사용할 수 있습니다:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
```

`oma`는 `oh-my-agent`의 줄임말입니다. 두 명령어 모두 사용할 수 있습니다.

---

## AI CLI 도구 설치

AI CLI 도구가 하나 이상 설치되어 있어야 합니다. oh-my-agent은 여러 벤더를 지원하며, 에이전트-CLI 매핑을 통해 에이전트마다 다른 CLI를 지정할 수 있습니다.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

인증은 첫 실행 시 자동으로 수행됩니다. Claude Code는 `.claude/`를 훅과 설정에 사용하며, 스킬은 `.agents/skills/`에서 심볼릭 링크됩니다.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

설치 후 `codex login`을 실행하여 인증합니다.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

설치 후 CLI 내에서 `/auth`를 실행하여 인증합니다.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

인증은 첫 실행 시 `agy`가 자동으로 처리합니다. 바이너리 이름은 `agy`입니다. 헤드리스 환경에서는 `ANTIGRAVITY_API_KEY` 환경 변수를 설정하세요. `oma doctor`는 `~/.gemini/antigravity-cli/cache/onboarding.json`을 통해 인증 상태를 확인합니다.

---

## oma-config.yaml

`oma install` 명령은 `.agents/oma-config.yaml`을 생성합니다. 이 파일은 모든 oh-my-agent 동작의 중앙 설정 파일입니다:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### 필드 레퍼런스

| 필드 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|-------------|
| `language` | string | 필수 | 응답 언어 코드. en, ko, ja, zh, es, fr, de, pt, ru, nl, pl을 지원합니다. |
| `model_preset` | string | 필수 | 활성 [모델 프리셋](./glossary.md#model-preset) 키. `auto`는 현재 런타임을 따르며, 고정 키로 `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro`, `mixed`를 사용할 수 있습니다. 사용자 정의 프리셋 키도 유효합니다. 자세한 내용은 [에이전트별 모델 설정](../guide/per-agent-models.md)을 참조하세요. |
| `agents` | map | 선택 | 역할별 모델 오버라이드입니다. `agents.default`에는 `cli`(명시적 에이전트 설정과 선택한 프리셋이 벤더를 해석하지 못할 때 `oma agent spawn`이 사용할 폴백 CLI)와 기본 `effort`, `thinking`, `memory`가 들어 있습니다. |
| `providers` | map | 선택 | 기능 프로바이더(`code_intelligence`의 `serena` 또는 `gortex`, `code_intelligence_guard`의 `block` 또는 `off`, `docs`의 `context7`, `web`의 `native` 또는 `brave`, `semantic_memory`의 `agentmemory`, `honcho`, 또는 `none`), 자격 증명 섹션(`brave`, `exa`, `honcho`), `free`(`model_preset: free`가 사용하는 FreeLLMAPI 게이트웨이) 같은 이름 있는 LLM 프로바이더입니다. API 키는 환경 변수에 보관하세요. |
| `date_format` | string | 선택 | 타임스탬프 형식 (`ISO`, `US`, `EU`). 기본값: `ISO`. |
| `timezone` | string | 선택 | 시간대 식별자(예: `Asia/Seoul`). 생략하면 호스트 시스템 시간대를 사용합니다. |
| `auto_update_cli` | boolean | 선택 | 정기 CLI 확인이 백그라운드에서 업데이트할 수 있는지 결정합니다. 기본값 `true`이며 `false`로 옵트아웃합니다. |
| `telemetry` | boolean | 선택 | 벤더 텔레메트리 옵트인입니다. 기본값 `false`입니다. |
| `agents` | map | 선택 | 에이전트별 부분 오버라이드 (object 전용 `AgentSpec`). 프리셋 기본값 위에 얕게 병합됩니다. |
| `models` | map | 선택 | 사용자 정의 모델 슬러그 (이전의 `models.yaml`에서 이동). |
| `custom_presets` | map | 선택 | 사용자 정의 프리셋. 빌트인 프리셋을 부분 상속하는 `extends:`를 지원합니다. |
| `mcp.devtools_browsers` | list | 선택 | DevTools MCP용 브라우저: `aside`, `chrome`, `firefox`. 생략하면 기존 설정을 유지하고 `[]`는 브라우저 서버를 명시적으로 비활성화합니다. |
| `serena.mode` | string | 선택 | `bridge`는 프로젝트 Serena 서버를 공유하는 기본값이며 `stdio`는 세션마다 하나의 프로세스를 사용합니다. |
| `serena.auto_update` | boolean | 선택 | `oma update`가 Serena를 업그레이드할지 결정합니다. 기본값 `true`입니다. |

> **설정 형식:** 유효한 `.agents/oma-config.cue`를 공용 설정으로 평가합니다. 공용 CUE 평가에 실패하면 로더가 `.agents/oma-config.yaml`로 폴백할 수 있습니다. 로컬 오버레이(`oma-config.local.cue` 또는 `.yaml`)는 선택 사항이며 잘못된 로컬 의도는 치명적 오류입니다. `OMA_MODEL_PRESET`은 현재 프로세스의 파일 값을 덮어씁니다.

### 벤더 해석

에이전트를 스폰할 때 CLI는 `agents.<id>`, 선택한 `model_preset`, 프리셋의 오케스트레이터 폴백, `default_cli` 순서로 설정을 해석합니다. `model_preset: auto`이면 현재 런타임의 네이티브 설정이 모델을 제공하며, 알 수 없는 런타임은 `default_cli`로 폴백합니다. 전체 매트릭스는 [에이전트별 모델](../guide/per-agent-models.md)을 참고하세요.

---

## 검증: `oma doctor`

설치와 설정 후 모든 것이 정상인지 확인합니다:

```bash
oma doctor
```

이 명령은 다음을 확인합니다:
- 선택한 호스트 CLI가 설치되어 있고 접근 가능한지. 선택 사항인 도구는 별도로 보고합니다.
- 설정된 MCP 서버 항목이 유효한지 (예: Serena, Gortex, Context7, DevTools)
- SKILL.md 프론트매터가 유효한 스킬 파일이 있는지
- 심볼릭 링크와 훅 스크립트가 유효한 대상을 가리키는지
- 벤더 설정 파일에 훅이 올바르게 설정되어 있는지
- 선택한 코드 인텔리전스와 메모리 프로바이더에 연결 가능한지 (Gortex는 현재 프로젝트가 데몬의 추적 대상에 들어 있는지도 확인)
- `oma-config.cue` / `oma-config.yaml`이 필수 필드를 갖춘 유효한지

문제가 발견되면 `oma doctor`가 누락되었거나 잘못된 항목을 식별하고 첫 태스크를 막는 문제와 선택적인 통합 경고를 구분합니다.

에이전트마다 해석된 모델과 CLI를 확인하려면 다음을 실행하세요.

```bash
oma doctor --profile
```

전체 매트릭스와 마이그레이션 세부 사항은 [에이전트별 모델](../guide/per-agent-models.md)을 참고하세요.

---

## 업데이트

### CLI 업데이트

```bash
oma update
```

전역 oh-my-agent CLI를 최신 버전으로 업데이트합니다.

### 프로젝트 스킬 업데이트

프로젝트 내의 스킬과 워크플로우는 자동 업데이트용 GitHub Action(`action/`)을 통해 또는 설치 프로그램을 다시 실행하여 수동으로 업데이트할 수 있습니다:

```bash
bunx oh-my-agent@latest
```

설치 프로그램은 기존 설치를 감지하고 `oma-config.yaml` 및 사용자 지정 설정을 유지하면서 업데이트를 제안합니다.

---

## 다음 단계

선택한 AI IDE 또는 CLI에서 프로젝트를 열고 oh-my-agent을 사용해 보세요. 스킬 라우팅은 호스트에 따라 다르며 활성화된 훅이 워크플로우를 감지할 수 있습니다. 다음을 시도해 보세요:

```text
"Build a login form with email validation using Tailwind CSS"
```

또는 워크플로우 명령을 사용하세요:

```text
/plan authentication feature with JWT and refresh tokens
```

자세한 예제는 [사용 가이드](/docs/guide/usage)를, 각 전문가가 무엇을 하는지 알아보려면 [에이전트](/docs/core-concepts/agents)를 참조하세요. 설치나 훅이 예상대로 동작하지 않으면 [문제 해결](../guide/troubleshooting.md)을 참고하세요.
