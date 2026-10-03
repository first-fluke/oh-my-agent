---
title: Cài đặt
description: Cài đặt oh-my-agent, chọn skill và provider, hiểu các tệp project được tạo, cấu hình mặc định model và runtime, rồi xác minh thiết lập bằng oma doctor.
---

# Cài đặt

## Điều kiện tiên quyết

- **IDE hoặc CLI có AI**: ít nhất một host được hỗ trợ như Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot hoặc Hermes
- **bun**: runtime JavaScript và trình quản lý package (script cài đặt tự cài nếu thiếu)
- **uv**: trình quản lý package Python (bootstrap script đề nghị cài khi thiếu)
- **Provider code intelligence**: Serena là provider mặc định. Gortex cũng được hỗ trợ khi chọn trong cấu hình provider. Installer có thể bootstrap Serena bằng `uv tool install`; nếu dependency tùy chọn không khả dụng, installer vẫn tiếp tục và đưa ra cảnh báo. Khi chọn Gortex, `oma install` và `oma update` ở project mode đăng ký project với Gortex daemon (`gortex track`) nếu project chưa được theo dõi, đồng thời thêm các thư mục do OMA tạo vào danh sách loại trừ của project đó thông qua Gortex CLI; không có gì được ghi vào cây thư mục của project. Bản thân Gortex phải được cài riêng.

Installer nhóm các tích hợp theo capability. Vendor hook gồm Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro và Qwen; OpenCode và pi dùng extension bridge; GitHub Copilot và Hermes nhận link skill; ZCode nhận workflow command. Bạn có thể chọn nhiều vendor, nhưng task đầu tiên chỉ cần host bạn định dùng.

---

## Phương pháp 0: skills CLI (nhanh nhất nếu chỉ cần skill)

Cài gói skill OMA vào các agent runtime được phát hiện:

```bash
npx skills add first-fluke/oh-my-agent
```

Đây là lối vào nhẹ nhất khi bạn muốn có skill mà không cần harness đầy đủ. Với workflow, rule, hook, gate và `oma agent spawn`, hãy dùng Phương pháp 1 hoặc 2 bên dưới.

## Phương pháp 1: cài một dòng (harness đầy đủ)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Hai bootstrap script hoạt động giống nhau:
1. Phát hiện platform của bạn (macOS, Linux hoặc Windows)
2. Kiểm tra bun và uv (cũng như serena nếu được chọn), rồi cài khi thiếu
3. Chạy installer tương tác để chọn preset và provider
4. Tạo `.agents/` với các skill và cấu hình bạn đã chọn
5. Thiết lập lớp tích hợp runtime (hook, symlink, setting cho vendor được phát hiện)
6. Cấu hình code-intelligence và memory MCP server

Bootstrap vẫn tiếp tục sau lỗi dependency tùy chọn và báo các lệnh cần chạy tiếp. Sau khi installer hoàn tất, hãy chạy `oma doctor`.

---

## Phương pháp 2: cài thủ công qua bunx

```bash
bunx oh-my-agent@latest
```

Lệnh này khởi chạy installer tương tác mà không bootstrap dependency. Bạn cần cài bun trước.

Installer yêu cầu bạn chọn preset skill. Các preset hiện tại được định nghĩa trong `cli/constants/skill-data.ts`:

### Preset

| Preset | Skill bao gồm |
|--------|----------------|
| **all** | Tất cả 33 gói skill hiện tại |
| **fullstack** | Architecture, brainstorming, design, frontend, backend, mobile, database, PM, QA, debugging, SCM, Terraform và developer workflow |
| **fullstack-web** | Triển khai web fullstack, architecture, design, PM, QA, debugging, SCM và developer workflow |
| **fullstack-mobile** | Triển khai fullstack tập trung vào mobile, architecture, design, PM, QA, debugging, SCM và developer workflow |
| **frontend** | Architecture, brainstorming, design, frontend, PM, QA, debugging và SCM |
| **backend** | Architecture, brainstorming, backend, database, PM, QA, debugging, SCM và developer workflow |
| **mobile** | Architecture, brainstorming, mobile, PM, QA, debugging và SCM |
| **devops** | Architecture, brainstorming, Terraform, developer workflow, observability, PM, QA, debugging và SCM |
| **research** | Scholar, market, PDF, HWP, academic writing, search, translation và SCM |
| **content** | Design, image, voice, academic writing, translation và SCM |

