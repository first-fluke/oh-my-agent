---
title: "Hướng dẫn: Giám sát dashboard"
sidebar_label: Giám sát dashboard
description: Theo dõi session OMA từ terminal hoặc web dashboard loopback, chọn thư mục state và khắc phục các sự cố kết nối hoặc discovery thường gặp.
---

# Hướng dẫn: Giám sát dashboard

## Hai lệnh dashboard

oh-my-agent cung cấp hai dashboard thời gian thực để theo dõi hoạt động agent trong workflow nhiều agent.

| Lệnh | Giao diện | URL | Công nghệ |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (render trong terminal) | chokidar file watcher, picocolors rendering |
| `oma dashboard web` | Browser | `http://127.0.0.1:9847` (token in lúc khởi động) | HTTP server, WebSocket, chokidar file watcher |

Cả hai dashboard mặc định theo dõi `.agents/state/memories/`. Đặt `MEMORIES_DIR` khi file điều phối nằm ở nơi khác. Dashboard không tự fallback về `.serena/memories/`.

### Dashboard terminal

```bash
oma dashboard terminal
```


Giao diện box-drawing được render trực tiếp trong terminal. Nó tự cập nhật khi file memory thay đổi. Nhấn `Ctrl+C` để thoát.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```


**Ký hiệu trạng thái:**
- `●` (xanh lá): đang chạy
- `✓` (cyan): đã hoàn tất
- `✗` (đỏ): thất bại
- `○` (vàng): bị chặn
- `◌` (mờ): đang chờ

### Dashboard web

```bash
oma dashboard web
```


Khởi động web server chỉ trên loopback ở port 9847, có thể cấu hình qua `DASHBOARD_PORT`. OMA in URL chứa `127.0.0.1`; mở đúng URL và giữ token. Trang dùng token cho `/api/state`, `/api/recap` và cập nhật WebSocket. Request thiếu token trả `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```


Web dashboard hiển thị cùng thông tin với terminal dashboard, nhưng dùng UI dark-theme có style:

- Badge trạng thái kết nối: Connected, Disconnected hoặc Connecting với auto-reconnect.
- Session ID và status bar.
- Bảng trạng thái agent với status dot động.
- Activity feed mới nhất.
- Timestamp tự cập nhật.

---

## Bố cục 3 terminal khuyến nghị

Với workflow nhiều agent, nên dùng ba pane terminal:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```


**Terminal 1** chạy session agent chính, như Gemini CLI, Claude Code hoặc Codex, nơi bạn tương tác với `/orchestrate` hoặc `/work`.

**Terminal 2** chạy dashboard để theo dõi thụ động và tự cập nhật, không cần tương tác.

**Terminal 3** dành cho lệnh ad-hoc: kiểm tra trạng thái agent, chạy verification, xem stats hoặc debug.

---

## Nguồn dữ liệu trong .agents/state/memories/

Dashboard đọc thư mục `.agents/state/memories/`. Agent và workflow điền thư mục này bằng các file điều phối trong lúc chạy. Dùng `MEMORIES_DIR` nếu state của project ở nơi khác.

### Loại file và nội dung

| Mẫu file | Tạo bởi | Nội dung |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | Session ID, thời gian bắt đầu, status (RUNNING/COMPLETED/FAILED), version workflow |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Metadata session, tiến độ phase, tóm tắt yêu cầu user |
| `task-board.md` | Workflow orchestration | Bảng Markdown có assignment, status và task của agent |
| `progress-{agent}.md` | Mỗi agent được spawn | Số turn hiện tại, việc agent đang làm, kết quả trung gian |
| `result-{agent}.md` | Mỗi agent hoàn thành | Status cuối (COMPLETED/FAILED), file đổi, issue và deliverable |
| `debug-{id}.md` | Workflow `/debug` | Chẩn đoán lỗi, root cause, bản sửa, vị trí regression test |
| `experiment-ledger-{sessionId}.md` | Các experiment thực sự | Bằng chứng baseline/candidate có thể so sánh, các check bắt buộc và quyết định |
| `lessons-{sessionId}.md` | Khi nguyên nhân có thể tái sử dụng được bằng chứng hỗ trợ | Bài học theo phạm vi session; không tự tạo theo score |

### Dashboard đọc các file này như thế nào

