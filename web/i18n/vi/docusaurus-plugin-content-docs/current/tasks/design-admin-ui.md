---
title: Thiết kế admin UI quanh các task thực tế
description: Xác định phân cấp, mật độ bảng, các trạng thái và handoff thiết kế của một màn admin, đồng thời giữ stack và hợp đồng hình ảnh của project.
---

# Thiết kế admin UI quanh các task thực tế {#design-an-admin-ui-around-its-actual-tasks}

Dùng `oma-design` để quyết định một màn admin nên hỗ trợ người dùng thế nào trước khi đổi code ứng dụng.

## Tải skill {#load-the-skill}

Yêu cầu coding agent chạy lệnh này và đọc hướng dẫn cùng thư mục hỗ trợ được trả về:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Cung cấp đầu vào {#provide-the-input}

- Một màn đang chạy, ảnh chụp màn hình, hoặc các component liên quan.
- Ai dùng màn này và các hành động họ cần hoàn thành.
- `DESIGN.md`, token, component, ngôn ngữ và yêu cầu responsive/accessibility hiện có.

## Giao task {#give-the-task}

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Kiểm tra kết quả {#check-the-result}

Kỳ vọng các quyết định phân cấp và mật độ riêng cho màn, hành vi trạng thái, ánh xạ semantic token và handoff triển khai. Thay đổi hệ thống được chấp nhận nằm trong `DESIGN.md` chuẩn của project.

Đối chiếu đề xuất với task phân loại: người dùng có nhận ra ticket tiếp theo, đổi bộ lọc, mở chi tiết và phục hồi sau lỗi không? Khi có mẫu đã render, hãy kiểm tra focus bàn phím, chữ Hàn/Anh đọc được và hành vi trên màn hẹp. Handoff chỉ là tài liệu thì việc thực thi trên trình duyệt và accessibility vẫn chưa được xác minh.

## Dependency và bước tiếp {#dependencies-and-next-step}

Với hướng admin hoặc giao diện sản phẩm mới, [hợp đồng định tuyến](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) chọn Interface Design. Critique, audit và polish UI hiện có chọn Impeccable; art direction web khác dùng Taste. Một nhà cung cấp được tải cho thao tác hiện tại.

Các hướng dẫn bên ngoài đó có thể cần bản tải riêng hoặc công cụ runtime. Stack hiện có, thương hiệu, phủ CJK, mục tiêu WCAG và yêu cầu reduced-motion vẫn là ràng buộc. Việc tải hướng dẫn không render và không xác minh UI.

Dùng chuyên gia frontend của project để triển khai. Với hook và workflow của project, [chọn một thiết lập runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) có `oma-design`.
