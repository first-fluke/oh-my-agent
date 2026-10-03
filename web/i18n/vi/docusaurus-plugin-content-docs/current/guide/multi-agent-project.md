---
title: "Hướng dẫn: Dự án nhiều agent"
sidebar_label: Dự án nhiều agent
description: Hướng dẫn đầy đủ để điều phối nhiều agent thuộc frontend, backend, database, mobile và QA từ lập kế hoạch đến merge.
---

# Hướng dẫn: Dự án nhiều agent

## Khi nào dùng điều phối nhiều agent

Tính năng có thể trải qua nhiều lĩnh vực: API backend, UI frontend, schema database, client mobile và review QA. Một agent không thể bao quát toàn bộ phạm vi, nên các lĩnh vực cần tiến hành song song mà không sửa chồng file.

Điều phối nhiều agent phù hợp khi:

- Tác vụ liên quan đến từ 2 lĩnh vực trở lên, chẳng hạn frontend, backend, mobile, db, QA, debug hoặc pm.
- Có API contract giữa các lĩnh vực, ví dụ endpoint REST được web và mobile cùng dùng.
- Muốn chạy song song để giảm thời gian thực.
- Cần review QA sau triển khai trên toàn bộ các lĩnh vực.

Nếu tác vụ hoàn toàn nằm trong một lĩnh vực, hãy gọi trực tiếp agent chuyên trách.

---

## Chuỗi đầy đủ: /plan đến /review

Workflow nhiều agent được khuyến nghị đi theo pipeline bốn bước nghiêm ngặt.

### Bước 1: /plan cho yêu cầu và phân tách tác vụ

Workflow `/plan` chạy inline, không spawn subagent, và tạo kế hoạch có cấu trúc.

```
/plan
```


Điều gì xảy ra:

1. **Thu thập yêu cầu:** Agent PM hỏi về user mục tiêu, tính năng cốt lõi, ràng buộc và mục tiêu triển khai.
2. **Phân tích khả thi kỹ thuật:** Dùng provider code-intelligence đã cấu hình để quét codebase, tìm code có thể tái sử dụng và pattern kiến trúc. Native search chỉ dành cho path nằm ngoài project hoặc path bị ignore.
3. **Định nghĩa API contract:** Thiết kế contract endpoint gồm method, path, schema request/response, auth và lỗi; lưu vào `.agents/results/api-contracts/` (run artifact), rồi đưa spec lâu dài vào `docs/plans/contracts/` khi commit.
4. **Phân tách tác vụ:** Chia dự án thành các tác vụ có thể thực hiện, mỗi tác vụ có agent, title, tiêu chí chấp nhận, priority (P0-P3) và dependency.
5. **Review kế hoạch với user:** Trình bày toàn bộ plan để xác nhận. Workflow không tiếp tục nếu chưa được user chấp thuận.
6. **Lưu plan:** Ghi plan đã duyệt vào `.agents/results/plan-{sessionId}.json` và lưu tóm tắt vào memory.

File `.agents/results/plan-{sessionId}.json` là input của cả `/work` và `/orchestrate`.

### Bước 2: /work hoặc /orchestrate để thực thi

Có hai đường thực thi:

| Khía cạnh | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Tương tác** | Interactive, user xác nhận ở mỗi giai đoạn | Tự động, chạy đến hoàn thành |
| **Lập kế hoạch PM** | Tích hợp sẵn, Step 2 chạy agent PM | Tải plan nếu có, nếu không thì tạo inline |
| **Điểm kiểm user** | Sau review plan ở Step 3 | Plan inline vẫn đi qua review gate trước khi fan-out |
| **Chế độ persistent** | Có, không thể kết thúc trước khi hoàn tất | Có, không thể kết thúc trước khi hoàn tất |
| **Phù hợp nhất** | Lần đầu hoặc dự án phức tạp cần giám sát | Chạy lặp với tác vụ đã rõ |

#### /work: pipeline nhiều agent tương tác

```
/work
```


