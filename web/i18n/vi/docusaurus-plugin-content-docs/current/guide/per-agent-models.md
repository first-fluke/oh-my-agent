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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/config/user-preferences.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-RARDO-v2.1 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
