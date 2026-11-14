---
title: Khả năng của vendor và các package
description: Khám phá skill, định nghĩa agent, hook và định dạng package trên các vendor OMA.
---

# Khả năng của vendor và các package {#vendor-capabilities-and-packages}

`cli/constants/vendor-capabilities.ts` ghi khám phá skill, thư mục agent, cầu nối hook và manifest package của từng host được hỗ trợ. Khóa vendor khớp `ALL_CLI_VENDORS`; đường chiếu skill lấy từ `CLI_SKILLS_DIR` để bản cài project và global giữ nguyên đích hiện có.

| Host | Skill dùng chung không có vendor link | Thư mục agent | Cầu nối hook | Manifest package |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Không | Không có | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | Không | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | Không | `.codex/agents` | Settings | `plugin.json` |
| Command Code | Không | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | Không | `.github/agents` | Settings | `plugin.json` (package Agent Plugins) |
| Cursor | Không | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | Không có | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | Không | Không có | Không có | `plugin.json` (package Agent Plugins) |
| Kilo Code | Có | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | Không | Không có | Settings | `.kimi-plugin/plugin.json` |
| Kiro | Không | `.kiro/agents` | Settings | `plugin.json` (package Agent Plugins) |
| OpenCode | Không | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Có | Không có | Extension | `pi-package/package.json` |
| Qwen Code | Có | `.qwen/agents` | Settings | `plugin.json` (package Agent Plugins) |
| ZCode | Không có | Không có | Không có | `.zcode-plugin/plugin.json` |

“Không có vendor link” nghĩa là OMA có thể dùng khám phá dùng chung ở cả hai chế độ cài. Riêng việc quét project của Kimi không thay thế chiếu skill global hiện có. Một cầu nối hook hoặc một thư mục agent không có nghĩa là đã có adapter runtime dạng subprocess. Gemini không phải vendor OMA; Antigravity CLI có tích hợp riêng.

## Package Agent Plugins {#agent-plugins-package}

