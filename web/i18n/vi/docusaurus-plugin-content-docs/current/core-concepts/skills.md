---
title: Skill
description: Hướng dẫn đầy đủ về kiến trúc skill 2 tầng oh-my-agent — thiết kế SKILL.md, tải tài nguyên theo nhu cầu, mọi tài nguyên dùng chung được giải thích, giao thức có điều kiện, loại tài nguyên theo skill, quy trình thực thi vendor, toán tiết kiệm token và cơ chế định tuyến skill.
---

# Skill

Skill là gói kiến thức có cấu trúc cung cấp chuyên môn lĩnh vực cho mỗi agent. Chúng không chỉ là prompt — chúng chứa quy trình thực thi, tham chiếu tech stack, template mã, playbook xử lý lỗi, checklist chất lượng và ví dụ few-shot, được tổ chức trong kiến trúc 2 tầng thiết kế cho hiệu quả token.

---

## Thiết kế 2 tầng

### Layer 1: SKILL.md (~800 byte, luôn tải)

Mỗi skill có file `SKILL.md` ở gốc. File này luôn được tải vào cửa sổ ngữ cảnh khi skill được tham chiếu. Nó chứa:

- **YAML frontmatter** với `name` và `description` (dùng cho định tuyến và hiển thị)
- **Khi nào sử dụng / Khi nào KHÔNG sử dụng** — điều kiện kích hoạt tường minh
- **Quy tắc cốt lõi** — 5-15 ràng buộc quan trọng nhất cho lĩnh vực
- **Tổng quan kiến trúc** — cách mã nên được cấu trúc
- **Danh sách thư viện** — phụ thuộc được phê duyệt và mục đích
- **Tham chiếu** — con trỏ đến tài nguyên Layer 2 (không bao giờ tự động tải)

### Layer 2: resources/ (tải theo nhu cầu)

Thư mục `resources/` chứa kiến thức thực thi sâu. Các file chỉ được tải khi:
1. Agent được gọi tường minh (qua `/command` hoặc trường skills của agent)
2. Tài nguyên cụ thể cần cho loại và độ khó task hiện tại

Việc tải theo nhu cầu được điều chỉnh bởi hướng dẫn tải ngữ cảnh (`.agents/skills/_shared/core/context-loading.md`), ánh xạ loại task đến tài nguyên cần thiết cho mỗi agent.

---

## Loại tài nguyên theo skill

| Loại tài nguyên | Mẫu tên file | Mục đích | Khi tải |
|--------------|-----------------|---------|-------------|
| **Quy trình thực thi** | `execution-protocol.md` | Quy trình từng bước: Phân tích -> Lập kế hoạch -> Triển khai -> Xác minh | Luôn (cùng SKILL.md) |
| **Tech stack** | `tech-stack.md` | Thông số công nghệ chi tiết, phiên bản, cấu hình | Task phức tạp |
| **Playbook lỗi** | `error-playbook.md` | Quy trình phục hồi với escalation "3 lần" | Chỉ khi có lỗi |
| **Checklist** | `checklist.md` | Xác minh chất lượng theo lĩnh vực | Ở bước Verify |
| **Snippet** | `snippets.md` | Mẫu mã sao chép-dán sẵn | Task Medium/Complex |
| **Ví dụ** | `examples.md` hoặc `examples/` | Ví dụ few-shot input/output cho LLM | Task Medium/Complex |
| **Biến thể** | Thư mục `stack/` | Tham chiếu theo ngôn ngữ/framework (tạo bởi `/stack-set`) | Khi stack tồn tại |
| **Template** | `component-template.tsx`, `screen-template.dart` | Template file boilerplate | Khi tạo component |
| **Tham chiếu lĩnh vực** | `orm-reference.md`, `anti-patterns.md`, v.v. | Kiến thức lĩnh vực sâu cho subtask cụ thể | Theo loại task |

---

## Tài nguyên dùng chung (_shared/)

Tất cả agent chia sẻ nền tảng chung từ `.agents/skills/_shared/`. Được tổ chức thành ba danh mục:

### Tài nguyên cốt lõi

