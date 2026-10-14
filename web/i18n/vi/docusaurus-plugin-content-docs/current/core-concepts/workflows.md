---
title: Các workflow
description: Tham chiếu đầy đủ cho 21 workflow oh-my-agent, gồm lệnh slash, chế độ liên tục và không liên tục, từ khóa trigger bằng 11 ngôn ngữ, các giai đoạn và bước, file đọc và ghi, cơ chế phát hiện tự động qua triggers.json và keyword-detector.ts, lọc mẫu thông tin và quản lý trạng thái chế độ liên tục.
---

# Các workflow

Workflow là quy trình nhiều bước có cấu trúc, được kích hoạt bởi lệnh slash hoặc từ khóa ngôn ngữ tự nhiên. Chúng định nghĩa cách agent cộng tác trong task, từ tiện ích một giai đoạn đến cổng chất lượng phức tạp 5 giai đoạn.

Có 21 workflow, trong đó 4 workflow là [liên tục](../getting-started/glossary.md#persistent-workflow) (duy trì trạng thái và không thể bị ngắt do vô tình).

## Tổng quan các workflow {#workflows-at-a-glance}

| Workflow | Dùng cho | Liên tục |
|---|---|---|
| [`/orchestrate`](#orchestrate) | Thực thi agent song song tự động từ một plan, có vòng xác minh | Có |
| [`/work`](#work) | Điều phối đa lĩnh vực từng bước: lập plan, triển khai, QA, sửa lỗi | Có |
| [`/ultrawork`](#ultrawork) | Workflow chất lượng 5 phase với 12 bước review cô lập | Có |
| [`/ralph`](#ralph) | Lặp lại ultrawork đến khi các tiêu chí kiểm chứng được bằng máy đều pass | Có |
| [`/plan`](#plan) | Phân rã task do PM thực hiện, kèm dependency và API contract | Không |
| [`/brainstorm`](#brainstorm) | Ideation ưu tiên thiết kế trước khi lập plan | Không |
| [`/architecture`](#architecture) | Quyết định kiến trúc, review kiến trúc và ADR | Không |
| [`/deepinit`](#deepinit) | Tạo AGENTS.md, ARCHITECTURE.md và `docs/` cho codebase hiện có | Không |
| [`/review`](#review) | QA review: bảo mật, hiệu suất, accessibility, chất lượng mã | Không |
| [`/security`](#security) | Quét bảo mật, pentest web đã triển khai, xác minh phát hiện, cổng CI | Không |
| [`/debug`](#debug) | Chẩn đoán và sửa bug kèm regression test | Không |
| [`/design`](#design) | DESIGN.md với token, pattern component và rule accessibility | Không |
| [`/scm`](#scm) | Thao tác Git và Conventional Commits | Không |
| [`/tools`](#tools) | Khả năng hiển thị và hạn chế của MCP tool | Không |
| [`/convert`](#convert) | Chuyển đổi tài liệu và media giữa các định dạng | Không |
| [`/docs`](#docs) | Phát hiện drift tài liệu và đồng bộ | Không |
| [`/recap`](#recap) | Tóm tắt công việc theo ngày hoặc giai đoạn trên các AI tool | Không |
| [`/stack-set`](#stack-set) | Tham chiếu theo stack cho một skill lĩnh vực | Không |
| [`/video`](#video) | Tạo MP4 qua skill `oma-video` | Không |
| [`/schedule`](#schedule) | Job agent định kỳ theo thời gian | Không |
| [`/explain`](#explain) | Explainer HTML tương tác cho một thay đổi code hoặc một chủ đề | Không |

---

## Chọn skill hoặc workflow {#choosing-a-skill-or-workflow}

Chọn theo nhu cầu điều phối và xác minh của task. Nếu đã chọn workflow, hãy làm theo workflow đó; tiếp tục workflow đang chạy trừ khi bạn chủ động hủy hoặc đổi. Với task mới chưa chọn workflow, dùng hướng dẫn sau:

| Nhu cầu của task | Lựa chọn | Ví dụ |
|---|---|---|
| Một lĩnh vực, không cần phối hợp giữa các agent | [Skill đơn](/docs/guide/single-skill) | Thêm API endpoint và kiểm thử validation |
| Nhiều lĩnh vực, cần lập kế hoạch, triển khai và QA từng bước | `/work` | Điều phối thay đổi API cùng các client web và mobile |
| Tự động giao task độc lập để chạy song song | `/orchestrate` | Triển khai task backend và frontend song song sau khi giải quyết phụ thuộc |
| Yêu cầu rõ ràng về quy trình chất lượng toàn diện | `/ultrawork` | Thực hiện đầy đủ các bước lập kế hoạch, triển khai, xác minh, tinh chỉnh và đánh giá mức độ sẵn sàng phát hành |
| Yêu cầu rõ ràng về việc lặp lại thực thi đến khi đạt tiêu chí kiểm chứng được bằng máy | `/ralph` | Lặp lại triển khai và xác minh bằng judge đến khi các kiểm tra hồi quy đã chỉ định đều pass, trong giới hạn bảo vệ của vòng lặp |

`/orchestrate` tải kế hoạch dùng được hoặc tạo kế hoạch qua `/plan` trước khi spawn agent. Bạn không cần chạy `/plan` trước. Vì vậy, việc đã có kế hoạch không phải là điểm phân biệt `/work` và `/orchestrate`; hãy chọn theo cách bạn muốn điều phối công việc. Cả hai đều có thể chạy task độc lập song song.

Tiêu chí chấp nhận và test cũng thuộc công việc dùng skill đơn. Chỉ có các tiêu chí này không có nghĩa là cần `/ralph`: mỗi lần lặp Ralph chạy toàn bộ quy trình ultrawork và một lượt judge, nên hãy chọn khi bạn muốn lặp lại vòng xác minh đó. Vòng lặp có thể dừng khi còn công việc chưa hoàn thành hoặc bị chặn nếu cơ chế bảo vệ áp dụng.

Bảng này hướng dẫn lựa chọn, không phải bộ định tuyến workflow tự động. Agent chính có thể đề xuất cách làm phù hợp; việc đề xuất hoặc giải thích workflow không khởi chạy nó. Lệnh slash chọn workflow một cách tường minh. Khi hook phát hiện từ khóa được bật, việc khớp từ khóa hoặc mẫu đã cấu hình cũng có thể kích hoạt workflow, tùy bộ lọc câu hỏi thông tin. Bộ phát hiện không phân loại số lĩnh vực, kiểm tra kế hoạch đã sẵn sàng hay dùng bảng này làm thuật toán ưu tiên.

Việc đánh giá kế hoạch kế thừa quyền đã được cấp cho task. Agent chỉ hỏi khi thiếu quyết định quan trọng hoặc cần thực hiện hành động ngoài phạm vi đó. Đánh giá mức độ sẵn sàng phát hành không tự cấp quyền xuất bản hoặc triển khai.

---

## Các workflow liên tục {#persistent-workflows}

Workflow liên tục tiếp tục chạy cho đến khi tất cả task hoàn thành. Chúng duy trì trạng thái trong `.agents/state/` và đưa lại ngữ cảnh `[OMA PERSISTENT MODE: ...]` vào mỗi tin nhắn người dùng cho đến khi được vô hiệu hóa tường minh.

Chế độ liên tục chỉ bắt đầu khi có **lời gọi tường minh** — chính tên của workflow (danh sách `explicit` trong `triggers.json`, ví dụ "orchestrate", "ultrawork"/"ulw", "ralph"/"랄프", "work mode"). Các từ khóa trigger khác bên dưới là gợi ý bằng ngôn ngữ tự nhiên: chúng đưa workflow vào dưới dạng gợi ý mà không kích hoạt chế độ liên tục, và không bao giờ kích hoạt khi dòng đầu hoặc dòng cuối của prompt là một câu hỏi kết thúc bằng `?`.

### /orchestrate

**Mô tả:** Thực thi agent song song tự động qua CLI. Workflow spawn subagent bằng CLI, điều phối qua run state và receipt bền vững, giám sát tiến trình và chạy các vòng xác minh.

**Liên tục:** Có. File trạng thái: `.agents/state/orchestrate-state-{sessionId}.json`.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Tường minh (liên tục) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| Tiếng Anh | "do everything", "run everything", "everything in parallel", "automate everything" |
| Tiếng Hàn | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Tiếng Nhật | "全部実行", "全部並列で", "自動でやって" |
| Tiếng Trung | "编排", "全部执行", "全部并行", "自动处理" |
| Tiếng Tây Ban Nha | "ejecutar todo", "todo en paralelo" |
| Tiếng Pháp | "tout exécuter", "tout en parallèle" |
| Tiếng Đức | "alles ausführen", "alles parallel" |
| Tiếng Bồ Đào Nha | "executar tudo", "tudo em paralelo" |
| Tiếng Nga | "выполнить всё", "всё параллельно" |
| Tiếng Hà Lan | "alles uitvoeren", "alles parallel" |
| Tiếng Ba Lan | "wykonaj wszystko", "wszystko równolegle" |

Các từ trần "parallel"/"automate" (và bản dịch của chúng) không phải là trigger: "run the tests in parallel" hay "automate the release notes" là những yêu cầu thông thường, không phải điều phối đa agent.

**Mẫu regex trigger** (ý định + danh sách trắng danh từ, xem [Phát hiện tự động: trường Pattern](#pattern-field-raw-regex)):
| Phần | Pattern | Ví dụ kích hoạt |
|---------|---------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Danh sách trắng danh từ (14): app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Một feature đơn lẻ ("implement the login feature", "로그인 기능 구현해줘") hoặc một thứ đã có sẵn ("make the API faster") không khớp.

**Các bước:**
1. **Bước 0, Chuẩn bị:** Đọc skill coordination, hướng dẫn context-loading và memory protocol. Phát hiện vendor.
2. **Bước 1, Tải/tạo plan:** Kiểm tra `.agents/results/plan-{sessionId}.json` rồi đến `plan-*.json` mới nhất. Nếu không có plan, hoặc plan chưa sẵn sàng để thực thi (task thiếu agent, tier ưu tiên, dependency hoặc acceptance criteria), giao `/plan` inline để tạo plan với cùng session ID. Trình bày plan và dùng lại quyền đã cấp; chỉ hỏi khi thiếu quyết định quan trọng hoặc cần quyền mới trước khi giao.
3. **Bước 2, Khởi tạo session:** Tải `oma-config.yaml`, hiển thị bảng ánh xạ CLI, dùng session ID từ lúc tạo plan hoặc tạo ID mới (`session-YYYYMMDD-HHMMSS`), rồi tạo `orchestrator-session-{sessionId}.md` và `task-board-{sessionId}.md` trong memory store đã cấu hình.
4. **Bước 3, Spawn agent:** Với từng tier ưu tiên (thấp nhất trước: tier 1, rồi tier 2, v.v.), spawn agent bằng phương thức phù hợp vendor (subagent native khi runtime hiện tại và vendor đích trùng nhau; `oma agent spawn` cho vendor ngoài hoặc khác vendor). Không vượt quá MAX_PARALLEL.
5. **Bước 4, Giám sát:** Poll file `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` theo run và receipt có cấu trúc, sau đó cập nhật task board. Theo dõi hoàn thành, thất bại và crash.
6. **Bước 5, Xác minh:** Với mỗi agent hoàn tất, chạy self-check cơ học (lint, typecheck, test, phạm vi diff; tối đa 3 vòng), sau đó `verify.sh {agent-type} {workspace}` (backend, frontend, mobile, qa, debug và pm; các loại agent khác ghi `SKIP`), rồi QA cross-review. Khi verify thất bại, spawn lại với ngữ cảnh lỗi (tối đa 2 lần thử lại). Thất bại lặp lại có thể là lý do để thử các giả thuyết thay thế, nhưng mọi lần thử đều tiêu tốn cùng một ngân sách phục hồi tổng (`max_attempts`, mặc định 3 kể cả lần đầu). Giữ lại bằng chứng chưa được giải quyết nếu ngân sách không đủ cho một vòng so sánh.
7. **Bước 6, Thu thập:** Đọc file result theo run và claim có cấu trúc, rồi biên soạn tóm tắt.
8. **Bước 7, Báo cáo cuối:** Trình bày tóm tắt session. Nếu đã chạy thí nghiệm, hãy tóm tắt bằng chứng và các quyết định; chỉ ghi lại bài học khi đã xác lập được nguyên nhân có thể tái sử dụng.

```mermaid
flowchart TD
  S1{"Step 1: usable plan JSON?"} -->|no| MK["Create the plan inline with /plan, same session ID"]
  S1 -->|yes| S2
  MK --> S2["Step 2: session ID, task board, domain gate"]
  S2 --> S3["Step 3: dispatch by priority tier, tier 1 first; native subagent or oma agent spawn --task-id"]
  S3 --> S4["Step 4: monitor with oma agent status and progress files"]
  S4 --> SC["Step 5: mechanical self-check, up to 3 cycles"]
  SC --> VS{"verify.sh, or SKIP for unsupported agent types"}
  VS -->|"PASS or SKIP"| QA{"QA cross-review"}
  QA -->|"FAIL: findings back to the agent"| SC
  QA -->|PASS| S6["Step 6: collect claims; emit and verify the QA verdict"]
  S6 --> S7(["Step 7: final report"])
  VS -->|FAIL| CL{"classify the failure"}
  CL -->|"workflow evidence"| EV(["one metadata-only repair, then partial handoff if it still fails"])
  CL -->|product| BG{"attempts left in max_attempts?"}
  BG -->|"yes: retry with error context or a 2-3 hypothesis round"| S3
  BG -->|no| STOP(["preserve partial evidence; report partial or failed"])
  QA -.->|"review limit reached"| STOP
```

**File đọc:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, file progress/result theo run và receipt run có cấu trúc.
**File ghi:** state session/task-board theo run trong memory store đã cấu hình, receipt và claim có cấu trúc, cùng báo cáo cuối.

**Khi sử dụng:** Dự án lớn cần mức song song tối đa cùng điều phối tự động.

---

### /work

**Mô tả:** Điều phối đa lĩnh vực từng bước. PM lập plan trước, agent thực thi trong phạm vi được cấp quyền, sau đó QA review và khắc phục vấn đề.

**Liên tục:** Có. File trạng thái: `.agents/state/work-state-{sessionId}.json`.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Tường minh (liên tục) | "work mode", "work workflow" |
| Phổ quát | "step by step" |
| Tiếng Anh | "one by one", "one step at a time" |
| Tiếng Hàn | "단계별", "하나씩 해줘", "차근차근" |
| Tiếng Nhật | "ステップバイステップ", "一歩ずつ" |
| Tiếng Trung | "逐步", "一步一步" |
| Tiếng Tây Ban Nha | "paso a paso", "uno por uno" |
| Tiếng Pháp | "étape par étape", "un par un" |
| Tiếng Đức | "schritt für schritt", "der reihe nach" |

Từ trần "work" không phải là trigger — đó là từ vựng thông thường ("Does this work on Windows?").

**Các bước:**
1. **Bước 0, Chuẩn bị:** Đọc skill, context-loading và memory protocol. Ghi thời điểm bắt đầu session.
2. **Bước 1, Phân tích yêu cầu:** Xác định các lĩnh vực liên quan. Nếu chỉ một lĩnh vực, đề xuất dùng agent trực tiếp.
3. **Bước 2, PM lập plan:** PM phân rã yêu cầu, định nghĩa API contract, tạo task breakdown có ưu tiên và lưu vào `.agents/results/plan-{sessionId}.json`.
4. **Bước 3, Review plan:** Trình bày plan và tiếp tục trong phạm vi quyền hiện có. Chỉ hỏi khi thiếu quyết định quan trọng hoặc cần quyền mới.
5. **Bước 4, Spawn agent:** Spawn theo tier ưu tiên, chạy song song trong cùng tier và dùng workspace riêng.
6. **Bước 5, Giám sát:** Poll file tiến trình, xác minh các agent khớp API contract.
7. **Bước 6, QA review:** Spawn QA agent để review bảo mật (OWASP), hiệu suất, accessibility và chất lượng mã.
8. **Bước 6.1, Đo lường** (tùy điều kiện): Ghi baseline khi cần một phép so sánh đã được xác định.
9. **Bước 7, Lặp:** Nếu có vấn đề CRITICAL/HIGH, spawn lại agent chịu trách nhiệm. Nếu cùng vấn đề còn sau 2 lần thử, bật Exploration Loop.

**Khi sử dụng:** Feature trải trên nhiều lĩnh vực khi cần điều phối lập plan, triển khai và QA từng bước.

---

### /ultrawork

**Mô tả:** Workflow tập trung vào chất lượng. Có 5 phase, 17 bước tổng cộng và 12 bước review cô lập. Mỗi phase có gate phải đạt trước khi tiếp tục.

**Liên tục:** Có. File trạng thái: `.agents/state/ultrawork-state-{sessionId}.json`.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Tường minh (liên tục) | "ultrawork", "ulw" |

**Phase và bước:**

| Phase | Bước | Agent | Góc nhìn review |
|-------|------|-------|-----------------|
| **PLAN** | 1-4 | PM Agent (tác giả, Bước 1) + reviewer CCR (Bước 2-4) | Tính đầy đủ, meta-review, chống over-engineering/đơn giản |
| **IMPL** | 5 | Dev Agent (spawn) | Triển khai |
| **VERIFY** | 6-8 | Reviewer CCR | Đồng bộ, an toàn (OWASP), ngăn hồi quy |
| **REFINE** | 9-13 | Refactor Agent (Bước 9, 11, 13) + reviewer CCR (Bước 10, 12) | Tách file, tái sử dụng, tác động lan truyền, nhất quán, dead code |
| **SHIP** | 14-17 | Reviewer CCR | Chất lượng mã (lint/coverage), UX flow, vấn đề liên quan, sẵn sàng triển khai |

Mỗi bước review chạy dưới dạng một subagent reviewer riêng với context mới ([Cross-Context Review](../getting-started/glossary.md#cross-context-review-ccr)). PM Agent không tự review plan của mình inline.

**Định nghĩa gate:**
- **PLAN_GATE:** Plan được ghi lại, giả định được liệt kê, phương án thay thế được cân nhắc, review chống over-engineering hoàn tất và phạm vi được cấp quyền.
- **IMPL_GATE:** Check và test không tạo output áp dụng đều pass, chỉ sửa file đã plan, đã ghi bằng chứng baseline cho các thí nghiệm thực sự. Chỉ chạy check build khi được yêu cầu rõ.
- **VERIFY_GATE:** Triển khai khớp yêu cầu, không có CRITICAL, không có HIGH, không hồi quy, đạt các mục tiêu đo lường áp dụng của project.
- **REFINE_GATE:** Tuân thủ các quy tắc bảo trì của project, cơ hội tích hợp đã được ghi nhận, side effect đã xác minh, code đã dọn và không còn hồi quy chưa giải quyết.
- **SHIP_GATE:** Check chất lượng pass, UX được xác minh, vấn đề liên quan được xử lý, checklist triển khai hoàn tất, đạt các mục tiêu đo lường áp dụng của project với bằng chứng mới nhất. Dùng lại quyền đã cấp; publishing hoặc deployment cần quyền riêng cho hành động đó.

**Ứng xử khi gate thất bại:**
- Lần đầu: quay lại bước liên quan, sửa và thử lại.
- Lần thứ hai cùng vấn đề: đánh giá lại nguyên nhân; nếu các phương án thay thế đáng thử trong ngân sách còn lại, so sánh các thí nghiệm cô lập với hành vi bắt buộc và các chỉ số đã xác định.
- Giới hạn: PLAN thất bại chỉ quay lại Bước 1 trước lần dispatch task đầu tiên (sau đó plan là bất biến). Việc thử lại VERIFY và REFINE dừng khi số lần gate thất bại đạt mức tối đa đã cấu hình (mặc định 5 vòng VERIFY + REFINE) hoặc vượt giới hạn chi phí của session.

```mermaid
flowchart TD
  S1["Step 1: PM Agent writes the plan JSON"] --> PR["Steps 2-4: 3 CCR reviewers, completeness, meta-review, simplicity"]
  PR --> PG{"PLAN_GATE"}
  PG -->|"fail, before first dispatch"| S1
  PG -->|pass| S5["Step 5: implementation agents in parallel"]
  S5 --> IG{"IMPL_GATE"}
  IG -->|"fail: re-spawn failed agents"| S5
  IG -->|pass| VR["Steps 6-8: 3 CCR reviewers, alignment, safety, regression"]
  VR --> VG{"VERIFY_GATE"}
  VG -->|fail| VL{"cycle limit or cost cap reached?"}
  VL -->|"no: root-cause fix"| S5
  VG -->|pass| RF["Steps 9-13: 2 CCR reviews, then refactor actions"]
  RF --> RG{"REFINE_GATE"}
  RG -->|fail| RL{"cycle limit or cost cap reached?"}
  RL -->|"no: re-spawn Refactor Agent"| RF
  RG -->|"pass, or recorded skip"| SR["Steps 14-17: 4 CCR reviewers, quality, UX, related issues, deployment"]
  SR --> SG{"SHIP_GATE"}
  SG -->|"fail: re-run affected steps"| SR
  SG -->|pass| DONE(["Final results; optional oma docs verify"])
  VL -->|yes| STOP(["Stop: save step results, report unresolved items"])
  RL -->|yes| STOP
```

**Tăng cường có điều kiện:** So sánh theo chỉ số đã xác định, quyết định và bằng chứng của thí nghiệm, khám phá giả thuyết có ngân sách, và bài học dựa trên nguyên nhân có thể tái sử dụng.

**Điều kiện bỏ qua REFINE:** Task đơn giản dưới 50 dòng.

**Khi sử dụng:** Quy trình review đầy đủ trước khi quyết định kết quả đã sẵn sàng phát hành chưa. Workflow ghi lại check và finding; không tự quyết định mức sẵn sàng production thay bạn.

---

### /ralph

**Mô tả:** Vòng lặp thực thi tự tham chiếu liên tục. Bọc ultrawork bằng một [judge](../getting-started/glossary.md#judge) kiểm tra tiêu chí hoàn thành sau mỗi lần lặp. Báo cáo hoàn thành đầy đủ khi mọi tiêu chí pass, hoàn thành một phần khi chỉ còn tiêu chí đã pass và bị chặn, hoặc dừng khi safeguard kích hoạt.

**Liên tục:** Có. File trạng thái: `.agents/state/ralph-state-{sessionId}.json`.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Tường minh (liên tục) | "ralph", "랄프" |
| Tiếng Anh | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Tiếng Hàn | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Tiếng Nhật | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Tiếng Trung | "不要停", "直到完成", "全部完成", "做完为止" |
| Tiếng Tây Ban Nha | "no pares", "hasta completar", "termina todo" |
| Tiếng Pháp | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Tiếng Đức | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Các cụm từ tiếp tục trần ("keep going", "carry on", "계속해", "続けて", "продолжай", …) không phải là trigger: người dùng gõ chúng để tiếp tục sau khi bị gián đoạn.

**Các phase:**
1. **Phase 0, INIT:** Tải prerequisite (context-loading, memory protocol, judge protocol). Định nghĩa và ghi tiêu chí hoàn thành có thể kiểm chứng bằng máy, chẳng hạn test assertion, type check không tạo output, exit code hoặc sự tồn tại của file. Chỉ thêm check build khi được yêu cầu rõ. Hiển thị tiêu chí và tiếp tục trong phạm vi quyền đã cấp. Khởi tạo session với `max_iterations: 5`.
2. **Phase 1, EXEC:** Chạy ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) như một lần lặp dưới session ID của Ralph. Sau đó chạy artifact gate `oma ralph verify --json --session-id <sessionId> --newer-than <iteration start>`. Nếu gate thất bại, lần lặp được tính là chưa thực hiện: Ralph ghi lại vi phạm, sửa công việc và chạy lại gate.
3. **Phase 2, JUDGE:** Judge đối chiếu từng tiêu chí hoàn thành với trạng thái project thực tế (chạy check được phép và xác minh file tồn tại). Prompt của workflow yêu cầu orchestrator spawn judge thành một agent riêng với context mới, chỉ được thông báo về các tiêu chí; không có cơ chế nào xác nhận việc spawn một cách cơ học, và runtime không thể spawn subagent được yêu cầu judge inline và ghi `ralph.judge-inline-fallback`. Ghi bằng chứng và trạng thái tiêu chí, gồm PASS, FAIL, REGRESSED hoặc BLOCKED.
4. **Cổng quyết định:** Nếu mọi tiêu chí PASS → báo cáo hoàn thành đầy đủ. Nếu chỉ còn PASS và BLOCKED → báo cáo hoàn thành một phần. Nếu có FAIL hoặc REGRESSED → chuyển ngữ cảnh thất bại vào lần lặp kế tiếp, theo safeguard.
5. **Phase 3, REPLAN:** Thu hẹp lần lặp kế tiếp vào các mục FAIL và REGRESSED (chẩn đoán dựa trên diff), bỏ qua mục BLOCKED và giữ các tiêu chí PASS trong phạm vi của judge. Quay lại Phase 1.
6. **Safeguard:** Dừng loop khi `current_iteration >= max_iterations` (mặc định 5). Tiêu chí fail 3 lần liên tiếp với cùng nguyên nhân gốc trở thành BLOCKED và không được thử lại (phát hiện bị kẹt).

```mermaid
flowchart TD
  INIT["Phase 0 INIT: define verifiable criteria, max_iterations = 5"] --> EXEC["Phase 1 EXEC: run the full ultrawork workflow"]
  EXEC --> GATE{"oma ralph verify: plan, QA, and refactor evidence current?"}
  GATE -->|"no: iteration not performed"| REPAIR["Record the violation, emit gate.failed, repair the work"]
  REPAIR --> GATE
  GATE -->|yes| JUDGE["Phase 2 JUDGE: judge re-checks every criterion, including earlier passes"]
  JUDGE --> VERDICT{"verdict"}
  VERDICT -->|"COMPLETED: all PASS"| DONE(["Full completion report"])
  VERDICT -->|"PARTIAL: only PASS and BLOCKED"| PART(["Partial completion report"])
  VERDICT -->|"FAIL: any FAIL or REGRESSED"| LIMIT{"current_iteration >= max_iterations?"}
  LIMIT -->|yes| SAFE(["Safeguard report"])
  LIMIT -->|no| REPLAN["Phase 3 REPLAN: FAIL and REGRESSED items only; skip BLOCKED"]
  REPLAN --> EXEC
```

Nút judge là judge được chỉ định qua prompt như mô tả ở Phase 2: workflow yêu cầu orchestrator spawn nó với context mới, còn runtime không thể spawn subagent sẽ judge inline và ghi lại fallback.

**Khác biệt chính với /ultrawork:** Ultrawork chạy quy trình 5 phase và thử lại khi gate của một phase thất bại. Ralph bọc ultrawork trong loop retry với một judge được chỉ định qua prompt, xác minh lại mọi tiêu chí theo bằng chứng của project. Loop kết thúc bằng báo cáo hoàn thành đầy đủ, báo cáo hoàn thành một phần cho công việc bị chặn hoặc báo cáo safeguard.

**File đọc:** `.agents/workflows/ralph/resources/judge-protocol.md` và toàn bộ file ultrawork.
**File ghi:** `session-ralph-{sessionId}.md` (memory), log từng lần lặp và báo cáo cuối.

**Khi sử dụng:** Khi bạn yêu cầu rõ việc thực thi lặp lại và judge xác minh lại theo tiêu chí hoàn thành cơ học. Chỉ có test không bắt buộc Ralph; cần tính toàn bộ quy trình ultrawork và safeguard trong mỗi lần lặp.

---

## Workflow không liên tục {#non-persistent-workflows}

### /plan

**Mô tả:** Phân rã task do PM dẫn dắt. Phân tích yêu cầu, chọn tech stack, chia thành task có ưu tiên và dependency, định nghĩa API contract.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "task breakdown" |
| Tiếng Anh | "plan" |
| Tiếng Hàn | "계획", "요구사항 분석", "스펙 분석" |
| Tiếng Nhật | "計画", "要件分析", "タスク分解" |
| Tiếng Trung | "计划", "需求分析", "任务分解" |

**Các bước:** Thu thập yêu cầu -> phân tích khả thi kỹ thuật (MCP code analysis) -> đánh giá độ phức tạp (Simple/Medium/Complex) -> định nghĩa API contract (nếu vượt ranh giới) -> phân rã thành task -> review với người dùng -> lưu artifact plan (JSON máy đọc được + tracker Markdown cho người đọc với Medium/Complex).

**Đầu ra:** `.agents/results/plan-{sessionId}.json`, ghi memory và (với Medium/Complex) `docs/plans/work/{NNN}-{name}.md` có bảng task, decision log, progress notes. Vòng đời được theo dõi qua field `Status` trong header Markdown (`Active` -> `Completed`); plan không bị chuyển giữa các thư mục. Design tạo bởi `/brainstorm` nằm tại `docs/plans/designs/{NNN}-{name}.md`.

**Thực thi:** Inline (không spawn subagent). `/orchestrate` hoặc `/work` sử dụng plan và cập nhật field task/status trong lúc thực thi.

---

### /brainstorm

**Mô tả:** Ideation ưu tiên thiết kế. Khám phá ý định, làm rõ ràng buộc, đề xuất các hướng tiếp cận và tạo tài liệu thiết kế được duyệt trước khi lập plan.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "brainstorm" |
| Tiếng Anh | "ideate", "explore design" |
| Tiếng Hàn | "브레인스토밍", "아이디어", "설계 탐색" |
| Tiếng Nhật | "ブレインストーミング", "アイデア", "設計探索" |
| Tiếng Trung | "头脑风暴", "创意", "设计探索" |

**Các bước:** Khám phá ngữ cảnh project (MCP analysis) -> hỏi câu làm rõ (mỗi lần một câu) -> đề xuất 2-3 hướng cùng đánh đổi -> trình bày design theo từng phần (người dùng duyệt từng bước) -> lưu tài liệu design tại `docs/plans/designs/{NNN}-{name}.md` -> chuyển tiếp: gợi ý `/plan`.

**Quy tắc:** Không triển khai hoặc lập plan trước khi design được duyệt. Không xuất code. Áp dụng YAGNI.

---

### /architecture

**Mô tả:** Workflow kiến trúc phần mềm chẩn đoán vấn đề kiến trúc, chọn phương pháp phân tích phù hợp (diagnostic routing / design-twice / ATAM / CBAM / ADR), so sánh phương án, tổng hợp ý kiến stakeholder và tạo recommendation, review hoặc ADR.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "architecture", "ADR", "ATAM", "CBAM" |
| Tiếng Anh | "architecture review", "architectural tradeoff" |
| Tiếng Hàn | "아키텍처", "설계 검토" |
| Tiếng Nhật | "アーキテクチャ" |
| Tiếng Trung | "架构" |

**Các bước:** Định khung quyết định (kiến trúc mới / review / phân tích đánh đổi / ưu tiên đầu tư / viết ADR) -> chọn methodology qua diagnostic routing -> phân tích kiến trúc hiện tại qua MCP code analysis (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> tổng hợp ý kiến stakeholder (chỉ khi đủ cross-cutting để biện minh chi phí) -> tạo recommendation với assumption, tradeoff, risk và bước validation rõ ràng -> bàn giao cho `/plan` khi cần triển khai.

**Quy tắc:** KHÔNG viết code triển khai hoặc task plan trong workflow này. Bàn giao cho `/plan` sau quyết định kiến trúc. Dùng MCP tool xuyên suốt; không thay thế bằng đọc file thô hoặc grep.

**Khi sử dụng:** Chọn kiến trúc hệ thống, quyết định ranh giới module/service/ownership, ưu tiên refactor, viết ADR, điều tra vấn đề kiến trúc (change amplification, dependency ẩn, API khó dùng).

---

### /deepinit

**Mô tả:** Khởi tạo project đầy đủ. Phân tích codebase hiện có, tạo AGENTS.md, ARCHITECTURE.md và knowledge base `docs/` có cấu trúc.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "deepinit" |
| Tiếng Hàn | "프로젝트 초기화" |
| Tiếng Nhật | "プロジェクト初期化" |
| Tiếng Trung | "项目初始化" |

**Các bước:** Chuẩn bị -> phân tích codebase (loại project, kiến trúc, rule ngầm, domain, boundary) -> tạo ARCHITECTURE.md (domain map, dưới 200 dòng) -> tạo knowledge base `docs/` (design-docs/, plans/, generated/, product-specs/, references/, domain docs) -> tạo AGENTS.md gốc (~100 dòng, mục lục) -> tạo các file AGENTS.md theo boundary (package monorepo, mỗi file dưới 50 dòng) -> cập nhật harness hiện có (nếu chạy lại) -> xác minh (không dead link, đúng giới hạn dòng).

**Đầu ra:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md và tài liệu theo domain được phát hiện.

---

### /review

**Mô tả:** Pipeline QA review đầy đủ. Audit bảo mật (OWASP Top 10), phân tích hiệu suất, kiểm tra accessibility (WCAG 2.1 AA) và review chất lượng mã.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "code review", "security audit", "security review" |
| Tiếng Anh | "review" |
| Tiếng Hàn | "리뷰", "코드 검토", "보안 검토" |
| Tiếng Nhật | "レビュー", "コードレビュー", "セキュリティ監査" |
| Tiếng Trung | "审查", "代码审查", "安全审计" |

**Các bước:** Xác định phạm vi review -> check bảo mật tự động (npm audit, bandit) -> review bảo mật thủ công (OWASP Top 10) -> phân tích hiệu suất -> review accessibility (WCAG 2.1 AA) -> review chất lượng mã -> tạo QA report.

**Vòng lặp sửa-xác minh tùy chọn** (với `--fix`): Sau QA report, spawn agent lĩnh vực để sửa vấn đề CRITICAL/HIGH, chạy lại QA và lặp tối đa 3 lần.

**Ủy quyền:** Với phạm vi lớn, giao Bước 2-7 cho một subagent QA được spawn.

---

### /security

**Mô tả:** Chạy skill `oma-security` cho mã nguồn, skill của agent, thành phần MCP hoặc ứng dụng web đã triển khai. Workflow chọn engine phù hợp, ghi lại phạm vi đã kiểm tra và bằng chứng, xác minh phát hiện rồi áp dụng cổng kiểm tra CI đã cấu hình.

**Điểm vào:** `/security`. Yêu cầu chạy Deepsec, các scanner của Cisco hoặc pentest bằng ARTEX cũng được định tuyến tới đây.

**Mục tiêu và engine:**

| Mục tiêu | Engine |
|--------|--------|
| Mã nguồn | Mặc định là Vercel Deepsec; Cisco AI Deep SAST khi được yêu cầu |
| Gói skill của agent | Cisco Skill Scanner |
| Thành phần hoặc máy chủ MCP | Cisco MCP Scanner |
| Ứng dụng web đã triển khai trong môi trường kiểm thử | ARTEX, trong phạm vi mục tiêu và thực thi đã được cho phép |

Phương pháp kiểm toán của Cloudflare hướng dẫn việc xác minh độc lập và tái hiện trong sandbox cục bộ. Phương pháp này không bổ sung scanner và không chứng minh độ chính xác phát hiện cao hơn.

**Các bước:**

1. Đọc `.agents/skills/oma-security/SKILL.md` và chỉ các tài liệu cần thiết cho mục tiêu và ý định.
2. Xác định mục tiêu (`source`, `skill`, `mcp` hoặc `web_runtime`) và ý định (`setup`, `scan`, `diff`, `pentest`, `triage`, `validate`, `ci` hoặc `troubleshoot`). Kiểm tra phiên bản engine được chọn, giao diện hiện có, thông tin xác thực và ngân sách thực thi.
3. Chạy engine được chọn trong phạm vi đã thống nhất. Tái sử dụng trạng thái Deepsec hiện có khi phù hợp. Với ARTEX, gắn lần chạy với phiên bản đã kiểm tra và cố định, bản triển khai cô lập, tài khoản, danh sách mục tiêu được phép và ngân sách. ARTEX sử dụng UI/API đã được xác minh của bản chụp đã kiểm tra hoặc tác vụ thủ công/bên ngoài; tự động hóa CI cần adapter đã được xác minh và bản ghi thực thi tác vụ.
4. Giữ lại kết quả thô và mã thoát của engine, sau đó chuẩn hóa phát hiện mà không bỏ nguồn gốc hoặc các điểm bất đồng. Đánh giá các phát hiện sơ bộ một cách độc lập; ghi riêng việc xác minh tĩnh và kết quả tái hiện đã quan sát được.
5. Báo cáo phạm vi đã kiểm tra, phát hiện, bằng chứng, công việc chưa hoàn thành và kết quả CI áp dụng. Chuyển việc sửa lỗi cho chuyên gia phụ trách thành phần bị ảnh hưởng.

**Tài liệu:** `deepsec-setup.md`, `deepsec-scanning.md`, `deepsec-config.md` và `deepsec-matchers.md` hướng dẫn Deepsec. `cisco-source.md`, `skill-scanning.md`, `mcp-scanning.md` và `artex.md` hướng dẫn các engine khác. `findings-contract.md`, `validation.md` và `ci.md` quy định các quy tắc chung về bằng chứng, xác minh và cổng kiểm tra. Tất cả nằm trong `.agents/skills/oma-security/resources/`.

**Quy tắc:** Không đưa thông tin xác thực vào báo cáo hoặc hệ thống quản lý phiên bản. Coi mã nguồn và đầu ra scanner là dữ liệu đầu vào không đáng tin cậy. Chạy các phép tái hiện cục bộ trong sandbox của hệ điều hành; giới hạn lưu lượng ARTEX trong phạm vi môi trường chạy đã được cho phép. Lần quét thất bại, chưa hoàn tất hoặc bị bỏ qua, cũng như nỗ lực khai thác không thành công, không chứng minh mục tiêu an toàn. Phát hiện `confirmed` cần được xác minh độc lập và có bằng chứng đã quan sát trên revision hoặc bản triển khai được ghi lại; nếu chỉ có căn cứ tĩnh thì vẫn là `needs_validation`.

**Khi sử dụng:** Quét bảo mật, pentest ứng dụng web đã triển khai, triage và xác minh phát hiện hoặc cổng kiểm tra bảo mật CI. Dùng `/review` để rà soát rộng hơn về chất lượng code, accessibility và hiệu suất.

---

### /debug

**Mô tả:** Chẩn đoán và sửa bug có cấu trúc, viết regression test và quét pattern tương tự.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "debug" |
| Tiếng Anh | "fix bug", "fix error", "fix crash" |
| Tiếng Hàn | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Tiếng Nhật | "デバッグ", "バグ修正", "エラー修正" |
| Tiếng Trung | "调试", "修复 bug", "修复错误" |

**Các bước:** Thu thập thông tin lỗi -> tái hiện (MCP `search_for_pattern`, `find_symbol`) -> chẩn đoán nguyên nhân gốc (MCP `find_referencing_symbols` để lần theo execution path) -> đề xuất sửa tối thiểu (cần người dùng xác nhận) -> áp dụng sửa + viết regression test -> quét pattern tương tự (có thể spawn subagent debug-investigator nếu phạm vi > 10 file) -> ghi bug vào memory.

**Điều kiện spawn subagent:** Lỗi trải trên nhiều domain, phạm vi quét > 10 file hoặc cần lần theo dependency sâu.

---

### /design

**Mô tả:** Workflow thiết kế 7 phase tạo DESIGN.md với token, pattern component và rule accessibility.

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "design system", "DESIGN.md", "design token" |
| Tiếng Anh | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Tiếng Hàn | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Tiếng Nhật | "デザイン", "ランディングページ", "デザインシステム" |
| Tiếng Trung | "设计", "着陆页", "设计系统" |

**Các phase:** SETUP (thu thập context, `.design-context.md`) -> EXTRACT (tùy chọn, từ URL tham chiếu/Stitch) -> ENHANCE (bổ sung cho prompt mơ hồ) -> PROPOSE (2-3 hướng design với màu, typography, layout, motion, component) -> GENERATE (DESIGN.md + token CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heuristic Nielsen, kiểm tra AI slop) -> HANDOFF (lưu và thông báo người dùng).

**Bắt buộc:** Mọi output đều responsive-first (mobile 320-639px, tablet 768px+, desktop 1024px+).

---

### /scm

**Mô tả:** Tạo Conventional Commits với tự động tách commit theo tính năng.

**Từ khóa trigger:** Không có (bị loại khỏi phát hiện tự động).

**Các bước:** Phân tích thay đổi (git status, git diff) -> tách theo tính năng (nếu > 5 file thuộc scope/type khác nhau) -> xác định type (feat/fix/refactor/docs/test/chore/style/perf) -> xác định scope (module thay đổi) -> viết mô tả (thể mệnh lệnh, < 72 ký tự) -> commit ngay (không hỏi xác nhận).

**Quy tắc:** Không bao giờ dùng `git add -A`. Không bao giờ commit secret. Dùng HEREDOC cho message nhiều dòng. Chỉ thêm trailer co-author khi cấu hình `scm.co_author` có hiệu lực bật tính năng này và cung cấp đủ cả hai giá trị.

---

### /tools

**Mô tả:** Quản lý khả năng hiển thị và hạn chế của MCP tool.

**Từ khóa trigger:** Không có (bị loại khỏi phát hiện tự động).

**Tính năng:** Hiển thị trạng thái MCP tool hiện tại, bật/tắt nhóm tool (memory, code-analysis, code-edit, file-ops), thay đổi vĩnh viễn hoặc tạm thời (`--temp`), phân tích ngôn ngữ tự nhiên ("memory tools only", "disable code edit").

**Nhóm tool:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /convert

**Mô tả:** Chuyển đổi file từ định dạng này sang định dạng khác, định tuyến theo loại media. **Tài liệu** (PDF qua `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML qua `kordoc`/`oma-hwp`) được trích xuất sang Markdown. File **hình ảnh**, **video** và **âm thanh** được transcode sang định dạng đích qua `ffmpeg` (đã được cấp sẵn cho `oma-video`).

**Từ khóa trigger:** Không có (gọi tường minh với đường dẫn file đầu vào).

**Các bước:** Xác minh đầu vào & định tuyến theo loại (tài liệu `.pdf`/`.hwp*`; hình ảnh `.jpg`/`.png`/`.webp`/…; video `.mp4`/`.mov`/…; âm thanh `.mp3`/`.wav`/…) -> xác định định dạng đích (tài liệu mặc định = Markdown; media = `--to` tường minh) -> chuyển đổi (PDF: `uvx opendataloader-pdf`, PDF scan dùng OCR hybrid; HWP: `bunx kordoc@latest`; media: `ffmpeg`) -> chuẩn hóa tài liệu (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> xác minh (đọc Markdown / `ffprobe` media) -> báo cáo định dạng nguồn→đích và mọi lựa chọn chất lượng/codec.

**Quy tắc:** Định tuyến theo loại — không bao giờ chạy bộ chuyển đổi tài liệu trên file media hoặc ngược lại. Vị trí đầu ra mặc định là cùng thư mục với file đầu vào. Báo cáo lựa chọn chất lượng/codec cho media (transcode có mất mát). Không bao giờ bỏ qua bước. Ngôn ngữ phản hồi theo `.agents/oma-config.yaml`.

**Khi sử dụng:** Chuyển đổi tài liệu PDF hoặc dòng HWP của Hàn Quốc sang Markdown để nạp vào LLM/RAG, hoặc transcode hình ảnh (jpg→webp/png), video (mov→mp4, mp4→gif) và âm thanh (wav→mp3) giữa các định dạng.

---

### /docs

**Mô tả:** Phát hiện drift tài liệu và đồng bộ qua `oma-docs`. Chế độ verify tìm broken ref trong toàn bộ Markdown của repo (glob mặc định `**/*.md`); chế độ sync đề xuất patch theo từng tài liệu cho các tài liệu bị ảnh hưởng bởi một git diff. Chạy inline (không spawn subagent); mọi vendor đều gọi trực tiếp `oma docs`.

**Từ khóa trigger:** Universal: "oma-docs", "docs verify", "docs sync". English: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Korean: "문서 검증", "문서 드리프트", "문서 동기화". Japanese: "ドキュメント検証", "ドキュメント同期". Chinese: "文档校验", "文档同步".

**Các bước:** Xác định chế độ (mặc định `verify`; `sync` khi prompt nhắc đến sync hoặc cung cấp một git diff range) -> preflight (`command -v oma`; với sync, xác nhận diff dùng được, nếu không thì dùng `HEAD~1..HEAD`) -> Verify: `oma docs verify --json` (exit `0` là sạch, `1` là có broken ref) hoặc Sync: `oma docs sync --json` theo range -> tổng hợp phát hiện theo host-LLM contract (verify: nhóm theo CRITICAL/HIGH/MEDIUM/LOW kèm cách sửa cụ thể; sync: soạn patch unified-diff tối thiểu) -> trình bày từng patch sync một cách tương tác (`[y] apply [n] skip [d] show diff [s] show full proposal`; không bao giờ tự apply) -> khi apply, tạo lại index qua `oma docs verify --json` -> báo cáo chế độ, số lượng theo loại và trỏ tới `docs/generated/doc-refs.json` / `url-drift.json`.

**Quy tắc:** Không bao giờ tự apply patch sync (cần xác nhận `[y]` cho từng tài liệu). Không bao giờ sửa `.agents/` (SSOT). Nếu thiếu `oma docs`, in gợi ý cài đặt và thoát — không fallback sang grep thủ công.

**File đọc:** Markdown mục tiêu (`**/*.md` hoặc glob được yêu cầu), `git diff` cho `changedFiles` của sync.
**File ghi:** `docs/generated/doc-refs.json` (luôn được verify tạo lại), `docs/generated/url-drift.json` (khi chạy kiểm tra URL), các patch tài liệu được duyệt (khi chọn `[y]` trong sync).

**Khi sử dụng:** Kiểm tra tài liệu còn khớp với codebase hay không (đường dẫn file, lệnh CLI, config key, biến môi trường bị hỏng), hoặc đề xuất patch tài liệu sau một thay đổi code.

---

### /recap

**Mô tả:** Tóm tắt công việc theo ngày hoặc giai đoạn qua `oma-recap`. Xác định ngày hoặc khoảng thời gian từ ngôn ngữ tự nhiên, gọi `oma recap --json` trên lịch sử của nhiều AI tool (Grok, Claude, Codex, Qwen, Cursor, Antigravity), giao việc phân tích chủ đề và định dạng Markdown cho skill, rồi báo cáo TL;DR cùng path đã lưu. Chạy inline (không spawn subagent); mọi vendor đều gọi trực tiếp `oma recap`.

**Từ khóa trigger:** Universal: "recap". Korean: "리캡". Japanese: "リキャップ".

**Các bước:** Xác định chế độ và khoảng thời gian (mặc định `daily` với hôm nay; `period` khi các cụm như "this week" / "지난 7일" được quy về `--window Nd`) -> chỉ trích bộ lọc `--tool` khi người dùng nêu rõ tên tool (`grok, claude, codex, qwen, cursor, antigravity`) -> preflight (`command -v oma`) -> chạy `oma recap --json` (daily: `--date YYYY-MM-DD` hoặc bỏ qua; period: `--window 7d` / `30d`) -> tổng hợp và lưu theo contract của skill (ngưỡng chủ đề 15 phút, template theo ngày hoặc nhiều ngày) -> báo cáo TL;DR 3 gạch đầu dòng và path đã lưu.

**Quy tắc:** Không bao giờ sửa `.agents/` (SSOT). Không bao giờ tự dịch thuật ngữ kỹ thuật (tên project, tên tool, CLI flag) trong recap đã lưu. Không bịa recap khi không có nguồn nào.

**File đọc:** Lịch sử hội thoại của AI tool (qua `oma recap`).
**File ghi:** `.agents/results/recap/{date}.md` hoặc `.agents/results/recap/{start}~{end}.md`.

**Khi sử dụng:** Tóm tắt những gì bạn đã làm trên các AI tool trong một ngày hoặc một giai đoạn (tuần/tháng), có thể lọc theo tool cụ thể.

---

### /stack-set

**Mô tả:** Tự phát hiện tech stack của project và tạo tham chiếu theo ngôn ngữ cho skill lĩnh vực được xác định (backend hoặc mobile). Phát hiện stack mobile (Swift/iOS qua `Package.swift`/`.xcodeproj`, Flutter qua `pubspec.yaml`, React Native qua `package.json` + react-native) và định tuyến tới `oma-mobile`; ngược lại định tuyến tới `oma-backend`. Trong monorepo có cả hai, workflow hỏi bạn muốn cấu hình cái nào.

**Từ khóa trigger:** Không có (bị loại khỏi phát hiện tự động).

<!-- oma-docs:ignore-start -->
**Các bước:** Phát hiện (quét manifest: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> xác nhận (hiển thị stack phát hiện được, lấy xác nhận của người dùng) -> tạo (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` với 8 pattern bắt buộc, `stack/api-template.*`) -> xác minh.
<!-- oma-docs:ignore-end -->

**Đầu ra:** Các file trong thư mục `stack/` của skill lĩnh vực được xác định (ví dụ `.agents/skills/oma-backend/stack/` hoặc `.agents/skills/oma-mobile/stack/`). Không sửa SKILL.md hoặc `resources/`.

---

### /video

**Mô tả:** Điều khiển skill `oma-video` từ đầu đến cuối: brief → script → narration → visuals → captions → render-spec → compositor HyperFrames được quản lý (hoặc MoneyPrinterTurbo). Workflow tạo một run directory có thể tái lập và chỉ xuất `.mp4` thật sau khi kiểm tra compositor và ffprobe đều pass. Cấu hình provider không bắt buộc key đối với các fallback asset được hỗ trợ; lỗi compositor hoặc toolchain vẫn là một run thất bại. Chạy inline (không spawn subagent).

**Từ khóa trigger:**
| Ngôn ngữ | Từ khóa |
|----------|----------|
| Phổ quát | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| Tiếng Anh | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Tiếng Hàn | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Tiếng Nhật | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Tiếng Trung | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Các bước:**
1. **Xác định brief và mode:** Chọn `shorts` (9:16), `explainer` (16:9) hoặc `demo` (screen/web capture); áp dụng mặc định của mode, có thể ghi đè bằng flag.
2. **Soạn script:** Tạo scene + narration (dùng LLM khi có key, nếu không thì dùng outline xác định từ brief).
3. **Tổng hợp asset:** Narration qua `oma-voice`, visuals qua `oma-image`/`oma-slide`/stock, căn caption không cần key, hoặc web capture bằng browser có giám sát cho `demo --source web`. Mỗi provider đều lùi về một fallback xác định.
4. **Dựng render-spec:** Ghi `render-spec.json` (ranh giới tính xác định) cùng asset vào run directory.
5. **Render:** Spawn project HyperFrames được quản lý (hoặc MoneyPrinterTurbo) làm subprocess. Lỗi compositor hoặc toolchain thông thường làm run thất bại; placeholder xác định chỉ có qua đường mock/test tường minh (`OMA_VIDEO_MOCK=1`). Live capture được ghi là `nondeterministic` trong manifest.

**Đầu ra:** Một run directory tại `.agents/results/videos/{timestamp}-{shortid}-{mode}/` gồm `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` và `manifest.json`. Xem [hướng dẫn tạo video](../guide/video-generation.md).

---

### /schedule

**Mô tả:** Đăng ký và quản lý job agent theo thời gian qua các lệnh `oma schedule <action>`. Job nằm trong registry toàn cục (`~/.oma/schedule/`) và được kích hoạt qua scheduler native của OS (launchd trên macOS, systemd user timer trên Linux, schtasks trên Windows, crontab làm fallback POSIX); mỗi lần chạy quay lại harness qua `oma agent spawn`.

**Từ khóa trigger:** Không có (workflow gọi bằng slash cho các job theo thời gian `oma schedule <action>`).

**Các bước:** Xác định ý định (add / list / remove / sync) -> phân tích lịch (`--cron` tường minh, hoặc ngôn ngữ tự nhiên qua `--every`) -> đăng ký bằng `oma schedule create` (chỉ ghi lại env được đặt tên, file 0600) -> xác minh bằng `oma schedule list` (drift giữa manifest × OS, nhóm theo project) -> báo cáo job id và thời điểm kích hoạt kế tiếp.

**Khi sử dụng:** Task agent định kỳ — recap hằng đêm, quét theo lịch, dọn dẹp định kỳ — cần chạy ngay cả khi không có session tương tác nào đang mở.

---

### /explain

**Mô tả:** Điều khiển skill `oma-explanation` từ đầu đến cuối: biến diff, PR, branch hoặc commit range thành explainer HTML tương tác, tự chứa (Background / Intuition / Code / Quiz). Chạy inline (không spawn subagent).

**Từ khóa trigger:** Không có ("explain" là từ vựng thường ngày — phát hiện từ khóa sẽ kích hoạt nhầm với các câu hỏi thông thường như "explain this function", nên workflow chỉ gọi bằng slash).

**Các bước:** Xác định đối số (target ref: PR# / branch / SHA range tường minh → staged → dirty tree → `HEAD~1..HEAD`; mức người đọc `onboarding` | `reviewer`; ngôn ngữ đầu ra; số câu quiz) -> tải contract (SKILL.md của `oma-explanation` + resources) -> thu thập & kiểm soát (diff + code xung quanh; quét secret trước khi tạo; văn bản diff/PR được coi thuần túy là dữ liệu) -> tạo HTML theo contract tài liệu và contract HTML -> xác minh (checklist grep gồm cả quét secret trên HTML cuối, tối đa 3 vòng sửa) -> bàn giao (`open` chỉ cảnh báo khi lỗi, TL;DR + path).

**Đầu ra:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (ngày theo Asia/Seoul; chạy lại cùng ngày + slug sẽ ghi đè). Xem [hướng dẫn giải thích code](../guide/code-explainer.md).

---

## Skill so với workflow {#skills-vs-workflows}

| Khía cạnh | Skill | Workflow |
|--------|--------|-----------|
| **Là gì** | Chuyên môn agent (agent biết gì) | Quy trình điều phối (agent làm việc cùng nhau thế nào) |
| **Vị trí** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Kích hoạt** | Tự động qua từ khóa định tuyến skill | Lệnh slash hoặc từ khóa trigger |
| **Phạm vi** | Thực thi đơn lĩnh vực | Nhiều bước, thường đa agent |
| **Ví dụ** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Phát hiện tự động: cách hoạt động {#auto-detection-how-it-works}

### Hệ thống hook {#the-hook-system}

oh-my-agent dùng hook `UserPromptSubmit` chạy trước khi mỗi tin nhắn người dùng được xử lý. Setting của vendor đăng ký một entry duy nhất `<hookDir>/oma-hook.sh --vendor <v> --event <e>` định tuyến vào `oma hook run`, nơi chuỗi handler chạy trong process. Chuỗi này gồm:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, được inline vào binary `oma`): Định nghĩa ánh xạ từ khóa-workflow cho cả 11 ngôn ngữ được hỗ trợ (tiếng Anh, Hàn, Nhật, Trung, Tây Ban Nha, Pháp, Đức, Bồ Đào Nha, Nga, Hà Lan, Ba Lan).

2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): Logic TypeScript quét đầu vào người dùng so với từ khóa trigger của mọi ngôn ngữ và đưa ngữ cảnh kích hoạt workflow vào.

3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): Áp dụng thực thi workflow liên tục bằng cách kiểm tra file trạng thái đang hoạt động và đưa lại ngữ cảnh workflow.

### Luồng phát hiện {#detection-flow}

1. Người dùng nhập đầu vào ngôn ngữ tự nhiên
2. Hook kiểm tra xem có lệnh `/command` tường minh hay không (nếu có, bỏ qua phát hiện để tránh trùng lặp)
3. Hook làm sạch đầu vào (loại bỏ code block, chuỗi trích dẫn, các khối system-echo đã dán) rồi quét so với `.agents/hooks/core/triggers.json`, gồm cả danh sách keyword (cụm từ literal) và `patterns` (regex thô). Một lớp bảo vệ tăng cường ngăn việc kích hoạt lại nếu cùng một workflow đã trigger từ 2 lần trở lên trong 60 giây gần nhất.
4. Nếu tìm thấy khớp, kiểm tra xem đầu vào có khớp các mẫu thông tin hay không
5. Nếu mang tính thông tin (ví dụ: "what is orchestrate?"), lọc ra (không workflow nào được kích hoạt)
6. Nếu mang tính hành động, đưa `[OMA WORKFLOW: {workflow-name}]` vào ngữ cảnh. Khi nhiều workflow cùng khớp, lời gọi tường minh thắng, sau đó đến từ khóa dài nhất.
7. Với workflow liên tục, chỉ lời gọi tường minh (`explicit` trong `triggers.json`) mới ghi file trạng thái chế độ liên tục; một match bằng ngôn ngữ tự nhiên được đưa vào dưới dạng gợi ý, và prompt kết thúc bằng câu hỏi (`?` ở dòng đầu hoặc dòng cuối) hoàn toàn không kích hoạt nó
8. Agent đọc tag được đưa vào và tải file workflow tương ứng từ `.agents/workflows/`

### Quy ước section ngôn ngữ {#language-section-convention}

`.agents/hooks/core/triggers.json` dùng cấu trúc section theo ngôn ngữ cho `keywords`, `patterns` và `informationalPatterns`:

| Phần | Hành vi |
|---------|----------|
| `*` | Chung. Dùng cho nội dung tiếng Anh (ngôn ngữ chung) và token thực sự xuyên ngôn ngữ (ví dụ tên workflow `"orchestrate"`). |
| `en` | Tiếng Anh. Tương đương về chức năng với `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Cách diễn đạt theo ngôn ngữ. |

Mọi section đều luôn được tải: người dùng viết prompt bằng ngôn ngữ họ nghĩ, và cài đặt `language` trong `.agents/oma-config.yaml` chỉ điều khiển ngôn ngữ phản hồi. Một keyword viết bằng một ngôn ngữ chỉ có thể khớp với prompt chứa đúng chữ viết đó, nên việc gộp mọi section không thể kích hoạt nhầm trên các prompt không liên quan.

Ranh giới từ chỉ phụ thuộc vào chính keyword, không bao giờ phụ thuộc vào `language`: keyword ASCII chỉ khớp nguyên từ (nên "work" không khớp "network", và "review" không khớp "preview"), còn keyword chứa văn bản không phải ASCII khớp như chuỗi con vì trợ từ và biến tố CJK gắn trực tiếp vào từ ("리뷰해줘").

### Trường pattern (regex thô) {#pattern-field-raw-regex}

Ngoài `keywords` literal, mỗi workflow có thể khai báo `patterns`, là các chuỗi regex thô được biên dịch với cờ `iu`. Pattern cho phép khớp intent đa token mà nếu không sẽ cần danh sách keyword tổ hợp.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Quy tắc soạn thảo:
- Chuỗi được biên dịch trực tiếp; escape backslash một lần cho JSON, một lần cho regex (`\\b`, `\\s+`)
- Không tự động bọc word-boundary; tác giả pattern tự xử lý `\b`
- Regex không hợp lệ bị bỏ qua âm thầm khi runtime (lộ ra lúc chỉnh sửa config qua test thất bại)

### Lọc mẫu thông tin {#informational-pattern-filtering}

Section `informationalPatterns` của `.agents/hooks/core/triggers.json` định nghĩa các cụm từ cho thấy đó là câu hỏi thay vì lệnh. Chúng được kiểm tra trong cửa sổ 60 ký tự xung quanh mỗi khớp workflow tiềm năng:

| Phần | Ví dụ pattern |
|---------|----------------------|
| `*` (chung, tiếng Anh) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Nếu đầu vào khớp cả trigger workflow và mẫu thông tin, mẫu thông tin được ưu tiên và không workflow nào được kích hoạt. Đây là cơ chế chặn các prompt như:
- `"How do you build a TODO app?"`: `how do` trong `*` chặn regex intent của orchestrate
- `"orchestrate 트리거 해주면 되나요?"`: `트리거` trong `ko` chặn keyword orchestrate

### Workflow bị loại trừ {#excluded-workflows}

Các workflow sau không được kích hoạt bằng keyword và phải được gọi bằng `/command` tường minh. `/tools` và `/stack-set` nằm trong `excludedWorkflows` (cố ý loại khỏi phát hiện từ khóa); `/convert` đơn giản là không có từ khóa trigger (skill `oma-pdf` và `oma-hwp` có cơ chế phát hiện từ khóa riêng); `/schedule` là workflow gọi bằng slash (job theo thời gian `oma schedule <action>`); `/explain` không có từ khóa trigger vì "explain" là từ vựng thường ngày và phát hiện từ khóa sẽ liên tục kích hoạt nhầm:
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Cơ chế chế độ liên tục {#persistent-mode-mechanics}

### File trạng thái {#state-files}

Workflow liên tục (orchestrate, ultrawork, work, ralph) tạo file trạng thái trong `.agents/state/` khi được gọi tường minh (xem [Các workflow liên tục](#persistent-workflows)):

```text
.agents/state/
├── orchestrate-state-{sessionId}.json
├── ultrawork-state-{sessionId}.json
├── work-state-{sessionId}.json
└── ralph-state-{sessionId}.json
```

`{sessionId}` là session ID của host, nên các session chạy đồng thời không dùng chung file. Mỗi file ghi tên workflow, session ID, thời điểm kích hoạt và số lần tăng cường, cùng goal contract sau khi chạy `oma goal set`. Tiến độ phase được lưu trong các file memory như `session-ultrawork.md`, không phải ở đây.

### Tăng cường {#reinforcement}

Trong khi workflow liên tục đang hoạt động, hook `persistent-mode.ts` đưa `[OMA PERSISTENT MODE: {workflow-name}]` vào mỗi tin nhắn người dùng. Điều này đảm bảo workflow tiếp tục thực thi xuyên suốt các lượt hội thoại.

### Goal contract (stop gate tùy chọn + ngân sách) {#goal-contract-optional-stop-gate--budget}

`oma goal set` gắn một contract hoàn thành cơ học vào workflow liên tục đang hoạt động:

- `--gate typecheck|test|lint`: Stop hook cho phép session kết thúc **chỉ khi script package.json đó pass** (chạy dưới dạng mảng argv, không qua shell; lệnh tự do bị từ chối theo thiết kế). Khi thất bại, hook chặn và hiển thị phần cuối của output; các lần thất bại và timeout được tính vào giới hạn tăng cường nên gate đỏ không thể chặn mãi mãi.
- `--budget-minutes <n>`: ngân sách thời gian thực tính từ lúc kích hoạt. Vượt ngân sách sẽ vô hiệu hóa workflow và cho phép dừng một phần một cách trung thực, được ghi vào chuỗi event của session.

Không có contract, chế độ liên tục hoạt động như mô tả ở trên — contract là tùy chọn bật thêm. Xem `goal set` trong [tham chiếu lệnh CLI](../cli-interfaces/commands.md#goal-set).

### Vô hiệu hóa {#deactivation}

Để vô hiệu hóa workflow liên tục, người dùng nói "workflow done" (hoặc câu tương đương trong ngôn ngữ đã cấu hình). Thao tác này:
1. Xóa file trạng thái khỏi `.agents/state/`
2. Dừng đưa ngữ cảnh chế độ liên tục vào
3. Trở về hoạt động bình thường

Workflow cũng có thể kết thúc tự nhiên khi mọi bước hoàn tất và gate cuối cùng pass. Khi đã cấu hình gate bằng `goal set`, việc gate đó pass sẽ tự động vô hiệu hóa workflow.

---

## Chuỗi workflow điển hình {#typical-workflow-sequences}

| Mục tiêu | Chuỗi |
|------|----------|
| Tính năng đơn lĩnh vực | Mô tả task → skill liên quan → triển khai → xác minh tập trung |
| Dự án đa lĩnh vực phức tạp | `/work` → PM lập plan → review trong phạm vi được cấp quyền → spawn agent → QA review → sửa vấn đề → báo cáo |
| Triển khai song song tự động | `/orchestrate` → tải hoặc tạo plan → giải quyết dependency → spawn task độc lập → xác minh → báo cáo |
| Phân phối chất lượng tối đa | `/ultrawork` → PLAN (plan + 3 review) → IMPL → VERIFY (3 review) → REFINE (2 review + 3 thao tác refactor) → SHIP (4 review) |
| Điều tra lỗi | `/debug` → tái hiện → nguyên nhân gốc → sửa tối thiểu → regression test → quét pattern tương tự |
| Pipeline từ thiết kế đến triển khai | `/brainstorm` → tài liệu design → `/plan` → phân rã task → `/orchestrate` → triển khai song song → `/review` → `/scm` |
| Khởi tạo codebase mới | `/deepinit` → AGENTS.md + ARCHITECTURE.md + `docs/` |
| Lặp lại thực thi với xác minh bằng judge | `/ralph` → định nghĩa tiêu chí → ultrawork → artifact gate → judge → lặp lại khi cần → báo cáo hoàn thành, hoàn thành một phần hoặc safeguard |

---

## Xem thêm {#see-also}

- [Thực thi song song](./parallel-execution.md): `oma agent spawn`, `oma agent parallel` và giám sát
- [Cấu trúc dự án](./project-structure.md): nơi lưu trạng thái workflow và file memory
- [`oma goal set`](../cli-interfaces/commands.md#goal-set): stop gate và ngân sách cho workflow liên tục
- [Hướng dẫn dự án đa agent](../guide/multi-agent-project.md)
- [Khắc phục sự cố](../guide/troubleshooting.md)
- [Bảng thuật ngữ](../getting-started/glossary.md)
