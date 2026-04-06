---
title: Agent
description: Tham chiếu đầy đủ cho tất cả 14 agent oh-my-agent — lĩnh vực, tech stack, file tài nguyên, khả năng, giao thức Charter Preflight, tải skill 2 tầng, quy tắc thực thi theo phạm vi, cổng chất lượng, chiến lược workspace, luồng điều phối và bộ nhớ runtime.
---

# Agent

Agent trong oh-my-agent là các vai trò kỹ sư chuyên biệt. Mỗi agent có lĩnh vực được xác định, kiến thức tech stack, file tài nguyên, cổng chất lượng và ràng buộc thực thi. Agent không phải chatbot chung chung — chúng là worker có phạm vi, hoạt động trong ranh giới và tuân theo quy trình có cấu trúc.

---

## Phân loại agent

| Phân loại | Agent | Trách nhiệm |
|----------|--------|---------------|
| **Ý tưởng** | oma-brainstorm | Khám phá ý tưởng, đề xuất hướng tiếp cận, tạo tài liệu thiết kế |
| **Lập kế hoạch** | oma-pm | Phân tách yêu cầu, chia task, API contract, gán ưu tiên |
| **Triển khai** | oma-frontend, oma-backend, oma-mobile, oma-db | Viết mã production trong lĩnh vực tương ứng |
| **Thiết kế** | oma-design | Design system, DESIGN.md, token, typography, màu sắc, chuyển động, accessibility |
| **Hạ tầng** | oma-tf-infra | Cung cấp Terraform đa cloud, IAM, tối ưu chi phí, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migration, phối hợp release, tự động hóa monorepo |
| **Chất lượng** | oma-qa | Kiểm tra bảo mật (OWASP), hiệu suất, accessibility (WCAG), đánh giá chất lượng mã |
| **Gỡ lỗi** | oma-debug | Tái hiện lỗi, phân tích nguyên nhân gốc, sửa tối thiểu, test hồi quy |
| **Bản địa hóa** | oma-translator | Dịch thuật nhận biết ngữ cảnh bảo toàn giọng điệu, phong cách và thuật ngữ lĩnh vực |
| **Điều phối** | oma-orchestrator, oma-coordination | Điều phối đa agent tự động và thủ công |
| **Git** | oma-commit | Tạo Conventional Commits, tách commit theo tính năng |

---

## Tham chiếu chi tiết agent

### oma-brainstorm

**Lĩnh vực:** Khám phá ý tưởng ưu tiên thiết kế trước khi lập kế hoạch hoặc triển khai.

**Khi nào sử dụng:** Khám phá ý tưởng tính năng mới, hiểu ý định người dùng, so sánh hướng tiếp cận. Sử dụng trước `/plan` cho các yêu cầu phức tạp hoặc mơ hồ.

**Khi nào KHÔNG sử dụng:** Yêu cầu rõ ràng (chuyển sang oma-pm), triển khai (chuyển sang agent lĩnh vực), đánh giá mã (chuyển sang oma-qa).

**Quy tắc cốt lõi:**
- Không triển khai hoặc lập kế hoạch trước khi thiết kế được duyệt
- Mỗi lần một câu hỏi làm rõ (không hỏi hàng loạt)
- Luôn đề xuất 2-3 hướng tiếp cận với tùy chọn khuyến nghị
- Thiết kế từng phần với xác nhận người dùng ở mỗi bước
- YAGNI — chỉ thiết kế những gì cần thiết

**Quy trình:** 6 giai đoạn: Khám phá ngữ cảnh, Câu hỏi, Hướng tiếp cận, Thiết kế, Tài liệu (lưu vào `docs/plans/`), Chuyển sang `/plan`.

