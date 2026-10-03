---
title: Skill
description: Hướng dẫn đầy đủ về kiến trúc hai tầng của 33 skill OMA, gồm định tuyến SKILL.md, tài nguyên tải theo nhu cầu, protocol dùng chung và có điều kiện, thực thi theo vendor, đo lường token và cơ chế định tuyến.
---

# Skill

Skill là các gói kiến thức có cấu trúc, cung cấp hướng dẫn theo lĩnh vực cho một vai trò dispatch. Mỗi gói chứa protocol thực thi, tham chiếu tech stack, mẫu mã, playbook lỗi, checklist chất lượng và ví dụ khi skill có cung cấp, được tổ chức theo kiến trúc hai tầng để tiết kiệm token.

---

## Thiết kế hai tầng

### Tầng 1: SKILL.md (tải khi skill được định tuyến)

Mỗi skill có tệp `SKILL.md` ở thư mục gốc. Tệp này đi vào cửa sổ ngữ cảnh khi skill được định tuyến, tức hook injector truyền một **tham chiếu đường dẫn** chứ không truyền nội dung, nên skill chưa được định tuyến không tốn gì ngoài trường `description`. Tệp chứa:

- **Frontmatter YAML** với `name` và `description` (dùng để định tuyến và hiển thị)
- **When to use / When NOT to use**: điều kiện kích hoạt rõ ràng
- **Quy tắc cốt lõi**: 5-15 ràng buộc quan trọng nhất của lĩnh vực
- **Tổng quan kiến trúc**: cách cấu trúc mã
- **Danh sách thư viện**: dependency được phê duyệt và mục đích của chúng
- **Tham chiếu**: con trỏ tới tài nguyên tầng 2, không tự động tải

Ví dụ frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Trường description rất quan trọng vì chứa các từ khóa định tuyến mà hệ thống định tuyến skill dùng để ghép task với agent.

### Tầng 2: resources/ (tải theo nhu cầu)

Thư mục `resources/` chứa kiến thức thực thi chuyên sâu. Các tệp này chỉ được tải khi:
1. Host hoặc workflow đã chọn skill, ví dụ qua native skill match hoặc lệnh tường minh
2. Task hiện tại đáp ứng điều kiện tải của tham chiếu

Việc tải theo nhu cầu được hướng dẫn bởi tài liệu context-loading (`.agents/skills/_shared/core/context-loading.md`), tài liệu này phân biệt chỉ dẫn entry với các tham chiếu do task chọn.

---

## Ví dụ cấu trúc file

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Loại tài nguyên theo skill

| Loại tài nguyên | Mẫu tên file | Mục đích | Khi tải |
|--------------|-----------------|---------|-------------|
| **Execution Protocol** | `execution-protocol.md` | Workflow từng bước: Analyze → Plan → Implement → Verify | Thao tác được chọn cần chi tiết về lệnh hoặc contract của nó |
| **Tech Stack** | `tech-stack.md` | Thông số công nghệ, phiên bản và cấu hình chi tiết | Framework được chọn hoặc quyết định về stack |
| **Error Playbook** | `error-playbook.md` | Quy trình phục hồi với cơ chế leo thang “3 lần thử” | Chỉ khi có lỗi |
| **Checklist** | `checklist.md` | Xác minh chất lượng theo lĩnh vực | Ở bước Verify |
| **Snippets** | `snippets.md` | Mẫu mã sẵn sàng copy-paste | Cách triển khai hoặc dạng đầu ra chưa quen thuộc |
| **Examples** | `examples.md` hoặc `examples/` | Ví dụ input/output few-shot cho LLM | Cách triển khai hoặc dạng đầu ra chưa quen thuộc |
| **Variants** | `variants/` | Tham chiếu theo ngôn ngữ/framework. Backend cung cấp seed `node`, `python`, `rust`; mobile cung cấp schema và có thể nhận tham chiếu nền tảng được tạo. | Khi có stack phù hợp |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Template file boilerplate | Khi tạo component |
| **Domain Reference** | `orm-reference.md`, `anti-patterns.md`, v.v. | Kiến thức lĩnh vực chuyên sâu cho subtask cụ thể | Theo loại task |

