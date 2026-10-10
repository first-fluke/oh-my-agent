---
title: Các workflow
description: Tham chiếu đầy đủ cho 21 workflow oh-my-agent, gồm lệnh slash, chế độ liên tục và không liên tục, từ khóa trigger bằng 11 ngôn ngữ, các giai đoạn và bước, file đọc và ghi, cơ chế phát hiện tự động qua triggers.json và keyword-detector.ts, lọc mẫu thông tin và quản lý trạng thái chế độ liên tục.
---

# Các workflow

Workflow là quy trình nhiều bước có cấu trúc, được kích hoạt bởi lệnh slash hoặc từ khóa ngôn ngữ tự nhiên. Chúng định nghĩa cách agent cộng tác trong task, từ tiện ích một giai đoạn đến cổng chất lượng năm giai đoạn.

Có 21 workflow, trong đó 4 workflow là liên tục, nghĩa là chúng duy trì trạng thái và không thể bị ngắt do vô tình.

Workflow là quy trình có cấu trúc nhiều bước được kích hoạt bởi lệnh slash hoặc từ khóa ngôn ngữ tự nhiên. Chúng định nghĩa cách agent cộng tác trong task — từ tiện ích đơn giai đoạn đến cổng chất lượng phức tạp 5 giai đoạn.

Có 21 workflow, trong đó 4 là liên tục (duy trì trạng thái và không thể bị gián đoạn ngẫu nhiên).

---

## Chọn skill hoặc workflow {#choosing-a-skill-or-workflow}

Chọn theo nhu cầu điều phối và xác minh của task. Nếu đã chọn workflow, hãy làm theo workflow đó; tiếp tục workflow đang chạy trừ khi bạn chủ động hủy hoặc đổi. Với task mới chưa chọn workflow, dùng hướng dẫn sau:

| Nhu cầu của task | Lựa chọn | Ví dụ |
|---|---|---|
| Một lĩnh vực, không cần phối hợp giữa các agent | [Skill đơn](/docs/guide/single-skill) | Thêm API endpoint và kiểm thử validation |
| Nhiều lĩnh vực, cần lập kế hoạch, triển khai và QA từng bước | `/work` | Điều phối thay đổi API cùng các client web và mobile |
| Tự động giao task độc lập để chạy song song | `/orchestrate` | Triển khai task backend và frontend song song sau khi giải quyết phụ thuộc |
| Yêu cầu rõ ràng về quy trình chất lượng toàn diện | `/ultrawork` | Thực hiện đầy đủ các bước lập kế hoạch, triển khai, xác minh, tinh chỉnh và đánh giá mức độ sẵn sàng phát hành |
| Yêu cầu rõ ràng về việc lặp lại thực thi đến khi đạt tiêu chí kiểm chứng được bằng máy | `/ralph` | Lặp lại triển khai và xác minh độc lập đến khi các kiểm tra hồi quy đã chỉ định đều pass, trong giới hạn bảo vệ của vòng lặp |

`/orchestrate` tải kế hoạch dùng được hoặc tạo kế hoạch qua `/plan` trước khi spawn agent. Bạn không cần chạy `/plan` trước. Vì vậy, việc đã có kế hoạch không phải là điểm phân biệt `/work` và `/orchestrate`; hãy chọn theo cách bạn muốn điều phối công việc. Cả hai đều có thể chạy task độc lập song song.

Tiêu chí chấp nhận và test cũng thuộc công việc dùng skill đơn. Chỉ có các tiêu chí này không có nghĩa là cần `/ralph`. Mỗi lần lặp Ralph chạy toàn bộ quy trình ultrawork và một judge độc lập, nên hãy chọn khi bạn muốn lặp lại quy trình xác minh đó. Vòng lặp có thể dừng khi còn công việc chưa hoàn thành hoặc bị chặn nếu cơ chế bảo vệ áp dụng.

Bảng này hướng dẫn lựa chọn, không phải bộ định tuyến workflow tự động. Agent chính có thể đề xuất cách làm phù hợp; việc đề xuất hoặc giải thích workflow không khởi chạy nó. Lệnh slash chọn workflow một cách tường minh. Khi hook phát hiện từ khóa được bật, việc khớp từ khóa hoặc mẫu đã cấu hình cũng có thể kích hoạt workflow, tùy bộ lọc câu hỏi thông tin. Bộ phát hiện không phân loại số lĩnh vực, kiểm tra kế hoạch đã sẵn sàng hay dùng bảng này làm thuật toán ưu tiên.

Việc đánh giá kế hoạch kế thừa quyền đã được cấp cho task. Agent chỉ hỏi khi thiếu quyết định quan trọng hoặc cần thực hiện hành động ngoài phạm vi đó. Đánh giá mức độ sẵn sàng phát hành không tự cấp quyền xuất bản hoặc triển khai.

---

## Các workflow liên tục {#persistent-workflows}

Workflow liên tục tiếp tục chạy cho đến khi tất cả task hoàn thành. Chúng duy trì trạng thái trong `.agents/state/` và đưa lại ngữ cảnh `[OMA PERSISTENT MODE: ...]` vào mỗi tin nhắn người dùng cho đến khi được vô hiệu hóa tường minh.

