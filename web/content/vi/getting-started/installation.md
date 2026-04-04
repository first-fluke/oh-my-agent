---
title: Cài đặt
description: Hướng dẫn cài đặt đầy đủ cho oh-my-agent — ba phương pháp cài đặt, tất cả sáu preset với danh sách skill, yêu cầu công cụ CLI cho bốn vendor, cấu hình sau cài đặt, các trường user-preferences.yaml, và xác minh với oma doctor.
---

# Cài đặt

## Yêu cầu trước

- **IDE hoặc CLI hỗ trợ AI** — ít nhất một trong: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor, hoặc OpenCode
- **bun** — Runtime JavaScript và trình quản lý gói (tự động cài đặt bởi script cài đặt nếu thiếu)
- **uv** — Trình quản lý gói Python cho Serena MCP (tự động cài đặt nếu thiếu)

---

## Phương pháp 1: Cài đặt một dòng lệnh (Khuyến nghị)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Script này:
1. Phát hiện nền tảng của bạn (macOS, Linux)
2. Kiểm tra bun và uv, cài đặt nếu thiếu
3. Chạy trình cài đặt tương tác với lựa chọn preset
4. Tạo `.agents/` với các skill bạn đã chọn
5. Thiết lập tầng tích hợp `.claude/` (hook, symlink, setting)
6. Cấu hình Serena MCP nếu được phát hiện

Thời gian cài đặt thông thường: dưới 60 giây.

---

## Phương pháp 2: Cài đặt thủ công qua bunx

```bash
bunx oh-my-agent@latest
```

Lệnh này khởi chạy trình cài đặt tương tác mà không cần bootstrap phụ thuộc. Bạn cần đã cài bun sẵn.

Trình cài đặt yêu cầu bạn chọn preset, quyết định skill nào được cài:

### Preset

| Preset | Skill bao gồm |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-commit, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |

Mọi preset đều bao gồm oma-pm (lập kế hoạch), oma-qa (đánh giá), oma-debug (sửa lỗi), oma-brainstorm (khám phá ý tưởng) và oma-commit (git) làm agent cơ bản. Preset theo lĩnh vực bổ sung thêm các agent triển khai liên quan.

Tài nguyên dùng chung (`_shared/`) luôn được cài đặt bất kể preset. Bao gồm định tuyến cốt lõi, tải ngữ cảnh, cấu trúc prompt, phát hiện vendor, quy trình thực thi và giao thức bộ nhớ.

### Những gì được tạo

Sau khi cài đặt, dự án của bạn sẽ chứa:

```
.agents/
├── config/
│   └── user-preferences.yaml      # Tùy chọn của bạn
├── skills/
│   ├── _shared/                    # Tài nguyên dùng chung (luôn được cài)
│   │   ├── core/                   # skill-routing, context-loading, v.v.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, v.v.
│   ├── oma-frontend/               # Theo preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Các skill đã chọn khác
├── workflows/                      # Tất cả 14 định nghĩa workflow
├── agents/                         # Định nghĩa subagent
├── mcp.json                        # Cấu hình MCP server
├── plan.json                       # Trống (được điền bởi /plan)
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

## Phương pháp 3: Cài đặt toàn cục

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
oma stats               # Thống kê phiên làm việc
oma retro               # Phân tích hồi cứu
oma cleanup             # Dọn dẹp artifact phiên
oma update              # Cập nhật oh-my-agent
oma verify              # Xác minh đầu ra agent
oma visualize           # Trực quan hóa phụ thuộc
oma describe            # Mô tả cấu trúc dự án
oma bridge              # Bridge SSE-to-stdio cho Antigravity
oma memory:init         # Khởi tạo nhà cung cấp bộ nhớ
oma auth:status         # Kiểm tra trạng thái xác thực CLI
oma usage:anti          # Phát hiện anti-pattern sử dụng
oma star                # Star repository
```

Alias toàn cục `oma` tương đương với `oh-my-ag` (tên lệnh đầy đủ).

---

## Cài đặt công cụ AI CLI

Bạn cần ít nhất một công cụ AI CLI được cài đặt. oh-my-agent hỗ trợ bốn vendor, và bạn có thể kết hợp — sử dụng CLI khác nhau cho các agent khác nhau thông qua ánh xạ agent-CLI.

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

---

## user-preferences.yaml

Lệnh `oma install` tạo `.agents/config/user-preferences.yaml`. Đây là file cấu hình trung tâm cho toàn bộ hành vi oh-my-agent:

```yaml
# Ngôn ngữ phản hồi cho tất cả agent và workflow
language: en

# Định dạng ngày dùng trong báo cáo và file bộ nhớ
date_format: "YYYY-MM-DD"

# Múi giờ cho timestamp
timezone: "UTC"

# Công cụ CLI mặc định cho spawn agent
# Tùy chọn: gemini, claude, codex, qwen
default_cli: gemini

# Ánh xạ CLI theo từng agent (ghi đè default_cli)
agent_cli_mapping:
  frontend: claude       # Suy luận UI phức tạp
  backend: gemini        # Tạo API nhanh
  mobile: gemini
  db: gemini
  pm: gemini             # Phân tách nhanh
  qa: claude             # Đánh giá bảo mật kỹ lưỡng
  debug: claude          # Phân tích nguyên nhân gốc sâu
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Tham chiếu trường

| Trường | Kiểu | Mặc định | Mô tả |
|-------|------|---------|-------------|
| `language` | string | `en` | Mã ngôn ngữ phản hồi. Tất cả đầu ra agent, thông báo workflow và báo cáo sử dụng ngôn ngữ này. Hỗ trợ 11 ngôn ngữ (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Chuỗi định dạng ngày cho timestamp trong kế hoạch, file bộ nhớ và báo cáo. |
| `timezone` | string | `UTC` | Múi giờ cho tất cả timestamp. Sử dụng định danh múi giờ chuẩn (ví dụ: `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | CLI dự phòng khi không có ánh xạ agent cụ thể. Được dùng làm cấp 3 trong ưu tiên phân giải vendor. |
| `agent_cli_mapping` | map | (trống) | Ánh xạ ID agent đến vendor CLI cụ thể. Ưu tiên hơn `default_cli`. |

### Ưu tiên phân giải vendor

Khi spawn agent, vendor CLI được xác định theo thứ tự ưu tiên (cao nhất trước):

1. Flag `--model` truyền vào `oma agent:spawn`
2. Mục `agent_cli_mapping` cho agent cụ thể đó trong `user-preferences.yaml`
3. Cài đặt `default_cli` trong `user-preferences.yaml`
4. `active_vendor` trong `cli-config.yaml` (dự phòng cũ)
5. `gemini` (dự phòng cứng)

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
- `user-preferences.yaml` là YAML hợp lệ với các trường bắt buộc

Nếu có vấn đề, `oma doctor` cho bạn biết chính xác cần sửa gì, kèm lệnh sao chép-dán.

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

Trình cài đặt phát hiện cài đặt hiện có và đề xuất cập nhật trong khi bảo toàn `user-preferences.yaml` và mọi cấu hình tùy chỉnh.

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

Xem [Hướng dẫn sử dụng](/guide/usage) để biết ví dụ chi tiết, hoặc tìm hiểu về [Agent](/core-concepts/agents) để hiểu mỗi chuyên gia làm gì.
