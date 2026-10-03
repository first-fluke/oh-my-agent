---
title: Các agent
description: Tham chiếu cho 33 gói skill, 13 vai trò điều phối chuẩn và 12 định nghĩa subagent đã lưu, bao gồm lĩnh vực, tài nguyên, Charter Preflight, tải tiến dần, quy tắc phạm vi, cổng chất lượng, workspace, điều phối và bộ nhớ runtime.
---

# Các agent

OMA tách các gói skill, vai trò điều phối và file định nghĩa subagent. Skill định tuyến và tải hướng dẫn theo lĩnh vực; vai trò chuẩn là danh tính runtime dùng để điều phối; định nghĩa đã lưu trong repository cung cấp persona riêng cho từng vendor. Các lớp này chồng lấn có chủ đích, vì vậy hãy dựa vào ranh giới task và tiêu chí chấp nhận để quyết định một skill đã đủ hay chưa.

Các định nghĩa agent trong `.agents/agents/` là nguồn sự thật. OMA chiếu chúng thành file theo vendor cho các runtime hỗ trợ subagent tùy chỉnh:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` hoặc phép chiếu của vendor được chọn khác nếu được hỗ trợ

Khi workflow ánh xạ agent vào cùng vendor với runtime hiện tại, trước tiên hãy dùng file agent native của runtime đó. Task khác vendor sẽ dự phòng bằng `oma agent spawn`.

> **Điều phối model theo agent:** mỗi agent được phân giải thành model slug, vendor CLI và mức suy luận cụ thể thông qua `model_preset` cùng ghi đè tùy chọn `agents:` trong `.agents/oma-config.yaml`. Xem [Model theo agent](../guide/per-agent-models.md) để biết cấu hình và dùng [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) để kiểm tra ma trận đang hoạt động.

---

## Phân loại agent

| Phân loại | Agent | Trách nhiệm |
|----------|--------|---------------|
| **Ý tưởng** | oma-brainstorm | Khám phá ý tưởng, đề xuất hướng tiếp cận, tạo tài liệu thiết kế |
| **Kiến trúc** | oma-architecture | Ranh giới hệ thống/module/dịch vụ, phân tích kiểu ADR/ATAM/CBAM, ghi chép đánh đổi |
| **Lập kế hoạch** | oma-pm | Phân tách yêu cầu, chia task, API contract, gán ưu tiên |
| **Triển khai** | oma-frontend, oma-backend, oma-mobile, oma-db | Viết mã trong các lĩnh vực tương ứng |
| **Thiết kế** | oma-design | Design system, DESIGN.md, token, typography, màu sắc, chuyển động, accessibility |
| **Hạ tầng** | oma-tf-infra | Cung cấp Terraform đa cloud, IAM, tối ưu chi phí, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migration, phối hợp release, tự động hóa monorepo |
| **Observability** | oma-observability | Pipeline observability, định tuyến truy vết, tín hiệu MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), quản lý SLO, điều tra sự cố, tinh chỉnh transport |
| **Chất lượng** | oma-qa | Kiểm tra bảo mật (OWASP), hiệu suất, accessibility (WCAG), đánh giá chất lượng mã |
| **Gỡ lỗi** | oma-debug | Tái hiện lỗi, phân tích nguyên nhân gốc, sửa tối thiểu, test hồi quy |
| **Bản địa hóa** | oma-translation | Dịch thuật nhận biết ngữ cảnh, bảo toàn giọng điệu, phong cách và thuật ngữ lĩnh vực |
| **Điều phối** | oma-orchestration, oma-coordination | Điều phối đa agent tự động và thủ công |
| **Git** | oma-scm | Tạo Conventional Commits, tách commit theo tính năng |
| **Tìm kiếm & Truy xuất** | oma-search | Bộ định tuyến tìm kiếm dựa trên ý định với chấm điểm độ tin cậy (tài liệu Context7, web, mã `gh`/`glab`, code intelligence cục bộ) |
| **Hồi tưởng** | oma-recap | Phân tích lịch sử hội thoại đa công cụ và tóm tắt công việc theo chủ đề |
| **Xử lý tài liệu** | oma-hwp, oma-pdf | Chuyển đổi HWP/HWPX/HWPML và PDF sang Markdown để nạp vào LLM/RAG |
| **Tài liệu** | oma-docs | Phát hiện drift tài liệu, xác minh broken ref và đề xuất patch đồng bộ cho tài liệu bị ảnh hưởng bởi diff |
| **Giải thích** | oma-explanation | Tạo explainer HTML tương tác ngoại tuyến cho diff, branch, PR hoặc commit range |
| **Viết học thuật** | oma-academic-writing, oma-scholar | Soạn thảo và audit văn phong học thuật chuẩn xuất bản; nghiên cứu, tìm kiếm và peer review bằng sidecar Knows |
| **Bảo mật** | oma-deepsec | Điều khiển trình quét lỗ hổng deepsec của Vercel (scan, PR gate, matcher, triage) có kiểm soát chi phí |
| **Tái cấu trúc** | oma-refactor | Tái cấu trúc tăng dần bảo toàn hành vi, nhắm hotspot và có safety net bằng characterization test |
| **Nghiên cứu thị trường** | oma-market | Nghiên cứu pain point, xu hướng, định vị đối thủ và discovery từ tín hiệu cộng đồng với khung SWOT/Porter/PESTEL |
| **Soạn skill** | oma-skill-creation | Tạo và xác thực skill OMA theo định dạng SSL-lite |
| **Tạo media** | oma-image, oma-slide, oma-video, oma-voice | Tạo ảnh AI, deck HTML, video short/explainer/demo và TTS/STT cục bộ |

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

### oma-architecture

**Lĩnh vực:** Kiến trúc phần mềm/hệ thống — ranh giới module và dịch vụ, phân tích đánh đổi, tổng hợp các bên liên quan, ghi chép quyết định.

**Khi nào sử dụng:** Lựa chọn hoặc đánh giá kiến trúc hệ thống, xác định ranh giới module/dịch vụ/sở hữu, so sánh các phương án kiến trúc với đánh đổi rõ ràng, điều tra các vấn đề kiến trúc (khuếch đại thay đổi, phụ thuộc ẩn, API vụng về), ưu tiên các khoản đầu tư kiến trúc hoặc tái cấu trúc, viết khuyến nghị kiến trúc hoặc ADR.

**Khi nào KHÔNG sử dụng:** Hệ thống trực quan/thiết kế (dùng oma-design), lập kế hoạch tính năng và phân tách task (dùng oma-pm), triển khai Terraform (dùng oma-tf-infra), chẩn đoán lỗi (dùng oma-debug), đánh giá bảo mật/hiệu suất/accessibility (dùng oma-qa).

**Phương pháp luận:** Định tuyến chẩn đoán, so sánh design-twice, phân tích rủi ro kiểu ATAM, ưu tiên kiểu CBAM, ghi chép quyết định kiểu ADR.

**Quy tắc cốt lõi:**
- Chẩn đoán vấn đề kiến trúc trước khi chọn phương pháp
- Sử dụng phương pháp nhẹ nhất đủ cho quyết định hiện tại
- Phân biệt thiết kế kiến trúc với thiết kế UI/trực quan và với triển khai Terraform
- Chỉ tham vấn các agent bên liên quan khi quyết định đủ xuyên suốt để biện minh chi phí
- Chất lượng khuyến nghị quan trọng hơn vở kịch đồng thuận: tham vấn rộng, quyết định rõ ràng
- Mỗi khuyến nghị phải nêu giả định, đánh đổi, rủi ro và các bước xác thực
- Luôn ý thức chi phí mặc định: chi phí triển khai, chi phí vận hành, độ phức tạp nhóm, chi phí thay đổi trong tương lai

**Tài nguyên:** `SKILL.md`, thư mục `resources/` với hướng dẫn phương pháp luận (diagnostic-routing, design-twice, ATAM, CBAM, mẫu ADR).

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

**Đầu ra:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, ghi vào bộ nhớ cho orchestrator. Hợp đồng API được ghi vào `.agents/results/api-contracts/` theo template `../_shared/core/api-contracts/template.md`.

**Tài nguyên:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md`.

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

