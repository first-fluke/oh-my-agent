---
title: Thực thi song song
description: Hướng dẫn đầy đủ về chạy nhiều agent oh-my-agent đồng thời — cú pháp agent:spawn với tất cả tùy chọn, chế độ inline agent:parallel, mẫu nhận biết workspace, cấu hình đa CLI, ưu tiên phân giải vendor, giám sát bằng dashboard, chiến lược session ID và anti-pattern cần tránh.
---

# Thực thi song song

Ưu điểm cốt lõi của oh-my-agent là chạy nhiều agent chuyên biệt đồng thời. Trong khi agent backend triển khai API, agent frontend tạo giao diện và agent mobile xây dựng màn hình ứng dụng — tất cả được điều phối qua bộ nhớ chia sẻ.

---

## agent:spawn — Spawn agent đơn lẻ

### Cú pháp cơ bản

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Tham số

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `agent-id` | Có | Định danh agent: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Có | Mô tả task (chuỗi trong ngoặc kép hoặc đường dẫn đến file prompt) |
| `session-id` | Có | Nhóm các agent làm việc trên cùng tính năng. Định dạng: `session-YYYYMMDD-HHMMSS` hoặc chuỗi duy nhất bất kỳ. |
| `options` | Không | Xem bảng tùy chọn bên dưới |

### Tùy chọn

| Flag | Viết tắt | Mô tả |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Thư mục làm việc cho agent. Agent chỉ sửa file trong thư mục này. |
| `--model <name>` | `-m` | Ghi đè vendor CLI cho spawn cụ thể này. Tùy chọn: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Ghi đè giới hạn lượt mặc định cho agent này. |
| `--json` | | Xuất kết quả dạng JSON (hữu ích cho scripting). |
| `--no-wait` | | Fire and forget — trả về ngay không đợi hoàn thành. |

### Ví dụ

```bash
# Spawn agent backend với vendor mặc định
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn với cô lập workspace
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Ghi đè vendor cho agent cụ thể này
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Đặt giới hạn lượt cao hơn cho task phức tạp
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Dùng file prompt thay vì text trực tiếp
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Spawn song song với tiến trình nền

Để chạy nhiều agent đồng thời, dùng tiến trình nền shell:

```bash
# Spawn 3 agent song song
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Chặn cho đến khi tất cả agent hoàn thành
```

`&` chạy mỗi agent ở nền. `wait` chặn cho đến khi tất cả tiến trình nền kết thúc.

### Mẫu nhận biết workspace

Luôn gán workspace riêng biệt khi chạy agent song song để ngăn xung đột file:

```bash
# Thực thi song song fullstack
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Sau triển khai, chạy QA (tuần tự — phụ thuộc vào triển khai)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Chế độ song song inline

Cú pháp gọn hơn tự động quản lý tiến trình nền:

### Cú pháp

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Ví dụ

```bash
# Thực thi song song cơ bản
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Với no-wait (fire and forget)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Tất cả agent chia sẻ cùng session tự động
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

Flag `-i` (inline) cho phép chỉ định cặp agent-prompt trực tiếp trong lệnh.

---

## Cấu hình đa CLI

Không phải tất cả AI CLI đều hoạt động tốt như nhau ở mọi lĩnh vực. oh-my-agent cho phép bạn định tuyến agent đến CLI xử lý lĩnh vực đó tốt nhất.

### Ví dụ cấu hình đầy đủ

```yaml
# .agents/oma-config.yaml

# Ngôn ngữ phản hồi
language: en

# Định dạng ngày cho báo cáo
date_format: "YYYY-MM-DD"

# Múi giờ cho timestamp
timezone: "Asia/Seoul"

# CLI mặc định (dùng khi không có ánh xạ agent cụ thể)
default_cli: gemini

# Định tuyến CLI theo agent
agent_cli_mapping:
  frontend: claude       # Suy luận UI phức tạp, tổ hợp component
  backend: gemini        # Scaffold API nhanh, tạo CRUD
  mobile: gemini         # Tạo mã Flutter nhanh
  db: gemini             # Thiết kế schema nhanh
  pm: gemini             # Phân tách task nhanh
  qa: claude             # Đánh giá bảo mật và accessibility kỹ lưỡng
  debug: claude          # Phân tích nguyên nhân gốc sâu, truy vết symbol
  design: claude         # Quyết định thiết kế tinh tế, phát hiện anti-pattern
  tf-infra: gemini       # Tạo HCL
  dev-workflow: gemini   # Cấu hình task runner
  translator: claude     # Dịch thuật tinh tế với nhạy cảm văn hóa
  orchestrator: gemini   # Điều phối nhanh
  commit: gemini         # Tạo commit message đơn giản
