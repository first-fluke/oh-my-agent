---
title: "Tùy chọn CLI"
description: "Tham chiếu đầy đủ cho mọi tùy chọn CLI, gồm cờ toàn cục, điều khiển đầu ra, tùy chọn theo lệnh và các mẫu sử dụng thực tế."
---

# Tùy chọn CLI

## Tùy chọn toàn cục

Thông tin của mục này được giữ theo registry hiện tại. `oma` `oh-my-agent`

| Flag | Mô tả |
|:-----|:-----------|
| `-g, --global` | `~/.agents/` `<cwd>/.agents/` |
| `-y, --yes` | Nội dung tương ứng |
| `-V, --version` | Nội dung tương ứng |
| `-h, --help` | Nội dung tương ứng |

Thông tin của mục này được giữ theo registry hiện tại. `-h, --help` `--help`

Thông tin của mục này được giữ theo registry hiện tại. `--global` `install` `update` `link` `uninstall` `~/.agents/` `OMA_HOME=<abs-path>` [Tham chiếu](../guide/global-install.md)

---

## Tùy chọn output {#output-options}

Thông tin của mục này được giữ theo registry hiện tại.

### 1. --json flag

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Thông tin của mục này được giữ theo registry hiện tại. `--json` `image` `video` `slide` `--output` `search`

### 2. --output flag

```bash
oma stats get --output json
oma doctor --output text
```

Thông tin của mục này được giữ theo registry hiện tại. `--output` `text` `json` `--json`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `Invalid output format: {value}. Expected one of text, json`

### 3. OH_MY_AG_OUTPUT_FORMAT environment variable

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Thông tin của mục này được giữ theo registry hiện tại. `json` `json`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `--json` `--output` `OH_MY_AG_OUTPUT_FORMAT` `text`

### Các lệnh hỗ trợ output JSON

| Lệnh | `--json` | `--output` | Ghi chú |
|:--------|:---------|:----------|:------|
| `doctor` | Có | Có | Nội dung tương ứng |
| `stats` | Có | Có | Nội dung tương ứng |
| `retro` | Có | Có | Nội dung tương ứng |
| `cleanup` | Có | Có | Nội dung tương ứng |
| `auth status` | Có | Có | Nội dung tương ứng |
| `memory init` | Có | Có | Nội dung tương ứng |
| `verify agent` `verify triggers` | Có | Có | Nội dung tương ứng |
| `visualize` | Có | Có | Nội dung tương ứng |
| `describe` | Nội dung tương ứng | Nội dung tương ứng | Nội dung tương ứng |
| `recap` | Có | Có | Nội dung tương ứng |
| `image generate` `image doctor` `image vendor list` | Nội dung tương ứng | Có | `--output json` `vendor list` |
| `video generate` `video doctor` `video compose` `video render` `video provider list` | Nội dung tương ứng | Có | `--output json` |
| `explain validate` | Có | Có | Nội dung tương ứng |
| `diagram resolve` `diagram update` | Có | Có | Nội dung tương ứng |
| `market resolve` `market update` | Có | Có | Nội dung tương ứng |
| `docs verify` `docs sync` `docs i18n` `docs lint` | Có | Nội dung tương ứng | Nội dung tương ứng |
| `search ...` | Nội dung tương ứng | Nội dung tương ứng | `search` `--pretty` |

---

## Tùy chọn theo lệnh

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Thông tin của mục này được giữ theo registry hiện tại. `.agents/oma-config.yaml` `--honcho-url` `--honcho-workspace` `-y, --yes` `--yes`

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--json` | Nội dung tương ứng | `false` |
| `--output <format>` | `text` `json` | `text` |
| `--profile` | `model_preset` `agents:` | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | `oma-config.yaml` `mcp.json` `stack/` | `false` |
| `--with-new-skills` | | Nội dung tương ứng | `false` |
| `--ci` | | Nội dung tương ứng | `false` |
| `--yes` | `-y` | `--all` `--vendor` | `false` |
| `--all` | | Nội dung tương ứng | `false` |
| `--vendor <vendors>` | | `claude,qwen` | Nội dung tương ứng |

Thông tin của mục này được giữ theo registry hiện tại. `oma update mcp` `--yes` `--ci` `--all` `--vendor` `--force` `--with-new-skills`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.  `--force`
- Thông tin của mục này được giữ theo registry hiện tại. `oma-config.yaml`
- Thông tin của mục này được giữ theo registry hiện tại. `mcp.json`
- Thông tin của mục này được giữ theo registry hiện tại. `stack/`
- Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.  `--ci`
- Thông tin của mục này được giữ theo registry hiện tại. `console.clear()`
- Thông tin của mục này được giữ theo registry hiện tại. `@clack/prompts` `console.log`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `process.exit(1)`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `oma update`
- Thông tin của mục này được giữ theo registry hiện tại. `oma update --yes` `--yes`
- Thông tin của mục này được giữ theo registry hiện tại. `oma update --all` `--all`
- Thông tin của mục này được giữ theo registry hiện tại. `oma update --vendor claude,qwen` `--vendor`

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--json` | Nội dung tương ứng | `false` |
| `--output <format>` | `text` `json` | `text` |

