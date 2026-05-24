---
title: Cài đặt
description: Hướng dẫn cài đặt đầy đủ cho oh-my-agent — ba phương pháp cài đặt, tất cả sáu preset với danh sách skill, yêu cầu công cụ CLI cho năm vendor, cấu hình sau cài đặt, các trường oma-config.yaml, và xác minh với oma doctor.
---

# Cài đặt

## Yêu cầu trước

- **IDE hoặc CLI hỗ trợ AI** — ít nhất một trong: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity CLI (`agy`), Antigravity IDE, Cursor, hoặc OpenCode
- **bun** — Runtime JavaScript và trình quản lý gói (tự động cài đặt bởi script cài đặt nếu thiếu)
- **uv** — Trình quản lý gói Python cho Serena MCP (tự động cài đặt nếu thiếu)

---

## Phương pháp 1: cài đặt một dòng lệnh (khuyến nghị)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Cả hai script bootstrap hoạt động giống nhau:
1. Phát hiện nền tảng của bạn (macOS, Linux hoặc Windows)
2. Kiểm tra bun, uv và serena, cài đặt nếu thiếu
3. Chạy trình cài đặt tương tác với lựa chọn preset
4. Tạo `.agents/` với các skill bạn đã chọn
5. Thiết lập tầng tích hợp `.claude/` (hook, symlink, setting)
6. Cấu hình Serena MCP nếu được phát hiện

Thời gian cài đặt thông thường: dưới 60 giây.

---

## Phương pháp 2: cài đặt thủ công qua bunx

```bash
bunx oh-my-agent@latest
```

Lệnh này khởi chạy trình cài đặt tương tác mà không cần bootstrap phụ thuộc. Bạn cần đã cài bun sẵn.

Trình cài đặt yêu cầu bạn chọn preset, quyết định skill nào được cài:

### Preset

| Preset | Skill bao gồm |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Mọi preset đều bao gồm oma-pm (lập kế hoạch), oma-qa (đánh giá), oma-debug (sửa lỗi), oma-brainstorm (khám phá ý tưởng) và oma-scm (git) làm agent cơ bản. Preset theo lĩnh vực bổ sung thêm các agent triển khai liên quan.

Tài nguyên dùng chung (`_shared/`) luôn được cài đặt bất kể preset. Bao gồm định tuyến cốt lõi, tải ngữ cảnh, cấu trúc prompt, phát hiện vendor, quy trình thực thi và giao thức bộ nhớ.

### Những gì được tạo

Sau khi cài đặt, dự án của bạn sẽ chứa:

```
.agents/
├── config/
│   └── oma-config.yaml      # Tùy chọn của bạn
├── skills/
│   ├── _shared/                    # Tài nguyên dùng chung (luôn được cài)
│   │   ├── core/                   # skill-routing, context-loading, v.v.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, v.v.
│   ├── oma-frontend/               # Theo preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Các skill đã chọn khác
├── workflows/                      # Tất cả 16 định nghĩa workflow
├── agents/                         # Định nghĩa subagent
├── mcp.json                        # Cấu hình MCP server
├── results/plan-{sessionId}.json                       # Trống (được điền bởi /plan)
├── state/                          # Trống (dùng bởi workflow liên tục)
└── results/                        # Trống (được điền bởi các lần chạy agent)

.claude/
├── settings.json                   # Hook và quyền
├── hooks/
│   ├── triggers.json               # Ánh xạ từ khóa sang workflow (11 ngôn ngữ)
│   ├── keyword-detector.ts         # Logic phát hiện tự động
│   ├── persistent-mode.ts          # Áp dụng workflow liên tục
│   └── hud.ts                      # Chỉ báo thanh trạng thái [OMA]
├── skills/                         # Symlink → .agents/skills/
└── agents/                         # Định nghĩa subagent cho IDE

.serena/
└── memories/                       # Trạng thái runtime (được điền trong phiên làm việc)
```

---

## Phương pháp 3: cài đặt toàn cục

Để sử dụng ở mức CLI (dashboard, spawn agent, chẩn đoán), cài đặt oh-my-agent toàn cục:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun toàn cục

```bash
bun install --global oh-my-agent
# hoặc
npm install --global oh-my-agent
```

Lệnh này cài đặt lệnh `oma` toàn cục, cho bạn truy cập tất cả lệnh CLI từ bất kỳ thư mục nào:

```bash
oma doctor              # Kiểm tra sức khỏe
oma dashboard           # Giám sát terminal
oma dashboard:web       # Dashboard web tại http://localhost:9847
oma agent:spawn         # Spawn agent từ terminal
oma agent:parallel      # Thực thi agent song song
oma agent:status        # Kiểm tra trạng thái agent
oma agent:review        # Đánh giá code qua CLI bên ngoài (codex/claude/gemini/qwen)
oma stats               # Thống kê phiên làm việc
oma retro               # Hồi cứu kỹ thuật (commit, hotspot, xu hướng)
oma recap               # Tổng kết lịch sử hội thoại trên các công cụ AI
oma cleanup             # Dọn dẹp artifact phiên
oma link                # Tái tạo file vendor-native từ SSOT `.agents/`
oma update              # Cập nhật oh-my-agent
oma verify              # Xác minh đầu ra agent (build/test/scope/secret)
oma visualize           # Trực quan hóa phụ thuộc (alias: `oma viz`)
oma describe            # Nội quan các lệnh CLI dưới dạng JSON
oma bridge              # Bridge MCP stdio ↔ Streamable HTTP
oma memory:init         # Khởi tạo schema bộ nhớ Serena
oma auth:status         # Kiểm tra trạng thái xác thực CLI (gh/antigravity/claude/codex/qwen)
oma search              # Primitive tìm kiếm cơ học (alias: `oma s`)
oma image               # Sinh ảnh AI đa vendor (alias: `oma img`)
oma export              # Xuất skill cho IDE bên ngoài (ví dụ: cursor)
oma star                # Star repository
```

