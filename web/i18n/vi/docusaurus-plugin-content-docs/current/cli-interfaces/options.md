---
title: "Tùy chọn CLI"
description: "Tham chiếu đầy đủ cho mọi tùy chọn CLI, gồm cờ toàn cục, điều khiển đầu ra, tùy chọn theo lệnh và các mẫu sử dụng thực tế."
---

# Tùy chọn CLI

## Tùy chọn toàn cục

Các tùy chọn này có sẵn trên lệnh gốc `oma` / `oh-my-agent`:

| Flag | Mô tả |
|:-----|:-----------|
| `-g, --global` | Thao tác trên bản cài đặt ở HOME (`~/.agents/`) thay vì `<cwd>/.agents/` |
| `-y, --yes` | Bỏ qua prompt ở những lệnh có hỗ trợ xác nhận; các kiểm tra an toàn riêng của từng lệnh vẫn được áp dụng |
| `-V, --version` | Xuất số phiên bản rồi thoát |
| `-h, --help` | Hiển thị trợ giúp cho lệnh |

Mọi lệnh con cũng hỗ trợ `-h, --help` để hiển thị nội dung trợ giúp riêng của lệnh đó.

`--global` đặt thư mục gốc cài đặt cho toàn bộ tiến trình, nên `install`, `update`, `link` và `uninstall` đều phân giải về `~/.agents/` bất kể bạn chạy chúng từ thư mục nào. `OMA_HOME=<abs-path>` ghi đè thiết lập này — xem [Cài đặt toàn cục](../guide/global-install.md).

---

## Tùy chọn output {#output-options}

Nhiều lệnh hỗ trợ output machine-readable cho pipeline CI/CD và tự động hóa. Có ba cách yêu cầu output JSON, theo thứ tự ưu tiên:

### 1. Flag --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Flag `--json` chỉ có trên những đường dẫn lệnh cụ thể có khai báo flag này. Đừng suy ra khả năng hỗ trợ từ cả một nhóm lệnh: ví dụ, các lệnh con cấp cuối của `image`, `video` và `slide` cung cấp `--output` ở những chỗ registry liệt kê, còn `search` có luồng JSON riêng. Ma trận registry ở cuối trang này là danh sách chính thức theo từng đường dẫn lệnh.

### 2. Flag --output

```bash
oma stats get --output json
oma doctor --output text
```

Flag `--output` nhận `text` hoặc `json`. Flag này có cùng chức năng với `--json` nhưng còn cho phép bạn yêu cầu rõ output dạng text (hữu ích khi biến môi trường được đặt thành json nhưng bạn muốn text cho một lệnh cụ thể).

**Kiểm tra hợp lệ:** Nếu truyền định dạng không hợp lệ, CLI báo lỗi: `Invalid output format: {value}. Expected one of text, json`.

### 3. Biến môi trường OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Đặt biến môi trường này thành `json` để buộc output JSON trên mọi lệnh có hỗ trợ. Chỉ `json` được nhận dạng; mọi giá trị khác đều bị bỏ qua và mặc định là text.

**Thứ tự phân giải:** Flag `--json` > flag `--output` > biến môi trường `OH_MY_AG_OUTPUT_FORMAT` > `text` (mặc định).

### Các lệnh hỗ trợ output JSON

| Lệnh | `--json` | `--output` | Ghi chú |
|:--------|:---------|:----------|:------|
| `doctor` | Có | Có | Gồm kiểm tra CLI, trạng thái MCP, trạng thái skill |
| `stats` | Có | Có | Đối tượng số liệu đầy đủ |
| `retro` | Có | Có | Snapshot gồm số liệu, tác giả, loại commit |
| `cleanup` | Có | Có | Danh sách các item đã dọn |
| `auth status` | Có | Có | Trạng thái xác thực theo từng CLI |
| `memory init` | Có | Có | Kết quả khởi tạo |
| `verify agent` / `verify triggers` | Có | Có | Kết quả xác minh theo từng kiểm tra |
| `visualize` | Có | Có | Đồ thị phụ thuộc dạng JSON |
| `describe` | Luôn là JSON | N/A | Luôn xuất JSON (lệnh introspection) |
| `recap` | Có | Có | Lịch sử hội thoại theo công cụ/phiên |
| `image generate` / `image doctor` / `image vendor list` | N/A | Có | Dùng `--output json`; `vendor list` là đường dẫn chuẩn để khám phá vendor |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Có | Dùng `--output json` để lấy run envelope hoặc báo cáo mức sẵn sàng |
| `explain validate` | Có | Có | Báo cáo kiểm tra artifact |
| `explain render` / `explain patch` / `explain components` | Có | Có | Báo cáo kết xuất: file, cảnh báo, trạng thái sidecar |
| `explain lint` | Có | Có | Cảnh báo về câu chữ |
| `diagram resolve` / `diagram update` | Có | Có | Kết quả phân giải engine hoặc kết quả managed cache |
| `market resolve` / `market update` | Có | Có | Trạng thái research engine được quản lý |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Có | N/A | Mỗi đường dẫn docs dùng tùy chọn báo cáo riêng |
| `search ...` | Luôn là JSON | N/A | Mọi subcommand `search` đều stream JSON; dùng `--pretty` để con người dễ đọc |

