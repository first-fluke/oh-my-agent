---
title: "Tùy chọn CLI"
description: Tham chiếu đầy đủ cho tất cả tùy chọn CLI — flag toàn cục, điều khiển đầu ra, tùy chọn theo lệnh và các mẫu sử dụng thực tế.
---

# Tùy chọn CLI

## Tùy chọn toàn cục

Các tùy chọn này có sẵn trên lệnh gốc `oma` / `oh-my-agent`:

| Flag | Mô tả |
|:-----|:-----------|
| `-V, --version` | Xuất số phiên bản và thoát |
| `-h, --help` | Hiển thị trợ giúp cho lệnh |

Tất cả lệnh con cũng hỗ trợ `-h, --help` để hiển thị text trợ giúp riêng.

---

## Tùy chọn đầu ra

Nhiều lệnh hỗ trợ đầu ra machine-readable cho pipeline CI/CD và tự động hóa. Có ba cách để yêu cầu đầu ra JSON, theo thứ tự ưu tiên:

### 1. Flag --json

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

Flag `--json` là cách đơn giản nhất để lấy đầu ra JSON. Có sẵn trên: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. Flag --output

```bash
oma stats --output json
oma doctor --output text
```

Flag `--output` chấp nhận `text` hoặc `json`. Cung cấp cùng chức năng như `--json` nhưng cũng cho phép bạn yêu cầu tường minh đầu ra text (hữu ích khi biến môi trường đặt thành json nhưng bạn muốn text cho lệnh cụ thể).

**Xác thực:** Nếu cung cấp định dạng không hợp lệ, CLI báo lỗi: `Invalid output format: {value}. Expected one of text, json`.