Dashboard dùng nhiều chiến lược để trích xuất thông tin:

1. **Phát hiện session:** tìm `orchestrator-session.md` trước, rồi fallback về file `session-*.md` được sửa gần nhất. Đọc status từ keyword `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.
2. **Parse task board:** đọc `task-board.md` như bảng Markdown, lấy tên agent, status và mô tả task theo cột.
3. **Discovery agent:** nếu không có task board, quét file `.md` tìm pattern `**Agent**: {name}`, dòng `Agent: {name}` hoặc filename chứa `_agent` hay `-agent`.
4. **Đếm turn:** với mỗi agent được phát hiện, đọc file `progress-{agent}.md` và lấy số turn từ pattern `turn: N`.
5. **Activity feed:** liệt kê 5 file `.md` được sửa gần nhất, lấy dòng có ý nghĩa cuối cùng, như header, status hoặc action item. Web dashboard cũng cung cấp recap tại `/recap`.

---

## Dashboard hiển thị gì

### Trạng thái session

Phần đầu hiển thị:

- **Session ID:** lấy từ session file, định dạng `session-YYYYMMDD-HHMMSS`.
- **Status:** tô màu, RUNNING xanh lá, COMPLETED cyan, FAILED đỏ và UNKNOWN vàng.

### Task board

Bảng agent hiển thị mọi agent được phát hiện:

- **Tên agent:** identifier lĩnh vực, như backend, frontend, mobile, qa, debug và pm.
- **Status:** trạng thái hiện tại với chỉ báo trực quan: running, completed, failed, blocked hoặc pending.
- **Turn:** số turn hiện tại, tức số iteration đã hoàn thành; lấy từ progress file.
- **Task:** mô tả ngắn việc agent đang làm, cắt gọn cho vừa bảng.

### Tiến độ agent

Tiến độ được theo dõi qua file `progress-{agent}.md`. Agent cập nhật file trong lúc làm việc. Dashboard poll các file để lấy:

- Số turn, tăng khi agent tiến triển.
- Hành động hiện tại.
- Kết quả trung gian.

### Kết quả

Khi agent hoàn tất, nó ghi `result-{agent}.md` gồm:

- Status cuối, COMPLETED hoặc FAILED.
- Danh sách file đã đổi.
- Issue gặp phải.
- Deliverable đã tạo.

Dashboard phát hiện hoàn tất khi file này xuất hiện và cập nhật status agent.

---

## Runbook khắc phục sự cố

### Tín hiệu 1: agent hiện “running” nhưng turn không tiến

**Triệu chứng:** Dashboard hiện agent running nhưng turn không đổi trong vài phút.

**Nguyên nhân có thể:**
- Agent mắc ở thao tác lâu, như scan codebase lớn hoặc API chậm.
- Agent crash nhưng PID file vẫn còn.
- Agent đang chờ input user, điều này không nên xảy ra ở auto-approve mode.

**Hành động:**
1. Kiểm tra log agent: `cat /tmp/subagent-{session-id}-{agent-id}.log`.
2. Kiểm tra process thật sự chạy: `oma agent status {session-id} {agent-id}`.
3. Nếu process không chạy nhưng status còn “running”, agent đã crash. Spawn lại với context lỗi.

### Tín hiệu 2: agent hiện “crashed”

**Triệu chứng:** `oma agent status` trả về `crashed`.

**Nguyên nhân có thể:**
- Process CLI vendor thoát bất ngờ do thiếu memory, hết quota API hoặc timeout network.
- Workspace bị xóa hoặc permission thay đổi.
- CLI vendor chưa cài hoặc chưa auth.

**Hành động:**
1. Kiểm tra log: `cat /tmp/subagent-{session-id}-{agent-id}.log`.
2. Kiểm tra CLI: `oma doctor`.
3. Kiểm tra auth: `oma auth status`.
4. Spawn lại bằng command cũ: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`.

### Tín hiệu 3: dashboard hiện “no agents detected yet”

**Triệu chứng:** Dashboard chạy nhưng chưa có agent.

**Nguyên nhân có thể:**
- Workflow chưa tới bước spawn agent.
- Thư mục `.agents/state/memories/` rỗng.
- Dashboard theo dõi sai thư mục.

