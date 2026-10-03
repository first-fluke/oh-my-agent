---
title: "Hướng dẫn: Ngữ nghĩa oma-config.yaml"
sidebar_label: Tải cấu hình
description: Cách OMA chọn lớp cấu hình CUE và YAML, áp dụng overlay local và xử lý các fallback trong ngữ cảnh cài đặt. Xem configuration reference để biết key và giá trị mặc định được hỗ trợ.
---

## Tổng quan

Cấu hình được chọn từ thư mục `.agents/` gần nhất khi đi ngược từ thư mục làm việc hiện tại:

- **Shared:** `.agents/oma-config.cue`, hoặc `.agents/oma-config.yaml` nếu CUE không có hoặc không evaluate được.
- **Local:** `.agents/oma-config.local.cue` hoặc `.agents/oma-config.local.yaml`, chỉ một file và overlay lên file shared; hãy giữ file này riêng tư.

OMA không merge file project với `~/.agents/oma-config.*` khi runtime lookup thông thường. Global install đọc file home vì install root của nó là HOME; command trong project đọc layer project gần nhất. `auto_update_cli` là ngoại lệ có chủ ý: update check đọc config project, rồi config home, rồi mặc định bật. Xem [Configuration reference](/docs/guide/configuration-reference) để biết đầy đủ model.

## Bảng ưu tiên

| Key | Quy tắc hiệu lực | Ghi chú |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Cao nhất | Giá trị environment không rỗng thay thế `model_preset` cho process đó. |
| File local | Overlay shared | Map thường merge đệ quy; array, scalar và `null` thay thế giá trị shared. Không được tồn tại đồng thời hai format local. |
| Shared CUE | Ưu tiên | Nếu CUE vắng hoặc lỗi, loader thử YAML shared. Lỗi CUE local là fatal. |
| Shared YAML | Fallback | Dùng khi không chọn được shared CUE usable. |
| `auto_update_cli` | Project, rồi home, rồi `true` | Fallback riêng cho update được implement trong `resolveAutoUpdateCli`, không phải global layer chung. |

Với override local của project, chỉ đặt leaf đã thay đổi trong file local. Ví dụ, giữ lựa chọn model local ngoài file shared:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```


Chạy command từ project để chọn thư mục `.agents/` gần nhất. File local malformed sẽ fail rõ ràng; sửa hoặc xóa trước khi retry.

## Giá trị mặc định

| Key | Mặc định | Khi áp dụng |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Cả hai file vắng hoặc thiếu key |
| `serena.mode` | `bridge` | Cả hai file vắng hoặc thiếu key |
| `serena.auto_update` | `true` | Cả hai file vắng hoặc thiếu key |
| `telemetry` | `false` | Cả hai file vắng hoặc thiếu key |
| `language` | `en` | Cả hai file vắng hoặc thiếu key |
| `model_preset` | Bắt buộc | Template project đã ship dùng `auto`; schema yêu cầu giá trị không rỗng. |
| `translation_voice` | `balanced` | Cả hai file vắng hoặc thiếu key |
| `timezone` | Múi giờ hệ thống | Cả hai file vắng hoặc thiếu key |

## Lý do thứ tự đọc

Quy tắc layer gần nhất giữ cấu hình project khép kín. Nếu cần baseline cấp user, hãy cài global và sửa `~/.agents/oma-config.yaml`; project install vẫn có thể định nghĩa layer gần nhất của nó.

## Ghi chú

- `language` trong `oma-config.yaml` điều khiển ngôn ngữ phản hồi của agent. Nó **không** quyết định ngôn ngữ warning lúc install/update; phần đó dùng locale hệ thống (`$LANG`) vì `oma-config.yaml` chưa được load lúc install.
- Ưu tiên của `auto_update_cli` được implement rõ trong update command. Khi project install và global install cùng tồn tại, giá trị project được tra trước rồi mới đến home.
- `telemetry` (mặc định `false`) ánh xạ tới opt-out riêng của từng vendor, được `oma install` / `oma update` / `oma link` ghi ra: Claude dùng `DISABLE_TELEMETRY` và `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`; Gemini/Qwen dùng `privacy.usageStatisticsEnabled`; Codex dùng `analytics.enabled` và `feedback.enabled`; Grok dùng `[features] telemetry`; Antigravity (agy) dùng `enableTelemetry` trong `~/.gemini/antigravity-cli/settings.json`. Đặt `telemetry: true` để opt in lại bằng cách bỏ opt-out của oma cho vendor đó.
- `diagram`, gồm engine `auto` / `archify` / `mermaid`, `explain_sidecar` và `archify.managed|channel|check_interval_min|path|quality|open`, là sparse skill-override section giống `video` / `image`; xem [Diagram Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` giới hạn tần suất check latest-version cho HyperFrames toolchain và heygen-com/hyperframes theo từng run (`oma video compose`, `oma update`).
- `market`, gồm `managed|channel|check_interval_min|path|python|save_dir`, cấu hình engine `last30days` luôn mới phía sau `oma market`; xem [Market Research](/docs/guide/market-research).
- Typed runtime schema bao phủ `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` và các sparse skill section. Template đã ship cũng có block thuộc consumer như `scm`, `memory`, `serena_reaper` và `mcp`; consumer của block đó sở hữu nested key. Không suy ra key chỉ từ danh sách này; dùng [Configuration reference](/docs/guide/configuration-reference) và feature guide tương ứng.
- Sửa trực tiếp `oma-config.yaml` là an toàn. `oma install` và `oma update` dùng thay thế field ở mức regex, giữ các key user đã sửa mà chúng không quản lý, như override `agents:` tùy biến và `session.quota_cap`.
- `oma update` còn thêm top-level key mà template đã ship có nhưng file của bạn thiếu, dùng template default và marker `# Added by oma update`. Key đã có không bao giờ bị sửa, nội dung hiện tại vẫn byte-identical. Key bạn cố ý xóa sẽ xuất hiện lại với default; hãy đặt giá trị rõ ràng thay vì xóa để opt out.
