---
title: "Hướng dẫn: Sửa lỗi"
description: Hướng dẫn gỡ lỗi kỹ lưỡng bao gồm vòng lặp debug 5 bước có cấu trúc, phân loại mức độ nghiêm trọng, tín hiệu escalation và xác thực sau sửa.
---

# Hướng dẫn: Sửa lỗi

## Khi nào dùng workflow debug

Dùng `/debug` (hoặc nói "fix bug", "fix error", "debug" bằng ngôn ngữ tự nhiên) khi bạn có lỗi cụ thể cần chẩn đoán và sửa. Workflow cung cấp cách tiếp cận có cấu trúc, có thể tái hiện để tránh bẫy phổ biến là sửa triệu chứng thay vì nguyên nhân gốc.

---

## Template báo cáo lỗi

### Trường bắt buộc

| Trường | Mô tả | Ví dụ |
|:------|:-----------|:--------|
| **Thông báo lỗi** | Text lỗi hoặc stack trace chính xác | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Bước tái hiện** | Hành động theo thứ tự để kích hoạt lỗi | 1. Đăng nhập admin. 2. Vào /users. 3. Nhấn "Delete". |
| **Hành vi mong đợi** | Điều gì nên xảy ra | Người dùng bị xóa và biến mất khỏi danh sách. |
| **Hành vi thực tế** | Điều gì thực sự xảy ra | Trang crash với màn hình trắng. |

---

## Phân loại mức độ nghiêm trọng (P0-P3)

### P0 — Critical (Phản hồi ngay)

**Định nghĩa:** Production down, dữ liệu bị mất hoặc hỏng, vi phạm bảo mật đang diễn ra.

### P1 — High (Cùng phiên)

**Định nghĩa:** Tính năng cốt lõi bị hỏng cho số lượng đáng kể người dùng.

### P2 — Medium (Sprint này)

**Định nghĩa:** Tính năng hoạt động nhưng hành vi bị suy giảm. Ảnh hưởng khả năng sử dụng nhưng không chức năng.

### P3 — Low (Backlog)

**Định nghĩa:** Vấn đề thẩm mỹ, trường hợp biên hoặc bất tiện nhỏ.

---

## Vòng lặp debug 5 bước chi tiết

### Bước 1: Thu thập thông tin lỗi

Workflow hỏi (hoặc nhận từ người dùng): thông báo lỗi, bước tái hiện, hành vi mong đợi vs thực tế, chi tiết môi trường.

### Bước 2: Tái hiện lỗi

**Công cụ dùng:** `search_for_pattern`, `find_symbol` để định vị dòng chính xác nơi exception xảy ra.

### Bước 3: Chẩn đoán nguyên nhân gốc

**Công cụ dùng:** `find_referencing_symbols` để truy vết đường thực thi ngược từ điểm lỗi.

Nguyên tắc chính: chẩn đoán **nguyên nhân gốc**, không phải triệu chứng.

### Bước 4: Đề xuất sửa tối thiểu

Workflow trình bày nguyên nhân gốc đã xác định, bản sửa đề xuất (chỉ thay đổi cần thiết) và giải thích. **Workflow chặn ở đây cho đến khi người dùng xác nhận.**

### Bước 5: Áp dụng sửa và viết test hồi quy

Triển khai bản sửa đã duyệt và viết test hồi quy phải thất bại khi không có bản sửa và pass khi có bản sửa.

### Bước 6: Quét mẫu tương tự

Sau khi sửa, quét toàn bộ codebase tìm cùng mẫu gây lỗi.

### Bước 7: Tài liệu lỗi

Ghi file bộ nhớ với triệu chứng, nguyên nhân gốc, bản sửa, file thay đổi, test hồi quy và mẫu tương tự.

---

## Tín hiệu escalation

| Tín hiệu | Ý nghĩa | Hành động |
|--------|------------|--------|
| Cùng bản sửa thử hai lần | Vấn đề sâu hơn chẩn đoán ban đầu | Kích hoạt Exploration Loop |
| Nguyên nhân gốc đa lĩnh vực | Lỗi xuyên ranh giới domain | Escalation lên `/work` |
| Thiếu môi trường tái hiện | Lỗi chỉ xảy ra production | Thu thập log production, thêm instrumentation |
| Hạ tầng test hỏng | Không viết được test hồi quy | Sửa hạ tầng test trước |

---

## Checklist xác thực sau sửa

- [ ] **Test hồi quy thất bại khi không có bản sửa**
- [ ] **Test hồi quy pass khi có bản sửa**
- [ ] **Test hiện có vẫn pass**
- [ ] **Build thành công**
- [ ] **Mẫu tương tự đã được quét**
- [ ] **Bản sửa là tối thiểu**
- [ ] **Nguyên nhân gốc được tài liệu**