1. Phân tích yêu cầu và nhận diện lĩnh vực liên quan.
2. Chạy agent PM để phân tách tác vụ và tạo `plan-{sessionId}.json`.
3. Trình bày plan để user xác nhận. **Chặn cho đến khi xác nhận.**
4. Spawn agent theo tier priority, P0 trước rồi P1; các tác vụ cùng priority chạy song song.
5. Theo dõi tiến độ qua file memory.
6. Chạy review QA trên toàn bộ deliverable, gồm OWASP Top 10, hiệu suất, accessibility và chất lượng code.
7. Nếu QA có CRITICAL hoặc HIGH, spawn lại agent phụ trách kèm phát hiện QA, tối đa 2 lần cho mỗi issue. Nếu issue vẫn tồn tại, kích hoạt **Exploration Loop**: tạo 2 đến 3 giả thuyết, spawn cùng loại agent với prompt khác trong workspace riêng, để QA chấm và nhận kết quả tốt nhất.

#### /orchestrate: thực thi song song tự động

```
/orchestrate
```


1. Tải `.agents/results/plan-{sessionId}.json`, hoặc tạo plan inline qua `/plan` khi chưa có file dùng được.
2. Khởi tạo session theo định dạng `session-YYYYMMDD-HHMMSS`.
3. Tạo `orchestrator-session.md` và `task-board.md` trong thư mục memory.
4. Spawn agent theo tier priority; mỗi agent nhận mô tả tác vụ, API contract và context.
5. Poll các file `progress-{agent}.md` để theo dõi tiến độ.
6. Xác minh agent hoàn tất bằng `verify.sh`. PASS (exit 0) chấp nhận; FAIL (exit 1) spawn lại kèm context lỗi, tối đa 2 lần retry; lỗi kéo dài kích hoạt Exploration Loop.
7. Thu thập mọi file `result-{agent}.md` và biên soạn báo cáo cuối.

### Bước 3: agent spawn để quản lý agent cấp CLI

Lệnh `agent spawn` là cơ chế cấp thấp mà workflow gọi nội bộ. Bạn cũng có thể gọi trực tiếp:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```


**Toàn bộ flag:**

| Flag | Mô tả |
|:-----|:-----------|
| `--vendor <vendor>` | Override vendor CLI gồm antigravity/claude/codex/cursor/opencode/qwen/grok/pi; ghi đè resolution model cho lần spawn này. |
| `-w, --workspace <path>` | Thư mục làm việc của agent; tự phát hiện từ monorepo config nếu bỏ qua. |
| `--task-id <id>` | Gắn spawn với task trong session plan; mặc định là agent ID. |
| `--isolation worktree` | Tạo git worktree cho spawn; mặc định không thêm isolation. |
| `--read-only` | Chỉ cho child dùng tool inspection và tắt flag auto-approve. |

**Thứ tự resolve vendor**, từ trên xuống, chọn match đầu tiên:

1. Flag `--vendor` trên command line.
2. Override `agents:` trong `oma-config.yaml` cho agent đó.
3. Mặc định agent của `model_preset` đang hoạt động.

Xem [Per-Agent Models](./per-agent-models.md) để biết cấu hình.

**Tự phát hiện workspace** kiểm tra monorepo config theo thứ tự: `pnpm-workspace.yaml`, `package.json workspaces`, `lerna.json`, `nx.json`, `turbo.json`, `mise.toml`. Mỗi thư mục workspace được chấm theo keyword loại agent, như “web”, “frontend”, “client” cho frontend. Nếu không có monorepo config, CLI dùng candidate cố định như `apps/web`, `apps/frontend`, `frontend/`.

**Resolve prompt:** đối số `<prompt>` có thể là text inline hoặc đường dẫn file. Nếu đường dẫn tồn tại, CLI đọc nội dung làm prompt. CLI cũng inject execution protocol theo vendor từ `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Bước 4: /review để xác minh QA

```
/review
```


Workflow review chạy pipeline QA đầy đủ:

1. **Xác định phạm vi:** hỏi cần review file cụ thể, feature branch hay toàn dự án.
2. **Kiểm tra security tự động:** chạy `npm audit`, `bandit` hoặc tương đương.
3. **Review thủ công OWASP Top 10:** injection, auth hỏng, dữ liệu nhạy cảm, kiểm soát truy cập, cấu hình sai, deserialization không an toàn, component dễ tổn thương và logging thiếu.
4. **Phân tích hiệu suất:** N+1 query, index thiếu, pagination không giới hạn, memory leak, re-render thừa và bundle size.
5. **Accessibility:** WCAG 2.1 AA, gồm HTML ngữ nghĩa, ARIA, keyboard navigation, contrast màu và focus management.
6. **Chất lượng code:** naming, error handling, test coverage, TypeScript strict mode, import thừa và pattern async/await.
7. **Báo cáo:** phân loại CRITICAL / HIGH / MEDIUM / LOW, kèm `file:line`, mô tả và code remediation.

Với phạm vi lớn, workflow giao cho QA subagent. Với option `--fix`, workflow vào Fix-Verify Loop: spawn agent lĩnh vực để sửa CRITICAL/HIGH, review lại và lặp tối đa 3 lần.

---

## Chiến lược Session ID

Mỗi orchestration session có identifier duy nhất theo định dạng:

```
session-YYYYMMDD-HHMMSS
```


Ví dụ: `session-20260324-143052`

Session ID dùng để:

- Đặt tên file memory, gồm `orchestrator-session.md` và `task-board.md`.
- Theo dõi process agent qua PID file trong thư mục temp hệ thống: `/tmp/subagent-{session-id}-{agent-id}.pid`.
- Liên kết log: `/tmp/subagent-{session-id}-{agent-id}.log`.
- Nhóm kết quả vào `.agents/results/parallel-{timestamp}/`.

Session ID được tạo ở Step 2 của `/orchestrate` và truyền cho mọi agent. Nhờ vậy mọi session, log và PID của một lần chạy đều truy vết được.

---

## Gán workspace theo lĩnh vực

Mỗi agent được spawn trong workspace tách biệt để tránh xung đột file. Assignment theo quy tắc sau.

### Tự động phát hiện

Khi bỏ qua `-w` hoặc đặt là `.`, CLI tìm workspace tốt nhất bằng cách:

1. Quét monorepo config: `pnpm-workspace.yaml`, `package.json`, `lerna.json`, `nx.json`, `turbo.json`, `mise.toml`.
2. Mở rộng glob, ví dụ `apps/*`, thành thư mục thật.
3. Chấm từng thư mục theo keyword loại agent.

| Loại agent | Keyword (theo thứ tự ưu tiên) |
|:-----------|:---------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Tên thư mục khớp chính xác được 100 điểm, chứa keyword được 50 điểm và path chứa keyword được 25 điểm.
5. Thư mục có điểm cao nhất được chọn.

### Candidate fallback

Nếu không có monorepo config, CLI kiểm tra các path cố định theo thứ tự:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Nếu không match, agent chạy ở thư mục hiện tại `.`.

### Override tường minh

Luôn có thể dùng:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```


---

## Quy tắc contract-first

API contract là cơ chế đồng bộ giữa agent:

1. **Định nghĩa contract trước khi bắt đầu triển khai.**
2. **Mỗi agent nhận contract liên quan làm context.**
3. **Contract định nghĩa boundary**, gồm method HTTP, path, schema body request/response, yêu cầu auth và format lỗi.
4. **Vi phạm contract được phát hiện khi monitor.** Bước 5 của `/work` dùng provider code-intelligence đã cấu hình để xác minh các agent khớp API contract với nhau. Native search chỉ dành cho path nằm ngoài project hoặc path bị ignore.
5. **QA review kiểm tra tuân thủ contract.**

Không có contract, agent backend có thể trả `{ "user_id": 1 }` còn frontend dùng `{ "userId": 1 }`. Contract-first loại bỏ lớp lỗi tích hợp này.

---

## Cổng merge: 4 điều kiện

Trước khi coi công việc nhiều agent hoàn thành, cần đủ bốn điều kiện:

### 1. Check đã khai báo thành công

Mỗi tiêu chí chấp nhận có check tương ứng và check mà plan khai báo đều pass. Chỉ đưa build vào khi project gate yêu cầu; result contract ghi argv và exit code thực tế.

### 2. Test pass

Mọi test hiện có tiếp tục pass; test mới bao phủ hành vi đã triển khai. QA review test coverage trong Code Quality Review.

### 3. Chỉ sửa file đã lên kế hoạch

Agent không được sửa file ngoài phạm vi. Bước xác minh kiểm tra chỉ file liên quan mới bị thay đổi, tránh side effect ngoài ý muốn.

### 4. QA review sạch

Không còn phát hiện CRITICAL hoặc HIGH từ QA. MEDIUM và LOW có thể ghi lại cho sprint sau, nhưng blocker phải được xử lý.

Trong workflow ultrawork, bốn điều kiện này thành các phase gate `PLAN_GATE`, `IMPL_GATE`, `VERIFY_GATE`, `REFINE_GATE` và `SHIP_GATE`, mỗi gate có checklist phải pass trước khi đi tiếp.

---

## Ví dụ spawn

### Spawn một agent

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```


