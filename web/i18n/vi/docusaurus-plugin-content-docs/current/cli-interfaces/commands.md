---
title: "Lệnh CLI"
description: Tham chiếu đầy đủ cho mọi lệnh CLI oh-my-agent — cú pháp, tùy chọn, ví dụ, được tổ chức theo danh mục.
---

# Lệnh CLI

Sau khi cài đặt toàn cục (`bun install --global oh-my-agent`), sử dụng `oma` hoặc `oh-my-agent`. Để sử dụng một lần mà không cần cài đặt, chạy `npx oh-my-agent`.

Biến môi trường `OH_MY_AG_OUTPUT_FORMAT` có thể được đặt thành `json` để buộc đầu ra machine-readable trên các lệnh hỗ trợ. Tương đương với việc truyền `--json` cho mỗi lệnh.

---

## Thiết lập và cài đặt

### oma (install)

Lệnh mặc định không có đối số sẽ khởi chạy trình cài đặt tương tác.

```
oma
```

**Hoạt động:**
1. Kiểm tra thư mục `.agent/` cũ và di chuyển sang `.agents/` nếu tìm thấy.
2. Phát hiện và đề xuất xóa công cụ cạnh tranh.
3. Yêu cầu chọn loại dự án (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Nếu chọn backend, yêu cầu chọn biến thể ngôn ngữ (Python, Node.js, Rust, Other).
5. Hỏi về symlink GitHub Copilot.
6. Tải tarball mới nhất từ registry.
7. Cài đặt tài nguyên dùng chung, workflow, config và skill đã chọn.
8. Cài đặt adaptation vendor cho cả 4 vendor (Claude, Codex, Gemini, Qwen).
9. Áp dụng setting Claude Code khuyến nghị (`~/.claude/settings.json`) khi phát hiện Claude Code.
10. Tạo symlink CLI.
11. Đề xuất bật `git rerere`.
12. Đề xuất cấu hình MCP cho Antigravity IDE và Gemini CLI.
13. Yêu cầu star GitHub nếu `gh` đã xác thực.

**Ví dụ:**
```bash
cd /path/to/my-project
oma
# Làm theo các prompt tương tác
```

### doctor

Kiểm tra sức khỏe cho cài đặt CLI, cấu hình MCP và trạng thái skill.

```
oma doctor [--json] [--output <format>]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |

**Kiểm tra:**
- Cài đặt CLI: gemini, claude, codex, qwen (phiên bản và đường dẫn).
- Trạng thái xác thực cho mỗi CLI.
- Cấu hình MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skill đã cài: skill nào có mặt và trạng thái.
- Thư mục bộ nhớ Serena: sự tồn tại và số lượng file `.serena/memories/`.
- Workflow toàn cục: kiểm tra trạng thái cài đặt `~/.gemini/antigravity/global_workflows/`.
- Git rerere: cấu hình `rerere.enabled` toàn cục.
- Setting Claude Code khuyến nghị: kiểm tra `~/.claude/settings.json` cho cấu hình tối ưu:
  - `cleanupPeriodDays >= 180` (bảo toàn lịch sử hội thoại)
  - `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS >= 100000`
  - `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE >= 80`
  - `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` đặt thành `"1"`
  - Chuỗi attribution cho commit và PR
- CLAUDE.md cấp người dùng: kiểm tra `~/.claude/CLAUDE.md` chứa khối tích hợp OMA (`<!-- OMA:START`).

**Tự sửa chữa:** Nếu phát hiện skill hoặc setting thiếu, `doctor` đề xuất cài đặt tương tác. Với setting Claude Code, có thể tự động áp dụng giá trị khuyến nghị.

**Ví dụ:**
```bash
# Đầu ra text tương tác
oma doctor

# Đầu ra JSON cho pipeline CI
oma doctor --json

# Pipe đến jq cho kiểm tra cụ thể
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

Cập nhật skill lên phiên bản mới nhất từ registry.

```
oma update [-f | --force] [--ci]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `-f, --force` | Ghi đè file config tùy chỉnh (`oma-config.yaml`, `mcp.json`, thư mục `stack/`) |
| `--ci` | Chạy ở chế độ CI không tương tác (bỏ qua prompt, đầu ra text thuần) |

**Hoạt động:**
1. Lấy `prompt-manifest.json` từ registry để kiểm tra phiên bản mới nhất.
2. So sánh với phiên bản cục bộ trong `.agents/skills/_version.json`.
3. Nếu đã cập nhật, thoát.
4. Tải và giải nén tarball mới nhất.
5. Bảo toàn file tùy chỉnh (trừ khi `--force`).
6. Sao chép file mới vào `.agents/`.
7. Khôi phục file đã bảo toàn.
8. Cập nhật adaptation vendor và làm mới symlink.

**Ví dụ:**
```bash
# Cập nhật chuẩn (bảo toàn config)
oma update

# Cập nhật bắt buộc (đặt lại tất cả config về mặc định)
oma update --force

# Chế độ CI (không prompt, không spinner)
oma update --ci

# Chế độ CI với force
oma update --ci --force
```

---

## Giám sát và số liệu

### dashboard

Khởi động dashboard terminal cho giám sát agent thời gian thực.

```
oma dashboard
```

Không có tùy chọn. Theo dõi `.serena/memories/` trong thư mục hiện tại. Hiển thị giao diện box-drawing với trạng thái phiên, bảng agent và luồng hoạt động. Cập nhật theo mỗi thay đổi file. Nhấn `Ctrl+C` để thoát.

Thư mục memories có thể ghi đè bằng biến môi trường `MEMORIES_DIR`.

**Ví dụ:**
```bash
# Sử dụng chuẩn
oma dashboard

# Thư mục memories tùy chỉnh
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

Khởi động dashboard web.

```
oma dashboard:web
```

Khởi động HTTP server tại `http://localhost:9847` với kết nối WebSocket cho cập nhật trực tiếp. Mở URL trong trình duyệt để xem dashboard.

**Biến môi trường:**

| Biến | Mặc định | Mô tả |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Cổng cho HTTP/WebSocket server |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Đường dẫn đến thư mục memories |

**Ví dụ:**
```bash
# Sử dụng chuẩn
oma dashboard:web

# Cổng tùy chỉnh
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

Xem số liệu năng suất.

```
oma stats [--json] [--output <format>] [--reset]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |
| `--reset` | Đặt lại tất cả dữ liệu số liệu |

**Số liệu theo dõi:**
- Số phiên
- Skill đã dùng (kèm tần suất)
- Task đã hoàn thành
- Tổng thời gian phiên
- File thay đổi, dòng thêm, dòng xóa
- Timestamp cập nhật cuối

Số liệu được lưu trong `.serena/metrics.json`. Dữ liệu được thu thập từ thống kê git và file bộ nhớ.

**Ví dụ:**
```bash
# Xem số liệu hiện tại
oma stats

# Đầu ra JSON
oma stats --json

# Đặt lại tất cả số liệu
oma stats --reset
```

### retro

Hồi cứu kỹ thuật với số liệu và xu hướng.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Đối số:**

| Đối số | Mô tả | Mặc định |
|:---------|:-----------|:--------|
| `window` | Khoảng thời gian phân tích (ví dụ: `7d`, `2w`, `1m`) | 7 ngày gần nhất |

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |
| `--interactive` | Chế độ tương tác với nhập liệu thủ công |
| `--compare` | So sánh khoảng hiện tại với khoảng trước đó cùng độ dài |

**Hiển thị:**
- Tóm tắt dạng tweet (số liệu một dòng)
- Bảng tóm tắt (commit, file thay đổi, dòng thêm/xóa, contributor)
- Xu hướng so với retro trước (nếu có snapshot trước)
- Bảng xếp hạng contributor
- Phân bố thời gian commit (histogram theo giờ)
- Phiên làm việc
- Phân tích loại commit (feat, fix, chore, v.v.)
- Hotspot (file thay đổi nhiều nhất)

**Ví dụ:**
```bash
# 7 ngày gần nhất (mặc định)
oma retro

# 30 ngày gần nhất
oma retro 30d

# 2 tuần gần nhất
oma retro 2w

# So sánh với giai đoạn trước
oma retro 7d --compare

# Chế độ tương tác
oma retro --interactive

# JSON cho tự động hóa
oma retro 7d --json
```

---

## Quản lý agent

### agent:spawn

Spawn một tiến trình subagent.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `agent-id` | Có | Loại agent. Một trong: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Có | Mô tả task. Có thể là text trực tiếp hoặc đường dẫn đến file. |
| `session-id` | Có | Định danh phiên (định dạng: `session-YYYYMMDD-HHMMSS`) |

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `-m, --model <vendor>` | Ghi đè vendor CLI: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Thư mục làm việc cho agent. Tự phát hiện từ config monorepo nếu bỏ qua. |

**Thứ tự phân giải vendor:** Flag `--model` > `agent_cli_mapping` trong oma-config.yaml > `default_cli` > `active_vendor` trong cli-config.yaml > `gemini`.

**Phân giải prompt:** Nếu đối số prompt là đường dẫn đến file tồn tại, nội dung file được dùng làm prompt. Ngược lại, đối số được dùng làm text trực tiếp. Quy trình thực thi đặc thù vendor được tự động thêm vào.

**Ví dụ:**
```bash
# Prompt trực tiếp, tự phát hiện workspace
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt từ file, workspace tường minh
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Ghi đè vendor sang Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Agent mobile với workspace tự phát hiện
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

Kiểm tra trạng thái của một hoặc nhiều subagent.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `session-id` | Có | ID phiên cần kiểm tra |
| `agent-ids` | Không | Danh sách ID agent cách nhau bằng dấu cách. Nếu bỏ qua, không có đầu ra. |

**Tùy chọn:**

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Đường dẫn gốc cho kiểm tra bộ nhớ | Thư mục hiện tại |

**Giá trị trạng thái:**
- `completed` — File kết quả tồn tại (với header trạng thái tùy chọn).
- `running` — File PID tồn tại và tiến trình đang sống.
- `crashed` — File PID tồn tại nhưng tiến trình đã chết, hoặc không tìm thấy file PID/kết quả.

**Định dạng đầu ra:** Mỗi dòng một agent: `{agent-id}:{status}`

**Ví dụ:**
```bash
# Kiểm tra agent cụ thể
oma agent:status session-20260324-143000 backend frontend

# Đầu ra:
# backend:running
# frontend:completed

# Kiểm tra với root tùy chỉnh
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Chạy nhiều subagent song song.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `tasks` | Có | Đường dẫn file YAML task, hoặc (với `--inline`) đặc tả task trực tiếp |

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `-m, --model <vendor>` | Ghi đè vendor CLI cho tất cả agent |
| `-i, --inline` | Chế độ inline: chỉ định task dạng đối số `agent:task[:workspace]` |
| `--no-wait` | Chế độ nền — khởi động agent và trả về ngay |

**Định dạng file YAML task:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # tùy chọn, tự phát hiện nếu bỏ qua
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**Định dạng task inline:** `agent:task` hoặc `agent:task:workspace` (workspace phải bắt đầu bằng `./` hoặc `/`).

**Thư mục kết quả:** `.agents/results/parallel-{timestamp}/` chứa file log cho mỗi agent.

**Ví dụ:**
```bash
# Từ file YAML
oma agent:parallel tasks.yaml

# Chế độ inline
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Chế độ nền (không đợi)
oma agent:parallel tasks.yaml --no-wait

# Ghi đè vendor cho tất cả agent
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Chạy đánh giá mã sử dụng AI CLI bên ngoài (codex, claude, gemini, hoặc qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `-m, --model <vendor>` | Vendor CLI sử dụng: `codex`, `claude`, `gemini`, `qwen`. Mặc định là vendor đã phân giải từ config. |
| `-p, --prompt <prompt>` | Prompt đánh giá tùy chỉnh. Nếu bỏ qua, prompt đánh giá mã mặc định được dùng. |
| `-w, --workspace <path>` | Đường dẫn cần đánh giá. Mặc định là thư mục làm việc hiện tại. |
| `--no-uncommitted` | Bỏ qua đánh giá thay đổi chưa commit. Khi đặt, chỉ đánh giá thay đổi đã commit trong phiên. |

**Hoạt động:**
- Tự động phát hiện ID phiên hiện tại từ môi trường hoặc hoạt động git gần đây.
- Với `codex`: sử dụng lệnh con native `codex review`.
- Với `claude`, `gemini`, `qwen`: xây dựng yêu cầu đánh giá dạng prompt và gọi CLI với prompt đánh giá.
- Mặc định, đánh giá thay đổi chưa commit trong thư mục làm việc.
- Với `--no-uncommitted`, giới hạn đánh giá ở các thay đổi đã commit trong phiên hiện tại.

**Ví dụ:**
```bash
# Đánh giá thay đổi chưa commit với vendor mặc định
oma agent:review

# Đánh giá với codex (dùng lệnh codex review native)
oma agent:review -m codex

# Đánh giá với claude sử dụng prompt tùy chỉnh
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Đánh giá đường dẫn cụ thể
oma agent:review -w ./apps/api

# Chỉ đánh giá thay đổi đã commit (bỏ qua working tree)
oma agent:review --no-uncommitted

# Đánh giá thay đổi đã commit trong workspace cụ thể với gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Quản lý bộ nhớ

### memory:init

Khởi tạo schema bộ nhớ Serena.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |
| `--force` | Ghi đè file schema trống hoặc hiện có |

**Hoạt động:** Tạo cấu trúc thư mục `.serena/memories/` với file schema ban đầu mà công cụ MCP memory sử dụng để đọc và ghi trạng thái agent.

**Ví dụ:**
```bash
# Khởi tạo bộ nhớ
oma memory:init

# Ghi đè bắt buộc schema hiện có
oma memory:init --force
```

---

## Tích hợp và tiện ích

### auth:status

Kiểm tra trạng thái xác thực của tất cả CLI được hỗ trợ.

```
oma auth:status [--json] [--output <format>]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |

**Kiểm tra:** Gemini (API key), Claude (API key hoặc OAuth), Codex (API key), Qwen (API key).

**Ví dụ:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

Bridge MCP stdio sang Streamable HTTP transport.

```
oma bridge [url]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `url` | Không | URL endpoint Streamable HTTP (ví dụ: `http://localhost:12341/mcp`) |

**Hoạt động:** Hoạt động như bridge giao thức giữa MCP stdio transport (dùng bởi Antigravity IDE) và Streamable HTTP transport (dùng bởi Serena MCP server). Cần thiết vì Antigravity IDE không hỗ trợ trực tiếp HTTP/SSE transport.

**Kiến trúc:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Ví dụ:**
```bash
# Bridge đến Serena server cục bộ
oma bridge http://localhost:12341/mcp
```

### verify

Xác minh đầu ra subagent so với tiêu chí mong đợi.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `agent-type` | Có | Một trong: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Tùy chọn:**

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Đường dẫn workspace cần xác minh | Thư mục hiện tại |
| `--json` | Xuất dạng JSON | |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) | |

