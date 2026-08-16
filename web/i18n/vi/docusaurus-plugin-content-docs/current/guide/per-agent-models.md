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
| `antigravity` | Mọi agent dùng Antigravity CLI (`agy`): Gemini 3.1 Pro cho triển khai/kiến trúc, Gemini 3.5 Flash cho orchestration và explore. Việc chọn model được điều khiển bởi cấu hình bên trong `agy` — không có flag `--model` hay `--thinking-budget`. | Người dùng Antigravity CLI |
| `claude` | Mọi agent dùng Claude (Sonnet/Opus) | Người đăng ký Claude Max |
| `codex` | Mọi agent dùng OpenAI Codex (GPT-5.x) với mức effort | Người dùng ChatGPT Plus/Pro |
| `gemini` | Mọi agent dùng Gemini CLI, bật thinking cho vai trò triển khai | Người dùng Google AI Pro |
| `qwen` | Mọi agent định tuyến external qua Qwen Code; thinking dạng nhị phân (không có mức effort) | Inference cục bộ / tự host |
| `cursor` | Mọi agent dùng Cursor `composer-2.5` (`composer-2.5-fast` cho orchestrator/qa/pm/docs/explore) | Người dùng Cursor Pro / Pro Student |
| `mixed` | Hỗn hợp: vai trò triển khai dùng Codex, architecture/qa/pm dùng Claude, explore dùng Gemini | Tận dụng thế mạnh nhiều vendor mà không phải cấu hình từng agent |

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

Các agent ID hợp lệ: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

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
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
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

---

## Dispatch qua OpenCode

[OpenCode](https://opencode.ai) là một vendor thuộc lớp extension: giống như pi, nó
không phải chủ sở hữu model mà là một CLI chạy các model từ catalog riêng của nó —
provider `opencode` miễn phí, gói thuê bao chi phí thấp `opencode-go`, và gateway
`opencode-zen`. oma tích hợp nó như một **vendor plugin in-process**: opencode tự
nạp `.opencode/plugins/oma/` thay vì đăng ký hook trong file settings, và giải
quyết persona của từng agent từ các file `.opencode/agents/<id>.md` được sinh ra.

### Dispatch tường minh

Định tuyến bất kỳ agent nào qua opencode bằng override `-m opencode`:

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
```

Lệnh này chạy `opencode run --agent pm --dir <workspace> "<prompt>"`. Prompt là
một **tham số vị trí ở cuối** — flag `-p` của opencode có nghĩa là `--password`,
chứ không phải prompt.

### Model OpenCode theo từng agent

Để định tuyến các agent cụ thể tới một model opencode, hãy đăng ký model dưới `models:`
và tham chiếu nó từ `agents:`. Có hai yêu cầu cần tuân thủ (xem
[Khai báo model slug inline](#inlining-model-slugs)):

1. **Slug phải ở dạng `owner/model`.** Dùng slug `provider/model` của opencode làm
   key trong registry — tên trần bị schema `agents.<id>.model` từ chối.
2. **Spec phải đầy đủ** — `cli`, `cli_model`, `auth_hint`, và mọi boolean trong
   `supports`. Một spec không đầy đủ sẽ không qua được validation và âm thầm
   fallback về core registry (khi đó agent sẽ không định tuyến tới opencode).

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Mỗi agent được định tuyến sẽ dispatch `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. Đây là lựa chọn phù hợp cho các vai
trò nhẹ, nhanh (pm, qa, docs, explore) trong khi các agent triển khai nặng hơn
vẫn giữ trên Codex/Claude/v.v.

### Kiểm tra một model slug

Catalog của opencode bị giới hạn theo thuê bao và đăng nhập, nên oma **không**
hardcode các slug model của opencode. Hãy kiểm tra một slug dựa trên catalog đã
cài đặt của bạn:

```bash
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe` báo `accepted` khi slug có trong danh sách của
`opencode models`, `rejected` khi không có, và `auth_required` khi provider cần
đăng nhập hoặc thuê bao.

### Xác thực và file được sinh ra

- **Xác thực:** `opencode auth login` lưu thông tin đăng nhập trong
  `~/.local/share/opencode/auth.json`. `oma auth:status` / `oma doctor` báo cáo
  trạng thái xác thực opencode bên cạnh các CLI khác ở cấp vendor (provider kiểm tra mặc định:
  `opencode-go`). Ngược lại, `oma doctor --profile` phân biệt provider: mỗi dòng
  được kiểm tra theo tiền tố provider trong `cli_model` đã đăng ký, nên model có
  `cli_model: zai-coding-plan/glm-5.3` sẽ được kiểm tra bằng thông tin xác thực
  `zai-coding-plan`. Dòng có model không đăng ký `cli_model` dạng
  `provider/model` sẽ báo `? unknown` thay vì khẳng định xác thực thất bại.
- **File được sinh ra:** `oma link` (hoặc `oma link opencode`) ghi một file persona
  `.opencode/agents/<id>.md` cho mỗi agent cùng với cầu nối `.opencode/plugins/oma/`.
  Chúng được sinh ra từ SSOT `.agents/` — không chỉnh sửa trực tiếp; hãy chạy lại
  `oma link` để tái tạo.

> **Lưu ý về workflow liên tục:** sự kiện `session.idle` của opencode (tương tự
> nhất với hook `Stop` của Claude) chỉ mang tính thông báo và không thể chặn
> phiên kết thúc. Do đó, các workflow liên tục (orchestrate / work / ultrawork)
> chạy với **ngữ nghĩa Stop suy giảm** dưới opencode — phần củng cố workflow diễn
> ra ở tin nhắn kế tiếp thay vì giữ phiên mở.
