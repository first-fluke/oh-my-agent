---
title: "Hướng dẫn: Thực thi một skill"
sidebar_label: Skill đơn
description: Hướng dẫn chi tiết cho tác vụ một lĩnh vực trong oh-my-agent, gồm thời điểm sử dụng, checklist preflight, mẫu prompt và giải thích, ví dụ frontend, backend, mobile và database, luồng thực thi, cổng chất lượng và tín hiệu cần nâng cấp phạm vi.
---

# Thực thi một skill

Thực thi một skill là đường đi nhanh cho một tác vụ tập trung: một agent, một lĩnh vực, một mục tiêu rõ ràng. Không có chi phí điều phối hay phối hợp nhiều agent. Host hoặc workflow được chọn có thể định tuyến prompt ngôn ngữ tự nhiên đến skill; hệ thống hook tự phát hiện workflow và hành vi định tuyến phụ thuộc runtime được chọn.

## Lối đi nhanh

1. Chạy `oma doctor` một lần để xác nhận tích hợp host đang được chọn. Cảnh báo provider tùy chọn không chặn tác vụ không dùng provider đó.
2. Mô tả một thay đổi khép kín bằng `Goal`, `Context`, `Constraints` và điều kiện `Done When` rõ ràng.
3. Skill được chọn sẽ kiểm tra repository, nêu phạm vi khi execution contract đang hoạt động có yêu cầu `CHARTER_CHECK` và báo cáo đúng những kiểm tra đã chạy.
4. Nếu tác vụ lan sang ranh giới API, UI, database hoặc mobile, hãy dừng lần chạy skill đơn và chuyển sang `/work` hoặc `/orchestrate`.

Với lần chạy managed bị đình trệ, dùng `oma agent status <session-id> [agent-id]`, sau đó kiểm tra receipt trong `.agents/state/agent-runs/` và đường dẫn claim đã inject trước khi retry. Xem [Important Defaults](../getting-started/important-defaults.md) để biết hành vi provider và recovery.

---

## Khi nào dùng skill đơn

Dùng cách này khi tác vụ đáp ứng TẤT CẢ tiêu chí sau:

- **Do một lĩnh vực sở hữu**: toàn bộ tác vụ thuộc frontend, backend, mobile, database, design, hạ tầng hoặc một lĩnh vực duy nhất khác.
- **Khép kín**: không đổi API contract xuyên lĩnh vực và không cần sửa backend cho tác vụ frontend.
- **Phạm vi rõ**: biết đầu ra cần là gì, chẳng hạn component, endpoint, schema hoặc bản sửa.
- **Không cần phối hợp**: agent khác không cần chạy trước hoặc sau.

**Ví dụ tác vụ dùng một skill:**
- Xây dựng một UI component
- Thêm một API endpoint
- Sửa một lỗi trong một layer
- Thiết kế một bảng database
- Viết một module Terraform
- Dịch một nhóm chuỗi i18n
- Tạo một phần của design system

**Chuyển sang nhiều agent** (`/work` hoặc `/orchestrate`) khi:
- UI cần API contract mới (frontend + backend)
- Một bản sửa lan sang nhiều layer (agent debug + agent triển khai)
- Tính năng trải qua frontend, backend và database
- Phạm vi vượt một lĩnh vực sau lần lặp đầu tiên

