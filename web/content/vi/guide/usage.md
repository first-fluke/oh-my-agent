---
title: Hướng dẫn sử dụng
description: Hướng dẫn sử dụng toàn diện oh-my-agent — bắt đầu nhanh, ví dụ thực tế chi tiết bao gồm task đơn, dự án đa lĩnh vực, sửa lỗi, design system, thực thi song song CLI và ultrawork. Tất cả lệnh workflow, ví dụ phát hiện tự động đa ngôn ngữ, 14 skill với trường hợp sử dụng, thiết lập dashboard, khái niệm chính, mẹo và khắc phục sự cố.
---

# Cách sử dụng oh-my-agent

## Bắt đầu nhanh

1. Mở dự án trong IDE hỗ trợ AI (Claude Code, Gemini CLI, Cursor, Antigravity, v.v.)
2. Skill được tự động phát hiện từ `.agents/skills/`
3. Mô tả bạn muốn gì bằng ngôn ngữ tự nhiên — oh-my-agent định tuyến đến agent phù hợp
4. Cho công việc đa agent, dùng `/work` hoặc `/orchestrate`

Đó là toàn bộ quy trình. Không cần cú pháp đặc biệt cho task đơn lĩnh vực.

---

## Ví dụ 1: Task đơn giản

**Bạn nhập:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Diễn biến:**

1. Skill `oma-frontend` tự động kích hoạt (từ khóa: "form", "component", "Tailwind CSS")
2. Layer 1 (SKILL.md) đã tải — danh tính agent, quy tắc cốt lõi, danh sách thư viện
3. Tài nguyên Layer 2 tải theo nhu cầu
4. Agent xuất **CHARTER_CHECK** và triển khai component React production-ready với TypeScript, validation, test và accessibility

---

## Ví dụ 2: Dự án đa lĩnh vực

**Bạn nhập:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Sử dụng `/work`:**

1. Agent PM lập kế hoạch và phân tách task
2. Bạn xem xét và xác nhận kế hoạch
3. Agent spawn theo tier ưu tiên (P0 trước, rồi P1)
4. Agent QA đánh giá toàn bộ
5. Lặp lại nếu QA tìm thấy vấn đề CRITICAL

---

## Ví dụ 3: Sửa lỗi

**Bạn nhập:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

`oma-debug` tự động kích hoạt và theo quy trình: Thu thập -> Tái hiện -> Chẩn đoán -> Đề xuất sửa -> Triển khai + test hồi quy -> Quét mẫu tương tự -> Tài liệu.

---

## Ví dụ 4: Design system

**Bạn nhập:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

`oma-design` kích hoạt và chạy 7 giai đoạn: SETUP -> EXTRACT -> ENHANCE -> PROPOSE (3 hướng thiết kế) -> GENERATE (DESIGN.md + token) -> AUDIT -> HANDOFF.

---

## Ví dụ 5: Thực thi song song CLI

```bash
# Agent đơn — task đơn giản
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# Ba agent song song — tính năng fullstack
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# Giám sát khi agent làm việc (terminal riêng)
oma dashboard        # UI terminal với bảng trực tiếp
oma dashboard:web    # UI web tại http://localhost:9847

# Sau triển khai, chạy QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01

# Kiểm tra thống kê phiên sau hoàn thành
oma stats
```

---

## Ví dụ 6: Ultrawork — Chất lượng tối đa

```
/ultrawork Build a payment processing module with Stripe integration
```

5 giai đoạn, 17 bước, 11 bước đánh giá: PLAN (4 bước đánh giá PM) -> IMPL (agent Dev) -> VERIFY (3 bước đánh giá QA) -> REFINE (5 bước đánh giá Debug) -> SHIP (4 bước đánh giá QA cuối).

---

## Tất cả 15 lệnh workflow