**Tài nguyên:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` và `checklist.md`.

**Checklist cổng chất lượng:**
- Accessibility: ARIA label, heading ngữ nghĩa, điều hướng bàn phím
- Mobile: xác minh trên viewport mobile
- Hiệu suất: không CLS, tải nhanh
- Khả năng phục hồi: Error Boundary và Loading Skeleton
- Test: logic được bao phủ bởi Vitest
- Chất lượng: typecheck và lint pass

---

### oma-backend

**Lĩnh vực:** API, logic server-side, xác thực, thao tác database.

**Khi nào sử dụng:** REST/GraphQL API, database migration, xác thực, logic nghiệp vụ server, background job.

**Kiến trúc:** Router (HTTP) -> Service (Logic nghiệp vụ) -> Repository (Truy cập dữ liệu) -> Models.

**Phát hiện stack:** Đọc manifest dự án (pyproject.toml, package.json, Cargo.toml, go.mod, v.v.) để xác định ngôn ngữ và framework. Nếu thiếu quy ước riêng của dự án, yêu cầu người dùng chạy `/stack-set`; lệnh này materialize các tham chiếu `stack/` đã phân giải từ schema và template được cung cấp.

**Quy tắc cốt lõi:**
- Kiến trúc sạch: không có logic nghiệp vụ trong route handler
- Tất cả đầu vào được xác thực bằng thư viện xác thực của dự án
- Chỉ dùng truy vấn tham số hóa (không bao giờ nội suy chuỗi trong SQL)
- JWT + Argon2id cho xác thực (bcrypt chỉ chấp nhận để tương thích legacy); giới hạn tốc độ các endpoint xác thực
- Async khi được hỗ trợ; chú thích kiểu trên tất cả signature
- Exception tùy chỉnh qua module lỗi tập trung
- Chiến lược tải ORM tường minh, ranh giới transaction, vòng đời an toàn

**Tài nguyên:** `execution-protocol.md`, `orm-reference.md`, `checklist.md`, và `error-playbook.md`. `variants/stack.schema.json` định nghĩa hình dạng manifest stack.

<!-- oma-docs:ignore-start -->
Các file `stack/stack.yaml`, `stack/tech-stack.md`, snippet và API template dành riêng cho dự án được `/stack-set` tạo khi cần; chúng chưa tồn tại cho đến khi stack được materialize.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Lĩnh vực:** Ứng dụng mobile đa nền tảng — Flutter, React Native.

**Khi nào sử dụng:** Ứng dụng mobile native (iOS + Android), mẫu UI đặc thù mobile, tính năng nền tảng (camera, GPS, push notification), kiến trúc offline-first.

**Kiến trúc:** Clean Architecture: domain -> data -> presentation.
Với iOS native, bố cục là `App/Core/Features/Shared`; dùng `@Observable` thay cho `ObservableObject` trên iOS 17+, và tạo API client từ OpenAPI bằng `swift-openapi-generator`.

**Tech stack:** Flutter/Dart, Riverpod/Bloc (quản lý state), Dio với interceptor (API), GoRouter (điều hướng), Material Design 3 (Android) + iOS HIG.

**Quy tắc cốt lõi:**
- Riverpod/Bloc cho quản lý state (không dùng setState thô cho logic phức tạp)
- Tất cả controller được dispose trong phương thức `dispose()`
- Dio với interceptor cho API; xử lý offline một cách graceful
- Mục tiêu 60fps; test trên cả hai nền tảng

**Tài nguyên:** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` và `error-playbook.md`. Thư mục `variants/` chứa schema stack và tham chiếu platform được tạo khi `/stack-set` materialize.

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

**Tài nguyên:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md` và `error-playbook.md`.

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

**Tài nguyên:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, cùng thư mục `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**Lĩnh vực:** Infrastructure-as-code với Terraform, đa cloud.

**Cloud detection:** Đọc provider Terraform và prefix resource (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud), bao gồm bảng ánh xạ resource đa cloud đầy đủ.

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

**Tài nguyên:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md` và `examples.md`.

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

### oma-observability

**Lĩnh vực:** Router observability và truy vết dựa trên ý định, xuyên suốt các tầng, ranh giới và tín hiệu.

**Khi nào sử dụng:** Thiết lập pipeline observability (OTel SDK + Collector + backend của nhà cung cấp), truy vết xuyên ranh giới service và domain (W3C propagator, baggage, đa tenant, đa cloud), tinh chỉnh transport (ngưỡng UDP/MTU, OTLP gRPC vs HTTP, topology Collector DaemonSet vs sidecar, công thức sampling), điều tra pháp y sự cố (định vị 6 chiều: code / service / layer / host / region / infra), lựa chọn danh mục nhà cung cấp (OSS full-stack vs SaaS thương mại vs chuyên gia cardinality cao vs chuyên gia profiling), observability-as-code (dashboard Grafana Jsonnet, PrometheusRule CRD, OpenSLO YAML, alert SLO burn-rate), meta-observability (sức khỏe tự thân pipeline, lệch đồng hồ, guardrail cardinality, ma trận lưu giữ), bao phủ tín hiệu MELT+P (metrics, logs, traces, profiles, cost, audit, privacy), di chuyển khỏi công cụ đã ngừng hỗ trợ (Fluentd -> Fluent Bit hoặc OTel Collector).

**Khi nào KHÔNG sử dụng:** Observability LLM ops / gen_ai (dùng Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage pipeline dữ liệu (OpenLineage + Marquez, dbt test, Airflow lineage), telemetry tầng vật lý IoT / datacenter (Nlyte, Sunbird, Device42), điều phối chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), hạ tầng GPU / TPU (NVIDIA DCGM Exporter), chuỗi cung ứng phần mềm (sigstore, in-toto, SLSA), quy trình phản ứng sự cố / paging (PagerDuty, OpsGenie, Grafana OnCall), thiết lập một nhà cung cấp duy nhất đã được skill riêng của họ bao phủ.

**Quy tắc cốt lõi:**
- Phân loại ý định trước khi định tuyến: setup | migrate | investigate | alert | trace | tune | route
- Ưu tiên danh mục, không phải registry nhà cung cấp: ủy quyền cho skill thuộc sở hữu nhà cung cấp qua `resources/vendor-categories.md`; không trùng lặp tài liệu nhà cung cấp
- Tinh chỉnh transport là hào bảo vệ: ngưỡng UDP/MTU, chọn giao thức OTLP, topology Collector và công thức sampling là chiều sâu mà các skill khác không bao phủ
- Meta-observability không thể thương lượng: xác minh sức khỏe tự thân pipeline, đồng bộ đồng hồ (< 100 ms lệch), cardinality và lưu giữ trước khi tuyên bố thiết lập hoàn tất
- Ưu tiên CNCF-first: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd đã ngừng hỗ trợ (CNCF 2025-10): khuyến nghị Fluent Bit hoặc OTel Collector cho công việc mới và di chuyển
- W3C Trace Context làm propagator mặc định; chuyển đổi theo cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Quyền riêng tư trước tính năng: che PII, quy tắc baggage nhận biết sampling, audit bất biến SOC2/ISO + xóa theo GDPR/PIPA áp dụng tại điểm thu thập, không chỉ tại lưu trữ

**Tài nguyên:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, cùng tài nguyên chuyên sâu trong `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) và `resources/boundaries/` (cross-application, multi-tenant, release, slo).

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