Test và tiêu chí chấp nhận vẫn là một phần của tác vụ dùng một skill; riêng việc có test không bắt buộc dùng `/ralph`. Khi cần phối hợp xuyên lĩnh vực hoặc có yêu cầu rõ về quy trình chất lượng, xem [hướng dẫn chọn skill và workflow](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Checklist preflight

Trước khi viết prompt, trả lời bốn câu hỏi sau. Chúng tương ứng với bốn thành phần của [Prompt Structure](/docs/core-concepts/skills):

| Thành phần | Câu hỏi | Vì sao quan trọng |
|---------|----------|----------------|
| **Goal** | Artifact cụ thể nào cần được tạo hoặc thay đổi? | Ngăn phạm vi mơ hồ, chẳng hạn “thêm nút” khác với “thêm form có validation”. |
| **Context** | Stack, framework và quy ước nào áp dụng? | Agent có thể suy ra từ file dự án, nhưng nêu rõ sẽ chính xác hơn. |
| **Constraints** | Phải tuân theo quy tắc nào, gồm style, bảo mật, hiệu suất và tương thích? | Nếu thiếu ràng buộc, agent dùng mặc định có thể không khớp dự án. |
| **Done When** | Bạn sẽ kiểm tra những tiêu chí chấp nhận nào? | Cho agent đích đến và cho bạn checklist xác minh. |

Nếu prompt thiếu thành phần nào:

- **Không chắc chắn LOW**: áp dụng mặc định và liệt kê giả định.
- **Không chắc chắn MEDIUM**: đưa ra 2 đến 3 lựa chọn rồi tiến hành theo lựa chọn phù hợp nhất.
- **Không chắc chắn HIGH**: chặn và hỏi lại, không viết code.

---

## Mẫu prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```


### Giải thích mẫu

| Phần | Mục đích | Ví dụ |
|------|---------|---------|
| `Build <specific artifact>` | Goal, tức thứ cần tạo | “Build a user registration form component” |
| `using <stack/framework>` | Context, tức stack kỹ thuật | “using React + TypeScript + Tailwind CSS” |
| `Constraints:` | Quy tắc agent phải tuân theo | “accessible labels, no external form libraries, client-side validation only” |
| `Acceptance criteria:` | Done When, tức kết quả có thể xác minh | “1) email format validation 2) password strength indicator 3) submit disabled while invalid” |
| `Add tests for:` | Yêu cầu về test | “valid/invalid submit paths, edge cases for email validation” |

---

## Ví dụ thực tế

### Frontend: login form

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


**Luồng thực thi dự kiến:**

1. **Định tuyến skill:** Host hoặc workflow chọn `oma-frontend`; các từ khóa như “form”, “component”, “Tailwind CSS” và “React” là tín hiệu định tuyến.
2. **Đánh giá độ khó:** Medium, với 2 đến 3 file và quyết định thiết kế về UX validation.
3. **Tải tài nguyên:**
   - `execution-protocol.md`, luôn được tải.
   - `snippets.md`, gồm pattern form và Zod.
   - Pattern component hiện có và `snippets.md` khi skill cung cấp.
4. **Execution contract**, khi bật, có thể phát `CHARTER_CHECK`:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Triển khai:**
   - Tạo `src/features/auth/components/login-form.tsx`, Client Component với `"use client"`.
   - Tạo `src/features/auth/utils/login-schema.ts`, schema Zod.
   - Tạo `src/features/auth/components/skeleton/login-form-skeleton.tsx`.
   - Dùng component shadcn/ui `<Button>`, `<Input>`, `<Label>`, chỉ đọc và không sửa.
   - Xử lý form bằng `@tanstack/react-form` với validation Zod.
   - Dùng absolute import với `@/`.
   - Mỗi file một component.
6. **Xác minh:**
   - Checklist: có ARIA label, heading ngữ nghĩa và điều hướng bàn phím.
   - Mobile: render đúng ở viewport 320px.
   - Hiệu suất: không có CLS.
   - Test: file Vitest tại `src/features/auth/utils/__tests__/login-schema.test.ts`.
<!-- oma-docs:ignore-end -->

---

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


**Luồng thực thi dự kiến:**

1. **Định tuyến skill:** Host hoặc workflow chọn `oma-backend`; “API”, “endpoint” và “REST” là tín hiệu định tuyến.
2. **Phát hiện stack:** Đọc `pyproject.toml` hoặc `package.json` để xác định ngôn ngữ và framework. Nếu có tham chiếu `stack/` sinh tự động hoặc `variants/` đã ship, tải quy ước từ đó.
3. **Đánh giá độ khó:** Medium, khoảng 2 đến 3 file gồm route, service, repository và test.
4. **Tải tài nguyên:**
   - `execution-protocol.md`, luôn được tải.