| Lệnh | Loại | Chức năng | Khi nào dùng |
|---------|------|-------------|-------------|
| `/orchestrate` | Liên tục | Thực thi agent song song tự động với giám sát và vòng lặp xác minh | Dự án lớn cần song song tối đa |
| `/work` | Liên tục | Điều phối đa lĩnh vực từng bước với duyệt người dùng ở mỗi cổng | Tính năng trải nhiều agent muốn kiểm soát |
| `/ultrawork` | Liên tục | Workflow chất lượng 5 giai đoạn, 17 bước, 11 checkpoint đánh giá | Phân phối chất lượng tối đa, mã production-critical |
| `/plan` | Không liên tục | Phân tách task do PM dẫn dắt và định nghĩa API contract | Trước công việc đa agent phức tạp |
| `/exec-plan` | Không liên tục | Tạo và theo dõi kế hoạch thực thi dưới dạng artifact repository | Tính năng phức tạp cần theo dõi tiến trình |
| `/brainstorm` | Không liên tục | Khám phá ý tưởng ưu tiên thiết kế với 2-3 đề xuất hướng tiếp cận | Trước khi cam kết hướng triển khai |
| `/deepinit` | Không liên tục | Khởi tạo dự án đầy đủ — AGENTS.md, ARCHITECTURE.md, docs/ | Thiết lập oh-my-agent trong codebase hiện có |
| `/review` | Không liên tục | Pipeline QA: bảo mật OWASP, hiệu suất, accessibility, chất lượng mã | Trước merge mã, đánh giá trước triển khai |
| `/debug` | Không liên tục | Gỡ lỗi có cấu trúc: tái hiện, chẩn đoán, sửa, test hồi quy, quét | Điều tra lỗi |
| `/design` | Không liên tục | Workflow thiết kế 7 giai đoạn tạo DESIGN.md với token | Xây dựng design system, landing page, tái thiết kế UI |
| `/commit` | Không liên tục | Conventional commit với tự động phát hiện type/scope và tách tính năng | Sau hoàn thành thay đổi mã |
| `/tools` | Không liên tục | Quản lý khả năng hiển thị công cụ MCP (bật/tắt nhóm) | Kiểm soát công cụ MCP agent có thể dùng |
| `/stack-set` | Không liên tục | Tự phát hiện tech stack dự án và tạo tham chiếu backend | Thiết lập quy ước mã theo ngôn ngữ |
| `/ralph` | Liên tục | Vòng lặp hoàn thành tự tham chiếu bọc ultrawork với judge độc lập | Khi agent phải tiếp tục làm việc cho đến khi tiêu chí xác minh pass |

---

## 14 skill — Tham chiếu nhanh

| Skill | Phù hợp nhất cho | Đầu ra chính |
|-------|---------|---------------|
| **oma-brainstorm** | "Tôi có ý tưởng", khám phá hướng tiếp cận | Tài liệu thiết kế trong `docs/plans/` |
| **oma-pm** | "Lập kế hoạch cái này", phân tách task | `.agents/plan.json`, `task-board.md` |
| **oma-frontend** | Component UI, form, trang, styling | Component React/TypeScript, test Vitest |
| **oma-backend** | API, xác thực, logic server, migration | Endpoint, model, service, test |
| **oma-db** | Thiết kế schema, ERD, tuning truy vấn | Tài liệu schema, script migration, thuật ngữ |
| **oma-mobile** | Ứng dụng mobile, tính năng nền tảng | Màn hình Flutter, quản lý state, test |
| **oma-design** | Design system, landing page, token | `DESIGN.md`, token CSS/Tailwind, spec component |
| **oma-qa** | Kiểm tra bảo mật, hiệu suất, accessibility | Báo cáo QA với phát hiện CRITICAL/HIGH/MEDIUM/LOW |
| **oma-debug** | Điều tra lỗi, phân tích nguyên nhân gốc | Mã đã sửa + test hồi quy + sửa mẫu tương tự |
| **oma-tf-infra** | Cung cấp hạ tầng cloud | Module Terraform, chính sách IAM, ước tính chi phí |
| **oma-dev-workflow** | CI/CD, task monorepo, tự động hóa release | Config mise.toml, định nghĩa pipeline |
| **oma-translator** | Nội dung đa ngôn ngữ, file i18n | Văn bản dịch bảo toàn giọng điệu và phong cách |
| **oma-orchestrator** | Thực thi agent song song tự động | Kết quả điều phối từ nhiều agent |
| **oma-commit** | Commit Git | Conventional Commits với type/scope phù hợp |

---

## Thiết lập dashboard

### Dashboard terminal

```bash
oma dashboard
```

