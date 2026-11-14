---
title: Review mã AI trước khi merge
description: Review mã do AI viết để tìm lỗi, kiểm tra còn thiếu và hồi quy, bằng một diff có phạm vi và các phát hiện tái hiện được.
---

# Review mã AI trước khi merge {#review-ai-code-before-merging}

Dùng `oma-qa` để review một thay đổi so với hành vi dự định. Bắt đầu từ diff và các kiểm tra hiện có của project.

## Tải skill {#load-the-skill}

Yêu cầu coding agent chạy lệnh này, rồi đọc hướng dẫn cùng thư mục hỗ trợ được trả về:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Cung cấp đầu vào {#provide-the-input}

- Thay đổi, hoặc một ref so sánh cục bộ, chẳng hạn `origin/main`.
- Hành vi mong đợi, nhất là quyền, thay đổi dữ liệu và cách xử lý lỗi.
- Lệnh lint/test hiện có và mọi giới hạn môi trường.

## Giao task {#give-the-task}

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Kiểm tra kết quả {#check-the-result}

Kỳ vọng các phát hiện được sắp thứ tự, kèm tái hiện hoặc bằng chứng code quyết định, một cách sửa đề xuất và các lệnh đã thực sự chạy. Nếu không xác nhận được lỗi, báo cáo vẫn phải nêu phạm vi đã kiểm tra và các khoảng trống còn lại.

Mở từng vị trí được trích và xác minh trigger có tới đó. Chạy lại kiểm tra hẹp đã dùng làm bằng chứng. Công cụ còn thiếu hoặc đường chưa được test là một khoảng trống xác minh; riêng bản tóm tắt review không chứng minh thay đổi đủ an toàn để phát hành.

## Dependency và bước tiếp {#dependencies-and-next-step}

Agent cần truy cập diff, source cục bộ và các công cụ kiểm tra hiện có của project. Kiểm tra trình duyệt, bảo mật và hiệu năng cần đúng target và tooling tương ứng. Việc tải skill không cung cấp các dependency đó.

Với một lỗi đã xác nhận, tiếp tục bằng [debug một test đang thất bại](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Nếu bạn muốn hook của project hoặc workflow cho nhóm, [chọn một thiết lập runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) có `oma-qa`.