Gốc repository là một package [Agent Plugins 1.0](https://agent-plugins.org/), và `oma emit` sinh lại nó từ SSOT `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Cài qua Git và marketplace clone repository mà không có dependency, nên gốc chính là package. Cài theo đường cục bộ hoặc `owner/repo:path` thì copy đúng thư mục bạn trỏ tới, và gốc repository còn mang cây source, `node_modules` và trang web. Với các cách đó, hãy dùng bản sạch mà `oma emit --target agent-plugin` ghi vào `codex-plugin/` (trong repository này: `bun cli/cli.ts emit --target agent-plugin`), hoặc giải nén `oma-agent-plugin.tar.gz` từ một [bản phát hành GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` được sinh ra và bị gitignore, không được commit. Vì mọi host cài cả cây đó, skill của nó tham chiếu một bản `skills/_shared/` của các hướng dẫn dùng chung; chỉ `skills/` ở gốc gói chúng vào từng skill, vì `bunx skills use first-fluke/oh-my-agent@<skill>` copy một thư mục skill ra khỏi đó.

Các keyword của manifest (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) cũng là từ vựng kích hoạt của Kiro. Manifest không khai báo đường component, điều đặc tả cấm; mỗi host đọc các vị trí cố định. Không host nào cần manifest native bên cạnh `plugin.json`: Copilot đọc manifest Agent Plugins ở gốc trước `.claude-plugin/plugin.json`, và Qwen Code tải package qua adapter Agent Plugins mà không sinh `qwen-extension.json`.

| Host | Tải | Cài |
| --- | --- | --- |
| GitHub Copilot CLI | skill, MCP server, và từ `com.github.copilot/`: 12 custom agent, 20 slash command workflow, 6 rule theo file, 4 lifecycle hook | `copilot plugin install first-fluke/oh-my-agent` (clone package gốc), `copilot plugin install /absolute/path/to/codex-plugin` trên bản đã emit, hoặc `copilot plugin marketplace add first-fluke/oh-my-agent` rồi `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | skill và MCP server (tên server được đặt namespace khi cài); kích hoạt theo keyword của manifest | `kiro-cli powers install /absolute/path/to/codex-plugin` trên bản đã emit (CLI 2.25+), hoặc **Add Custom Power → Import power from GitHub** với URL repository |
| Qwen Code | skill và MCP server dưới dạng extension `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` hoặc `qwen extensions link /absolute/path/to/codex-plugin` trên bản đã emit (nguồn Agent Plugins). URL repository trần mở bộ chọn plugin tương tác của Qwen, vì gốc còn mang marketplace Claude; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` chọn mục `oma` của marketplace đó mà không tương tác (theo tài liệu Qwen, mục đó sau đó được chuyển từ manifest Claude). |
| Hermes Agent | skill dạng `oma:<skill>` và các MCP server stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, rồi `hermes plugins enable oma` |
| Codex | skill và MCP server | `codex plugin marketplace add first-fluke/oh-my-agent` rồi `codex plugin add oma@oh-my-agent` |

### Thành phần Copilot CLI {#copilot-cli-components}

Copilot đọc các thành phần không di động từ namespace `com.github.copilot/` mà `oma emit` điền từ SSOT:

- `agents/<name>.agent.md`: cùng các custom agent Copilot mà bản cài project ghi vào `.github/agents/`.
- `commands/<workflow>.md`: một slash command cho mỗi workflow có sẵn; mỗi command đọc `.agents/workflows/<workflow>.md` của project.
- `rules/<rule>.instructions.md`: các rule có glob file (`applyTo`) hoặc `alwaysApply: true`; rule theo yêu cầu ở lại với bản cài project.
- `hooks/hooks.json` cùng `scripts/plugin-bootstrap.sh` và `scripts/plugin-hook.sh`: cùng các script fail-open như mục marketplace Claude Code, chạy với `OMA_PLUGIN_VENDOR=copilot`. SessionStart cung cấp CLI và chạy `oma install --yes` cho project hiện tại; UserPromptSubmit, PreToolUse (Bash) và Stop chuyển tiếp tới `oma hook --vendor copilot` cho đến khi đăng ký `.github/hooks/oma.json` của chính project tiếp quản. Mọi lệnh kết thúc bằng `|| true`, nên CLI thiếu hoặc gốc plugin không phân giải được không bao giờ chặn một lần gọi tool.

Workflow, agent và rule tham chiếu cây `.agents/` của project. Không có CLI oma, package vẫn cung cấp skill và MCP server; hook bootstrap thêm phần còn lại ở session đầu tiên.

### Bản ghi xác minh {#validation-record}

Đã kiểm tra ngày 2026-11-08, home của từng host trỏ vào một thư mục tạm; không có lời gọi model, hook hay MCP server nào chạy. `<path>/codex-plugin` là cây mà `oma emit --target agent-plugin` ghi:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` báo `Installed 33 skills`; `plugin list --json` cho thấy `oma` được bật ở phiên bản package; bản cache dưới `installed-plugins/_direct/` chứa `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` rồi `copilot plugin install oma@oh-my-agent` cũng cài mục đầy đủ trực tiếp từ checkout. Copilot cảnh báo cài trực tiếp đã lỗi thời, nên dùng `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (với `KIRO_HOME` và `KIRO_DATA_DIR` trên thư mục tạm) báo `Installed power "oma"` và copy package vào `powers/installed/oma/`. Kiro bỏ qua `USERPROFILE`; dùng `KIRO_HOME` để chuyển home của nó.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` báo `installed successfully and enabled`; `qwen extensions list` cho thấy `Origin: AgentPlugins`, 33 skill, và các MCP server `context7`, `serena`, `aside`.
- Hermes Agent: không được cài ở đây. Manifest, frontmatter skill và `mcp.json` được đối chiếu với các rule trong `hermes_cli/agent_plugins.py` của Hermes (không có field lạ, tên hợp lệ, lệnh stdio là từng token); Hermes không cần khối `extensions["com.nousresearch.hermes"]`.

CI emit package từ checkout và cài nó vào các bản Copilot CLI và Qwen Code đã ghim trên mỗi lần push (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Package Pi {#pi-packages}

Pi khám phá `.agents/skills` của project và `~/.agents/skills` global trực tiếp. Cài OMA trong một project vì vậy không cần chiếu `.pi/skills`.

Để phân phối ngoài một bản cài OMA, pipeline phát hành emit package skill Pi và đăng lên npm dưới tên `oh-my-agent-pi`; hoặc tự emit:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

Trong repository source này, chạy CLI cục bộ bằng `bun cli/cli.ts emit --target pi-package`. Output mặc định là `pi-package/` (bị gitignore; cây được sinh, không được commit); `--output-dir <base>` ghi nó dưới `<base>/pi-package/`.

`package.json` được sinh khai báo `pi.skills: ["./skills"]`, có keyword `pi-package`, và dùng phiên bản repository. Các hướng dẫn dùng chung mà skill tham chiếu được emit một lần dưới `skills/_shared/` (pi tải cả package), nên không skill nào mang bản sao riêng. Package không có dependency workspace hay script cài. Nó phân phối skill; bản cài project của OMA cung cấp extension hook Pi riêng.

Pi cũng hỗ trợ nguồn Git và npm. Repository đã khai báo skill source trong `package.json` gốc, nên `pi install git:github.com/first-fluke/oh-my-agent@<tag>` có thể khám phá chúng. Pi chạy cài dependency cho package Git có `package.json`; package đã emit tránh cây dependency của workspace source. Bản thân `oma emit` không đăng tải; workflow phát hành đăng package đã emit lên npm.

Định dạng này được đối chiếu với tài liệu package Pi 0.78.1 đã cài và package resolver vào ngày 2026-11-05. Phân giải chỉ đọc cả repository source và package đã emit tải 33 skill với không diagnostic, mà không cài package hay liên hệ model.

## Package plugin OpenCode và Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` cài cầu nối hook họ opencode theo từng project: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` với Kilo) cùng các mục handler mà nó spawn, đăng ký dưới `plugin` trong `opencode.json` / `kilo.json`. Cùng cầu nối đó cũng được emit thành package plugin npm để một project (hoặc một cấu hình global) tải nó mà không cần cài theo từng project:

```bash
oma emit --target opencode-package
```

Output mặc định là `opencode-package/` (package được emit duy nhất vẫn được commit, để một clone có thể tải nó như plugin thư mục); `--output-dir <base>` ghi nó dưới `<base>/opencode-package/`. Package (`oh-my-agent-opencode`) chứa cầu nối SSOT không đổi (`oma.ts`), một entry package (`index.ts`, `main`/`exports`), một entry handler được sinh cho mỗi script hook độc lập (mỗi entry chạy `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` và một README. Nó không có dependency; CLI `oma` phải có trên PATH và `bun` phải được cài, và mọi hook fail-open khi thiếu một trong hai.

Hai host tải plugin package qua các hợp đồng khác nhau, và entry phục vụ cả hai từ một default export: OpenCode 2.x đọc `{ id, setup(ctx) }` và `setup` đăng ký `ctx.session.hook("prompt" | "context" | "experimental.idle")` cùng `ctx.tool.hook("execute.before")`, mỗi cái được chuyển sang các handler `chat.message`, `experimental.chat.system.transform`, `session.idle` và `tool.execute.before` của cầu nối; Kilo Code và OpenCode 1.18.29+ cần một object có `server()`, chính là cầu nối. Logic handler không bị nhân đôi.

Đăng ký theo tên package trong `.opencode/opencode.json` (project) hoặc `~/.config/opencode/opencode.json` (global); OpenCode cài plugin npm vào cache khi khởi động:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code đọc cùng khóa từ `.kilo/kilo.json` hoặc `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` thêm mục giúp bạn. Cả hai host dispatch với danh tính `opencode` dùng chung, trả lời bằng phương ngữ JSON Claude mà cầu nối đọc. Project mà `oma link` đã đăng ký `./plugins/oma/oma.ts` không cần package; hãy giữ một trong hai.

OpenCode 2.x cũng nhận plugin thư mục (`"plugin": ["../path/to/opencode-package"]`, tương đối với file cấu hình), nên tải package đã emit mà không cần npm. Lưu ý OpenCode 2.x yêu cầu đường plugin đã cấu hình phải là thư mục và từ chối mục một file: đăng ký `./plugins/oma/oma.ts` theo project mà `oma link` ghi bị bỏ qua ở đó ("configured plugin path must be a directory"), nên trên OpenCode 2.x hãy dùng package này; Kilo Code vẫn tải file theo project.

Đã xác minh ngày 2026-11-08 với OpenCode 2.2.6 và Kilo Code CLI 7.8.27: cả hai phân giải `plugin: ["oh-my-agent-opencode"]` từ cấu hình project (`opencode debug config`, `kilo debug config`), OpenCode thử cài npm (404 cho đến khi package được đăng) và vẫn fail-open, và khi package được đặt trong cache plugin của từng host (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) một lần `run "orchestrate: say hi"` headless tới endpoint tương thích OpenAI cục bộ nhận `[OMA WORKFLOW: ORCHESTRATE]` trong system prompt trên cả hai host, rồi các lần vào lại persistent-mode cho tới trần reinforcement. Workflow phát hành đăng package đã emit lên npm dưới tên `oh-my-agent-opencode` cùng mỗi bản phát hành CLI.

## Package mod Command Code {#command-code-mod-package}

Hook trong file settings của Command Code (`.commandcode/settings.json`, do `oma link` cài) chỉ phủ `SessionStart`, `PostToolUse` và `Stop`. Một [mod](https://commandcode.ai/docs/mods) thấy toàn bộ vòng đời, nên OMA cũng emit một package mod:

```bash
oma emit --target commandcode-mod
```

Output mặc định là `commandcode-mod/` (bị gitignore; cây được sinh, không được commit). `package.json` của nó mang keyword `cmd-mod` và một khối `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), nên một lần cài mang cả cầu nối hook và mọi skill OMA. `mods/oma.ts` ánh xạ hook ModApi sang các handler lõi qua `oma hook script --vendor commandcode --script <name>`: `transformInput` chạy keyword-detector và skill-injector (prompt đi qua không đổi), `appendSystemPrompt` chèn context đã phát hiện, `onSessionStart` chạy code-intelligence-primer và state-boundary, `beforeToolCall` chạy scm-guard (một lần từ chối thành `{block: true}`) và test-filter trên `shell_command`, còn `onStop` biến một lần chặn persistent-mode thành `{continue: true, reason}`. Package không có dependency và không cần bước build; mọi hook fail-open khi không có CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Đã xác minh ngày 2026-11-08 với Command Code 1.88.5: `cmd mods inspect` báo các hook đã đăng ký, `cmd mods add -g <local path>` cài package và `cmd mods list` hiện `oma · user · from local:…`, và việc điều khiển các hook của mod với CLI đã chèn `[OMA WORKFLOW: ORCHESTRATE]`, chặn `git add .env`, và trả về một lần tiếp tục persistent-mode. Một lượt `cmd -p` có model không được chạy (máy test không có tài khoản Command Code). Workflow phát hành đăng package đã emit lên npm dưới tên `oh-my-agent-commandcode` cùng mỗi bản phát hành CLI.