---

## Tài nguyên dùng chung (_shared/)

Mọi agent dùng chung nền tảng từ `.agents/skills/_shared/`. Các tài nguyên được chia thành ba nhóm:

### Tài nguyên cốt lõi (`.agents/skills/_shared/core/`)

| Tài nguyên | Mục đích | Khi tải |
|---------|---------|---------|
| **`skill-routing.md`** | Định tuyến theo kết quả task, quyền sở hữu và phụ thuộc thực tế; không có chuỗi agent bắt buộc hay hạn mức lượt. | Orchestrator và skill coordination tham chiếu |
| **`context-loading.md`** | Entry sở hữu, các tham chiếu có điều kiện và ranh giới tải ở runtime. | Khi soạn ngữ cảnh |
| **`prompt-structure.md`** | Hướng dẫn bàn giao task chưa quen thuộc bằng mục tiêu, ngữ cảnh, ràng buộc thực sự và bằng chứng nghiệm thu; không có template bắt buộc cho task trực tiếp. | Agent PM và mọi workflow tham chiếu |
| **`clarification-protocol.md`** | Giải quyết các chi tiết thường lệ từ ngữ cảnh và chỉ hỏi khi thiếu thông tin quan trọng hoặc cần được ủy quyền. | Khi yêu cầu chưa rõ |
| **`context-budget.md`** | Ước lượng kích thước file, đo prompt thực tế, đọc có phạm vi và checkpoint. | Task dài hoặc chẩn đoán overhead ngữ cảnh |
| **`difficulty-guide.md`** | Chọn độ sâu lập kế hoạch và sản phẩm bàn giao dựa trên phụ thuộc và nhu cầu xác minh. | Khi việc phân rã cần ước lượng độ khó |
| **`quality-principles.md`** | Hướng dẫn về phạm vi, khả năng bảo trì, bằng chứng và mức xác minh tương xứng. | Khi workflow tập trung chất lượng (ultrawork) bắt đầu |
| **`vendor-detection.md`** | Protocol phát hiện môi trường runtime hiện tại (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen và CLI fallback). Dùng marker host và trạng thái vendor đã cấu hình. | Khi workflow bắt đầu |
| **`session-metrics.md`** | Bằng chứng phiên tùy chọn, không có điểm phạt về hội thoại hay evaluator. | Retrospective được yêu cầu hoặc có sửa hướng đáng kể |
| **`common-checklist.md`** | Các kiểm tra liên lĩnh vực áp dụng được; không có giới hạn số dòng toàn cục hay yêu cầu catch áp dụng cho mọi trường hợp. | Review liên lĩnh vực khi liên quan |
| **`lessons-learned.md`** | Ghi nhận và áp dụng các bài học có bằng chứng kèm điều kiện phiên bản/trigger; không có ngưỡng RCA tự động. | Tham chiếu sau lỗi và khi kết thúc phiên |
| **`api-contracts/`** | Template contract tùy chọn. Dùng lại schema của project; contract được tạo ra nằm ngoài nguồn của skill. | Khi lập kế hoạch công việc qua ranh giới |

### Tài nguyên runtime (`.agents/skills/_shared/runtime/`)