| Tài nguyên | Mục đích | Khi tải |
|----------|---------|-------------|
| **`skill-routing.md`** | Ánh xạ từ khóa task đến agent đúng | Tham chiếu bởi orchestrator và skill coordination |
| **`context-loading.md`** | Định nghĩa tài nguyên nào tải cho loại task và độ khó nào | Khi bắt đầu workflow |
| **`prompt-structure.md`** | Định nghĩa bốn yếu tố mỗi prompt task phải chứa: Goal, Context, Constraints, Done When | Tham chiếu bởi agent PM và tất cả workflow |
| **`clarification-protocol.md`** | Định nghĩa mức không chắc chắn (LOW/MEDIUM/HIGH) với hành động cho mỗi mức | Khi yêu cầu mơ hồ |
| **`context-budget.md`** | Quản lý ngân sách token | Khi bắt đầu workflow |
| **`difficulty-guide.md`** | Tiêu chí phân loại task Simple/Medium/Complex | Khi bắt đầu task |
| **`vendor-detection.md`** | Giao thức phát hiện môi trường runtime hiện tại | Khi bắt đầu workflow |

### Tài nguyên runtime

| Tài nguyên | Mục đích |
|----------|---------|
| **`memory-protocol.md`** | Định dạng file bộ nhớ và thao tác cho subagent CLI |
| **`execution-protocols/claude.md`** | Mẫu thực thi đặc thù Claude Code |
| **`execution-protocols/gemini.md`** | Mẫu thực thi đặc thù Gemini CLI |
| **`execution-protocols/codex.md`** | Mẫu thực thi đặc thù Codex CLI |
| **`execution-protocols/qwen.md`** | Mẫu thực thi đặc thù Qwen CLI |

### Tài nguyên có điều kiện

| Tài nguyên | Điều kiện kích hoạt | Token ước tính |
|----------|-------------------|----------------|
| **`quality-score.md`** | Giai đoạn VERIFY hoặc SHIP bắt đầu | ~250 |
| **`experiment-ledger.md`** | Thí nghiệm đầu tiên được ghi | ~250 |
| **`exploration-loop.md`** | Cùng cổng thất bại hai lần trên cùng vấn đề | ~250 |

---

## Cách skill định tuyến qua skill-routing.md

### Định tuyến đơn giản (một lĩnh vực)

Prompt chứa "Build a login form with Tailwind CSS" khớp từ khóa `UI`, `component`, `form`, `Tailwind` và định tuyến đến **oma-frontend**.

### Định tuyến yêu cầu phức tạp

Yêu cầu đa lĩnh vực theo thứ tự thực thi đã thiết lập:

| Mẫu yêu cầu | Thứ tự thực thi |
|----------------|----------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) song song -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) song song -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "Do everything automatically" | oma-orchestrator (nội bộ: oma-pm -> agent -> oma-qa) |

### Quy tắc phụ thuộc giữa agent

**Có thể chạy song song (không phụ thuộc):**
- oma-backend + oma-frontend (khi API contract đã định nghĩa trước)
- oma-backend + oma-mobile (khi API contract đã định nghĩa trước)
- oma-frontend + oma-mobile (độc lập nhau)

**Phải chạy tuần tự:**
- oma-brainstorm -> oma-pm (thiết kế trước lập kế hoạch)
- oma-pm -> tất cả agent khác (lập kế hoạch trước)
- agent triển khai -> oma-qa (đánh giá sau triển khai)

**QA luôn cuối cùng**, trừ khi người dùng yêu cầu đánh giá chỉ file cụ thể.

---

## Toán tiết kiệm token

Xem xét phiên điều phối 5 agent (pm, backend, frontend, mobile, qa):

**Không có tải lũy tiến:**
- Mỗi agent tải tất cả tài nguyên: ~4.000 token mỗi agent
- Tổng: 5 x 4.000 = 20.000 token tiêu thụ trước khi bắt đầu làm việc

**Với tải lũy tiến:**
- Chỉ Layer 1 cho tất cả agent: 5 x 800 = 4.000 token
- Layer 2 chỉ tải cho agent đang hoạt động (thường 1-2 cùng lúc): +1.500 token
- Tổng: ~5.500 token