**Công cụ code intelligence (Gortex hoặc Serena) sử dụng:**
- `find_symbol("functionName")` hoặc điều hướng symbol bằng Gortex: định vị hàm
- `find_referencing_symbols("Component")` hoặc phân tích tác động bằng Gortex: tìm tất cả nơi sử dụng
- `search_for_pattern("error pattern")` hoặc tìm kiếm bằng Gortex: tìm các vấn đề tương tự

**Tài nguyên:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

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

**Tài nguyên:** `translation-rubric.md`, `anti-ai-patterns.md` (cả hai đều trung lập về ngôn ngữ), cùng hồ sơ riêng cho từng ngôn ngữ đích trong `resources/lang/` (`ko`, `ja`, `zh`, `en`; dùng `_template.md` để thêm ngôn ngữ mới).

---

### oma-orchestration

**Lĩnh vực:** Điều phối đa agent tự động qua spawn CLI.

**Khi nào sử dụng:** Tính năng phức tạp cần nhiều agent song song, thực thi tự động, triển khai fullstack.

**Cấu hình mặc định:**

| Cài đặt | Mặc định | Mô tả |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Subagent đồng thời tối đa |
| MAX_RETRIES | 2 | Số lần thử lại mỗi task thất bại |
| POLL_INTERVAL | 30s | Khoảng kiểm tra trạng thái |

**Giai đoạn quy trình:** Plan -> Setup (session ID, khởi tạo bộ nhớ) -> Execute (spawn theo tier ưu tiên) -> Monitor (poll tiến trình) -> Verify (tự động + vòng lặp review chéo) -> Collect (tổng hợp kết quả).

**Vòng lặp review giữa agent:**
1. Tự review: agent kiểm tra diff của mình so với tiêu chí chấp nhận
2. Xác minh tự động: `oma verify agent {agent-type} --workspace {workspace}`
3. Review chéo: agent QA đánh giá thay đổi
4. Khi thất bại: vấn đề được phản hồi để sửa (tối đa 5 vòng lặp tổng)

**Bằng chứng phiên:** Ghi lại các sửa chữa đáng kể và các phát hiện review đã được phân xử khi hữu ích, kèm nguyên nhân, tác động và cách xác minh. Không áp dụng điểm phạt hay việc tạm dừng do điểm số kích hoạt.

**Tài nguyên:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Lĩnh vực:** Tạo commit Git theo Conventional Commits.

**Khi nào sử dụng:** Sau khi hoàn thành thay đổi mã, khi chạy `/scm`.

**Loại commit:** feat, fix, refactor, docs, test, chore, style, perf.

**Quy trình:** Phân tích thay đổi -> Tách theo tính năng (nếu > 5 file trải trên scope/type khác nhau) -> Xác định type -> Xác định scope -> Viết mô tả (mệnh lệnh, < 72 ký tự, chữ thường, không dấu chấm cuối) -> Thực thi commit ngay.

**Quy tắc:**
- Không bao giờ dùng `git add -A` hoặc `git add .`
- Không bao giờ commit file secret
- Luôn chỉ định file khi staging
- Dùng HEREDOC cho commit message nhiều dòng
- Co-Author: `scm.co_author`

---

### oma-coordination

**Lĩnh vực:** Hướng dẫn điều phối đa agent thủ công từng bước.

**Khi nào sử dụng:** Dự án phức tạp muốn kiểm soát con người ở mỗi cổng, hướng dẫn spawn agent thủ công, công thức điều phối từng bước.

**Khi nào KHÔNG sử dụng:** Thực thi song song tự động hoàn toàn (dùng oma-orchestration), task đơn lĩnh vực (dùng agent lĩnh vực trực tiếp).

**Quy tắc cốt lõi:**
- Luôn trình bày kế hoạch để người dùng xác nhận trước khi spawn agent
- Một tier ưu tiên mỗi lần — đợi hoàn thành trước khi tier tiếp theo
- Người dùng duyệt mỗi chuyển tiếp cổng
- Đánh giá QA bắt buộc trước khi merge
- Vòng lặp khắc phục vấn đề cho phát hiện CRITICAL/HIGH

**Quy trình:** PM lập kế hoạch -> Người dùng xác nhận -> Spawn theo tier ưu tiên -> Giám sát -> QA review -> Sửa vấn đề -> Phát hành.

**Khác biệt với oma-orchestration:** Coordination là thủ công và có hướng dẫn (người dùng kiểm soát nhịp độ), orchestrator là tự động (agent spawn và chạy với can thiệp tối thiểu từ người dùng).

---

### oma-search

**Lĩnh vực:** Bộ định tuyến tìm kiếm dựa trên ý định với chấm điểm độ tin cậy miền — chuyển truy vấn đến Context7 (tài liệu), tìm kiếm web native, `gh`/`glab` (mã), Serena (cục bộ).

**Khi nào sử dụng:** Tìm tài liệu chính thức của thư viện/framework, nghiên cứu web cho tutorial/ví dụ/so sánh/giải pháp, tìm kiếm mã GitHub/GitLab cho các mẫu triển khai, mọi truy vấn mà kênh tìm kiếm không rõ ràng (tự định tuyến), các skill khác cần hạ tầng tìm kiếm (gọi dùng chung).

**Khi nào KHÔNG sử dụng:** Khám phá mã chỉ cục bộ (dùng Serena MCP trực tiếp), phân tích lịch sử Git hoặc blame (dùng oma-scm), nghiên cứu kiến trúc đầy đủ (dùng oma-architecture, có thể gọi skill này nội bộ).

