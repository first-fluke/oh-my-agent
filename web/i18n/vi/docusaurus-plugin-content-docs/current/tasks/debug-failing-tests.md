---
title: Debug một test đang thất bại
description: Tái hiện lỗi test, khoanh nguyên nhân, sửa trong phạm vi hẹp và xác minh hồi quy bằng test runner hiện có của project.
---

# Debug một test đang thất bại {#debug-a-failing-test}

Dùng `oma-debug` khi bạn có một lệnh đang thất bại, một stack trace, hoặc một kết quả sai lặp lại được.

## Tải skill {#load-the-skill}

Yêu cầu coding agent chạy lệnh này và đọc hướng dẫn cùng thư mục hỗ trợ:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Cung cấp đầu vào {#provide-the-input}

- Lệnh thất bại chính xác và toàn bộ output lỗi liên quan.
- Hành vi mong đợi, checkout/ref, phiên bản runtime và các dịch vụ cục bộ bắt buộc.
- File hoặc thay đổi gần đây mà bạn nghi ngờ, cùng phạm vi sửa được phép.

## Giao task {#give-the-task}

Ví dụ cụ thể này dùng fixture hồi quy plugin-bootstrap của repository. Với project khác, hãy dùng lệnh đang thất bại của bạn.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Kiểm tra kết quả {#check-the-result}

Kỳ vọng lỗi đã tái hiện, đường nhân quả, bản vá trong phạm vi và một test hồi quy gắn với lỗi đó. Báo cáo phải tách môi trường không dùng được khỏi lỗi code đã chẩn đoán.

Kiểm tra test hồi quy thất bại với hành vi gốc và pass với bản sửa. Chạy lại lệnh đã nêu trong cùng môi trường, rồi xem kết quả các test liên quan. Nếu việc tái hiện vẫn bị chặn, kỳ vọng đúng vật cản và bằng chứng yếu hơn đang có.

## Dependency và bước tiếp {#dependencies-and-next-step}

Agent dùng test runner của project và các công cụ điều hướng source đã cấu hình. Ví dụ này cần Bun và dependency phát triển của repository đã có sẵn. Các fixture plugin này bị bỏ qua trên Windows; hãy dùng một test thất bại mà nền tảng của bạn hỗ trợ. Việc tải skill không cài dependency và không sửa một dịch vụ còn thiếu.

Xem [ví dụ sửa plugin-hook](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) để biết thay đổi source thực tế và ranh giới fixture. Với thực thi được quản lý hoặc hook của project, [chọn một thiết lập runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) có `oma-debug`.
