---
title: Tại sao chọn oh-my-agent
description: Định vị oh-my-agent trong danh mục multi-agent CLI đã bão hòa. Trục chi phí đã dịch từ implementation sang test và maintenance; oh-my-agent đáp lại bằng quality gates, xác minh độc lập, multi-vendor dispatch và tùy biến repo-native.
---

# Tại sao chọn oh-my-agent

Danh mục multi-agent CLI đã bão hòa. Chỉ trong quý vừa qua đã có hơn hai mươi multi-agent orchestrator xuất hiện: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy và những công cụ khác. Hầu hết tối ưu cùng một trục — làm cho agent viết code nhanh hơn.

oh-my-agent tối ưu trục khác. Giả định khởi đầu là khi có model đủ năng lực, chi phí phân tích, thiết kế và implementation trong SDLC đang tiến về 0. Phần đắt đỏ của phát triển phần mềm xưa nay vẫn là test và maintenance — giữ hệ thống chạy, an toàn và dễ hiểu sau commit đầu tiên. oh-my-agent được thiết kế quanh trục đó.

Trang này cụ thể hóa định vị đó. Để xem thảo luận dài đã sinh ra khung này, xem [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## Trục chi phí đã dịch

Khi một model đủ năng lực có thể sản xuất một feature hoạt động trong vài phút, nút thắt không còn là throughput implementation nữa. Nút thắt trở thành: xác minh code được sản xuất ra có thực sự làm điều nó tuyên bố hay không, bắt regression im lặng giữa các iteration, giữ secret bên ngoài prompt và log, và làm cho chi phí token nhìn thấy được trước khi nó bất ngờ với team.

Một harness chỉ spawn agent nhanh hơn không giải quyết được điều nào trong số đó. Một harness được thiết kế cho giai đoạn sau implementation thì có.

---

## Cái oh-my-agent mang lại cho trung tâm chi phí thực sự

Mỗi khả năng dưới đây đáp lại một chế độ thất bại cụ thể đã được báo cáo trong danh mục multi-agent CLI.

### Xác minh độc lập, không phải LLM tự đánh giá

`oma verify <agent>` chạy mười bốn kiểm tra xác định theo từng loại agent. Tất cả là kiểm tra cơ học: exit code của lệnh test, TypeScript strict pass, phát hiện pattern raw SQL, quét secret hardcode, Flutter analyze, quét inline style, scope violation đối với charter của agent. Không có LLM nào phán xét xem công việc "trông có đúng không". Một kiểm tra pass khi và chỉ khi lệnh nền báo cáo thành công.

Điều này đáp lại lời than phiền phổ biến nhất trong danh mục, được tóm tắt trong một bài viết cộng đồng là "agents lie - they say tests pass when tests do not". Xem `cli/commands/verify/verify.ts` để biết danh sách kiểm tra.

### Tái xác minh qua các iteration

Workflow `ralph` bao bọc `ultrawork` bằng một pha JUDGE độc lập. Sau mỗi iteration, JUDGE tái xác minh mọi criterion — kể cả những cái đã pass ở iteration trước. Điều này bắt được trường hợp khi sửa C2 lặng lẽ phá vỡ C1, đó là cơ chế thực sự đằng sau hầu hết regression trong các session agent dài.

Verification nặng (hơn ba mươi giây) được cache theo đường dẫn file bị ảnh hưởng, để tái xác minh vẫn rẻ. Xem `.agents/workflows/ralph/resources/judge-protocol.md` cho protocol đầy đủ.

### Quota cap chặn trước khi tổn hại

Mỗi lần gọi `oma agent spawn` ghi lại ước tính token của spawn đó vào `.serena/memories/session-cost-{sessionId}.md`. Trước spawn tiếp theo, `checkCap` tham vấn quota cap đã cấu hình và từ chối khởi chạy nếu bất kỳ chiều nào vượt quá. Ba chiều được áp dụng: tổng token, tổng số spawn, ngân sách token theo vendor.

Đây là sự khác biệt giữa biết sau khi đã tiêu bốn mươi nghìn đô và được báo ở spawn thứ mười lăm rằng còn một spawn trong ngân sách. Xem `cli/io/session-cost.ts` và cấu hình dưới `session.quota_cap` trong `.agents/oma-config.yaml`.

### Retry rồi explore, không phải retry mãi mãi

Khi `orchestrate` Step 5 phát hiện thất bại verification, nó thử lại agent tối đa hai lần với context lỗi. Nếu retry thứ hai vẫn thất bại và cost cap chưa vượt, workflow chuyển sang Exploration Loop: spawn song song hai hoặc ba biến thể hypothesis thay thế trong các workspace riêng và giữ lại chỉ kết quả có điểm cao nhất. Các cách tiếp cận thất bại bị loại bỏ với chi phí được ghi lại.

Đây là một câu trả lời có cấu trúc cho trường hợp một cách tiếp cận về cơ bản là sai. Thử lại cùng cái đó không bao giờ hội tụ; thử các cách tiếp cận khác nhau song song thì hội tụ.

### Routing workspace có nhận thức monorepo

`detectWorkspace` đọc cấu hình pnpm, nx, turbo và lerna và route mỗi agent đến sub-workspace tương ứng tự động. Backend agent chạy đối với `apps/api/`, frontend agent đối với `apps/web/`, mà orchestrator không phải tự ghép đường dẫn. Xem `cli/io/workspaces.ts`.

---

## Multi-vendor không phải tùy chọn

Giả định thiết kế thứ hai là bất kỳ team nào làm phát triển hỗ trợ bởi AI một cách nghiêm túc đều dùng nhiều hơn một nhà cung cấp. Hôm nay điều đó nghĩa là Claude, Codex, Gemini, Copilot, Qwen, Kimi và bất kỳ thứ gì ra mắt quý tới. Đổi vendor là sự thật, không phải edge case — Anthropic chuyển tính năng agent sang plan trả phí riêng, OpenAI phát hành Codex CLI cùng tuần model Anthropic suy giảm, GitHub Copilot chuyển sang consumption-based pricing.

oh-my-agent xử lý lựa chọn vendor như cấu hình per-agent qua `model_preset` và `agents.<id>.model` trong `.agents/oma-config.yaml`. Thư mục `.agents/` có thể mang theo là single source of truth; mỗi runtime được hỗ trợ chiếu từ đó. Không cần vendor lock-in để dùng oh-my-agent, và không cần migration khi đổi.

---

## Tùy biến repo-native

Giả định thứ ba là không có hai team nào chia sẻ cùng định nghĩa "done". Một team yêu cầu quét OWASP Top 10 ở mỗi thay đổi backend. Team khác yêu cầu báo cáo QA bằng tiếng Hàn. Team thứ ba yêu cầu mọi migration phải được review bởi database agent trước merge.

Vì `.agents/` chỉ là các file trong repository, mỗi team có thể thêm hoặc sửa agent, skill, workflow và quality gate cho phù hợp với code of conduct và tư thế compliance riêng. Tùy biến là một `git commit`, không phải ticket support của vendor.

---

## Điều này có nghĩa gì trong thực tế

Nếu ưu tiên của bạn là "spawn agent song song nhanh", nhiều công cụ phủ bề mặt đó. Nếu ưu tiên của bạn là "giao code vẫn chạy sau khi agent rời phòng", oh-my-agent được xây cho mục tiêu cụ thể đó. `oma verify`, JUDGE, Exploration Loop, quota cap và routing monorepo không phải add-on tùy chọn — chúng là lý do dự án này tồn tại.

Để biết chi tiết về từng khả năng, xem mục Core Concepts (Agents, Parallel Execution) trong sidebar.