**Quy tắc cốt lõi:**
- Phân loại ý định trước khi tìm — mọi truy vấn đều đi qua IntentClassifier trước
- Một truy vấn, một tuyến tốt nhất — tránh đa tuyến dư thừa trừ khi ý định mơ hồ
- Chấm điểm độ tin cậy cho mỗi kết quả — mọi kết quả không cục bộ đều nhận nhãn độ tin cậy miền từ registry
- Flag ghi đè classifier: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: nếu tuyến chính thất bại, rút lui nhẹ nhàng (docs→web, web→chiến lược `oma search fetch`)
- Không cần MCP bổ sung: Context7 cho tài liệu, runtime-native cho web, CLI cho mã, Serena cho cục bộ
- Tìm kiếm web trung lập với nhà cung cấp: dùng bất kỳ runtime hiện tại cung cấp (WebSearch, Google, Bing)
- Chỉ độ tin cậy ở cấp miền — không chấm điểm ở cấp sub-path hoặc trang

**Tài nguyên:** `SKILL.md`, thư mục `resources/` với classifier ý định, định nghĩa tuyến và registry độ tin cậy.

---

### oma-recap

**Lĩnh vực:** Phân tích lịch sử hội thoại qua nhiều công cụ AI (Claude, Codex, Qwen, Cursor) với tóm tắt công việc theo chủ đề hàng ngày/theo kỳ.

**Khi nào sử dụng:** Tóm tắt một ngày hoặc kỳ hoạt động làm việc, hiểu luồng công việc qua nhiều công cụ AI, phân tích mẫu chuyển đổi công cụ giữa các phiên, chuẩn bị standup hàng ngày / retro hàng tuần / nhật ký công việc.

**Khi nào KHÔNG sử dụng:** Hồi tưởng thay đổi mã dựa trên commit Git (dùng `oma retro`), giám sát agent theo thời gian thực (dùng `oma dashboard terminal`), chỉ số năng suất (dùng `oma stats get`).

**Quy trình:**
1. Giải quyết ngày hoặc cửa sổ thời gian từ đầu vào ngôn ngữ tự nhiên (today, yesterday, last Monday, ngày rõ ràng)
2. Lấy dữ liệu hội thoại qua `oma recap --date YYYY-MM-DD` hoặc `--since` / `--until`
3. Nhóm theo công cụ và phiên
4. Trích xuất chủ đề (tính năng đã làm, lỗi đã sửa, công cụ đã khám phá)
5. Render tóm tắt theo chủ đề hàng ngày/theo kỳ

**Tài nguyên:** `SKILL.md` — giao công việc nặng cho CLI `oma recap`.

---

### oma-hwp

**Lĩnh vực:** Chuyển đổi HWP / HWPX / HWPML (trình xử lý văn bản Hàn Quốc) → Markdown bằng `kordoc`.

**Khi nào sử dụng:** Chuyển đổi tài liệu HWP Hàn Quốc (`.hwp`, `.hwpx`, `.hwpml`) sang Markdown, chuẩn bị tài liệu chính phủ/doanh nghiệp Hàn Quốc cho ngữ cảnh LLM hoặc RAG, trích xuất nội dung có cấu trúc (bảng, tiêu đề, danh sách, hình ảnh, chú thích, hyperlink) từ HWP.

**Khi nào KHÔNG sử dụng:** File PDF (dùng oma-pdf), XLSX/DOCX (ngoài phạm vi), tạo/chỉnh sửa HWP (ngoài phạm vi), file đã là văn bản (dùng công cụ Read trực tiếp).

**Quy tắc cốt lõi:**
- Sử dụng `bunx kordoc@latest` để chạy — không cần cài đặt; luôn truyền `@latest` hoặc phiên bản cố định
- Định dạng đầu ra mặc định là Markdown
- Nếu không chỉ định thư mục đầu ra, kết quả xuất ra cùng thư mục với đầu vào
- kordoc xử lý bảo toàn cấu trúc (tiêu đề, bảng, bảng lồng nhau, chú thích, hyperlink, hình ảnh)
- Phòng vệ bảo mật (ZIP bomb, XXE, SSRF, XSS) do kordoc cung cấp — đừng thêm tự chế
- Với HWP được mã hóa hoặc khóa DRM, báo cáo rõ hạn chế cho người dùng
- Hậu xử lý với `resources/flatten-tables.ts` để chuyển khối HTML `<table>` thành bảng pipe GFM và loại bỏ ký tự Private Use Area của font Hancom

**Tài nguyên:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Lĩnh vực:** Chuyển đổi PDF sang Markdown bằng `opendataloader-pdf`.

**Khi nào sử dụng:** Chuyển đổi tài liệu PDF sang Markdown cho ngữ cảnh LLM hoặc RAG, trích xuất nội dung có cấu trúc (bảng, tiêu đề, danh sách) từ PDF, chuẩn bị dữ liệu PDF để AI tiêu thụ.

**Khi nào KHÔNG sử dụng:** Tạo/sinh PDF (dùng công cụ tài liệu phù hợp), chỉnh sửa PDF đã có (ngoài phạm vi), đọc đơn giản file đã là văn bản (dùng công cụ Read trực tiếp).

**Quy tắc cốt lõi:**
- Sử dụng `uvx opendataloader-pdf` để chạy — không cần cài đặt
- Định dạng đầu ra mặc định là Markdown
- Nếu không chỉ định thư mục đầu ra, kết quả xuất ra cùng thư mục với PDF đầu vào
- Bảo toàn cấu trúc tài liệu (tiêu đề, bảng, danh sách, hình ảnh)
- Với PDF quét, dùng chế độ lai có OCR
- Luôn chạy `uvx mdformat` trên đầu ra để chuẩn hóa định dạng Markdown
- Xác thực Markdown đầu ra có thể đọc và có cấu trúc tốt
- Báo cáo mọi vấn đề chuyển đổi (bảng thiếu, văn bản lỗi) cho người dùng

**Tài nguyên:** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**Lĩnh vực:** Soạn thảo, chỉnh sửa và audit văn phong học thuật tiếng Anh chuẩn xuất bản cho bài luận, báo cáo, phần phân tích, tóm tắt điều hành, kết luận và tổng quan tài liệu.

**Khi nào sử dụng:** Soạn hoặc chỉnh sửa báo cáo/bài luận học thuật, viết tóm tắt điều hành, kết luận hoặc tổng quan tài liệu, viết lại văn phong nghe như AI thành tiếng Anh học thuật tự nhiên, đánh bóng bản nháp theo tiêu chí hạng cao (HD, A, top-band), rà soát độ đa dạng câu, chất lượng động từ, hedging và tuân thủ anti-AI.

**Khi nào KHÔNG sử dụng:** Dịch thuật (dùng oma-translation), tìm nguồn hoặc thu thập trích dẫn (dùng oma-scholar), phân tích rubric và chia task (dùng oma-pm), văn bản tài liệu mã/API (dùng skill lĩnh vực tương ứng), copy không trang trọng hoặc marketing, viết học thuật không phải tiếng Anh (soạn bằng tiếng Anh rồi chuyển cho oma-translation).

**Chế độ:** `draft` (heading + prose + Writing Notes + Claim-Evidence Map), `revise` (bản gốc + bản sửa + danh sách thay đổi), `review` (báo cáo tuân thủ PASS/FAIL về cấu trúc câu, chất lượng động từ, anti-AI, tính cụ thể, hedging, độ rõ đoạn, nhịp điệu và liên kết claim-evidence).

