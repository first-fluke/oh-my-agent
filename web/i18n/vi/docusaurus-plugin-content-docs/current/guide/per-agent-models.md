---
title: "Hướng dẫn: cấu hình model theo từng agent"
description: Với RARDO v2.1, cấu hình nhà cung cấp CLI, model và mức độ lập luận riêng cho từng agent. Bao gồm agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml và mức trần quota phiên.
---

# Hướng dẫn: cấu hình model theo từng agent

## Tổng quan

RARDO v2.1 giới thiệu khả năng **chọn model theo từng agent** thông qua `agent_cli_mapping`. Mỗi agent (pm, backend, frontend, qa…) giờ có thể nhắm tới nhà cung cấp, model và mức độ lập luận riêng — thay vì cùng dùng một nhà cung cấp toàn cục.

Trang này đề cập:

1. Phân cấp cấu hình ba file
2. Định dạng kép của `agent_cli_mapping`
3. Các preset runtime profile
4. Lệnh `oma doctor --profile`
5. Slug model do người dùng định nghĩa trong `models.yaml`
6. Mức trần quota phiên

---

## Phân cấp file cấu hình

RARDO v2.1 đọc ba file theo thứ tự ưu tiên (cao xuống thấp):

| File | Mục đích | Chỉnh sửa? |
|:-----|:---------|:-----------|
| `.agents/config/user-preferences.yaml` | Override của người dùng — mapping agent↔CLI, profile đang bật, quota phiên | Có |
| `.agents/config/models.yaml` | Slug model do người dùng cung cấp (bổ sung cho registry mặc định) | Có |
| `.agents/config/defaults.yaml` | Baseline Profile B gắn sẵn (4 `runtime_profiles`, fallback an toàn) | Không — SSOT |

> `defaults.yaml` thuộc SSOT, không sửa trực tiếp. Mọi tuỳ chỉnh nằm ở `user-preferences.yaml` và `models.yaml`.

---

## Định dạng kép của `agent_cli_mapping`

`agent_cli_mapping` chấp nhận hai dạng giá trị để migrate dần:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — chỉ ghi nhà cung cấp (dùng model mặc định)
  backend:                            # object AgentSpec mới
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Dạng string legacy**: `agent: "vendor"` — vẫn hoạt động; dùng model và effort mặc định của nhà cung cấp.

**Dạng object AgentSpec**: `agent: { model, effort }` — cố định slug model chính xác và mức lập luận (`low`, `medium`, `high`).

Có thể trộn thoải mái. Agent không khai báo sẽ rơi về `runtime_profile` đang bật.

---

## Runtime profiles

`defaults.yaml` đi kèm Profile B cùng bốn `runtime_profiles` sẵn sàng. Chọn một trong `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # xem bảng dưới
```

| Profile | Toàn bộ agent đi tới | Dùng khi |
|:--------|:---------------------|:----------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic thống nhất |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack thuần OpenAI |
| `gemini-only` | Gemini CLI | Workflow xoay quanh Google |
| `antigravity` | Hỗn hợp: pm→claude, backend→codex, qa→gemini | Kết hợp thế mạnh nhiều nhà cung cấp |
| `qwen-only` | Qwen CLI | Suy luận local / tự host |

Profile là cách nhanh để cấu hình lại toàn bộ đội agent mà không phải sửa từng dòng.

---

## `oma doctor --profile`

Cờ `--profile` mới in ma trận nhà cung cấp, model và effort đã resolve cho từng agent **sau khi** hợp nhất cả ba file cấu hình.

```bash
oma doctor --profile
```

**Ví dụ output:**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Khi subagent chọn nhà cung cấp bất ngờ, chạy lệnh này trước. Cột `Source` cho biết lớp cấu hình nào đã thắng.

---

## Thêm slug trong `models.yaml`

`models.yaml` là tuỳ chọn, dùng để đăng ký slug model chưa có trong registry — hữu ích với model mới ra mắt.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — release candidate GPT-5.5 Spud"
```

Sau khi đăng ký, slug có thể dùng trong `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slug là định danh — giữ nguyên chữ tiếng Anh do nhà cung cấp công bố.

---

## Mức trần quota phiên

Thêm `session.quota_cap` vào `user-preferences.yaml` để giới hạn việc spawn subagent mất kiểm soát:

```yaml
# .agents/config/user-preferences.yaml
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

Một `user-preferences.yaml` thực tế:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
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

Chạy `oma doctor --profile` để xác nhận kết quả resolve rồi khởi động workflow như bình thường.
