---
title: 설치
description: oh-my-agent 설치, 스킬과 프로바이더 선택, 생성된 프로젝트 파일, 모델과 런타임 기본값, `oma doctor`를 통한 검증을 설명합니다.
---

# 설치

## 사전 요구사항

- **AI 기반 IDE 또는 CLI**: Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot, Hermes 등 지원되는 호스트 하나 이상
- **bun**: JavaScript 런타임 및 패키지 매니저 (설치 스크립트에서 없으면 자동 설치)
- **uv**: Python 패키지 매니저 (없으면 부트스트랩 스크립트가 설치를 제안)
- **코드 인텔리전스 프로바이더**: Serena가 기본 프로바이더입니다. 프로바이더 설정에서 선택하면 Gortex도 지원합니다. 설치 프로그램은 `uv tool install`로 Serena를 부트스트랩할 수 있으며 선택적 의존성을 사용할 수 없을 때 경고 후 계속합니다. Gortex를 선택하면 프로젝트 모드의 `oma install`과 `oma update`가 아직 추적되지 않은 프로젝트를 Gortex 데몬에 등록하고(`gortex track`), OMA가 생성한 디렉토리를 Gortex CLI로 해당 프로젝트의 제외 목록에 추가합니다. 프로젝트 트리에는 아무것도 쓰지 않습니다. Gortex 자체는 별도로 설치해야 합니다.

설치 프로그램은 기능별로 통합을 분류합니다. 훅 벤더는 Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro, Qwen이고, OpenCode와 pi는 확장 브리지를 사용하며, GitHub Copilot과 Hermes에는 스킬 링크를 제공하고, ZCode에는 워크플로우 명령을 제공합니다. 여러 벤더를 선택할 수 있지만 첫 태스크에는 사용할 호스트만 있으면 됩니다.

---

## 방법 0: skills CLI (스킬만 쓸 때 가장 빠름)

감지된 에이전트 런타임에 OMA 스킬 팩을 설치합니다:

```bash
npx skills add first-fluke/oh-my-agent
```

전체 하네스 없이 스킬만 쓰고 싶을 때 가장 가볍게 시작하는 방법입니다. 워크플로우, 규칙, 훅, 게이트, `oma agent spawn`이 필요하면 아래 방법 1 또는 방법 2를 사용하세요.

## 방법 1: 한 줄 설치 (전체 하네스)

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
2. bun, uv, serena를 확인하고, 없으면 설치합니다
3. 프리셋 선택과 함께 대화형 설치 프로그램을 실행합니다
4. 선택한 스킬로 `.agents/`를 생성합니다
5. `.claude/` 통합 레이어를 설정합니다 (훅, 심볼릭 링크, 설정)
6. 감지된 경우 Serena MCP를 설정합니다

선택적 의존성 설치가 실패해도 부트스트랩은 계속 진행하고 후속 명령을 보고합니다. 설치 프로그램이 끝나면 `oma doctor`를 실행하세요.

---

## 방법 2: bunx를 통한 수동 설치

```bash
bunx oh-my-agent@latest
```

의존성 자동 설치 과정 없이 대화형 설치 프로그램을 바로 실행합니다. bun이 미리 설치되어 있어야 합니다.

설치 프로그램이 스킬 프리셋 선택을 안내합니다. 현재 프리셋은 `cli/constants/skill-data.ts`에 정의되어 있습니다.

### 프리셋

| 프리셋 | 포함 스킬 |
|--------|----------------|
| **all** | 현재 33개 스킬 패키지 전체 |
| **fullstack** | Architecture, brainstorming, design, frontend, backend, mobile, database, PM, QA, debugging, SCM, Terraform, developer workflow |
| **fullstack-web** | Fullstack web 구현, architecture, design, PM, QA, debugging, SCM, developer workflow |
| **fullstack-mobile** | 모바일 중심 fullstack 구현, architecture, design, PM, QA, debugging, SCM, developer workflow |
| **frontend** | Architecture, brainstorming, design, frontend, PM, QA, debugging, SCM |
| **backend** | Architecture, brainstorming, backend, database, PM, QA, debugging, SCM, developer workflow |
| **mobile** | Architecture, brainstorming, mobile, PM, QA, debugging, SCM |
| **devops** | Architecture, brainstorming, Terraform, developer workflow, observability, PM, QA, debugging, SCM |
| **research** | Scholar, market, PDF, HWP, academic writing, search, translation, SCM |
| **content** | Design, image, voice, academic writing, translation, SCM |