**Hoạt động:** Chạy script xác minh cho loại agent đã chỉ định, kiểm tra thành công build, kết quả test và tuân thủ phạm vi.

**Kiểm tra chung (tất cả loại agent):**
- **Kiểm tra phạm vi**: Đọc phạm vi task `.agents/results/plan-{sessionId}.json`. So sánh file thay đổi `git diff` với mẫu phạm vi đã định nghĩa. Thất bại nếu file bị sửa ngoài phạm vi đã gán cho agent.
- **Charter Preflight**: Xác minh `result-{agent}.md` chứa khối `CHARTER_CHECK:` đã điền đúng mà không có placeholder chưa điền.
- **Secret cứng**: Quét file `.py`, `.ts`, `.tsx`, `.js`, `.dart` tìm mẫu như `password = "..."`, `api_key = "..."` (loại trừ file test/ví dụ).
- **Comment TODO/FIXME**: Đếm comment `TODO`, `FIXME`, `HACK`, `XXX` (cảnh báo nếu tìm thấy).

**Kiểm tra đặc thù agent:**

| Loại agent | Kiểm tra bổ sung |
|:-----------|:-----------------|
| `backend` | Xác thực cú pháp Python (`py_compile`), phát hiện SQL injection (f-string + từ khóa SQL), thực thi test Python (`pytest`) |
| `frontend` | Biên dịch TypeScript (`tsc --noEmit`), phát hiện inline style (`style={{`), sử dụng kiểu `any` (thất bại nếu > 3), test frontend (`vitest`) |
| `mobile` | Phân tích Flutter/Dart (`flutter analyze` hoặc `dart analyze`), test Flutter (`flutter test`) |
| `qa` | Xác minh tự kiểm tra |
| `debug` | Chạy test Python hoặc test frontend dựa trên loại dự án phát hiện được |
| `pm` | Xác thực `.agents/results/plan-{sessionId}.json` tồn tại và là JSON hợp lệ |

