---
title: "Hướng dẫn: Cài đặt toàn cục"
sidebar_label: Cài đặt toàn cục
description: Cài oh-my-agent vào global home của OMA (~/.oma/) thay vì theo từng project để cùng một bộ skill, workflow và rule áp dụng cho mọi project. Bao gồm oma install --global, oma update --global, oma uninstall --global, override OMA_HOME, phát hiện cài đặt kép qua oma doctor và các lưu ý theo nền tảng (từ chối sudo, CI, WSL, guard cwd=HOME).
---

## Cài đặt toàn cục là gì? {#what-is-a-global-install}

Mặc định, `oma install` giới hạn mọi thứ trong thư mục project hiện tại: SSOT ở `<cwd>/.agents/` và config vendor được ghi vào `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. **Cài đặt toàn cục** (`oma install --global`) thay vào đó cài oh-my-agent vào global home của OMA, nên cùng skill, workflow và rule có sẵn ở mọi project bạn mở mà không phải lặp lại bước cài. SSOT ở `~/.oma/.agents/`; config vendor vẫn ở `~/.claude/`, `~/.codex/`, v.v.

## So sánh project và toàn cục {#project-vs-global-comparison}

| Khía cạnh | Project (`oma install`) | Toàn cục (`oma install --global`, OMA home mặc định) |
|--------|------------------------|--------------------------------|
| Vị trí SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Config vendor | `<cwd>/.claude/`, `<cwd>/.codex/`, v.v. | `~/.claude/`, `~/.codex/`, v.v. |
| File lock | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Trường hợp dùng | Tùy biến theo project | Mặc định cá nhân cho mọi project |
| Phạm vi oma-config.yaml | Riêng project | Baseline toàn user |

Hai mode có thể cùng tồn tại. `oma doctor` báo cáo cả hai install nếu có và chỉ ra drift giữa chúng.

Sau khi global install thành công, xác minh các file theo user root và profile đã resolve:

```bash
oma doctor --global --json
oma doctor --global --profile
```

Command đầu báo cáo health của install và vendor; command profile hiển thị kế hoạch model mà agent dùng. Giữ `--global` (hoặc `-g`): nếu bỏ, cả hai command sẽ kiểm tra project ở thư mục hiện tại, với cấu hình của project đó được phủ lên mặc định global.

## Thiết lập lần đầu {#first-run-setup}

Lần đầu chạy `oma install --global` trên một máy, installer hiển thị ghi chú giải thích trước khi tiếp tục:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Xác nhận để tiếp tục. Sau đó install đi theo cùng luồng tương tác như project install (language, model preset, project type, vendor selection).

Sau khi install thành công, các bước tiếp theo được hiển thị:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Lưu ý {#caveats}

### Từ chối sudo {#sudo-refused}

`oma install` (ở mọi mode) thoát ngay khi chạy dưới `sudo`:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Chạy command bằng user bình thường, không dùng `sudo`.

### Môi trường CI {#ci-environments}

Chạy `oma install --global` trong CI pipeline sẽ sửa thư mục HOME của CI runner. Điều này thường không mong muốn. Nếu thật sự cần (ví dụ pipeline bootstrap), oma phát warning:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

Warning xuất hiện khi `CI` là `true` hoặc `1`. Các giá trị đó vốn đã khiến install chạy non-interactive, nên nó tiếp tục với giá trị mặc định và không chờ input. Ngoài CI, `--yes` hoặc `OMA_YES=1` cho hành vi non-interactive tương tự.

### WSL: HOME Linux và USERPROFILE Windows {#wsl-linux-home-vs-windows-userprofile}

Khi phát hiện đang chạy trong Windows Subsystem for Linux, oma in ra:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL install và PowerShell install độc lập với nhau. Muốn phủ global ở cả hai phía, chạy `oma install --global` một lần trong WSL và một lần từ PowerShell.

### Guard cwd = HOME (project mode) {#cwd--home-guard-project-mode}

`oma link` và `oma update` (không có `--global`) từ chối chạy khi current directory là HOME. Ở project mode, `<cwd>/.claude/settings.json` sẽ chính là `~/.claude/settings.json` — setting Claude Code global của bạn — và bản render theo phạm vi project sẽ ghi lại các command `$HOME/.claude/hooks/...` của nó thành `$CLAUDE_PROJECT_DIR/...`, làm hỏng mọi hook và statusline trong những project không có `.claude/hooks/` riêng. Hãy dùng `oma link --global` / `oma update --global` cho global install, hoặc `cd` vào một project trước.

Nếu chạy `oma install` (không có `--global`) khi current directory là HOME, oma cảnh báo:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Trong non-interactive / CI mode, command tự hủy. Dùng `--global` nếu bạn muốn cài cho toàn user.

## Liên kết lại global install {#relinking-a-global-install}

`oma link` tái tạo file native của vendor từ SSOT mà không cài lại. Giống `install` và `update`, nó resolve target theo install context, nên hãy truyền `--global` để reconcile `~/.oma/.agents/` — command chạy từ bất kỳ thư mục nào, không chỉ `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Không có `--global`, `oma link` nhắm tới `<cwd>/.agents/` — vì vậy chạy nó trong một project khi install là global sẽ báo không tìm thấy thư mục `.agents/` ở đó.