Chế độ liên tục chỉ bắt đầu khi có **lời gọi tường minh** — chính tên của workflow (danh sách `explicit` trong `triggers.json`, ví dụ "orchestrate", "ultrawork"/"ulw", "ralph"/"랄프", "work mode"). Các từ khóa trigger khác bên dưới là gợi ý bằng ngôn ngữ tự nhiên: chúng đưa workflow vào dưới dạng gợi ý mà không kích hoạt chế độ liên tục, và không bao giờ kích hoạt khi dòng đầu hoặc dòng cuối của prompt là một câu hỏi kết thúc bằng `?`.

### /orchestrate

**Mô tả:** Thực thi agent song song tự động qua CLI. Workflow spawn subagent bằng CLI, điều phối qua run state và receipt bền vững, giám sát tiến trình và chạy các vòng xác minh.

**Liên tục:** Có. File trạng thái: `.agents/state/orchestrate-state.json`.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Explicit (persistent) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| English | "do everything", "run everything", "everything in parallel", "automate everything" |
| Korean | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japanese | "全部実行", "全部並列で", "自動でやって" |
| Chinese | "编排", "全部执行", "全部并行", "自动处理" |
| Spanish | "ejecutar todo", "todo en paralelo" |
| French | "tout exécuter", "tout en parallèle" |
| German | "alles ausführen", "alles parallel" |
| Portuguese | "executar tudo", "tudo em paralelo" |
| Russian | "выполнить всё", "всё параллельно" |
| Dutch | "alles uitvoeren", "alles parallel" |
| Polish | "wykonaj wszystko", "wszystko równolegle" |

Các từ trần "parallel"/"automate" (và bản dịch của chúng) không phải là trigger: "run the tests in parallel" hay "automate the release notes" là những yêu cầu thông thường, không phải điều phối đa agent.