**Tiết kiệm: khoảng 72-75%**

Trên mô hình tầng flash (128K ngữ cảnh), đây là sự khác biệt giữa 108K token có sẵn cho công việc và 125K token — biên độ đáng kể cho task phức tạp.

---

## Tải tài nguyên theo độ khó task

### Simple (3-5 lượt dự kiến)

Thay đổi một file, yêu cầu rõ ràng, lặp lại mẫu hiện có.

Tải: Chỉ `execution-protocol.md`. Bỏ qua phân tích, tiến thẳng đến triển khai với checklist tối thiểu.

### Medium (8-15 lượt dự kiến)

Thay đổi 2-3 file, cần một số quyết định thiết kế, áp dụng mẫu vào lĩnh vực mới.

Tải: `execution-protocol.md` + `examples.md`. Quy trình chuẩn với phân tích ngắn gọn và xác minh đầy đủ.

### Complex (15-25 lượt dự kiến)

Thay đổi 4+ file, cần quyết định kiến trúc, giới thiệu mẫu mới, phụ thuộc agent khác.

Tải: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Quy trình mở rộng với checkpoint, ghi tiến trình giữa chừng và xác minh đầy đủ bao gồm `common-checklist.md`.

---

## Clarification Debt và số liệu phiên

Clarification Debt (CD) đo chi phí yêu cầu không rõ ràng trong phiên. Orchestrator theo dõi mọi sửa chữa của người dùng và tính điểm:

| Loại sự kiện | Điểm | Mô tả |
|------------|--------|-------------|
| `clarify` | +10 | Câu hỏi làm rõ đơn giản (bình thường cho MEDIUM) |
| `correct` | +25 | Hiểu sai ý định cần đổi hướng |
| `redo` | +40 | Vi phạm phạm vi/charter cần rollback và khởi động lại |
| `blocked` | +0 | Agent đúng khi dừng và hỏi (hành vi tốt — không bị phạt) |

**Ngưỡng và áp dụng:**
- **CD >= 50** → Mục RCA bắt buộc thêm vào `lessons-learned.md`
- **CD >= 80** → Phiên bị dừng, người dùng phải chỉ định lại yêu cầu
- **`redo` >= 2** → Orchestrator tạm dừng và yêu cầu xác nhận phạm vi tường minh

---

## Sprint decomposition cho task phức tạp

Task phức tạp (4+ file, quyết định kiến trúc) dùng thực thi dựa trên sprint thay vì một lần chạy dài:

1. **Phân tách** thành 2-4 sprint tập trung tính năng, mỗi sprint có thể test độc lập
2. **Mục tiêu** 5-8 lượt mỗi sprint
3. **Cổng sprint** sau mỗi sprint: Sản phẩm sprint hoàn thành? Lint/test pass? Nếu sprint mất 2x lượt dự kiến → ghi checkpoint, thông báo người dùng
4. **Tiếp tục** sprint tiếp theo khi cổng pass

---

## Giao thức reset ngữ cảnh

Agent chạy lâu giảm chất lượng khi ngữ cảnh đầy. Orchestrator (không phải agent) giám sát điều này và kích hoạt reset.

**Điều kiện kích hoạt:**

| Điều kiện | Phát hiện | Hành động |
|-----------|-----------|--------|
| Cạn ngân sách lượt | Agent dùng >= 80% lượt dự kiến VÀ tiêu chí chấp nhận < 50% hoàn thành | Reset ngữ cảnh |
| Đình trệ tiến trình | Không cập nhật file progress trong 3+ chu kỳ giám sát liên tiếp | Reset ngữ cảnh |
| Đầu ra nông | File kết quả chứa marker stub hoặc placeholder TODO | Re-spawn với hướng dẫn tường minh |

**Quy trình reset:**
1. **Checkpoint** — Lưu trạng thái hiện tại agent
2. **Kết thúc** — Dừng lần chạy agent hiện tại
3. **Re-spawn** — Khởi động agent mới với checkpoint làm ngữ cảnh
4. **Tiếp tục** — Agent mới đọc checkpoint, tiếp tục từ mục còn lại
