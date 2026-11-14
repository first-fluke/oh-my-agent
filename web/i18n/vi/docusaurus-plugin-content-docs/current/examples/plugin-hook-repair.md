---
title: Sửa hook của plugin và bootstrap project
description: Xem đường hook của marketplace, cung cấp Bash và receipt bootstrap của project được sửa bằng các fixture hồi quy.
---

# Sửa hook của plugin và bootstrap project {#repairing-plugin-hooks-and-project-bootstrap}

Bản sửa plugin trong [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) xử lý dispatch hook và hành vi bootstrap. Cha của nó, `82649cbd`, là trạng thái trước cho phép so sánh này.

## Cơ chế lỗi {#failure-mechanism}

[Manifest hook cũ](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) gọi các file dưới `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Các đường đó phụ thuộc file được sinh; fixture với cache plugin mới không đưa chúng vào thư mục plugin.

[Bootstrap cũ](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) cũng chạy Bash installer đã tải qua `sh -c`. Marker thành công nằm trong dữ liệu plugin dùng chung, và đường nhanh chỉ kiểm tra marker đó, phiên bản CLI và sự có mặt của file settings của project. Một project thứ hai đã có file settings vì vậy có thể bỏ qua việc nối dây của chính nó.

## Bản sửa {#repair}

[Dispatcher mới](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) gọi CLI đã cài. Khi một hook project thực thi được đã sở hữu event đó, hook marketplace nhường cho nó để event không bị dispatch hai lần.

[Bootstrap mới](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Chạy Bash installer qua Bash và kiểm tra lỗi cung cấp.
- Ép cài project ngay cả khi một thiết lập cài global được kế thừa.
- Lưu receipt trong `.agents/state/plugin-bootstrap.version` của project đó.
- Kiểm tra cấu hình, metadata phiên bản, wrapper thực thi được và các event đã đăng ký trước khi dùng lại receipt.
- Giữ chẩn đoán cài thất bại trong `.agents/state/plugin-bootstrap.last-error.log` mà không ghi receipt thành công.

## Tái hiện các kiểm tra hồi quy {#reproduce-the-regression-checks}

Dùng một checkout dùng một lần của `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c`, với Bun và dependency phát triển của repository đã có sẵn. Từ thư mục gốc của checkout:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

Các fixture phủ các ranh giới khác nhau:

| Fixture | Assertion của nó kiểm tra gì |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Cung cấp chỉ qua Bash, receipt riêng từng project, cấu hình chỉ có CUE, nối dây chưa đủ, lỗi phiên bản và chẩn đoán được giữ lại. |
| [Hook dispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch với cache mới, ngân sách thời gian của handler, giữ nguyên payload, quyền sở hữu của hook project khớp, và fallback khi quyền sở hữu đó thiếu hoặc không hợp lệ. |
| [Install integration](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Hai lần cài project, settings của người dùng được giữ, một lần giao prompt/Stop qua cả hai đăng ký, và thử lại sau khi nối dây thất bại. |

Các fixture này tạo thư mục tạm và lệnh CLI giả; fixture tích hợp dùng hook composer thật. Chúng kiểm tra dispatch shell và hiệu ứng đã ghi mà không cần cài marketplace hay gọi model. Các suite bị bỏ qua trên Windows.

## Những gì còn phải kiểm tra trong session thật {#what-remains-to-check-in-a-real-session}

Một lần chạy fixture pass không chứng minh session Claude Code đang hoạt động. Trong project đích thật, hãy xem receipt và cấu hình, chạy `oma doctor`, khởi động lại session, rồi thực hiện hành vi prompt và Stop liên quan trong khi kiểm tra hiệu ứng quan sát được. Khả dụng của CLI, credential, hành vi provider và chính sách hook của host cần bằng chứng riêng.

Với cùng cách tái hiện, sửa và xác minh trên một lỗi khác, hãy bắt đầu từ [debug một test đang thất bại](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Chọn cách thiết lập](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) giải thích khi nào cần runtime của project.
