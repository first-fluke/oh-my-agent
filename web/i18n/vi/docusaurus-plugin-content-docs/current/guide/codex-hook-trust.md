---
title: "Hướng dẫn: Codex Hook Trust"
sidebar_label: Codex Hook Trust
description: Cách Codex chặn hook sau trust, những gì oh-my-agent ghi để hook của nó chạy, và khi nào bạn vẫn cần tự review hook.
---

# Hướng dẫn: Codex Hook Trust {#codex-hook-trust}

Khi oh-my-agent cài vào một project, nó ghi cấu hình hook native của vendor, gồm `.codex/hooks.json` cho Codex CLI. Codex không chạy một hook chỉ vì hook đã được cấu hình. Hai phê duyệt chặn hook, và cả hai nằm trong config người dùng (`$CODEX_HOME/config.toml`, mặc định `~/.codex/config.toml`). Một project không thể tự phê duyệt hook của chính nó:

1. **Project trust.** Thư mục `.codex/` của project (`config.toml` và `hooks.json`) chỉ được tải cho project đã trusted: `[projects."<path>"] trust_level = "trusted"`.
2. **Per-hook trust.** Mọi hook không phải managed, ở phạm vi project hoặc user, cần một entry `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` có `trusted_hash` khớp khai báo hiện tại của hook (command, timeout, matcher, async flag, status message).

Hook mới hoặc đã đổi hiện "Hooks need review" trong Codex TUI. `codex exec` bỏ qua hook đó mà không báo.

---

## Những gì oh-my-agent ghi giúp bạn {#what-oh-my-agent-records-for-you}

`oma install`, `oma update` và `oma link` ghi cả hai phê duyệt cho **hook của chính oh-my-agent**. Đó là các handler tên `oma-hook-*` hoặc chạy qua wrapper `oma-hook.sh`. Hash giống hash Codex tính khi bạn chọn "Trust all and continue", nên hook chạy ở session Codex đầu tiên mà không cần bước `/hooks`. Bản phát hành oh-my-agent sau này đổi command của hook sẽ ghi hash mới trong `oma update`, nên hook vẫn bật.

oh-my-agent chỉ sửa các bảng bị ảnh hưởng trong `config.toml`. Nó đọc lại kết quả và để nguyên file nếu còn thứ khác sẽ đổi. Nó không bao giờ:

- phê duyệt hook bạn tự thêm vào cùng `hooks.json`,
- trust một project bạn đã đánh dấu `trust_level = "untrusted"`,
- bật lại hook bạn đã tắt (`enabled = false`),
- đụng tới Codex trước khi Codex tạo thư mục home của nó.

Cài global (`~/.codex/hooks.json`) chỉ nhận các entry per-hook, vì không có project để trust.

---

## Khi bạn vẫn tự review hook {#when-you-still-review-hooks-yourself}

Nếu oh-my-agent không ghi được trust, nó in lý do kèm thông báo:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Các trường hợp thường gặp là `config.toml` không parse được, project bạn đánh dấu untrusted, hoặc Codex chưa từng được chạy. Khi đó mở project trong Codex, chạy `/hooks` và bật hook một lần. Rồi chạy `oma link codex` để các lần cập nhật sau giữ chúng trusted.

---

## Process Codex mà oh-my-agent spawn {#codex-processes-oh-my-agent-spawns}

Khi oh-my-agent tự spawn một subprocess Codex (ví dụ `oma agent spawn`), nó cũng truyền `--dangerously-bypass-hook-trust`. Flag đó chạy các hook đã enabled mà không kiểm hash. Nó không bỏ project trust. Flag chỉ áp dụng cho process do oh-my-agent khởi động và không bao giờ được ghi vào config của bạn.

---

## Không cần flag `[features] hooks` {#no-features-hooks-flag-needed}

Các bản phát hành oh-my-agent cũ ghi `[features] codex_hooks = true` vào Codex config. Codex 0.124 đã đổi tên flag đó thành `hooks` và biến hook thành tính năng ổn định, bật mặc định, nên không cần flag nào nữa. oh-my-agent không ghi khóa nào trong hai khóa này, và sẽ xóa các flag đã deprecated `codex_hooks` và `child_agents_md` khỏi bảng `[features]` khi tìm thấy.

---

## Tóm tắt {#summary}

| Tình huống | Bạn làm gì |
|:----------|:------------|
| Cài lần đầu trong một project | Không làm gì: installer đã ghi trust |
| `oma update` đổi command của hook | Không làm gì: hash mới được ghi |
| Installer in "not trusted (…)" | Sửa lý do, hoặc chạy `/hooks` một lần trong Codex |
| Hook bạn thêm vào `.codex/hooks.json` | Tự review trong `/hooks` |

## Xem thêm {#see-also}

- [Tích hợp vào project hiện có](./integration.md): những gì installer ghi cho từng vendor
- [Cài đặt toàn cục](./global-install.md): cài đặt cho toàn người dùng, ghi vào `~/.codex/`