## Gỡ cài đặt {#uninstall}

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Lệnh uninstall tách file do oma sở hữu khỏi file do user sở hữu. Nó chỉ xóa các skill được ghi là do OMA quản lý trong `managed-skills.json` dưới `.agents/state/`; marker `<!-- oma:generated -->` nhận diện các file prompt Copilot được tạo ra. Nội dung do user sở hữu (`oma-config.yaml`, `mcp.json` và các skill không được ghi là managed) không bao giờ bị xóa. Chạy `--dry-run` trước để xem danh sách chính xác.

Để gỡ project install, bỏ `--global`:

```bash
oma uninstall [--dry-run]
```

## Override OMA_HOME {#oma_home-override}

Đặt `OMA_HOME` thành một path tuyệt đối để di chuyển dữ liệu global do OMA sở hữu:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` là storage root toàn cục, không phải target của project install. Với giá trị trên, các định nghĩa global nằm ở `/tmp/oma-test/.agents/`; project install và link vẫn dùng `<cwd>/.agents/`. Setting native và thông tin xác thực của vendor nằm ngoài `OMA_HOME`. Các file tích hợp OpenCode global được ghi vào `~/.config/opencode/` dưới thư mục HOME thực.

`OMA_STATE_HOME` là ngoại lệ rõ ràng cho storage runtime của profile/L1/project: nó phải là path tuyệt đối và chứa `u/`. Khi không đặt, profile theo `OMA_HOME`. `XDG_CONFIG_HOME` không còn di chuyển state của OMA và không thay đổi output path OpenCode của OMA. Secret trong OS Keychain, dữ liệu AgentMemory/Honcho và cache của managed toolchain vẫn thuộc về owner hiện có của chúng.

## Bố cục storage toàn cục {#global-storage-layout}

Dữ liệu global mặc định nằm dưới `~/.oma`. Khi đặt `OMA_HOME`, thay `~/.oma` bằng giá trị của nó:

| Dữ liệu | Vị trí |
|---|---|
| Định nghĩa global, config, metadata cài đặt | `~/.oma/.agents/` |
| Schedule manifest, environment đã capture, run log | `~/.oma/schedule/` |
| Backup global | `~/.oma/backup/` |
| Registry, lock, log của Serena | `~/.oma/state/serena/` |
| Index tên key của Vault | `~/.oma/state/vault-index.json` |
| Profile, L1 session, project runtime | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/` khi đặt `OMA_STATE_HOME`) |

Config global cung cấp giá trị mặc định. `.agents/oma-config.*` của project gần nhất và
local overlay của nó ghi đè các giá trị đó; các project root ở cấp tổ tiên khác nhau không được merge.
Xem [Configuration loading](./oma-config-semantics.md#precedence-table) để biết thứ tự đầy đủ.
Project chọn `semantic_memory: none` vẫn giữ memory bị tắt ngay cả khi
config global chọn AgentMemory.

## Cài đặt hiện có {#existing-installations}

Home migration sao chép dữ liệu do OMA sở hữu từ `~/.agents/` và `~/.config/oma/`
sang bố cục mới. Bản gốc được giữ lại, ngoại trừ các thư mục skill do OMA sở hữu đã xác minh
được chuyển thành discovery link: nội dung gốc của chúng được lưu trữ dưới
`~/.oma/backup/legacy-global-skills/` trước khi path cũ trở thành link tới skill đã
migrate. File đích đã tồn tại không bị ghi đè; xung đột và dữ liệu đang được dùng
được báo cáo để thử lại. Vault index
merge tên key mà không chuyển giá trị secret ra khỏi OS keychain. Skill
của user và link ngoại lai giữ nguyên vị trí; file xác thực của vendor không bị
di chuyển. Runtime reader chỉ dùng
các path mới.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Global install và update chạy migration trước khi ghi các file global.
Project install/update dùng các root hợp nhất mà không migrate dữ liệu global
không liên quan. Migration không thay đổi đăng ký job của OS; chạy `oma schedule sync`
sau migration nếu có schedule. Service hoặc runner đang hoạt động có thể khiến dữ liệu bị hoãn;
hãy kết thúc các process đó rồi chạy lại migration.

## Xem thêm {#see-also}

- [Configuration loading](./oma-config-semantics.md): cách các file config global, project và local được merge
- [Tích hợp vào project hiện có](./integration.md): project-mode install, xác minh và rollback
- [Cập nhật tự động](./automated-updates.md): chạy `oma update` từ CI