**Mẫu regex trigger** (ý định + danh sách trắng danh từ, xem [Phát hiện tự động: trường Pattern](#pattern-field-raw-regex)):
| Section | Pattern | Examples that trigger |
|---------|---------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Danh sách trắng danh từ (14): app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Một feature đơn lẻ ("implement the login feature", "로그인 기능 구현해줘") hoặc một thứ đã có sẵn ("make the API faster") không khớp.

**Các bước:**
1. **Bước 0, Chuẩn bị:** Đọc skill coordination, hướng dẫn context-loading và memory protocol. Phát hiện vendor.
2. **Bước 1, Tải/tạo plan:** Kiểm tra `.agents/results/plan-{sessionId}.json` rồi đến `plan-*.json` mới nhất. Nếu không có plan, hoặc plan chưa sẵn sàng để thực thi (task thiếu agent, tier ưu tiên, dependency hoặc acceptance criteria), giao `/plan` inline để tạo plan với cùng session ID. Trình bày plan và dùng lại quyền đã cấp; chỉ hỏi khi thiếu quyết định quan trọng hoặc cần quyền mới trước khi giao.
3. **Bước 2, Khởi tạo session:** Tải `oma-config.yaml`, hiển thị bảng ánh xạ CLI, dùng session ID từ lúc tạo plan hoặc tạo ID mới (`session-YYYYMMDD-HHMMSS`), rồi tạo `orchestrator-session-{sessionId}.md` và `task-board-{sessionId}.md` trong memory store đã cấu hình.
4. **Bước 3, Spawn agent:** Với từng tier ưu tiên (P0 trước, sau đó P1...), spawn agent bằng phương thức phù hợp vendor (subagent native khi runtime hiện tại và vendor đích trùng nhau; `oma agent spawn` cho vendor ngoài hoặc khác vendor). Không vượt quá MAX_PARALLEL.
5. **Bước 4, Giám sát:** Poll file `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` theo run và receipt có cấu trúc, sau đó cập nhật task board. Theo dõi hoàn thành, thất bại và crash.
6. **Bước 5, Xác minh:** Chạy `verify.sh {agent-type} {workspace}` cho mỗi agent hoàn tất. Khi thất bại, spawn lại với ngữ cảnh lỗi (tối đa 2 lần thử). Thất bại lặp lại có thể là lý do để thử các giả thuyết thay thế, nhưng mọi lần thử đều tiêu tốn cùng một ngân sách phục hồi tổng. Giữ lại bằng chứng chưa được giải quyết nếu ngân sách không đủ cho một vòng so sánh.
7. **Bước 6, Thu thập:** Đọc file result theo run và claim có cấu trúc, rồi biên soạn tóm tắt.
8. **Bước 7, Báo cáo cuối:** Trình bày tóm tắt session. Nếu đã chạy thí nghiệm, hãy tóm tắt bằng chứng và các quyết định; chỉ ghi lại bài học khi đã xác lập được nguyên nhân có thể tái sử dụng.

**File đọc:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml``, file progress/result theo run và receipt run có cấu trúc.
**File ghi:** state session/task-board theo run trong memory store đã cấu hình, receipt và claim có cấu trúc, cùng báo cáo cuối.

**Khi sử dụng:** Dự án lớn cần mức song song tối đa cùng điều phối tự động.


### /work

**Mô tả:** Điều phối đa lĩnh vực từng bước. PM lập plan trước, agent thực thi trong phạm vi được cấp quyền, sau đó QA review và khắc phục vấn đề.

**Liên tục:** Có. File trạng thái: `.agents/state/work-state.json`.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Explicit (persistent) | "work mode", "work workflow" |
| Universal | "step by step" |
| English | "one by one", "one step at a time" |
| Korean | "단계별", "하나씩 해줘", "차근차근" |
| Japanese | "ステップバイステップ", "一歩ずつ" |
| Chinese | "逐步", "一步一步" |
| Spanish | "paso a paso", "uno por uno" |
| French | "étape par étape", "un par un" |
| German | "schritt für schritt", "der reihe nach" |

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


### /ultrawork

**Mô tả:** Workflow tập trung vào chất lượng. Có 5 phase, 17 bước tổng cộng và 12 bước review cô lập. Mỗi phase có gate phải đạt trước khi tiếp tục.

**Liên tục:** Có. File trạng thái: `.agents/state/ultrawork-state.json`.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Explicit (persistent) | "ultrawork", "ulw" |
**Phase và bước:**
| Phase | Bước | Agent | Góc nhìn review |
|-------|------|-------|-----------------|
| **PLAN** | 1-4 | PM Agent (inline) | Tính đầy đủ, meta-review, chống over-engineering/đơn giản |
| **IMPL** | 5 | Dev Agent (spawn) | Triển khai |
| **VERIFY** | 6-8 | QA Agent (spawn) | Đồng bộ, an toàn (OWASP), ngăn hồi quy |
| **REFINE** | 9-13 | Refactor Agent (spawn) | Tách file, tái sử dụng, tác động lan truyền, nhất quán, dead code |
| **SHIP** | 14-17 | QA Agent (spawn) | Chất lượng mã (lint/coverage), UX flow, vấn đề liên quan, sẵn sàng triển khai |

**Định nghĩa gate:**
- **PLAN_GATE:** Plan được ghi lại, giả định được liệt kê, phương án thay thế được cân nhắc, review chống over-engineering hoàn tất và phạm vi được cấp quyền.
- **IMPL_GATE:** Check và test không tạo output áp dụng đều pass, chỉ sửa file đã plan, đã ghi bằng chứng baseline cho các thí nghiệm thực sự. Chỉ chạy check build khi được yêu cầu rõ.
- **VERIFY_GATE:** Triển khai khớp yêu cầu, không có CRITICAL/HIGH, không hồi quy, đạt các mục tiêu đo lường áp dụng của project.
- **REFINE_GATE:** Tuân thủ các quy tắc bảo trì của project, cơ hội tích hợp đã được ghi nhận, side effect đã xác minh, code đã dọn và không còn hồi quy chưa giải quyết.
- **SHIP_GATE:** Check chất lượng pass, UX được xác minh, vấn đề liên quan được xử lý, checklist triển khai hoàn tất, đạt các mục tiêu đo lường áp dụng của project với bằng chứng mới nhất. Dùng lại quyền đã cấp; publishing hoặc deployment cần quyền riêng cho hành động đó.

**Ứng xử khi gate thất bại:**
- Lần đầu: quay lại bước liên quan, sửa và thử lại.
- Lần thứ hai cùng vấn đề: đánh giá lại nguyên nhân; nếu các phương án thay thế đáng thử trong ngân sách còn lại, so sánh các thí nghiệm cô lập với hành vi bắt buộc và các chỉ số đã xác định.

**Tăng cường có điều kiện:** So sánh theo chỉ số đã xác định, quyết định và bằng chứng của thí nghiệm, khám phá giả thuyết có ngân sách, và bài học dựa trên nguyên nhân có thể tái sử dụng.

**Điều kiện bỏ qua REFINE:** Task đơn giản dưới 50 dòng.

**Khi sử dụng:** Quy trình review đầy đủ trước khi quyết định kết quả đã sẵn sàng phát hành chưa. Workflow ghi lại check và finding; không tự quyết định mức sẵn sàng production.


### /ralph

**Mô tả:** Vòng lặp thực thi tự tham chiếu liên tục. Bọc ultrawork bằng verifier độc lập kiểm tra tiêu chí hoàn thành sau mỗi lần lặp. Báo cáo hoàn thành đầy đủ khi mọi tiêu chí pass, hoàn thành một phần khi chỉ còn tiêu chí đã pass và bị chặn, hoặc dừng khi safeguard kích hoạt.

**Liên tục:** Có. File trạng thái: `.agents/state/ralph-state.json`.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Explicit (persistent) | "ralph", "랄프" |
| English | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Korean | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japanese | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinese | "不要停", "直到完成", "全部完成", "做完为止" |
| Spanish | "no pares", "hasta completar", "termina todo" |
| French | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| German | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Các cụm từ tiếp tục trần ("keep going", "carry on", "계속해", "続けて", "продолжай", …) không phải là trigger: người dùng gõ chúng để tiếp tục sau khi bị gián đoạn.

**Các phase:**
1. **Phase 0, INIT:** Tải prerequisite (context-loading, memory protocol, judge protocol). Định nghĩa và ghi tiêu chí hoàn thành có thể kiểm chứng bằng máy, chẳng hạn test assertion, type check không tạo output, exit code hoặc sự tồn tại của file. Chỉ thêm check build khi được yêu cầu rõ. Hiển thị tiêu chí và tiếp tục trong phạm vi quyền đã cấp. Khởi tạo session với `max_iterations: 5`.
2. **Phase 1, WORK:** Chạy ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) trong một lần lặp.
3. **Phase 2, JUDGE:** Verifier độc lập đối chiếu từng tiêu chí với trạng thái project thực tế (chạy check được phép và xác minh file tồn tại). Ghi bằng chứng cùng trạng thái PASS, FAIL, REGRESSED hoặc BLOCKED.
4. **Phase 3, DECIDE:** Nếu mọi tiêu chí PASS, báo cáo hoàn thành đầy đủ. Nếu chỉ còn PASS và BLOCKED, báo cáo hoàn thành một phần. Nếu có FAIL hoặc REGRESSED, chuyển ngữ cảnh thất bại vào lần lặp kế tiếp, theo safeguard.
5. **Safeguard:** Dừng loop khi `current_iteration >= max_iterations` (mặc định 5), hoặc khi cùng tiêu chí fail 3 lần liên tiếp với cùng nguyên nhân gốc (phát hiện bị kẹt).

**Khác biệt chính với /ultrawork:** Ultrawork chạy quy trình 5 phase và thử lại khi gate thất bại. Ralph bọc ultrawork trong loop retry với judge độc lập đánh giá khách quan việc hoàn thành. Loop kết thúc bằng báo cáo hoàn thành đầy đủ, báo cáo một phần cho công việc bị chặn hoặc báo cáo safeguard.

**File đọc:** `.agents/workflows/ralph/resources/judge-protocol.md`` và toàn bộ file ultrawork.
**File ghi:** `session-ralph.md` trong memory, log từng lần lặp và báo cáo cuối.

**Khi sử dụng:** Khi bạn yêu cầu rõ việc thực thi lặp lại và xác minh độc lập theo tiêu chí hoàn thành có thể kiểm chứng bằng máy. Chỉ có test không bắt buộc Ralph; cần tính toàn bộ quy trình ultrawork và safeguard trong mỗi lần lặp.


## Workflow không liên tục

### /plan

**Mô tả:** Phân tách task do PM dẫn dắt. Phân tích yêu cầu, chọn tech stack, chia thành task có ưu tiên và dependency, định nghĩa API contract.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "task breakdown" |
| English | "plan" |
| Korean | "계획", "요구사항 분석", "스펙 분석" |
| Japanese | "計画", "要件分析", "タスク分解" |
| Chinese | "计划", "需求分析", "任务分解" |

**Các bước:** Thu thập yêu cầu → phân tích khả thi kỹ thuật (MCP code analysis) → đánh giá độ phức tạp (Simple/Medium/Complex) → định nghĩa API contract nếu vượt ranh giới → phân rã thành task → review với người dùng → lưu artifact plan (JSON machine-readable và tracker Markdown human-readable cho Medium/Complex).

**Đầu ra:** `.agents/results/plan-{sessionId}.json`, ghi memory và với Medium/Complex là `docs/plans/work/{NNN}-{name}.md` có bảng task, decision log, progress notes. Vòng đời theo dõi bằng field `Status` trong header Markdown (`Active` → `Completed`); plan không chuyển giữa thư mục. Design tạo bởi `/brainstorm` nằm tại `docs/plans/designs/{NNN}-{name}.md`.

**Thực thi:** Inline, không spawn subagent. `/orchestrate` hoặc `/work` tiêu thụ plan và cập nhật field task/status trong lúc thực thi.


### /brainstorm

**Mô tả:** Ideation ưu tiên thiết kế. Khám phá ý định, làm rõ ràng buộc, đề xuất các hướng và tạo tài liệu thiết kế được duyệt trước khi lập plan.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "brainstorm" |
| English | "ideate", "explore design" |
| Korean | "브레인스토밍", "아이디어", "설계 탐색" |
| Japanese | "ブレインストーミング", "アイデア", "設計探索" |
| Chinese | "头脑风暴", "创意", "设计探索" |

**Các bước:** Khám phá ngữ cảnh dự án (MCP analysis) → hỏi câu làm rõ, mỗi lần một câu → đề xuất 2-3 hướng cùng đánh đổi → trình bày design theo từng phần, mỗi bước có người dùng duyệt → lưu design tại `docs/plans/designs/{NNN}-{name}.md` → chuyển tiếp bằng gợi ý `/plan`.

**Quy tắc:** Không triển khai hoặc lập plan trước khi design được duyệt. Không xuất code. Áp dụng YAGNI.


### /architecture

**Mô tả:** Workflow kiến trúc phần mềm chẩn đoán vấn đề, chọn phương pháp phân tích phù hợp (diagnostic routing / design-twice / ATAM / CBAM / ADR), so sánh phương án, tổng hợp ý kiến liên quan và tạo recommendation, review hoặc ADR.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "architecture", "ADR", "ATAM", "CBAM" |
| English | "architecture review", "architectural tradeoff" |
| Korean | "아키텍처", "설계 검토" |
| Japanese | "アーキテクチャ" |
| Chinese | "架构" |

**Các bước:** Định khung quyết định (kiến trúc mới / review / phân tích đánh đổi / ưu tiên đầu tư / viết ADR) → chọn methodology qua diagnostic routing → phân tích kiến trúc hiện tại qua MCP code analysis (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) → tổng hợp stakeholder input chỉ khi đủ cross-cutting để biện minh chi phí → tạo recommendation với assumption, tradeoff, risk và bước validation rõ ràng → bàn giao `/plan` khi cần triển khai.

**Quy tắc:** Không viết code triển khai hoặc task plan trong workflow này. Bàn giao `/plan` sau quyết định kiến trúc. Luôn dùng MCP tools; không thay thế bằng đọc file thô hoặc grep.

**Khi sử dụng:** Chọn kiến trúc hệ thống, quyết định ranh giới module/service/ownership, ưu tiên refactor, viết ADR, điều tra vấn đề kiến trúc (change amplification, dependency ẩn, API khó dùng).


### /deepinit

**Mô tả:** Khởi tạo project đầy đủ. Phân tích codebase hiện có, tạo AGENTS.md, ARCHITECTURE.md và knowledge base `docs/` có cấu trúc.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "deepinit" |
| Korean | "프로젝트 초기화" |
| Japanese | "プロジェクト初期化" |
| Chinese | "项目初始化" |

**Các bước:** Chuẩn bị → phân tích codebase (loại project, kiến trúc, rule ngầm, domain, boundary) → tạo ARCHITECTURE.md (domain map, dưới 200 dòng) → tạo knowledge base `docs/` (design-docs/, plans/, generated/, product-specs/, references/, domain docs) → tạo AGENTS.md gốc (~100 dòng, mục lục) → tạo AGENTS.md boundary cho package monorepo (mỗi file dưới 50 dòng) → cập nhật harness hiện có nếu chạy lại → xác minh không dead link và đúng giới hạn dòng.

**Đầu ra:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md và tài liệu theo domain được phát hiện.


### /review

**Mô tả:** Pipeline QA đầy đủ gồm audit bảo mật (OWASP Top 10), phân tích hiệu suất, kiểm tra accessibility (WCAG 2.1 AA) và review chất lượng mã.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "code review", "security audit", "security review" |
| English | "review" |
| Korean | "리뷰", "코드 검토", "보안 검토" |
| Japanese | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinese | "审查", "代码审查", "安全审计" |

**Các bước:** Xác định phạm vi review → check bảo mật tự động (npm audit, bandit) → review bảo mật thủ công (OWASP Top 10) → phân tích hiệu suất → review accessibility (WCAG 2.1 AA) → review chất lượng mã → tạo QA report.

**Vòng lặp sửa-xác minh tùy chọn** (với `--fix`): Sau QA report, spawn agent lĩnh vực để sửa vấn đề CRITICAL/HIGH, chạy lại QA và lặp tối đa 3 lần.

**Ủy quyền:** Với phạm vi lớn, ủy quyền Bước 2-7 cho subagent QA đã spawn.


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


### /debug

**Mô tả:** Chẩn đoán và sửa bug có cấu trúc, viết regression test và quét pattern tương tự.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "debug" |
| English | "fix bug", "fix error", "fix crash" |
| Korean | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japanese | "デバッグ", "バグ修正", "エラー修正" |
| Chinese | "调试", "修复 bug", "修复错误" |

**Các bước:** Thu thập thông tin lỗi → tái hiện (MCP `search_for_pattern`, `find_symbol`) → chẩn đoán nguyên nhân gốc (MCP `find_referencing_symbols` để lần theo execution path) → đề xuất sửa tối thiểu (cần người dùng xác nhận) → áp dụng sửa + viết regression test → quét pattern tương tự (có thể spawn subagent debug-investigator nếu phạm vi > 10 file) → ghi bug vào memory.

**Điều kiện spawn subagent:** Lỗi trải trên nhiều domain, phạm vi scan > 10 file hoặc cần trace dependency sâu.


### /design

**Mô tả:** Workflow thiết kế 7 phase tạo DESIGN.md với token, pattern component và rule accessibility.

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "design system", "DESIGN.md", "design token" |
| English | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Korean | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japanese | "デザイン", "ランディングページ", "デザインシステム" |
| Chinese | "设计", "着陆页", "设计系统" |

**Các phase:** SETUP (thu thập context, `.design-context.md`) → EXTRACT (tùy chọn, từ URL tham chiếu/Stitch) → ENHANCE (khuếch đại prompt mơ hồ) → PROPOSE (2-3 hướng design với màu, typography, layout, motion, component) → GENERATE (DESIGN.md + token CSS/Tailwind/shadcn) → AUDIT (responsive, WCAG 2.2, heuristic Nielsen, kiểm tra AI slop) → HANDOFF (lưu và thông báo người dùng).

**Bắt buộc:** Mọi output responsive-first (mobile 320-639px, tablet 768px+, desktop 1024px+).


### /scm

**Mô tả:** Tạo Conventional Commits với tự động tách theo tính năng.

### /tools

**Mô tả:** Quản lý khả năng hiển thị và hạn chế công cụ MCP.

### /convert

**Mô tả:** Chuyển đổi file từ định dạng này sang định dạng khác, định tuyến theo loại media. **Tài liệu** (PDF qua `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML qua `kordoc`/`oma-hwp`) trích xuất sang Markdown. File **hình ảnh**, **video** và **âm thanh** transcode sang định dạng đích qua `ffmpeg` (đã được cấp sẵn cho `oma-video`).