**Quy tắc cốt lõi:**
- Quote-before-judgment: trích dẫn nguyên văn ràng buộc/rubric trước khi áp dụng quy tắc
- Mọi câu phải kiểm chứng được; không bịa dữ liệu, thống kê hoặc trích dẫn
- Động từ chung bị cấm (`show`, `have`, `make`, `do`, `get`, `use`, …) không được làm động từ chính
- Đa dạng kiểu câu, độ dài và cách mở câu; không để 3 câu cùng kiểu liên tiếp
- Mức độ hedge phải khớp độ mạnh của bằng chứng; không dùng ngôi thứ nhất `I think`/`I believe`
- Mỗi claim ánh xạ tới bằng chứng trong Claim-Evidence Map; làm yếu hoặc bỏ claim không có bằng chứng

**Quy trình:** 6 bước: đọc rubric/bản nháp và trích dẫn ràng buộc, lập kế hoạch đoạn theo Topic-Support-Conclude, DRAFT theo cả bốn protocol, AUDIT theo checklist anti-AI, REVERSE-OUTLINE và lập Claim-Evidence Map, POLISH bằng đọc thành tiếng, kiểm tra liên kết, tính cụ thể, số từ và nhịp điệu.

**Tài nguyên:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md` và `context-loading`, `quality-principles` dùng chung.

---

### oma-deepsec

**Lĩnh vực:** Điều khiển trình quét lỗ hổng `deepsec` có agent của Vercel từ đầu đến cuối, an toàn và có ý thức chi phí trong repository đích.

**Khi nào sử dụng:** Cài deepsec lần đầu trong repo (`init`, ghi `INFO.md`, scan hiệu chỉnh), chạy scan toàn bộ hoặc theo phạm vi và xử lý phát hiện, thiết lập cổng CI theo PR bằng `process --diff`, viết matcher riêng cho dự án, phân loại backlog phát hiện (nhóm severity, cắt FP bằng `revalidate`, export), chẩn đoán lỗi deepsec.

**Khi nào KHÔNG sử dụng:** Review OWASP/lint chung không dùng deepsec (dùng oma-qa), advisory CVE/phụ thuộc chung (dùng oma-qa hoặc oma-search), thiết kế pipeline SAST không dùng deepsec (dùng oma-architecture), viết/audit code ứng dụng (chuyển đến oma-backend/frontend/mobile), hardening cloud/IAM/Terraform (dùng oma-tf-infra), suy luận cách sửa finding trong code sản phẩm (dùng oma-debug sau khi deepsec tạo finding).

**Quy tắc cốt lõi:**
- Không chạy `process` không giới hạn trên repo chưa đo kích thước; nếu chưa biết số file hoặc lớn hơn 500, trước tiên hiệu chỉnh bằng `--limit 50 --concurrency 5`
- Nêu chi phí và điều kiện dừng trước mọi AI pass (khoảng $25-60 cho 100 file, tối đa $500-1,200 cho 2.000 file, dao động ×2-3)
- Resume, không reset: sau gián đoạn quota/network/Ctrl-C, chạy lại cùng lệnh; không xóa `data/<id>/` để bắt đầu sạch
- Giữ `INFO.md` ngắn và riêng cho dự án (50-100 dòng, 3-5 ví dụ mỗi phần)
- Với cổng PR/CI, dùng mẫu hai job; không cấp `pull-requests: write` cho job chạy code do PR kiểm soát; pin action bằng SHA đầy đủ trong production
- Hỏi lựa chọn agent (`codex`/`gpt-5.5` hay `claude`/`claude-opus-4-8`) trước lần gọi có tính phí đầu tiên; không echo hoặc commit credential

**Quy trình:** PREPARE (ý định, root repo, credential, ngân sách, ngưỡng severity, agent) → ACQUIRE (config, `INFO.md`, lịch sử chạy, tín hiệu repo) → REASON (chọn pass nhỏ nhất đủ dùng) → ACT (chạy trong `.deepsec/`) → VERIFY (`status`, `RunMeta`, exit code) → FINALIZE (finding theo severity/verdict, chi phí dollar và follow-up).

**Tài nguyên:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Lĩnh vực:** Phát hiện drift tài liệu: xác minh tham chiếu `docs/**/*.md` với codebase hiện tại ở chế độ verify và đề xuất patch cho tài liệu bị ảnh hưởng bởi diff ở chế độ sync.

**Khi nào sử dụng:** Sau refactor/đổi tên/xóa file để tìm tham chiếu cũ, trước release để xác nhận command CLI, path file và config key, sau diff Git lớn để tìm tài liệu tham chiếu file đã đổi, hoặc kiểm tra drift định kỳ trên repo nhiều tài liệu.

**Khi nào KHÔNG sử dụng:** Tạo tài liệu từ đầu cho tính năng chưa được mô tả, dịch tài liệu đa ngôn ngữ (dùng oma-translation), drift ở mức symbol, enforcement chặn CI (v1 chỉ cảnh báo).

**Quy tắc cốt lõi:**
- Không sửa `.agents/` (bảo vệ SSOT) ở bất kỳ chế độ nào
- Không tự động áp dụng patch sync; sync luôn tương tác và cần xác nhận `[y]`
- Khi LLM không khả dụng, verify hạ cấp an toàn về JSON thô, sync chỉ trả candidate list
- File chứa secret (`.env*`, `*.pem`, `*.key`, `id_rsa*`, file bị gitignore) không bao giờ xuất hiện trong output sync
- CLI không gọi API LLM trực tiếp: nó xuất dữ liệu có cấu trúc, host LLM tổng hợp và soạn patch, không phụ thuộc vendor
- Việc kiểm tra link URL do `lychee` đảm nhiệm; hook chỉ cảnh báo ở v1 và không chặn hoàn tất workflow

**Quy trình:** verify: extract → resolve → report (CLI quyết định, exit 0 khi sạch / 1 khi có broken). sync: git diff → reverse lookup → danh sách candidate → đề xuất patch của host LLM → chấp nhận/từ chối tương tác → tạo lại `doc-refs.json`.

**Tài nguyên:** Chỉ dùng tài nguyên dùng chung; triển khai trong `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Lĩnh vực:** Explainer tương tác cho thay đổi mã.

**Khi nào sử dụng:** Giải thích diff, pull request, branch hoặc commit range cho người cần background, trực giác, walkthrough code và quiz ngắn trong một artifact HTML chạy ngoại tuyến.

**Quy trình:** Đọc thay đổi được yêu cầu, tạo explainer HTML tự chứa với các phần Background / Intuition / Code / Quiz, xác thực artifact và ghi vào `.agents/results/explain/`.

**Khi nào KHÔNG sử dụng:** Trang tài liệu thông thường, triển khai feature trực tiếp hoặc slide deck (dùng `oma-slide` cho presentation).

**Tài nguyên:** Dùng resource execution và quality chung cùng xác thực artifact của workflow `/explain`.

---

### oma-image

**Lĩnh vực:** Tạo ảnh AI đa vendor với điều phối song song nhận biết authentication: Codex `gpt-image-2`, model Gemini-family “nano-banana” của Antigravity qua `agy` với model cụ thể được chọn bên trong, và Pollinations flux/zimage.

