---
title: "Lệnh CLI"
description: "Tham chiếu đầy đủ cho mọi lệnh CLI của oh-my-agent, gồm cú pháp, tùy chọn và ví dụ theo từng nhóm."
---

# Lệnh CLI

Thông tin của mục này được giữ theo registry hiện tại. `bun install --global oh-my-agent` `oma` `oh-my-agent` `npx oh-my-agent` `--global`

Thông tin của mục này được giữ theo registry hiện tại. `OH_MY_AG_OUTPUT_FORMAT` `json` `--json`

## Bắt đầu từ một task

Thông tin của mục này được giữ theo registry hiện tại.

| Tác vụ | Bắt đầu tại đây | Kết quả mong đợi |
|:-----|:-----------|:----------------|
| Nội dung tương ứng | `oma install` `oma doctor` | `oma doctor --profile` |
| Nội dung tương ứng | `oma describe` `oma describe "image generate"` | Nội dung tương ứng |
| Nội dung tương ứng | `oma image generate "<prompt>" --output json` | `.agents/results/images/` |
| Nội dung tương ứng | `oma video generate "<brief>" --dry-run` | Nội dung tương ứng |
| Nội dung tương ứng | `/explain` | `.agents/results/explain/` |
| Nội dung tương ứng | `oma diagram resolve --output json` | Nội dung tương ứng |
| Nội dung tương ứng | `oma market detect-trap "<topic>"` | `oma market resolve --output json` |
| Nội dung tương ứng | `oma scholar search "<query>"` | `oma scholar get` |
| Nội dung tương ứng | `oma slide create --output-dir <dir>` | Nội dung tương ứng |
| Nội dung tương ứng | `oma docs verify --json` | Nội dung tương ứng |

Registry đã được commit trong kho mã là nguồn cho bản đồ lệnh này. Các tên khám phá chuẩn bên dưới là các đường dẫn do `oma describe` trả về; trợ giúp tương tác có thể hiển thị các bí danh tương thích như `slide new`, `slide viewer`, `image list-vendors` hoặc `video list-providers`.

## Bề mặt lệnh hiện tại

Thông tin của mục này được giữ theo registry hiện tại. `--help` `oma describe <path>` [Tham chiếu](./options.md)