| Tài nguyên | Mục đích |
|---------|---------|
| **`memory-protocol.md`** | Định dạng và thao tác file memory cho CLI subagent. Định nghĩa protocol On Start, During Execution và On Completion dùng các memory tool có thể cấu hình (read/write/edit), gồm extension theo dõi thử nghiệm. |
| **`execution-protocols/claude.md`** | Mẫu thực thi dành riêng cho Claude Code, được `oma agent spawn` inject khi vendor là claude. |
| **`execution-protocols/antigravity.md`** | Mẫu thực thi Antigravity CLI (`agy`). |
| **`execution-protocols/codex.md`** | Mẫu thực thi dành riêng cho Codex CLI. |
| **`execution-protocols/commandcode.md`** | Mẫu thực thi CommandCode. |
| **`execution-protocols/grok.md`** | Mẫu thực thi Grok. |
| **`execution-protocols/kimi.md`** | Mẫu thực thi Kimi Code. |
| **`execution-protocols/kiro.md`** | Mẫu thực thi Kiro. |
| **`execution-protocols/opencode.md`** | Mẫu thực thi OpenCode extension. |
| **`execution-protocols/pi.md`** | Mẫu thực thi pi extension. |
| **`execution-protocols/qwen.md`** | Mẫu thực thi dành riêng cho Qwen CLI. |

Các protocol thực thi theo vendor được tự động inject cho agent được spawn qua CLI bằng `oma agent spawn`. Subagent native sử dụng quy tắc tích hợp của vendor đã chọn.

### Tài nguyên có điều kiện (`.agents/skills/_shared/conditional/`)

Chỉ tải khi trong quá trình thực thi có điều kiện tương ứng:

| Tài nguyên | Điều kiện trigger | Agent tải |
|-----------|-----------------|-----------|
| **`quality-score.md`** | Cần có baseline đã xác định hoặc phép so sánh thử nghiệm | Orchestrator (truyền vào prompt agent QA) |
| **`experiment-ledger.md`** | Ghi thử nghiệm đầu tiên sau khi lập baseline IMPL | Orchestrator (inline, sau phép đo baseline) |
| **`exploration-loop.md`** | Phục hồi lặp lại không thành công và có phương án thay thế đáng thử trong ngân sách | Orchestrator (inline, trước khi spawn agent giả thuyết) |

Các tài nguyên này được hoãn tải cho đến khi trigger riêng của từng tài nguyên được đáp ứng. Chỉ riêng độ khó không khiến chúng được inject.

---

## Cách skill định tuyến qua skill-routing.md

Bản đồ định tuyến skill quy định cách ghép task với agent:

### Định tuyến đơn giản (một lĩnh vực)

Prompt chứa “Build a login form with Tailwind CSS” khớp các từ khóa `UI`, `component`, `form`, `Tailwind` và được định tuyến tới **oma-frontend**.

### Định tuyến yêu cầu phức tạp

Yêu cầu đa lĩnh vực tuân theo thứ tự thực thi đã định nghĩa:

| Mẫu yêu cầu | Thứ tự thực thi |
|--------------|----------------|
| “Create a fullstack app” | oma-pm -> (oma-backend + oma-frontend) song song -> oma-qa |
| “Create a mobile app” | oma-pm -> (oma-backend + oma-mobile) song song -> oma-qa |
| “Fix bug and review” | oma-debug -> oma-qa |
| “Design and build a landing page” | oma-design -> oma-frontend |
| “I have an idea for a feature” | oma-brainstorm -> oma-pm -> agent phù hợp -> oma-qa |
| “Do everything automatically” | oma-orchestration (nội bộ: oma-pm -> agent -> oma-qa) |

### Quy tắc phụ thuộc giữa agent

**Có thể chạy song song (không phụ thuộc):**
- oma-backend + oma-frontend (khi API contract đã định nghĩa)
- oma-backend + oma-mobile (khi API contract đã định nghĩa)
- oma-frontend + oma-mobile (độc lập với nhau)

**Phải chạy tuần tự:**
- oma-brainstorm -> oma-pm (thiết kế trước lập kế hoạch)
- oma-pm -> mọi agent khác (lập kế hoạch trước)
- agent triển khai -> oma-qa (review sau triển khai)
- oma-backend -> oma-frontend/oma-mobile (khi chưa có API contract)

**QA luôn cuối cùng**, trừ khi người dùng chỉ yêu cầu review một số file cụ thể.

---

## Toán tiết kiệm token {#token-savings-math}

Hãy đo trước khi khẳng định mức tiết kiệm:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

