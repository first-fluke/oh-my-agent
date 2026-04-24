---
title: "Hướng dẫn: Cấu hình model theo từng agent"
description: Cấu hình nhà cung cấp CLI, model và mức độ lập luận riêng cho từng agent thông qua oma-config.yaml và models.yaml. Bao gồm agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml và mức trần quota phiên.
---

# Hướng dẫn: Cấu hình model theo từng agent

## Tổng quan

oh-my-agent hỗ trợ **chọn model theo từng agent** thông qua `agent_cli_mapping`. Mỗi agent (pm, backend, frontend, qa, …) có thể nhắm tới một nhà cung cấp, model và mức độ lập luận riêng biệt, thay vì dùng chung một nhà cung cấp toàn cục.

Trang này đề cập:

1. Phân cấp cấu hình ba file
2. Định dạng kép của `agent_cli_mapping`
3. Các preset runtime profile
4. Lệnh `oma doctor --profile`
5. Slug model do người dùng định nghĩa trong `models.yaml`
6. Mức trần quota phiên

---

## Phân cấp file cấu hình

oh-my-agent đọc cấu hình từ ba file theo thứ tự ưu tiên (cao xuống thấp):

| File | Mục đích | Chỉnh sửa? |
|:-----|:---------|:-----------|
| `.agents/oma-config.yaml` | Override của người dùng — mapping agent↔CLI, profile đang bật, quota phiên | Có |
| `.agents/config/models.yaml` | Slug model do người dùng cung cấp (bổ sung cho registry mặc định) | Có |
| `.agents/config/defaults.yaml` | Baseline Profile B gắn sẵn (5 `runtime_profiles`, fallback an toàn) | Không — SSOT |

> `defaults.yaml` là một phần của SSOT và không được sửa trực tiếp. Mọi tuỳ chỉnh đều thực hiện trong `oma-config.yaml` và `models.yaml`.

---

## Định dạng kép của `agent_cli_mapping`

`agent_cli_mapping` chấp nhận hai dạng giá trị để bạn có thể migrate dần:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — chỉ ghi nhà cung cấp (dùng model mặc định)
  backend:                            # object AgentSpec mới
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Dạng string legacy**: `agent: "vendor"` — vẫn hoạt động; sử dụng model mặc định của nhà cung cấp với effort mặc định thông qua runtime profile tương ứng.

**Dạng object AgentSpec**: `agent: { model, effort }` — cố định chính xác slug model và mức độ lập luận (`low`, `medium`, `high`).

Có thể kết hợp thoải mái. Agent không khai báo sẽ rơi về `runtime_profile` đang bật, sau đó đến `agent_defaults` cấp cao nhất trong `defaults.yaml`.

---

## Runtime Profiles

`defaults.yaml` đi kèm Profile B với năm `runtime_profiles` sẵn sàng sử dụng. Chọn một profile trong `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # xem các tuỳ chọn bên dưới
```

| Profile | Toàn bộ agent đi tới | Dùng khi |
|:--------|:---------------------|:---------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic thống nhất |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack thuần OpenAI |
| `gemini-only` | Gemini CLI | Workflow xoay quanh Google |
| `antigravity` | Hỗn hợp: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Kết hợp thế mạnh nhiều nhà cung cấp |
| `qwen-only` | Qwen Code | Suy luận local / tự host |

Profile là cách nhanh để tái cấu hình toàn bộ đội agent mà không cần sửa từng dòng.

---

## `oma doctor --profile`

Cờ `--profile` in ra ma trận hiển thị nhà cung cấp, model và effort đã resolve cho từng agent — sau khi hợp nhất `oma-config.yaml`, `models.yaml` và `defaults.yaml`.

```bash
oma doctor --profile
```

**Ví dụ output:**

```
oh-my-agent — Profile Health (runtime=claude)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ pm           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │
│ frontend     │ openai/gpt-5.4               │ codex    │ ✗ not logged in  │
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┘
```

Mỗi hàng hiển thị slug model đã resolve (sau khi hợp nhất `oma-config.yaml` + active profile + `defaults.yaml`) và cho biết bạn đã đăng nhập vào CLI sẽ thực thi role đó hay chưa. Dùng lệnh này bất cứ khi nào subagent chọn nhà cung cấp ngoài dự kiến.

---

## Thêm slug trong `models.yaml`