**Khi nào sử dụng:** Tạo ảnh, asset trực quan, minh họa, ảnh sản phẩm, concept art hoặc mockup; so sánh output giữa nhiều model ảnh cho cùng prompt; tạo ảnh từ prompt trong workflow editor.

**Khi nào KHÔNG sử dụng:** Chỉnh sửa ảnh có sẵn hoặc xử lý ảnh, tạo video/audio (dùng oma-video / oma-voice), dựng vector/SVG inline từ dữ liệu có cấu trúc, resize hoặc chuyển định dạng asset đơn giản.

**Quy tắc cốt lõi:**
- Làm rõ trước khi gọi: nếu subject/style/composition/usage mơ hồ, hãy hỏi hoặc khuếch đại prompt và cho người dùng xem phiên bản mở rộng
- Điều phối theo authentication: chỉ chạy vendor đã xác thực; với `--vendor all`, mọi vendor được yêu cầu phải khả dụng
- Chốt chi phí: xác nhận trước run có chi phí ước tính ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` bỏ qua); `pollinations` và `antigravity` mặc định miễn phí
- An toàn path: output ngoài `$PWD` cần `--allow-external-output`; `n` tối đa = 5
- Output có ghi nhận: mọi run ghi `manifest.json` cạnh ảnh với prompt, vendor/model, input và metadata artifact; đây là dữ liệu tái lập, không hứa pixel giống hệt
- Tự chuyển tiếp ảnh tham chiếu đính kèm qua `--reference <path>` (codex/antigravity)

**Quy trình:** PREPARE (làm rõ/khuếch đại prompt, chọn vendor) → ACQUIRE (xác thực auth, reference, output path) → ACT (`oma image generate`) → VERIFY (manifest, file, exit code) → FINALIZE (path output và cảnh báo).

**Tài nguyên:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, cùng `config/image-config.yaml`.

---

### oma-market

**Lĩnh vực:** Nghiên cứu thị trường từ tín hiệu cộng đồng: trích xuất pain point, phát hiện xu hướng, định vị đối thủ và discovery. Research chạy trên engine upstream [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web và nhiều nguồn khác), được oma tự động giữ ở bản phát hành mới nhất.

**Khi nào sử dụng:** Trích xuất pain point thực từ bài đăng cộng đồng, phát hiện xu hướng theo cửa sổ 7/30/90/180 ngày, phân tích cảm nhận đối thủ và định vị SWOT / Porter 5F, discovery mở (`--discover`), nghiên cứu người/công ty/ticker, tín hiệu tuyển dụng và drill follow-up.

**Khi nào KHÔNG sử dụng:** Nghiên cứu web chung không có khung thị trường (dùng oma-search), tài liệu học thuật (dùng oma-scholar), dashboard trực tiếp hoặc giám sát theo lịch (bọc skill này bằng `oma schedule <action>`).

**Quy tắc cốt lõi:**
- detect-trap trước: không chạy engine nếu chưa preflight (`--force` chỉ sau khi người dùng xác nhận lại rõ ràng)
- Một engine, luôn bản mới nhất: `oma market resolve` refresh bản quản lý (`~/.cache/oma-market/last30days/<tag>/`) trước khi dùng; bản cài của người dùng chỉ là fallback khi offline không có cache
- Tuân thủ nguyên văn `SKILL.md` của engine đã resolve; thay thế duy nhất là dùng `oma market run <args>` thay cho lệnh raw `python3 scripts/last30days.py`
- Không chỉ WebSearch: không có engine, Python 3.12+ hoặc exit khác 0 thì dừng và báo cáo
- Chỉ bật keyed sources qua setup wizard upstream với consent; source bị bỏ qua vẫn hiện ở footer
- Framework chỉ trích dẫn cluster của engine; badge dòng đầu và upstream LAWs phải được kiểm tra trước khi ghi file
- Mỗi run chỉ một brief tại `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; framework tự bật theo intent (pain/trend → SWOT, competitor → SWOT + Porter 5F, discovery → SWOT + PESTEL)

**Quy trình:** detect-trap → `oma market resolve` → đọc SKILL.md upstream → bước pre-research upstream (setup wizard, phân giải handle/subreddit, kế hoạch query) → `oma market run … --emit=compact` → tổng hợp theo OUTPUT CONTRACT upstream → thêm framework → tự kiểm tra → ghi file.

**Tài nguyên:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md`, cùng `frameworks/` (swot, porters-5f, pestel). CLI: `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Lĩnh vực:** Tái cấu trúc bảo toàn hành vi: tái tổ chức tăng dần an toàn với định vị code smell / SATD / hotspot, safety net bằng characterization test và commit chỉ refactor.

**Khi nào sử dụng:** Tái cấu trúc trên file/module cụ thể (extract, move, rename, decompose, căn chỉnh idiom), refactor chuẩn bị trước feature, cứu code legacy/brownfield (khám phá seam + characterization test), chọn mục tiêu theo hotspot (churn × complexity), audit xem code đã an toàn để refactor chưa.

**Khi nào KHÔNG sử dụng:** Sửa bug hoặc hành vi thất bại (dùng oma-debug; refactor không được đổi hành vi), audit bảo mật/hiệu suất/accessibility (dùng oma-qa), thiết kế hệ thống/ranh giới module/ADR (dùng oma-architecture), thiết kế hoặc cơ chế migration schema DB (dùng oma-db), chia commit/staging (dùng oma-scm), tối ưu hiệu suất là mục tiêu chính.

**Quy tắc cốt lõi:**
- Bảo toàn hành vi: consumer contract (nhận biết Hyrum) là bất khả xâm phạm; tuning chỉ là hệ quả, không phải mục tiêu
- Có thể kiểm chứng: không tái cấu trúc khi thiếu net; nếu safety net thiếu/yếu, trước tiên viết characterization (golden-master) test trong commit riêng
- Tăng dần: mỗi commit một transformation có tên; thất bại lặp lại thì dùng Mikado (ghi prerequisite, revert đầy đủ, đệ quy)
- Tách biệt (hai vai): không trộn thay đổi hành vi vào commit refactor (`refactor:`-typed only)
- Kinh tế: khả năng đọc là mục tiêu chính; không refactor code sắp xóa hoặc code lạnh ít churn
- Lệch convention cần route ADR của oma-architecture, không sửa cục bộ; mọi metric chỉ là proxy (Goodhart)

**Quy trình:** PREPARE (phân loại green/brownfield, gate kích thước, xếp hạng hotspot) → ACQUIRE (đọc code bằng symbol tool, thu metric + tín hiệu git) → REASON (lập chuỗi transformation nguyên tử / expand-contract) → ACT (một transformation engine-first) → VERIFY (chạy lại test không đổi rồi commit, hoặc Mikado revert) → FINALIZE (delta metric + kết luận khả năng đọc).

**Tài nguyên:** `definition.md`, `measurement.md`, `governance.md`, cùng `context-loading`, `quality-principles` dùng chung.

---

### oma-scholar

**Lĩnh vực:** Trợ lý nghiên cứu học thuật dùng spec sidecar Knows `.knows.yaml`: tạo, xác thực, review, truy vấn và so sánh sidecar bài báo có cấu trúc, cùng fetch từ knows.academy.