<!-- oma-docs:ignore-start -->
   - Tải `stack/snippets.md` hoặc `variants/{node,python,rust}/snippets.md` nếu có.
   - Tải `stack/tech-stack.md` hoặc tham chiếu tech-stack của variant nếu có.
<!-- oma-docs:ignore-end -->
5. **Execution contract**, khi bật, có thể phát `CHARTER_CHECK`:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Triển khai:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` với query có tham số.
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)`, wrapper cho business logic.
   - Router: `GET /api/tasks` với middleware JWT, validation input và format response.
   - Test: auth bắt buộc trả 401, pagination trả cursor đúng, filter hoạt động, empty trả 200 với array rỗng.

---

### Mobile: màn hình settings

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


**Luồng thực thi dự kiến:**

1. **Định tuyến skill:** Host hoặc workflow chọn `oma-mobile`; “Flutter”, “screen” và “mobile” là tín hiệu định tuyến.
2. **Đánh giá độ khó:** Medium, gồm màn hình settings, state management và xử lý offline.
3. **Tải tài nguyên:** `execution-protocol.md`, `snippets.md` (template màn hình và pattern Riverpod provider), `screen-template.dart`.
4. **Execution contract**, khi bật, có thể phát `CHARTER_CHECK`:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Triển khai:**
   - Screen: `lib/features/settings/presentation/settings_screen.dart`, Stateless Widget với Riverpod.
   - Providers: `lib/features/settings/providers/settings_provider.dart`.
   - Repository: `lib/features/settings/data/settings_repository.dart`.
   - Xử lý offline: interceptor Dio bắt `SocketException` rồi dùng dữ liệu cache.
   - Mọi controller được dispose trong method `dispose()`.
<!-- oma-docs:ignore-end -->

---

