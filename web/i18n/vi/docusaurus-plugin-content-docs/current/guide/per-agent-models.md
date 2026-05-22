---
title: "Hướng dẫn: Cấu hình model theo từng agent"
description: Cấu hình model AI cho từng agent thông qua model_preset trong oma-config.yaml. Bao gồm các preset có sẵn, ghi đè theo từng agent, định nghĩa model inline, custom preset với extends, oma doctor --profile và migration từ agent_cli_mapping cũ.
---

# Hướng dẫn: Cấu hình model theo từng agent

## Tổng quan

`model_preset` là khái niệm duy nhất quyết định model nào được dùng cho mỗi agent. Bạn chọn một trong các preset có sẵn, và mọi agent (pm, backend, frontend, qa, …) đều được gắn với model phù hợp cho nhóm vendor đó. Khi cần, bạn có thể ghi đè từng agent riêng lẻ. Khi nhóm bạn dùng cấu hình không theo chuẩn, hãy định nghĩa thêm preset mới.

Toàn bộ cấu hình nằm trong một file duy nhất: `.agents/oma-config.yaml`.

Trang này trình bày:

1. Bảy preset có sẵn
2. Cách ghi đè từng agent qua map `agents:`
3. Cách khai báo model slug tùy biến qua `models:`
4. Cách định nghĩa custom preset với `custom_presets:` và `extends:`
5. Cách kiểm tra cấu hình đã được giải quyết bằng `oma doctor --profile`
6. Migration từ `agent_cli_mapping` cũ

---

## Preset có sẵn

Đặt `model_preset` thành một trong các key có sẵn:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Key | Mô tả | Phù hợp với |
|:----|:-----------|:---------|
| `antigravity` | Mọi agent dùng Antigravity CLI (`agy`): Gemini 3.1 Pro cho triển khai/kiến trúc, Gemini 3.5 Flash cho orchestration và retrieval. Việc chọn model được điều khiển bởi cấu hình bên trong `agy` — không có flag `--model` hay `--thinking-budget`. | Người dùng Antigravity CLI |
| `claude` | Mọi agent dùng Claude (Sonnet/Opus) | Người đăng ký Claude Max |
| `codex` | Mọi agent dùng OpenAI Codex (GPT-5.x) với mức effort | Người dùng ChatGPT Plus/Pro |
| `gemini` | Mọi agent dùng Gemini CLI, bật thinking cho vai trò triển khai | Người dùng Google AI Pro |
| `qwen` | Mọi agent định tuyến external qua Qwen Code; thinking dạng nhị phân (không có mức effort) | Inference cục bộ / tự host |
| `cursor` | Mọi agent dùng Cursor `composer-2.5` (`composer-2.5-fast` cho orchestrator/qa/pm/docs/retrieval) | Người dùng Cursor Pro / Pro Student |
| `mixed` | Hỗn hợp: vai trò triển khai dùng Codex, architecture/qa/pm dùng Claude, retrieval dùng Gemini | Tận dụng thế mạnh nhiều vendor mà không phải cấu hình từng agent |

Preset có sẵn được đóng gói trong package CLI và tự cập nhật khi bạn nâng cấp `oh-my-agent`. Bạn không cần duy trì file cục bộ nào.

---

## Ghi đè từng agent

Dùng map `agents:` để ghi đè agent cụ thể bên trên preset đang hoạt động. Chỉ những agent bạn liệt kê mới bị ảnh hưởng; phần còn lại giữ nguyên giá trị mặc định của preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Mỗi mục là một object `AgentSpec`:

| Trường | Kiểu | Bắt buộc | Mô tả |
|:------|:-----|:---------|:-----------|
| `model` | string | Có | Model slug (có sẵn hoặc do người dùng định nghĩa) |
| `effort` | `low` \| `medium` \| `high` | Không | Mức nỗ lực reasoning (bị bỏ qua trên model không hỗ trợ) |
| `thinking` | boolean | Không | Bật extended thinking (tùy theo model) |
| `memory` | `user` \| `project` \| `local` | Không | Phạm vi memory cho agent |

Các agent ID hợp lệ: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

Việc merge là shallow: mỗi trường trong override sẽ thay thế giá trị tương ứng của preset. Trường nào bạn không khai báo sẽ giữ giá trị mặc định của preset.

---

## Khai báo model slug inline

Đăng ký các model slug chưa có trong registry tích hợp dưới `models:`. Sau khi đăng ký, bạn có thể dùng slug đó ở bất kỳ đâu trong `agents:` hoặc `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Nếu một slug do người dùng định nghĩa trùng với slug có sẵn, định nghĩa của người dùng sẽ thắng và một cảnh báo sẽ được phát ra.

---

## Custom preset

Định nghĩa preset bổ sung trong `custom_presets:`. Dùng `extends:` để kế thừa toàn bộ giá trị mặc định cho agent từ một preset có sẵn và chỉ ghi đè những agent bạn quan tâm.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Khi không có `extends:`, bạn phải khai báo `agent_defaults` cho cả 11 vai trò agent. Khi có `extends:`, chỉ những mục bạn liệt kê mới bị ghi đè; phần còn lại được kế thừa từ preset gốc.

---

## `oma doctor --profile`

Chạy `oma doctor --profile` để xem ma trận model đã được giải quyết hoàn toàn, tức là sau khi các giá trị mặc định của preset, `custom_presets` và override `agents:` đã được merge.

```bash
oma doctor --profile
```

**Ví dụ output:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Mỗi dòng cho biết model slug đã được giải quyết và nguồn áp dụng (`(preset)` hoặc `(override)`). Hãy dùng lệnh này mỗi khi một subagent chọn vendor ngoài dự kiến.

---

## Migration từ `agent_cli_mapping` cũ

Migration 008 chạy tự động khi bạn gọi `oma install` và `oma update`. Lệnh này chuyển đổi tại chỗ các dự án cũ:

| Cấu hình cũ | Kết quả sau migration 008 |
|:-------------|:--------------------------|
| Mọi mục cùng vendor (ví dụ tất cả `gemini`) | `model_preset: gemini`, không có `agents:` |
| Vendor hỗn hợp | Vendor xuất hiện nhiều nhất → `model_preset`; số còn lại → override `agents:` |
| Giá trị là object `AgentSpec` | Chuyển nguyên trạng vào `agents:` |
| Nội dung `models.yaml` | Đưa inline vào `oma-config.yaml.models` |
| `defaults.yaml` đã tùy biến | Giữ lại dưới dạng `custom_presets.user-customized` kèm cảnh báo |

File gốc được sao lưu vào `.agents/.backup-pre-008-{timestamp}/` trước mọi thay đổi. Migration có tính idempotent: nếu `model_preset` đã tồn tại, nó sẽ bỏ qua.

Sau khi migration, các file `.agents/config/defaults.yaml`, `.agents/config/models.yaml` và thư mục `.agents/config/` sẽ bị xóa.

---

## Giới hạn quota cho session

`session.quota_cap` không thay đổi. Thêm vào `oma-config.yaml` để chặn việc spawn subagent vượt mức:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Khi đạt giới hạn, orchestrator sẽ từ chối spawn thêm và phát ra trạng thái `QUOTA_EXCEEDED`.

---

## Ví dụ đầy đủ

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Chạy `oma doctor --profile` để xác nhận kết quả giải quyết, rồi khởi động workflow như bình thường.
