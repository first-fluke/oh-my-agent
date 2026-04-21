---
title: Workflow
description: Tham chiếu đầy đủ cho tất cả 16 workflow oh-my-agent — lệnh slash, chế độ liên tục và không liên tục, từ khóa trigger bằng 11 ngôn ngữ, các giai đoạn và bước, file đọc và ghi, cơ chế phát hiện tự động, lọc mẫu thông tin và quản lý trạng thái chế độ liên tục.
---

# Workflow

Workflow là quy trình có cấu trúc nhiều bước được kích hoạt bởi lệnh slash hoặc từ khóa ngôn ngữ tự nhiên. Chúng định nghĩa cách agent cộng tác trong task — từ tiện ích đơn giai đoạn đến cổng chất lượng phức tạp 5 giai đoạn.

Có 16 workflow, trong đó 4 là liên tục (duy trì trạng thái và không thể bị gián đoạn ngẫu nhiên).

---

## Workflow liên tục

Workflow liên tục tiếp tục chạy cho đến khi tất cả task hoàn thành. Chúng duy trì trạng thái trong `.agents/state/` và đưa lại ngữ cảnh `[OMA PERSISTENT MODE: ...]` vào mỗi tin nhắn người dùng cho đến khi được vô hiệu hóa tường minh.

### /orchestrate

**Mô tả:** Thực thi agent song song tự động qua CLI. Spawn subagent qua CLI, điều phối qua MCP memory, giám sát tiến trình và chạy vòng lặp xác minh.

**Liên tục:** Có. File trạng thái: `.agents/state/orchestrate-state.json`.

### /work

**Mô tả:** Điều phối đa lĩnh vực từng bước. PM lập kế hoạch trước, sau đó agent thực thi với xác nhận người dùng ở mỗi cổng, tiếp theo đánh giá QA và vòng lặp khắc phục.

**Liên tục:** Có. File trạng thái: `.agents/state/work-state.json`.

### /ultrawork

**Mô tả:** Workflow chú trọng chất lượng. 5 giai đoạn, 17 bước tổng, 11 bước đánh giá. Mỗi giai đoạn có cổng phải pass trước khi tiếp tục.

**Liên tục:** Có. File trạng thái: `.agents/state/ultrawork-state.json`.

**Giai đoạn:**

| Giai đoạn | Bước | Agent | Góc nhìn đánh giá |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | Agent PM (inline) | Hoàn chỉnh, Meta-review, Chống over-engineering/Đơn giản |
| **IMPL** | 5 | Agent Dev (spawn) | Triển khai |
| **VERIFY** | 6-8 | Agent QA (spawn) | Đồng bộ, An toàn (OWASP), Ngăn hồi quy |
| **REFINE** | 9-13 | Agent Debug (spawn) | Tách file, Tái sử dụng, Tác động lan truyền, Nhất quán, Dead code |
| **SHIP** | 14-17 | Agent QA (spawn) | Chất lượng mã (lint/coverage), UX Flow, Vấn đề liên quan, Sẵn sàng triển khai |

### /ralph

**Mô tả:** Vòng lặp thực thi tự tham chiếu liên tục. Bọc ultrawork với verifier độc lập kiểm tra tiêu chí hoàn thành sau mỗi lần lặp. Tiếp tục lặp cho đến khi tất cả tiêu chí pass hoặc bảo vệ kích hoạt.

**Liên tục:** Có. File trạng thái: `.agents/state/ralph-state.json`.

---

## Workflow không liên tục

### /plan

**Mô tả:** Phân tách task do PM dẫn dắt. Phân tích yêu cầu, chọn tech stack, phân tách thành task có ưu tiên với phụ thuộc, định nghĩa API contract.

**Đầu ra:** `.agents/results/plan-{sessionId}.json`, ghi bộ nhớ.

### /exec-plan

**Mô tả:** Tạo, quản lý và theo dõi kế hoạch thực thi dưới dạng artifact repository trong `docs/exec-plans/`.

### /brainstorm