**Định dạng đầu ra:**
Mỗi kiểm tra báo cáo `PASS`, `FAIL`, `WARN` hoặc `SKIP` kèm thông báo chi tiết. Kết quả tổng thể là `ok: true` chỉ khi không có kiểm tra nào thất bại.

**Ví dụ:**
```bash
# Xác minh đầu ra backend trong workspace mặc định
oma verify backend

# Xác minh frontend trong workspace cụ thể
oma verify frontend -w ./apps/web

# Đầu ra JSON cho CI
oma verify backend --json
```

### cleanup

Dọn dẹp tiến trình subagent mồ côi và file tạm.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--dry-run` | Hiển thị những gì sẽ được dọn mà không thay đổi |
| `-y, --yes` | Bỏ qua prompt xác nhận và dọn tất cả |
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |

**Dọn dẹp:**
- File PID mồ côi trong thư mục tạm hệ thống (`/tmp/subagent-*.pid`).
- File log mồ côi (`/tmp/subagent-*.log`).
- Thư mục Gemini Antigravity (brain, implicit, knowledge) dưới `.gemini/antigravity/`.

**Ví dụ:**
```bash
# Xem trước những gì sẽ được dọn
oma cleanup --dry-run

# Dọn với prompt xác nhận
oma cleanup

# Dọn tất cả không hỏi
oma cleanup --yes