**Khi nào sử dụng:** Đọc paper tiết kiệm token qua sidecar (~700 token chỉ claim so với ~10K PDF đầy đủ), tạo `.knows.yaml` từ bản nháp/LaTeX/ghi chú, xác thực cấu trúc sidecar trước khi chia sẻ, tạo peer review dưới dạng sidecar, truy vấn hoặc tóm tắt sidecar có sẵn, so sánh cấu trúc hai paper, tìm kiếm/fetch từ knows.academy.

**Khi nào KHÔNG sử dụng:** Tìm web chung hoặc nội dung không học thuật (dùng oma-search), dịch paper (dùng oma-translation), chỉ phân tích PDF không có sidecar (dùng oma-pdf), workflow peer review đầy đủ có hệ thống editor.

**Chế độ:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Quy tắc cốt lõi:**
- Spec đích là profile v0.9.0 / `paper@1`; host LLM tạo sidecar, không shell out tới external LLM SDK
- Chống bịa: nếu DOI/venue/year không hiển thị trong nguồn, bỏ hẳn key; không viết `doi: TODO` hoặc đoán
- Tên field chính xác, một object `provenance.actor`, enum đóng, số không đặt trong quote
- Mật độ relation ≥ 1.5 trên mỗi statement; mọi claim cần evidence `supported_by`
- Xác thực trước khi chia sẻ bằng `oma scholar lint`; dùng `--lenient` cho sidecar bên thứ ba
- knows.academy → fallback OpenAlex cho paper cũ/không phải 2026; proxy API công khai không cần auth

**Quy trình:** PREPARE (mode + source) → ACQUIRE (metadata, section hoặc text cục bộ) → REASON (trích claim/evidence/relation) → ACT (generate/lint/review/analyze/compare/fetch) → VERIFY (schema, enum, ID, relation) → FINALIZE (sidecar/report/summary cùng caveat).

**Tài nguyên:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md`, cùng `config/scholar-config.yaml`.

---

### oma-skill-creation

**Lĩnh vực:** Soạn và xác thực skill OMA theo định dạng Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Khi nào sử dụng:** Tạo skill mới trong `.agents/skills/{name}/SKILL.md`, cập nhật skill sang định dạng SSL-lite, thêm canonical command/workflow path cho skill nhiều thao tác, audit xem skill đủ chi tiết về định tuyến/thực thi/xác thực/khôi phục chưa, quyết định ví dụ nên nằm inline hay trong `resources/`.

**Khi nào KHÔNG sử dụng:** Cài skill bên thứ ba vào `$CODEX_HOME/skills` (bên ngoài), tạo plugin bundle Codex (bên ngoài), viết plan dự án chung không liên quan soạn skill (dùng oma-pm), sửa trực tiếp code sản phẩm/hạ tầng/frontend/backend/mobile (dùng skill chuyên gia tương ứng).

**Quy tắc cốt lõi:**
- Giữ chính xác bốn section cấp cao: Scheduling, Structural Flow, Logical Operations, References
- Giữ YAML frontmatter có `name` và `description` rõ ràng; chạy `oma skill audit` sau khi sửa description (cảnh báo ≥ 60%, fail ≥ 75% TF-IDF cosine collision)
- Có ranh giới `When NOT to use` cụ thể và route chéo đến skill liền kề
- Thêm đúng một canonical path inline (`Canonical command path` cho lệnh mong manh/lặp lại, `Canonical workflow path` cho flow nghiên cứu/phán đoán)
- Đưa chi tiết dài theo variant vào `resources/`, không đặt trong body chính; không tạo README/changelog/install docs trong skill

**Quy trình:** PREPARE (mục đích, trigger, ranh giới, I/O, dependency) → ACQUIRE (đọc 1-3 skill tương tự + convention) → REASON (inline hay `resources/`) → ACT (soạn theo template SSL-lite) → VERIFY (kiểm tra structural/routing/execution/formatting) → FINALIZE (file thay đổi + report xác thực).

**Tài nguyên:** `ssl-lite-template.md`, `validation-checklist.md`, cùng `context-loading`, `quality-principles` dùng chung.

---

### oma-slide

**Lĩnh vực:** Tạo deck HTML giàu animation trên stage cố định 1920×1080, validate/bundle/export xác định bằng CLI `oma slide` sang PDF/PNG/PPTX.

**Khi nào sử dụng:** Tạo presentation mới từ topic hoặc outline, nâng cấp hoặc định dạng lại deck có sẵn, tạo HTML theo slide với animation và design-doctrine, export deck sang PDF/PNG/PPTX, áp dụng style preset, export hoặc import từ Canva.

**Khi nào KHÔNG sử dụng:** Tạo tài liệu thường không có slide, chỉ tạo ảnh (dùng oma-image), định nghĩa brand/design system (dùng oma-design), vận hành CLI xác định (validate/bundle/export) không có generation (gọi trực tiếp CLI `oma slide`).

**Quy tắc cốt lõi:**
- Skill soạn HTML; CLI xử lý phần còn lại (scaffold, validate, bundle, export)
- Chỉ dùng asset cục bộ: không dùng URL từ xa trong `<img src>`/`<video src>`, chỉ `./assets/<file>`
- CJK cần font Pretendard trên mọi slide tiếng Hàn/Nhật/Trung
- Wrapper `prefers-reduced-motion`, focus state hiển thị và `data-om-validate` bắt buộc trên mỗi slide
- Tối đa 3 vòng auto-fix khi validate, sau đó đưa diff cho người dùng
- Ủy quyền tạo ảnh cho oma-image; Canva MCP tùy chọn và chỉ tự cấp khi người dùng đồng ý rõ ràng

**Quy trình:** 7 giai đoạn: DETECT (mode), DISCOVER (làm rõ + đánh giá asset), STYLE (3 preview trực tiếp → người dùng chọn), GENERATE (`slide-NN.html` ở 1920×1080), VALIDATE (`oma slide validate`, tối đa 3 vòng auto-fix), REVIEW (viewer + bbox editor tùy chọn), DELIVER (`bundle` + export PDF/PNG/PPTX tùy chọn).

**Tài nguyên:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md`, cùng thư mục `assets/`.

---

### oma-video

**Lĩnh vực:** Tạo video short, explainer và demo có người điều khiển qua CLI `oma video`, ghép script → narration → visuals → captions → render HyperFrames.

**Khi nào sử dụng:** Tạo video short (shorts/reels, 9:16) từ topic, explainer (16:9/9:16) từ README/code/data, demo/walkthrough từ screen capture (`--source file`) hoặc capture web app có browser headed và người giám sát với bất kỳ URL nào (`--source web`), render lại run có sẵn một cách xác định.

**Khi nào KHÔNG sử dụng:** Tạo ảnh tĩnh đơn (dùng oma-image), tạo slide deck (dùng oma-slide; video gọi nội bộ để tạo frame explainer), chỉ tạo speech audio (dùng oma-voice), biên tập phi tuyến mp4 đã hoàn thiện, livestream (capture web có giám sát vẫn thuộc phạm vi).