**Hành động:**
1. Xác minh thư mục memory: `ls -la .agents/state/memories/`.
2. Kiểm tra workflow còn ở phase planning không.
3. Đảm bảo dashboard theo dõi đúng project directory; dashboard resolve memory path từ current working directory.
4. Nếu dùng path tùy chỉnh: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`.

### Tín hiệu 4: web dashboard hiện “disconnected”

**Triệu chứng:** Badge kết nối hiện “Disconnected” màu đỏ.

**Nguyên nhân có thể:**
- Process `oma dashboard web` đã bị terminate.
- Browser dùng URL cũ hoặc thiếu startup token.
- Port đang bị process khác dùng.

**Hành động:**
1. Kiểm tra process: `ps aux | grep dashboard`.
2. Mở lại đúng URL có token do process in ra; không xóa token.
3. Thử port khác: `DASHBOARD_PORT=8080 oma dashboard web`.
4. Kiểm tra port: `lsof -i :9847`.
5. Web dashboard tự reconnect bằng exponential backoff, bắt đầu 1s, tối đa 10s. Chờ vài giây.

---

## Checklist giám sát trước merge

Trước khi coi session nhiều agent hoàn thành, xác minh qua dashboard:

- [ ] **Mọi agent hiển thị “completed”:** Không agent nào kẹt ở “running” hoặc “blocked”.
- [ ] **Không agent nào “failed”:** Nếu có, kiểm tra log và spawn lại.
- [ ] **QA agent đã review:** Tìm `result-qa-agent.md` hoặc `result-qa.md`.
- [ ] **Không có phát hiện CRITICAL/HIGH:** Kiểm tra số severity trong file QA.
- [ ] **Status session là COMPLETED:** Session file phải ghi status cuối.
- [ ] **Activity feed có report cuối:** Activity cuối nên là summary report.

---

## Tiêu chí hoàn tất

Giám sát dashboard hoàn tất khi:

1. Mọi agent được spawn đã vào trạng thái terminal, completed hoặc failed-and-handled.
2. Vòng QA kết thúc không có blocker.
3. Status session phản ánh kết quả cuối.
4. Result được lưu trong memory để tham khảo sau.

---

## Chi tiết kỹ thuật

### Dashboard terminal (oma dashboard terminal)

- **Theo dõi file:** Dùng [chokidar](https://github.com/paulmillr/chokidar) với `awaitWriteFinish`, ngưỡng ổn định 200ms và poll interval 50ms để tránh render file chưa hoàn chỉnh.
- **Render:** Xóa và vẽ lại toàn terminal ở mỗi file change event; dùng `picocolors` cho màu ANSI và ký tự box-drawing Unicode cho border.
- **Thư mục memory:** Resolve từ `MEMORIES_DIR`, rồi argument dashboard nếu được truyền, rồi `{cwd}/.agents/state/memories`.
- **Tắt an toàn:** Bắt `SIGINT` và `SIGTERM`, đóng watcher chokidar rồi thoát sạch.

### Dashboard web (oma dashboard web)

- **HTTP server:** Node.js `createServer` phục vụ trang HTML ở `/`, recap ở `/recap`, state JSON ở `/api/state` và recap data ở `/api/recap`; server bind vào `127.0.0.1`.
- **WebSocket:** Dùng thư viện `ws`. Kết nối loopback-origin phải có process token trong query string. Khi connect, client nhận full state ngay; update sau đó được đẩy dưới dạng message `{ type: "update", event, file, data }`.
- **Theo dõi file:** Dùng setup chokidar giống terminal; thay đổi file gọi function `broadcast()` để dựng state và gửi tới mọi WebSocket client.
- **Debounce:** Debounce update 100ms để tránh flood client khi nhiều agent ghi progress cùng lúc.
- **Auto-reconnect:** Browser reconnect bằng exponential backoff, initial 1s, multiplier 1.5x, max 10s khi WebSocket drop.
- **Port:** Mặc định 9847, cấu hình bằng env `DASHBOARD_PORT`. API request nhận `X-OMA-Dashboard-Token` hoặc `?token=...`; token thiếu hoặc sai trả `401`.
- **Dựng state:** Function `buildFullState()` gộp session info, task board, agent status, số turn và activity feed vào một JSON object ở mỗi update.
