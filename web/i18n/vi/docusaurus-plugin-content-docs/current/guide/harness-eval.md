---
title: "Đánh giá Harness"
sidebar_label: Đánh giá Harness
description: Đánh giá một OMA harness overlay hoàn chỉnh bằng các task repository ghép cặp, cô lập và các artifact check xác định.
---

# Đánh giá Harness {#harness-evaluation}

`oma harness eval` đo xem một OMA harness candidate có cải thiện target agent cố định mà không đổi model của agent đó hay không. Nó áp dụng mô hình đánh giá lúc test từ [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): giữ target model cố định, thay harness và so sánh kết quả trên cùng task.

Command này đánh giá unit lớn hơn `oma skill eval`:

| Command | Treatment | Đối tượng chấm điểm |
|:--------|:----------|:-------------|
| `oma skill eval` | Một `SKILL.md` body | Agent output |
| `oma harness eval` | Một `.agents/` overlay có phạm vi | File và output tạo ra trong repository workspace |

Dùng skill eval để trả lời “skill này có giúp không?”. Dùng harness eval để trả lời “tổ hợp skill, workflow, rule và agent instruction này có giúp agent cố định hoàn tất task repository đáng tin cậy hơn không?”

## Mô hình đánh giá {#evaluation-model}

Một live run đánh giá mỗi task như một paired experiment:

1. OMA capture task fixture ban đầu. Một snapshot hoàn chỉnh được dùng để seed cả hai arm, nhờ đó chúng bắt đầu từ cùng các file, kể cả khi source fixture thay đổi trong lúc thực thi.
2. OMA copy definition `agents`, `config`, `rules`, `skills` và `workflows` hiện tại vào workspace đó rồi project chúng sang vendor format đã chọn.
3. OMA lặp lại setup trong workspace mới thứ hai và áp candidate overlay tại đó.
4. Cùng primary agent, vendor route, prompt, write permission và timeout được dùng cho cả hai arm.
5. Deterministic check kiểm tra workspace kết quả và agent output tùy chọn. Trusted command check chạy sau đó trong một bản copy mới của task artifact.

Project thật không bao giờ được dùng làm working directory của arm. OMA capture raw output và task artifact cuối cùng trước khi chạy check và dọn workspace tạm. Process sandbox riêng của vendor đã chọn vẫn là authority cho quyền truy cập bên ngoài working directory.

## Bố cục candidate {#candidate-layout}

Candidate path là một directory chứa partial `.agents/` tree:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Chỉ file dưới `.agents/agents`, `.agents/rules`, `.agents/skills` và `.agents/workflows` được chấp nhận. Hook, evaluator fixture, state, result, configuration file, symlink và vendor agent variant bị từ chối. Protected agent frontmatter field như `model`, `tools`, `effort` và execution limit phải khớp baseline. Arm cũng thất bại nếu agent đang chạy sửa protected `.agents/` definition trước khi chấm.

## Định dạng suite {#suite-format}

Suite là một YAML file cộng với một fixture directory cho mỗi task:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

Phiên bản 2 yêu cầu cả task `validation` và task `final-test`. Mỗi task phải khai báo partition của nó. Validation là mặc định; dùng `--partition final-test` cho một lần chạy cuối riêng sau khi đã chọn candidate. Hai partition không được dùng chung hoặc lồng nhau các fixture directory. Giữ recording file bên ngoài fixture directory, candidate overlay và evaluator input; những vị trí này bị từ chối để ngăn các lần chạy sau nhìn thấy final check. Suite phiên bản 1 vẫn chạy dưới dạng `exploratory`; không thể chọn chúng làm final-test.

Task ID phải duy nhất. Fixture path và check path phải nằm trong project và task workspace. Suite và fixture cũng phải nằm bên ngoài baseline definition được copy vào mỗi arm. Fixture không được chứa symlink hoặc harness control surface như `.agents`, `.codex`, `.claude`, vendor skill directory hoặc root agent-instruction file. Điều này ngăn task data che khuất harness được kiểm soát của cả hai arm.

