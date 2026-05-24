---
title: "Hướng dẫn: Cài đặt toàn cục"
description: Cài oh-my-agent vào HOME của người dùng (~/.agents/) thay vì theo từng dự án, để cùng một bộ skill, workflow và rule áp dụng cho mọi dự án. Bao gồm oma install --global, oma update --global, oma uninstall --global, ghi đè OMA_HOME, phát hiện cài đặt kép qua oma doctor, và các lưu ý theo nền tảng (từ chối sudo, CI, WSL, bảo vệ cwd=HOME).
---

## Cài đặt toàn cục là gì?

Mặc định, `oma install` giới hạn mọi thứ trong thư mục dự án hiện tại: SSOT nằm ở `<cwd>/.agents/` và cấu hình vendor được ghi vào `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. **Cài đặt toàn cục** (`oma install --global`) đặt oh-my-agent vào HOME của người dùng, nên cùng một bộ skill, workflow và rule đều có sẵn ở mọi dự án bạn mở mà không cần lặp lại bước cài đặt. SSOT nằm ở `~/.agents/` còn cấu hình vendor ở `~/.claude/`, `~/.codex/`, v.v.

## So sánh: dự án vs toàn cục

| Khía cạnh | Dự án (`oma install`) | Toàn cục (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Vị trí SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Cấu hình vendor | `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. | `~/.claude/`, `~/.codex/`, v.v. |
| File lock | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Trường hợp dùng | Tùy biến theo từng dự án | Mặc định cá nhân cho mọi dự án |
| Phạm vi oma-config.yaml | Theo từng dự án | Baseline cho toàn bộ người dùng |

Hai chế độ có thể cùng tồn tại. `oma doctor` báo cáo cả hai cài đặt nếu có và đánh dấu phần khác biệt giữa chúng.

## Lần chạy đầu tiên

Lần đầu bạn chạy `oma install --global` trên một máy, trình cài đặt sẽ hiển thị ghi chú giải thích trước khi tiếp tục:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Xác nhận để tiếp tục. Việc cài đặt sau đó đi theo cùng một luồng tương tác như cài đặt cho dự án (ngôn ngữ, model preset, loại dự án, chọn vendor).

Sau khi cài thành công, các bước tiếp theo được hiển thị:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Lưu ý

### Từ chối sudo

`oma install` (ở mọi chế độ) sẽ thoát ngay khi chạy dưới `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Hãy chạy lệnh bằng người dùng thông thường, không dùng `sudo`.

### Môi trường CI

Chạy `oma install --global` bên trong pipeline CI sẽ thay đổi HOME của runner CI. Việc này thường không mong muốn. Nếu bạn thực sự cần (ví dụ pipeline bootstrap), oma sẽ phát ra cảnh báo:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Quá trình cài đặt tiếp tục khi `--yes` / `OMA_YES=1` được đặt. Không có chúng, cảnh báo sẽ hiển thị và cài đặt tiếp tục theo chế độ tương tác (thường sẽ treo trong hầu hết thiết lập CI).

### WSL: HOME Linux vs USERPROFILE Windows

Khi oma phát hiện đang chạy trong Windows Subsystem for Linux, nó in ra:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Cài đặt WSL và cài đặt PowerShell là độc lập. Nếu muốn phủ toàn cục cho cả hai phía, hãy chạy `oma install --global` một lần từ WSL và một lần từ PowerShell.

### Cảnh báo cwd = HOME (chế độ dự án)

Nếu bạn chạy `oma install` (không có `--global`) khi thư mục hiện tại là HOME, oma sẽ cảnh báo:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Ở chế độ phi tương tác / CI, lệnh này tự động hủy. Hãy dùng `--global` nếu bạn thực sự muốn cài đặt cho toàn bộ người dùng.

## Gỡ cài đặt

```bash
# Xem trước những gì sẽ bị xóa (không xóa gì cả)
oma uninstall --global --dry-run

# Gỡ cài đặt toàn cục
oma uninstall --global
```

Lệnh gỡ cài đặt tách bạch các file do oma sở hữu khỏi các file do người dùng sở hữu. Nội dung của người dùng (oma-config.yaml, mcp.json, skill tùy biến không có marker `<!-- oma:generated -->`) không bao giờ bị xóa.

Để gỡ cài đặt dự án, hãy bỏ `--global`:

```bash
oma uninstall [--dry-run]
```

## Ghi đè OMA_HOME

Cho mục đích test hoặc staging, bạn có thể chuyển hướng mọi thao tác oma sang một thư mục bất kỳ:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` có độ ưu tiên cao hơn `--global` và `process.cwd()`. Các đường dẫn hệ thống bị cấm (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) sẽ bị từ chối ngay cả khi đặt qua `OMA_HOME`. Đường dẫn phải tuyệt đối và cho phép ghi.
