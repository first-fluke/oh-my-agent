---
title: "Hướng dẫn: Giám sát Dashboard"
description: Hướng dẫn dashboard toàn diện bao gồm dashboard terminal và web, nguồn dữ liệu, bố cục 3 terminal, khắc phục sự cố và chi tiết triển khai kỹ thuật.
---

# Hướng dẫn: Giám sát Dashboard

## Hai lệnh dashboard

oh-my-agent cung cấp hai dashboard thời gian thực để giám sát hoạt động agent trong workflow đa agent.

| Lệnh | Giao diện | URL | Công nghệ |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/A — render trong terminal | chokidar file watcher, picocolors rendering |
| `oma dashboard:web` | Trình duyệt | `http://localhost:9847` | HTTP server, WebSocket, chokidar file watcher |

Cả hai dashboard theo dõi cùng nguồn dữ liệu: thư mục `.serena/memories/`.

### Dashboard terminal

```bash
oma dashboard
```

Render giao diện box-drawing trực tiếp trong terminal. Tự động cập nhật khi file bộ nhớ thay đổi. Nhấn `Ctrl+C` để thoát.

**Ký hiệu trạng thái:**
- `●` (xanh lá) — đang chạy
- `✓` (cyan) — hoàn thành
- `✗` (đỏ) — thất bại
- `○` (vàng) — bị chặn
- `◌` (mờ) — đang chờ

### Dashboard web

```bash
oma dashboard:web
```

Mở web server trên cổng 9847 (có thể cấu hình qua biến môi trường `DASHBOARD_PORT`). Giao diện trình duyệt kết nối qua WebSocket và nhận cập nhật trực tiếp với giao diện dark-theme.

---

## Bố cục 3 terminal khuyến nghị

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Agent chính      │   Terminal 2: Dashboard        │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Lệnh ad-hoc                                      │
│   $ oma agent:status session-id backend frontend                │
│   $ oma stats                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Nguồn dữ liệu trong .serena/memories/

| Mẫu file | Tạo bởi | Nội dung |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` | Session ID, thời gian bắt đầu, trạng thái |
| `task-board.md` | Workflow điều phối | Bảng Markdown với phân công, trạng thái agent |
| `progress-{agent}.md` | Mỗi agent được spawn | Số lượt hiện tại, đang làm gì |
| `result-{agent}.md` | Mỗi agent hoàn thành | Trạng thái cuối, file thay đổi, sản phẩm |

---

## Khắc phục sự cố

### Tín hiệu 1: Agent hiện "running" nhưng không có tiến trình lượt

**Hành động:**
1. Kiểm tra file log agent: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Kiểm tra tiến trình: `oma agent:status {session-id} {agent-id}`
3. Nếu tiến trình không chạy, agent đã crash. Re-spawn với ngữ cảnh lỗi.

### Tín hiệu 2: Agent hiện "crashed"

**Hành động:** Kiểm tra log, xác minh cài đặt CLI (`oma doctor`), kiểm tra xác thực (`oma auth:status`), re-spawn agent.

### Tín hiệu 3: Dashboard hiện "No agents detected yet"

**Hành động:** Xác minh thư mục memories, kiểm tra workflow có đang ở giai đoạn lập kế hoạch không, đảm bảo dashboard theo dõi đúng thư mục.

### Tín hiệu 4: Dashboard web hiện "Disconnected"

**Hành động:** Kiểm tra tiến trình dashboard, thử cổng khác, kiểm tra cổng có sẵn. Dashboard web tự kết nối lại với backoff mũ (bắt đầu 1s, tối đa 10s).

---

## Checklist giám sát trước merge

- [ ] **Tất cả agent hiện "completed"**
- [ ] **Không agent nào hiện "failed"**
- [ ] **Agent QA đã hoàn thành đánh giá**
- [ ] **Không còn phát hiện CRITICAL/HIGH**
- [ ] **Trạng thái phiên là COMPLETED**
- [ ] **Luồng hoạt động hiện báo cáo cuối**
