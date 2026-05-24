---
title: "Hướng dẫn: Ngữ nghĩa oma-config.yaml"
description: Quy tắc ưu tiên theo từng key cho oma-config.yaml khi cài đặt dự án và toàn cục cùng tồn tại. Bao gồm auto_update_cli (dự án thắng toàn cục), serena.mode, telemetry, language, model_preset, translation_voice, timezone, và các dotfile mà agy / claude / codex / gemini / qwen sẽ đọc.
---

## Tổng quan

`oma-config.yaml` có thể nằm ở hai vị trí:

- **Dự án**: `<cwd>/.agents/oma-config.yaml`
- **Toàn cục**: `~/.agents/oma-config.yaml`

Khi cả hai file đều tồn tại, file dự án sẽ thắng cho mọi key. Đây là chủ ý: tùy biến theo dự án là tín hiệu cụ thể hơn và không nên bị ghi đè bởi mặc định ở phạm vi người dùng.

## Bảng ưu tiên

| Key | Dự án thắng? | Ghi chú |
|-----|:---:|-------|
| `auto_update_cli` | Có | Giá trị dự án ghi đè toàn cục. Cài đặt trong `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Có | Điều khiển chế độ transport của Serena MCP (ví dụ `stdio`, `sse`). |
| `telemetry` | Có | Tùy chọn telemetry của vendor (`true` / `false`). |
| `language` | Có | Ngôn ngữ phản hồi của agent (ví dụ `en`, `ko`, `ja`). |
| `model_preset` | Có | Preset chọn model (ví dụ `claude`, `mixed`, `codex`). |
| `translation_voice` | Có | Tông giọng dịch: `formal`, `balanced`, `interpreter`. |
| `timezone` | Có | Định danh múi giờ (ví dụ `Asia/Seoul`, `America/New_York`). |

"Dự án thắng" nghĩa là: nếu key có trong file dự án, giá trị đó được dùng bất kể file toàn cục nói gì. Nếu key vắng mặt ở file dự án, giá trị từ file toàn cục được dùng. Nếu cả hai cùng vắng mặt, giá trị mặc định sẽ áp dụng.

## Giá trị mặc định

| Key | Mặc định | Khi nào áp dụng |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Cả hai file vắng mặt hoặc thiếu key |
| `serena.mode` | `stdio` | Cả hai file vắng mặt hoặc thiếu key |
| `telemetry` | `false` | Cả hai file vắng mặt hoặc thiếu key |
| `language` | `en` | Cả hai file vắng mặt hoặc thiếu key |
| `model_preset` | `claude` | Cả hai file vắng mặt hoặc thiếu key |
| `translation_voice` | `balanced` | Cả hai file vắng mặt hoặc thiếu key |
| `timezone` | Múi giờ hệ thống | Cả hai file vắng mặt hoặc thiếu key |

## Lý do của thứ tự đọc

Cấu hình dự án được đọc trước vì đại diện cho ngữ cảnh cụ thể hơn — repository mà lập trình viên đang làm việc trực tiếp. Một nhóm có thể yêu cầu `language: ko` hoặc `model_preset: mixed` cho dự án của họ, và những lựa chọn đó không nên bị `oma-config.yaml` toàn cục của cá nhân ghi đè ngầm.

File toàn cục cung cấp baseline cho phạm vi người dùng. Những key mà dự án không đặt sẽ rơi xuống giá trị toàn cục, rồi tiếp tục rơi xuống giá trị mặc định trong code.

## Ghi chú

- `language` trong `oma-config.yaml` điều khiển ngôn ngữ phản hồi của agent. Nó **không** được dùng để quyết định ngôn ngữ của thông báo cảnh báo lúc install/update — phần đó dùng locale hệ thống (`$LANG`) vì `oma-config.yaml` chưa được nạp tại thời điểm cài đặt.
- Ưu tiên của `auto_update_cli` được cài đặt rõ ràng trong lệnh update. Khi cả cài đặt dự án và cài đặt toàn cục đều tồn tại, `oma-config.yaml` của dự án sẽ được tra cứu trước.
- Việc chỉnh sửa trực tiếp `oma-config.yaml` là an toàn. `oma install` và `oma update` dùng cơ chế thay thế trường ở cấp regex và giữ nguyên các key do người dùng sửa mà chúng không quản lý (ví dụ override `agents:` tùy biến, `session.quota_cap`).