프리셋은 스킬 묶음이며 스킬마다 서브에이전트 정의를 하나씩 만들지 않습니다. `all` 프리셋은 실제 스킬 레지스트리에서 확장되므로 저장소에 따라 목록이 늘어날 수 있습니다. 도메인 프리셋은 해당 분야에 필요한 스킬만 포함합니다.

공유 리소스(`_shared/`)는 프리셋에 관계없이 항상 설치됩니다. 여기에는 핵심 라우팅, 컨텍스트 로딩, 프롬프트 구조, 벤더 감지, 실행 프로토콜, 메모리 프로토콜이 포함됩니다.

### 생성되는 항목

설치 후 프로젝트에 다음 내용이 포함됩니다.

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

설치 프로그램은 선택한 호스트에 필요한 벤더 디렉토리만 만듭니다. 훅 원본은 `.agents/hooks/core/`에 남고 생성된 벤더 파일은 통합 출력입니다. 오래된 프로젝트에서는 Serena가 레거시 `.serena/memories/` 디렉토리를 사용할 수도 있습니다.

---

## 방법 3: 전역 설치

CLI에서 직접 사용하려면(대시보드, 에이전트 스폰, 진단 등) oh-my-agent을 전역으로 설치하세요:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# 또는
npm install --global oh-my-agent
```

이렇게 하면 `oma` 명령이 전역으로 설치되어 어디서든 모든 CLI 명령을 사용할 수 있습니다:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma`는 `oh-my-agent`의 줄임말입니다. 두 명령어 모두 사용할 수 있습니다.

---

## AI CLI 도구 설치

AI CLI 도구가 하나 이상 설치되어 있어야 합니다. oh-my-agent은 여러 벤더를 지원하며, 에이전트-CLI 매핑을 통해 에이전트마다 다른 CLI를 지정할 수 있습니다.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# 또는
npm install --global @anthropic-ai/claude-code
```

인증은 첫 실행 시 자동으로 수행됩니다. Claude Code는 `.claude/`를 훅과 설정에 사용하며, 스킬은 `.agents/skills/`에서 심볼릭 링크됩니다.

### Codex CLI

```bash
bun install --global @openai/codex
# 또는
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
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

> **설정 형식:** 유효한 `.agents/oma-config.cue`를 공용 설정으로 평가합니다. 공용 CUE 평가에 실패하면 로더가 `.agents/oma-config.yaml`로 폴백할 수 있습니다. 로컬 오버레이(`oma-config.local.cue` 또는 `.yaml`)는 선택 사항이며 잘못된 로컬 의도는 치명적 오류입니다. `OMA_MODEL_PRESET`은 현재 프로세스의 파일 값을 덮어씁니다.

### 필드 레퍼런스

| 필드 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|-------------|
| `language` | string | 필수 | 응답 언어 코드. en, ko, ja, zh, es, fr, de, pt, ru, nl, pl 등 11개 언어를 지원합니다. |
| `model_preset` | string | 필수 | 활성 프리셋 키. `auto`는 현재 런타임을 따르며, 고정 키로 `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro`, `mixed`를 사용할 수 있습니다. 사용자 정의 프리셋 키도 유효합니다. 자세한 내용은 [에이전트별 모델 설정](../guide/per-agent-models.md)을 참조하세요. |
| `default_cli` | string | 선택 | 명시적인 에이전트 설정과 선택한 프리셋으로 벤더가 해석되지 않을 때 `oma agent spawn`이 사용할 폴백 CLI입니다. |
| `free` | map | 선택 | `model_preset: free`일 때 사용하는 FreeLLMAPI 게이트웨이 설정입니다. API 키는 환경 변수에 보관하세요. |
| `providers` | map | 선택 | 기능 프로바이더: `code_intelligence`(`serena` 또는 `gortex`), `code_intelligence_guard`(`block` 또는 `off`), `docs`(`context7`), `web`(`native` 또는 `brave`), `semantic_memory`(`agentmemory`, `honcho`, 또는 `none`). |
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
- `.claude/skills/`의 심볼릭 링크가 유효한 대상을 가리키는지
- `.claude/settings.json`에 훅이 올바르게 설정되어 있는지
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

```
"Build a login form with email validation using Tailwind CSS"
```

또는 워크플로우 명령을 사용하세요:

```
/plan authentication feature with JWT and refresh tokens
```

자세한 예제는 [사용 가이드](/docs/guide/usage)를, 각 전문가가 무엇을 하는지 알아보려면 [에이전트](/docs/core-concepts/agents)를 참조하세요.