## Xác minh plugin Cursor {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` cung cấp:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

CLI plugin của nó không có lệnh cài từng plugin. Đăng ký marketplace là thao tác tài khoản, lập chỉ mục một repository Git; nó không cung cấp kiểm tra cài cục bộ tách biệt. OMA không tự đăng ký marketplace trong lúc emit.

Ngày 2026-11-05, hai thư mục skill, thư mục agent, thư mục rule, file MCP và logo của manifest Cursor đã commit đều phân giải được trong repository. Trợ giúp CLI xác nhận hỗ trợ tải một thư mục plugin cục bộ. Đăng ký marketplace bằng tài khoản và một session model thật không được thực hiện.

## Các host plugin tương thích Claude {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode và Kimi Code đọc manifest plugin có hình dạng bắt nguồn từ `.claude-plugin/plugin.json` của Claude Code. `oma emit` sinh một manifest native cho mỗi host từ nguồn sự thật `.agents/`. Một git clone của repository này là package cài được cho Grok, ZCode và Kimi; cây Antigravity được sinh (`oma emit --target antigravity-plugin`, hoặc asset phát hành `oma-antigravity-plugin.tar.gz`) vì validator của nó từ chối gốc repository:

| Host | Target emit | Artifact đã commit | Skill | Agent | MCP | Hook |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | không có; `antigravity-plugin/` được emit (tự chứa, asset phát hành) | `skills/` | `agents/` (đã chuyển đổi) | `mcp_config.json` | không phát hành |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | `skills/` ở gốc | `.agents/agents/*.md` | `mcpServers` inline | không khai báo |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | `skills/` ở gốc | `.agents/agents/*.md` | `mcpServers` inline | không khai báo |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | `skills/` ở gốc | `.agents/agents/*.md` | `mcpServers` inline | không khai báo |