Thông tin của mục này được giữ theo registry hiện tại. `oma stats reset` `oma stats get --reset` `--reset`

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--interactive` | Nội dung tương ứng | `false` |
| `--compare` | Nội dung tương ứng | `false` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `7d`
- Thông tin của mục này được giữ theo registry hiện tại. `2w`
- Thông tin của mục này được giữ theo registry hiện tại. `1m`
- Thông tin của mục này được giữ theo registry hiện tại.

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Nội dung tương ứng | `false` |
| `--yes` | `-y` | Nội dung tương ứng | `false` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `/tmp/subagent-*.pid`
2. Thông tin của mục này được giữ theo registry hiện tại. `/tmp/subagent-*.log`
3. Thông tin của mục này được giữ theo registry hiện tại. `.gemini/antigravity/brain/` `.gemini/antigravity/implicit/` `.gemini/antigravity/knowledge/`

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | Nội dung tương ứng | Nội dung tương ứng | |
| `--fallback-vendors` | Nội dung tương ứng | Nội dung tương ứng | |
| `--task-id` | Nội dung tương ứng | Nội dung tương ứng | Nội dung tương ứng |
| `--vendor` | Nội dung tương ứng | `antigravity` `claude` `codex` `cursor` `opencode` `qwen` `grok` `pi` | Nội dung tương ứng |
| `--workspace` | `-w` | `.` | `.` |
| `--isolation` | Nội dung tương ứng | `worktree` `none` | `none` |
| `--read-only` | Nội dung tương ứng | Nội dung tương ứng | `false` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `agent-id` `backend` `frontend` `mobile` `qa` `debug` `pm`
- Thông tin của mục này được giữ theo registry hiện tại. `session-id` `..` `?` `#` `%`
- Thông tin của mục này được giữ theo registry hiện tại. `vendor` `antigravity` `claude` `codex` `cursor` `opencode` `qwen` `grok` `pi`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Lệnh | Nội dung tương ứng | Nội dung tương ứng |
|:-------|:--------|:-----------------|:-----------|
| Nội dung tương ứng | `agy` | `--dangerously-skip-permissions` | `-p` |
| Nội dung tương ứng | `claude` | Nội dung tương ứng | `-p` |
| Nội dung tương ứng | `codex` | `--sandbox workspace-write` | Nội dung tương ứng |
| Nội dung tương ứng | `cursor-agent` | Nội dung tương ứng | `-p` |
| Nội dung tương ứng | `opencode` | Nội dung tương ứng | `-p` |
| Nội dung tương ứng | `qwen` | `--yolo` | `-p` |
| Nội dung tương ứng | `grok` | Nội dung tương ứng | `-p` |
| Nội dung tương ứng | `pi` | `--read-only` | Nội dung tương ứng |

Thông tin của mục này được giữ theo registry hiện tại. `.agents/skills/oma-orchestration/config/cli-config.yaml`

Codex giữ nguyên sandbox workspace-write của nó. oma bật quyền truy cập mạng và thêm project root, OMA state home (`~/.oma`) cùng các cache package-manager hiện có làm thư mục có thể ghi. `oma update` thay thế `cli-config.yaml`, nên hãy đặt chế độ lâu dài bằng `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (mặc định) hoặc `danger-full-access` (không sandbox và không cần approval).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | `.agents/state/memories/result-{agent}.md` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `.agents/state/memories/result-{agent}.md` `## Status:` `completed`
2. Thông tin của mục này được giữ theo registry hiện tại. `/tmp/subagent-{session-id}-{agent}.pid` `running` `crashed`
3. Thông tin của mục này được giữ theo registry hiện tại. `crashed`

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--vendor` | Nội dung tương ứng | Nội dung tương ứng | Nội dung tương ứng |
| `--inline` | `-i` | `agent:task[:workspace]` | `false` |
| `--no-wait` | | `.agents/results/parallel-{timestamp}/` | `false` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `agent:task` `agent:task:workspace`
- Thông tin của mục này được giữ theo registry hiện tại. `./` `/` `.`
- Thông tin của mục này được giữ theo registry hiện tại. `backend:Implement auth API:./api`
- Thông tin của mục này được giữ theo registry hiện tại. `frontend:Build login page`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--window <period>` | `1d` `3d` `7d` `2w` `30d` `--date` | `1d` |
| `--date <date>` | `YYYY-MM-DD` `--window` | |
| `--tool <tools>` | `grok` `claude` `codex` `qwen` `cursor` `antigravity` | Nội dung tương ứng |
| `--top <n>` | Nội dung tương ứng | Nội dung tương ứng |
| `--sort <metric>` | `count` `duration` | `count` |
| `--mermaid` | Nội dung tương ứng | `false` |
| `--graph` | `--mermaid` | `false` |