---

## Tùy chọn theo lệnh

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Trình cài đặt tương tác ghi các thiết lập provider đã chọn vào `.agents/oma-config.yaml`. Các flag provider chọn integration cho web-search, code-intelligence và semantic-memory; `--honcho-url` và `--honcho-workspace` cấu hình dịch vụ memory Honcho khi provider đó được chọn. Flag gốc `-y, --yes` được áp dụng khi luồng cài đặt yêu cầu xác nhận.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--json` | Xuất JSON thay vì văn bản đã định dạng. | `false` |
| `--output <format>` | Định dạng output tường minh (`text` hoặc `json`). Xem [Tùy chọn output](#output-options). | `text` |
| `--profile` | Hiển thị ma trận sức khỏe profile (slug model đã phân giải, CLI và trạng thái xác thực của từng agent theo `model_preset` đang hoạt động và các override `agents:`). Xem [Cấu hình model theo từng agent](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Ghi đè các file config do người dùng tùy chỉnh trong lúc cập nhật. Ảnh hưởng tới: `oma-config.yaml`, `mcp.json`, các thư mục `stack/`. Nếu không có flag này, các file đó được sao lưu trước khi cập nhật và khôi phục sau đó. | `false` |
| `--with-new-skills` | | Cài các skill được thêm vào registry kể từ lần cài đặt hiện tại. | `false` |
| `--ci` | | Chạy ở chế độ CI không tương tác. Bỏ qua mọi prompt xác nhận, dùng output console thuần thay vì spinner và animation. Bắt buộc cho pipeline CI/CD khi không có stdin. | `false` |
| `--yes` | `-y` | Bỏ qua prompt. Không tạo các thư mục vendor còn thiếu trừ khi dùng kèm `--all` hoặc `--vendor`. | `false` |
| `--all` | | Tạo/cập nhật mọi vendor phạm vi project được hỗ trợ. | `false` |
| `--vendor <vendors>` | | Tạo/cập nhật danh sách vendor phân tách bằng dấu phẩy, ví dụ `claude,qwen`. | Chỉ các thư mục vendor đã có |

`oma update mcp` dùng cùng các tùy chọn `--yes`, `--ci`, `--all` và `--vendor` khi chọn browser MCP server. Lệnh này không dùng `--force` hay `--with-new-skills`.

**Hành vi với --force:**
- `oma-config.yaml` được thay bằng mặc định của registry.
- `mcp.json` được thay bằng mặc định của registry.
- Thư mục `stack/` của backend (tài nguyên theo ngôn ngữ) được thay thế.
- Mọi file khác luôn được cập nhật bất kể flag này.

**Hành vi với --ci:**
- Không gọi `console.clear()` khi bắt đầu.
- `@clack/prompts` được thay bằng `console.log` thuần.
- Prompt phát hiện công cụ cạnh tranh bị bỏ qua.
- Lỗi được throw thay vì gọi `process.exit(1)`.

**Phạm vi vendor:**
- `oma update` chỉ cập nhật các thư mục vendor đã tồn tại.
- `oma update --yes` dùng cùng phạm vi vendor nhưng không hiện prompt.
- `oma update --all` tạo/cập nhật mọi vendor phạm vi project được hỗ trợ.
- `oma update --vendor claude,qwen` chỉ tạo/cập nhật các vendor được liệt kê.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--json` | Xuất kết quả reset dưới dạng JSON. | `false` |
| `--output <format>` | Xuất `text` hoặc `json`. | `text` |

`oma stats reset` là lệnh reset. Cách viết cũ `oma stats get --reset` không còn thuộc bộ lệnh public hiện tại.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Mô tả | Mặc định |
|:-----|:-----------|:--------|
| `--interactive` | Chế độ tương tác với nhập liệu thủ công. Hỏi thêm ngữ cảnh không thể thu thập từ git (ví dụ: tâm trạng, sự kiện đáng chú ý). | `false` |
| `--compare` | So sánh khoảng thời gian hiện tại với khoảng trước đó có cùng độ dài. Hiển thị số liệu chênh lệch (ví dụ: commit +12, dòng thêm -340). | `false` |

