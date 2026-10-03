---
title: "Đánh giá Utility của Skill"
sidebar_label: Đánh giá Skill
description: Cách viết eval task fixture cho oma skill eval, quy ước thư mục .agents/eval/, các checker type và chế độ chạy mock/live.
---

# Đánh giá Utility của Skill {#skill-utility-eval}

`oma skill eval` đo xem việc load một skill có thực sự cải thiện kết quả task của agent hay không. Nó trả lời câu hỏi khác với `oma skill audit` (hỏi “hai skill có trùng nhau không?”): nó hỏi “skill này có giúp không?”.

Thiết kế dựa trên hai phát hiện nghiên cứu: WikiSkill (arXiv:2608.27454) tách raw experience, persistent knowledge và executable skill nhưng vẫn giữ held-out gate cho evolution; SkillLens (arXiv:2605.23899) cho thấy utility của skill độc lập với sự khác biệt của description — skill khác biệt vẫn có thể vô dụng, và skill chồng lấn vẫn có thể hữu ích.

---

## Cách hoạt động {#how-it-works}

Với mỗi task fixture, command chạy hai arm:

1. **Baseline arm** — task prompt được dispatch đến agent nhưng skill bị giữ lại.
2. **Treatment arm** — `SKILL.md` được thêm vào đầu prompt, sau đó cùng task được dispatch.

Mỗi arm được checker của task chấm điểm (0 = fail, 1 = pass). Metric chính là:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Skill pass khi `utilityLift ≥ 5%`. Dưới ngưỡng đó sẽ cảnh báo (lift biên) hoặc fail (không có lift). Cần ít nhất 5 task có thể chấm để đưa ra verdict.

---

## Quy ước `.agents/eval/<skill>/` {#the-agents-eval-skill-convention}

Đặt task fixture dưới `.agents/eval/<skill>/`. Path này nằm trong `.agents/` nhưng bên ngoài chính skill directory, nên tồn tại qua `oma update` mà không ghi đè eval do người dùng viết.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

File bắt đầu bằng `_` bị bỏ qua khi load task fixture. Thư mục `_rollouts/` chứa output đã ghi từ các lần chạy `--live --record` trước.

---

## Schema của task fixture {#task-fixture-schema}

Mỗi fixture là YAML file với các trường sau:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Trường | Bắt buộc | Mô tả |
|:------|:---------|:-----------|
| `id` | Có | ID duy nhất của task (dùng trong tên rollout file và report) |
| `skill` | Có | Skill được đánh giá (khớp tên parent directory) |
| `domain` | Có | Domain label dùng để nhóm và chọn các neighbor task cho negative-transfer |
| `prompt` | Có | Task prompt được dispatch cho cả hai arm |
| `checker` | Không | Cách chấm agent output. Mặc định là `{ type: judge }` nếu bỏ qua. |
| `weight` | Có | Trọng số tương đối cho weighted mean (dùng `1` nếu task không quan trọng hơn) |
| `group` | Không | Family label. `oma skill optimize` giữ các fixture có chung group trong cùng một partition train/validation/final-test để một near-duplicate không thể rò rỉ qua ranh giới split. |

### Các checker type {#checker-types}

#### judge (mặc định) {#judge-default}

LLM đánh giá agent output theo rubric và trả về PASS hoặc FAIL. Đây là mặc định khi bỏ qua `checker` hoặc không có `checker.type`.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Trường `rubric` là tùy chọn; nếu bỏ qua, rubric mặc định là: "Does the answer correctly and completely satisfy the task prompt?"

Cũng có thể viết rubric ở top level cho ngắn:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Quan trọng:** Trong `--mock` mode, judge task cần verdict đã ghi trước trong `_rollouts/`. Nếu task không có verdict đã ghi, task bị loại khỏi report kèm cảnh báo. Chạy `--live --record` để tạo rollout trước.

Điều tương tự áp dụng cho mọi checker type khi thiếu hoàn toàn một arm: task bị loại thay vì chấm 0. Dữ liệu thiếu không phải câu trả lời thất bại — chấm như 0 sẽ làm cả hai arm thành 0 và zero lift đọc như `decision: "fail"`. Nếu loại task làm số task đã chấm thấp hơn `MIN_TASKS`, report hiển thị `coverage: "insufficient"`.

#### assert (opt-in) {#assert-opt-in}

