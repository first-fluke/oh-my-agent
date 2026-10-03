---
title: "Hướng dẫn: Scheduled Agents"
sidebar_label: Scheduled Agents
description: Chạy agent bất kỳ theo lịch lặp lại hoặc một lần bằng OS scheduler (macOS launchd, Linux systemd, Windows Task Scheduler) mà không cần vendor runtime luôn mở.
---

# Scheduled Agents {#scheduled-agents}

`oma schedule` cho phép chạy agent bất kỳ theo lịch dựa trên thời gian, độc lập với AI vendor runtime nào (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode hoặc pi) đang mở. OS scheduler kích hoạt job, job gọi `oma agent spawn` ở chế độ headless bằng vendor credential đã cache trên disk.

---

## Cách hoạt động {#how-it-works}

Khi chạy `oma schedule create`, oma:

1. Ghi job record vào global manifest tại `~/.agents/schedule/schedules.json`.
2. Đăng ký job với OS scheduler (macOS launchd, Linux systemd --user hoặc Windows Task Scheduler). OS job gọi `oma schedule run <id>` theo cron interval đã cấu hình.
3. Khi đến giờ, `oma schedule run` tra job, inject environment variable đã capture, gọi `oma agent spawn` và ghi run log vào `~/.agents/schedule/runs/<id>/<timestamp>.md`.

Manifest là source of truth duy nhất (SSOT). OS scheduler chỉ là executor. Toàn bộ state — job definition, run log và timestamp chạy lần cuối — nằm dưới `~/.agents/schedule/`.

### Thiết kế chỉ dùng global {#global-only-by-design}

`oma schedule` chủ ý là user-global, không theo từng project. Vì OS scheduler chạy job độc lập với working directory hiện tại, một registry trung tâm duy nhất là SSOT thực tế duy nhất. Mỗi job ghi project mà nó thuộc về qua `workspace` và `projectLabel`, nên `schedule list` có thể nhóm job theo project dù registry dùng chung.

Không có flag `--global`; schedule command luôn đọc và ghi `~/.agents/schedule/`.

### OS backend {#os-backends}

| Nền tảng | Backend chính | Fallback |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | user `crontab` |
| Linux | systemd --user timer | user `crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

oma tự động chọn backend khả dụng. Bạn không cần cấu hình thủ công.

---

## So sánh: schedule với ralph và Claude /loop {#comparison-schedule-vs-ralph-vs-claude-loop}

Ba tính năng này đôi khi bị nhầm vì đều liên quan đến “chạy lại sau”. Chúng là các khái niệm khác nhau.

| Tính năng | Trigger | Phạm vi | Sống qua vendor restart? |
|---|---|---|---|
| `oma schedule` | Theo thời gian (cron) | Cross-vendor, cấp OS | Có — OS scheduler kích hoạt ngay cả khi không vendor runtime nào mở |
| `ralph` | Theo hoàn tất (Stop hook loop) | Cross-vendor | Chỉ khi session hiện tại còn hoạt động; ralph là loop “tiếp tục cho đến khi xong”, không phải timer |
| Claude Code `/loop` | Theo thời gian (cron trong process) | Chỉ runtime Claude | Không — chỉ kích hoạt khi Claude Code đang chạy |

Dùng `schedule` khi muốn job chạy lúc 9 giờ sáng mỗi ngày trong tuần. Dùng `ralph` khi muốn agent tiếp tục lặp đến khi đạt quality bar. Chỉ dùng `/loop` khi đang ở trong Claude Code và không cần khả năng chạy xuyên vendor.

---

## Bắt đầu nhanh {#quick-start}

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Các command {#commands}

### schedule create {#schedule-create}

Đăng ký scheduled agent job.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Arguments:**

| Argument | Bắt buộc | Mô tả |
|---|---|---|
| `agent-id` | Có | Agent type cần spawn: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Có | Mô tả task truyền cho agent lúc chạy |

**Options:**

| Flag | Mô tả |
|---|---|
| `--cron "<expr>"` | Cron expression 5 trường (ví dụ `"0 9 * * *"` cho 9 giờ sáng mỗi ngày). Loại trừ lẫn nhau với `--every`. |
| `--every "<phrase>"` | Interval ngôn ngữ tự nhiên (xem bảng bên dưới). Loại trừ lẫn nhau với `--cron`. |
| `--vendor <vendor>` | Ghi đè CLI vendor truyền cho `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Mặc định tự phát hiện từ `oma-config.yaml`. |
| `-w, --workspace <path>` | Working directory cho agent lúc chạy. Mặc định là working directory hiện tại lúc đăng ký. |
| `--once` | Chế độ một lần: job chạy một lần rồi tự xóa. Mặc định là lặp lại. |
| `--expires-after <duration>` | Tự hết hạn scheduled job lặp sau duration như 30d. `0` nghĩa là vô thời hạn (mặc định). |
| `--env <KEY1,KEY2>` | Capture các environment variable được nêu (chỉ các biến đó) vào `~/.agents/schedule/env/<id>` (permission 0600) để inject lúc chạy. Secret không bao giờ được ghi vào manifest. |
| `--dry-run` | In cron đã resolve và ghi chú rounding nếu có mà không ghi scheduler job, manifest entry hoặc environment file. |
| `--accept-rounded` | Bắt buộc để đăng ký natural-language interval sau khi OMA làm tròn nó thành bước cron có thể biểu diễn. Xem trước bằng `--dry-run`. |

