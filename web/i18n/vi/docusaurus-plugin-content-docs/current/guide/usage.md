---
title: Hướng dẫn sử dụng
sidebar_label: Sử dụng OMA
description: Hướng dẫn sử dụng OMA, bao quát cách chọn task theo người đọc, ví dụ skill đơn và đa lĩnh vực, workflow, tự động phát hiện, toàn bộ 33 gói skill, thực thi CLI song song, dashboard, mặc định và phục hồi.
---

# Cách sử dụng oh-my-agent

## Bắt đầu nhanh

1. Mở project trong IDE hoặc CLI hỗ trợ AI đã chọn (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen hoặc host được hỗ trợ khác)
2. Host đã chọn có thể tải skill từ `.agents/skills/`; hook đã bật có thể phát hiện workflow từ từ khóa ngôn ngữ tự nhiên
3. Mô tả điều bạn muốn bằng ngôn ngữ tự nhiên. Host hoặc workflow đã chọn định tuyến task tới skill phù hợp
4. Với công việc đa agent, dùng `/work` hoặc `/orchestrate`

Task đơn lĩnh vực không cần cú pháp đặc biệt. Dùng [hướng dẫn chọn skill và workflow](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) để chọn giữa skill đơn, `/work`, `/orchestrate`, `/ultrawork` và `/ralph`. Xem [Quick Start](../getting-started/quick-start.md) để setup và [Important Defaults](../getting-started/important-defaults.md) trước khi đổi provider.

---

## Ví dụ 1: task đơn giản

**Bạn nhập:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Điều xảy ra:**

1. Host định tuyến yêu cầu tới `oma-frontend` (từ khóa như “form”, “component” và “Tailwind CSS” là tín hiệu định tuyến)
2. Tầng 1 (SKILL.md) đã tải với danh tính agent, quy tắc cốt lõi và danh sách thư viện
3. Tài nguyên tầng 2 tải theo nhu cầu:
   - `execution-protocol.md`: workflow 4 bước (Analyze, Plan, Implement, Verify)
   - `snippets.md`: mẫu form + xác thực Zod
   - mẫu component hiện có và `snippets.md` nếu skill cung cấp
4. Agent xuất **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```

<!-- oma-docs:ignore-start -->
5. Agent triển khai:
   - Component React với TypeScript trong `src/features/auth/components/login-form.tsx`
   - Schema xác thực Zod trong `src/features/auth/utils/login-validation.ts`
   - Test Vitest trong `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton trong `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. Agent chạy checklist: accessibility (ARIA label, HTML ngữ nghĩa, điều hướng bàn phím), viewport mobile, hiệu suất (không CLS), Error Boundary

**Kết quả mong đợi:** Component React có phạm vi rõ với TypeScript, xác thực, test và evidence accessibility khi project hỗ trợ các kiểm tra đó. Prompt và workflow đã chọn quyết định file và kiểm tra thực sự chạy.

---

## Ví dụ 2: dự án đa lĩnh vực

**Bạn nhập:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Điều xảy ra:**

1. Yêu cầu này bao phủ frontend, backend và mobile. Host agent có thể dựa trên phạm vi đó để đề xuất cách điều phối.
2. Khi hook phát hiện từ khóa được bật, “Build a TODO app” khớp pattern `/orchestrate` đã cấu hình và có thể kích hoạt. Hook khớp văn bản, không phân loại yêu cầu thành đa lĩnh vực. Dùng lệnh tường minh để chọn workflow.

**Dùng `/work` (từng bước với quyền kiểm soát của người dùng):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Bước 1, Agent PM lập kế hoạch:**
   - Xác định domain: backend (auth API, task CRUD), frontend (login, task list UI), mobile (ứng dụng Flutter)
   - Định nghĩa API contract: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Tạo phân rã task theo ưu tiên:
     - P0: Backend auth API, Backend task CRUD API
     - P1: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - P2: QA review
   - Lưu vào `.agents/results/plan-{sessionId}.json`

4. **Bước 2, Review kế hoạch:** Agent trình bày kế hoạch và tiếp tục trong phạm vi quyền hiện có, chỉ hỏi khi thiếu quyết định quan trọng hoặc cần quyền mới.

5. **Bước 3, Spawn agent theo ưu tiên:**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```