Preset là các bundle skill, không tạo một định nghĩa subagent cho mỗi skill. Preset `all` mở rộng từ registry skill đang chạy, nên danh sách có thể tăng cùng repository. Preset domain chỉ bao gồm skill cần cho trọng tâm đó.

Tài nguyên dùng chung (`_shared/`) luôn được cài đặt bất kể preset. Chúng gồm định tuyến cốt lõi, tải context, cấu trúc prompt, phát hiện vendor, protocol thực thi và protocol memory.

### Những gì được tạo

Sau khi cài đặt, project của bạn sẽ có:

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

Installer chỉ tạo thư mục vendor cho host bạn chọn. Nguồn hook vẫn nằm trong `.agents/hooks/core/`; tệp vendor được tạo là output tích hợp. Serena cũng có thể dùng thư mục legacy `.serena/memories/` trong project cũ.

---

## Phương pháp 3: cài global

Để dùng ở cấp CLI (dashboard, spawn agent, chẩn đoán), cài oh-my-agent global:

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

Cách này cài lệnh `oma` global, cho phép truy cập mọi lệnh CLI từ bất kỳ thư mục nào:

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

`oma` là viết tắt của `oh-my-agent`. Cả hai đều có thể dùng làm lệnh CLI.

---

## Cài đặt công cụ CLI có AI

Bạn cần cài ít nhất một công cụ CLI có AI. oh-my-agent hỗ trợ nhiều vendor và cho phép phối hợp chúng bằng cách dùng CLI khác nhau cho các agent khác nhau thông qua ánh xạ agent-CLI.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Xác thực tự động ở lần chạy đầu. Claude Code dùng `.claude/` cho hook và setting, còn skill được symlink từ `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Sau khi cài, chạy `codex login` để xác thực.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Sau khi cài, chạy `/auth` trong CLI để xác thực.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

`agy` xử lý xác thực ở lần chạy đầu. Binary là `agy`. Trong môi trường headless, thay vào đó đặt biến môi trường `ANTIGRAVITY_API_KEY`. `oma doctor` báo trạng thái auth qua `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Lệnh `oma install` tạo `.agents/oma-config.yaml`. Đây là tệp cấu hình trung tâm cho mọi hành vi của oh-my-agent:

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

### Tham chiếu field

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------------|
| `language` | string | Có | Mã ngôn ngữ phản hồi. Hỗ trợ en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Có | Key preset đang hoạt động. `auto` theo runtime hiện tại; key cố định gồm `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` và `mixed`. Key preset tùy chỉnh cũng hợp lệ. Xem [Per-Agent Models](../guide/per-agent-models.md). |
| `default_cli` | string | Không | CLI fallback cho `oma agent spawn` khi setting agent tường minh và preset đã chọn không resolve được vendor. |
| `free` | map | Không | Setting gateway FreeLLMAPI khi `model_preset: free`; giữ API key trong biến môi trường. |
| `providers` | map | Không | Provider capability: `code_intelligence` (`serena` hoặc `gortex`), `code_intelligence_guard` (`block` hoặc `off`), `docs` (`context7`), `web` (`native` hoặc `brave`) và `semantic_memory` (`agentmemory`, `honcho` hoặc `none`). |
| `date_format` | string | Không | Định dạng timestamp (`ISO`, `US`, `EU`). Mặc định: `ISO`. |
| `timezone` | string | Không | Định danh timezone (ví dụ `Asia/Seoul`). Giá trị bỏ trống dùng timezone của hệ thống host. |
| `auto_update_cli` | boolean | Không | Cho phép kiểm tra CLI định kỳ cập nhật trong background hay không. Mặc định: `true` (tắt bằng `false`). |
| `telemetry` | boolean | Không | Cho phép telemetry của vendor. Mặc định: `false`. |
| `agents` | map | Không | Override từng agent một phần (object-only `AgentSpec`). Merge nông lên default của preset. |
| `models` | map | Không | Slug model do người dùng định nghĩa, trước đây nằm trong `models.yaml`. |
| `custom_presets` | map | Không | Preset do người dùng định nghĩa. Hỗ trợ `extends:` để kế thừa một phần từ preset dựng sẵn. |
| `mcp.devtools_browsers` | list | Không | Browser cho DevTools MCP: `aside`, `chrome` hoặc `firefox`. Bỏ trống để giữ setup hiện có; `[]` tắt rõ ràng browser server. |
| `serena.mode` | string | Không | `bridge` chia sẻ Serena server theo project và là mặc định; `stdio` chọn một process cho mỗi session. |
| `serena.auto_update` | boolean | Không | `oma update` có nâng cấp Serena hay không. Mặc định: `true`. |