**Định dạng đối số window:**
- `7d`: 7 ngày
- `2w`: 2 tuần
- `1m`: 1 tháng
- Bỏ trống để dùng mặc định (7 ngày)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Chế độ xem trước. Liệt kê mọi item sẽ được dọn nhưng không thay đổi gì. Exit code là 0 bất kể kết quả tìm thấy. | `false` |
| `--yes` | `-y` | Bỏ qua mọi prompt xác nhận. Dọn mọi thứ mà không hỏi. Hữu ích trong script và CI. | `false` |

**Những gì được dọn:**
1. File PID mồ côi: `/tmp/subagent-*.pid` khi tiến trình được tham chiếu không còn chạy.
2. File log mồ côi: `/tmp/subagent-*.log` khớp với các PID đã chết.
3. Thư mục Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Các thư mục này tích lũy trạng thái theo thời gian và có thể phình to.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Liên kết lần retry với run ID trước đó. | |
| `--fallback-vendors` | — | Chuỗi vendor fallback tường minh, có thứ tự, phân tách bằng dấu phẩy. | |
| `--task-id` | — | Task ID từ session plan. | Agent ID |
| `--vendor` | — | Ghi đè vendor CLI. Runtime chấp nhận `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` hoặc `pi`. | Phân giải từ config |
| `--workspace` | `-w` | Thư mục làm việc cho agent. Nếu bỏ qua hoặc đặt thành `.`, CLI tự phát hiện workspace từ các file cấu hình monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Tự phát hiện hoặc `.` |
| `--isolation` | — | Chế độ cô lập: `worktree` tạo một git worktree cho mỗi lần spawn; mặc định là `none`. | `none` |
| `--read-only` | — | Giới hạn agent được spawn ở các tool không phá hủy và tắt các flag tự động duyệt. | `false` |

**Kiểm tra hợp lệ:**
- `agent-id` phải là một trong: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` không được chứa `..`, `?`, `#`, `%` hoặc ký tự điều khiển.
- `vendor` phải là một trong: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Hành vi riêng theo vendor:**

| Vendor | Lệnh | Flag tự động duyệt | Flag prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (không có) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (không có; prompt là đối số vị trí) |
| cursor | `cursor-agent` | tùy vendor | `-p` |
| opencode | `opencode` | tùy vendor | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | tùy vendor | `-p` |
| pi | `pi` | bị tắt ở chế độ `--read-only` | prompt là đối số vị trí |

Có thể ghi đè các mặc định này trong `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex giữ nguyên sandbox workspace-write của nó. oma bật quyền truy cập mạng và thêm project root, OMA state home (`~/.oma`) cùng các cache package-manager hiện có làm thư mục có thể ghi. `oma update` thay thế `cli-config.yaml`, nên hãy đặt chế độ lâu dài bằng `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (mặc định) hoặc `danger-full-access` (không sandbox và không cần approval).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Đường dẫn gốc để tìm file memory (`.agents/state/memories/result-{agent}.md`) và file PID. | Thư mục làm việc hiện tại |