6. **Bước 4, Agent QA review:**
   - Bảo mật: tuân thủ OWASP Top 10 (xác thực JWT, CSRF, kiểm tra SQL injection)
   - Hiệu suất: kiểm tra truy vấn N+1, xác minh pagination
   - Accessibility: WCAG 2.1 AA trên mọi component frontend
   - Liên domain: API contract giữa frontend, mobile và backend nhất quán

7. **Bước 5, Lặp:** Nếu QA tìm thấy vấn đề CRITICAL, spawn lại agent chịu trách nhiệm với báo cáo QA.

---

## Ví dụ 3: sửa lỗi

**Bạn nhập:**
```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Điều xảy ra:**

1. `oma-debug` tự động kích hoạt (từ khóa: “bug”, “error”, “Cannot read property”)
2. **Bước 1, Thu thập:** Ghi nhận thông báo lỗi và ngữ cảnh
<!-- oma-docs:ignore-start -->
3. **Bước 2, Tái hiện:** MCP `search_for_pattern` tìm lời gọi `.map()` trong `src/features/tasks/components/task-list.tsx`
<!-- oma-docs:ignore-end -->
4. **Bước 3, Chẩn đoán:** MCP `find_referencing_symbols` lần theo luồng dữ liệu:
   - Hook `useQuery` lấy task từ API
   - Component render trước khi dữ liệu đến
   - `tasks` là `undefined` trong trạng thái loading
   - Nguyên nhân gốc: thiếu kiểm tra trạng thái loading trước khi gọi `.map()`
5. **Bước 4, Đề xuất sửa:** Trình bày thay đổi tối thiểu bằng cách thêm kiểm tra loading và null guard
6. **Bước 5, Triển khai:**
   - Thêm loading skeleton trong khi fetch dữ liệu
   - Thêm null check: `tasks?.map()` hoặc return sớm khi loading
   - Viết regression test xác minh component render đúng khi `tasks` là undefined
7. **Bước 6, Quét mẫu tương tự:** MCP `search_for_pattern` tìm các lời gọi `.map()` khác trên mảng có thể là undefined
   - Tìm thấy 3 pattern tương tự trong `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Chủ động áp dụng cùng mẫu sửa
8. **Bước 7, Ghi tài liệu:** Ghi bug report vào memory với nguyên nhân gốc, bản sửa và cách phòng ngừa

---

## Ví dụ 4: design system

**Bạn nhập:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Điều xảy ra:**

1. `oma-design` kích hoạt (từ khóa: “design”, “landing page”, “dark”, “premium”)
2. **Giai đoạn 1, SETUP:** Kiểm tra `.design-context.md`. Nếu thiếu, hỏi:
   - Dịch vụ hỗ trợ ngôn ngữ nào? (chỉ en / + CJK)
   - Đối tượng mục tiêu? (B2B, người dùng kỹ thuật, 25-45)
   - Tính cách thương hiệu? (chuyên nghiệp / cao cấp)
   - Hướng thẩm mỹ? (cao cấp tối)
   - Site tham chiếu? (người dùng cung cấp ví dụ)
   - Accessibility? (WCAG AA)
