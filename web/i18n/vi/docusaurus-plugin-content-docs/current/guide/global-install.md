---
title: "Hướng dẫn: Cài đặt toàn cục"
sidebar_label: Cài đặt toàn cục
description: Cài oh-my-agent vào HOME người dùng (`~/.agents/`) thay vì theo từng project để cùng một bộ skill, workflow và rule áp dụng cho mọi project. Bao gồm `oma install --global`, `oma update --global`, `oma uninstall --global`, override `OMA_HOME`, phát hiện cài đặt kép qua `oma doctor` và lưu ý theo nền tảng.
---

## Cài đặt toàn cục là gì?

Mặc định, `oma install` giới hạn mọi thứ trong thư mục project hiện tại: SSOT ở `<cwd>/.agents/` và config vendor ghi vào `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. **Cài đặt toàn cục** (`oma install --global`) cài oh-my-agent vào HOME người dùng, nên cùng skill, workflow và rule có sẵn ở mọi project mà không lặp bước cài. SSOT ở `~/.agents/`, config vendor ở `~/.claude/`, `~/.codex/`, v.v.

## So sánh project và toàn cục

| Khía cạnh | Project (`oma install`) | Toàn cục (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Vị trí SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Config vendor | `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. | `~/.claude/`, `~/.codex/`, v.v. |
| File lock | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Trường hợp dùng | Tùy biến theo project | Default cá nhân cho mọi project |
| Phạm vi oma-config.yaml | Riêng project | Baseline toàn user |

Hai mode có thể cùng tồn tại. `oma doctor` báo cáo cả hai install nếu có và chỉ ra drift giữa chúng.

Sau global install thành công, xác minh file theo user root và profile đã resolve:

```bash
oma doctor --json
oma doctor --profile
```


Command đầu báo cáo health của install và vendor; command profile hiển thị kế hoạch model của agent. Chạy từ bất kỳ project nào khi muốn kiểm tra global install.

## Thiết lập lần đầu

Lần đầu chạy `oma install --global` trên máy, installer hiển thị ghi chú trước khi tiếp tục:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```


Xác nhận để tiếp tục. Sau đó install đi theo cùng luồng tương tác như project install, gồm language, model preset, project type và vendor selection.

Sau install thành công, các bước tiếp theo hiển thị:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```


## Lưu ý

### Từ chối sudo

`oma install` ở mọi mode thoát ngay khi chạy dưới `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```


Chạy command bằng user bình thường, không dùng `sudo`.

### Môi trường CI

Chạy `oma install --global` trong CI sẽ sửa thư mục HOME của runner CI, thường không mong muốn. Nếu thật sự cần, chẳng hạn pipeline bootstrap, oma phát warning:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```


Install tiếp tục nếu đặt `--yes` / `OMA_YES=1`. Nếu không, warning hiển thị và install tiếp tục interactive, thường sẽ treo trong CI.

### WSL: HOME Linux và USERPROFILE Windows

Khi phát hiện chạy trong Windows Subsystem for Linux, oma in:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```


WSL install và PowerShell install độc lập. Muốn phủ global ở cả hai phía, chạy `oma install --global` một lần trong WSL và một lần từ PowerShell.

### Guard cwd = HOME (project mode)

`oma link` và `oma update` (không có `--global`) từ chối chạy khi current directory là HOME. Ở project mode, `<cwd>/.claude/settings.json` sẽ chính là `~/.claude/settings.json` — setting Claude Code global của bạn — và bản render theo phạm vi project sẽ ghi lại các command `$HOME/.claude/hooks/...` của nó thành `$CLAUDE_PROJECT_DIR/...`, làm hỏng mọi hook và statusline trong những project không có `.claude/hooks/` riêng. Hãy dùng `oma link --global` / `oma update --global` cho bản cài ở HOME, hoặc `cd` vào một project trước.

Nếu chạy `oma install` không có `--global` khi current directory là HOME, oma cảnh báo:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```


Trong non-interactive / CI mode, command tự hủy. Dùng `--global` nếu thật sự muốn cài cho toàn user.

## Liên kết lại global install

`oma link` tái tạo file native của vendor từ SSOT mà không cài lại. Giống `install` và `update`, nó resolve target theo install context, nên truyền `--global` để reconcile `~/.agents/`; command chạy từ bất kỳ thư mục nào, không chỉ `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```


Không có `--global`, `oma link` target `<cwd>/.agents/`. Vì vậy chạy trong project khi install là global sẽ báo không tìm thấy thư mục `.agents/` ở đó.

## Gỡ cài đặt

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```


Lệnh uninstall tách file do oma sở hữu khỏi file do user sở hữu. Nội dung của user, gồm `oma-config.yaml`, `mcp.json` và skill custom không có marker `<!-- oma:generated -->`, không bao giờ bị xóa.

Để gỡ project install, bỏ `--global`:

```bash
oma uninstall [--dry-run]
```


## Override OMA_HOME

Để test hoặc staging, redirect mọi thao tác oma tới thư mục tùy ý:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```


`OMA_HOME` có ưu tiên cao hơn `--global` và `process.cwd()`. Path hệ thống bị cấm, gồm `/etc`, `/usr`, `/bin`, `/boot`, `/sys` và `/proc`, vẫn bị từ chối dù đặt qua `OMA_HOME`. Path phải tuyệt đối và writable.

Để smoke test an toàn, trỏ `OMA_HOME` tới thư mục rỗng có quyền ghi rồi chạy `oma install --global --yes`; summary phải nêu thư mục đó là install root. Xóa thư mục sau test, rồi chạy install thật với HOME dự kiến.