**Tài nguyên:** Chỉ dùng tài nguyên dùng chung (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-pm

**Lĩnh vực:** Quản lý sản phẩm — phân tích yêu cầu, phân tách task, API contract.

**Khi nào sử dụng:** Chia nhỏ tính năng phức tạp, xác định tính khả thi, ưu tiên công việc, định nghĩa API contract.

**Quy tắc cốt lõi:**
- Thiết kế API-first: định nghĩa contract trước task triển khai
- Mỗi task có: agent, tiêu đề, tiêu chí chấp nhận, ưu tiên, phụ thuộc
- Tối thiểu hóa phụ thuộc để tối đa thực thi song song
- Bảo mật và kiểm thử là phần của mọi task (không phải giai đoạn riêng)
- Task phải hoàn thành được bởi một agent duy nhất
- Xuất JSON plan + task-board.md cho tương thích orchestrator

**Đầu ra:** `.agents/plan.json`, `.agents/results/result-pm.md`, ghi vào bộ nhớ cho orchestrator.

**Tài nguyên:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Giới hạn lượt:** Mặc định 10, tối đa 15.

---

### oma-frontend

**Lĩnh vực:** Web UI — React, Next.js, TypeScript với kiến trúc FSD-lite.

**Khi nào sử dụng:** Xây dựng giao diện người dùng, component, logic client-side, styling, xác thực form, tích hợp API.

**Tech stack:**
- React + Next.js (Server Components mặc định, Client Components cho tương tác)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (primitive chỉ đọc, mở rộng qua cva/wrapper)
- FSD-lite: root `src/` + feature `src/features/*/` (không import chéo giữa feature)

**Thư viện:**
| Mục đích | Thư viện |
|---------|---------|
| Ngày tháng | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hook | ahooks |
| Tiện ích | es-toolkit |
| State URL | nuqs |
| State server | TanStack Query |
| State client | Jotai (giảm thiểu sử dụng) |
| Form | @tanstack/react-form + Zod |
| Xác thực | better-auth |

**Quy tắc cốt lõi:**
- shadcn/ui trước, mở rộng qua cva, không bao giờ sửa trực tiếp `components/ui/*`
- Ánh xạ 1:1 design token (không bao giờ hardcode màu)
- Proxy thay vì middleware (Next.js 16+ dùng `proxy.ts`, không dùng `middleware.ts` cho logic proxy)
- Không prop drilling quá 3 cấp — dùng Jotai atom
- Import tuyệt đối với `@/` bắt buộc
- Mục tiêu FCP < 1s
- Breakpoint responsive: 320px, 768px, 1024px, 1440px

**Tài nguyên:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Checklist cổng chất lượng:**
- Accessibility: ARIA label, heading ngữ nghĩa, điều hướng bàn phím
- Mobile: xác minh trên viewport mobile
- Hiệu suất: không CLS, tải nhanh
- Khả năng phục hồi: Error Boundary và Loading Skeleton
- Test: logic được bao phủ bởi Vitest
- Chất lượng: typecheck và lint pass

**Giới hạn lượt:** Mặc định 20, tối đa 30.

---

### oma-backend

**Lĩnh vực:** API, logic server-side, xác thực, thao tác database.

**Khi nào sử dụng:** REST/GraphQL API, database migration, xác thực, logic nghiệp vụ server, background job.

**Kiến trúc:** Router (HTTP) -> Service (Logic nghiệp vụ) -> Repository (Truy cập dữ liệu) -> Models.

**Phát hiện stack:** Đọc manifest dự án (pyproject.toml, package.json, Cargo.toml, go.mod, v.v.) để xác định ngôn ngữ và framework. Dùng thư mục `stack/` nếu có, hoặc yêu cầu người dùng chạy `/stack-set`.

**Quy tắc cốt lõi:**
- Kiến trúc sạch: không có logic nghiệp vụ trong route handler
- Tất cả đầu vào được xác thực bằng thư viện xác thực của dự án
- Chỉ dùng truy vấn tham số hóa (không bao giờ nội suy chuỗi trong SQL)
- JWT + bcrypt cho xác thực; giới hạn tốc độ endpoint xác thực
- Async khi được hỗ trợ; chú thích kiểu trên tất cả signature
- Exception tùy chỉnh qua module lỗi tập trung
- Chiến lược tải ORM tường minh, ranh giới transaction, vòng đời an toàn

**Tài nguyên:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Tài nguyên đặc thù stack trong `stack/` (tạo bởi `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Giới hạn lượt:** Mặc định 20, tối đa 30.

---

### oma-mobile

**Lĩnh vực:** Ứng dụng mobile đa nền tảng — Flutter, React Native.

**Khi nào sử dụng:** Ứng dụng mobile native (iOS + Android), mẫu UI đặc thù mobile, tính năng nền tảng (camera, GPS, push notification), kiến trúc offline-first.

**Kiến trúc:** Clean Architecture: domain -> data -> presentation.

**Tech stack:** Flutter/Dart, Riverpod/Bloc (quản lý state), Dio với interceptor (API), GoRouter (điều hướng), Material Design 3 (Android) + iOS HIG.

**Quy tắc cốt lõi:**
- Riverpod/Bloc cho quản lý state (không dùng setState thô cho logic phức tạp)
- Tất cả controller được dispose trong phương thức `dispose()`
- Dio với interceptor cho API; xử lý offline một cách graceful
- Mục tiêu 60fps; test trên cả hai nền tảng

**Tài nguyên:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Giới hạn lượt:** Mặc định 20, tối đa 30.

---

### oma-db

**Lĩnh vực:** Kiến trúc database — SQL, NoSQL, vector database.

**Khi nào sử dụng:** Thiết kế schema, ERD, chuẩn hóa, đánh index, transaction, quy hoạch dung lượng, chiến lược backup, thiết kế migration, kiến trúc vector DB/RAG, đánh giá anti-pattern, thiết kế nhận biết tuân thủ (ISO 27001/27002/22301).

**Quy trình mặc định:** Khám phá (xác định entity, mẫu truy cập, khối lượng) -> Thiết kế (schema, constraint, transaction) -> Tối ưu (index, phân vùng, lưu trữ, anti-pattern).

**Quy tắc cốt lõi:**
- Chọn mô hình trước, engine sau
- Mặc định 3NF cho relational; tài liệu đánh đổi BASE cho distributed
- Tài liệu cả ba tầng schema: external, conceptual, internal
- Tính toàn vẹn là ưu tiên hàng đầu: entity, domain, referential, business-rule
- Đồng thời không bao giờ ngầm định: xác định ranh giới transaction và mức cô lập
- Vector DB là hạ tầng truy xuất, không phải nguồn dữ liệu gốc
- Không bao giờ coi tìm kiếm vector là thay thế trực tiếp cho tìm kiếm từ vựng

**Sản phẩm bắt buộc:** Tóm tắt schema external, schema conceptual, schema internal, bảng tiêu chuẩn dữ liệu, thuật ngữ, ước tính dung lượng, chiến lược backup/phục hồi. Cho vector/RAG: chính sách phiên bản embedding, chính sách chunking, chiến lược truy xuất hybrid.

**Tài nguyên:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Lĩnh vực:** Design system, UI/UX, quản lý DESIGN.md.

**Khi nào sử dụng:** Tạo design system, landing page, design token, bảng màu, typography, bố cục responsive, đánh giá accessibility.

**Quy trình:** 7 giai đoạn: Setup (thu thập ngữ cảnh) -> Extract (tùy chọn, từ URL tham chiếu) -> Enhance (tăng cường prompt mơ hồ) -> Propose (2-3 hướng thiết kế) -> Generate (DESIGN.md + token) -> Audit (responsive, WCAG, Nielsen, kiểm tra AI slop) -> Handoff.

**Quy tắc cốt lõi:**
- Kiểm tra `.design-context.md` trước; tạo nếu thiếu
- Mặc định font hệ thống (font CJK-ready cho ko/ja/zh)
- WCAG AA tối thiểu cho mọi thiết kế
- Responsive-first (mobile là mặc định)
- Trình bày 2-3 hướng, nhận xác nhận

**Tài nguyên:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, cùng thư mục `reference/` và `examples/`.

---

### oma-tf-infra

**Lĩnh vực:** Infrastructure-as-code với Terraform, đa cloud.

**Khi nào sử dụng:** Cung cấp trên AWS/GCP/Azure/Oracle Cloud, cấu hình Terraform, xác thực CI/CD (OIDC), CDN/load balancer/storage/networking, quản lý state, hạ tầng tuân thủ ISO.

**Quy tắc cốt lõi:**
- Không phụ thuộc provider: phát hiện cloud từ ngữ cảnh dự án
- Remote state với versioning và locking
- OIDC-first cho xác thực CI/CD
- Luôn plan trước apply
- IAM quyền tối thiểu
- Tag mọi thứ (Environment, Project, Owner, CostCenter)
- Không secret trong mã
- Pin phiên bản tất cả provider và module
- Không auto-approve trong production

**Tài nguyên:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Lĩnh vực:** Tự động hóa task monorepo và CI/CD.

**Khi nào sử dụng:** Chạy dev server, thực thi lint/format/typecheck xuyên app, database migration, tạo API, build i18n, build production, tối ưu CI/CD, xác thực pre-commit.

**Quy tắc cốt lõi:**
- Luôn dùng task `mise run` thay vì lệnh package manager trực tiếp
- Chỉ chạy lint/test trên app thay đổi
- Xác thực commit message bằng commitlint
- CI nên bỏ qua app không thay đổi
- Không bao giờ dùng lệnh package manager trực tiếp khi có task mise

**Tài nguyên:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-qa

**Lĩnh vực:** Đảm bảo chất lượng — bảo mật, hiệu suất, accessibility, chất lượng mã.

**Khi nào sử dụng:** Đánh giá cuối trước triển khai, kiểm tra bảo mật, phân tích hiệu suất, tuân thủ accessibility, phân tích độ bao phủ test.

**Thứ tự ưu tiên đánh giá:** Bảo mật > Hiệu suất > Accessibility > Chất lượng mã.

**Mức độ nghiêm trọng:**
- **CRITICAL**: Vi phạm bảo mật, rủi ro mất dữ liệu
- **HIGH**: Chặn phát hành
- **MEDIUM**: Sửa sprint này
- **LOW**: Backlog

**Quy tắc cốt lõi:**
- Mỗi phát hiện phải có file:line, mô tả và sửa
- Chạy công cụ tự động trước (npm audit, bandit, lighthouse)
- Không false positive — mỗi phát hiện phải tái hiện được
- Cung cấp mã khắc phục, không chỉ mô tả

**Tài nguyên:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Giới hạn lượt:** Mặc định 15, tối đa 20.

---

### oma-debug

**Lĩnh vực:** Chẩn đoán và sửa lỗi.

**Khi nào sử dụng:** Lỗi do người dùng báo, crash, vấn đề hiệu suất, lỗi gián đoạn, race condition, lỗi hồi quy.

**Phương pháp:** Tái hiện trước, sau đó chẩn đoán. Không bao giờ đoán mò cách sửa.

**Quy tắc cốt lõi:**
- Xác định nguyên nhân gốc, không chỉ triệu chứng
- Sửa tối thiểu: chỉ thay đổi những gì cần thiết
- Mỗi bản sửa đều có test hồi quy
- Tìm mẫu tương tự ở nơi khác
- Tài liệu trong `.agents/results/`

**Công cụ Serena MCP sử dụng:**
- `find_symbol("functionName")` — định vị hàm
- `find_referencing_symbols("Component")` — tìm tất cả nơi sử dụng
- `search_for_pattern("error pattern")` — tìm vấn đề tương tự

**Tài nguyên:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Giới hạn lượt:** Mặc định 15, tối đa 25.

---

### oma-translator

**Lĩnh vực:** Dịch thuật đa ngôn ngữ nhận biết ngữ cảnh.

**Khi nào sử dụng:** Dịch chuỗi UI, tài liệu, copy marketing, đánh giá bản dịch hiện có, tạo thuật ngữ.

**Phương pháp 4 bước:** Phân tích nguồn (phong cách, ý định, thuật ngữ lĩnh vực, tham chiếu văn hóa, hàm ý cảm xúc, ánh xạ ngôn ngữ hình tượng) -> Trích xuất ý nghĩa (tách cấu trúc nguồn) -> Tái tạo bằng ngôn ngữ đích (thứ tự từ tự nhiên, khớp phong cách, tách/ghép câu) -> Xác minh (rubric tự nhiên + kiểm tra anti-pattern AI).

**Chế độ tinh chỉnh 7 bước tùy chọn** cho chất lượng xuất bản: mở rộng với các bước Đánh giá phản biện, Chỉnh sửa và Hoàn thiện.

**Quy tắc cốt lõi:**
- Quét file locale hiện có trước để khớp quy ước
- Dịch ý nghĩa, không dịch từ
- Bảo toàn hàm ý cảm xúc
- Không bao giờ tạo bản dịch từ-cho-từ
- Không trộn phong cách trong một bài
- Bảo toàn thuật ngữ đặc thù lĩnh vực nguyên trạng

**Tài nguyên:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Lĩnh vực:** Điều phối đa agent tự động qua spawn CLI.

**Khi nào sử dụng:** Tính năng phức tạp cần nhiều agent song song, thực thi tự động, triển khai fullstack.

**Cấu hình mặc định:**

| Cài đặt | Mặc định | Mô tả |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Subagent đồng thời tối đa |
| MAX_RETRIES | 2 | Số lần thử lại mỗi task thất bại |
| POLL_INTERVAL | 30s | Khoảng kiểm tra trạng thái |
| MAX_TURNS (impl) | 20 | Giới hạn lượt cho backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Giới hạn lượt cho qa/debug |
| MAX_TURNS (plan) | 10 | Giới hạn lượt cho pm |

**Giai đoạn quy trình:** Plan -> Setup (session ID, khởi tạo bộ nhớ) -> Execute (spawn theo tier ưu tiên) -> Monitor (poll tiến trình) -> Verify (tự động + vòng lặp review chéo) -> Collect (tổng hợp kết quả).

**Vòng lặp review giữa agent:**
1. Tự review: agent kiểm tra diff của mình so với tiêu chí chấp nhận
2. Xác minh tự động: `oh-my-ag verify {agent-type} --workspace {workspace}`
3. Review chéo: agent QA đánh giá thay đổi
4. Khi thất bại: vấn đề được phản hồi để sửa (tối đa 5 vòng lặp tổng)

**Giám sát Clarification Debt:** Theo dõi sửa chữa của người dùng trong phiên. Sự kiện được tính điểm: clarify (+10), correct (+25), redo (+40). CD >= 50 kích hoạt RCA bắt buộc. CD >= 80 tạm dừng phiên.

**Tài nguyên:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-commit

**Lĩnh vực:** Tạo commit Git theo Conventional Commits.

**Khi nào sử dụng:** Sau khi hoàn thành thay đổi mã, khi chạy `/commit`.

**Loại commit:** feat, fix, refactor, docs, test, chore, style, perf.

**Quy trình:** Phân tích thay đổi -> Tách theo tính năng (nếu > 5 file trải trên scope/type khác nhau) -> Xác định type -> Xác định scope -> Viết mô tả (mệnh lệnh, < 72 ký tự, chữ thường, không dấu chấm cuối) -> Thực thi commit ngay.

**Quy tắc:**
- Không bao giờ dùng `git add -A` hoặc `git add .`
- Không bao giờ commit file secret
- Luôn chỉ định file khi staging
- Dùng HEREDOC cho commit message nhiều dòng
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**Lĩnh vực:** Hướng dẫn điều phối đa agent thủ công từng bước.

**Khi nào sử dụng:** Dự án phức tạp muốn kiểm soát con người ở mỗi cổng, hướng dẫn spawn agent thủ công, công thức điều phối từng bước.

**Khi nào KHÔNG sử dụng:** Thực thi song song tự động hoàn toàn (dùng oma-orchestrator), task đơn lĩnh vực (dùng agent lĩnh vực trực tiếp).

**Quy tắc cốt lõi:**
- Luôn trình bày kế hoạch để người dùng xác nhận trước khi spawn agent
- Một tier ưu tiên mỗi lần — đợi hoàn thành trước khi tier tiếp theo
- Người dùng duyệt mỗi chuyển tiếp cổng
- Đánh giá QA bắt buộc trước khi merge
- Vòng lặp khắc phục vấn đề cho phát hiện CRITICAL/HIGH

**Quy trình:** PM lập kế hoạch -> Người dùng xác nhận -> Spawn theo tier ưu tiên -> Giám sát -> QA review -> Sửa vấn đề -> Phát hành.

**Khác biệt với oma-orchestrator:** Coordination là thủ công và có hướng dẫn (người dùng kiểm soát nhịp độ), orchestrator là tự động (agent spawn và chạy với can thiệp tối thiểu từ người dùng).

---

## Charter Preflight (CHARTER_CHECK)

Trước khi viết bất kỳ mã nào, mọi agent triển khai phải xuất khối CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {lĩnh vực agent}
- Must NOT do: {3 ràng buộc từ phạm vi task}
- Success criteria: {tiêu chí đo lường được}
- Assumptions: {mặc định đã áp dụng}
```

**Mục đích:**
- Khai báo agent sẽ và sẽ không làm gì
- Phát hiện lệch phạm vi trước khi viết mã
- Làm rõ giả định cho người dùng xem xét
- Cung cấp tiêu chí thành công có thể kiểm thử

**Mức độ làm rõ:**
- **LOW**: Yêu cầu rõ ràng. Tiến hành với giả định đã nêu.
- **MEDIUM**: Mơ hồ một phần. Liệt kê tùy chọn, tiến hành với khả năng cao nhất.
- **HIGH**: Rất mơ hồ. Đặt trạng thái bị chặn, liệt kê câu hỏi, KHÔNG viết mã.

Ở chế độ subagent (spawn qua CLI), agent không thể hỏi trực tiếp người dùng. LOW tiến hành, MEDIUM thu hẹp và diễn giải, HIGH chặn và trả về câu hỏi cho orchestrator chuyển tiếp.

---

## Tải skill 2 tầng

Kiến thức của mỗi agent được chia thành hai tầng:

**Layer 1 — SKILL.md (~800 byte):**
Luôn được tải. Chứa frontmatter (name, description), khi nào sử dụng / không sử dụng, quy tắc cốt lõi, tổng quan kiến trúc, danh sách thư viện và tham chiếu đến tài nguyên Layer 2.

**Layer 2 — resources/ (tải theo nhu cầu):**
Chỉ tải khi agent đang làm việc, và chỉ tài nguyên khớp loại task và độ khó:

| Độ khó | Tài nguyên tải |
|-----------|-----------------|
| **Simple** | Chỉ execution-protocol.md |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Tài nguyên bổ sung được tải trong quá trình thực thi khi cần:
- `checklist.md` — ở bước Verify
- `error-playbook.md` — chỉ khi có lỗi
- `common-checklist.md` — cho xác minh cuối cùng của task Complex

---

## Thực thi theo phạm vi

Agent hoạt động trong ranh giới lĩnh vực nghiêm ngặt:

- Agent frontend sẽ không sửa mã backend
- Agent backend sẽ không chạm vào component UI
- Agent DB sẽ không triển khai endpoint API
- Agent tài liệu hóa phụ thuộc ngoài phạm vi cho agent khác

Khi phát hiện task thuộc lĩnh vực khác trong quá trình thực thi, agent ghi nhận trong file kết quả như mục escalation, thay vì cố xử lý.

---

## Chiến lược workspace

Cho dự án đa agent, workspace riêng biệt ngăn xung đột file:

```
./apps/api      → workspace agent backend
./apps/web      → workspace agent frontend
./apps/mobile   → workspace agent mobile
```

Workspace được chỉ định bằng flag `-w` khi spawn agent:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Luồng điều phối

Khi chạy workflow đa agent (`/orchestrate` hoặc `/work`):

1. **Agent PM** phân tách yêu cầu thành task theo lĩnh vực với ưu tiên (P0, P1, P2) và phụ thuộc
2. **Phiên được khởi tạo** — session ID được tạo, `orchestrator-session.md` và `task-board.md` được tạo trong bộ nhớ
3. **Task P0** được spawn song song (tối đa MAX_PARALLEL agent đồng thời)
4. **Tiến trình được giám sát** — orchestrator poll file `progress-{agent}.md` mỗi POLL_INTERVAL
5. **Task P1** được spawn sau khi P0 hoàn thành, v.v.
6. **Vòng lặp xác minh** chạy cho mỗi agent hoàn thành (tự review -> xác minh tự động -> review chéo bởi QA)
7. **Kết quả được thu thập** từ tất cả file `result-{agent}.md`
8. **Báo cáo cuối** với tóm tắt phiên, file thay đổi, vấn đề còn lại

---

## Định nghĩa agent

Agent được định nghĩa ở hai vị trí:

**`.agents/agents/`** — Chứa 7 file định nghĩa subagent:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Các file này định nghĩa danh tính agent, tham chiếu quy trình thực thi, template CHARTER_CHECK, tóm tắt kiến trúc và quy tắc. Chúng được dùng khi spawn subagent qua Task/Agent tool (Claude Code) hoặc CLI.

**`.claude/agents/`** — Định nghĩa subagent đặc thù IDE tham chiếu file `.agents/agents/` qua symlink hoặc bản sao trực tiếp cho tương thích Claude Code.

---

## Trạng thái runtime (Serena Memory)

Trong phiên điều phối, agent phối hợp qua file bộ nhớ chia sẻ trong `.serena/memories/` (có thể cấu hình qua `mcp.json`):

| File | Chủ sở hữu | Mục đích | Khác |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orchestrator | Session ID, trạng thái, thời gian bắt đầu, theo dõi giai đoạn | Chỉ đọc |
| `task-board.md` | Orchestrator | Phân công task, ưu tiên, cập nhật trạng thái | Chỉ đọc |
| `progress-{agent}.md` | Agent đó | Tiến trình từng lượt: hành động, file đọc/sửa, trạng thái hiện tại | Orchestrator đọc |
| `result-{agent}.md` | Agent đó | Kết quả cuối: trạng thái (completed/failed), tóm tắt, file thay đổi, checklist tiêu chí chấp nhận | Orchestrator đọc |
| `session-metrics.md` | Orchestrator | Theo dõi Clarification Debt, tiến trình Quality Score | QA đọc |
| `experiment-ledger.md` | Orchestrator/QA | Theo dõi thí nghiệm khi Quality Score được kích hoạt | Tất cả đọc |

Công cụ bộ nhớ có thể cấu hình. Mặc định dùng Serena MCP (`read_memory`, `write_memory`, `edit_memory`), nhưng công cụ tùy chỉnh có thể cấu hình trong `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Dashboard (`oma dashboard` và `oma dashboard:web`) theo dõi các file bộ nhớ này cho giám sát thời gian thực.