3. **Giai đoạn 3, ENHANCE:** Nếu prompt mơ hồ, chuyển thành đặc tả từng section
4. **Giai đoạn 4, PROPOSE:** Trình bày 3 hướng thiết kế:
   - **Hướng A: "Midnight Observatory"**: xanh navy đậm (#0f1729), điểm nhấn cyan (#22d3ee), Inter + JetBrains Mono, layout lưới bento, reveal theo scroll
   - **Hướng B: "Carbon Interface"**: xám trung tính (#18181b), điểm nhấn amber (#f59e0b), font hệ thống, bố cục kiểu bàn cờ, micro-interaction theo hover
   - **Hướng C: "Deep Space"**: tối thuần (#0a0a0a), điểm nhấn emerald (#10b981), Geist + Geist Mono, section tràn viền, animation khi vào
5. **Giai đoạn 5, GENERATE:** Theo hướng đã chọn, tạo:
   - `DESIGN.md` với 6 section (typography, màu, spacing, motion, component, accessibility)
   - CSS custom properties
   - mở rộng cấu hình Tailwind
   - biến theme shadcn/ui
6. **Giai đoạn 6, AUDIT:** Kiểm tra responsive (tối thiểu 320px), WCAG 2.2, heuristic Nielsen và phát hiện AI slop
7. **Giai đoạn 7, HANDOFF:** “Design hoàn tất. Chạy `/orchestrate` để triển khai với oma-frontend.”

---

## Ví dụ 5: thực thi song song CLI

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Nếu runtime hiện tại khớp vendor đích trong `.agents/oma-config.yaml`, workflow nên ưu tiên subagent native:

- Claude Code → `.claude/agents/*.md`
- Codex CLI → `.codex/agents/*.toml`
- Qwen Code → `.qwen/agents/*.md`, được chọn thông qua `subagent_type` của Agent tool
- Antigravity CLI/IDE → `oma agent spawn` qua `agy`

Task khác vendor và `model_preset: free` dùng `oma agent spawn`. Native dispatch vẫn cần [lifecycle của result](./agent-results-and-resume.md) để ghi lại bằng chứng xác minh.

---

## Ví dụ 6: ultrawork để đạt chất lượng tối đa

**Bạn nhập:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**Điều xảy ra (5 giai đoạn, 17 bước, 12 bước review cô lập):**

**Giai đoạn 1, PLAN (Bước 1-4, Agent PM inline):**
- Bước 1: Tạo kế hoạch với phân rã task, API contract, phụ thuộc
- Bước 2: Review kế hoạch (kiểm tra đầy đủ; mọi yêu cầu đã được ánh xạ chưa?)
- Bước 3: Meta review (tự xác minh review có đủ không)
- Bước 4: Review over-engineering (tập trung MVP, không phức tạp không cần thiết)
- PLAN_GATE: Kế hoạch được ghi lại, giả định liệt kê, phạm vi được cho phép

**Giai đoạn 2, IMPL (Bước 5, Dev Agent được spawn):**
- Agent backend triển khai tích hợp Stripe (webhook, idempotency, xử lý lỗi)
- Agent frontend xây checkout flow và UI trạng thái thanh toán
- Bước 5.2: Chỉ ghi baseline khi cần một phép so sánh đo lường đã được xác định
- IMPL_GATE: Kiểm tra không sinh file đầu ra và test áp dụng đều pass, chỉ sửa file trong kế hoạch; chỉ chạy kiểm tra build khi được yêu cầu rõ

**Giai đoạn 3, VERIFY (Bước 6-8, Agent QA được spawn):**
- Bước 6: Review đồng bộ (triển khai có khớp kế hoạch không?)
- Bước 7: Review bảo mật/lỗi (OWASP, npm audit, best practice bảo mật Stripe)
- Bước 8: Review cải thiện/hồi quy (không đưa regression vào)
- VERIFY_GATE: Không CRITICAL, không HIGH, đạt các mục tiêu đo lường áp dụng của project

**Giai đoạn 4, REFINE (Bước 9-13, Agent Refactor được spawn):**
- Bước 9: Tách file (> 500 dòng) và function (> 50 dòng)
- Bước 10: Review tích hợp/tái sử dụng (loại logic trùng)
- Bước 11: Review side effect (truy vết cascade impact bằng `find_referencing_symbols`)
- Bước 12: Review toàn bộ thay đổi (nhất quán tên, đồng bộ style)
- Bước 13: Dọn dead code
- REFINE_GATE: Không còn hồi quy đo được chưa giải quyết, code sạch

**Giai đoạn 5, SHIP (Bước 14-17, Agent QA được spawn):**
- Bước 14: Review chất lượng mã (lint, type, coverage)
- Bước 15: Xác minh UX Flow (hành trình thanh toán end-to-end)
- Bước 16: Review vấn đề liên quan (kiểm tra cascade impact cuối)
- Bước 17: Sẵn sàng triển khai (quản lý secret, script migration, kế hoạch rollback)
- SHIP_GATE: Tất cả kiểm tra pass; kế thừa quyền hiện có. Xuất bản hoặc triển khai cần quyền cho hành động đó.

---

## Tất cả lệnh workflow

| Lệnh | Loại | Chức năng | Khi dùng |
|---------|------|-------------|-------------|
| `/orchestrate` | Liên tục | Tải hoặc tạo plan, sau đó giao thực thi song song kèm giám sát và xác minh | Task độc lập phù hợp điều phối song song tự động |
| `/work` | Liên tục | Lập kế hoạch, triển khai và QA đa lĩnh vực từng bước trong phạm vi được cho phép | Tính năng đa lĩnh vực cần giao hàng có điều phối |
| `/ultrawork` | Liên tục | Workflow chất lượng 5 giai đoạn, 17 bước, 12 checkpoint review cô lập | Giao hàng chất lượng tối đa, mã production-critical |
| `/plan` | Không liên tục | Phân tách task do PM dẫn dắt, API contract và artifact plan trong `docs/plans/work/` (`NNN-name.md` tuần tự, trường Status theo lifecycle) | Trước công việc đa agent phức tạp; tính năng phức tạp cần theo dõi và log quyết định |
| `/brainstorm` | Không liên tục | Khám phá ý tưởng ưu tiên thiết kế với 2-3 đề xuất hướng tiếp cận | Trước khi cam kết hướng triển khai |
| `/deepinit` | Không liên tục | Khởi tạo project đầy đủ (AGENTS.md, ARCHITECTURE.md, docs/) | Thiết lập oh-my-agent trong codebase hiện có |
| `/review` | Không liên tục | Pipeline QA: bảo mật OWASP, hiệu suất, accessibility, chất lượng code | Trước khi merge code hoặc review trước triển khai |
| `/debug` | Không liên tục | Debug có cấu trúc: tái hiện, chẩn đoán, sửa, regression test, quét | Điều tra bug và error |
| `/design` | Không liên tục | Workflow design 7 giai đoạn tạo DESIGN.md với token | Xây design system, landing page, UI redesign |
| `/scm` | Không liên tục | Workflow SCM cho Git (branch/merge/conflict/worktree/baseline) và tạo Conventional Commit với tự động phát hiện type/scope, tách feature | Sau thay đổi code hoặc task quản lý cấu hình repository |
| `/tools` | Không liên tục | Quản lý khả năng hiển thị tool MCP (bật/tắt nhóm) | Kiểm soát tool MCP agent có thể dùng |
| `/stack-set` | Không liên tục | Tự phát hiện tech stack và tạo tham chiếu backend hoặc mobile (Swift/Flutter/RN) | Thiết lập quy ước code theo ngôn ngữ |
| `/architecture` | Không liên tục | Chẩn đoán kiến trúc, so sánh và ghi quyết định | Review ranh giới hoặc chọn kiến trúc |
| `/convert` | Không liên tục | Định tuyến chuyển đổi tài liệu tới skill phù hợp | Chuyển đổi file HWP/HWPX hoặc PDF |
| `/docs` | Không liên tục | Xác minh tài liệu và đề xuất sync theo diff | Kiểm tra docs theo codebase hiện tại |
| `/explain` | Không liên tục | Tạo và xác minh explainer HTML offline cho thay đổi code | Giải thích diff, PR, branch hoặc commit range |
| `/recap` | Không liên tục | Tóm tắt công việc qua lịch sử các tool AI được hỗ trợ | Retrospective theo ngày hoặc kỳ |
| `/schedule` | Không liên tục | Đăng ký job agent lặp lại | Recap, scan hoặc housekeeping ban đêm |
| `/video` | Không liên tục | Soạn video có thể tái lập từ script, narration và visual | Shorts, explainer và demo |
| `/ralph` | Liên tục | Lặp ultrawork với judge độc lập và cơ chế bảo vệ vòng lặp | Khi muốn lặp tới khi tiêu chí hoàn thành kiểm chứng được bằng máy đạt |

---

## Ví dụ tự động phát hiện

oh-my-agent phát hiện từ khóa workflow trong 11 ngôn ngữ. Ví dụ:

| Bạn nhập | Workflow phát hiện | Ngôn ngữ |
|----------|-------------------|----------|
| "plan the authentication feature" | `/plan` | English |
| "do everything in parallel" | `/orchestrate` | English |
| "review the code for security" | `/review` | English |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | English |
| "design a landing page for our product" | `/design` | English |
| "fix the login bug" | `/debug` | English |
| "계획 세워줘" | `/plan` | Korean |
| "버그 수정해줘" | `/debug` | Korean |
| "디자인 시스템 만들어줘" | `/design` | Korean |
| "자동으로 실행해" | `/orchestrate` | Korean |
| "コードレビューして" | `/review` | Japanese |
| "計画を立てて" | `/plan` | Japanese |
| "修复这个 bug" | `/debug` | Chinese |
| "设计一个着陆页" | `/design` | Chinese |
| "revisar código" | `/review` | Spanish |
| "diseña la página" | `/design` | Spanish |
| "debuggen" | `/debug` | German |
| "coordonner étape par étape" | `/work` | French |
| "don't stop until it's done" | `/ralph` | English |
| "끝까지 해" | `/ralph` | Korean |
| "最後までやって" | `/ralph` | Japanese |

**Câu hỏi thông tin được lọc:**

| Bạn nhập | Kết quả |
|----------|---------|
| "what is orchestrate?" | Không kích hoạt workflow (pattern thông tin: "what is") |
| "explain how /plan works" | Không kích hoạt workflow (pattern thông tin: "explain") |
| "어떻게 사용해?" | Không kích hoạt workflow (pattern thông tin: "어떻게") |
| "レビューとは何ですか" | Không kích hoạt workflow (pattern thông tin: "とは") |

---

## 33 skill: tham chiếu nhanh

Preset `all` của installer bám theo registry đang chạy. Bảng nhóm mọi skill hiện tại theo cách dùng chính; skill vẫn có thể phối hợp với skill khác ở ranh giới.

| Skill | Phù hợp nhất cho | Đầu ra chính |
|-------|------------------|-------------|
| **oma-academic-writing** | Soạn/sửa học thuật và review anti-AI | Prose hướng xuất bản và sửa claim/evidence |
| **oma-architecture** | Ranh giới hệ thống, đánh đổi, ADR | Khuyến nghị kiến trúc hoặc decision record |
| **oma-backend** | API, auth, logic server, migration | Thay đổi Router/Service/Repository và xác minh |
| **oma-brainstorm** | Ý tưởng mơ hồ và so sánh hướng tiếp cận | Tài liệu thiết kế trong `docs/plans/designs/` |
| **oma-coordination** | Điều phối đa agent thủ công | Hướng dẫn task và bàn giao từng bước |
| **oma-db** | Thiết kế schema, ERD, tuning query, capacity | Tài liệu schema, migration và kế hoạch phục hồi |
| **oma-debug** | Tái hiện bug và phân tích nguyên nhân gốc | Sửa tối thiểu, evidence hồi quy và quét pattern |
| **oma-deepsec** | Quét lỗ hổng bằng agent | Báo cáo scan, triage, revalidation và gate |
| **oma-design** | Design system, landing page, token | `DESIGN.md`, token và hướng dẫn component |
| **oma-dev-workflow** | CI/CD, monorepo, migration, release automation | Cấu hình workflow và kiểm tra release |
| **oma-docs** | Ref hỏng và drift tài liệu | Báo cáo verify hoặc ứng viên sync theo diff |
| **oma-explanation** | Walkthrough diff, PR, branch hoặc commit | HTML explainer offline với Background, Intuition, Code và Quiz |
| **oma-frontend** | Component UI, form, page, style Angular hoặc React | Thay đổi frontend và kiểm tra liên quan |
| **oma-hwp** | Chuyển đổi HWP/HWPX/HWPML | Markdown có heading, bảng, hình và link |
| **oma-image** | Tạo hình ảnh và visual | Image run tái lập với manifest |
| **oma-market** | Nghiên cứu pain point, trend, competitor, discovery | Brief nghiên cứu tuân thủ LAW với framework |
| **oma-mobile** | Flutter, React Native và Swift iOS | Màn hình mobile, state, tích hợp platform và test |
| **oma-observability** | Trace, metric, log, profile, SLO, điều tra sự cố | Khuyến nghị hoặc hướng dẫn observability theo tầng |
| **oma-orchestration** | Thực thi agent song song tự động | Plan điều phối, cập nhật memory và thu thập kết quả |
| **oma-pdf** | Chuyển đổi PDF và trích xuất có OCR | Markdown giữ thứ tự đọc, bảng, list và hình |
| **oma-pm** | Yêu cầu, phân tách task, API contract | `.agents/results/plan-{sessionId}.json` và task board |
| **oma-qa** | Review bảo mật, hiệu suất, accessibility, chất lượng | Báo cáo phát hiện với severity và evidence khắc phục |
| **oma-recap** | Retrospective công việc đa tool | Recap ngày/kỳ trong `.agents/results/recap/` |
| **oma-refactor** | Tái cấu trúc bảo toàn hành vi | Thay đổi refactor với characterization và evidence chất lượng |
| **oma-scholar** | Tìm kiếm học thuật và sidecar bài báo | Thao tác `.knows.yaml` đã xác thực |
| **oma-scm** | Branch Git, worktree, baseline, vệ sinh commit | Kế hoạch SCM hoặc output Conventional Commit |
| **oma-search** | Tìm docs, web, code, local có chấm điểm tin cậy | Kết quả search đã định tuyến kèm nhãn tin cậy |
| **oma-skill-creation** | Tạo và audit skill OMA | File skill SSL-lite và kết quả `oma skill audit` |
| **oma-slide** | Deck HTML và export | HTML bundle đã xác thực, PDF, PNG hoặc PPTX |
| **oma-tf-infra** | Hạ tầng Terraform, IAM, policy-as-code | Module Terraform, plan và control |
| **oma-translation** | Bản địa hóa UI, docs, marketing | Nội dung dịch giữ ngữ cảnh |
| **oma-video** | Shorts, explainer và demo | Video run tái lập với asset và manifest |
| **oma-voice** | TTS, STT và voiceover local | Artifact audio hoặc transcript kèm manifest |

---

## Thiết lập dashboard

### Dashboard terminal

```bash
oma dashboard terminal
```

Hiển thị bảng cập nhật liên tục trong terminal:
- Session ID và trạng thái tổng thể (RUNNING / COMPLETED / FAILED)
- Hàng theo agent: trạng thái, số lượt, hoạt động gần nhất, thời gian đã trôi qua
- Theo dõi `.agents/state/memories/` để cập nhật progress thời gian thực

### Dashboard web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Tính năng:
- Cập nhật thời gian thực qua WebSocket, không cần refresh
- Tự kết nối lại khi mất kết nối
- Trạng thái session với chỉ báo agent theo màu (xanh=hoàn thành, vàng=đang chạy, đỏ=thất bại)
- Luồng log từ file progress và result
- Dữ liệu session lịch sử

### Bố cục khuyến nghị

Dùng 3 terminal:
1. **Dashboard terminal:** `oma dashboard terminal` để giám sát liên tục
2. **Command terminal:** lệnh spawn agent, lệnh workflow
3. **Build terminal:** test, log build, thao tác git

---

## Giải thích khái niệm chính

### Progressive disclosure

Skill tải theo hai tầng để tiết kiệm token. Tầng 1 (`SKILL.md`) đi vào ngữ cảnh khi host định tuyến skill; injector truyền đường dẫn chứ không truyền nội dung. Tầng 2 (`resources/`) chỉ được đọc khi task cần; độ khó đặt ra một ngân sách mềm, không phải danh sách file. Mức tiết kiệm phụ thuộc vào skill và task, vì vậy hãy đo thay vì giả định một con số: [toán tiết kiệm token](../core-concepts/skills.md#token-savings-math) có script và giải thích các ước tính của nó bao gồm những gì.

### Tối ưu token

Ngoài progressive disclosure, oh-my-agent tối ưu token bằng:
- **Quản lý ngân sách ngữ cảnh:** không đọc toàn bộ file; dùng `find_symbol` thay vì `read_file`
- **Tải resource lazy:** chỉ tải playbook lỗi khi có lỗi, checklist khi xác minh
- **Nhánh theo độ khó:** task Simple bỏ qua phân tích và dùng checklist tối thiểu
- **Theo dõi tiến độ:** agent ghi file đã đọc để tránh đọc lại

### Spawn qua CLI

Khi chạy `oma agent spawn`, CLI:
1. Resolve vendor của role từ option tường minh, override agent, model preset và fallback đã cấu hình
2. Inject execution protocol theo vendor từ `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Soạn prompt agent bằng quy tắc cốt lõi SKILL.md, execution protocol và resource liên quan task
4. Spawn agent như process CLI độc lập
5. Run ghi receipt có cấu trúc tại `.agents/state/agent-runs/` và inject đường dẫn claim
6. Agent ghi structured claim; Markdown progress/result dễ đọc chỉ là bổ sung

### Project memory store

Agent phối hợp qua file bền vững tại `.agents/state/memories/` (project cũ fallback về `.serena/memories/`). Orchestrator ghi file session và task-board theo run. Mỗi run ghi `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` và `result-{agentId}-{taskId}-{runId}-{sessionId}.md` khi bật output Markdown; receipt và claim cấu trúc tại `.agents/state/agent-runs/` là nguồn có thẩm quyền cho CLI spawn. Agent đọc/ghi file bằng native tool; mapping tool vẫn cấu hình được trong `.agents/mcp.json → memoryConfig.tools`.

### Workspace

<!-- oma-docs:ignore-start -->
Flag `-w` của `agent spawn` cô lập agent trong thư mục cụ thể. Điều này rất quan trọng với thực thi song song. Nếu không cô lập workspace, hai agent có thể sửa cùng file cùng lúc và tạo xung đột. Bố cục chuẩn: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Mẹo

1. **Viết prompt cụ thể.** Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL cho kết quả tốt hơn make an app.
2. **Dùng workspace cho agent song song.** Luôn truyền `-w ./path` để ngăn xung đột file giữa các agent chạy đồng thời.
3. **Khóa API contract trước khi spawn agent triển khai.** Chạy `/plan` trước để frontend và backend thống nhất hình dạng endpoint.
4. **Giám sát tích cực.** Mở dashboard terminal để phát hiện agent thất bại sớm thay vì chờ mọi agent hoàn tất.
5. **Lặp bằng spawn lại.** Nếu output agent chưa đúng, spawn lại với task gốc và ngữ cảnh sửa. Không bắt đầu lại từ đầu.
6. **Chọn điều phối theo task.** Bắt đầu bằng skill đơn cho một domain; dùng [hướng dẫn chọn](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) khi task cần phối hợp hoặc workflow chất lượng tường minh.
7. **Dùng `/brainstorm` trước `/plan` cho ý tưởng mơ hồ.** Brainstorm làm rõ ý định và hướng trước khi PM agent phân tách task.
8. **Chạy `/deepinit` trên codebase mới.** Nó tạo AGENTS.md và ARCHITECTURE.md giúp mọi agent hiểu cấu trúc project.
9. **Cấu hình `model_preset`.** Bắt đầu với `auto`, chọn preset cố định như `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` hoặc `mixed`, hay dùng `free` với gateway local. Thêm override `agents:` để điều chỉnh chi tiết. Xem [Per-Agent Models](./per-agent-models.md).
10. **Dùng `/ultrawork` khi bạn muốn toàn bộ quy trình review của nó.** Workflow 5 giai đoạn chạy 12 bước review cô lập; chỉ tải skill không chạy các kiểm tra đó.

---

## Khắc phục sự cố

| Vấn đề | Nguyên nhân | Cách xử lý |
|---------|-------|-----|
| IDE không phát hiện skill | Thiếu `.agents/skills/` hoặc không có file `SKILL.md` | Chạy installer (`bunx oh-my-agent@latest`), kiểm tra symlink trong `.claude/skills/`, khởi động lại IDE |
| Không tìm thấy CLI khi spawn | CLI AI đã chọn chưa cài hoặc nằm ngoài `PATH` | Chạy `which <selected-cli>` (ví dụ `claude`, `codex`, `agy`, `qwen` hoặc `kiro`), mở shell mới hoặc cài theo installation guide |
| Agent tạo code xung đột | Không cô lập workspace | Dùng workspace riêng: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard hiện "No agents detected" | Agent chưa ghi vào memory | Đợi agent khởi động (ghi đầu tiên ở lượt 1), hoặc xác minh session ID khớp |
| Dashboard web không khởi động | Chưa cài dependency | Chạy `bun install` trong thư mục web/ trước |
| Báo cáo QA có hơn 50 vấn đề | Bình thường ở lần review đầu của codebase lớn | Tập trung CRITICAL và HIGH trước. Ghi MEDIUM/LOW cho sprint tương lai. |
| Tự động phát hiện kích hoạt sai workflow | Từ khóa mơ hồ | Dùng `/command` tường minh thay vì ngôn ngữ tự nhiên. Ghi nhận false trigger để cải thiện. |
| Workflow liên tục không dừng | File trạng thái vẫn tồn tại | Nói "workflow done" trong chat hoặc xóa thủ công file trạng thái từ `.agents/state/` |
| Agent bị chặn ở clarification HIGH | Yêu cầu quá mơ hồ | Cung cấp câu trả lời cụ thể agent yêu cầu, rồi chạy lại |
| Tool MCP không hoạt động | Serena chưa cấu hình hoặc chưa chạy | Chạy `oma doctor` để xác minh cấu hình MCP |
| Agent vượt ngân sách thực thi | Task quá phức tạp cho một run | Phân tách task, dùng workflow có ranh giới rõ hoặc retry với acceptance contract hẹp hơn |
| Agent dùng sai CLI | Chưa cấu hình `model_preset` hoặc thiếu override agent | Chạy `oma install` để cấu hình hoặc đặt `model_preset` trong `oma-config.yaml`. Xem [Per-Agent Models](./per-agent-models.md). |

---

Xem [Hướng dẫn skill đơn](./single-skill.md) cho mẫu task một lĩnh vực.
Xem [Hướng dẫn tích hợp](./integration.md) để biết chi tiết tích hợp project.