Không package nào trong số này phát hành hook. Hook của plugin Claude phân giải project từ `CLAUDE_PROJECT_DIR` và `${CLAUDE_PLUGIN_ROOT}`, những biến các host này không đặt, và Antigravity cùng Kimi chạy hook plugin với thư mục plugin làm thư mục làm việc. Workflow và hook project vì vậy đến từ CLI `oma` (`bun install -g oh-my-agent`, rồi `oma install`), CLI này cung cấp cầu nối hook native của từng host. Skill, agent, rule và MCP server hoạt động khi chưa có CLI đó.

Trong repository source này, chạy CLI cục bộ bằng `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` ghi mỗi artifact dưới `<base>` theo cùng đường tương đối. Cổng lệch CI (`bun run --cwd cli check:emit-drift`) thất bại khi một manifest đã commit khác bản emit mới, và Release Please tăng phiên bản mọi manifest đã commit cùng bản phát hành CLI; các cây đường cục bộ được sinh lấy phiên bản từ tag phát hành mà chúng được emit.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

Package theo [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` được xác thực với `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` cùng một `rules/<rule>.md` cho mỗi rule OMA (`trigger: always_on | glob | model_decision`, `globs` phân tách bằng dấu phẩy), `mcp_config.json`, `assets/logo.png` và một README. Một cây tự chứa được emit vì `agy plugin validate --strict` từ chối gốc repository (`AGENTS.md` ở gốc và `hooks/hooks.json` của Claude được báo là không bao giờ được tải). Hãy cài thư mục `antigravity-plugin/`, không phải URL hay gốc repository: khi trỏ vào gốc, agy tải `plugin.json` của Agent Plugins ở đó, tức 33 skill, không có agent hay rule, và `mcp.json` chỉ khi flag `enable-agent-plugins-spec` bật (`agy plugin validate --json .`, agy 1.5.3).

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

Skill tải dưới dạng `/<skill-name>`; MCP server được đặt namespace `oma_<server>`. `agy plugin import claude` cũng nhập một bản cài Claude Code hiện có. Ngày 2026-11-08, cây đã emit qua `agy plugin validate --strict` (agy 1.5.3) với 0 lỗi và 0 cảnh báo: 33 skill, 12 agent, 14 rule, 3 MCP server.

### Grok Build CLI {#grok-build-cli}

Grok đọc plugin và marketplace Claude Code mà không cần thiết lập, nên `.claude-plugin/` đã dùng được. `plugin.json` native `.grok-plugin/plugin.json` thêm khai báo skill, agent và MCP tường minh, và `.grok-plugin/marketplace.json` liệt kê cùng mục `oma` cùng các gốc domain `oma-frontend`, `oma-security`, `oma-research` như marketplace Claude, với nguồn cục bộ (`{"type": "local", "path": ...}`), dạng mà validator catalog của Grok chấp nhận mà không cần commit sha đã ghim.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok không được cài trên host emit; manifest và catalog được các test CLI kiểm tra về cấu trúc, đối chiếu tập field đã ghi và các rule catalog `xai-org/plugin-marketplace`.

### ZCode {#zcode}

ZCode phân giải `.zcode-plugin/plugin.json` trước và lùi về `.claude-plugin/plugin.json`, nên gốc repository phân giải theo native và mỗi gốc domain phân giải qua manifest Claude của nó. Cài đặt chỉ qua GUI:

1. Mở **Settings → Plugins**.
2. Nhấn **Create → Add marketplace** (góc trên bên phải) và nhập `first-fluke/oh-my-agent`, Git URL, hoặc đường dẫn của một clone cục bộ. ZCode xác thực marketplace trước khi thêm.
3. Trong phân đoạn **Personal**, nhấn **Install** trên `oma` (hoặc một mục domain) và đợi trạng thái đổi thành **Installed**. Plugin được bật theo mặc định.
4. Sau đó, dùng **Manage installed → Check for updates**; ZCode so sánh phiên bản mục catalog trong `.zcode-plugin/marketplace.json` với `plugin.json` đã cài, nên cả hai theo bản phát hành CLI.

ZCode không được cài trên host emit; mẫu tên manifest (`^[a-z0-9][a-z0-9._-]{0,127}$`), tập field và hình dạng marketplace được các test CLI khẳng định.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` trỏ `skills` vào thư mục quét `skills/` ở gốc, liệt kê từng file `.agents/agents/*.md` (đã ở định dạng agent của Kimi: frontmatter `name` và `description`, thân Markdown là system prompt), inline `mcpServers`, và mang khối `interface` mà `/plugins` hiển thị.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi copy plugin vào `$KIMI_CODE_HOME/plugins/managed/oma/` và áp dụng cho mọi project; skill được gọi dạng `/skill:oma:<skill-name>`. Kimi không được cài trên host emit; bề mặt manifest (field được phép, rule đường `./`, tập field hook) được các test CLI khẳng định.

## Qwen Agent Board {#qwen-agent-board}

Tài liệu thí nghiệm [Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) mô tả `qwen board task`, `claim`, `done`, `ask` và `answer`. Board điều phối các file cục bộ; nó không khởi động, không tham gia và không giám sát process agent.

OMA có thể chuyển tiếp các thao tác board tường minh khi Qwen CLI đã cài quảng bá lệnh `board`:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

Adapter cũng hỗ trợ `claim`, `ask`, `answer` và `decline`. Nó kiểm tra trợ giúp gốc trước khi chuyển tiếp một thao tác. Nó bổ sung cho state thực thi và receipt của OMA; nó không bao giờ tự đánh dấu công việc OMA là hoàn tất.

Qwen Code 0.20.1 đã cài không lộ lệnh CLI `board` hay `agents` vào ngày 2026-11-05. `qwen board --help` trả về trợ giúp gốc, nên bản cài này không qua kiểm tra khả năng. Một thao tác board native thật vẫn chưa được xác minh; không có tích hợp `agents join`.