**Mô tả:** Khám phá ý tưởng ưu tiên thiết kế. Khám phá ý định, làm rõ ràng buộc, đề xuất hướng tiếp cận, tạo tài liệu thiết kế được duyệt trước khi lập kế hoạch.

### /architecture

**Mô tả:** Workflow kiến trúc phần mềm — chẩn đoán vấn đề kiến trúc, chọn phương pháp phân tích phù hợp (định tuyến chẩn đoán / design-twice / ATAM / CBAM / ADR), so sánh tùy chọn, tổng hợp ý kiến bên liên quan, và tạo khuyến nghị, đánh giá hoặc ADR.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Chung | "architecture", "ADR", "ATAM", "CBAM" |
| Tiếng Anh | "architecture review", "architectural tradeoff" |
| Tiếng Hàn | "아키텍처", "설계 검토" |
| Tiếng Nhật | "アーキテクチャ" |
| Tiếng Trung | "架构" |

**Các bước:** Định khung quyết định (kiến trúc mới / đánh giá / phân tích đánh đổi / ưu tiên đầu tư / viết ADR) -> Chọn phương pháp qua định tuyến chẩn đoán -> Phân tích kiến trúc hiện tại qua MCP code analysis (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> Tổng hợp ý kiến bên liên quan (chỉ khi quyết định đủ cross-cutting để biện minh chi phí) -> Tạo khuyến nghị với giả định, đánh đổi, rủi ro, bước xác minh rõ ràng -> Bàn giao cho `/plan` khi cần triển khai.

**Quy tắc:** KHÔNG viết code triển khai hoặc kế hoạch task trong workflow này. Bàn giao cho `/plan` sau quyết định kiến trúc. Luôn dùng MCP tools; không thay thế bằng đọc file thô hoặc grep.

**Khi dùng:** Lựa chọn kiến trúc hệ thống, quyết định ranh giới module/service/ownership, ưu tiên refactor, viết ADR, điều tra khó khăn kiến trúc (khuếch đại thay đổi, phụ thuộc ẩn, API vụng).

---

### /deepinit

**Mô tả:** Khởi tạo dự án đầy đủ. Phân tích codebase hiện có, tạo AGENTS.md, ARCHITECTURE.md và cơ sở kiến thức `docs/` có cấu trúc.

### /review

**Mô tả:** Pipeline đánh giá QA đầy đủ. Kiểm tra bảo mật (OWASP Top 10), phân tích hiệu suất, kiểm tra accessibility (WCAG 2.1 AA) và đánh giá chất lượng mã.

### /debug

**Mô tả:** Chẩn đoán và sửa lỗi có cấu trúc với viết test hồi quy và quét mẫu tương tự.

### /design

**Mô tả:** Workflow thiết kế 7 giai đoạn tạo DESIGN.md với token, mẫu component và quy tắc accessibility.

### /scm

**Mô tả:** Tạo Conventional Commits với tự động tách theo tính năng.

### /tools

**Mô tả:** Quản lý khả năng hiển thị và hạn chế công cụ MCP.

### /pdf

**Mô tả:** Chuyển đổi PDF sang Markdown bằng `opendataloader-pdf` — trích xuất văn bản, bảng, tiêu đề và hình ảnh theo thứ tự đọc chính xác.

**Từ khóa trigger:** Không (gọi tường minh với đường dẫn file đầu vào).

**Các bước:** Xác minh đầu vào (kiểm tra file tồn tại) -> Xác định vị trí đầu ra (người dùng chỉ định hoặc cùng thư mục với đầu vào) -> Chạy `uvx opendataloader-pdf` (không cần cài đặt) -> Với PDF quét, dùng chế độ hybrid với OCR -> Chuẩn hóa đầu ra bằng `uvx mdformat` -> Xác minh khả năng đọc và cấu trúc -> Báo cáo bất kỳ vấn đề chuyển đổi nào (bảng thiếu, văn bản lộn xộn).

**Quy tắc:** Vị trí đầu ra mặc định là cùng thư mục với PDF đầu vào. Không bao giờ bỏ qua bước. Ngôn ngữ phản hồi theo `.agents/oma-config.yaml`.

**Khi dùng:** Chuyển đổi tài liệu PDF sang Markdown cho ngữ cảnh LLM hoặc thu thập RAG, trích xuất nội dung có cấu trúc (bảng, tiêu đề, danh sách) từ PDF.

---

### /stack-set

**Mô tả:** Tự phát hiện tech stack dự án và tạo tham chiếu theo ngôn ngữ cho skill backend.

---

## Skill so với workflow

| Khía cạnh | Skill | Workflow |
|--------|--------|-----------|
| **Là gì** | Chuyên môn agent (agent biết gì) | Quy trình điều phối (agent làm việc cùng nhau thế nào) |
| **Vị trí** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Kích hoạt** | Tự động qua từ khóa định tuyến skill | Lệnh slash hoặc từ khóa trigger |
| **Phạm vi** | Thực thi đơn lĩnh vực | Nhiều bước, thường đa agent |
| **Ví dụ** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Phát hiện tự động: cách hoạt động

### Hệ thống hook

oh-my-agent dùng hook `UserPromptSubmit` chạy trước mỗi tin nhắn người dùng được xử lý:

1. **`triggers.json`**: Định nghĩa ánh xạ từ khóa-workflow cho 11 ngôn ngữ được hỗ trợ.
2. **`keyword-detector.ts`**: Logic TypeScript quét đầu vào người dùng so với từ khóa trigger và đưa ngữ cảnh kích hoạt workflow vào.
3. **`persistent-mode.ts`**: Áp dụng thực thi workflow liên tục bằng cách kiểm tra file trạng thái đang hoạt động.

### Lọc mẫu thông tin

Nếu đầu vào khớp cả từ khóa workflow và mẫu thông tin (ví dụ: "what is orchestrate?"), mẫu thông tin được ưu tiên và không workflow nào được kích hoạt.

### Workflow loại trừ

Các workflow sau bị loại trừ khỏi phát hiện tự động và phải được gọi bằng `/command` tường minh:
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`
- `/pdf`

---

## Cơ chế chế độ liên tục

### File trạng thái

Workflow liên tục (orchestrate, ultrawork, work, ralph) tạo file trạng thái trong `.agents/state/`.

### Tăng cường

Trong khi workflow liên tục đang hoạt động, hook `persistent-mode.ts` đưa `[OMA PERSISTENT MODE: {workflow-name}]` vào mỗi tin nhắn người dùng. Đảm bảo workflow tiếp tục thực thi xuyên các lượt hội thoại.

### Vô hiệu hóa

Để vô hiệu hóa workflow liên tục, người dùng nói "workflow done" (hoặc tương đương trong ngôn ngữ đã cấu hình). Thao tác này xóa file trạng thái, dừng đưa ngữ cảnh chế độ liên tục và trở về hoạt động bình thường.

---

## Chuỗi workflow điển hình

### Tính năng nhanh
```
/plan → xem kết quả → /exec-plan
```

### Dự án đa lĩnh vực phức tạp
```
/work → PM lập kế hoạch → người dùng xác nhận → agent spawn → QA đánh giá → sửa vấn đề → phát hành
```

### Phân phối chất lượng tối đa
```
/ultrawork → PLAN (4 bước đánh giá) → IMPL → VERIFY (3 bước đánh giá) → REFINE (5 bước đánh giá) → SHIP (4 bước đánh giá)
```

### Điều tra lỗi
```
/debug → tái hiện → nguyên nhân gốc → sửa tối thiểu → test hồi quy → quét mẫu tương tự
```

### Pipeline từ thiết kế đến triển khai
```
/brainstorm → tài liệu thiết kế → /plan → phân tách task → /orchestrate → triển khai song song → /review → /scm
```

### Hoàn thành đảm bảo
```
/ralph → định nghĩa tiêu chí → vòng lặp ultrawork → judge xác minh → lặp lại nếu cần → tất cả tiêu chí pass → hoàn thành
```