**Logic xác định trạng thái:**
1. Nếu `.agents/state/memories/result-{agent}.md` tồn tại: đọc header `## Status:`. Nếu không có header, báo `completed`.
2. Nếu file PID tồn tại tại `/tmp/subagent-{session-id}-{agent}.pid`: kiểm tra PID còn sống hay không. Báo `running` nếu còn sống, `crashed` nếu đã chết.
3. Nếu không có file nào tồn tại: báo `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Ghi đè vendor CLI áp dụng cho mọi agent được spawn. | Phân giải theo từng agent từ config |
| `--inline` | `-i` | Diễn giải đối số task thành chuỗi `agent:task[:workspace]` thay vì đường dẫn file. | `false` |
| `--no-wait` | | Chế độ nền. Khởi động mọi agent và trả về ngay, không chờ hoàn tất. Danh sách PID và log được lưu vào `.agents/results/parallel-{timestamp}/`. | `false` (chờ hoàn tất) |

**Định dạng task inline:** `agent:task` hoặc `agent:task:workspace`
- Workspace được phát hiện bằng cách kiểm tra đoạn cuối cùng (phân tách bởi dấu hai chấm) có bắt đầu bằng `./`, `/` hoặc bằng đúng `.` hay không.
- Ví dụ: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Ví dụ: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=tự phát hiện.

**Định dạng file task YAML:**
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
| `--window <period>` | Khoảng thời gian: `1d`, `3d`, `7d`, `2w`, `30d`. Bị bỏ qua khi đặt `--date`. | `1d` |
| `--date <date>` | Ngày cụ thể (`YYYY-MM-DD`). Được ưu tiên hơn `--window`. | |
| `--tool <tools>` | Lọc phiên theo công cụ. Phân tách bằng dấu phẩy: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | mọi công cụ |
| `--top <n>` | Chỉ hiển thị N project/chủ đề hàng đầu trong phần tóm tắt. | không giới hạn |
| `--sort <metric>` | Sắp xếp phiên theo `count` hoặc `duration`. | `count` |
| `--mermaid` | Xuất biểu đồ Gantt Mermaid thay cho phần tóm tắt mặc định. | `false` |
| `--graph` | Mở đồ thị tương tác trong trình duyệt. Không dùng chung được với `--mermaid`. | `false` |

> **Lưu ý:** Việc tạo file rule cho vendor (ví dụ `.cursor/rules`) từ các skill đã cài do [`oma link <vendor>`](./commands.md#link) đảm nhận, không phải một lệnh `export` riêng.

### search

```
oma search <subcommand> [...]
```

Nhóm `search` có sẵn output JSON riêng (không có flag `--json` / `--output`). Dùng `--pretty` trên các subcommand URL/query để in kết quả dễ đọc, và dựa vào các tùy chọn riêng của từng subcommand bên dưới:

| Subcommand | Tùy chọn đáng chú ý |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (mặc định `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (mặc định `en`), `--format <spec>`, `--timeout` (mặc định `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (mặc định `github`), `--language`, `--repo`, `--limit` (mặc định `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | không có (chạy kiểm tra binary cho Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Mã thoát:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Dùng các mã này trong script để phân biệt trường hợp bị chặn tạm thời với input không hợp lệ.

### image

```
oma image <subcommand> [...]
```

Định dạng output được điều khiển theo từng subcommand qua `--output <text|json>`.

`image generate` chấp nhận:

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` chọn theo cấu hình `image:` đang hoạt động và thông tin xác thực khả dụng. | `auto` |
| `--size <size>` | | `WxH` với cả hai cạnh chia hết cho 16, trong khoảng 16–3840, tỷ lệ khung hình 1:3–3:1, hoặc `auto`. | Mặc định theo nhà cung cấp |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | Mặc định theo nhà cung cấp |
| `--count <n>` | `-n` | Số lượng ảnh, 1..5. | `1` |
| `--output-dir <dir>` | | Thư mục output. Phải nằm trong `$PWD` trừ khi đặt `--allow-external-output`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Cho phép đường dẫn `--output-dir` nằm ngoài `$PWD`. | `false` |
| `--model <name>` | | Ghi đè model riêng theo vendor. Model của antigravity do `agy` chọn. | Mặc định theo nhà cung cấp |
| `--timeout <duration>` | | Timeout cho từng ảnh, dùng giá trị duration. | Mặc định theo nhà cung cấp |
| `--reference <path>` | `-r` | Ảnh tham chiếu để chuyển style/subject. Có thể lặp lại (`-r a.png -r b.png`) hoặc phân tách bằng dấu phẩy. Được kiểm tra kích thước (≤5MB), định dạng (PNG/JPEG/GIF/WebP qua magic bytes) và số lượng (≤10). Hỗ trợ trên `codex` và `antigravity`; bị từ chối với exit 4 trên `pollinations`. | |
| `--yes` | `-y` | Bỏ qua prompt xác nhận chi phí. | `false` |
| `--no-prompt-in-manifest` | | Lưu SHA256 của prompt thay vì văn bản gốc trong `manifest.json`. | `false` |
| `--dry-run` | | In kế hoạch và ước tính chi phí; không thực thi. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` và `image vendor list` chấp nhận `--output <text|json>`. `image list-vendors` vẫn là một bí danh trợ giúp; `vendor list` là đường dẫn chuẩn để khám phá vendor.

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
| `--force` | Ghi đè các file schema trống hoặc đã có trong `.agents/state/memories/`. Nếu không có flag này, các file hiện có sẽ không bị động đến. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Viết tắt | Mô tả | Mặc định |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Đường dẫn tới thư mục workspace cần xác minh. | Thư mục làm việc hiện tại |

**Loại agent:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` đo độ chính xác của keyword detector trên một corpus đã gắn nhãn. Các ngưỡng phần trăm đóng vai trò cổng kiểm tra; dùng output JSON khi job CI cần xem từng phát hiện riêng lẻ. Cách viết cũ `oma verify <agent-type>` chỉ là dạng trợ giúp để tương thích; `verify agent` mới là đường dẫn đã đăng ký.

---

## Ví dụ thực tế

### Pipeline CI: cập nhật và xác minh

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Thu thập số liệu tự động

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Thực thi agent hàng loạt kèm giám sát trạng thái

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Dọn dẹp trong CI sau khi chạy test

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Xác minh nhận biết workspace

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro kèm so sánh cho buổi đánh giá sprint

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script kiểm tra sức khỏe đầy đủ

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

### Dùng describe cho agent introspection

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Registry tùy chọn public đầy đủ

Ma trận sau được tạo từ registry lệnh công khai đã được commit trong kho mã. Đây là chỉ mục bao phủ của trang này: hàng có `—` không có tùy chọn dành riêng cho lệnh, còn các cờ gốc dùng chung và bí danh trợ giúp được mô tả ở trên. Chạy `oma describe "<path>"` để xem trợ giúp thời gian chạy khi cú pháp giá trị thay đổi.

| Đường dẫn lệnh | Tùy chọn public | Mục đích |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Cài đặt skill và cấu hình của oh-my-agent |
| `describe` | `—` | Mô tả các lệnh CLI dưới dạng JSON để introspection lúc runtime |
| `uninstall` | `--dry-run, -y, --yes` | Xóa các file do oh-my-agent sở hữu (giữ lại oma-config.yaml, mcp.json và các skill do người dùng tự viết) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Cập nhật skill lên phiên bản mới nhất từ registry |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Chọn browser MCP server (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Tạo lại các file vendor (.claude/, .cursor/, v.v.) từ SSOT .agents/ |
| `intel` | `—` | Pipeline product intelligence: nghiên cứu, khoảng trống, PRD, đề xuất issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Đề xuất công việc sản phẩm có giá trị cao từ market/code intelligence |
| `market` | `—` | Nghiên cứu thị trường từ tín hiệu cộng đồng qua engine last30days luôn ở bản mới nhất |
| `market detect-trap` | `--force` | Kiểm tra preflight để từ chối các truy vấn keyword-trap |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Báo cáo engine last30days mà oma sẽ chạy (bản mới nhất được quản lý, bản pin hoặc bản sao local) và Python mà engine đó dùng |
| `market update` | `--json, --output <format>` | Tải release last30days mới nhất vào managed cache của oma (~/.cache/oma-market/last30days) |
| `market run` | `—` | Chạy engine last30days (scripts/last30days.py) với các đối số đã cho; --save-dir mặc định lấy từ market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Kiểm tra cài đặt CLI, cấu hình MCP và trạng thái skill |
| `profile` | `—` | Quản lý các profile thực thi OMA local |
| `profile list` | `--json, --output <format>` | Liệt kê các profile local |
| `profile show` | `--json, --output <format>` | Hiển thị một profile local |
| `profile create` | `--json, --output <format>` | Tạo một profile local |
| `profile use` | `--shell <shell>, --json, --output <format>` | In mã shell để kích hoạt một profile hiện có |
| `profile run` | `—` | Chạy một lệnh với OMA_PROFILE được đặt cho tiến trình con |
| `retro` | `--interactive, --compare, --json, --output <format>` | Retrospective kỹ thuật kèm số liệu và xu hướng |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Tóm tắt lịch sử hội thoại của các công cụ AI |
| `docs` | `—` | Phát hiện drift tài liệu: xác minh tham chiếu và đề xuất cập nhật cho các tài liệu bị diff ảnh hưởng |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Trích xuất tham chiếu L2 từ tài liệu và báo cáo các đích bị hỏng. Tạo lại docs/generated/doc-refs.json như một side effect. Exit code: 0 = sạch, 1 = có tham chiếu hỏng. Việc kiểm tra liên kết URL được giao cho `lychee` (cài đặt: brew install lychee). |
| `docs sync` | `--json` | Với một git diff, liệt kê các tài liệu tham chiếu đến các file đã thay đổi. Host LLM (skill runtime) được kỳ vọng sẽ đọc danh sách này cùng với diff và đề xuất patch theo contract của SKILL.md — CLI không bao giờ tự động sửa tài liệu. Khoảng diff mặc định: --cached (các thay đổi đã stage), fallback về HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Phát hiện drift giữa tài liệu nguồn tiếng Anh (web/docs) và bản dịch i18n (web/i18n/{lang}/...). Xuất các tín hiệu cấu trúc (số dòng, số heading, timestamp của commit gần nhất) cho từng cặp để host LLM quyết định bản dịch nào cần patch diff-sync. CLI không bao giờ sửa bản dịch. |
| `docs lint` | `--json, --locales <list>` | Lint tài liệu đã dịch để tìm anti-pattern ở mức nội dung (em-dash trong ngôn ngữ đích CJK, v.v.). Bổ sung cho `oma docs i18n` (drift cấu trúc) bằng các kiểm tra style/anti-pattern theo oma-translation SKILL.md § Stage 4. CLI không bao giờ tự sửa; nó chỉ báo cáo vấn đề để host LLM cấu trúc lại. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Xuất các artifact tuân thủ chuẩn từ SSOT .agents/ (Agent Skills spec, gói Agent Plugins, Claude Code plugin marketplace, AGENTS.md, tài liệu vendor trong phạm vi cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Dọn các tiến trình subagent mồ côi và file tạm |
| `bridge` | `--context <name>` | Proxy MCP stdio tới một Serena server dùng chung theo từng project (khởi động khi cần) |
| `verify` | `—` | Xác minh output của subagent (backend/frontend/mobile/qa/debug/pm), hoặc đo độ chính xác trigger của keyword detector |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Đo độ chính xác trigger của keyword detector trên một corpus prompt đã gắn nhãn |
| `vault` | `—` | Quản lý API key + secret trong keychain của hệ điều hành (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Lưu một secret dưới tên <name> (prompt nhập mật khẩu tương tác) |
| `vault get` | `—` | In giá trị đã lưu ra stdout (dùng cho: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Liệt kê tên các secret đã lưu (không bao giờ hiển thị giá trị) |
| `vault delete` | `—` | Xóa một secret khỏi keychain và index |
| `star` | `—` | Gắn sao cho oh-my-agent trên GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Trực quan hóa cấu trúc project dưới dạng đồ thị phụ thuộc |
| `search` | `—` | Các primitive tìm kiếm cơ học: fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | Liệt kê các search provider đã đăng ký và kiểm tra lựa chọn mà không gọi mạng |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Tìm kiếm bằng web provider đã chọn (Brave có CLI adapter) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Fetch URL qua pipeline chiến lược tự động leo thang |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Trích xuất OGP / JSON-LD / Schema.org từ URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Trích xuất metadata media qua yt-dlp (1858 trang web) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Fetch qua AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Xác định mức tin cậy / điểm tin cậy của một domain |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Tìm kiếm mã nguồn qua gh / glab |
| `search doctor` | `—` | Kiểm tra các dependency (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Fetch qua API của nền tảng khớp (Phase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Tìm kiếm keyword dạng fan-out trên các nền tảng có hỗ trợ |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Tìm và phân tích feed RSS/Atom cho một URL |
| `search rss google` | `--locale <value>` | Tạo URL RSS Google News cho một truy vấn |
| `harness` | `—` | Đánh giá các overlay harness OMA trên các task repository được cô lập |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | So sánh một overlay .agents ứng viên với baseline hiện tại |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Dẫn xuất fixture hồi quy skill từ một sự cố đã ghi nhận |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Thăng cấp các sự cố và tối ưu các skill bị ảnh hưởng |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Bật chu trình feedback theo lịch có ngân sách của project; mode là apply hoặc propose |
| `harness evolution status` | `--json, --output <format>` | Hiển thị cấu hình, lịch, công việc đang chờ, xung đột và chu trình gần nhất |
| `harness evolution disable` | `--json, --output <format>` | Tắt chu trình feedback theo lịch của project |
| `harness evolution run` | `--json, --output <format>` | Chạy một chu trình theo mode và ngân sách đã lưu của project đang được bật |
| `slide` | `—` | Bộ công cụ trình chiếu HTML: scaffold, validate, export và chỉnh sửa slide deck 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Cổng chất lượng hình học: render slide qua puppeteer-core và kiểm tra overflow/overlap/font-size |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Gộp các file theo từng slide thành một file .html tự chứa duy nhất để bàn giao |
| `slide edit` | `--workspace <path>, --port <n>` | Mở trình chỉnh sửa bbox trên browser (server node:http tại 127.0.0.1, dispatch tới oma agent runner) |
| `slide doctor` | `—` | Kiểm tra các dependency bắt buộc (chrome, puppeteer-core) và tùy chọn (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Scaffold một thư mục làm việc slide mới với HTML khởi đầu, assets/ và meta.json |
| `slide preview` | `--workspace <path>` | Tạo viewer.html (web component deck-stage + panel speaker notes, bật/tắt bằng `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Export slide sang PDF qua puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Export từng slide thành ảnh PNG qua puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [THỬ NGHIỆM] Export sang PPTX qua pptxgenjs (dựa trên raster, gradient bị raster hóa) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Import một file .pptx thành các slide fragment qua officeparser (bunx, best-effort) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Tải video qua yt-dlp vào ./assets/ và in ref local |
| `slide style` | `—` | Duyệt và tải các preset style thiết kế |
| `slide style list` | `—` | Liệt kê các preset style có sẵn (vendored + index bold-template) |
| `slide style preview` | `—` | Xem trước một preset style trong terminal |
| `slide style get` | `--refresh` | Tải design.md của một bold template (luôn lấy main mới nhất; được cache để fallback khi offline) |
| `scholar` | `—` | Sidecar bài báo Knows.academy (fallback OpenAlex + Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Tìm kiếm bài báo (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Tìm bài báo khớp nhất trên knows.academy, OpenAlex, Semantic Scholar |
| `scholar get` | `--section <name>` | Lấy một sidecar (knows record_id) hoặc metadata của work (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Kiểm tra hợp lệ một sidecar .knows.yaml hoặc .knows.json (v0.9.0) |
| `image` | `—` | Tạo ảnh AI đa vendor: dispatch song song có nhận biết xác thực |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Tạo ảnh qua pollinations (flux/zimage, miễn phí), codex (gpt-image-2, ChatGPT OAuth) hoặc antigravity (gemini nano-banana qua CLI `agy`, miễn phí khi đăng nhập Gemini Code Assist) |
| `image doctor` | `--output <format>` | Kiểm tra trạng thái xác thực và cài đặt theo từng vendor |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Liệt kê các vendor đã đăng ký và các model được hỗ trợ |
| `video` | `—` | Tạo video short-form, explainer và demo |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Tạo run directory video từ một brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Kiểm tra mức sẵn sàng của video provider và compositor |
| `video compose` | `--output <format>, --refresh, --offline` | Scaffold project HyperFrames của run trên toolchain mới nhất + heygen-com/hyperframes; in authoring contract |
| `video render` | `--output <format>` | Render lại một run directory từ render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Liệt kê các video provider và tình trạng khả dụng |
| `serena` | `—` | Tiện ích quản lý vòng đời language server của Serena MCP |
| `serena reap` | `--dry-run, --quiet` | Kết thúc các tiến trình con LSP của Serena đang rảnh để thu hồi bộ nhớ (Serena tự phục hồi ở lần gọi tool tiếp theo) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Cài scheduled task Serena Reaper chạy định kỳ (mỗi 5 phút) |
| `serena reaper disable` | `--dry-run` | Gỡ scheduled task Serena Reaper chạy định kỳ |
| `explain` | `—` | Các công cụ quản lý và kiểm tra chất lượng artifact explain |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Kiểm tra hợp lệ các artifact báo cáo HTML explain tự chứa |
| `explain render` | `--output-file <path>, --template <name>, --theme <name>, --mode <mode>, --style <level>, --lang <code>, --archify, --no-archify, --open, --output <format>, --json` | Kết xuất bản nháp Markdown (file hoặc stdin) thành một trang HTML giải thích độc lập |
| `explain lint` | `--style <level>, --lang <code>, --output <format>, --json` | Kiểm tra câu chữ của bản nháp (file hoặc stdin) mà không kết xuất |
| `explain patch` | `--panel <id>, --open, --output <format>, --json` | Thay một bảng của trang đã kết xuất dựa trên bản nháp được nhúng |
| `explain components` | `--output <format>, --json` | Liệt kê các thành phần dùng được trong bản nháp hoặc in cú pháp của một thành phần |
| `diagram` | `—` | Tiện ích engine sơ đồ (HTML tương tác của archify hoặc fallback Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Báo cáo engine sơ đồ mà workflow nên dùng và vị trí cài archify |
| `diagram update` | `--json, --output <format>` | Tải release archify mới nhất vào managed cache của oma (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Chạy CLI archify đã cài đặt (doctor \| guide \| validate \| deliver \| visual-check …) với kiểm tra cập nhật bị tắt |
| `help` | `—` | Hiển thị thông tin trợ giúp |
| `version` | `—` | Hiển thị số phiên bản |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Khởi động dashboard terminal (giám sát agent theo thời gian thực) |
| `dashboard web` | `—` | Khởi động dashboard web tại http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Kiểm tra trạng thái xác thực của mọi CLI được hỗ trợ |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Dispatch một hook event của vendor qua hook router tập trung của oma (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Kiểm tra khả năng tương thích hook L1 theo từng vendor và in ra ma trận (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Ghi thêm một workflow event L1 của OMA |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Di chuyển các session cũ sang home profile và xóa các bản gốc đã được xác minh |
| `state get` | `--json, --output <format>` | Xem một session L1 của OMA theo ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Xem trạng thái workflow L1 của OMA |
| `state repair` | `--dry-run, --json, --output <format>` | Sửa các file trạng thái workflow L1 của OMA |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Xác minh các event L1 bắt buộc cho một checkpoint của workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Liệt kê các checkpoint L1 decision.made bắt buộc |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Liệt kê hoặc xem audit log inject theo từng boundary (D52) |
| `state inject-log get` | `--json, --output <format>` | Liệt kê hoặc xem audit log inject theo từng boundary (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Export bản tóm tắt session vào coordination store |
| `state trajectory` | `--category <category>, --open, --width <columns>, --sequence, --ascii, --json, --output <format>` | Hiển thị trajectory của session: L1 event ghép với transcript của vendor |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Kiểm tra xem một agent có được phép tự phục hồi hay không |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Xem trạng thái workflow L1 của OMA |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Xem trạng thái workflow L1 của OMA |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Xem trạng thái workflow L1 của OMA |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Xác minh các artifact EXEC của ralph (cổng chống lách, ralph.md Step 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Gắn một goal contract (cổng dừng xác định / ngân sách thời gian thực) vào một persistent workflow đang hoạt động |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Xem số liệu năng suất |
| `stats reset` | `--json, --output <format>` | Xem số liệu năng suất |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Tải context được chọn theo graph cho một prompt native dispatch |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Tiếp tục các task an toàn chưa hoàn tất, dùng lại acceptance evidence hiện tại |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Bắt đầu một run agent native có evidence làm căn cứ |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Thực thi argv xác minh sau -- và ghi lại exit code thực của nó |
| `agent finish` | `--project-root <path>` | Kiểm tra kết quả của agent native dựa trên các receipt xác minh của nó |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Spawn một subagent (prompt có thể là text inline hoặc đường dẫn file) |
| `agent status` | `--project-root <path>` | Kiểm tra trạng thái của các subagent |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Chạy nhiều sub-agent song song |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Chạy code review bằng CLI bên ngoài (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Đối chiếu model registry với danh sách model live của vendor |
| `model probe` | `--json, --timeout <duration>` | Thử một slug model với CLI của vendor tương ứng để xác minh slug đó được chấp nhận |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Chạy model:check --probe ở bên trong và tạo patch `models:` cho oma-config với các ứng viên được chấp nhận |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Cấu hình kết nối Honcho hoặc credential embedding local |
| `memory init` | `--force, --json, --output <format>` | Khởi tạo coordination store trong .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Chuẩn bị cấu hình endpoint AgentMemory |
| `memory daemon` | `—` | Quản lý tiến trình daemon AgentMemory do OMA sở hữu |
| `memory daemon status` | `--json, --output <format>` | Hiển thị trạng thái daemon |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Khởi động AgentMemory ở chế độ nền |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Dừng daemon AgentMemory do OMA sở hữu |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Khởi động lại daemon AgentMemory do OMA sở hữu |
| `memory service` | `—` | Quản lý integration của AgentMemory với service của hệ điều hành |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Cài integration service launchd/systemd cho AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Gỡ integration service launchd/systemd của AgentMemory |
| `memory status` | `--json, --output <format>` | Hiển thị tình trạng sức khỏe của semantic-memory provider đã chọn |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Xử lý hết các lần retry observe của AgentMemory đang trong hàng đợi |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Import lịch sử hội thoại của vendor vào AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Bảo trì storage local của AgentMemory: backup, prune, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Bảo trì storage local của AgentMemory: backup, prune, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Bảo trì storage local của AgentMemory: backup, prune, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Bảo trì storage local của AgentMemory: backup, prune, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Thu gom rác memory local của project: prune các session L1 cũ và các file Serena tạm thời |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Dừng, backup, nâng cấp, khởi động lại và kiểm tra sức khỏe AgentMemory |
| `skill` | `—` | Xem xét và audit các skill đã cài |
| `skill audit` | `--json, --output <format>` | Kiểm tra độ tương đồng của description trong frontmatter giữa các skill đã cài |
| `skill lint` | `--skill <id>, --json, --output <format>` | Phát hiện authoring smell theo từng skill (frontmatter, cấu trúc, tham chiếu hỏng) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Đo utility lift theo từng skill (treatment so với baseline trên các task held-out) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Tối ưu SKILL.md của một skill để tối đa hóa utility lift held-out đo được |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Đề xuất và chấm điểm các thay đổi đối với quy trình evolution trên các skill held-out |
| `skill procedure` | `--export, --json, --output <format>` | Hiển thị quy trình evolution (prompt optimizer/maintainer, constitution) cùng các hash của nó |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Tổng hợp các lần chạy optimization đã ghi theo kết quả, memory mode và quy trình |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Tường thuật các lần thăng cấp và rollback SKILL.md đã ghi cho một skill, hoặc cho mọi skill và quy trình khi dùng `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Khôi phục phần body SKILL.md đã bị thay bởi lần thăng cấp được ghi gần nhất |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Đăng ký một job agent theo lịch |
| `schedule list` | `--json, --output <format>` | Liệt kê các job theo lịch kèm trạng thái drift với OS (synced/missing-in-os/orphan-in-os), nhóm theo project |
| `schedule delete` | `—` | Xóa một job theo lịch khỏi manifest và OS scheduler |
| `schedule run` | `—` | Thực thi một job theo lịch theo id (được OS scheduler gọi; thường không gọi trực tiếp) |
| `schedule sync` | `--prune` | Đồng bộ lại manifest → OS scheduler. Dùng --prune để xóa các job OS mồ côi. |
