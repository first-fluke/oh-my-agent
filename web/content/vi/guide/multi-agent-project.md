---
title: "Hướng dẫn: Dự án đa agent"
description: Hướng dẫn đầy đủ cho phối hợp nhiều agent lĩnh vực xuyên frontend, backend, database, mobile và QA — từ lập kế hoạch đến merge.
---

# Hướng dẫn: Dự án đa agent

## Khi nào dùng điều phối đa agent

Tính năng của bạn trải nhiều lĩnh vực — backend API + frontend UI + database schema + mobile client + đánh giá QA. Một agent đơn không thể xử lý toàn bộ phạm vi, và bạn cần các lĩnh vực tiến triển song song mà không xung đột file.

Điều phối đa agent phù hợp khi:
- Task liên quan 2+ lĩnh vực (frontend, backend, mobile, db, QA, debug, pm).
- Có API contract giữa các lĩnh vực.
- Bạn muốn thực thi song song để giảm thời gian thực.
- Bạn cần đánh giá QA sau triển khai xuyên lĩnh vực.

---

## Chuỗi đầy đủ: /plan đến /review

### Bước 1: /plan — Yêu cầu và phân tách task

Workflow `/plan` chạy inline và tạo kế hoạch có cấu trúc: thu thập yêu cầu, phân tích tính khả thi, định nghĩa API contract, phân tách task, xem xét với người dùng, lưu kế hoạch.

### Bước 2: /work hoặc /orchestrate — Thực thi

| Khía cạnh | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Tương tác** | Tương tác — người dùng xác nhận ở mỗi giai đoạn | Tự động — chạy đến hoàn thành |
| **Lập kế hoạch PM** | Tích hợp sẵn | Cần plan.json từ /plan |
| **Phù hợp nhất** | Lần đầu, dự án phức tạp cần giám sát | Chạy lặp, task rõ ràng |

### Bước 3: agent:spawn — Quản lý agent cấp CLI

Lệnh `agent:spawn` là cơ chế cấp thấp mà workflow gọi nội bộ. Bạn cũng có thể dùng trực tiếp.

### Bước 4: /review — Xác minh QA

Pipeline QA đầy đủ: kiểm tra bảo mật OWASP, hiệu suất, accessibility WCAG 2.1 AA và chất lượng mã.

---

## Quy tắc contract-first

API contract là cơ chế đồng bộ giữa agent:

1. **Contract được định nghĩa trước khi bắt đầu triển khai.**
2. **Mỗi agent nhận contract liên quan làm ngữ cảnh.**
3. **Vi phạm contract được phát hiện trong giám sát.**
4. **Đánh giá QA kiểm tra tuân thủ contract.**

**Tại sao quan trọng:** Không có contract, agent backend có thể trả về `{ "user_id": 1 }` trong khi agent frontend dùng `{ "userId": 1 }`. Quy tắc contract-first loại bỏ hoàn toàn lớp lỗi tích hợp này.

---

## Cổng merge: 4 điều kiện

1. **Build thành công** — Tất cả mã biên dịch không lỗi.
2. **Test pass** — Tất cả test hiện có tiếp tục pass.
3. **Chỉ sửa file đã lên kế hoạch** — Agent không sửa file ngoài phạm vi.
4. **Đánh giá QA sạch** — Không còn phát hiện CRITICAL hoặc HIGH.

---

## Anti-pattern cần tránh

1. **Bỏ qua lập kế hoạch** — Bắt đầu `/orchestrate` không có plan.json.
2. **Workspace chồng chéo** — Gán hai agent cùng thư mục workspace.
3. **Thiếu API contract** — Spawn agent backend và frontend không định nghĩa contract trước.
4. **Bỏ qua phát hiện QA** — Xem đánh giá QA là tùy chọn.
5. **Quá song song** — Chạy task P1 trước khi P0 hoàn thành.

---

## Xác thực tích hợp đa lĩnh vực

Sau khi tất cả agent hoàn thành task riêng, tích hợp đa lĩnh vực phải được xác thực:

1. **Đồng bộ API contract** — Xác minh triển khai backend khớp contract mà frontend và mobile dùng.
2. **Nhất quán kiểu** — Tên field và kiểu nhất quán xuyên lĩnh vực.
3. **Luồng xác thực** — Backend, frontend và mobile xử lý token nhất quán.
4. **Xử lý lỗi** — Tất cả consumer API xử lý định dạng lỗi đã tài liệu.
5. **Đồng bộ schema database** — Model ORM backend khớp chính xác schema.

---

## Khi nào hoàn thành

Dự án đa agent hoàn thành khi:
- Tất cả agent ở mọi tier ưu tiên đã hoàn thành thành công.
- Script xác minh pass cho mọi agent.
- Đánh giá QA báo cáo không CRITICAL và không HIGH.
- Xác nhận đồng bộ API contract đa lĩnh vực.
- Build thành công và tất cả test pass.
- Báo cáo cuối được ghi vào bộ nhớ và trình bày cho người dùng.
