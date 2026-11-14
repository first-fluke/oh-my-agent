---
title: 벤더 기능과 패키지
sidebar_label: 벤더 기능
description: OMA 벤더별 스킬 탐색, 에이전트 정의, 훅, 패키지 형식을 설명합니다.
---

# 벤더 기능과 패키지 {#vendor-capabilities-and-packages}

`cli/constants/vendor-capabilities.ts`는 지원하는 각 호스트의 스킬 탐색, 에이전트 디렉토리, 훅 브리지, 패키지 매니페스트를 기록합니다. 벤더 키는 `ALL_CLI_VENDORS`와 일치하고, 스킬 프로젝션 경로는 `CLI_SKILLS_DIR`에서 오므로 프로젝트 설치와 글로벌 설치는 기존 대상을 유지합니다.

| 호스트 | 벤더 링크 없는 공유 스킬 | 에이전트 디렉토리 | 훅 브리지 | 패키지 매니페스트 |
| --- | --- | --- | --- | --- |
| Antigravity CLI | 아니오 | — | 설정 | `antigravity-plugin/plugin.json` |
| Claude Code | 아니오 | `.claude/agents` | 설정 | `.claude-plugin/plugin.json` |
| Codex | 아니오 | `.codex/agents` | 설정 | `plugin.json` |
| Command Code | 아니오 | `.commandcode/agents` | 설정 | `commandcode-mod/package.json` |
| Copilot CLI | 아니오 | `.github/agents` | 설정 | `plugin.json`(Agent Plugins 패키지) |
| Cursor | 아니오 | `.cursor/agents` | 설정 | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | 설정 | `.grok-plugin/plugin.json` |
| Hermes | 아니오 | — | — | `plugin.json`(Agent Plugins 패키지) |
| Kilo Code | 예 | `.kilo/agents` | 확장 | `opencode-package/package.json` |
| Kimi | 아니오 | — | 설정 | `.kimi-plugin/plugin.json` |
| Kiro | 아니오 | `.kiro/agents` | 설정 | `plugin.json`(Agent Plugins 패키지) |
| OpenCode | 아니오 | `.opencode/agents` | 확장 | `opencode-package/package.json` |
| Pi | 예 | — | 확장 | `pi-package/package.json` |
| Qwen Code | 예 | `.qwen/agents` | 설정 | `plugin.json`(Agent Plugins 패키지) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

"벤더 링크 없이"는 두 설치 모드 모두에서 OMA가 공유 탐색을 쓸 수 있다는 뜻입니다. Kimi의 프로젝트 스캔만으로는 기존의 글로벌 스킬 프로젝션을 대체하지 않습니다. 훅 브리지나 에이전트 디렉토리가 있다고 해서 서브프로세스 런타임 어댑터가 있는 것은 아닙니다. Gemini는 OMA 벤더가 아니며, Antigravity CLI는 별도의 통합을 갖습니다.

## Agent Plugins 패키지 {#agent-plugins-package}