| Nhóm | Đường dẫn đã đăng ký |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update` `update mcp` |
| `link` | `link` |
| `intel` | `intel` `intel suggest` |
| `market` | `market` `market detect-trap` `market resolve` `market update` `market run` |
| `doctor` | `doctor` |
| `profile` | `profile` `profile list` `profile show` `profile create` `profile use` `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs` `docs verify` `docs sync` `docs i18n` `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify` `verify agent` `verify triggers` |
| `vault` | `vault` `vault store` `vault get` `vault list` `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search` `search providers` `search web` `search fetch` `search meta` `search media` `search archive` `search trust` `search code` `search doctor` `search api` `search api fetch` `search api search` `search rss` `search rss fetch` `search rss google` |
| `harness` | `harness` `harness eval` |
| `slide` | `slide` `slide validate` `slide bundle` `slide edit` `slide doctor` `slide create` `slide preview` `slide export` `slide export pdf` `slide export png` `slide export pptx` `slide import` `slide import pptx` `slide asset` `slide asset fetch-video` `slide style` `slide style list` `slide style preview` `slide style get` |
| `scholar` | `scholar` `scholar search` `scholar resolve` `scholar get` `scholar lint` |
| `image` | `image` `image generate` `image doctor` `image vendor` `image vendor list` |
| `video` | `video` `video generate` `video doctor` `video compose` `video render` `video provider` `video provider list` |
| `serena` | `serena` `serena reap` `serena reaper` `serena reaper enable` `serena reaper disable` |
| `explain` | `explain` `explain validate` |
| `diagram` | `diagram` `diagram resolve` `diagram update` `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard` `dashboard terminal` `dashboard web` |
| `auth` | `auth` `auth status` |
| `hook` | `hook` `hook run` `hook probe` |
| `state` | `state` `state emit` `state migrate` `state get` `state list` `state repair` `state verify` `state decisions` `state decisions list` `state inject-log` `state inject-log list` `state inject-log get` `state summary` `state heal-check` `state activate` `state archive` `state purge` |
| `ralph` | `ralph` `ralph verify` |
| `goal` | `goal` `goal set` |
| `stats` | `stats` `stats get` `stats reset` |
| `agent` | `agent` `agent context` `agent resume` `agent begin` `agent verify` `agent finish` `agent spawn` `agent status` `agent parallel` `agent review` |
| `model` | `model` `model check` `model probe` `model propose` |
| `memory` | `memory` `memory keys` `memory init` `memory setup` `memory daemon` `memory daemon status` `memory daemon start` `memory daemon stop` `memory daemon restart` `memory service` `memory service install` `memory service uninstall` `memory status` `memory retry` `memory retry drain` `memory import` `memory maintain` `memory maintain backup` `memory maintain prune` `memory maintain vacuum` `memory gc` `memory upgrade` |
| `skill` | `skill` `skill audit` `skill lint` `skill eval` `skill optimize` |
| `schedule` | `schedule` `schedule create` `schedule list` `schedule delete` `schedule run` `schedule sync` |

Thông tin của mục này được giữ theo registry hiện tại. `market run` `diagram archify`

---

## Thiết lập và cài đặt

### install

Thông tin của mục này được giữ theo registry hiện tại. `oma` `oma install`

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

Thông tin của mục này được giữ theo registry hiện tại. `--web-search` `--code-intelligence` `--semantic-memory` `--honcho-url` `--honcho-workspace` `-y, --yes` `--global` `--yes`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `.agent/` `.agents/`
2. Thông tin của mục này được giữ theo registry hiện tại.
3. Thông tin của mục này được giữ theo registry hiện tại.
4. Thông tin của mục này được giữ theo registry hiện tại.
5. Thông tin của mục này được giữ theo registry hiện tại.
6. Thông tin của mục này được giữ theo registry hiện tại.
7. Thông tin của mục này được giữ theo registry hiện tại.
8. Thông tin của mục này được giữ theo registry hiện tại.
9. Thông tin của mục này được giữ theo registry hiện tại.
10. Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `rerere.enabled=true`
- Thông tin của mục này được giữ theo registry hiện tại. `init.defaultBranch=main`
- Thông tin của mục này được giữ theo registry hiện tại. `--yes`
11. Thông tin của mục này được giữ theo registry hiện tại.
12. Thông tin của mục này được giữ theo registry hiện tại. `gh`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Thông tin của mục này được giữ theo registry hiện tại.

```
oma doctor [--json] [--output <format>] [--profile]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |
| `--profile` | `model_preset` `agents:` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `~/.gemini/settings.json` `~/.claude.json` `~/.codex/config.toml`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `.agents/state/memories/` `.serena/memories/`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `gitRecommended`
- Thông tin của mục này được giữ theo registry hiện tại. `rerere.enabled=true`
- Thông tin của mục này được giữ theo registry hiện tại. `init.defaultBranch=main`
- Thông tin của mục này được giữ theo registry hiện tại. `totalIssues`
- Thông tin của mục này được giữ theo registry hiện tại. `CLAUDE.md` `AGENTS.md`
- Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `doctor`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Thông tin của mục này được giữ theo registry hiện tại.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `-f, --force` | `oma-config.yaml` `mcp.json` `stack/` |
| `--with-new-skills` | Nội dung tương ứng |
| `--ci` | Nội dung tương ứng |
| `-y, --yes` | `--all` `--vendor` |
| `--all` | Nội dung tương ứng |
| `--vendor <vendors>` | `claude,qwen` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `prompt-manifest.json`
2. Thông tin của mục này được giữ theo registry hiện tại. `.agents/skills/_version.json`
3. Thông tin của mục này được giữ theo registry hiện tại.
4. Thông tin của mục này được giữ theo registry hiện tại.
5. Thông tin của mục này được giữ theo registry hiện tại. `--force`
6. Thông tin của mục này được giữ theo registry hiện tại. `.agents/`
7. Thông tin của mục này được giữ theo registry hiện tại.
8. Thông tin của mục này được giữ theo registry hiện tại.
9. Thông tin của mục này được giữ theo registry hiện tại. `rerere.enabled` `init.defaultBranch` `--yes` `--ci`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

Thông tin của mục này được giữ theo registry hiện tại. `oma update mcp` `--yes` `--ci` `--all` `--vendor <vendors>` `--vendor`

### uninstall

Thông tin của mục này được giữ theo registry hiện tại.

```
oma uninstall --dry-run
oma uninstall --yes
```

Thông tin của mục này được giữ theo registry hiện tại. `--dry-run` `--yes` `oma-config.yaml` `mcp.json`

### link

Thông tin của mục này được giữ theo registry hiện tại. `.agents/`

