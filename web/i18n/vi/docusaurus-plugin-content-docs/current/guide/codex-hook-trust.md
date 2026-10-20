---
title: "Hướng dẫn: Codex Hook Trust"
sidebar_label: Codex Hook Trust
description: Vì sao Codex hook không chạy cho đến khi bạn xem xét một lần, điều gì xảy ra khi cập nhật và oh-my-agent tự động xử lý gì cho Codex subprocess được spawn.
---

# Hướng dẫn: Codex Hook Trust {#codex-hook-trust}

Khi oh-my-agent cài đặt vào project, nó ghi hook config native của vendor, bao gồm `.codex/hooks.json` cho Codex CLI. Khác với Claude Code, Codex không tự chạy các hook này. Nó đặt mọi non-managed command hook sau Trust-On-First-Use (TOFU): hook chỉ chạy sau khi bạn đã xem xét và bật nó một lần.

Đây là cơ chế an toàn phía Codex. Lần đầu cần xem xét và bật hook; hành vi khi oh-my-agent cập nhật được mô tả bên dưới.

---

## Bước một lần: xem xét hook trong Codex {#the-one-time-step-review-hooks-in-codex}

Sau khi `oma` (install), `oma link` hoặc `oma update` ghi `.codex/hooks.json` trong project mà Codex chưa từng thấy (với global install là `~/.codex/hooks.json`), hook **chưa** chạy. Bạn phải mở Codex và xem xét một lần:

1. Mở project trong Codex CLI.
2. Chạy `/hooks` để mở hook browser (TUI).
3. Xem các hook được liệt kê và bật chúng.

Cho đến khi làm vậy, hook vẫn untrusted và bị bỏ qua âm thầm. Đây là lý do oh-my-agent in thông báo mỗi khi tạo hoặc thay đổi `.codex/hooks.json`:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Kiểm tra file được tạo trước khi mở Codex:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

Kết quả mong đợi là thông báo install/update, sau đó các hook xuất hiện trong Codex’s `/hooks` browser. `oma link codex` reconcile file được tạo; nó không thay thế quyết định trust một lần.

**Lưu ý:** `--dangerously-bypass-hook-trust` không giúp ở đây. Cảnh báo của nó ("Enabled hooks may run without review") chỉ có nghĩa là bypass review cho hook đã được bật — nó không chạy hook chưa từng được review. `/hooks` browser là cách duy nhất để bật hook lần đầu.

Bên dưới, Codex lưu quyết định trong `~/.codex/config.toml` dưới entry `[hooks.state]`, được định danh bởi path của hooks file, event, block và hook, cùng flag `enabled` và `trusted_hash` của command string.

---

## Điều gì xảy ra khi cập nhật {#what-happens-on-updates}

Sau khi trust hook, bạn không cần lặp lại bước này ở mỗi lần cập nhật:

- **Chạy lại `oma link` hoặc `oma update` giữ trust** miễn là hook command string không đổi. Codex so sánh hash đã lưu với command hiện tại; trùng khớp thì hook tiếp tục trusted.
- **Nếu phiên bản oh-my-agent sau này thay đổi hook command string**, hash không còn khớp và hook đó âm thầm trở lại untrusted. Bạn sẽ thấy thông báo installer lần nữa và cần trust lại qua `/hooks`.

Vì vậy review step chỉ cần ở lần đầu, và sau mỗi release thực sự thay đổi hook command.

---

## oh-my-agent tự động xử lý gì {#what-oh-my-agent-automates-for-you}

Khi oh-my-agent tự spawn một Codex subprocess — chẳng hạn cross-vendor agent được dispatch qua `oma agent spawn` — nó tự động truyền `--dangerously-bypass-hook-trust`. Nhờ vậy hook đã được kiểm tra của chính nó chạy qua các lần cập nhật mà không yêu cầu bạn trust lại thủ công.

Flag này **chỉ** được áp dụng cho Codex process do oh-my-agent spawn. Nó không bao giờ được ghi vào `~/.codex/config.toml` hoặc project config, nên không ảnh hưởng các Codex session bạn tự khởi động.

---

## Không cần flag `[features] hooks` {#no-features-hooks-flag-needed}

Các bản phát hành oh-my-agent cũ ghi `[features] codex_hooks = true` vào Codex config. Codex 0.124 đã đổi tên flag đó thành `hooks` và biến hook thành tính năng ổn định, bật mặc định, nên không cần flag nào nữa. oh-my-agent không ghi khóa nào trong hai khóa này, và sẽ xóa các flag đã deprecated `codex_hooks` và `child_agents_md` khỏi bảng `[features]` khi tìm thấy.

---

## Tóm tắt {#summary}

| Tình huống | Bạn làm gì |
|:----------|:------------|
| Cài lần đầu / `.codex/hooks.json` lần đầu trong project | Mở Codex, chạy `/hooks`, bật hook một lần |
| `oma update` với hook command không đổi | Không làm gì — trust được giữ |
| `oma update` làm hook command đổi | Chạy lại `/hooks` để trust lại (installer in thông báo) |
| Codex subprocess do oh-my-agent spawn | Không làm gì — bypass được áp dụng tự động |

## Xem thêm {#see-also}

- [Tích hợp vào project hiện có](./integration.md): những gì installer ghi cho từng vendor
- [Cài đặt toàn cục](./global-install.md): cài đặt cho toàn người dùng, ghi vào `~/.codex/`
