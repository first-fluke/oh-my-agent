---
title: Giới thiệu
description: Tổng quan toàn diện về oh-my-agent — framework điều phối đa agent biến trợ lý lập trình AI thành đội ngũ kỹ sư chuyên biệt với 21 agent theo lĩnh vực, tải skill lũy tiến, và khả năng tương thích đa IDE.
---

# Giới thiệu

oh-my-agent là một framework điều phối đa agent dành cho các IDE và công cụ CLI hỗ trợ AI. Thay vì dựa vào một trợ lý AI duy nhất cho mọi thứ, oh-my-agent phân phối công việc cho 21 agent chuyên biệt — mỗi agent được mô phỏng theo một vai trò thực tế trong đội ngũ kỹ sư, có kiến thức tech stack riêng, quy trình thực thi, playbook xử lý lỗi và checklist chất lượng.

Toàn bộ hệ thống nằm trong thư mục `.agents/` di động bên trong dự án của bạn. Chuyển đổi giữa Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor hoặc bất kỳ công cụ được hỗ trợ nào — cấu hình agent di chuyển cùng mã nguồn.

---

## Mô hình đa agent

Các trợ lý lập trình AI truyền thống hoạt động theo kiểu đa năng. Chúng xử lý frontend, backend, database, bảo mật và hạ tầng với cùng ngữ cảnh prompt và cùng mức độ chuyên môn. Điều này dẫn đến:

- **Loãng ngữ cảnh** — tải kiến thức cho mọi lĩnh vực làm lãng phí cửa sổ ngữ cảnh
- **Chất lượng không đồng đều** — trợ lý đa năng không thể sánh với chuyên gia trong bất kỳ lĩnh vực nào
- **Thiếu phối hợp** — các tính năng phức tạp trải rộng nhiều lĩnh vực được xử lý tuần tự

oh-my-agent giải quyết vấn đề này bằng chuyên biệt hóa:

1. **Mỗi agent hiểu sâu một lĩnh vực.** Agent frontend biết React/Next.js, shadcn/ui, TailwindCSS v4, kiến trúc FSD-lite. Agent backend biết mẫu Repository-Service-Router, truy vấn tham số hóa, xác thực JWT. Chúng không chồng chéo nhau.

2. **Các agent chạy song song.** Trong khi agent backend xây dựng API, agent frontend đã bắt đầu tạo giao diện. Orchestrator điều phối thông qua bộ nhớ chia sẻ.

3. **Chất lượng được tích hợp sẵn.** Mọi agent đều có checklist và playbook xử lý lỗi theo lĩnh vực riêng. Charter Preflight phát hiện lệch phạm vi trước khi viết mã. Đánh giá QA là bước cốt lõi, không phải bước bổ sung sau cùng.

---

## Toàn bộ 21 agent

### Ý tưởng, kiến trúc và lập kế hoạch

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-brainstorm** | Khám phá ý tưởng ưu tiên thiết kế | Khám phá ý định người dùng, đề xuất 2-3 hướng tiếp cận với phân tích đánh đổi, tạo tài liệu thiết kế trước khi viết mã. Quy trình 6 giai đoạn: Context, Questions, Approaches, Design, Documentation, Chuyển sang `/plan`. |
| **oma-architecture** | Chuyên gia kiến trúc hệ thống | Ranh giới module/dịch vụ/sở hữu, phân tích đánh đổi, tổng hợp bên liên quan. Phương pháp luận: định tuyến chẩn đoán, so sánh design-twice, phân tích rủi ro kiểu ATAM, ưu tiên kiểu CBAM, ghi chép quyết định kiểu ADR. Mặc định ý thức chi phí. |
| **oma-pm** | Quản lý sản phẩm | Phân tách yêu cầu thành các task được ưu tiên với phụ thuộc. Định nghĩa API contract. Xuất `.agents/results/plan-{sessionId}.json` và `task-board.md`. Hỗ trợ khái niệm ISO 21500, khung rủi ro ISO 31000, quản trị ISO 38500. |

### Triển khai