저장소 루트는 [Agent Plugins 1.0](https://agent-plugins.org/) 패키지이며, `oma emit`이 `.agents/` SSOT에서 다시 생성합니다.

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Git과 마켓플레이스 설치는 의존성 없이 저장소를 클론하므로 루트가 패키지입니다. 로컬 경로나 `owner/repo:path` 설치는 가리키는 디렉토리를 복사하며, 저장소 루트에는 소스 트리, `node_modules`, 웹 사이트도 있습니다. 그런 경우에는 `oma emit --target agent-plugin`이 `codex-plugin/`에 쓰는 깨끗한 사본을 사용하세요(이 저장소에서는 `bun cli/cli.ts emit --target agent-plugin`). 또는 [GitHub 릴리스](https://github.com/first-fluke/oh-my-agent/releases)의 `oma-agent-plugin.tar.gz`를 푸세요. `codex-plugin/`은 생성물이며 gitignore되어 커밋되지 않습니다. 모든 호스트가 그 트리를 통째로 설치하므로, 스킬은 공유 가이드의 `skills/_shared/` 사본 하나를 참조합니다. 루트 `skills/`만 각 스킬 안에 그 가이드를 묶습니다. `bunx skills use first-fluke/oh-my-agent@<skill>`이 그 안에서 스킬 디렉토리 하나만 복사하기 때문입니다.

매니페스트 키워드(`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`)는 Kiro의 활성화 어휘이기도 합니다. 매니페스트는 컴포넌트 경로를 선언하지 않으며, 명세가 이를 금지합니다. 각 호스트는 고정된 위치를 읽습니다. `plugin.json` 옆에 네이티브 매니페스트가 필요한 호스트는 없습니다. Copilot은 `.claude-plugin/plugin.json`보다 먼저 루트 Agent Plugins 매니페스트를 읽고, Qwen Code는 `qwen-extension.json`을 생성하지 않은 채 Agent Plugins 어댑터로 패키지를 로드합니다.

| 호스트 | 로드 대상 | 설치 |
| --- | --- | --- |
| GitHub Copilot CLI | 스킬, MCP 서버, 그리고 `com.github.copilot/`에서 커스텀 에이전트 12개, 워크플로우 슬래시 명령 20개, 파일 범위 규칙 6개, 라이프사이클 훅 4개 | `copilot plugin install first-fluke/oh-my-agent`(루트 패키지를 클론), 생성된 사본에 대한 `copilot plugin install /absolute/path/to/codex-plugin`, 또는 `copilot plugin marketplace add first-fluke/oh-my-agent` 다음 `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | 스킬과 MCP 서버(설치 시 서버 이름에 네임스페이스가 붙음). 매니페스트 키워드로 활성화 | 생성된 사본에 대한 `kiro-cli powers install /absolute/path/to/codex-plugin`(CLI 2.25+), 또는 저장소 URL로 **Add Custom Power → Import power from GitHub** |
| Qwen Code | `oma` 확장으로서의 스킬과 MCP 서버 | 생성된 사본에 대한 `qwen extensions install /absolute/path/to/codex-plugin --consent` 또는 `qwen extensions link /absolute/path/to/codex-plugin`(Agent Plugins origin). 저장소 URL만 주면 루트에 Claude 마켓플레이스도 있으므로 Qwen의 대화형 플러그인 선택기가 열립니다. `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma`는 그 마켓플레이스의 `oma` 항목을 비대화형으로 선택합니다(Qwen 문서에 따르면 이후 Claude 매니페스트에서 변환됨). |
| Hermes Agent | `oma:<skill>` 형태의 스킬과 stdio / Streamable HTTP MCP 서버 | `hermes plugins install first-fluke/oh-my-agent --no-enable` 다음 `hermes plugins enable oma` |
| Codex | 스킬과 MCP 서버 | `codex plugin marketplace add first-fluke/oh-my-agent` 다음 `codex plugin add oma@oh-my-agent` |

### Copilot CLI 컴포넌트 {#copilot-cli-components}

Copilot은 `oma emit`이 SSOT에서 채우는 `com.github.copilot/` 네임스페이스에서 이식되지 않는 컴포넌트를 읽습니다.

- `agents/<name>.agent.md`: 프로젝트 설치가 `.github/agents/`에 쓰는 것과 같은 Copilot 커스텀 에이전트입니다.
- `commands/<workflow>.md`: 사용할 수 있는 워크플로우마다 슬래시 명령 하나입니다. 각각 프로젝트의 `.agents/workflows/<workflow>.md`를 읽습니다.
- `rules/<rule>.instructions.md`: 파일 glob(`applyTo`)이 있거나 `alwaysApply: true`인 규칙입니다. 요청 시 규칙은 프로젝트 설치에 남습니다.
- `hooks/hooks.json`과 `scripts/plugin-bootstrap.sh`, `scripts/plugin-hook.sh`: Claude Code 마켓플레이스 항목과 같은 fail-open 스크립트이며 `OMA_PLUGIN_VENDOR=copilot`으로 실행됩니다. SessionStart는 CLI를 준비하고 현재 프로젝트에 `oma install --yes`를 실행합니다. UserPromptSubmit, PreToolUse(Bash), Stop은 프로젝트 자체의 `.github/hooks/oma.json` 등록이 이어받을 때까지 `oma hook --vendor copilot`으로 전달합니다. 모든 명령은 `|| true`로 끝나므로, CLI가 없거나 플러그인 루트를 해석하지 못해도 도구 호출을 막지 않습니다.

워크플로우, 에이전트, 규칙은 프로젝트의 `.agents/` 트리를 참조합니다. oma CLI가 없어도 패키지는 스킬과 MCP 서버를 제공하며, 부트스트랩 훅이 첫 세션에 나머지를 추가합니다.

### 검증 기록 {#validation-record}

2026-11-08에 각 호스트의 홈을 스크래치 디렉토리로 가리킨 상태에서 확인했습니다. 모델 호출, 훅, MCP 서버는 실행하지 않았습니다. `<path>/codex-plugin`은 `oma emit --target agent-plugin`이 쓰는 트리입니다.

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin`이 `Installed 33 skills`를 보고했습니다. `plugin list --json`은 패키지 버전에서 `oma`가 활성화되어 있음을 보여 줍니다. `installed-plugins/_direct/` 아래 캐시된 사본에 `com.github.copilot/{agents,commands,rules,hooks,scripts}`가 있습니다. `copilot plugin marketplace add <repo>` 다음에 `copilot plugin install oma@oh-my-agent`를 실행해도 체크아웃에서 전체 항목이 그대로 설치되었습니다. Copilot은 직접 설치가 `plugin@marketplace`를 위해 폐기 예정이라고 경고합니다.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin`(`KIRO_HOME`과 `KIRO_DATA_DIR`을 스크래치 디렉토리에 설정)이 `Installed power "oma"`를 보고하고 패키지를 `powers/installed/oma/`로 복사했습니다. Kiro는 `USERPROFILE`을 무시합니다. 홈을 옮기려면 `KIRO_HOME`을 사용하세요.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent`가 `installed successfully and enabled`를 보고했습니다. `qwen extensions list`는 `Origin: AgentPlugins`, 스킬 33개, `context7`, `serena`, `aside` MCP 서버를 보여 줍니다.
- Hermes Agent: 여기서는 설치하지 않았습니다. 매니페스트, 스킬 프론트매터, `mcp.json`을 Hermes의 `hermes_cli/agent_plugins.py` 규칙과 대조했습니다(알 수 없는 필드 없음, 유효한 이름, stdio 명령은 단일 토큰). Hermes는 `extensions["com.nousresearch.hermes"]` 블록을 요구하지 않습니다.

CI는 체크아웃에서 패키지를 생성하고, 푸시마다 고정된 Copilot CLI와 Qwen Code 릴리스에 설치합니다(`agent-plugin-hosts` 잡, `scripts/agent-plugin-host-smoke.ts`).

## Pi 패키지 {#pi-packages}

Pi는 프로젝트 `.agents/skills`와 글로벌 `~/.agents/skills`를 직접 탐색합니다. 따라서 프로젝트에 OMA를 설치해도 `.pi/skills` 프로젝션이 필요하지 않습니다.

OMA 설치 밖에서 배포하려면 릴리스 파이프라인이 Pi 스킬 패키지를 생성해 npm에 `oh-my-agent-pi`로 게시합니다. 직접 생성할 수도 있습니다.

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

이 소스 저장소에서는 로컬 CLI를 `bun cli/cli.ts emit --target pi-package`로 실행하세요. 기본 출력은 `pi-package/`입니다(gitignore됨. 트리는 생성물이며 커밋되지 않음). `--output-dir <base>`는 `<base>/pi-package/` 아래에 씁니다.

생성된 `package.json`은 `pi.skills: ["./skills"]`를 선언하고, `pi-package` 키워드를 포함하며, 저장소 버전을 사용합니다. 스킬이 참조하는 공유 가이드는 `skills/_shared/` 아래에 한 번만 생성됩니다(pi가 패키지를 통째로 로드함). 따라서 어떤 스킬도 자기 사본을 갖지 않습니다. 패키지에는 워크스페이스 의존성이나 install 스크립트가 없습니다. 배포하는 것은 스킬이며, OMA의 프로젝트 설치가 Pi 훅 확장을 따로 제공합니다.

Pi는 Git과 npm 소스도 지원합니다. 저장소는 이미 루트 `package.json`에 소스 스킬을 선언하므로 `pi install git:github.com/first-fluke/oh-my-agent@<tag>`로 찾을 수 있습니다. Pi는 `package.json`이 있는 Git 패키지에 대해 의존성 설치를 실행합니다. 생성된 패키지는 소스 워크스페이스의 의존성 트리를 피합니다. `oma emit` 자체는 게시하지 않습니다. 릴리스 워크플로우가 생성된 패키지를 npm에 게시합니다.

이 형식은 2026-11-05에 설치된 Pi 0.78.1 패키지 문서와 패키지 리졸버를 기준으로 확인했습니다. 소스 저장소와 생성된 패키지를 읽기 전용으로 해석하면, 패키지를 설치하거나 모델에 접속하지 않고 진단 0건으로 스킬 33개가 로드되었습니다.

## OpenCode와 Kilo Code 플러그인 패키지 {#opencode-and-kilo-code-plugin-package}

`oma link`는 프로젝트마다 opencode 계열 훅 브리지를 설치합니다. `.opencode/plugins/oma/oma.ts`(Kilo는 `.kilo/plugins/oma/`)와 그것이 스폰하는 핸들러 항목을 `opencode.json` / `kilo.json`의 `plugin` 아래에 등록합니다. 같은 브리지는 npm 플러그인 패키지로도 생성되므로, 프로젝트나 글로벌 설정이 프로젝트별 설치 없이 로드할 수 있습니다.

```bash
oma emit --target opencode-package
```

기본 출력은 `opencode-package/`입니다(커밋된 채로 남는 유일한 생성 패키지이며, 클론이 디렉토리 플러그인으로 로드할 수 있음). `--output-dir <base>`는 `<base>/opencode-package/` 아래에 씁니다. 패키지(`oh-my-agent-opencode`)에는 변경되지 않은 SSOT 브리지(`oma.ts`), 패키지 엔트리(`index.ts`, `main`/`exports`), 독립 훅 스크립트마다 생성된 핸들러 엔트리 하나(각각 `oma hook script --vendor opencode --script <name>`을 실행), `filter-test-output.sh`, README가 있습니다. 의존성은 없습니다. `oma` CLI가 PATH에 있어야 하고 `bun`이 설치되어 있어야 하며, 둘 중 하나가 없으면 모든 훅은 fail-open입니다.

두 호스트는 서로 다른 계약으로 패키지 플러그인을 로드하며, 엔트리는 기본 export 하나로 둘 다 처리합니다. OpenCode 2.x는 `{ id, setup(ctx) }`를 읽고, `setup`이 `ctx.session.hook("prompt" | "context" | "experimental.idle")`와 `ctx.tool.hook("execute.before")`를 등록합니다. 각각은 브리지의 `chat.message`, `experimental.chat.system.transform`, `session.idle`, `tool.execute.before` 핸들러에 맞춰집니다. Kilo Code와 OpenCode 1.18.29 이상은 `server()`가 있는 객체를 요구하며, 그것이 브리지 자체입니다. 핸들러 로직은 중복되지 않습니다.

패키지 이름으로 `.opencode/opencode.json`(프로젝트) 또는 `~/.config/opencode/opencode.json`(글로벌)에 등록하세요. OpenCode는 시작 시 npm 플러그인을 캐시에 설치합니다.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code는 `.kilo/kilo.json` 또는 `~/.config/kilo/kilo.json`에서 같은 키를 읽습니다. `kilo plugin oh-my-agent-opencode`가 항목을 추가합니다. 두 호스트는 공유 `opencode` 정체성으로 디스패치하며, 브리지가 읽는 Claude JSON 방언으로 응답합니다. `oma link`가 이미 `./plugins/oma/oma.ts`를 등록한 프로젝트에는 패키지가 필요 없습니다. 둘 중 하나만 유지하세요.

OpenCode 2.x는 디렉토리 플러그인(`"plugin": ["../path/to/opencode-package"]`, 설정 파일 기준 상대 경로)도 받으며, npm 없이 생성된 패키지를 로드합니다. OpenCode 2.x는 설정된 플러그인 경로가 디렉토리여야 하고 단일 파일 항목을 거부합니다. `oma link`가 쓰는 프로젝트별 `./plugins/oma/oma.ts` 등록은 거기서 건너뜁니다("configured plugin path must be a directory"). 따라서 OpenCode 2.x에서는 이 패키지를 사용하세요. Kilo Code는 프로젝트별 파일을 그대로 로드합니다.

2026-11-08에 OpenCode 2.2.6과 Kilo Code CLI 7.8.27을 기준으로 확인했습니다. 둘 다 프로젝트 설정에서 `plugin: ["oh-my-agent-opencode"]`를 해석했습니다(`opencode debug config`, `kilo debug config`). OpenCode는 npm 설치를 시도했고(패키지가 게시되기 전에는 404) fail-open을 유지했습니다. 패키지를 각 호스트의 플러그인 캐시(`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`)에 두면, 로컬 OpenAI 호환 엔드포인트에 대한 헤드리스 `run "orchestrate: say hi"`가 두 호스트 모두 시스템 프롬프트에서 `[OMA WORKFLOW: ORCHESTRATE]`를 받았고, 이어서 강화 한도까지 지속 모드 재진입이 이어졌습니다. 릴리스 워크플로우는 CLI 릴리스마다 생성된 패키지를 npm에 `oh-my-agent-opencode`로 게시합니다.

## Command Code mod 패키지 {#command-code-mod-package}

Command Code의 설정 파일 훅(`.commandcode/settings.json`, `oma link`가 설치)은 `SessionStart`, `PostToolUse`, `Stop`만 다룹니다. [mod](https://commandcode.ai/docs/mods)는 전체 라이프사이클을 보므로 OMA는 mod 패키지도 생성합니다.

```bash
oma emit --target commandcode-mod
```

기본 출력은 `commandcode-mod/`입니다(gitignore됨. 트리는 생성물이며 커밋되지 않음). `package.json`에는 `cmd-mod` 키워드와 `commandcode` 블록(`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`)이 있어, 설치 한 번으로 훅 브리지와 모든 OMA 스킬이 들어옵니다. `mods/oma.ts`는 ModApi 훅을 `oma hook script --vendor commandcode --script <name>`을 통해 코어 핸들러에 매핑합니다. `transformInput`은 keyword-detector와 skill-injector를 실행합니다(프롬프트는 그대로 통과). `appendSystemPrompt`는 감지된 컨텍스트를 주입합니다. `onSessionStart`는 code-intelligence-primer와 state-boundary를 실행합니다. `beforeToolCall`은 scm-guard(거부는 `{block: true}`가 됨)와 `shell_command`에 대한 test-filter를 실행합니다. `onStop`은 지속 모드 차단을 `{continue: true, reason}`으로 바꿉니다. 패키지에는 의존성이 없고 빌드 단계도 필요 없습니다. `oma` CLI가 없으면 모든 훅은 fail-open입니다.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

2026-11-08에 Command Code 1.88.5를 기준으로 확인했습니다. `cmd mods inspect`가 등록된 훅을 보고했고, `cmd mods add -g <local path>`가 패키지를 설치했으며 `cmd mods list`가 `oma · user · from local:…`을 보여 주었습니다. mod의 훅을 CLI에 대해 구동하면 `[OMA WORKFLOW: ORCHESTRATE]`가 주입되고, `git add .env`가 차단되며, 지속 모드 continue가 반환되었습니다. 모델이 뒷받침하는 `cmd -p` 턴은 실행하지 않았습니다(테스트 머신에 Command Code 계정이 없음). 릴리스 워크플로우는 CLI 릴리스마다 생성된 패키지를 npm에 `oh-my-agent-commandcode`로 게시합니다.

## Cursor 플러그인 검증 {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f`가 노출하는 명령은 다음과 같습니다.

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

플러그인 CLI에는 개별 플러그인 설치 명령이 없습니다. 마켓플레이스 등록은 Git 저장소를 색인하는 계정 작업이며, 격리된 로컬 설치 확인을 제공하지 않습니다. OMA는 생성 중에 마켓플레이스를 자동으로 등록하지 않습니다.

2026-11-05에 커밋된 Cursor 매니페스트의 스킬 디렉토리 두 곳, 에이전트 디렉토리, 규칙 디렉토리, MCP 파일, 로고가 모두 저장소 안에서 해석되었습니다. CLI 도움말은 로컬 플러그인 디렉토리 로드를 지원한다고 확인했습니다. 계정 마켓플레이스 등록과 라이브 모델 세션은 실행하지 않았습니다.

## Claude 호환 플러그인 호스트 {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode, Kimi Code는 Claude Code의 `.claude-plugin/plugin.json`에서 내려온 형태의 플러그인 매니페스트를 읽습니다. `oma emit`은 `.agents/` 진실의 원천에서 호스트마다 네이티브 매니페스트를 하나 생성합니다. 이 저장소의 git 클론이 Grok, ZCode, Kimi의 설치 가능한 패키지입니다. Antigravity 트리는 생성됩니다(`oma emit --target antigravity-plugin`, 또는 릴리스 자산 `oma-antigravity-plugin.tar.gz`). 검증기가 저장소 루트를 거부하기 때문입니다.

| 호스트 | emit 대상 | 커밋된 산출물 | 스킬 | 에이전트 | MCP | 훅 |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | 없음. 생성된 `antigravity-plugin/`(자체 포함, 릴리스 자산) | `skills/` | `agents/`(변환됨) | `mcp_config.json` | 포함하지 않음 |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | 루트 `skills/` | `.agents/agents/*.md` | 인라인 `mcpServers` | 선언하지 않음 |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | 루트 `skills/` | `.agents/agents/*.md` | 인라인 `mcpServers` | 선언하지 않음 |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | 루트 `skills/` | `.agents/agents/*.md` | 인라인 `mcpServers` | 선언하지 않음 |

이 패키지 중 훅을 포함하는 것은 없습니다. Claude 플러그인 훅은 `CLAUDE_PROJECT_DIR`과 `${CLAUDE_PLUGIN_ROOT}`에서 프로젝트를 해석하는데, 이 호스트들은 그 값을 설정하지 않습니다. Antigravity와 Kimi는 플러그인 디렉토리를 작업 디렉토리로 두고 플러그인 훅을 실행합니다. 따라서 워크플로우와 프로젝트 훅은 `oma` CLI에서 옵니다. `bun install -g oh-my-agent` 다음 `oma install`을 실행하면 CLI가 각 호스트의 네이티브 훅 브리지를 준비합니다. 스킬, 에이전트, 규칙, MCP 서버는 CLI 없이도 동작합니다.

이 소스 저장소에서는 로컬 CLI를 `bun cli/cli.ts emit --target <target>`으로 실행하세요. `--output-dir <base>`는 각 산출물을 `<base>` 아래 같은 상대 경로에 씁니다. CI 드리프트 게이트(`bun run --cwd cli check:emit-drift`)는 커밋된 매니페스트가 새로 생성한 결과와 다르면 실패합니다. Release Please는 CLI 릴리스와 함께 커밋된 모든 매니페스트 버전을 올립니다. 생성된 로컬 경로 트리는 생성 시점의 릴리스 태그에서 버전을 가져옵니다.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

패키지는 [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins)를 따릅니다. `plugin.json`은 `https://antigravity.google/schemas/v1/plugin.json`으로 검증되고, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md`와 OMA 규칙마다 `rules/<rule>.md` 하나(`trigger: always_on | glob | model_decision`, 쉼표로 구분된 `globs`), `mcp_config.json`, `assets/logo.png`, README가 있습니다. `agy plugin validate --strict`가 저장소 루트를 거부하기 때문에(루트 `AGENTS.md`와 Claude `hooks/hooks.json`이 로드되지 않는다고 보고됨) 자체 포함 트리를 생성합니다. 저장소 URL이나 루트가 아니라 `antigravity-plugin/` 디렉토리를 설치하세요. 루트를 가리키면 agy는 그곳의 Agent Plugins `plugin.json`을 대신 로드합니다. 스킬은 33개이고 에이전트와 규칙은 없으며, `mcp.json`은 `enable-agent-plugins-spec` 플래그가 켜져 있을 때만 있습니다(`agy plugin validate --json .`, agy 1.5.3).

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

스킬은 `/<skill-name>`으로 로드됩니다. MCP 서버에는 `oma_<server>` 네임스페이스가 붙습니다. `agy plugin import claude`는 기존 Claude Code 설치도 가져옵니다. 2026-11-08에 생성된 트리가 `agy plugin validate --strict`(agy 1.5.3)를 오류 0건, 경고 0건으로 통과했습니다. 스킬 33개, 에이전트 12개, 규칙 14개, MCP 서버 3개입니다.

### Grok Build CLI {#grok-build-cli}

Grok은 설정 없이 Claude Code 플러그인과 마켓플레이스를 읽으므로 `.claude-plugin/`이 이미 동작합니다. 네이티브 `.grok-plugin/plugin.json`은 스킬, 에이전트, MCP 선언을 명시적으로 추가하고, `.grok-plugin/marketplace.json`은 Claude 마켓플레이스와 같은 `oma` 항목과 `oma-frontend`, `oma-security`, `oma-research` 도메인 루트를 로컬 소스(`{"type": "local", "path": ...}`)로 나열합니다. 이 형태는 커밋 sha를 고정하지 않아도 Grok의 카탈로그 검증기가 받아들입니다.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok은 생성 호스트에 설치되어 있지 않았습니다. 매니페스트와 카탈로그는 문서화된 필드 집합과 `xai-org/plugin-marketplace` 카탈로그 규칙에 대해 CLI 테스트가 구조적으로 확인합니다.

### ZCode {#zcode}

ZCode는 `.zcode-plugin/plugin.json`을 먼저 해석하고 `.claude-plugin/plugin.json`으로 폴백하므로, 저장소 루트는 네이티브로 해석되고 각 도메인 루트는 Claude 매니페스트를 통해 해석됩니다. 설치는 GUI로만 합니다.

1. **Settings → Plugins**를 엽니다.
2. 오른쪽 위의 **Create → Add marketplace**를 클릭하고 `first-fluke/oh-my-agent`, Git URL, 또는 로컬 클론 경로를 입력합니다. ZCode는 추가하기 전에 마켓플레이스를 검증합니다.
3. **Personal** 세그먼트에서 `oma`(또는 도메인 항목)의 **Install**을 클릭하고 상태가 **Installed**로 바뀔 때까지 기다립니다. 플러그인은 기본적으로 활성화됩니다.
4. 이후에는 **Manage installed → Check for updates**를 사용합니다. ZCode는 `.zcode-plugin/marketplace.json`의 카탈로그 항목 버전과 설치된 `plugin.json`을 비교하므로, 둘 다 CLI 릴리스를 따라갑니다.

ZCode는 생성 호스트에 설치되어 있지 않았습니다. 매니페스트 이름 패턴(`^[a-z0-9][a-z0-9._-]{0,127}$`), 필드 집합, 마켓플레이스 형태는 CLI 테스트가 확인합니다.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json`은 `skills`를 루트 `skills/` 스캔 디렉토리로 가리키고, `.agents/agents/*.md` 파일을 각각 나열합니다(이미 Kimi 에이전트 형식입니다. 프론트매터 `name`과 `description`, Markdown 본문이 시스템 프롬프트). `mcpServers`를 인라인하고 `/plugins`가 보여 주는 `interface` 블록을 담습니다.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi는 플러그인을 `$KIMI_CODE_HOME/plugins/managed/oma/`로 복사하고 모든 프로젝트에 적용합니다. 스킬은 `/skill:oma:<skill-name>`으로 호출됩니다. Kimi는 생성 호스트에 설치되어 있지 않았습니다. 매니페스트 표면(허용 필드, `./` 경로 규칙, 훅 필드 집합)은 CLI 테스트가 확인합니다.

## Qwen Agent Board {#qwen-agent-board}

실험적인 [Qwen Agent Board 문서](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/)는 `qwen board task`, `claim`, `done`, `ask`, `answer`를 설명합니다. 보드는 로컬 파일을 조율하며, 에이전트 프로세스를 시작하거나 합류시키거나 모니터링하지 않습니다.

설치된 Qwen CLI가 `board` 명령을 알릴 때 OMA는 명시적인 보드 작업을 전달할 수 있습니다.

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

어댑터는 `claim`, `ask`, `answer`, `decline`도 지원합니다. 작업을 전달하기 전에 루트 도움말을 확인합니다. OMA의 실행 상태와 실행 기록을 보완하며, OMA 작업을 자동으로 완료로 표시하지 않습니다.

2026-11-05에 설치된 Qwen Code 0.20.1은 `board`나 `agents` CLI 명령을 노출하지 않았습니다. `qwen board --help`가 루트 도움말을 반환했으므로 이 설치는 기능 확인에 실패합니다. 실제 네이티브 보드 작업은 아직 검증되지 않았으며, `agents join` 통합은 없습니다.