### Database: thiết kế schema

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```


**Luồng thực thi dự kiến:**

1. **Định tuyến skill:** Host hoặc workflow chọn `oma-db`; “database”, “schema”, “ERD” và “migration” là tín hiệu định tuyến.
2. **Đánh giá độ khó:** Complex, gồm quyết định kiến trúc, nhiều entity và lập kế hoạch capacity.
3. **Tải tài nguyên:** `execution-protocol.md`, `document-templates.md` (cấu trúc deliverable), `examples.md` và `anti-patterns.md` để review trong bước tối ưu.
4. **Execution contract**, khi bật, có thể phát `CHARTER_CHECK`:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Explore, tức entity, quan hệ, access pattern và ước tính volume; Design, tức schema external/conceptual/internal, constraint và lifecycle field; Optimize, tức index cho pattern truy vấn, chiến lược partition, kế hoạch backup và review anti-pattern.
6. **Deliverable:**
   - Tóm tắt external schema, gồm view theo role admin, project manager và team member.
   - Conceptual schema với ERD, gồm Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, v.v.
   - Internal schema với physical DDL, index và partitioning.
   - Bảng data standards, gồm quy tắc đặt tên field và quy ước type.
   - Glossary, gồm tenant, workspace, assignee, v.v.
   - Bảng capacity estimate.
   - Chiến lược backup, gồm full mỗi ngày + incremental mỗi giờ, giữ 30 ngày.
   - Migration script.

---

## Checklist cổng chất lượng

Sau khi agent trả kết quả, kiểm tra các mục sau trước khi chấp nhận.

### Kiểm tra chung (tất cả agent)

- [ ] **Hành vi khớp tiêu chí chấp nhận**: mọi tiêu chí trong prompt đều được đáp ứng.
- [ ] **Test bao phủ đường chạy đúng và edge case chính**: không chỉ đường chạy đúng.
- [ ] **Không đổi file không liên quan**: chỉ file cần cho tác vụ bị sửa.
- [ ] **Module dùng chung không hỏng**: import, type và interface mà code khác dùng vẫn hoạt động.
- [ ] **Đã tuân thủ charter**: các giới hạn `Must NOT do` được tôn trọng.
- [ ] **Lint, typecheck, build pass**: chạy kiểm tra chuẩn của dự án.

### Frontend-specific

- [ ] Accessibility: phần tử tương tác có `aria-label`, heading ngữ nghĩa và điều hướng bàn phím.
- [ ] Mobile: render đúng ở viewport 320px, 768px, 1024px và 1440px.
- [ ] Hiệu suất: không có CLS, đạt mục tiêu FCP.
- [ ] Error boundary và loading skeleton đã được triển khai.
- [ ] Component shadcn/ui không bị sửa trực tiếp, chỉ dùng wrapper.
- [ ] Dùng absolute import với `@/`, không dùng `../../`.

### Backend-specific

- [ ] Giữ kiến trúc sạch, không đặt business logic trong route handler.
- [ ] Mọi input đều được validation, không tin dữ liệu từ user.
- [ ] Chỉ dùng query có tham số, không nội suy chuỗi SQL.
- [ ] Exception tùy chỉnh đi qua module lỗi tập trung, không ném HTTP exception thô.
- [ ] Endpoint auth được giới hạn tốc độ.

### Mobile-specific

- [ ] Mọi controller được dispose trong method `dispose()`.
- [ ] Xử lý offline đúng cách.
- [ ] Duy trì mục tiêu 60fps, không gây jank.
- [ ] Đã test trên cả iOS và Android.

### Database-specific

- [ ] Ít nhất đạt 3NF, hoặc ghi rõ lý do denormalization.
- [ ] Ghi đủ cả ba lớp schema: external, conceptual và internal.
- [ ] Nêu rõ constraint toàn vẹn: entity, domain, referential và business-rule.
- [ ] Đã review anti-pattern.

---

## Tín hiệu cần nâng cấp phạm vi

Các tín hiệu sau cho thấy nên chuyển từ thực thi một skill sang nhiều agent:

| Tín hiệu | Ý nghĩa | Hành động |
|--------|------------|--------|
| Agent nói “cần thay đổi backend” | Tác vụ có phụ thuộc xuyên lĩnh vực. | Chuyển sang `/work` và thêm backend agent. |
| CHARTER_CHECK có mục “Must NOT do” nhưng mục đó thật sự cần | Phạm vi vượt một lĩnh vực. | Lập kế hoạch đầy đủ bằng `/plan` trước. |
| Một bản sửa lan sang 3+ file ở các layer khác nhau | Một thay đổi ảnh hưởng nhiều lĩnh vực. | Dùng `/debug` phạm vi rộng hơn hoặc `/work`. |
| Agent phát hiện API contract không khớp | Frontend và backend đang bất đồng. | Chạy `/plan` để định nghĩa contract rồi spawn lại cả hai agent. |
| Cổng chất lượng thất bại ở điểm tích hợp | Các component kết nối không đúng. | Thêm bước QA review: `oma agent spawn qa "Review integration"`. |
| Tác vụ từ “một component” thành “ba component + route + API” | Phạm vi phình ra trong lúc chạy. | Dừng, chạy `/plan` để phân tách rồi `/orchestrate`. |
| Agent bị chặn vì clarification HIGH | Yêu cầu cơ bản còn mơ hồ. | Trả lời câu hỏi hoặc chạy `/brainstorm` để làm rõ. |

### Quy tắc chung

Nếu phải spawn lại cùng một agent hơn hai lần để tinh chỉnh, có lẽ tác vụ đã trở thành đa lĩnh vực. Hãy chạy `/work` hoặc ít nhất `/plan` để phân tách.