**Quy tắc cốt lõi:**
- Làm rõ hoặc suy ra mode trước khi gọi; cho người dùng xem plan suy ra, không âm thầm render brief mơ hồ
- Cấu hình provider có thể không cần key cho fallback asset được hỗ trợ; provider có phí (Pexels, Pixelle) chỉ tự bật khi env key tồn tại, nhưng compositor failure không bao giờ được thay bằng fallback video
- Chốt chi phí ở mức ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` bỏ qua); giới hạn duration 180s / 40 scene
- Input render được ghi trong `render-spec.json`, asset, seed và Pretendard nhúng; `OMA_VIDEO_MOCK=1` là test harness cho golden fixture, không phải output bàn giao
- Demo có người trong vòng lặp: capture web chỉ mở browser headed và ghi khi người điều khiển thao tác, không tự động credential; `--url` và token được che trong log/manifest
- An toàn path (`--allow-external-output` cho output ngoài `$PWD`)

**Quy trình:** PREPARE (mode/aspect/locale, làm rõ/khuếch đại brief) → ACQUIRE (thăm dò availability provider, xác thực capture path, kiểm tra chi phí) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schema, hash manifest, exit code, mp4) → FINALIZE (run-dir + path mp4 + cảnh báo coverage).

**Tài nguyên:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, cùng các hướng dẫn mode `hyperframes-authoring/`, driver web-capture và compositor fallback `mpt/`; `config/video-config.yaml`.

---

### oma-voice

**Lĩnh vực:** Text-to-speech và speech-to-text local-first qua Voicebox MCP, hoàn toàn trên thiết bị, không cloud, không API key và không phí mỗi lần gọi.

**Khi nào sử dụng:** Tạo audio notification ngắn khi agent hoàn tất task hoặc bị chặn, tạo voiceover/narration/audio asset (mp3 hoặc wav), transcribe file audio cục bộ (mp3, wav, m4a, webm, flac) thành Markdown, so sánh voice profile bằng cách chạy lại cùng text với các profile id khác nhau.

**Khi nào KHÔNG sử dụng:** Cloud TTS hoặc voice đa ngôn ngữ fidelity cao, dictation microphone terminal thời gian thực (dùng hotkey dictation của Voicebox), upload sample voice cloning/tạo profile (làm trong UI desktop Voicebox), video/music/sound design.

**Quy tắc cốt lõi:**
- Cần Voicebox: nếu handshake hoặc `GET /health` thất bại, thoát với gợi ý cài/khởi chạy một lần; không retry hoặc tự khởi chạy lại
- Cần profile: nếu `voicebox_list_profiles` rỗng, hướng người dùng đến UI app rồi thoát
- Giới hạn độ dài: TTS tối đa 5000 ký tự mỗi lần gọi (cảnh báo ở 2000), STT 30 phút; v1 không tự chunk
- Minh bạch khi tự gọi: notification chỉ chạy khi task vượt `auto_notify_after_sec` (mặc định 60s); luôn thông báo ý định một dòng
- An toàn path (cảnh báo + xác nhận nếu output ngoài `$PWD`); SIGINT không ghi output dở dang
- Mỗi lần tạo phải có manifest; không có chốt chi phí vì Voicebox miễn phí

**Quy trình:** PREPARE (xác thực text/audio/language/path/profile) → ACQUIRE (hỏi một lần nếu thiếu tín hiệu) → ACT (MCP `voicebox_speak` hoặc `voicebox_transcribe`) → VERIFY (audio/transcript tồn tại + field manifest) → FINALIZE (ghi `manifest.json`, báo cáo path).

**Tài nguyên:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md`, cùng `config/voice-config.yaml`.

---

## Charter preflight (CHARTER_CHECK)

Trước khi viết bất kỳ mã nào, mọi agent triển khai phải xuất khối CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
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
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Workspace được chỉ định bằng flag `-w` khi spawn agent:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Luồng điều phối

Khi chạy workflow đa agent (`/orchestrate` hoặc `/work`):

1. **Agent PM** phân tách yêu cầu thành task theo lĩnh vực với ưu tiên (P0, P1, P2) và phụ thuộc
2. **Phiên được khởi tạo** — session ID được tạo, `orchestrator-session-{sessionId}.md` và `task-board-{sessionId}.md` được tạo trong bộ nhớ
3. **Task P0** được spawn song song (tối đa MAX_PARALLEL agent đồng thời)
4. **Tiến trình được giám sát** — orchestrator poll file `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` mỗi POLL_INTERVAL
5. **Task P1** được spawn sau khi P0 hoàn thành, v.v.
6. **Vòng lặp xác minh** chạy cho mỗi agent hoàn thành (tự review -> xác minh tự động -> review chéo bởi QA)
7. **Kết quả được thu thập** từ tất cả file `result-{agentId}-{taskId}-{runId}-{sessionId}.md`
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
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Các file này định nghĩa danh tính agent, tham chiếu quy trình thực thi, template CHARTER_CHECK, tóm tắt kiến trúc và quy tắc. Chúng được dùng khi spawn subagent qua Task/Agent tool (Claude Code) hoặc CLI.

**`.claude/agents/*.md`** — Định nghĩa subagent đặc thù IDE tham chiếu file `.agents/agents/` qua symlink hoặc bản sao trực tiếp cho tương thích Claude Code.

Các file projection theo vendor được làm mới bởi `oma link`, `oma install` và `oma update`.

---

## Trạng thái runtime (Serena memory)

Các vai trò dispatch chuẩn của runtime gồm `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` và `explore`.



Mặc định, agent đọc và ghi các file này bằng tool native (`Read`, `Write`, `Edit`); có thể cấu hình base path và tool tùy chỉnh trong `mcp.json`.


Trong phiên điều phối, agent phối hợp qua file bộ nhớ chia sẻ trong `.agents/state/memories/` (dự án cũ có thể fallback về `.serena/memories/`; có thể cấu hình qua `mcp.json`):

| File | Chủ sở hữu | Mục đích | Khác |
|------|-------|---------|--------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Session ID, trạng thái, thời gian bắt đầu, theo dõi giai đoạn | Chỉ đọc |
| `task-board-{sessionId}.md` | Orchestrator | Phân công task, ưu tiên, cập nhật trạng thái | Chỉ đọc |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Agent đó | Tiến trình từng lượt: hành động, file đọc/sửa, trạng thái hiện tại | Orchestrator đọc |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Agent đó | Kết quả cuối: trạng thái (completed/failed), tóm tắt, file thay đổi, checklist tiêu chí chấp nhận | Orchestrator đọc |
| `session-metrics.md` | Orchestrator | Bằng chứng phiên tùy chọn và kết quả thí nghiệm đã đo lường | QA đọc |
| `experiment-ledger.md` | Orchestrator/QA | Bằng chứng cho các thí nghiệm thực sự | Tất cả đọc |

Công cụ bộ nhớ có thể cấu hình. Mặc định dùng Serena MCP (`Read`, `Write`, `Edit`), nhưng công cụ tùy chỉnh có thể cấu hình trong `mcp.json`:

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Dashboard (`oma dashboard terminal` và `oma dashboard web`) theo dõi các file bộ nhớ này cho giám sát thời gian thực.