> Ghi chú: nội dung này áp dụng theo registry hiện tại. `.cursor/rules` `oma link <vendor>` `export` [Tham chiếu](./commands.md#link)

### search

```
oma search <subcommand> [...]
```

Thông tin của mục này được giữ theo registry hiện tại. `search` `--json` `--output` `--pretty`

| Nội dung tương ứng | Nội dung tương ứng |
|:-----------|:---------------|
| `fetch <url>` | `--only` `--skip` `--include-archive` `--timeout` `--locale` `--pretty` |
| `api <url>` `meta <url>` `rss <url>` `archive <url>` | `--timeout` `--locale` `--pretty` |
| `api:search <query>` | `--platforms <list>` `--timeout` `--locale` `--pretty` |
| `rss:google <query>` | `--locale` `en-US` |
| `media <url>` | `--subs` `--sub-lang <list>` `en` `--format <spec>` `--timeout` `30` `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (mặc định `github`), `--language`, `--repo`, `--limit` (mặc định `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | `python3 curl_cffi` `yt-dlp` `gh` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1` `2` `3` `4` `5` `6`

### image

```
oma image <subcommand> [...]
```

Thông tin của mục này được giữ theo registry hiện tại. `--output <text|json>` `--output`

Thông tin của mục này được giữ theo registry hiện tại. `image generate`

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` chọn theo cấu hình `image:` đang hoạt động và thông tin xác thực khả dụng. | `auto` |
| `--size <size>` | | `WxH` `auto` | Nội dung tương ứng |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | Mặc định theo nhà cung cấp |
| `--count <n>` | `-n` | Nội dung tương ứng | `1` |
| `--output-dir <dir>` | | `$PWD` `--allow-external-output` | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | `--output-dir` `$PWD` | `false` |
| `--model <name>` | | `agy` | Nội dung tương ứng |
| `--timeout <duration>` | | Nội dung tương ứng | Nội dung tương ứng |
| `--reference <path>` | `-r` | `-r a.png -r b.png` `codex` `antigravity` `pollinations` | |
| `--yes` | `-y` | Nội dung tương ứng | `false` |
| `--no-prompt-in-manifest` | | `manifest.json` | `false` |
| `--dry-run` | | Nội dung tương ứng | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

Thông tin của mục này được giữ theo registry hiện tại. `image doctor` `image vendor list` `--output <text|json>` `image list-vendors` `vendor list` `--output`

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` nhận các tùy chọn điều khiển planning và capture `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` và `--capture-stop`. Lệnh này cũng nhận `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` và `--no-brief-in-manifest`. Capture bằng browser dùng `--source web --url <url>`; `file` là source mặc định. Một lần render bình thường cần composition đã được author và compositor hoạt động; placeholder chỉ giới hạn ở đường test `OMA_VIDEO_MOCK=1`.

`video doctor` báo cáo hoặc provision toolchain HyperFrames/MPT/Strudel. `compose` chuẩn bị composition contract của run, còn `render` chạy lint, render và probe output. `provider list` báo trạng thái provider và key. Xem [Tạo video](../guide/video-generation.md) để biết run manifest và trình tự khắc phục sự cố.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--force` | `.agents/state/memories/` | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Nội dung tương ứng | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Nội dung tương ứng | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `backend` `frontend` `mobile` `qa` `debug` `pm`

Thông tin của mục này được giữ theo registry hiện tại. `verify triggers` `oma verify <agent-type>` `verify agent`

---

## Ví dụ thực tế

### CI pipeline: update and verify

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automated metrics collection

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch agent execution with status monitoring

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Cleanup in CI after tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspace-aware verification

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro with comparison for sprint reviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Full health check script

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe for agent introspection

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Registry tùy chọn public đầy đủ

Ma trận sau được tạo từ registry lệnh công khai đã được commit trong kho mã. Đây là chỉ mục bao phủ của trang này: hàng có `—` không có tùy chọn dành riêng cho lệnh, còn các cờ gốc dùng chung và bí danh trợ giúp được mô tả ở trên. Chạy `oma describe "<path>"` để xem trợ giúp thời gian chạy khi cú pháp giá trị thay đổi.

| Nội dung tương ứng | Nội dung tương ứng | Mục đích |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Nội dung tương ứng |
| `describe` | `—` | Nội dung tương ứng |
| `uninstall` | `--dry-run, -y, --yes` | Nội dung tương ứng |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Nội dung tương ứng |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Nội dung tương ứng |
| `link` | `--dry-run` | Nội dung tương ứng |
| `intel` | `—` | Nội dung tương ứng |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Nội dung tương ứng |
| `market` | `—` | Nội dung tương ứng |
| `market detect-trap` | `--force` | Nội dung tương ứng |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Nội dung tương ứng |
| `market update` | `--json, --output <format>` | Nội dung tương ứng |
| `market run` | `—` | Chạy engine last30days (scripts/last30days.py) với các đối số đã cho; --save-dir mặc định lấy từ market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Nội dung tương ứng |
| `profile` | `—` | Nội dung tương ứng |
| `profile list` | `--json, --output <format>` | Nội dung tương ứng |
| `profile show` | `--json, --output <format>` | Nội dung tương ứng |
| `profile create` | `--json, --output <format>` | Nội dung tương ứng |
| `profile use` | `--shell <shell>, --json, --output <format>` | Nội dung tương ứng |
| `profile run` | `—` | Nội dung tương ứng |
| `retro` | `--interactive, --compare, --json, --output <format>` | Nội dung tương ứng |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Nội dung tương ứng |
| `docs` | `—` | Nội dung tương ứng |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | `lychee` |
| `docs sync` | `--json` | Với một git diff, liệt kê các tài liệu tham chiếu đến các tệp đã thay đổi. Khoảng diff mặc định là `--cached` (các thay đổi đã stage), rồi chuyển sang HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Nội dung tương ứng |
| `docs lint` | `--json, --locales <list>` | `oma docs i18n` |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Nội dung tương ứng |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Nội dung tương ứng |
| `bridge` | `--context <name>` | Nội dung tương ứng |
| `verify` | `—` | Nội dung tương ứng |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Nội dung tương ứng |
| `vault` | `—` | Nội dung tương ứng |
| `vault store` | `--value <value>` | Nội dung tương ứng |
| `vault get` | `—` | Nội dung tương ứng |
| `vault list` | `--json` | Nội dung tương ứng |
| `vault delete` | `—` | Nội dung tương ứng |
| `star` | `—` | Nội dung tương ứng |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Nội dung tương ứng |
| `search` | `—` | Nội dung tương ứng |
| `search providers` | `--json, --pretty` | Nội dung tương ứng |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Nội dung tương ứng |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Nội dung tương ứng |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search trust` | `--pretty` | Nội dung tương ứng |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Tìm kiếm mã nguồn qua gh / glab |
| `search doctor` | `—` | Nội dung tương ứng |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Nội dung tương ứng |
| `search rss google` | `--locale <value>` | Nội dung tương ứng |
| `harness` | `—` | Nội dung tương ứng |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Nội dung tương ứng |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Dẫn xuất fixture hồi quy skill từ một sự cố đã ghi nhận |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Thăng cấp các sự cố và tối ưu các skill bị ảnh hưởng |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Bật chu trình feedback theo lịch có ngân sách của project; mode là apply hoặc propose |
| `harness evolution status` | `--json, --output <format>` | Hiển thị cấu hình, lịch, công việc đang chờ, xung đột và chu trình gần nhất |
| `harness evolution disable` | `--json, --output <format>` | Tắt chu trình feedback theo lịch của project |
| `harness evolution run` | `--json, --output <format>` | Chạy một chu trình theo mode và ngân sách đã lưu của project đang được bật |
| `slide` | `—` | Nội dung tương ứng |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Nội dung tương ứng |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Nội dung tương ứng |
| `slide edit` | `--workspace <path>, --port <n>` | Nội dung tương ứng |
| `slide doctor` | `—` | Nội dung tương ứng |
| `slide create` | `--output-dir <path>, --force` | Nội dung tương ứng |
| `slide preview` | `--workspace <path>` | `n` |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Nội dung tương ứng |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Nội dung tương ứng |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | Nội dung tương ứng |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Nội dung tương ứng |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Nội dung tương ứng |
| `slide style` | `—` | Nội dung tương ứng |
| `slide style list` | `—` | Nội dung tương ứng |
| `slide style preview` | `—` | Nội dung tương ứng |
| `slide style get` | `--refresh` | Nội dung tương ứng |
| `scholar` | `—` | Nội dung tương ứng |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Nội dung tương ứng |
| `scholar resolve` | `—` | Nội dung tương ứng |
| `scholar get` | `--section <name>` | Nội dung tương ứng |
| `scholar lint` | `--lenient, --fail-on-warning` | Nội dung tương ứng |
| `image` | `—` | Nội dung tương ứng |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | `agy` |
| `image doctor` | `--output <format>` | Nội dung tương ứng |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Nội dung tương ứng |
| `video` | `—` | Nội dung tương ứng |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Nội dung tương ứng |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Nội dung tương ứng |
| `video compose` | `--output <format>, --refresh, --offline` | Scaffold project HyperFrames của run trên toolchain mới nhất + heygen-com/hyperframes; in authoring contract |
| `video render` | `--output <format>` | Nội dung tương ứng |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Nội dung tương ứng |
| `serena` | `—` | Nội dung tương ứng |
| `serena reap` | `--dry-run, --quiet` | Nội dung tương ứng |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Nội dung tương ứng |
| `serena reaper disable` | `--dry-run` | Nội dung tương ứng |
| `explain` | `—` | Nội dung tương ứng |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Nội dung tương ứng |
| `diagram` | `—` | Nội dung tương ứng |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Nội dung tương ứng |
| `diagram update` | `--json, --output <format>` | Nội dung tương ứng |
| `diagram archify` | `—` | Chạy CLI archify đã cài đặt (`doctor \| guide \| validate \| deliver \| visual-check …`) với kiểm tra cập nhật bị tắt |
| `help` | `—` | Nội dung tương ứng |
| `version` | `—` | Nội dung tương ứng |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Nội dung tương ứng |
| `dashboard web` | `—` | Nội dung tương ứng |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Nội dung tương ứng |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Nội dung tương ứng |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Nội dung tương ứng |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Nội dung tương ứng |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `state get` | `--json, --output <format>` | Nội dung tương ứng |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `state repair` | `--dry-run, --json, --output <format>` | Nội dung tương ứng |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Nội dung tương ứng |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Nội dung tương ứng |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Nội dung tương ứng |
| `state inject-log get` | `--json, --output <format>` | Nội dung tương ứng |
| `state summary` | `--category <category>, --json, --output <format>` | Nội dung tương ứng |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Nội dung tương ứng |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Nội dung tương ứng |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Nội dung tương ứng |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Nội dung tương ứng |
| `stats reset` | `--json, --output <format>` | Nội dung tương ứng |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Nội dung tương ứng |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Nội dung tương ứng |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Nội dung tương ứng |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Nội dung tương ứng |
| `agent finish` | `--project-root <path>` | Nội dung tương ứng |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Nội dung tương ứng |
| `agent status` | `--project-root <path>` | Nội dung tương ứng |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Nội dung tương ứng |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Nội dung tương ứng |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Nội dung tương ứng |
| `model probe` | `--json, --timeout <duration>` | Nội dung tương ứng |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | `models:` |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory init` | `--force, --json, --output <format>` | Nội dung tương ứng |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory daemon` | `—` | Nội dung tương ứng |
| `memory daemon status` | `--json, --output <format>` | Nội dung tương ứng |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory service` | `—` | Nội dung tương ứng |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory status` | `--json, --output <format>` | Nội dung tương ứng |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Nội dung tương ứng |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Nội dung tương ứng |
| `skill` | `—` | Nội dung tương ứng |
| `skill audit` | `--json, --output <format>` | Nội dung tương ứng |
| `skill lint` | `--skill <id>, --json, --output <format>` | Nội dung tương ứng |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Nội dung tương ứng |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Nội dung tương ứng |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Đề xuất và chấm điểm các thay đổi đối với quy trình evolution trên các skill held-out |
| `skill procedure` | `--export, --json, --output <format>` | Hiển thị quy trình evolution (prompt optimizer/maintainer, constitution) cùng các hash của nó |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Tổng hợp các lần chạy optimization đã ghi theo kết quả, memory mode và quy trình |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Tường thuật các lần thăng cấp và rollback SKILL.md đã ghi cho một skill, hoặc cho mọi skill và quy trình khi dùng `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Khôi phục phần body SKILL.md đã bị thay bởi lần thăng cấp được ghi gần nhất |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Nội dung tương ứng |
| `schedule list` | `--json, --output <format>` | Nội dung tương ứng |
| `schedule delete` | `—` | Nội dung tương ứng |
| `schedule run` | `—` | Nội dung tương ứng |
| `schedule sync` | `--prune` | Nội dung tương ứng |
