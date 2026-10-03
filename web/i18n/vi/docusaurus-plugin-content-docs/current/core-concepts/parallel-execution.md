---
title: Thực thi song song
description: Chạy nhiều vai trò dispatch OMA song song với cú pháp CLI hiện tại, task file, chế độ inline, cô lập workspace, phân giải model và vendor, giám sát, session ID và mẫu phục hồi.
---

# Thực thi song song

Ưu điểm cốt lõi của oh-my-agent là chạy đồng thời nhiều agent chuyên biệt. Trong khi agent backend triển khai API, agent frontend tạo UI và agent mobile xây dựng màn hình ứng dụng, orchestrator điều phối chúng qua run state và receipt bền vững.

---

## agent:spawn: spawn một agent

### Cú pháp cơ bản

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Tham số

| Tham số | Bắt buộc | Mô tả |
|-----------|----------|-------------|
| `agent-id` | Có | Vai trò dispatch chuẩn: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` hoặc `explore` |
| `prompt` | Có | Mô tả task (chuỗi được quote hoặc đường dẫn tới prompt file) |
| `session-id` | Có | Nhóm các agent cùng làm một tính năng. Định dạng `session-YYYYMMDD-HHMMSS` hoặc chuỗi duy nhất bất kỳ. |
| `options` | Không | Xem bảng options bên dưới |

### Tùy chọn

| Flag | Viết tắt | Mô tả |
|------|------|-------------|
| `--workspace <path>` | `-w` | Thư mục làm việc của agent. Agent chỉ sửa file trong thư mục này. |
| `--vendor <vendor>` | | Ghi đè vendor CLI cho lần spawn này (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` hoặc `pi`). |
| `--resumed-from <run-id>` |  | Liên kết lần retry với run trước đó có evidence. |
| `--fallback-vendors <vendors>` |  | Các vendor fallback theo thứ tự, phân tách bằng dấu phẩy, khi vendor chính không chạy được. |
| `--task-id <id>` |  | Gắn spawn với task ID trong session plan. |
| `--isolation <mode>` |  | `worktree` tạo git worktree mới trong thư mục worktree tạm OMA. Worktree được giữ lại để review và merge/discard. |
| `--read-only` |  | Giới hạn agent ở các tool không phá hủy. |

### Ví dụ

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Spawn song song với tiến trình nền

Để chạy nhiều agent đồng thời, dùng các tiến trình nền của shell:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Dấu `&` chạy mỗi agent ở background. `wait` chặn cho tới khi mọi tiến trình background hoàn tất.

### Mẫu nhận biết workspace {#workspace-aware-pattern}

Luôn gán workspace riêng khi chạy agent song song để tránh xung đột file:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: chế độ song song inline

Để có cú pháp gọn hơn, tự quản lý tiến trình nền:

### Cú pháp

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Ví dụ

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

Flag `--inline` phân tích từng đối số `agent:task`. Thêm đường dẫn phân tách bằng dấu hai chấm thứ ba (`agent:task:workspace`) khi task cần workspace cụ thể. Không có `--inline`, truyền task file YAML dạng `{tasks: [{id?, agent, task, workspace?}]}`. `--session` gắn kết quả song song với session hiện có.

---

## Cấu hình đa CLI

oh-my-agent định tuyến từng agent tới CLI phù hợp qua `model_preset` trong `.agents/oma-config.yaml`. Chọn preset dựng sẵn cho vendor bạn dùng và có thể override từng agent.

### Ví dụ cấu hình

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Các preset dựng sẵn: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` và `mixed`. Xem [Per-Agent Models](../guide/per-agent-models.md) để biết chi tiết.

### Phân giải vendor

Khi `oma agent spawn` quyết định CLI sẽ dùng:

| Ưu tiên | Nguồn | Ví dụ |
|----------|--------|---------|
| 1 (cao nhất) | Flag `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | Override `agents:` trong `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Mặc định agent của `model_preset` đang hoạt động | Tra cứu preset theo vai trò agent |

Flag `--vendor` luôn được ưu tiên. Nếu không có flag, hệ thống kiểm tra override `agents:`, rồi mặc định preset, sau đó CLI fallback đã cấu hình. Với `model_preset: auto`, setting native của runtime hiện tại cung cấp model.

---

## Phương thức spawn theo vendor

Cơ chế spawn thay đổi theo IDE/CLI:

| Vendor | Cách spawn agent | Xử lý kết quả |
|--------|------------------|----------------|
| **Claude Code** | Task cùng vendor dùng Agent tool với `.claude/agents/{name}.md`; task khác vendor fallback về `oma agent spawn`. | Trả về đồng bộ |
| **Codex CLI** | Task cùng vendor dùng custom agent native từ `.codex/agents/{name}.toml`; task khác vendor fallback về `oma agent spawn`. | Output JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` qua runtime `agy`; không cần subagent native tùy chỉnh | Poll receipt và result file bền vững |
| **Cursor** | Dùng integration Cursor đã tạo khi có; nếu không thì `oma agent spawn` | Poll result file |
| **OpenCode / pi** | Dùng extension bridge trong process khi được chọn; công việc khác vendor dùng `oma agent spawn` | Poll result file |
| **CLI Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Poll result có evidence |