Substring check xác định. Dùng cho contract, format hoặc tool-call cần output chính xác.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Pass khi mọi string trong `expect_contains` đều có trong agent output.

#### regex (opt-in) {#regex-opt-in}

Regex match opt-in.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Pattern dài hơn 200 ký tự được chấm 0 (biện pháp ngăn ReDoS). Output bị cắt còn 10.000 ký tự trước khi match.

---

## Các chế độ thực thi {#execution-modes}

### `--mock` (mặc định) {#mock-default}

Replay rollout đã ghi từ `_rollouts/`. Hoàn toàn xác định và offline — không gọi LLM.

- Với checker `assert`/`regex`: score được tính từ output string đã ghi.
- Với checker `judge`: replay trường `score` được ghi bởi `--live --record`.

Nếu judge task không có score đã ghi trong `_rollouts/`, task bị loại khỏi report (kèm cảnh báo). Điều này giữ mock mode hoàn toàn offline.

Recording cũng được kiểm tra độ cũ trước khi dùng. Skill body, prompt, task/checker contract, judge rubric hiệu lực và evaluator protocol revision bị thay đổi sẽ làm các entry bị ảnh hưởng mất hiệu lực. Provenance bị thiếu cũng bị loại kèm cảnh báo nêu file và số lượng. Khi còn ít hơn `MIN_TASKS` task có thể chấm, run báo `coverage: "insufficient"` thay vì verdict.

:::note `oma skill optimize --mock`
Optimizer chấm body `SKILL.md` candidate. Vì recording chỉ hợp lệ với body đã tạo ra nó, candidate body không có rollout khớp và được báo là uncovered. Dùng `--live` để chấm candidate.
:::

An toàn cho CI. Đặt `OMA_SKILLEVAL_MOCK=1` để ép chế độ này.

```bash
oma skill eval --skill oma-scholar
```

### `--live` {#live}

Spawn agent arm thật qua `oma agent spawn --read-only`. Mỗi task arm chạy trong workspace tạm riêng của nó, nên file do một arm tạo ra không ảnh hưởng arm khác. Process failure, API error envelope và judge failure loại toàn bộ so sánh ghép cặp khỏi việc chấm và ghi; partial output là dữ liệu diagnostic.

Trước khi dispatch, command in cost preview gồm số task, số arm dispatch, số judge dispatch và vendor đã resolve. Xác nhận bằng `y` hoặc bỏ qua bằng `--yes`.

Các control khác hữu ích trong CI và điều tra coverage:

| Option | Tác dụng |
| --- | --- |
| `--task-dir <path>` | Đánh giá fixture từ directory khác `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Giới hạn số fixture cho live run có phạm vi. |
| `--trials <n>` | Lặp lại mỗi arm `n` lần (1-10). Arm được khởi động trước luân phiên giữa các trial, score theo task được lấy trung bình, và report có thêm within-task variance. Neighbor task từ `--neg-transfer` chỉ chạy một lần. |
| `--neg-transfer` | Đo candidate skill trên các task cùng domain thuộc skill khác; mặc định tắt. |
| `--routing` | Đo activation: với mỗi task, hỏi skill đã cài nào sẽ được load dựa trên `description` của mọi skill. Live đo trực tiếp (thêm một dispatch cho mỗi task); mock replay một routing recording được tạo dưới cùng catalog. |
| `--require-coverage` | Thoát non-zero khi còn dưới năm paired task có thể chấm, hoặc một negative-transfer check được yêu cầu chưa hoàn tất. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Đo negative transfer {#negative-transfer-measurement}

Với `--neg-transfer`, mỗi neighbor task được chọn chạy hai lần: một baseline mới không có candidate, sau đó một treatment với đúng candidate body được inject. Neighbor là các task của skill khác trong cùng `domain`. Khi không có skill nào khác dùng chung domain, một mẫu cross-domain có giới hạn (tối đa sáu task, trải đều trên các skill khác) được dùng thay thế và `negativeTransferCoverage.scope` báo `cross-domain`; sự can thiệp của một body được inject không bị giới hạn trong domain của chính nó, và một domain duy nhất không được khiến check này trở nên bất khả thi. Cả hai arm dùng cùng evaluator và các workspace rỗng riêng biệt. Delta là treatment score trừ baseline score; giá trị âm nghĩa là candidate đã gây hại cho neighbor task đó. Live preview bao gồm các arm và judge dispatch bổ sung này. `--max-tasks` cũng giới hạn mẫu neighbor, kèm cảnh báo khi có task bị bỏ qua.

Dùng `--live --neg-transfer --record` để lưu các so sánh riêng cho candidate dưới `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Mock replay yêu cầu candidate identity, body hash và full task/checker hash khớp, cùng một comparison ID chung cho cả hai arm. Các recording đánh giá thông thường của một neighbor không thể thay thế cho phép đo này.