# Đầu ra JSON cho tự động hóa
oma cleanup --json
```

### visualize

Trực quan hóa cấu trúc dự án dưới dạng đồ thị phụ thuộc.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` là alias tích hợp cho `visualize`.

**Tùy chọn:**

| Flag | Mô tả |
|:-----|:-----------|
| `--json` | Xuất dạng JSON |
| `--output <format>` | Định dạng đầu ra (`text` hoặc `json`) |

**Hoạt động:** Phân tích cấu trúc dự án và tạo đồ thị phụ thuộc hiển thị quan hệ giữa skill, agent, workflow và tài nguyên dùng chung.

**Ví dụ:**
```bash
oma visualize
oma viz --json
```

### star

Star oh-my-agent trên GitHub.

```
oma star
```

Không có tùy chọn. Cần cài và xác thực `gh` CLI. Star repository `first-fluke/oh-my-agent`.

**Ví dụ:**
```bash
oma star
```

### describe

Mô tả lệnh CLI dưới dạng JSON cho introspection runtime.

```
oma describe [command-path]
```

**Đối số:**

| Đối số | Bắt buộc | Mô tả |
|:---------|:---------|:-----------|
| `command-path` | Không | Lệnh cần mô tả. Nếu bỏ qua, mô tả chương trình gốc. |

**Hoạt động:** Xuất đối tượng JSON với tên, mô tả, đối số, tùy chọn và lệnh con. Được dùng bởi AI agent để hiểu khả năng CLI có sẵn.

**Ví dụ:**
```bash
# Mô tả tất cả lệnh
oma describe

# Mô tả lệnh cụ thể
oma describe agent:spawn

# Mô tả lệnh con
oma describe "agent:parallel"
```

### help

Hiển thị thông tin trợ giúp.

```
oma help
```

Hiển thị toàn bộ text trợ giúp với tất cả lệnh có sẵn.

### version

Hiển thị số phiên bản.

```
oma version
```

Xuất phiên bản CLI hiện tại và thoát.

---

## Biến môi trường

| Biến | Mô tả | Dùng bởi |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Đặt thành `json` để buộc đầu ra JSON trên tất cả lệnh hỗ trợ | Tất cả lệnh có flag `--json` |
| `DASHBOARD_PORT` | Cổng cho dashboard web | `dashboard:web` |
| `MEMORIES_DIR` | Ghi đè đường dẫn thư mục memories | `dashboard`, `dashboard:web` |

---

## Alias

| Alias | Lệnh đầy đủ |
|:------|:------------|
| `viz` | `visualize` |