**Từ khóa trigger:** Không (gọi tường minh với đường dẫn file đầu vào).

**Các bước:** Xác minh đầu vào & định tuyến theo loại (tài liệu `.pdf`/`.hwp*`; hình ảnh `.jpg`/`.png`/`.webp`/…; video `.mp4`/`.mov`/…; âm thanh `.mp3`/`.wav`/…) -> Xác định định dạng đích (tài liệu mặc định = Markdown; media = `--to` tường minh) -> Chuyển đổi (PDF: `uvx opendataloader-pdf`, PDF quét dùng OCR hybrid; HWP: `bunx kordoc@latest`; media: `ffmpeg`) -> Chuẩn hóa tài liệu (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> Xác minh (đọc Markdown / `ffprobe` media) -> Báo cáo định dạng nguồn→đích và mọi lựa chọn chất lượng/codec.

**Quy tắc:** Định tuyến theo loại — không bao giờ chạy bộ chuyển đổi tài liệu trên file media hoặc ngược lại. Vị trí đầu ra mặc định là cùng thư mục với file đầu vào. Báo cáo lựa chọn chất lượng/codec cho media (transcode không phải không mất mát). Không bao giờ bỏ qua bước. Ngôn ngữ phản hồi theo `.agents/oma-config.yaml`.

**Khi dùng:** Chuyển đổi tài liệu PDF hoặc dòng HWP của Hàn Quốc sang Markdown cho ngữ cảnh LLM/RAG, hoặc transcode hình ảnh (jpg→webp/png), video (mov→mp4, mp4→gif) và âm thanh (wav→mp3) giữa các định dạng.

---

### /stack-set

**Mô tả:** Tự phát hiện tech stack dự án và tạo tham chiếu theo ngôn ngữ cho skill backend.

---

### /docs

**Mô tả:** Phát hiện drift tài liệu và đồng bộ qua oma-docs. Verify tìm broken ref trong toàn bộ Markdown; `sync` đề xuất patch cho tài liệu bị ảnh hưởng bởi `git diff`. Chạy inline, không spawn subagent.

**Từ khóa trigger:** Universal: oma-docs, docs `verify`, docs sync; English: verify docs, check docs, docs drift, broken doc links, stale docs, sync docs, patch docs; Korean, Japanese và Chinese có từ khóa tương ứng.

<!-- oma-docs:ignore-start -->
**Các bước:** Chọn verify hoặc sync, preflight, chạy lệnh docs, tổng hợp theo host-LLM contract, trình bày patch sync để người dùng chọn và tạo lại index khi apply.

**Quy tắc:** Không tự apply patch; không sửa `.agents/`. Nếu thiếu `oma docs`, in gợi ý cài đặt và thoát.

### /recap

**Mô tả:** Tóm tắt công việc theo ngày hoặc giai đoạn qua `oma-recap` và lưu TL;DR.

**Từ khóa trigger:** Universal recap, Korean 리캡, Japanese リキャップ.

**Các bước:** Resolve `daily` hoặc `period`, lọc tool khi được nêu rõ, preflight, chạy recap JSON, lưu theo contract của skill và báo path.

### /video

**Mô tả:** Điều khiển skill `oma-video` từ đầu đến cuối: brief → script → narration → visuals → captions → render-spec → compositor HyperFrames được quản lý (hoặc MoneyPrinterTurbo). Workflow tạo một run directory có thể tái lập và chỉ xuất `.mp4` thật sau khi kiểm tra compositor và ffprobe đều pass. Cấu hình provider không bắt buộc key đối với các fallback asset được hỗ trợ; lỗi compositor hoặc toolchain vẫn là một run thất bại. Chạy inline (không spawn subagent).

**Từ khóa trigger:**
| Language | Keywords |
|----------|----------|
| Universal | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| English | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Korean | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japanese | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chinese | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Các bước:**
1. **Resolve brief và mode:** Chọn `shorts` (9:16), `explainer` (16:9) hoặc `demo` (screen/web capture); áp dụng mode mặc định, có thể ghi đè bằng flag.
2. **Soạn script:** Tạo scene + narration (dùng LLM khi có key, nếu không thì dùng outline xác định từ brief).
3. **Tổng hợp asset:** Narration qua `oma-voice`, visuals qua `oma-image`/`oma-slide`/stock, căn caption không cần key, hoặc web capture bằng browser có giám sát cho `demo --source web`. Mỗi provider đều lùi về một fallback xác định.
4. **Dựng render-spec:** Ghi `render-spec.json` (determinism boundary) cùng asset vào run directory.
5. **Render:** Spawn project HyperFrames được quản lý (hoặc MoneyPrinterTurbo) làm subprocess. Lỗi compositor hoặc toolchain thông thường làm run thất bại; placeholder xác định chỉ có qua đường mock/test tường minh (`OMA_VIDEO_MOCK=1`). Live capture được ghi là `nondeterministic` trong manifest.

**Đầu ra:** Một run directory tại `.agents/results/videos/{timestamp}-{shortid}-{mode}/` gồm `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` và `manifest.json`. Xem [hướng dẫn tạo video](../guide/video-generation.md).

### `/schedule`

**Mô tả:** Đăng ký và quản lý job theo thời gian bằng oma schedule action, registry toàn cục và scheduler native của OS.

**Từ khóa trigger:** Không có, chỉ gọi bằng slash.

**Các bước:** Resolve add/list/remove/sync, parse cron hoặc every, tạo job, kiểm tra drift manifest × OS và báo thời gian fire tiếp theo.

### `/explain`

**Mô tả:** Điều khiển `oma-explanation` để biến diff, PR, branch hoặc commit range thành explainer HTML tự chứa gồm Background, Intuition, Code và Quiz.

**Từ khóa trigger:** Không có, chỉ gọi bằng slash vì explain là từ thông dụng.

**Các bước:** Resolve target ref, level `onboarding` hoặc `reviewer`, tải contract, scan secret, tạo và validate HTML với tối đa 3 vòng sửa, rồi deliver.

<!-- oma-docs:ignore-end -->

**Đầu ra:** Artifact explain HTML theo ngày và slug. Xem [hướng dẫn giải thích code](../guide/code-explainer.md).






**Tham chiếu kỹ thuật giữ nguyên:** Các path, flag, command, placeholder và tên định danh sau đây được giữ nguyên để đối chiếu với CLI: `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>`, `**/*.md`, `--budget-minutes <n>`, `--cron`, `--date YYYY-MM-DD`, `--every`, `--gate typecheck|test|lint`, `--temp`, `--tool`, `--window 7d`, `--window Nd`, `.agents/hooks/core/keyword-detector.ts`, `.agents/hooks/core/persistent-mode.ts`, `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`, `.agents/results/recap/{date}.md`, `.agents/results/recap/{start}~{end}.md`, `.agents/results/videos/{timestamp}-{shortid}-{mode}/`, `.agents/skills/oma-backend/stack/`, `.agents/skills/oma-mobile/stack/`, `.agents/workflows/ralph/resources/judge-protocol.md`, `.xcodeproj`, `0`, `30d`, `<hookDir>/oma-hook.sh --vendor <v> --event <e>`, `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)`, `HEAD~1..HEAD`, `OMA_VIDEO_MOCK=1`, `Package.swift`, `[y]`, `[y] apply [n] skip [d] show diff [s] show full proposal`, `audio/`, `bunx kordoc@latest`, `captions.{srt,vtt}`, `changedFiles`, `command -v oma`, `demo --source web`, `docs/generated/doc-refs.json`, `docs/generated/url-drift.json`, `excludedWorkflows`, `git add -A`, `grok, claude, codex, qwen, cursor, antigravity`, `manifest.json`, `nondeterministic`, `oma`, `oma docs sync --json`, `oma docs verify --json`, `oma goal set`, `oma hook run`, `oma recap`, `oma recap --json`, `oma schedule <action>`, `oma schedule create`, `oma schedule list`, `oma-image`, `oma-slide`, `oma-voice`, `open`, `package.json`, `pubspec.yaml`, `render-spec.json`, `resources/`, `scm.co_author`, `script.json`, `stack/`, `stack/api-template.*`, `stack/snippets.md`, `stack/stack.yaml`, `stack/tech-stack.md`, `timing.json`, `url-drift.json`, `uvx mdformat`, `uvx opendataloader-pdf`, `visuals/`, `{composition}.mp4`, `~/.agents/schedule/`.

## Skill so với workflow

| Khía cạnh | Skill | Workflow |
|--------|--------|-----------|
| **Là gì** | Chuyên môn agent (agent biết gì) | Quy trình điều phối (agent làm việc cùng nhau thế nào) |
| **Vị trí** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Kích hoạt** | Tự động qua từ khóa định tuyến skill | Lệnh slash hoặc từ khóa trigger |
| **Phạm vi** | Thực thi đơn lĩnh vực | Nhiều bước, thường đa agent |
| **Ví dụ** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Phát hiện tự động: cách hoạt động

### Hệ thống hook

oh-my-agent dùng hook `UserPromptSubmit` chạy trước mỗi tin nhắn người dùng được xử lý:

1. **`triggers.json`**: Định nghĩa ánh xạ từ khóa-workflow cho 11 ngôn ngữ được hỗ trợ.
2. **`keyword-detector.ts`**: Logic TypeScript quét đầu vào người dùng so với từ khóa trigger của mọi ngôn ngữ và đưa ngữ cảnh kích hoạt workflow vào.
3. **`persistent-mode.ts`**: Áp dụng thực thi workflow liên tục bằng cách kiểm tra file trạng thái đang hoạt động.

### Luồng phát hiện

1. Bạn nhập đầu vào ngôn ngữ tự nhiên
2. Hook kiểm tra xem có lệnh `/command` tường minh hay không (nếu có, bỏ qua phát hiện để tránh trùng lặp)
3. Hook làm sạch đầu vào (loại bỏ code block, chuỗi trích dẫn, các khối system-echo đã dán) rồi quét so với `.agents/hooks/core/triggers.json` — cả danh sách keyword (cụm từ literal) và `patterns` (regex thô). Một lớp bảo vệ tăng cường ngăn chặn việc kích hoạt lại nếu cùng một workflow đã trigger từ 2 lần trở lên trong 60 giây gần nhất.
4. Nếu tìm thấy khớp, kiểm tra xem đầu vào có khớp các mẫu thông tin hay không
5. Nếu mang tính thông tin (ví dụ: "what is orchestrate?"), lọc ra — không workflow nào được kích hoạt
6. Nếu mang tính hành động, đưa `[OMA WORKFLOW: {workflow-name}]` vào ngữ cảnh. Khi nhiều workflow cùng khớp, lời gọi tường minh thắng, sau đó đến từ khóa dài nhất
7. Với workflow liên tục, chỉ lời gọi tường minh (`explicit` trong `triggers.json`) mới ghi file trạng thái chế độ liên tục; một match bằng ngôn ngữ tự nhiên được đưa vào dưới dạng gợi ý, và prompt kết thúc bằng câu hỏi (`?` ở dòng đầu hoặc dòng cuối) hoàn toàn không kích hoạt nó
8. Agent đọc tag được đưa vào và tải file workflow tương ứng từ `.agents/workflows/`

### Quy ước section ngôn ngữ

`.agents/hooks/core/triggers.json` dùng cấu trúc section theo ngôn ngữ cho `keywords`, `patterns` và `informationalPatterns`:

| Section | Hành vi |
|---------|----------|
| `*` | Chung. Dùng cho nội dung tiếng Anh (ngôn ngữ chung) và token thực sự xuyên ngôn ngữ (ví dụ tên workflow `"orchestrate"`). |
| `en` | Tiếng Anh. Tương đương về chức năng với `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Cách diễn đạt theo ngôn ngữ. |

Mọi section đều luôn được tải: người dùng viết prompt bằng ngôn ngữ họ nghĩ, và cài đặt `language` trong `.agents/oma-config.yaml` chỉ điều khiển ngôn ngữ phản hồi. Một keyword viết bằng một ngôn ngữ chỉ có thể khớp với prompt chứa đúng chữ viết đó, nên việc gộp mọi section không thể kích hoạt nhầm trên các prompt không liên quan.

Ranh giới từ chỉ phụ thuộc vào chính keyword, không bao giờ phụ thuộc vào `language`: keyword ASCII chỉ khớp nguyên từ (nên "work" không khớp "network", và "review" không khớp "preview"), còn keyword chứa văn bản không phải ASCII khớp như chuỗi con vì trợ từ và biến tố CJK gắn trực tiếp vào từ ("리뷰해줘").

### Trường pattern (regex thô) {#pattern-field-raw-regex}

Ngoài `keywords` literal, mỗi workflow có thể khai báo `patterns` — chuỗi regex thô được biên dịch với cờ `iu`. Pattern cho phép khớp intent đa token mà nếu không sẽ yêu cầu danh sách keyword tổ hợp.

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
- Chuỗi được biên dịch trực tiếp — escape backslash một lần cho JSON, một lần cho regex (`\\b`, `\\s+`)
- Không tự động bọc word-boundary — tác giả pattern tự xử lý `\b`
- Regex không hợp lệ bị bỏ qua âm thầm khi runtime (hiển thị tại thời điểm chỉnh sửa config qua test thất bại)

### Lọc mẫu thông tin

Section `informationalPatterns` của `.agents/hooks/core/triggers.json` định nghĩa các cụm từ chỉ ra câu hỏi thay vì lệnh. Được kiểm tra trong cửa sổ 60 ký tự xung quanh mỗi khớp workflow tiềm năng:

| Section | Ví dụ pattern |
|---------|----------------------|
| `*` (chung tiếng Anh) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Nếu đầu vào khớp cả trigger workflow và mẫu thông tin, mẫu thông tin được ưu tiên và không workflow nào được kích hoạt. Đây là điều chặn các prompt như:
- `"How do you build a TODO app?"` — `how do` trong `*` chặn regex intent orchestrate
- `"orchestrate 트리거 해주면 되나요?"` — `트리거` trong `ko` chặn keyword orchestrate

### Workflow loại trừ

Các workflow sau bị loại trừ khỏi phát hiện tự động và phải được gọi bằng `/command` tường minh:
- /scm
- `/tools`
- `/stack-set`
- /exec-plan
- `/convert`

---

## Cơ chế chế độ liên tục {#persistent-mode-mechanics}

### File trạng thái

Workflow liên tục (orchestrate, ultrawork, work, ralph) tạo file trạng thái trong `.agents/state/` khi được gọi tường minh (xem [Các workflow liên tục](#persistent-workflows)):

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

### Tăng cường

Trong khi workflow liên tục đang hoạt động, hook `persistent-mode.ts` đưa `[OMA PERSISTENT MODE: {workflow-name}]` vào mỗi tin nhắn người dùng. Đảm bảo workflow tiếp tục thực thi xuyên các lượt hội thoại.

### Hợp đồng mục tiêu (cổng dừng tùy chọn + ngân sách)

oma goal set gắn contract hoàn thành cơ học vào workflow liên tục. Gate typecheck, test hoặc lint chỉ cho kết thúc khi script tương ứng pass; budget-minutes vô hiệu hóa workflow khi vượt wall-clock budget. Không có contract, chế độ liên tục hoạt động như mô tả phía trên. Xem `goal set` trong [tham chiếu CLI](../cli-interfaces/commands.md#goal-set).

### Vô hiệu hóa

Để vô hiệu hóa workflow liên tục, người dùng nói "workflow done" (hoặc tương đương trong ngôn ngữ đã cấu hình). Thao tác này xóa file trạng thái, dừng đưa ngữ cảnh chế độ liên tục và trở về hoạt động bình thường.

---

## Chuỗi workflow điển hình

### Tính năng đơn lĩnh vực
```
Describe the task → relevant skill → implement → focused verification
```

### Dự án đa lĩnh vực phức tạp
```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### Tự động triển khai song song
```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### Phân phối chất lượng tối đa
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Điều tra lỗi
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Pipeline từ thiết kế đến triển khai
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### Khởi tạo codebase mới

```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### Lặp lại thực thi với xác minh độc lập
```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
