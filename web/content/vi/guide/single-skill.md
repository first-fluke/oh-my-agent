---
title: "Hướng dẫn: Thực thi skill đơn"
description: Hướng dẫn chi tiết cho task đơn lĩnh vực trong oh-my-agent — khi nào dùng, checklist preflight, template prompt với giải thích, ví dụ thực cho frontend, backend, mobile và database, luồng thực thi mong đợi, checklist cổng chất lượng và tín hiệu escalation.
---

# Thực thi skill đơn

Thực thi skill đơn là đường nhanh — một agent, một lĩnh vực, một task tập trung. Không có overhead điều phối, không phối hợp đa agent. Skill tự kích hoạt từ prompt ngôn ngữ tự nhiên.

---

## Khi nào dùng skill đơn

Dùng khi task đáp ứng TẤT CẢ tiêu chí:

- **Thuộc một lĩnh vực** — toàn bộ task thuộc frontend, backend, mobile, database, design, hạ tầng hoặc lĩnh vực đơn khác
- **Khép kín** — không thay đổi API contract đa lĩnh vực, không cần thay đổi backend cho task frontend
- **Phạm vi rõ ràng** — bạn biết đầu ra nên là gì
- **Không cần phối hợp** — agent khác không cần chạy trước hoặc sau

**Chuyển sang đa agent** (`/work` hoặc `/orchestrate`) khi:
- Công việc UI cần API contract mới
- Một bản sửa lan truyền xuyên tầng
- Tính năng trải frontend, backend và database
- Phạm vi mở rộng quá một lĩnh vực sau lần lặp đầu

---

## Checklist preflight

| Yếu tố | Câu hỏi | Tại sao quan trọng |
|---------|----------|----------------|
| **Goal** | Artifact cụ thể nào cần tạo hoặc thay đổi? | Ngăn mơ hồ |
| **Context** | Stack, framework và quy ước nào áp dụng? | Agent phát hiện từ file dự án, nhưng tường minh tốt hơn |
| **Constraints** | Quy tắc nào phải tuân theo? | Không có ràng buộc, agent dùng mặc định có thể không khớp dự án |
| **Done When** | Tiêu chí chấp nhận nào bạn sẽ kiểm tra? | Cho agent mục tiêu và bạn checklist xác minh |

---

## Template prompt

```text
Build <artifact cụ thể> using <stack/framework>.
Constraints: <ràng buộc style, hiệu suất, bảo mật hoặc tương thích>.
Acceptance criteria:
1) <tiêu chí có thể kiểm thử>
2) <tiêu chí có thể kiểm thử>
3) <tiêu chí có thể kiểm thử>
Add tests for: <trường hợp test quan trọng>.
```

---

## Ví dụ thực

### Frontend: Login form

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

### Backend: REST API endpoint

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

### Mobile: Màn hình Settings

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

### Database: Thiết kế schema

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

---

## Checklist cổng chất lượng

### Kiểm tra chung (tất cả agent)

- [ ] **Hành vi khớp tiêu chí chấp nhận**
- [ ] **Test bao phủ happy path và edge case chính**
- [ ] **Không thay đổi file không liên quan**
- [ ] **Module dùng chung không bị hỏng**
- [ ] **Charter được tuân thủ**
- [ ] **Lint, typecheck, build pass**

### Đặc thù frontend
- [ ] Accessibility: `aria-label`, heading ngữ nghĩa, điều hướng bàn phím
- [ ] Mobile: render đúng ở 320px, 768px, 1024px, 1440px
- [ ] Hiệu suất: không CLS
- [ ] Import tuyệt đối với `@/`

### Đặc thù backend
- [ ] Kiến trúc sạch: không logic nghiệp vụ trong route handler
- [ ] Chỉ truy vấn tham số hóa
- [ ] Exception tùy chỉnh qua module lỗi tập trung

### Đặc thù mobile
- [ ] Controller được dispose trong `dispose()`
- [ ] Xử lý offline graceful
- [ ] Mục tiêu 60fps

---

## Tín hiệu escalation

| Tín hiệu | Ý nghĩa | Hành động |
|--------|------------|--------|
| Agent nói "cần thay đổi backend" | Task có phụ thuộc đa lĩnh vực | Chuyển sang `/work` |
| CHARTER_CHECK hiện "Must NOT do" cần thiết | Phạm vi vượt một lĩnh vực | Lập kế hoạch tính năng đầy đủ bằng `/plan` |
| Sửa lan truyền 3+ file xuyên tầng | Một sửa ảnh hưởng nhiều lĩnh vực | Dùng `/debug` phạm vi rộng hơn, hoặc `/work` |
| Agent phát hiện API contract không khớp | Frontend/backend bất đồng | Chạy `/plan` định nghĩa contract |
| Cổng chất lượng thất bại ở điểm tích hợp | Component không kết nối đúng | Thêm bước QA review |
| Task mở rộng từ "một component" thành "ba component + route + API" | Phạm vi phình to | Dừng, chạy `/plan` phân tách, rồi `/orchestrate` |

### Quy tắc chung

Nếu bạn thấy mình re-spawn cùng agent hơn hai lần với tinh chỉnh, task có lẽ đa lĩnh vực và cần `/work` hoặc ít nhất bước `/plan` để phân tách đúng.