> **Định dạng cấu hình:** `.agents/oma-config.cue` hợp lệ được đánh giá như cấu hình dùng chung. Nếu đánh giá CUE dùng chung thất bại, loader có thể fallback về `.agents/oma-config.yaml`; overlay cục bộ (`oma-config.local.cue` hoặc `.yaml`) là tùy chọn và intent cục bộ không hợp lệ sẽ làm thất bại. `OMA_MODEL_PRESET` ghi đè giá trị trong file cho process hiện tại.

### Resolve vendor

Khi spawn agent, CLI resolve setting theo thứ tự: `agents.<id>`, `model_preset` đã chọn, fallback orchestrator của preset, rồi `default_cli`. Với `model_preset: auto`, cấu hình native của runtime hiện tại cung cấp model; runtime không biết sẽ fallback về `default_cli`. Xem [Per-Agent Models](../guide/per-agent-models.md) để biết ma trận đầy đủ.

---

## Xác minh: `oma doctor`

Sau khi cài đặt và setup, hãy xác minh mọi thứ hoạt động:

```bash
oma doctor
```

Lệnh này kiểm tra:
- CLI host đã chọn được cài đặt và có thể truy cập; tool tùy chọn được báo riêng
- Entry MCP server đã cấu hình hợp lệ (ví dụ Serena, Gortex, Context7 hoặc DevTools)
- Tệp skill tồn tại và frontmatter SKILL.md hợp lệ
- Symlink và hook script trỏ tới target hợp lệ
- Hook được cấu hình đúng trong tệp setting của vendor
- Provider code-intelligence và memory đã chọn có thể truy cập (với Gortex, còn kiểm tra project hiện tại có nằm trong tập được daemon theo dõi hay không)
- `oma-config.cue` / `oma-config.yaml` hợp lệ với các field bắt buộc

Nếu có vấn đề, `oma doctor` chỉ ra mục thiếu hoặc không hợp lệ và tách blocker của task đầu tiên khỏi cảnh báo tích hợp tùy chọn.

Để kiểm tra model và CLI đã resolve cho từng agent, chạy:

```bash
oma doctor --profile
```

Xem [Per-Agent Models](../guide/per-agent-models.md) để biết ma trận đầy đủ và chi tiết migration.

---

## Cập nhật

### Cập nhật CLI

```bash
oma update
```

Lệnh này cập nhật CLI oh-my-agent global lên phiên bản mới nhất.

### Cập nhật skill của project

Skill và workflow trong project có thể cập nhật qua GitHub Action (`action/`) để tự động hóa, hoặc bằng cách chạy lại installer:

```bash
bunx oh-my-agent@latest
```

Installer phát hiện cài đặt hiện có và đề nghị cập nhật, đồng thời giữ lại `oma-config.yaml` và mọi cấu hình tùy chỉnh.

---

## Tiếp theo

Mở project bằng IDE hoặc CLI có AI đã chọn và bắt đầu dùng oh-my-agent. Định tuyến skill phụ thuộc vào host; hook đã bật có thể phát hiện workflow. Hãy thử:

```
"Build a login form with email validation using Tailwind CSS"
```

Hoặc dùng lệnh workflow:

```
/plan authentication feature with JWT and refresh tokens
```

Xem [Usage Guide](/docs/guide/usage) để biết ví dụ chi tiết, hoặc tìm hiểu [Agents](/docs/core-concepts/agents) để biết mỗi specialist làm gì.