`models.yaml` là tuỳ chọn, cho phép đăng ký slug model chưa có trong registry mặc định — hữu ích với các model mới ra mắt.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Sau khi đăng ký, slug có thể dùng trong `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slug là định danh — giữ nguyên tiếng Anh đúng như nhà cung cấp công bố.

---

## Mức trần quota phiên

Thêm `session.quota_cap` vào `oma-config.yaml` để giới hạn việc spawn subagent mất kiểm soát:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # trần token cho toàn phiên
    spawn_count: 40          # số subagent song song + tuần tự tối đa
    per_vendor:              # sub-limit token theo nhà cung cấp
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Khi chạm trần, orchestrator từ chối spawn tiếp và báo trạng thái `QUOTA_EXCEEDED`. Bỏ trống một trường (hoặc loại bỏ cả `quota_cap`) sẽ tắt chiều giới hạn tương ứng.

---

## Tổng hợp

Một `oma-config.yaml` thực tế:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Chạy `oma doctor --profile` để xác nhận kết quả resolve, rồi khởi động workflow như bình thường.


## Quyền sở hữu file cấu hình

| File | Chủ sở hữu | Có thể chỉnh sửa? |
|------|------------|-------------------|
| `.agents/config/defaults.yaml` | SSOT đi kèm oh-my-agent | Không — coi như chỉ đọc |
| `.agents/oma-config.yaml` | Bạn | Có — tuỳ chỉnh tại đây |
| `.agents/config/models.yaml` | Bạn | Có — thêm slug mới tại đây |

`defaults.yaml` có trường `version:` để các bản phát hành oh-my-agent mới có thể thêm runtime_profiles, slug Profile B mới hoặc điều chỉnh ma trận effort. Nếu sửa trực tiếp, bạn sẽ không nhận được các nâng cấp đó một cách tự động.

## Nâng cấp defaults.yaml

Khi bạn kéo bản phát hành oh-my-agent mới hơn, hãy chạy `oma install` — trình cài đặt so sánh phiên bản `defaults.yaml` cục bộ của bạn với phiên bản đi kèm:

- **Khớp** → không thay đổi, âm thầm.
- **Không khớp** → cảnh báo:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Không khớp + `--update-defaults`** → phiên bản đi kèm ghi đè phiên bản của bạn:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`models.yaml` không bao giờ bị trình cài đặt chạm vào. `oma-config.yaml` cũng được giữ nguyên, với một ngoại lệ: `oma install` ghi lại dòng `language:` và làm mới khối `vendors:` dựa trên các câu trả lời của bạn trong quá trình cài đặt. Mọi trường khác bạn thêm vào (ví dụ: `agent_cli_mapping`, `active_profile`, `session.quota_cap`) đều được giữ nguyên qua các lần chạy.

## Nâng cấp từ bản cài đặt trước 5.16.0

Nếu dự án của bạn ra đời trước tính năng model/effort theo từng agent:

1. Chạy `oma install` (hoặc `oma update`) từ thư mục gốc dự án. Trình cài đặt thả một `defaults.yaml` mới vào `.agents/config/` và chạy migration `003-oma-config`, tự động chuyển `.agents/config/user-preferences.yaml` cũ (nếu có) sang `.agents/oma-config.yaml`.
2. Chạy `oma doctor --profile`. Các giá trị `agent_cli_mapping: { backend: "gemini" }` hiện có của bạn được resolve qua `runtime_profiles.gemini-only.agent_defaults.backend`, nên ma trận hiển thị đúng slug và CLI một cách tự động.
3. (Tuỳ chọn) Nâng cấp các entry dạng string legacy sang dạng AgentSpec mới trong `oma-config.yaml` khi bạn muốn override `model`, `effort`, `thinking` hoặc `memory` riêng cho từng agent:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Nếu bạn từng tuỳ chỉnh `defaults.yaml`, `oma install` sẽ cảnh báo về sự không khớp phiên bản thay vì ghi đè. Hãy chuyển các tuỳ chỉnh của bạn vào `oma-config.yaml` / `models.yaml`, rồi chạy `oma install --update-defaults` để chấp nhận SSOT mới.

Không có thay đổi phá vỡ đối với `agent:spawn` — cấu hình cũ vẫn hoạt động thông qua graceful fallback trong khi bạn migrate theo tiến độ của mình.