Chính xác một trong `--cron` hoặc `--every` là bắt buộc.

#### --every: interval ngôn ngữ tự nhiên {#every-natural-language-intervals}

`--every` nhận các dạng phrase sau. oma parse thành cron expression 5 trường và in ghi chú khi interval yêu cầu được làm tròn đến bước gần nhất mà cron biểu diễn được.

| Dạng phrase | Ví dụ | Ghi chú |
|---|---|---|
| Đơn vị rút gọn | `5m`, `2h`, `1d` | Phút, giờ, ngày |
| Every + rút gọn | `every 20m`, `every 2h` | |
| Every + từ | `every 5 minutes`, `every 2 hours` | Chấp nhận từ đơn vị số nhiều |
| Giây | `30s` | Ceil đến tối thiểu 1 phút; cron không biểu diễn được interval dưới một phút |

Interval không chia hết được làm tròn đến bước gọn gần nhất và in ghi chú. Ví dụ, `--every 7m` được làm tròn thành `6m` (`*/6`) vì 7 không chia hết 60.

Xem trước interval đã làm tròn trước khi đăng ký:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Nếu bỏ qua preview, command từ chối đăng ký interval đã làm tròn. Schedule dùng quy tắc giờ địa phương của OS scheduler đã chọn.

**Examples:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list {#schedule-list}

Liệt kê mọi scheduled job trên tất cả project, nhóm theo project và kèm OS drift state.

```
oma schedule list [--json]
```

**Options:**

| Flag | Mô tả |
|---|---|
| `--json` | Xuất JSON machine-readable |

**Drift states:**

| State | Ý nghĩa |
|---|---|
| `synced` | Job tồn tại trong cả manifest và OS scheduler |
| `stale` | Job đã được đăng ký, nhưng registration trong OS gọi một lệnh mà CLI hiện tại không còn chấp nhận (ví dụ `schedule:run <id>` được ghi trước khi chuẩn hóa command path). Chạy `schedule sync` để ghi lại; `oma update` tự động làm việc này. |
| `missing-in-os` | Job có trong manifest nhưng thiếu trong OS scheduler. Chạy `schedule sync` để sửa. |
| `orphan-in-os` | Job có trong OS scheduler nhưng không có trong manifest. Chạy `schedule sync --prune` để xóa. |

**Output (text):**

Job được nhóm theo project label. Mỗi dòng cho biết: ID, cron expression, agent, vendor, OS backend, có lặp hay không và drift state.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Examples:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete {#schedule-delete}

Xóa scheduled job khỏi cả manifest và OS scheduler.

```
oma schedule delete <id>
```

**Arguments:**

| Argument | Bắt buộc | Mô tả |
|---|---|---|
| `id` | Có | Job ID từ `schedule list` (format: `sch_<base32-12>`) |

Nếu xóa khỏi OS scheduler thất bại (ví dụ backend tạm thời không khả dụng), command in cảnh báo nhưng vẫn xóa manifest entry.

**Example:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run {#schedule-run}

Thực thi scheduled job theo ID. OS scheduler gọi command này lúc đến giờ và thường không gọi thủ công.

```
oma schedule run <id>
```

Wrapper:
1. Tra job ID trong manifest. Thoát khác 0 nếu không tìm thấy.
2. Load environment variable đã capture từ `~/.agents/schedule/env/<id>` (nếu có) và inject vào process được spawn.
3. Gọi `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Ghi run result vào `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Cập nhật `lastFiredAt` trong manifest.
6. Nếu đã đặt `--once`, tự xóa job (manifest + OS scheduler).

**Authentication failure được báo rõ:** nếu vendor credential hết hạn, job thoát với code khác 0 và in `re-auth required: <vendor>` ra stderr. Nó không thành công âm thầm. Có thể cấu hình notification `oma-voice` tùy chọn.

Có thể gọi `schedule run` thủ công để debug:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync {#schedule-sync}

Đồng bộ lại manifest với OS scheduler. Dùng sau system migration, OS scheduler reset hoặc để sửa drift.

```
oma schedule sync [--prune]
```

**Options:**

| Flag | Mô tả |
|---|---|
| `--prune` | Đồng thời xóa OS job có trong OS scheduler nhưng không có trong manifest (`orphan-in-os`). Nếu không có `--prune`, orphan chỉ được báo chứ không bị xóa. |

**Examples:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` chạy cùng bước reconciliation này (không có `--prune`) sau mỗi lần cập nhật, nên một bản phát hành CLI thay đổi cách viết lệnh `oma schedule run` không thể để các registration OS hiện có trỏ tới một lệnh mà binary mới từ chối. Các registration do phiên bản cũ ghi bằng `oma schedule:run <id>` cũng vẫn hoạt động: cách viết cũ đó vẫn được chấp nhận cho các job do OS gọi.

---

## Bố cục lưu trữ {#storage-layout}

Toàn bộ schedule state nằm dưới `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Permission:
- Thư mục `~/.agents/schedule/`: `0700`
- File `schedules.json` và `env/<id>`: `0600`

**Secret không bao giờ được ghi vào `schedules.json`.** Flag `--env` chỉ ghi key được nêu vào file riêng `0600` dưới `env/`. Chỉ các key được liệt kê rõ mới được capture; không bao giờ lưu toàn bộ environment dump.

---

## Ghi chú bảo mật {#security-notes}

- `schedule create` là trusted-path operation: chỉ user đã authenticate mới đăng ký job. Không expose `schedule create` cho input bên ngoài hoặc không đáng tin. Scheduled prompt là arbitrary code chạy ở thời điểm tương lai.
- `schedule run` chỉ thực thi job có ID tồn tại trong manifest. Không thể inject argv tùy ý.
- Vendor disk credential (ví dụ `~/.codex/auth.json`, `~/.grok/auth.json`) được dùng nguyên trạng cho headless dispatch. Không có authentication gating bổ sung. Nếu credential hết hạn, job sẽ loud-fail.

---

## Mẹo và khắc phục sự cố {#tips-and-troubleshooting}

**Kiểm tra run log:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**Job hiện `missing-in-os` sau system restart:**

Chạy `oma schedule sync` để đăng ký lại mọi manifest job với OS scheduler.

**Job đã chạy nhưng vendor credential hết hạn:**

Kiểm tra run log để tìm `re-auth required: <vendor>`. Authenticate lại bằng vendor CLI (ví dụ `claude login`, `codex login`) và chạy `oma schedule run <id>` thủ công để xác minh trước lần kích hoạt theo lịch tiếp theo.

**`--every` làm tròn interval của tôi:**

Khi oma làm tròn interval, nó in ghi chú giải thích thay đổi. Nếu cần interval chính xác không chia hết cho 60 phút hoặc 24 giờ, dùng `--cron` với expression 5 trường rõ ràng.

**Xóa mọi job của một project:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Hỗ trợ Windows:**

Trên Windows, oma dùng `schtasks` để đăng ký job. `schedule list` drift detection và `schedule sync` hoạt động giống nhau trên mọi platform.

Lưu ý rằng `schtasks` không biểu diễn được mọi cron shape. Các shape được hỗ trợ là: `*/N * * * *` (mỗi N phút), `M * * * *` (mỗi giờ tại :M), `M H * * *` (hằng ngày), `M H * * D` (hằng tuần; `D` có thể là một ngày, range như `1-5` hoặc comma list như `1,3,5`) và `M H D * *` (hằng tháng). Expression khác (ví dụ comma list ở minute field) bị từ chối lúc `schedule create` trên Windows.