```

### Ưu tiên phân giải vendor

Khi `oma agent:spawn` xác định CLI nào sử dụng, nó theo ưu tiên sau (cao nhất thắng):

| Ưu tiên | Nguồn | Ví dụ |
|----------|--------|---------|
| 1 (cao nhất) | Flag `--model` | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` trong oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` trong oma-config.yaml |
| 4 | `active_vendor` | Cài đặt cũ `cli-config.yaml` |
| 5 (thấp nhất) | Dự phòng cứng | `gemini` |

Nghĩa là flag `--model` luôn thắng. Nếu không có flag, hệ thống kiểm tra ánh xạ agent cụ thể, rồi mặc định, rồi config cũ, và cuối cùng dự phòng Gemini.

---

## Phương thức spawn đặc thù vendor

Cơ chế spawn thay đổi theo IDE/CLI:

| Vendor | Cách spawn agent | Xử lý kết quả |
|--------|----------------------|-----------------|
| **Claude Code** | `Agent` tool với định nghĩa `.claude/agents/{name}.md`. Nhiều lệnh Agent trong cùng message = song song thực sự. | Trả về đồng bộ |
| **Codex CLI** | Yêu cầu subagent song song qua mô hình trung gian | Đầu ra JSON |
| **Gemini CLI** | Lệnh CLI `oma agent:spawn` | Poll MCP memory |
| **Antigravity IDE** | Chỉ `oma agent:spawn` (subagent tùy chỉnh không có sẵn) | Poll MCP memory |
| **CLI Fallback** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Poll file kết quả |

Khi chạy trong Claude Code, workflow dùng `Agent` tool trực tiếp:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Nhiều lệnh Agent tool trong cùng message thực thi như song song thực sự — không đợi tuần tự.

---

## Giám sát agent

### Dashboard terminal

```bash
oma dashboard
```

Hiển thị bảng trực tiếp với:
- Session ID và trạng thái tổng thể
- Trạng thái từng agent (running, completed, failed)
- Số lượt
- Hoạt động mới nhất từ file progress
- Thời gian trôi qua

Dashboard theo dõi `.serena/memories/` cho cập nhật thời gian thực. Nó làm mới khi agent ghi tiến trình.

### Dashboard web

```bash
oma dashboard:web
# Mở http://localhost:9847
```

Tính năng:
- Cập nhật thời gian thực qua WebSocket
- Tự kết nối lại khi mất kết nối
- Chỉ báo trạng thái agent có màu
- Luồng log hoạt động từ file progress và kết quả
- Lịch sử phiên

### Bố cục terminal khuyến nghị

Dùng 3 terminal cho khả năng quan sát tối ưu:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Lệnh spawn        │
│   (giám sát trực tiếp)  │   agent              │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Log test/build, thao tác git                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Kiểm tra trạng thái agent cá nhân

```bash
oma agent:status <session-id> <agent-id>
```

Trả về trạng thái hiện tại của agent cụ thể: running, completed hoặc failed, cùng số lượt và hoạt động cuối.

---

## Chiến lược Session ID

Session ID nhóm các agent làm việc trên cùng tính năng. Thực hành tốt nhất:

- **Một session cho mỗi tính năng:** Tất cả agent làm "user authentication" chia sẻ `session-auth-01`
- **Định dạng:** Dùng ID mô tả: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Tự tạo:** Orchestrator tạo ID theo định dạng `session-YYYYMMDD-HHMMSS`
- **Tái sử dụng cho lặp lại:** Dùng cùng session ID khi re-spawn agent với tinh chỉnh

Session ID quyết định:
- File bộ nhớ nào agent đọc và ghi (`progress-{agent}.md`, `result-{agent}.md`)
- Dashboard giám sát gì
- Cách kết quả được nhóm trong báo cáo cuối

---

## Mẹo thực thi song song

### Nên

1. **Khóa API contract trước.** Chạy `/plan` trước khi spawn agent triển khai để agent frontend và backend thống nhất về endpoint, schema request/response và định dạng lỗi.

2. **Dùng một session ID cho mỗi tính năng.** Giữ đầu ra agent được nhóm và giám sát dashboard mạch lạc.

3. **Gán workspace riêng biệt.** Luôn dùng `-w` để cô lập agent:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Giám sát tích cực.** Mở terminal dashboard để phát hiện vấn đề sớm — agent thất bại lãng phí lượt nếu không được phát hiện nhanh.

5. **Chạy QA sau triển khai.** Spawn agent QA tuần tự sau khi tất cả agent triển khai hoàn thành:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Lặp lại bằng re-spawn.** Nếu đầu ra agent cần tinh chỉnh, re-spawn với task gốc cộng ngữ cảnh sửa. Không bắt đầu session mới.

7. **Bắt đầu với `/work` nếu không chắc chắn.** Workflow work hướng dẫn bạn qua quy trình từng bước với xác nhận người dùng ở mỗi cổng.

### Không nên

1. **Không spawn agent trong cùng workspace.** Hai agent ghi vào cùng thư mục sẽ tạo xung đột merge và ghi đè công việc của nhau.

2. **Không vượt MAX_PARALLEL (mặc định 3).** Nhiều agent đồng thời hơn không phải lúc nào cũng nhanh hơn. Mỗi agent cần tài nguyên bộ nhớ và CPU. Mặc định 3 được điều chỉnh cho hầu hết hệ thống.

3. **Không bỏ qua bước lập kế hoạch.** Spawn agent không có kế hoạch dẫn đến triển khai không đồng bộ — frontend xây dựng theo một hình dạng API trong khi backend xây theo hình dạng khác.

4. **Không bỏ qua agent thất bại.** Công việc của agent thất bại chưa hoàn thành. Kiểm tra `result-{agent}.md` để biết lý do thất bại, sửa prompt và re-spawn.

5. **Không trộn session ID cho công việc liên quan.** Nếu agent backend và frontend đang làm cùng tính năng, chúng phải chia sẻ session ID để orchestrator có thể điều phối.

---

## Ví dụ đầu cuối

Quy trình thực thi song song hoàn chỉnh cho xây dựng tính năng xác thực người dùng:

```bash
# Bước 1: Lập kế hoạch tính năng
# (Trong AI IDE, chạy /plan hoặc mô tả tính năng)
# Tạo .agents/plan.json với phân tách task

# Bước 2: Spawn agent triển khai song song
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Bước 3: Giám sát trong terminal riêng
# Terminal 2:
oma dashboard

# Bước 4: Đợi tất cả agent triển khai
wait

# Bước 5: Chạy đánh giá QA
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Bước 6: Nếu QA tìm thấy vấn đề, re-spawn agent cụ thể với bản sửa
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Bước 7: Chạy lại QA để xác minh bản sửa
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