Khi chạy trong Claude Code, workflow gọi trực tiếp `Agent` tool:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Nhiều lần gọi Agent tool trong cùng message chạy song song thật sự, không chờ tuần tự.

Quy tắc dispatch áp dụng tương tự giữa các vendor:

1. Resolve `target_vendor_for_agent` từ `.agents/oma-config.yaml`
2. Nếu khớp vendor runtime hiện tại, dùng file agent native của vendor đó
3. Nếu không khớp, chỉ dùng `oma agent spawn` cho agent đó

---

## Giám sát agent

### Dashboard terminal

```bash
oma dashboard terminal
```

Hiển thị bảng trực tiếp với:
- Session ID và trạng thái tổng thể
- Trạng thái từng agent (running, completed, failed)
- Số lượt
- Hoạt động gần nhất từ file progress
- Thời gian đã trôi qua

Dashboard theo dõi `.agents/state/memories/` để cập nhật thời gian thực và làm mới khi agent ghi progress.

### Dashboard web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Tính năng:
- Cập nhật thời gian thực qua WebSocket
- Tự kết nối lại khi mất kết nối
- Chỉ báo trạng thái agent có màu
- Luồng log hoạt động từ file progress và kết quả
- Lịch sử session

### Bố cục terminal khuyến nghị

Dùng 3 terminal để quan sát tối ưu:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Kiểm tra trạng thái agent cá nhân

```bash
oma agent status <session-id> <agent-id>
```

Trả về trạng thái hiện tại của agent cụ thể: running, completed hoặc failed, cùng số lượt và hoạt động cuối.

---

## Chiến lược session ID

Session ID nhóm các agent cùng làm một tính năng. Thực hành tốt:

- **Một session cho mỗi tính năng:** Mọi agent làm “user authentication” dùng chung `session-auth-01`
- **Định dạng:** Dùng ID mô tả: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Tự tạo:** Orchestrator tạo ID theo định dạng `session-YYYYMMDD-HHMMSS`
- **Tái sử dụng khi lặp:** Dùng cùng session ID khi spawn lại agent với tinh chỉnh

Session ID quyết định:
- File memory theo run mà agent đọc và ghi (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- Dashboard giám sát gì
- Kết quả được nhóm thế nào trong báo cáo cuối

---

## Mẹo thực thi song song

### Nên

1. **Khóa API contract trước.** Chạy `/plan` trước khi spawn agent triển khai để agent frontend và backend thống nhất endpoint, schema request/response và định dạng lỗi.
2. **Dùng một session ID cho mỗi tính năng.** Giữ output agent được nhóm và dashboard giám sát mạch lạc.
3. **Gán workspace riêng.** Luôn dùng `-w` để cô lập agent:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Giám sát tích cực.** Mở dashboard terminal để phát hiện vấn đề sớm. Agent thất bại sẽ lãng phí lượt nếu không được phát hiện nhanh.
5. **Chạy QA sau triển khai.** Spawn agent QA tuần tự sau khi mọi agent triển khai hoàn tất:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Lặp lại bằng spawn lại.** Nếu output agent cần tinh chỉnh, spawn lại với task gốc và ngữ cảnh sửa. Không bắt đầu session mới.
7. **Bắt đầu bằng `/work` nếu chưa chắc.** Workflow work hướng dẫn từng bước với xác nhận người dùng ở mỗi cổng.

### Không nên

1. **Không spawn agent trong cùng workspace.** Hai agent ghi vào cùng thư mục sẽ tạo xung đột merge và ghi đè công việc.
2. **Không vượt quá MAX_PARALLEL (mặc định 3).** Nhiều agent đồng thời hơn không phải lúc nào cũng nhanh hơn. Mỗi agent cần tài nguyên bộ nhớ và CPU; mặc định 3 phù hợp với hầu hết hệ thống.
3. **Không bỏ qua bước plan.** Spawn agent không có kế hoạch dẫn đến triển khai lệch nhau: frontend dựa trên một hình dạng API trong khi backend xây hình dạng khác.
4. **Không bỏ qua agent thất bại.** Công việc chưa hoàn thành. Kiểm tra structured claim hoặc result file theo run để biết lý do, sửa prompt và spawn lại.
5. **Không trộn session ID cho công việc liên quan.** Nếu agent backend và frontend làm cùng tính năng, chúng phải dùng chung session ID để orchestrator điều phối.

---

## Ví dụ đầu cuối

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