```
oma link [vendors...] [--global]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Thông tin của mục này được giữ theo registry hiện tại. `--global` `<cwd>/.agents/` `~/.agents/` `OMA_HOME` [Tham chiếu](../guide/global-install.md)

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `.agents/agents/`
2. Thông tin của mục này được giữ theo registry hiện tại.
3. Thông tin của mục này được giữ theo registry hiện tại. `CLAUDE.md` `GEMINI.md` `AGENTS.md`
4. Thông tin của mục này được giữ theo registry hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `.agents/agents/` `.agents/workflows/` `.agents/rules/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `default_model` `.agents/skills/oma-orchestration/config/cli-config.yaml`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `oma agent spawn`

### setup (workflow)

Thông tin của mục này được giữ theo registry hiện tại. `/setup` `oma` `/setup`
---

## Giám sát và số liệu

### dashboard

Thông tin của mục này được giữ theo registry hiện tại.

```
oma dashboard terminal
```

Thông tin của mục này được giữ theo registry hiện tại. `.agents/state/memories/` `.serena/memories/` `Ctrl+C`

Thông tin của mục này được giữ theo registry hiện tại. `MEMORIES_DIR`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Thông tin của mục này được giữ theo registry hiện tại.

```
oma dashboard web
```

Thông tin của mục này được giữ theo registry hiện tại. `http://localhost:9847`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Biến | Mặc định | Mô tả |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Nội dung tương ứng |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | `{cwd}/.serena/memories` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Thông tin của mục này được giữ theo registry hiện tại.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `session-cost-*.md` `.agents/state/memories/`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `session.quota_cap` `.agents/oma-config.yaml`

Thông tin của mục này được giữ theo registry hiện tại. `.agents/state/metrics.json` `.serena/metrics.json`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Thông tin của mục này được giữ theo registry hiện tại.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--window <period>` | `1d` `3d` `7d` `2w` `30d` | `1d` |
| `--date <date>` | `YYYY-MM-DD` `--window` | |
| `--tool <tools>` | `grok,claude,codex,qwen,cursor,antigravity` | Nội dung tương ứng |
| `--top <n>` | Nội dung tương ứng | |
| `--sort <metric>` | `count` `duration` | `count` |
| `--mermaid` | Nội dung tương ứng | |
| `--graph` | Nội dung tương ứng | |
| `--json` `--output <format>` | Nội dung tương ứng | `text` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Thông tin của mục này được giữ theo registry hiện tại.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Mô tả | Mặc định |
|:---------|:-----------|:--------|
| `window` | `7d` `2w` `1m` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |
| `--interactive` | Nội dung tương ứng |
| `--compare` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Session và profile local

### state list

Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

Thông tin của mục này được giữ theo registry hiện tại. `--all-projects`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

### profile

Thông tin của mục này được giữ theo registry hiện tại. `~/.oma/u/<slot>/`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

Thông tin của mục này được giữ theo registry hiện tại. `profile use` `OMA_PROFILE`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `0` `OMA_STATE_HOME`
Thông tin của mục này được giữ theo registry hiện tại. `profile run <slot> -- <command> [args...]`
Thông tin của mục này được giữ theo registry hiện tại. `--help`
Thông tin của mục này được giữ theo registry hiện tại. `--json`

---

## Quản lý agent

### agent spawn

Thông tin của mục này được giữ theo registry hiện tại.

```
oma agent spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `agent-id` | Có | `backend` `frontend` `mobile` `qa` `debug` `pm` |
| `prompt` | Có | Nội dung tương ứng |
| `session-id` | Có | `session-YYYYMMDD-HHMMSS` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--vendor <vendor>` | `antigravity` `claude` `codex` `cursor` `qwen` `grok` `pi` |
| `-w, --workspace <path>` | Nội dung tương ứng |
| `--isolation <mode>` | `worktree` `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` `oma/{sessionId}/{agentId}` |
| `--read-only` | `oma skill eval --live` |
| `--fallback-vendors <vendors>` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `--vendor` `agents:` `oma-config.yaml` `model_preset`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Nội dung tương ứng |
|:-----|:--------|
| `0` | Nội dung tương ứng |
| `3` | `-w` `blocker.raised` `agent status` `no-artifact` |
| Nội dung tương ứng | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `pi`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `.agents/results/`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `--read-only`

Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `oma agent spawn`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `--fallback-vendors`

### agent status

Thông tin của mục này được giữ theo registry hiện tại.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `session-id` | Có | Nội dung tương ứng |
| `agent-ids` | Không | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Nội dung tương ứng | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `completed`
- Thông tin của mục này được giữ theo registry hiện tại. `running`
- Thông tin của mục này được giữ theo registry hiện tại. `crashed`
- Thông tin của mục này được giữ theo registry hiện tại. `no-artifact` `agent spawn` `3`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `{agent-id}:{status}`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Thông tin của mục này được giữ theo registry hiện tại.

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `tasks` | Có | `--inline` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--vendor <vendor>` | Nội dung tương ứng |
| `-i, --inline` | `agent:task[:workspace]` |
| `--no-wait` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `agent:task` `agent:task:workspace` `./` `/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `.agents/results/parallel-{timestamp}/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Thông tin của mục này được giữ theo registry hiện tại.

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--vendor <vendor>` | `codex` `claude` `qwen` `grok` `codex` |
| `-p, --prompt <prompt>` | Nội dung tương ứng |
| `-w, --workspace <path>` | Nội dung tương ứng |
| `--no-uncommitted` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `codex` `codex review`
- Thông tin của mục này được giữ theo registry hiện tại. `claude` `qwen`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `--no-uncommitted`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set

Thông tin của mục này được giữ theo registry hiện tại.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--gate <keyword>` | `typecheck` `test` `lint` |
| `--budget-minutes <n>` | `gate.failed` `gate: "budget"` |
| `--description <text>` | Nội dung tương ứng |
| `--workflow <name>` | Nội dung tương ứng |
| `--session <id>` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `gate.passed`
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Agent theo lịch