Hiển thị bảng cập nhật trực tiếp trong terminal với trạng thái phiên, hàng agent và luồng hoạt động.

### Dashboard web

```bash
oma dashboard:web
# Mở http://localhost:9847
```

Cập nhật thời gian thực qua WebSocket, tự kết nối lại, chỉ báo trạng thái agent có màu.

### Bố cục khuyến nghị

3 terminal:
1. **Terminal dashboard:** `oma dashboard` — giám sát liên tục
2. **Terminal lệnh:** Lệnh spawn agent, lệnh workflow
3. **Terminal build:** Chạy test, log build, thao tác git

---

## Mẹo

1. **Viết prompt cụ thể.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" cho kết quả tốt hơn "make an app."

2. **Dùng workspace cho agent song song.** Luôn truyền `-w ./path` để ngăn xung đột file.

3. **Khóa API contract trước khi spawn agent triển khai.** Chạy `/plan` trước để agent frontend và backend thống nhất.

4. **Giám sát tích cực.** Mở terminal dashboard để phát hiện agent thất bại sớm.

5. **Lặp lại bằng re-spawn.** Re-spawn agent với ngữ cảnh sửa thay vì bắt đầu lại.

6. **Bắt đầu với `/work` khi không chắc chắn.** Hướng dẫn từng bước với xác nhận ở mỗi cổng.

7. **Dùng `/brainstorm` trước `/plan` cho ý tưởng mơ hồ.**

8. **Chạy `/deepinit` trên codebase mới.** Tạo AGENTS.md và ARCHITECTURE.md.

9. **Cấu hình ánh xạ agent-CLI.** Định tuyến task suy luận phức tạp đến Claude, task tạo nhanh đến Gemini.

10. **Dùng `/ultrawork` cho mã production-critical.**

---

## Khắc phục sự cố

| Vấn đề | Nguyên nhân | Giải pháp |
|---------|-------|-----|
| IDE không phát hiện skill | `.agents/skills/` thiếu hoặc không có file `SKILL.md` | Chạy trình cài đặt (`bunx oh-my-agent@latest`), kiểm tra symlink trong `.claude/skills/`, khởi động lại IDE |
| Không tìm thấy CLI khi spawn | AI CLI chưa cài toàn cục | `which gemini` / `which claude` — cài CLI thiếu theo hướng dẫn cài đặt |
| Agent tạo mã xung đột | Không cô lập workspace | Dùng workspace riêng: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard hiện "No agents detected" | Agent chưa ghi vào bộ nhớ | Đợi agent khởi động (ghi đầu tiên ở lượt 1), hoặc xác minh session ID khớp |
| Dashboard web không khởi động | Chưa cài dependency | Chạy `bun install` trong thư mục web/ trước |
| Báo cáo QA có 50+ vấn đề | Bình thường cho đánh giá đầu tiên codebase lớn | Tập trung CRITICAL và HIGH trước. Ghi nhận MEDIUM/LOW cho sprint tương lai. |
| Phát hiện tự động trigger sai workflow | Mơ hồ từ khóa | Dùng `/command` tường minh thay vì ngôn ngữ tự nhiên |
| Workflow liên tục không dừng | File trạng thái vẫn tồn tại | Nói "workflow done" trong chat, hoặc xóa thủ công file trạng thái từ `.agents/state/` |
| Agent bị chặn ở HIGH clarification | Yêu cầu quá mơ hồ | Cung cấp câu trả lời cụ thể agent yêu cầu, rồi chạy lại |
| Công cụ MCP không hoạt động | Serena chưa cấu hình hoặc không chạy | Chạy `oma doctor` để xác minh cấu hình MCP |
| Agent vượt giới hạn lượt | Task quá phức tạp cho lượt mặc định | Tăng lượt bằng flag `-t 30`, hoặc phân tách thành task nhỏ hơn |
| Agent dùng sai CLI | agent_cli_mapping chưa cấu hình | Chạy `oma install` để cấu hình, hoặc chỉnh trực tiếp `oma-config.yaml` |

---

Xem [Hướng dẫn skill đơn](./single-skill) cho mẫu task đơn lĩnh vực.
Xem [Hướng dẫn tích hợp](./integration) cho chi tiết tích hợp dự án.