### Thực thi song song qua agent parallel

Dùng file task YAML:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```


```bash
oma agent parallel tasks.yaml
```


Dùng inline mode:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```


Chế độ background, không chờ:

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```


Với override vendor:

```bash
oma agent parallel tasks.yaml --vendor claude
```


---

## Anti-pattern cần tránh

### 1. Chấp nhận plan một cách máy móc

`/orchestrate` có thể tạo plan qua `/plan` inline nếu chưa có plan dùng được. Plan inline vẫn qua review gate; fan-out tiếp theo dùng plan đã duyệt. Với dự án nhiều lĩnh vực, nên chạy `/plan` trước để có tracker lâu dài trong `docs/plans/work/` và có chỗ refine phân tách.

### 2. Workspace chồng chéo

Gán hai agent cùng một thư mục workspace gây xung đột khi một agent ghi đè output agent kia. Luôn tách workspace.

### 3. Thiếu API contract

Spawn backend và frontend mà chưa định nghĩa contract khiến hai phía giả định khác nhau về format dữ liệu, tên field và lỗi.

### 4. Bỏ qua phát hiện QA

Coi QA là tùy chọn sẽ để bug thật lọt vào production. CRITICAL và HIGH phải được xử lý trong vòng lặp QA.

### 5. Quá song song

Chạy task P1 trước khi P0 hoàn thành. Tier priority tồn tại để kiểm soát dependency và workflow thực thi thứ tự đó.

### 6. Điều phối file thủ công

Tự merge output agent thay vì để pipeline verification và QA xử lý khiến các lỗi tích hợp khó phát hiện.

### 7. Bỏ qua xác minh

Dùng `agent spawn` trực tiếp mà không ghi result contract. Chạy check đã pin và hoàn tất claim có cấu trúc; xem [Agent results and resume](/docs/guide/agent-results-and-resume). Bước verification bắt lỗi và scope drift trước khi tái sử dụng result.

---

## Xác minh tích hợp xuyên lĩnh vực

Sau khi mọi agent hoàn tất task riêng, phải xác minh tích hợp:

1. **API contract:** provider code-intelligence đã cấu hình xác minh backend khớp contract mà frontend và mobile dùng. Native search chỉ dành cho path nằm ngoài project hoặc path bị ignore.
2. **Nhất quán kiểu:** TypeScript type, Python dataclass hoặc Dart model dùng chung phải giữ tên field và kiểu nhất quán.
3. **Luồng xác thực:** nếu backend triển khai JWT, frontend phải gửi token đúng header, còn mobile phải lưu và refresh token đúng cách.
4. **Xử lý lỗi:** mọi consumer API phải xử lý error response đã mô tả. Nếu backend trả `{ "error": "unauthorized", "code": 401 }` thì mọi client phải xử lý format này.
5. **Khớp schema database:** migration của database phải khớp chính xác ORM model backend.

QA agent thực hiện Alignment Review để kiểm tra hệ thống các điểm trên.

---

## Khi nào hoàn thành

Dự án nhiều agent hoàn thành khi:

- Mọi agent ở mọi priority tier đã hoàn tất thành công.
- Script verification pass cho từng agent.
- QA review có 0 CRITICAL và 0 HIGH.
- Đã xác nhận API contract xuyên lĩnh vực khớp nhau.
- Build thành công và mọi test pass.
- Báo cáo cuối được ghi vào memory và trình bày cho user.
- User phê duyệt cuối trong `/work` và SHIP_GATE của ultrawork.