| Agent | Vai trò | Tech stack và tài nguyên |
|-------|------|----------------------|
| **oma-frontend** | Chuyên gia UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, kiến trúc FSD-lite. Thư viện: luxon (ngày tháng), ahooks (hooks), es-toolkit (tiện ích), Jotai (state client), TanStack Query (state server), @tanstack/react-form + Zod (form), better-auth (xác thực), nuqs (state URL). Tài nguyên: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | Chuyên gia API và server | Kiến trúc sạch (Router-Service-Repository-Models). Không phụ thuộc stack — phát hiện Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET từ manifest dự án. Xác thực bằng JWT + bcrypt. Tài nguyên: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Hỗ trợ `/stack-set` để tạo tham chiếu `stack/` theo ngôn ngữ. |
| **oma-mobile** | Mobile đa nền tảng | Flutter, Dart, Riverpod/Bloc quản lý state, Dio với interceptors cho API, GoRouter điều hướng. Kiến trúc sạch: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Mục tiêu 60fps. Tài nguyên: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Kiến trúc database | Mô hình hóa SQL, NoSQL và vector database. Thiết kế schema (mặc định 3NF), chuẩn hóa, đánh index, transaction, quy hoạch dung lượng, chiến lược backup. Hỗ trợ thiết kế nhận biết ISO 27001/27002/22301. Tài nguyên: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Thiết kế

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-design** | Chuyên gia design system | Tạo DESIGN.md với token, typography, hệ thống màu sắc, thiết kế chuyển động (motion/react, GSAP, Three.js), bố cục ưu tiên responsive, tuân thủ WCAG 2.2. Quy trình 7 giai đoạn: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Áp dụng chống anti-pattern ("AI slop"). Tích hợp tùy chọn Stitch MCP. Tài nguyên: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, cùng thư mục `reference/` (hướng dẫn typography, màu sắc, không gian, chuyển động, responsive, component, accessibility và shader). |

### Hạ tầng, DevOps và Observability

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Terraform đa cloud (AWS, GCP, Azure, Oracle Cloud). Xác thực OIDC-first, IAM quyền tối thiểu, policy-as-code (OPA/Sentinel), tối ưu chi phí. Hỗ trợ điều khiển AI ISO/IEC 42001, liên tục ISO 22301, tài liệu kiến trúc ISO/IEC/IEEE 42010. Tài nguyên: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Tự động hóa task monorepo | mise task runner, pipeline CI/CD, database migration, phối hợp release, git hooks, xác nhận pre-commit. Tài nguyên: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Bộ định tuyến observability dựa trên ý định | Bao phủ tín hiệu MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), tinh chỉnh transport (UDP/MTU, OTLP gRPC vs HTTP, topology Collector, sampling), lan truyền W3C Trace Context, quản lý SLO và cảnh báo burn-rate, điều tra pháp y sự cố (định vị 6 chiều), meta-observability (tự chẩn đoán, đồng bộ đồng hồ, cardinality, retention). Ưu tiên CNCF; Fluentd đã ngừng phát triển (dùng Fluent Bit hoặc OTel Collector). |

### Chất lượng và gỡ lỗi

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-qa** | Đảm bảo chất lượng | Kiểm tra bảo mật (OWASP Top 10), phân tích hiệu suất, accessibility (WCAG 2.1 AA), đánh giá chất lượng mã. Mức độ: CRITICAL/HIGH/MEDIUM/LOW với file:line và mã khắc phục. Hỗ trợ đặc tính chất lượng ISO/IEC 25010 và tương thích kiểm thử ISO/IEC 29119. Tài nguyên: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Chẩn đoán và sửa lỗi | Phương pháp tái hiện trước. Phân tích nguyên nhân gốc, sửa tối thiểu, bắt buộc kiểm thử hồi quy, quét mẫu tương tự. Sử dụng Serena MCP để truy vết symbol. Tài nguyên: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Bản địa hóa, điều phối và Git

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-translator** | Dịch thuật nhận biết ngữ cảnh | Phương pháp dịch 4 bước: Phân tích nguồn, Trích xuất ý nghĩa, Tái tạo bằng ngôn ngữ đích, Xác minh. Bảo toàn giọng điệu, phong cách và thuật ngữ chuyên ngành. Phát hiện anti-pattern AI. Hỗ trợ dịch hàng loạt (file i18n). Chế độ tinh chỉnh 7 bước tùy chọn cho chất lượng xuất bản. Tài nguyên: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Điều phối đa agent tự động | Spawn subagent CLI song song, điều phối qua MCP memory, theo dõi tiến trình, chạy vòng lặp xác minh. Cấu hình: MAX_PARALLEL (mặc định 3), MAX_RETRIES (mặc định 2), POLL_INTERVAL (mặc định 30s). Bao gồm vòng lặp review giữa các agent và giám sát Clarification Debt. Tài nguyên: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Conventional Commits | Phân tích thay đổi, xác định type/scope, tách theo tính năng khi phù hợp, tạo commit message theo định dạng Conventional Commits. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