Mỗi entry `negativeTransfer` mang `trials` (số so sánh ghép cặp đằng sau `delta`). Optimization đo lại một neighbor bị regress một lần trước khi từ chối candidate và thêm `confirmed` (`true` khi lần lặp lại cũng regress, `false` khi không); `oma skill eval --neg-transfer` báo so sánh đơn lẻ. Report gồm `negativeTransferCoverage` với `status`, `expected` và `scored`. Status là `not-requested` khi không có flag, `measured` khi mọi neighbor được chọn đều có kết quả ghép cặp hợp lệ và mẫu không rỗng, và `insufficient` khi không có neighbor nào hoặc thiếu bất kỳ so sánh nào. Vì vậy, một mảng `negativeTransfer` rỗng không xác lập rằng không có regression. JSON `ok` là false khi negative-transfer coverage được yêu cầu không đủ.

#### Skill isolation (giữ baseline trung thực) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` chỉ có ý nghĩa nếu **baseline arm chạy không có target skill**. Vấn đề là agent được dispatch tự động load mọi skill đã cài trong runtime, nên baseline ngây thơ vẫn lấy skill mà nó đáng ra phải không có — làm nhiễm so sánh (baseline ≈ treatment, lift ≈ 0).

Để ngăn điều này, `--live` chạy **cả hai arm trong các workspace tạm riêng biệt**. Protected profile của Claude và Codex tắt việc tự động tìm skill/instruction và các agent tool. Treatment nhận target **chỉ** qua `SKILL.md` được inject. Exploratory profile dùng một skills directory đã lọc bỏ target, nhưng riêng điều đó không chứng minh được isolation.

Working directory sạch che việc tìm skill cục bộ của project, nhưng runtime isolation còn phụ thuộc vào vendor profile. Report cho biết mức đã xác minh qua `isolation`:

| Status | Ý nghĩa |
|---|---|
| `enforced` | Protected Claude với target ID hợp lệ và không có bản copy ở HOME, hoặc Codex native với việc chặn discovery/tool và các runtime thread check. Runtime contract thất bại sẽ hủy dispatch. |
| `best-effort` | Một runtime không có protected text profile, target ID không hợp lệ, hoặc có bản copy HOME của Claude; isolation không được xác minh. |
| `unavailable` | Vendor dựa trên HOME (ví dụ **antigravity**, đọc từ `~/.gemini/antigravity-cli/skills`); cwd sạch không thể che nó. In cảnh báo và đánh dấu kết quả độ tin cậy thấp. |
| n/a | Mock mode — không dispatch live. |

Các runtime profile khác vẫn dùng được cho exploratory evaluation, nhưng kết quả `best-effort` và `unavailable` chặn việc thăng cấp trong live optimization. Eval vendor theo cấu hình model của project. Codex dùng CLI login native và model/provider đã cấu hình của nó qua `app-server`; nó không âm thầm chuyển sang Claude hay một API-key client. Protected Codex contract nhắm tới CLI 0.154.x trên macOS/Linux với native file credential storage và một `auth.json` đã có sẵn. Một config home tạm riêng tư tham chiếu tới các config/auth file gốc đồng thời loại trừ shared bootstrap state; credential không được copy, và việc native refresh dùng auth file gốc. Các credential store keyring, auto và ephemeral hiện chưa được hỗ trợ. Phiên bản không được hỗ trợ, storage mode và lỗi contract trở thành dispatch error.

Judge chạy trong các thư mục tạm mới với optimization memory bị tắt. Judge Claude và Codex dùng cùng protected text transport như các evaluation arm. Cấu hình judge vendor được cố định trong suốt run.

### `--live --record` {#live-record}

Chạy live arm và ghi output đã capture (kể cả judge verdict cho judge-checker task) vào `_rollouts/<hash>.json`. Tên file là SHA-256 hash xác định của tập task ID — không dựa trên ngày hoặc random.