### 3. Biến môi trường OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # xuất JSON
oma doctor   # xuất JSON
oma retro    # xuất JSON
```

Đặt biến môi trường này thành `json` để buộc đầu ra JSON trên tất cả lệnh hỗ trợ. Chỉ `json` được nhận dạng; giá trị khác bị bỏ qua và mặc định là text.

**Thứ tự phân giải:** Flag `--json` > flag `--output` > biến môi trường `OH_MY_AG_OUTPUT_FORMAT` > `text` (mặc định).

### Lệnh hỗ trợ đầu ra JSON

| Lệnh | `--json` | `--output` | Ghi chú |
|:--------|:---------|:----------|:------|
| `doctor` | Có | Có | Bao gồm kiểm tra CLI, trạng thái MCP, trạng thái skill |
| `stats` | Có | Có | Đối tượng số liệu đầy đủ |
| `retro` | Có | Có | Snapshot với số liệu, tác giả, loại commit |
| `cleanup` | Có | Có | Danh sách item đã dọn |
| `auth:status` | Có | Có | Trạng thái xác thực theo CLI |
| `memory:init` | Có | Có | Kết quả khởi tạo |
| `verify` | Có | Có | Kết quả xác minh theo từng kiểm tra |
| `visualize` | Có | Có | Đồ thị phụ thuộc dạng JSON |
| `describe` | Luôn JSON | N/A | Luôn xuất JSON (lệnh introspection) |
| `recap` | Có | Có | Lịch sử hội thoại theo công cụ/phiên |
| `export` | Có | Có | Trạng thái xuất và đường dẫn đích |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | Dùng `--format json` thay cho `--json` |
| `search ...` | Luôn JSON | N/A | Mọi subcommand `search` đều stream JSON; dùng `--pretty` để con người đọc |

---

## Tùy chọn theo lệnh

### oma (cài đặt)

```
oma
```

Không có flag. Trình cài đặt tương tác sẽ hỏi chọn preset rồi ghi `model_preset` vào `.agents/oma-config.yaml`.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--json` | Xuất JSON thay vì văn bản đã định dạng. | `false` |
| `--output <format>` | Định dạng đầu ra rõ ràng (`text` hoặc `json`). Xem [Tùy chọn đầu ra](#tùy-chọn-đầu-ra). | `text` |
| `--profile` | Hiển thị ma trận sức khỏe profile — slug model, CLI và trạng thái xác thực đã phân giải cho từng agent từ `model_preset` đang dùng và các ghi đè `agents:`. Xem [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Ghi đè file config tùy chỉnh khi cập nhật. Ảnh hưởng: `oma-config.yaml`, `mcp.json`, thư mục `stack/`. Không có flag này, các file được sao lưu trước khi cập nhật và khôi phục sau. | `false` |
| `--ci` | | Chạy ở chế độ CI không tương tác. Bỏ qua tất cả prompt xác nhận, dùng đầu ra console thuần thay vì spinner và animation. Cần thiết cho pipeline CI/CD khi stdin không có sẵn. | `false` |

**Hành vi với --force:**
- `oma-config.yaml` được thay thế bằng mặc định registry.
- `mcp.json` được thay thế bằng mặc định registry.
- Thư mục `stack/` backend (tài nguyên theo ngôn ngữ) được thay thế.
- Tất cả file khác luôn được cập nhật bất kể flag này.

**Hành vi với --ci:**
- Không `console.clear()` khi bắt đầu.
- `@clack/prompts` được thay bằng `console.log` thuần.
- Prompt phát hiện đối thủ bị bỏ qua.
- Lỗi throw thay vì gọi `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--reset` | Đặt lại tất cả dữ liệu số liệu. Xóa `.serena/metrics.json` và tạo lại với giá trị trống. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--interactive` | Chế độ tương tác với nhập liệu thủ công. Yêu cầu ngữ cảnh bổ sung không thể thu thập từ git (ví dụ: tâm trạng, sự kiện đáng chú ý). | `false` |
| `--compare` | So sánh khoảng thời gian hiện tại với khoảng trước đó cùng độ dài. Hiển thị số liệu delta (ví dụ: commit +12, dòng thêm -340). | `false` |

**Định dạng đối số window:**
- `7d` — 7 ngày
- `2w` — 2 tuần
- `1m` — 1 tháng
- Bỏ qua cho mặc định (7 ngày)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Chế độ xem trước. Liệt kê tất cả item sẽ được dọn nhưng không thay đổi. Exit code 0 bất kể kết quả. | `false` |
| `--yes` | `-y` | Bỏ qua tất cả prompt xác nhận. Dọn mọi thứ không hỏi. Hữu ích trong script và CI. | `false` |

**Dọn dẹp:**
1. File PID mồ côi: `/tmp/subagent-*.pid` khi tiến trình tham chiếu không còn chạy.
2. File log mồ côi: `/tmp/subagent-*.log` khớp PID chết.
3. Thư mục Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — tích lũy trạng thái theo thời gian và có thể phình to.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | Ghi đè vendor CLI. Phải là một trong: `antigravity`, `claude`, `codex`, `qwen`. Ghi đè tất cả phân giải vendor từ config. | Phân giải từ config |
| `--workspace` | `-w` | Thư mục làm việc cho agent. Nếu bỏ qua hoặc đặt thành `.`, CLI tự phát hiện workspace từ file cấu hình monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Tự phát hiện hoặc `.` |

**Xác thực:**
- `agent-id` phải là một trong: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` không được chứa `..`, `?`, `#`, `%` hoặc ký tự điều khiển.
- `vendor` phải là một trong: `antigravity`, `claude`, `codex`, `qwen`.

**Hành vi đặc thù vendor:**

| Vendor | Lệnh | Flag tự động duyệt | Flag prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (không) | `-p` |
| codex | `codex` | `--full-auto` | (không — prompt là positional) |
| qwen | `qwen` | `--yolo` | `-p` |

Các mặc định này có thể ghi đè trong `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Đường dẫn gốc để tìm file bộ nhớ (`.serena/memories/result-{agent}.md`) và file PID. | Thư mục làm việc hiện tại |

**Logic xác định trạng thái:**
1. Nếu `.serena/memories/result-{agent}.md` tồn tại: đọc header `## Status:`. Nếu không có header, báo `completed`.
2. Nếu file PID tồn tại tại `/tmp/subagent-{session-id}-{agent}.pid`: kiểm tra PID còn sống. Báo `running` nếu sống, `crashed` nếu chết.
3. Nếu không tìm thấy file nào: báo `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | Ghi đè vendor CLI áp dụng cho tất cả agent được spawn. | Phân giải theo agent từ config |
| `--inline` | `-i` | Diễn giải đối số task dạng chuỗi `agent:task[:workspace]` thay vì đường dẫn file. | `false` |
| `--no-wait` | | Chế độ nền. Khởi động tất cả agent và trả về ngay không đợi hoàn thành. Danh sách PID và log được lưu vào `.agents/results/parallel-{timestamp}/`. | `false` (đợi hoàn thành) |

**Định dạng task inline:** `agent:task` hoặc `agent:task:workspace`
- Workspace được phát hiện bằng cách kiểm tra phần tách bởi dấu hai chấm cuối cùng bắt đầu bằng `./`, `/` hoặc bằng `.`.
- Ví dụ: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Ví dụ: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=tự phát hiện.

**Định dạng file YAML task:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # tùy chọn
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--window <period>` | Khoảng thời gian: `1d`, `3d`, `7d`, `2w`, `30d`. Bị bỏ qua khi đặt `--date`. | `1d` |
| `--date <date>` | Ngày cụ thể (`YYYY-MM-DD`). Ưu tiên hơn `--window`. | |
| `--tool <tools>` | Lọc phiên theo công cụ. Phân tách bằng dấu phẩy: `claude`, `codex`, `qwen`, `cursor`. | tất cả công cụ |
| `--top <n>` | Chỉ hiển thị N dự án/chủ đề hàng đầu trong tổng kết. | không giới hạn |
| `--sort <metric>` | Sắp xếp phiên theo `count` hoặc `duration`. | `count` |
| `--mermaid` | Xuất biểu đồ Gantt Mermaid thay cho tổng kết mặc định. | `false` |
| `--graph` | Mở đồ thị tương tác trong trình duyệt. Loại trừ lẫn nhau với `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--dir <path>` | `-d` | Thư mục đích để ghi các quy tắc đã xuất. | `process.cwd()` |

**Định dạng được hỗ trợ:** `cursor` (ghi file `.cursor/rules` lấy từ các skill đã cài).

### search

```
oma search <subcommand> [...]
```

Nhóm `search` tự kèm đầu ra JSON riêng (không có flag `--json` / `--output`). Dùng `--pretty` trên các subcommand URL/query để in đẹp kết quả, và dựa vào tùy chọn của từng subcommand bên dưới:

| Subcommand | Tùy chọn đáng chú ý |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (mặc định `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (mặc định `en`), `--format <spec>`, `--timeout` (mặc định `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (mặc định `github`), `--language`, `--repo`, `--limit` (mặc định `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | không có — chạy kiểm tra binary cho Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Mã thoát:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Dùng các mã này trong script để phân biệt blocker tạm thời với input không hợp lệ.

### image

```
oma image <subcommand> [...]
```

Định dạng đầu ra được điều khiển ở mỗi subcommand qua `--format <text|json>` (không phải flag `--json` chung).

`image generate` chấp nhận:

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` phân giải từ `image-config.yaml` và xác thực sẵn có. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | mặc định của vendor |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | mặc định của vendor |
| `--count <n>` | `-n` | Số lượng ảnh, 1..5. | `1` |
| `--out <dir>` | | Thư mục đầu ra. Phải nằm trong `$PWD` trừ khi đặt `--allow-external-out`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Cho phép `--out` nằm ngoài `$PWD`. | `false` |
| `--model <name>` | | Ghi đè model theo vendor (ví dụ: `gpt-image-2`, `flux`, `imagen-4`). | mặc định của vendor |
| `--strategy <list>` | | Thứ tự fallback của Gemini, phân tách bằng dấu phẩy gồm `mcp`, `stream`, `api`. | mặc định của vendor |
| `--timeout <seconds>` | | Timeout cho từng ảnh. | mặc định của vendor |
| `--reference <path>` | `-r` | Ảnh tham chiếu để chuyển style/subject. Có thể lặp (`-r a.png -r b.png`) hoặc phân tách bằng dấu phẩy. Được kiểm tra kích thước (≤5MB), định dạng (PNG/JPEG/GIF/WebP qua magic bytes) và số lượng (≤10). Hỗ trợ trên `codex` (truyền `-i` cho `codex exec`) và `gemini` (inline base64 `inlineData`). Bị từ chối với exit 4 trên `pollinations`. | |
| `--yes` | `-y` | Bỏ qua prompt xác nhận chi phí. | `false` |
| `--no-prompt-in-manifest` | | Lưu SHA256 của prompt thay vì văn bản gốc trong `manifest.json`. | `false` |
| `--dry-run` | | In kế hoạch và ước tính chi phí; không thực thi. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` và `image list-vendors` chỉ chấp nhận `--format <text|json>`.

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--force` | Ghi đè file schema trống hoặc hiện có trong `.serena/memories/`. Không có flag này, file hiện có không bị thay đổi. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Đường dẫn thư mục workspace cần xác minh. | Thư mục làm việc hiện tại |

**Loại agent:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Ví dụ thực tế

### Pipeline CI: cập nhật và xác minh

```bash
# Cập nhật ở chế độ CI, sau đó chạy doctor để xác minh cài đặt
oma update --ci
oma doctor --json | jq '.healthy'
```

### Thu thập số liệu tự động

```bash
# Thu thập số liệu dạng JSON và pipe đến hệ thống giám sát
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Thực thi agent hàng loạt với giám sát trạng thái

```bash
# Khởi động agent ở nền
oma agent:parallel tasks.yaml --no-wait

# Kiểm tra trạng thái định kỳ
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Dọn dẹp trong CI sau test

```bash
# Dọn tất cả tiến trình mồ côi không hỏi
oma cleanup --yes --json
```

### Xác minh nhận biết workspace

```bash
# Xác minh mỗi domain trong workspace của nó
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro so sánh cho đánh giá sprint

```bash
# Retro sprint 2 tuần với so sánh sprint trước
oma retro 2w --compare

# Lưu dạng JSON cho báo cáo sprint
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script kiểm tra sức khỏe đầy đủ

```bash
#!/bin/bash
set -e

echo "=== Kiểm tra sức khỏe oh-my-agent ==="

# Kiểm tra cài đặt CLI
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Kiểm tra trạng thái xác thực
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Kiểm tra số liệu
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Hoàn tất ==="
```

### Describe cho introspection agent

```bash
# AI agent có thể khám phá lệnh có sẵn
oma describe | jq '.command.subcommands[] | {name, description}'

# Lấy chi tiết về lệnh cụ thể
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