`oma` là viết tắt của `oh-my-agent`. Cả hai đều hoạt động như lệnh CLI.

---

## Cài đặt công cụ AI CLI

Bạn cần ít nhất một công cụ AI CLI được cài đặt. oh-my-agent hỗ trợ năm vendor, và bạn có thể kết hợp — sử dụng CLI khác nhau cho các agent khác nhau thông qua ánh xạ agent-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# hoặc
npm install --global @google/gemini-cli
```

Xác thực tự động khi chạy lần đầu. Gemini CLI đọc skill từ `.agents/skills/` theo mặc định.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# hoặc
npm install --global @anthropic-ai/claude-code
```

Xác thực tự động khi chạy lần đầu. Claude Code sử dụng `.claude/` cho hook và setting, với skill được symlink từ `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# hoặc
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

Xác thực được xử lý bởi `agy` khi chạy lần đầu. Binary là `agy`. Trong môi trường headless, đặt biến môi trường `ANTIGRAVITY_API_KEY` thay thế. `oma doctor` báo cáo trạng thái xác thực qua `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Lệnh `oma install` tạo `.agents/oma-config.yaml`. Đây là file cấu hình trung tâm cho toàn bộ hành vi oh-my-agent:

```yaml
# Bắt buộc
language: en
model_preset: antigravity   # built-in: antigravity, claude, codex, qwen, cursor, mixed

# Tùy chọn — tùy chọn ngày/giờ
date_format: ISO
timezone: UTC

# Tùy chọn — tự động cập nhật CLI ở chế độ nền
auto_update_cli: true

# Tùy chọn — ghi đè từng phần theo agent (chỉ object, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Tùy chọn — slug model do người dùng định nghĩa
# models:
#   my-model: { cli: gemini, cli_model: gemini-3-flash, supports: { thinking: true } }

# Tùy chọn — preset do người dùng định nghĩa
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Tham chiếu trường

| Trường | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------------|
| `language` | string | Có | Mã ngôn ngữ phản hồi. Hỗ trợ en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Có | Khóa preset đang dùng. Là một trong các khóa built-in (`antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`) hoặc khóa `custom_presets`. Xem [Per-Agent Models](../guide/per-agent-models.md). |
| `date_format` | string | Không | Định dạng timestamp (`ISO`, `US`, `EU`). Mặc định: `ISO`. |
| `timezone` | string | Không | Định danh múi giờ (ví dụ: `Asia/Seoul`). Mặc định: `UTC`. |
| `agents` | map | Không | Ghi đè từng phần theo agent (chỉ object `AgentSpec`). Shallow-merge trên giá trị mặc định của preset. |
| `models` | map | Không | Slug model do người dùng định nghĩa, trước đây ở trong `models.yaml`. |
| `custom_presets` | map | Không | Preset do người dùng định nghĩa. Hỗ trợ `extends:` để kế thừa từng phần từ preset built-in. |

### Ưu tiên phân giải vendor

Khi spawn agent, vendor CLI được phân giải từ `model_preset` đang dùng (và bất kỳ ghi đè `agents:` nào). Xem [Per-Agent Models](../guide/per-agent-models.md) để biết đầy đủ chi tiết.

---

## Xác minh: `oma doctor`

Sau khi cài đặt và thiết lập, xác minh mọi thứ hoạt động:

```bash
oma doctor
```

Lệnh này kiểm tra:
- Tất cả công cụ CLI bắt buộc đã được cài đặt và có thể truy cập
- Cấu hình MCP server hợp lệ
- File skill tồn tại với frontmatter SKILL.md hợp lệ
- Symlink trong `.claude/skills/` trỏ đến đích hợp lệ
- Hook được cấu hình đúng trong `.claude/settings.json`
- Nhà cung cấp bộ nhớ có thể kết nối (Serena MCP)
- `oma-config.yaml` là YAML hợp lệ với các trường bắt buộc

Nếu có vấn đề, `oma doctor` cho bạn biết chính xác cần sửa gì, kèm lệnh sao chép-dán.

Để xem model và CLI đã phân giải cho từng agent, chạy:

```bash
oma doctor --profile
```

Xem [Per-Agent Models](../guide/per-agent-models.md) để biết toàn bộ ma trận và chi tiết di chuyển.

---

## Cập nhật

### Cập nhật CLI

```bash
oma update
```

Lệnh này cập nhật CLI oh-my-agent toàn cục lên phiên bản mới nhất.

### Cập nhật skill dự án

Skill và workflow trong dự án có thể được cập nhật qua GitHub Action (`action/`) cho cập nhật tự động, hoặc thủ công bằng cách chạy lại trình cài đặt:

```bash
bunx oh-my-agent@latest
```

Trình cài đặt phát hiện cài đặt hiện có và đề xuất cập nhật trong khi bảo toàn `oma-config.yaml` và mọi cấu hình tùy chỉnh.

---

## Tiếp theo

Mở dự án trong AI IDE và bắt đầu sử dụng oh-my-agent. Skill được tự động phát hiện. Thử:

```
"Build a login form with email validation using Tailwind CSS"
```

Hoặc sử dụng lệnh workflow:

```
/plan authentication feature with JWT and refresh tokens
```

Xem [Hướng dẫn sử dụng](/docs/guide/usage) để biết ví dụ chi tiết, hoặc tìm hiểu về [Agent](/docs/core-concepts/agents) để hiểu mỗi chuyên gia làm gì.