Dùng cách này để seed `--mock` run trên máy của bạn để các lần chạy lặp lại vẫn offline.

Mỗi entry có provenance để replay sau này biết nó còn áp dụng không:

| Trường | Ghi trên | So sánh với |
|---|---|---|
| `skillBodyHash` | chỉ `treatment` | body `SKILL.md` đang được đánh giá |
| `promptHash` | cả hai arm | `prompt` hiện tại của fixture |
| `taskHash` | cả hai arm | toàn bộ task, checker hiệu lực/default judge rubric, và `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | cả hai arm (`--trials` > 1) | ghép baseline và treatment của một lần lặp; không có khi chỉ một trial |
| `judgeResponse` | judge task | văn bản verdict đã unwrap của judge (có giới hạn), được giữ để score đã lưu có thể được audit |

Arm output được ghi dưới dạng văn bản câu trả lời. Khi một vendor CLI trả về JSON result envelope, field `result` được lưu và chấm; phần envelope bookkeeping không bao giờ bị checker `assert`/`regex` khớp hay bị judge parser đọc.

Baseline arm giữ skill lại, nên chỉ sửa `SKILL.md` không làm recording của nó mất hiệu lực. Thay đổi task hoặc evaluator contract làm cả hai arm mất hiệu lực. Live recording chạy lại cả hai arm.

Recording có từ trước khi có full task/evaluator provenance phải được tạo lại bằng `--live --record` (và `--neg-transfer` cho so sánh neighbor); thêm hash mới vào score cũ không thể xác minh chúng. Cùng contract đó tham gia vào optimization suite identity, nên suite-scoped knowledge trước đây không được dùng lại dưới contract đã cập nhật. Hãy duy trì `SKILL_EVAL_PROTOCOL_REVISION` bằng cách tăng nó khi hành vi của scorer, judge prompt/verdict parsing hoặc hành vi evaluator ngầm khác thay đổi.

:::caution `_rollouts/` chỉ local — không commit
Recording chỉ replay được với đúng body `SKILL.md` đã tạo ra nó. Sửa skill sẽ loại treatment recording trong lần `--mock` tiếp theo, nên recording đã commit sẽ cũ sau thay đổi `SKILL.md` và phát cảnh báo cho mọi người pull về. Directory này được gitignore; chỉ record local.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Sau live run thành công, report gồm baseline và treatment count, `utilityLift`, `coverage: "ok"`, isolation status và decision pass/warn/fail. Mock run về sau chỉ dùng recording có task prompt và treatment skill body còn khớp.

---

### Concurrency và dispatch timeout {#concurrency-and-dispatch-timeouts}

Live arm, neighbor arm, judge call và routing probe chạy qua một pool có giới hạn gồm `OMA_SKILL_EVAL_CONCURRENCY` subprocess (mặc định 4, tối đa 16). Hai arm của một trial luôn chạy cùng nhau trong các directory rỗng riêng biệt, với arm được khởi động trước luân phiên giữa các trial, và kết quả giữ nguyên thứ tự task, nên recording và score giống hệt một lần chạy tuần tự. Đặt biến này bằng 1 để chạy tuần tự.

Mỗi live arm và judge call bị kill sau `OMA_SKILL_EVAL_TIMEOUT_MS` (mặc định 180000). Một dispatch bị timeout được retry một lần trước khi task bị loại khỏi report, vì một phản hồi chậm là lỗi transport chứ không phải một câu trả lời; lần timeout thứ hai sẽ loại task (và, trong optimization, làm coverage của split thất bại). Hãy nâng giới hạn cho những fixture thực sự cần câu trả lời dài.

## Routing: skill có được chọn không? {#routing-does-the-skill-get-selected}

Utility lift đo những gì body làm được khi đã được load. Vendor quyết định có load một skill hay không dựa trên `description` trong frontmatter của nó, nên một body tốt hơn nhưng không bao giờ được chọn thì không phải là một cải thiện. `--routing` gửi từng task prompt, cùng tên và description của mọi skill đã cài, tới cùng protected model và yêu cầu nó nêu skill duy nhất mà nó sẽ load (hoặc `NONE`). Target được chọn là một activation; skill khác là một misroute; `NONE` là một miss.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

JSON report mang `routing` với `status`, các count, `activationRate`, `misroutedTo` và `catalogSize`; mỗi finding mang `routing: target | other | none | unparsed`. Với `--record`, các lựa chọn được lưu vào `_rollouts/<hash>.routing.json` cùng hash của catalog. Một `--mock --routing` về sau chỉ replay chúng khi mọi description và task không đổi; nếu không, `status` là `stale` và không có gì được đếm.

Phép đo này đánh giá description so với catalog qua protected transport. Nó không thực thi cơ chế discovery riêng của vendor, thứ mà protected profile cố ý tắt, và không đo xem procedure của skill đã load có được tuân theo hay không; đó vẫn là phép đo utility.

## Một bộ fixture hoạt động tối thiểu {#a-minimal-working-fixture-set}

Cần năm fixture để có verdict (`MIN_TASKS = 5`). Đây là bộ tối thiểu cho skill `oma-scholar` giả định:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Lặp lại cho ít nhất ba task nữa. Sau đó chạy:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Đọc report {#reading-the-report}

**Text output:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON output** (qua `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` cộng những gì vendor báo cáo cho các scored arm và, tách riêng, cho các judge call của chúng: số dispatch, input và output token (kể cả cache read và write), và chi phí USD. `status` là `actual` khi mọi dispatch đều báo usage, `partial` khi một số không báo, và `unknown` khi không dispatch nào báo (một text-only transport như Codex bridge không báo gì). Rollout đã ghi mang `usage` và `judgeUsage` cho mỗi entry, nên một mock replay báo chi phí của recording mà nó tái sử dụng thay vì bằng không.

`repeatability` tách biến thiên ở mức task khỏi biến thiên giữa các lần chạy lại. `liftCi95` là t-interval 95% ghép cặp trên các lift theo task (null khi dưới hai task được chấm). Với `--trials` từ hai trở lên, `withinTaskStdDev` là độ lệch chuẩn trung bình theo task của lift theo trial, và `status` là `stable` chỉ khi khoảng loại trừ số 0 ở phía của lift; nếu không thì nó là `unstable` và một `pass` bị hạ xuống `warn`. Một run một trial báo `single-trial`: nó có thể cho thấy lift, nhưng không thể cho thấy lift đó lặp lại.

`ok` là `true` chỉ khi `coverage === "ok"`, `decision === "pass"` và mọi negative-transfer check được yêu cầu đều có coverage đủ. Trường `isolation` báo baseline arm có thực sự chạy không có target skill hay không (xem [Skill isolation](#skill-isolation-keeping-the-baseline-honest)); `isolation` là `"n/a"` trong `--mock` mode.

---

## Tích hợp CI {#ci-integration}

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Exit code:
- `0` — pass hoặc warn
- `1` — fail, hoặc coverage task/negative-transfer không đủ với `--require-coverage`

---

## Chọn live hay mock {#choosing-live-or-mock}

Dùng `--live` với judge checker để đo utility thực tế trên task mở. Dùng `--mock` để replay judge verdict đã record trước đó offline hoặc chạy deterministic `assert`/`regex` contract check.

Mock determinism được giữ bằng cách ghi binary verdict (PASS/FAIL) của judge vào rollout entry trong `--live --record`, rồi replay score đã ghi trong các lần `--mock` sau — không gọi LLM lại.

**Data egress:** Trong `--live`, judge dispatch output của candidate arm đến vendor đã cấu hình để chấm. Cảnh báo một lần được in khi bắt đầu mỗi live run.

Nếu mock run báo coverage không đủ, kiểm tra cảnh báo về `_rollouts` entry bị loại hoặc thiếu, sau đó chạy live recording pass sau khi sửa fixture hoặc skill. Việc thăng cấp bằng live yêu cầu một protected profile Claude hoặc Codex hoạt động được với `isolation: "enforced"`; các profile khác vẫn là exploratory.

---

## Phân phối eval task cùng skill {#shipping-eval-tasks-with-a-skill}

Skill có thể kèm task set bằng cách đặt fixture tại `.agents/eval/<skill>/`. Đây là file do người dùng sở hữu bên ngoài skill directory, nên tồn tại qua `oma update`. Khi tạo skill mới bằng `oma-skill-creation`, thêm bộ fixture `eval/` tương ứng để tác giả sau này có cách xác minh tác động của skill. Xem `.agents/skills/oma-skill-creation/SKILL.md` để biết workflow soạn skill.