Script báo cáo các ước lượng UTF-8 byte / 4 cho những kịch bản dựa trên kích thước file. `routed` chỉ gồm entry; `simple`, `medium` và `complex` thêm các file giả định gồm protocol, ví dụ và stack để so sánh. Tên của chúng được giữ lại để tương thích với script, không phải chỉ dẫn tải trước. `all` là giới hạn trên về kích thước tài nguyên, không phải cấu hình runtime. Checkout mới có thể dùng một seed nền tảng làm proxy kích thước; việc này không tải mọi nền tảng.

Lệnh context hiển thị phần ngữ cảnh task thực tế được inject. Lệnh này không bao gồm phần còn lại của cuộc hội thoại hay mọi chỉ dẫn của host/runtime. Hãy dùng prompt đã được lắp ghép hoặc telemetry sử dụng để đo tổng token đầu vào, độ trễ và chi phí trên một model cụ thể. Không suy ra các số liệu đó từ kích thước repository hay số lượng bản mirror được tạo.

## Tải tài nguyên theo task {#resource-loading-by-task}

Mọi mức độ khó đều bắt đầu bằng skill sở hữu. Graph là một chỉ mục tham chiếu; việc kề cận trong graph không cho phép tải specialist khác, playbook lỗi hay workflow thử nghiệm có điều kiện.

Loader dùng ngân sách mềm 1.500 / 4.000 / 8.000 token ước tính cho Simple / Medium / Complex. Entry vượt ngân sách vẫn được giữ lại và phần vượt mức được báo cáo. Các tham chiếu hỗ trợ vẫn bị hoãn tải, trừ khi được chọn tường minh sau khi trigger theo task của chúng đã được xác định. Entry bắt buộc không bao giờ bị thay bằng các tài liệu nhỏ hơn không liên quan.

Việc xác minh tuân theo rủi ro của task và yêu cầu của project. Nhãn độ khó không đòi hỏi bộ test đầy đủ, phản hồi preflight cố định hay lần phê duyệt thứ hai cho công việc đã được ủy quyền.

## Bản đồ task context-loading (theo agent)

Đây là các ví dụ về những tham chiếu cần tham khảo khi task cần đến. Hãy dùng chỉ mục hiện tại của skill sở hữu và chỉ chọn các phần áp dụng được:

### Backend agent

| Loại task | Tài nguyên bắt buộc |
|-----------|-------------------|
| Tạo CRUD API | `variants/{node,python,rust}/snippets.md` tương ứng khi có |
| Xác thực | `snippets.md` của variant tương ứng + `tech-stack.md` khi có |
| Database migration | `snippets.md` của variant tương ứng khi có |
| Tối ưu hiệu suất | `orm-reference.md` và mọi ví dụ tương ứng do skill cung cấp |
| Sửa mã hiện có | Provider code-intelligence của project và tài nguyên thực thi liên quan |

### Frontend agent

| Loại task | Tài nguyên bắt buộc |
|-----------|-------------------|
| Tạo component | snippets.md + mẫu component hiện có của project |
| Triển khai form | snippets.md (form + Zod) |
| Tích hợp API | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Bố cục page | snippets.md (grid) |

### Design agent

| Loại task | Tài nguyên bắt buộc |
|-----------|-------------------|
| Tạo design system | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Thiết kế landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| Audit design | checklist.md + anti-patterns.md |
| Xuất design token | design-tokens.md |
| Hiệu ứng 3D / shader | reference/shader-and-3d.md + reference/motion-design.md |
| Review accessibility | reference/accessibility.md + checklist.md |

### QA agent

| Loại task | Tài nguyên bắt buộc |
|-----------|-------------------|
| Review bảo mật | checklist.md (phần Security) |
| Review hiệu suất | checklist.md (phần Performance) |
| Review accessibility | checklist.md (phần Accessibility) |
| Audit đầy đủ | checklist.md (full) + self-check.md |
| So sánh số liệu đã xác định | quality-score.md (có điều kiện) |