### schedule create

Thông tin của mục này được giữ theo registry hiện tại. `--cron` `--every`

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `agent-id` | Có | `backend` `frontend` `mobile` `qa` `debug` `pm` |
| `prompt` | Có | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--cron "<expr>"` | `"0 9 * * *"` `--every` |
| `--every "<phrase>"` | `5m` `2h` `1d` `every 20m` `every 5 minutes` `--cron` |
| `--vendor <vendor>` | `oma agent spawn` `antigravity` `claude` `codex` `cursor` `opencode` `qwen` `grok` `pi` |
| `-w, --workspace <path>` | Nội dung tương ứng |
| `--once` | Nội dung tương ứng |
| `--expires-after <duration>` | `0` |
| `--env <KEY1,KEY2>` | `~/.agents/schedule/env/<id>` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `--every`
2. Thông tin của mục này được giữ theo registry hiện tại. `~/.agents/schedule/schedules.json`
3. Thông tin của mục này được giữ theo registry hiện tại. `oma schedule run <id>` `--user`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

Thông tin của mục này được giữ theo registry hiện tại.  [Tham chiếu](../guide/scheduled-agents.md)

### schedule list

Thông tin của mục này được giữ theo registry hiện tại.

```
oma schedule list [--json]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `synced` `missing-in-os` `schedule sync` `orphan-in-os` `schedule sync --prune` `--prune`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Thông tin của mục này được giữ theo registry hiện tại.

```
oma schedule delete <id>
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `id` | Có | `schedule list` `sch_<base32-12>` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Thông tin của mục này được giữ theo registry hiện tại.

```
oma schedule run <id>
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
1. Thông tin của mục này được giữ theo registry hiện tại. `<id>`
2. Thông tin của mục này được giữ theo registry hiện tại. `~/.agents/schedule/env/<id>`
3. Thông tin của mục này được giữ theo registry hiện tại. `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>` `--vendor`
4. Thông tin của mục này được giữ theo registry hiện tại. `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`
5. Thông tin của mục này được giữ theo registry hiện tại. `lastFiredAt` `--once`
6. Thông tin của mục này được giữ theo registry hiện tại. `re-auth required: <vendor>`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Thông tin của mục này được giữ theo registry hiện tại.

```
oma schedule sync [--prune]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--prune` | `--prune` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Quản lý memory

### memory init

Thông tin của mục này được giữ theo registry hiện tại.

```
oma memory init [--json] [--output <format>] [--force]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |
| `--force` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `.agents/state/memories/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Tích hợp và tiện ích

### auth status

Thông tin của mục này được giữ theo registry hiện tại.

```
oma auth status [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `gh` `agy`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma auth status
oma auth status --json
```

### bridge

Thông tin của mục này được giữ theo registry hiện tại.