Dependency directory được tạo như `node_modules` và `.venv` không được copy từ baseline harness. Commit deterministic helper source và dependency manifest trong skill; provision runtime dependency trong task fixture khi check cần.

### Loại check {#check-types}

| Type | Fields | Điều kiện pass |
|:-----|:-------|:---------------|
| `file_exists` | `path` | Path tồn tại sau khi arm hoàn tất. |
| `file_not_exists` | `path` | Path không tồn tại. |
| `file_contains` | `path`, `value` | File tồn tại và chứa value. |
| `file_not_contains` | `path`, `value` | File tồn tại và không chứa value. |
| `output_contains` | `value` | Agent output được capture chứa value. |
| `output_not_contains` | `value` | Agent output được capture không chứa value. |
| `output_judge` | `rubric` | Hợp đồng được chấm điểm, đi kèm các sự cố; mechanical evaluator báo cáo nó là chưa được đánh giá (xem [Ca hồi quy của sự cố](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, `pointer` tùy chọn | JSON đã parse của file bằng `value`, tùy chọn tại một JSON Pointer. |
| `output_json_equals` | `value`, `pointer` tùy chọn | Output được capture là JSON hợp lệ và bằng `value`, tùy chọn tại một JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | Subprocess đáng tin cậy hoàn tất trong timeout của nó và trả về exit code được chỉ định. |

JSON assertion so sánh các giá trị đã parse, kể cả kiểu dữ liệu; văn bản báo thành công không thể thỏa một JSON state assertion. `pointer` dùng cú pháp JSON Pointer như `/result/count` và mặc định là toàn bộ value.

Command check do chủ sở hữu suite đáng tin cậy viết:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` được resolve tương đối với suite file. Nó phải là một source file thông thường (regular file) và độc lập, nằm bên ngoài mọi fixture, candidate overlay và baseline definition `.agents`. `argv[0]` phải là một executable có đường dẫn tuyệt đối, nằm ngoài project; `{checker}` phải là một argument hoàn chỉnh. OMA truyền argument trực tiếp, không qua shell interpolation. Timeout phải là số nguyên dương không lớn hơn 300.000 mili giây. Exit code là số nguyên từ 0 đến 255.

Trước khi dispatch, OMA snapshot các byte source của checker và hash evaluator definition cùng executable. Sau khi dispatch, nó copy task artifact sang một workspace tạm riêng, ghi checker đã snapshot ra bên ngoài các artifact đó rồi gọi nó tại đó. Mỗi command nhận một bản copy mới; một checker không thể thay đổi input của check kế tiếp. Harness projection được tạo ra bị loại trừ, và symlink trong artifact bị từ chối. Source của checker thay đổi trong lúc một arm chạy sẽ làm arm đó fail; source đã bị sửa không bao giờ được dùng thay cho snapshot. Checker nên dùng các assertion cố định trên artifact hoặc hành vi của ứng dụng, và không nên giao verdict của nó cho test hay package script mà candidate có thể sửa.

Check và checker path không được thêm vào agent prompt hay fixture. Input của task được chọn tất yếu nhìn thấy được trong lúc nó chạy. Điều này bảo vệ tính toàn vẹn của evaluator và tách biệt các partition; nó không ngăn một process cùng user đọc các file khác trên host.

## Chạy và ghi nhận {#run-and-record}

Live mode dispatch hai arm cho mỗi task được chọn, in dispatch preview và yêu cầu xác nhận:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Dùng `--yes` cho execution không tương tác và `--timeout-minutes` để đặt cùng wall-clock limit cho mỗi arm. Live execution yêu cầu một vendor tìm harness file tương đối với project workspace. OMA từ chối discovery dựa trên HOME vì baseline có thể nhìn thấy candidate content cài toàn cục.

`--record` ghi một JSON record phiên bản 2 bất biến. Vị trí mặc định là `_runs/` cạnh suite, với hash của baseline/candidate trong tên file. Dùng một `--record-file` mới cho live run khác; destination đã tồn tại sẽ bị từ chối trước khi dispatch. Record giữ lại:

- danh tính suite, partition, provenance của prompt và fixture, hash của baseline/candidate, và hash của evaluator/checker/executable;
- output gốc cùng hash của nó, kể cả diagnostic stdout có sẵn từ các dispatch thất bại;
- manifest của artifact ban đầu và cuối cùng với byte của file, hash từng file, mode của file/directory và một manifest digest;
- checker reference, arm outcome, danh tính sự cố khi được cung cấp, và hash của source record cho một rerun.

Task snapshot bị giới hạn 5 MiB cho mỗi file, 32 MiB tổng và 2.000 entry. Symlink, special file, path chứa secret, file không đọc được và dữ liệu quá lớn được ghi nhận là phần bị lược bỏ (omission). Harness control đã copy bị loại khỏi task artifact cuối cùng. Snapshot không đầy đủ vẫn là giới hạn bằng chứng tường minh; chúng không thể cung cấp cho một pinned rerun hay đáp ứng việc rescore file. Raw output vẫn có thể hỗ trợ các check chỉ dựa trên output khi dispatch gốc thành công.

Record có integrity hash riêng. Record hoặc artifact hash bị thay đổi sẽ bị từ chối. Các hash này xác định bằng chứng; chúng không chứng thực việc giới hạn process và cũng không làm một kết quả sẵn sàng thăng cấp.

### Điều kiện thực thi {#execution-conditions}

Mỗi lần đánh giá live hoặc rerun đều resolve một execution manifest trước dispatch đầu tiên và lưu nó trong record dưới tên `manifest`. Manifest nêu các điều kiện mà một verdict mô tả, để một score đã lưu không bao giờ bị nhầm là bằng chứng về một model, CLI hay OMA build khác:

| Field | Ý nghĩa |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Dispatch route đã resolve và tên CLI executable. |
| `model`, `modelSource` | Model mà OMA resolve từ agent plan hoặc vendor default. `vendor-session` nghĩa là session configuration riêng của vendor chọn model và OMA không pin nó. |
| `effort`, `thinking` | Reasoning setting lấy từ agent plan khi có. |
| `cliVersion`, `cliVersionStatus` | Dòng đầu của `<command> --version` (`probed`), hoặc `unavailable` khi probe thất bại. |
| `omaVersion`, `platform`, `arch`, `node` | Host và OMA build. |
| `environmentPolicy` | Tên các environment variable mà các arm nhận được, các entry bị ép đặt và số lượng bị loại bỏ. Giá trị không bao giờ được ghi. |
| `memory`, `confinement` | `memory: disabled` cho mọi arm; `confinement` nêu dispatch hạn chế và không hạn chế những gì (workspace tạm, network không hạn chế, credential được kế thừa, tool mặc định của vendor). |
| `manifestHash` | Danh tính của các điều kiện ở trên. |

Manifest là một mô tả, không phải một chứng thực: nó ghi lại những gì OMA đã resolve, và các field confinement nói rõ rằng việc cô lập network và credential không được thực thi. `promotionReady` vẫn là `false`.

### Chính sách environment {#environment-policy}

Cả hai arm nhận cùng một environment đã lọc theo allowlist. Các base variable (`PATH`, `HOME`, locale, temp, cùng cài đặt proxy và certificate), mọi biến `OMA_*`, cùng các prefix credential và runtime-detection của target vendor được cho đi qua; các entry mà dispatch builder thêm cho lần gọi được giữ lại. Mọi thứ khác bị loại bỏ để candidate không thể vô tình chạm tới deploy token hay key của provider khác. `OMA_NO_AGENTMEMORY=1` được ép đặt để vendor memory không thể mang context giữa baseline arm và candidate arm.

Đặt `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2` để cho đi qua các biến bổ sung mà task thực sự cần. Các tên này xuất hiện trong manifest dưới `environmentPolicy.extra`. Với vendor không có prefix set đã biết, manifest báo `vendorKnown: false` và chỉ các entry base, `OMA_*` và passthrough đến được process.

## Tái sử dụng recording {#reuse-a-recording}

Command tách thành bốn action:

| Action | Công việc thực hiện | Số lần gọi agent/model |
|:-------|:---------------|:------------------|
| `inspect` | Tổng hợp các arm verdict đã lưu sau khi validate provenance. Không chạy check nào. | Không có |
| `rescore` | Áp các output/file check hiện hành lên raw output và artifact byte gốc. | Không có |
| `fixture-replay` | Khớp một tool-request transcript được cung cấp, replay các fixture response và file change của nó, rồi áp các check được hỗ trợ. | Không có |
| `rerun` | Chạy agent đã cấu hình trong workspace mới được seed từ các initial snapshot đã ghi. | Hai cho mỗi task được chọn |

`--action inspect` là mặc định. `--mock` là alias của việc inspect và không thể kết hợp với action khác. Cả inspection lẫn fixture replay đều không rerun agent.

### Inspect verdict đã lưu {#inspect-stored-verdicts}

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

Inspect yêu cầu hash của suite, partition, evaluator, baseline và candidate gốc phải khớp. Nó hiển thị các score đã ghi mà không gọi checker hay đánh giá lại output. Record phiên bản 1 vẫn dùng được cho inspect khi provenance bắt buộc của chúng khớp. Record cũ thiếu provenance về partition/evaluator không thể qua validation của CLI hiện tại. Legacy verdict không thể được gán nhãn lại thành raw evidence mới: hãy thu thập một live record mới để rescore, fixture replay hoặc pinned rerun.

### Rescore bằng chứng gốc {#rescore-original-evidence}

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Rescore dùng check hiện hành và bỏ qua các giá trị `passed` gốc cùng check verdict. Danh tính suite, task ID/prompt/danh tính sự cố, baseline, candidate và partition đã chọn vẫn phải khớp. Checker definition có thể thay đổi; kết quả mới mô tả cách các byte gốc hoạt động với những check đó. Thay đổi trên các fixture file hiện tại không thay thế các final artifact đã ghi.

Command check không đủ điều kiện cho offline rescore vì record không pin external runtime và environment. Các check nhắm vào artifact bị loại trừ hoặc không đầy đủ cũng không đủ. Một dispatch gốc thất bại để lại diagnostic output, thứ không thể trở thành một phép đo hợp lệ qua rescore. Dùng live rerun khi acceptance criteria hiện hành cần thực thi command.

### Replay tool fixture {#replay-tool-fixtures}

Một transcript file chứa một object, hoặc một mảng object với task ID duy nhất. Cung cấp một transcript cho mỗi task được chọn:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Các request phải khớp chính xác với step sequence theo tên tool và request value. `writes` và `removes` là các thay đổi task file tương đối, tùy chọn; chúng không thể thoát khỏi workspace hay sửa harness control. Tên tool là dữ liệu, và không có transcript command nào được thực thi. `output` là fixture data, bắt buộc khi một output check cần đến nó.

Mỗi dependency được khai báo có `name`, `repeatability` (`fixture`, `live` hoặc `unavailable`), cùng `reason` và tham chiếu `fixture` tùy chọn. Một fixture dependency yêu cầu một step khớp với tên tool đó. Dependency live hoặc unavailable khiến replay không đủ. Field `fixture` tùy chọn chỉ mang tính mô tả; replay dùng các step được cung cấp thay vì load path đó. Transcript replay validate các dependency đã khai báo và không xác lập rằng mọi dependency trong lịch sử đều đã được capture.

Cả hai arm đã ghi phải có cùng một initial snapshot hoàn chỉnh. OMA áp cùng transcript lên mỗi arm và chạy các output/file check hiện hành. Command check yêu cầu live rerun. Các kết quả này cho thấy fixture sequence được cung cấp có thể được replay; chúng không thể xác lập sự cải thiện hành vi của candidate hay khả năng tái lập của model.

### Rerun agent từ initial file đã pin {#rerun-the-agent-from-pinned-initial-files}

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Một rerun yêu cầu suite/task identity khớp và initial snapshot hoàn chỉnh giống hệt nhau cho cả hai arm gốc. Nó bắt đầu các lần gọi agent thật, dùng baseline hiện tại, candidate, vendor/model route đã cấu hình và check hiện hành. Nó không dùng final artifact gốc làm trạng thái xuất phát. Vì vậy, một chỉnh sửa về sau lên source fixture không thể âm thầm làm thay đổi initial state đã ghi.

Rerun có cùng dispatch preview, confirmation và hành vi timeout như live run. Chúng có thể dùng một candidate đã thay đổi; hãy chọn record gốc một cách tường minh bằng `--record-file`. Thêm `--record` để lưu một file mới cùng thư mục, có tên kết thúc bằng `-rerun-<timestamp>.json`, liên kết với source record hash. Record gốc được giữ nguyên.

Các file đã pin không tái tạo trạng thái của external service, hành vi của đồng hồ hay model sampling. Một rerun là behavioral evidence mới dưới các điều kiện đã nêu, không phải tuyên bố rằng trajectory của agent gốc đã được tái tạo một cách xác định.

### Điều kiện đã ghi khi replay {#recorded-conditions-on-replay}

`inspect`, `rescore` và `fixture-replay` báo manifest được lưu trong record với `conditions: "recorded"`, hoặc `conditions: "unavailable"` đối với record được tạo trước khi có manifest. OMA cũng resolve các điều kiện hiện tại và liệt kê mọi khác biệt về vendor, dispatch mode, model, effort, thinking, CLI version, OMA version hoặc host như một replay limitation và một blocker thăng cấp:

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

CLI version chỉ được probe khi replay nếu chính record mang một probed version; một cặp chưa probe được báo là không so sánh được thay vì bằng nhau. Các verdict đã ghi vẫn xem được dưới điều kiện gốc của chúng. Chúng không phải bằng chứng cho candidate dưới điều kiện hiện tại cho đến khi một đánh giá live hoặc rerun tạo ra một record có manifest khớp.

### Mức sử dụng {#usage}

Mỗi arm lưu `usage` khi vendor có báo cáo: input và output token, chi phí USD, wall time và model tạo ra phần lớn output. Evaluation cộng chúng thành `usage` với `status` là `actual`, `partial` (một số arm không báo gì) hoặc `unknown`. Vendor result envelope được unwrap trước khi chạy check và trước khi output được ghi, nên `output_contains` và `output_json_equals` thấy câu trả lời của agent thay vì phần JSON bookkeeping bao quanh nó; usage bên trong envelope là nguồn dữ liệu cho field này.

### Label của report {#report-labels}

Report gồm `executionMode`, `evidenceStatus` (`complete`, `insufficient` hoặc `legacy`), `replayLimitations`, và `sourceRecordHash` khi có. Report của live và rerun thêm `manifest`, `conditions: "current"` và `traceSession`. Evidence completeness mô tả những gì action hiện tại có thể inspect hoặc đánh giá. Các giới hạn kế thừa từ sự cố vẫn hiển thị ngay cả khi việc capture file hiện tại đã đầy đủ. `promotionReady` vẫn là `false` ở mọi mode.

## Trace event {#trace-events}

Mỗi lần đánh giá live hoặc rerun ghi các event được liên kết vào session cục bộ `oma-harness-<suite-id>`:

| Event | Payload |
|---|---|
| `harness.eval.started` | Action, hash của suite/baseline/candidate/evaluator, partition, manifest hash, vendor đã resolve, model, CLI version và số task. |
| `harness.arm.completed` | Một cho mỗi arm: task, arm, trạng thái pass, duration, output hash, dispatch error, exit code, timeout flag và arm trace. `parentEventId` trỏ tới started event. |
| `harness.eval.completed` | Decision, lift, evidence status, cùng path và hash của record khi dùng `--record`. |

Mọi event của một lần đánh giá dùng chung một `causalityKey`. Khi một event không thể được ghi, report liệt kê `Trace event <kind> was not recorded` như một replay limitation thay vì âm thầm bỏ qua.

Mỗi lần chạy arm cũng lưu `diagnostics` và `trace` trong record:

- `diagnostics`: exit code, signal, timeout flag, và 8 KiB cuối của stderr cùng `stderrStatus` (`captured`, `truncated` hoặc `unavailable`).
- `trace`: những gì harness có thể quan sát. `output` là `complete`, `partial` (một process thất bại vẫn tạo ra stdout) hoặc `unavailable`; `artifacts` cho biết final snapshot có đầy đủ hay không; `changedPaths` liệt kê các file mà arm đã thêm, sửa hoặc xóa so với pinned initial workspace (giới hạn 200 kèm `changedPathsTruncated`); `toolCalls` luôn là `unsupported` vì vendor CLI không cung cấp cho harness quan sát theo từng tool.

Vì vậy, một arm thất bại vẫn giữ partial output, stderr tail, exit status và các file change của nó, nhờ đó lỗi cuối cùng có thể được lần ngược về những gì arm đã thay đổi. Quan sát bị thiếu được ghi như một trạng thái; nó không bao giờ bị đọc như một lần chạy sạch.

## Metrics và decision gate {#metrics-and-decision-gate}

Task chỉ pass khi mọi check đều pass. Score là weighted mean của các paired task:

```text
lift = candidateScore - baselineScore
```

OMA cũng báo cáo:

- corrected task: baseline fail và candidate pass;
- regressed task: baseline pass và candidate fail;
- coverage: cần ít nhất năm paired, scoreable task.

Score decision là `pass` khi lift ít nhất 5 percentage point và không có regression. Bất kỳ regression nào cũng làm candidate fail. Lift không âm dưới 5 point tạo cảnh báo, còn ít hơn năm task ghép cặp tạo decision `insufficient`. Thêm `--require-coverage` để coverage không đủ trả về non-zero trong CI. Score không phải bằng chứng khi một arm bị thiếu, record hash cũ hoặc deterministic check chưa hoàn tất. Lỗi live dispatch và lỗi toàn vẹn của evaluator buộc decision thành fail; chúng không thể được tính là lift thành công. Rescore và fixture replay loại các arm có bằng chứng không đủ khỏi các cặp có thể chấm và báo decision `insufficient`, thay vì coi bằng chứng bị thiếu là một regression của candidate.

Một score đạt không xác lập việc đủ điều kiện thăng cấp. Report gồm partition, evaluator hash, `promotionReady: false` và các blocker tường minh. Các run legacy và validation thiếu bằng chứng final-test. Các dispatch route hiện tại không chứng thực việc giới hạn quyền truy cập filesystem, nên ngay cả một final-test run cũng không thể tuyên bố đã có đánh giá final được bảo vệ hay cho phép thăng cấp. Field này giữ ở false cho đến khi một execution provider có thể xác lập ranh giới đó.

## Ranh giới hiện tại {#current-boundary}

Candidate overlay được tạo từ bên ngoài; command này không triển khai builder hay loop `harness opt` tự động. Artifact capture, offline rescore, tool fixture replay, rerun từ file đã pin, chọn partition, evaluator có snapshot, execution manifest, environment allowlist và các trace event được liên kết đã có sẵn, nhưng việc giữ bí mật ở cấp OS cho dữ liệu held-out, giới hạn network hoặc credential, stochastic trial lặp lại, token accounting và ép model pin cho nested subagent call thì chưa được xác lập. Environment allowlist giới hạn những biến mà một vendor process kế thừa; nó không ngăn một vendor CLI đọc credential store của chính nó hay truy cập network. Cho đến khi có nested-call pinning, suite nhằm đo một model cố định nên tránh candidate workflow spawn các agent role đã cấu hình khác.