---

## Thành phần prompt của Orchestrator

Khi orchestrator soạn prompt cho subagent, nó chỉ đưa vào các tài nguyên liên quan task:

1. Đường dẫn SKILL.md của skill sở hữu (dispatch qua CLI đã inject sẵn nội dung)
2. Phần execution-protocol của thao tác được chọn, khi cần
3. Tài nguyên phù hợp loại task (theo các bản đồ ở trên)
4. Phần error-playbook liên quan, chỉ sau khi đã quan sát thấy lỗi
5. Memory Protocol (chế độ CLI)

Cách soạn nhắm đúng mục tiêu này tránh tải tài nguyên không cần thiết, dành tối đa ngữ cảnh khả dụng của subagent cho công việc thực tế.

---

## Bằng chứng phiên và review retrospective

Bản ghi phiên lưu lại các lần sửa hướng đáng kể, thay đổi phạm vi, việc làm lại và các phát hiện review đã được phân xử, kèm bằng chứng. Việc làm rõ cần thiết không bị phạt. Điểm có trọng số CD và EA trước đây cùng các quy tắc RCA kích hoạt theo ngưỡng đã bị loại bỏ; chúng vốn là chỉ dẫn trong prompt chứ không phải số liệu do CLI tính toán.

Hãy dùng kết quả task hiện có khi có thể. File `session-metrics-{sessionId}.md` riêng là tùy chọn trong coordination store đã cấu hình. Việc thất bại lặp lại hoặc retrospective được yêu cầu có thể đủ cơ sở để rút ra một bài học, nhưng một check thất bại thông thường hay một phát hiện đang bị tranh luận thì không tự động tạo thành bài học. Hãy giữ nguyên log lịch sử; không viết lại chúng theo định dạng mới.

`oma stats` báo cáo năng suất và các bản tóm tắt sử dụng/chi phí đã ghi nhận. `oma retro` nhóm các sự kiện thực tế gồm gate, blocker và thiếu quyết định thành các gợi ý. Cả hai đều không tính điểm CD/EA từ các artifact Markdown này.

## Phân rã task và phục hồi ngữ cảnh

Hãy lập kế hoạch xoay quanh các phụ thuộc và hành vi có thể xác minh độc lập. Số sprint, số file và số lượt ước tính cố định không quyết định độ sâu review hay việc hoàn thành. Hãy giữ test và xử lý lỗi đi kèm với hành vi mà chúng xác minh.

Khi quan sát thấy tình trạng đứng tiến độ hoặc mất ngữ cảnh hữu ích, hãy lưu lại công việc đã hoàn thành, tiêu chí còn lại, đường dẫn liên quan và bằng chứng xác minh trước khi tiếp tục hoặc dispatch lại. Hãy giữ nguyên công việc hiện có và tránh làm trùng lặp một lần thử đang chạy. Chỉ riêng tỷ lệ lượt/tiến độ không đòi hỏi phải reset.

## Đo lường và khám phá có điều kiện

Một baseline đã xác định hoặc phép so sánh thử nghiệm sẽ kích hoạt hướng dẫn đo lường; chỉ riêng việc có test hay lint thì không. Hãy ghi lại các số liệu có thể so sánh kèm đơn vị, phương pháp, revision và bằng chứng. Các kiểm tra bắt buộc về tính đúng đắn và bảo mật vẫn độc lập. OMA không có công thức tổng hợp mặc định, gate theo điểm chữ hay rollback kích hoạt theo điểm số.

Một thử nghiệm thực sự ghi lại giả thuyết, bằng chứng baseline và candidate, các kiểm tra bắt buộc, quyết định và các file do nó sở hữu. Việc thất bại lặp lại có thể đủ cơ sở để thử một cơ chế khác trong ngân sách phục hồi hiện có. Hãy cô lập thay đổi của thử nghiệm, giữ nguyên các chỉnh sửa không liên quan và xác minh candidate đã tích hợp trước khi tiếp tục gate.