```
oma bridge [url] [--context <name>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `url` | Không | Nội dung tương ứng |
| `--context` | Không | `ide` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `--project`
Thông tin của mục này được giữ theo registry hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `--project`
Thông tin của mục này được giữ theo registry hiện tại. `activate_project`
Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `serena.mode: stdio` `.agents/oma-config.yaml`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Thông tin của mục này được giữ theo registry hiện tại.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `verify agent`

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `agent-type` | Có | `backend` `frontend` `mobile` `qa` `debug` `pm` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Nội dung tương ứng | Nội dung tương ứng |
| `--json` | Nội dung tương ứng | |
| `--output <format>` | `text` `json` | |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `verify triggers` `verify agent`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `.agents/results/plan-{sessionId}.json` `git diff`
- Thông tin của mục này được giữ theo registry hiện tại. `result-{agent}.md` `CHARTER_CHECK:`
- Thông tin của mục này được giữ theo registry hiện tại. `.py` `.ts` `.tsx` `.js` `.dart` `password = "..."` `api_key = "..."`
- Thông tin của mục này được giữ theo registry hiện tại. `TODO` `FIXME` `HACK` `XXX`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Nội dung tương ứng |
|:-----------|:-----------------|
| `backend` | `py_compile` `pytest` |
| `frontend` | `tsc --noEmit` `style={{` `any` `vitest` |
| `mobile` | `flutter analyze` `dart analyze` `flutter test` |
| `qa` | Nội dung tương ứng |
| `debug` | Nội dung tương ứng |
| `pm` | `.agents/results/plan-{sessionId}.json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `PASS` `FAIL` `WARN` `SKIP` `ok: true`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Thông tin của mục này được giữ theo registry hiện tại. `oma-hook.sh`

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Bắt buộc | Mô tả |
|:-----|:---------|:-----------|
| `--vendor <v>` | Có | `antigravity` `claude` `codex` `commandcode` `cursor` `grok` `kimi` `kiro` `qwen` `pi` `installPiExtension` `oma hook run` |
| `--event <e>` | Có | `UserPromptSubmit` `PreToolUse` `Stop` |
| `--matcher <m>` | Không | `Bash` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `0`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Thông tin của mục này được giữ theo registry hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `statusLine` `oma hook run` `bun`
- Thông tin của mục này được giữ theo registry hiện tại. `installPiExtension` `oma hook run`

Thông tin của mục này được giữ theo registry hiện tại. `cli/commands/hook/command.ts` `cli/commands/hook/probe/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Thông tin của mục này được giữ theo registry hiện tại.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--vendor <list>` | Nội dung tương ứng | Nội dung tương ứng |
| `--output <fmt>` | `text` `md` `json` | `text` |
| `--hooks-dir <dir>` | `.agents/hooks/core` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `keyword-detector` `persistent-mode` `1` `failed`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

---

### vault

Thông tin của mục này được giữ theo registry hiện tại. `@napi-rs/keyring` `~/.config/oma/vault-index.json` `oma vault list`

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Mô tả |
|:------------|:-----------|
| `store <name>` | `name` `--value <value>` |
| `get <name>` | `export ANTHROPIC_API_KEY=$(oma vault get anthropic)` `2` |
| `list` | `createdAt` |
| `rm <name>` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `[A-Za-z0-9._-]` `anthropic` `openai-prod` `github_pat` `sentry.dsn`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `@napi-rs/keyring` `libsecret` `gnome-keyring`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Thông tin của mục này được giữ theo registry hiện tại.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--dry-run` | Nội dung tương ứng |
| `-y, --yes` | Nội dung tương ứng |
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `/tmp/subagent-*.pid`
- Thông tin của mục này được giữ theo registry hiện tại. `/tmp/subagent-*.log`
- Thông tin của mục này được giữ theo registry hiện tại. `serena start-mcp-server` `tsserver` `pyright` `serena reap` [Tham chiếu](#serena)
- Thông tin của mục này được giữ theo registry hiện tại. `.gemini/antigravity/`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena

Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `tsserver` `pyright`
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại.

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Lệnh | Mô tả |
|:--------|:-----------|
| `serena reap` | `--quiet` `enabled` |
| `serena reap --dry-run` | Nội dung tương ứng |
| `serena reaper enable` | `serena reap --quiet` |
| `serena reaper disable` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `lru` `keepWarm`
Thông tin của mục này được giữ theo registry hiện tại. `idle` `idleMinutes`
Thông tin của mục này được giữ theo registry hiện tại. `graceSeconds`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `.agents/oma-config.yaml`

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Thông tin của mục này được giữ theo registry hiện tại.
Thông tin của mục này được giữ theo registry hiện tại. `oma doctor` [Tham chiếu](#doctor)
Thông tin của mục này được giữ theo registry hiện tại. `oma cleanup` [Tham chiếu](#cleanup)

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Thông tin của mục này được giữ theo registry hiện tại.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

Thông tin của mục này được giữ theo registry hiện tại. `viz` `visualize`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma visualize
oma viz --json
```

### search

Thông tin của mục này được giữ theo registry hiện tại. `oma s` `--pretty`

```
oma search <subcommand> ...
oma s <subcommand> ...
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Mục đích |
|:-----------|:--------|
| `fetch <url>` | Nội dung tương ứng |
| `api <url>` | Nội dung tương ứng |
| `api:search <query>` | `--platforms <list>` |
| `meta <url>` | Nội dung tương ứng |
| `rss <url>` | Nội dung tương ứng |
| `rss:google <query>` | Nội dung tương ứng |
| `media <url>` | `yt-dlp` |
| `archive <url>` | Nội dung tương ứng |
| `trust <domain>` | Nội dung tương ứng |
| `code <query>` | `gh` `glab` |
| `doctor` | `python3` `curl_cffi` `yt-dlp` `gh` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Nội dung tương ứng | `15` `30` `media` |
| `--locale <value>` | `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Nội dung tương ứng | `false` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `fetch`

| Flag | Mô tả |
|:-----|:-----------|
| `--only <strategies>` | `api,probe,impersonate,browser,archive` |
| `--skip <strategies>` | Nội dung tương ứng |
| `--include-archive` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `media`

| Flag | Mô tả |
|:-----|:-----------|
| `--subs` | Nội dung tương ứng |
| `--sub-lang <list>` | `en` |
| `--format <spec>` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `code`

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Máy chủ | `github` |
| `--language <lang>` | Bộ lọc ngôn ngữ | |
| `--repo <owner/repo>` | Giới hạn theo kho lưu trữ | |
| `--limit <n>` | Số kết quả tối đa | `20` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1` `2` `3` `4` `5` `6`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

Thông tin của mục này được giữ theo registry hiện tại.

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

Thông tin của mục này được giữ theo registry hiện tại. `search` `--json` `--pretty` `search web` `--provider` `--limit` `--timeout` `--json` `--pretty` `oma search doctor`

### image

Thông tin của mục này được giữ theo registry hiện tại. `oma img`

```
oma image <subcommand> ...
oma img <subcommand> ...
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Mục đích |
|:-----------|:--------|
| `generate <prompt...>` | `pollinations` `codex` `antigravity` |
| `doctor` | Nội dung tương ứng |
| `vendor list` | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `image generate`

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | `WxH` `auto` | Nội dung tương ứng |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | Mặc định theo nhà cung cấp |
| `-n, --count <n>` | Nội dung tương ứng | `1` |
| `--output-dir <path>` | Nội dung tương ứng | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | `$PWD` | `false` |
| `--model <name>` | `antigravity` | Nội dung tương ứng |
| `--timeout <duration>` | Nội dung tương ứng | Nội dung tương ứng |
| `-r, --reference <path>` | `codex` `antigravity` `pollinations` | |
| `-y, --yes` | Nội dung tương ứng | `false` |
| `--no-prompt-in-manifest` | Nội dung tương ứng | `false` |
| `--dry-run` | Nội dung tương ứng | `false` |
| `--output <format>` | `text` \| `json` | `text` |

Thông tin của mục này được giữ theo registry hiện tại. `manifest.json`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Thông tin của mục này được giữ theo registry hiện tại. `generate`

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

Thông tin của mục này được giữ theo registry hiện tại. `generate` `--mode shorts|explainer|demo` `--aspect` `--locale` `--captions` `--visual` `--voice` `--music` `--duration` `--compositor remotion|mpt` `--capture` `--source file|web` `--url` `--device` `--ready-selector` `--show-cursor` `--polish` `--capture-timeout` `--capture-stop duration:<seconds>|selector:<css>` `--source web --url <url>` `--source file` `--output-dir` `--allow-external-output` `$PWD` `--max-usd` `--seed` `--no-brief-in-manifest` `--dry-run` `--output text|json` `--capture-stop` `--compositor` `--mode` `--output` `--source`

Thông tin của mục này được giữ theo registry hiện tại. `doctor` `--install` `--upgrade` `--install-mpt` `--install-strudel` `provider list` `compose` `render` `OMA_VIDEO_MOCK=1`

Thông tin của mục này được giữ theo registry hiện tại. `runDir` `manifestPath` `scriptPath` `renderSpecPath` `compose` `AUTHORING.md` `render` `oma video doctor`

### star

Thông tin của mục này được giữ theo registry hiện tại.

```
oma star
```

Thông tin của mục này được giữ theo registry hiện tại. `gh` `first-fluke/oh-my-agent`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma star
```

### describe

Thông tin của mục này được giữ theo registry hiện tại.

```
oma describe [command-path]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `command-path` | Không | Nội dung tương ứng |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Lệnh nghiên cứu và artifact

Thông tin của mục này được giữ theo registry hiện tại.

### intel suggest

Thông tin của mục này được giữ theo registry hiện tại.

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

Thông tin của mục này được giữ theo registry hiện tại. `--config` `--topic` `--target` `--repos` `--since` `--last-commits` `--output-dir` `--fixture` `--create-issue` `--base-repo <owner/name>` `--yes` `--dry-run` `--json` `--base-repo`

### market

Thông tin của mục này được giữ theo registry hiện tại. `last30days`

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

Thông tin của mục này được giữ theo registry hiện tại. `market detect-trap` `--force` `market resolve` `--refresh` `--offline` `market update` `market run` `--save-dir` `market.save_dir` `--help` [Tham chiếu](../guide/market-research.md)

### docs

Thông tin của mục này được giữ theo registry hiện tại. `sync`

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

Thông tin của mục này được giữ theo registry hiện tại. `verify` `docs/generated/doc-refs.json` `--urls-sync` `lychee` `sync` `HEAD~1..HEAD` `{doc, changedFiles, matchedRefs}` `i18n` `lint`

### slide

Thông tin của mục này được giữ theo registry hiện tại. `oma slide`

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

Thông tin của mục này được giữ theo registry hiện tại. `--slide <file>` `--report-file <path>` `--report-file` `--slide`

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

Thông tin của mục này được giữ theo registry hiện tại. `slide import pptx <file>` `slide asset fetch-video <url>` `slide style list|preview|get <slug>` [Tham chiếu](../guide/content-and-research.md#slides-and-presentations)

### scholar

Thông tin của mục này được giữ theo registry hiện tại.

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

Thông tin của mục này được giữ theo registry hiện tại. `search` `--year-min` `--always-fallback` `get --section` `statements` `evidence` `relations` `artifacts` `citation` `lint --lenient` `--fail-on-warning` `--lenient` `--section`

### explain

Thông tin của mục này được giữ theo registry hiện tại. `/explain`

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Thông tin của mục này được giữ theo registry hiện tại. `--input-dir` [Tham chiếu](../guide/code-explainer.md)

### diagram

Thông tin của mục này được giữ theo registry hiện tại.

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

Thông tin của mục này được giữ theo registry hiện tại. `diagram resolve` `--engine auto|archify|mermaid` `--refresh` `--offline` `diagram update` `diagram archify` [Tham chiếu](../guide/diagram-engine.md) `--engine`

## Kiểm tra state, model và memory

Thông tin của mục này được giữ theo registry hiện tại. `--dry-run` `--json`

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

Thông tin của mục này được giữ theo registry hiện tại. `state emit` `state migrate` `state repair` `state decisions list` `state inject-log list|get` `state activate` `state archive` `state purge`

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

Thông tin của mục này được giữ theo registry hiện tại. `model check` `model probe` `model propose` `oma-config` `models:` `--write`

### agent evidence commands

Thông tin của mục này được giữ theo registry hiện tại.

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

Thông tin của mục này được giữ theo registry hiện tại. `agent context` `begin` `verify` `--required` `--affected` `finish` `agent resume --dry-run` `agent resume --max-attempts <n>` `agent spawn` `agent parallel` `agent review` [Tham chiếu](../guide/agent-results-and-resume.md) `--dry-run` `--max-attempts`

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

Thông tin của mục này được giữ theo registry hiện tại. `memory keys` `--dry-run` `memory setup` `--install` `--start` `memory daemon` `memory service` `memory maintain backup|prune|vacuum` `memory retry drain` `memory upgrade` `memory gc`

## Quản lý skill

### skills audit

Thông tin của mục này được giữ theo registry hiện tại.

```
oma skill audit [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại.
- Thông tin của mục này được giữ theo registry hiện tại. `.md` `SKILL.md` `SKILL.md`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Thông tin của mục này được giữ theo registry hiện tại. `SKILL.md` `skills audit`

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--skill <id>` | Nội dung tương ứng |
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Nội dung tương ứng | Nội dung tương ứng | Nội dung tương ứng |
|:------|:---------|:--------|
| `missing-name` | Nội dung tương ứng | `name` |
| `missing-description` | Nội dung tương ứng | `description` |
| `weak-description` | Nội dung tương ứng | Nội dung tương ứng |
| `body-too-long` | Nội dung tương ứng | `resources/` |
| `template-placeholder` | Nội dung tương ứng | `{Placeholder}` |
| `broken-reference` | Nội dung tương ứng | `resources/` `config/` `scripts/` `assets/` |

**Dấu hiệu SSL-lite** (việc kiểm tra SSL-lite là bắt buộc khi tên khai báo của skill hoặc tên thư mục/bí danh được công bố bắt đầu bằng `oma-`, kể cả khi không có `## Scheduling`; bí danh không có tiền tố không thể bỏ qua tên khai báo `oma-`. Các skill thông thường không có tiền tố chọn dùng định dạng này bằng cách thêm `## Scheduling`):

| Nội dung tương ứng | Nội dung tương ứng | Nội dung tương ứng |
|:------|:---------|:--------|
| `ssl-structure` | Nội dung tương ứng | `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | Nội dung tương ứng | `### Canonical command path` `### Canonical workflow path` |
| `missing-boundaries` | Nội dung tương ứng | `### When NOT to use` |
| `empty-failure-recovery` | Nội dung tương ứng | `### Failure and recovery` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Thông tin của mục này được giữ theo registry hiện tại. `skills audit` `audit` `eval`

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mô tả |
|:-----|:-----------|
| `--skill <id>` | `_all` |
| `--mock` | `_rollouts/` |
| `--live` | `oma agent spawn --read-only` `--yes` |
| `--record` | `_rollouts/` `--mock` `--live` |
| `--yes` | `--live` |
| `--task-dir <path>` | `.agents/eval/<skill>/` |
| `--max-tasks <n>` | Nội dung tương ứng |
| `--require-coverage` | Nội dung tương ứng |
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

Thông tin của mục này được giữ theo registry hiện tại. `.agents/eval/<skill>/`
1. Thông tin của mục này được giữ theo registry hiện tại.
2. Thông tin của mục này được giữ theo registry hiện tại. `SKILL.md`
3. Thông tin của mục này được giữ theo registry hiện tại.
4. Thông tin của mục này được giữ theo registry hiện tại. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Quyết định | Điều kiện |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` |
| `insufficient` | `--require-coverage` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `--live` `--mock` `assert` `regex`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `OMA_SKILLEVAL_MOCK=1`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1` `--require-coverage`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

Thông tin của mục này được giữ theo registry hiện tại. `.agents/eval/` [Tham chiếu](../guide/skill-eval.md)

---

### skills opt

Thông tin của mục này được giữ theo registry hiện tại. `SKILL.md` `--apply`

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.

| Flag | Mặc định | Mô tả |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Nội dung tương ứng |
| `--dry-run` | Nội dung tương ứng | `SKILL.md` |
| `--apply` | Nội dung tương ứng | Nội dung tương ứng |
| `--mock` | Nội dung tương ứng | Nội dung tương ứng |
| `--live` | Nội dung tương ứng | `--yes` |
| `--max-epochs <n>` | `8` | Nội dung tương ứng |
| `--edits-per-epoch <k>` | `4` | Nội dung tương ứng |
| `--lr <chars>` | `600` | Nội dung tương ứng |
| `--yes` | Nội dung tương ứng | `--live` |
| `--json` | Nội dung tương ứng | Nội dung tương ứng |
| `--output <format>` | `text` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `.agents/eval/<skill>/` [Tham chiếu](../guide/skill-eval.md)

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `--apply`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `oma-` `oma update` `--apply` `--dry-run`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `0` `1`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại.
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

Thông tin của mục này được giữ theo registry hiện tại.  [Tham chiếu](../guide/skill-opt.md)

---

### harness eval

Thông tin của mục này được giữ theo registry hiện tại. `.agents/`

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Flag | Mô tả |
|:-----|:------------|
| `--suite <path>` | Nội dung tương ứng |
| `--candidate <path>` | `.agents/` |
| `--mock` | Nội dung tương ứng |
| `--live` | Nội dung tương ứng |
| `--record` | `--live` |
| `--record-file <path>` | Nội dung tương ứng |
| `--yes` | Nội dung tương ứng |
| `--timeout-minutes <n>` | `15` |
| `--require-coverage` | Nội dung tương ứng |
| `--json` | Nội dung tương ứng |
| `--output <format>` | `text` `json` |

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `insufficient` `--require-coverage`

Chi tiết của mục này được áp dụng theo cấu hình hiện tại. `.agents/agents` `.agents/rules` `.agents/skills` `.agents/workflows`

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Thông tin của mục này được giữ theo registry hiện tại.  [Tham chiếu](../guide/harness-eval.md)

---

### help

Thông tin của mục này được giữ theo registry hiện tại.

```
oma help
```

Thông tin của mục này được giữ theo registry hiện tại.

### version

Thông tin của mục này được giữ theo registry hiện tại.

```
oma version
```

Thông tin của mục này được giữ theo registry hiện tại.

---

## Biến môi trường

| Biến | Mô tả | Dùng bởi |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | `json` | `--json` |
| `DASHBOARD_PORT` | Nội dung tương ứng | `dashboard web` |
| `MEMORIES_DIR` | Nội dung tương ứng | `dashboard` `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | `1` `oma skill eval` | `skills eval` |

---

## Alias

| Alias | Lệnh đầy đủ |
|:------|:------------|
| `viz` | `visualize` |