### Tìm kiếm, hồi tưởng và xử lý tài liệu

| Agent | Vai trò | Khả năng chính |
|-------|------|-----------------|
| **oma-search** | Bộ định tuyến tìm kiếm dựa trên ý định | Chuyển truy vấn đến Context7 (tài liệu), tìm kiếm web native, `gh`/`glab` (mã), Serena (cục bộ). Chấm điểm độ tin cậy miền trên mọi kết quả không cục bộ. Định tuyến fail-forward (docs→web→fetch). Flag: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Hồi tưởng công việc đa công cụ | Phân tích lịch sử hội thoại từ Claude, Codex, Gemini, Qwen và Cursor. Giải quyết đầu vào ngày/cửa sổ ngôn ngữ tự nhiên, nhóm theo công cụ+phiên, trích xuất chủ đề, render tóm tắt hàng ngày/theo kỳ cho standup, retro hàng tuần và nhật ký công việc. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Chuyển đổi tài liệu trình xử lý văn bản Hàn Quốc qua `bunx kordoc@latest`. Bảo toàn tiêu đề, bảng (kể cả bảng lồng), chú thích, hyperlink, hình ảnh. Loại bỏ ký tự Private Use Area của Hancom qua hậu xử lý `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Chuyển đổi tài liệu PDF qua `uvx opendataloader-pdf`. Bảo toàn tiêu đề, bảng, danh sách, hình ảnh; chế độ lai OCR cho PDF quét; đầu ra chuẩn hóa bằng `uvx mdformat`. |

---

## Mô hình tải lũy tiến

oh-my-agent sử dụng kiến trúc skill 2 tầng để tránh cạn kiệt cửa sổ ngữ cảnh:

**Layer 1 — SKILL.md (~800 byte, luôn được tải):**
Chứa danh tính agent, điều kiện định tuyến, quy tắc cốt lõi và hướng dẫn "khi nào sử dụng / khi nào KHÔNG sử dụng". Đây là tất cả những gì được tải khi agent không đang làm việc.

**Layer 2 — resources/ (tải theo nhu cầu):**
Chứa quy trình thực thi, tham chiếu tech stack, đoạn mã, playbook xử lý lỗi, checklist và ví dụ. Chỉ được tải khi agent được gọi cho một task, và ngay cả khi đó, chỉ tải các tài nguyên liên quan đến loại task cụ thể (dựa trên đánh giá độ khó và ánh xạ task-tài nguyên trong `context-loading.md`).

Thiết kế này tiết kiệm khoảng 75% token so với việc tải mọi thứ từ đầu. Đối với mô hình tầng flash (128K ngữ cảnh), tổng ngân sách tài nguyên khoảng 3.100 token — chỉ 2,4% cửa sổ ngữ cảnh.

---

## .agents/ — Nguồn dữ liệu duy nhất (SSOT)

Mọi thứ oh-my-agent cần đều nằm trong thư mục `.agents/`:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 22 thư mục skill (21 agent + _shared)
│   ├── _shared/            # Tài nguyên cốt lõi dùng chung cho tất cả agent
│   └── oma-{agent}/        # SKILL.md + resources/ theo từng agent
├── workflows/              # 16 định nghĩa workflow
├── agents/                 # 9 định nghĩa subagent
├── results/plan-{sessionId}.json               # Kết quả kế hoạch đã tạo
├── state/                  # File trạng thái workflow đang hoạt động
├── results/                # File kết quả agent
└── mcp.json                # Cấu hình MCP server
```

Thư mục `.claude/` chỉ tồn tại như tầng tích hợp IDE — chứa symlink trỏ về `.agents/`, cùng hook phát hiện từ khóa và thanh trạng thái HUD. Thư mục `.serena/memories/` lưu trữ trạng thái runtime trong các phiên điều phối.

Kiến trúc này có nghĩa là cấu hình agent:
- **Di động** — chuyển IDE mà không cần cấu hình lại
- **Quản lý phiên bản** — commit `.agents/` cùng mã nguồn
- **Chia sẻ được** — thành viên nhóm có cùng thiết lập agent

---

## IDE và công cụ CLI được hỗ trợ

oh-my-agent hoạt động với bất kỳ IDE hoặc CLI hỗ trợ AI nào có khả năng tải skill/prompt:

| Công cụ | Phương thức tích hợp | Agent song song |
|------|-------------------|----------------|
| **Claude Code** | Skill native + Agent tool | Task tool cho song song thực sự |
| **Gemini CLI** | Tự động tải skill từ `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Tự động tải skill | Yêu cầu song song qua mô hình trung gian |
| **Antigravity IDE** | Tự động tải skill | `oma agent:spawn` |
| **Cursor** | Skill qua tích hợp `.cursor/` | Spawn thủ công |
| **OpenCode** | Tải skill | Spawn thủ công |

Spawn agent tự động thích ứng với từng vendor thông qua giao thức phát hiện vendor, kiểm tra các marker đặc thù vendor (ví dụ: `Agent` tool cho Claude Code, `apply_patch` cho Codex CLI).

---

## Hệ thống định tuyến skill

Khi bạn gửi prompt, oh-my-agent xác định agent nào sẽ xử lý bằng bản đồ định tuyến skill (`.agents/skills/_shared/core/skill-routing.md`):

| Từ khóa lĩnh vực | Định tuyến đến |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

Đối với các yêu cầu phức tạp trải rộng nhiều lĩnh vực, định tuyến theo thứ tự thực thi đã thiết lập. Ví dụ, "Tạo ứng dụng fullstack" sẽ định tuyến đến: oma-pm (lập kế hoạch) rồi oma-backend + oma-frontend (triển khai song song) rồi oma-qa (đánh giá).

---

## Thanh trạng thái HUD

Khi chạy trong Claude Code, oh-my-agent hiển thị chỉ báo trạng thái liên tục `[OMA]` trên thanh trạng thái cho thấy:
- Tên mô hình (ví dụ: Opus, Sonnet)
- Mức sử dụng ngữ cảnh với mã màu (xanh < 70%, vàng 70-85%, đỏ > 85%)
- Trạng thái workflow đang hoạt động (nếu có workflow liên tục đang chạy)

HUD được vận hành bởi `.claude/hooks/hud.ts` sử dụng tính năng hook `statusLine` của Claude Code.

---

## Phát hiện workflow tự động

Bạn không cần gõ `/command` để kích hoạt workflow. Hook `UserPromptSubmit` của oh-my-agent quét đầu vào ngôn ngữ tự nhiên so với trigger từ khóa được định nghĩa trong `.claude/hooks/triggers.json` — hỗ trợ 11 ngôn ngữ (Tiếng Anh, Tiếng Hàn, Tiếng Nhật, Tiếng Trung, Tiếng Tây Ban Nha, Tiếng Pháp, Tiếng Đức, Tiếng Bồ Đào Nha, Tiếng Nga, Tiếng Hà Lan, Tiếng Ba Lan).

- **Đầu vào hành động** (ví dụ: "plan the auth feature") — tự động tải workflow
- **Đầu vào thông tin** (ví dụ: "what is orchestrate?") — được lọc bỏ, không trigger workflow
- **`/command` tường minh** — hook bỏ qua phát hiện để tránh trùng lặp
- **Workflow liên tục** đưa lại ngữ cảnh vào mỗi tin nhắn cho đến khi bạn nói "workflow done"

---

## Hỗ trợ đa vendor

oh-my-agent không giới hạn ở Claude Code. Hệ thống hook hỗ trợ:

| Vendor | Tích hợp |
|--------|------------|
| **Claude Code** | Hook native (`UserPromptSubmit`, `Notification`, statusLine) |
| **Gemini CLI** | Tự động tải skill từ `.agents/skills/`, spawn agent qua `oma agent:spawn` |
| **Codex CLI** | Tự động tải skill, yêu cầu song song qua mô hình trung gian |
| **Qwen Code** | Hỗ trợ hook cho phát hiện workflow |

Phát hiện vendor diễn ra tự động — agent thích ứng phương thức spawn dựa trên môi trường runtime được phát hiện.

---

## Tiếp theo

- **[Cài đặt](./installation.md)** — Ba phương pháp cài đặt, preset, thiết lập CLI và xác minh
- **[Agent](/docs/core-concepts/agents)** — Tìm hiểu sâu về 21 agent và Charter Preflight
- **[Skill](/docs/core-concepts/skills)** — Giải thích kiến trúc 2 tầng
- **[Workflow](/docs/core-concepts/workflows)** — 16 workflow với trigger và các giai đoạn
- **[Hướng dẫn sử dụng](/docs/guide/usage)** — Ví dụ thực tế từ task đơn đến điều phối toàn diện
