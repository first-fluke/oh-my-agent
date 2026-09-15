---
title: "事故回归用例"
sidebar_label: 事故回归用例
description: "捕获已观测的智能体失败，保存其证据，并依据明确的回归契约评估候选 harness。"
---

# 事故回归用例

`oma harness incident` 把一次已观测的失败连接到一个回归用例，以及随后的候选评估。它分开记录观察结果和因果假设。仅凭进程失败，不能说明事故由模型引起。

## 查找候选

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

scan 读取 `.agents/state/agent-runs/`，只保留状态为 `failed`、`blocked` 或 `partial` 的运行，并丢弃已被某个已捕获事故通过 `source.runId` 引用的运行。`--skeleton` 会为一次运行打印一份规格，其中已填好 id、智能体、来源运行、观测到的失败、退出码，以及运行器保留时的智能体输出末尾部分；`expected_checks` 留作 `TODO`，因为正确行为是 scan 无法做出的决定。`oma agent spawn` 和 `oma agent parallel` 会把每次运行日志的最后 64 KiB 保存为 `.agents/state/agent-runs/<run-id>.output.txt`，并在运行记录中引用它。因此规格省略观察结果时，`capture --run` 会把该输出导入为观察结果，`incident promote` 也能据此校验派生的 fixture。请填好其余部分，再用 `--run <run-id>` 捕获，以保留运行的标识和工作区指纹。

## 自动捕获失败的运行

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

如果失败、阻塞或部分完成的运行所属任务带有契约，就不需要手写规格。预期行为就是契约的验收标准，它在运行之前已经确定。失败的验证收据所覆盖的标准即为未达标集合；若运行从未验证，则全部标准都未达标。opt-agent 会把未达标标准改写为判定器用的评分细则（`PASS only if …`），判定器用该细则对运行自身保留的输出打分，只有该输出不通过时才捕获事故：连失败都能通过的评分细则并没有捕获这次失败。规格会写到 `.agents/results/incidents/_specs/<id>.json`，并带着运行的标识被捕获，同时把该细则作为 `output_judge` 验收检查携带。没有保留输出、提示或契约的运行会被列为不可捕获，并说明原因。

`output_judge` 是一份靠评分来判定的契约。机械的 harness 评估器会把它报告为未评估；它的用途是 `incident promote` 用同一份评分细则派生出的技能回归 fixture。

## 捕获事故

在项目内保存一份 JSON 规格：

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`、`evidence_files` 和依赖 fixture 路径都相对于规格文件。命令检查的 `checker` 路径相对于项目。检查语法与 [Harness 评估](./harness-eval.md) 一致。初始目录必须是事先提供的运行前任务 fixture，且不含 OMA 或供应商指令文件；受评估的 harness 会单独注入。

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` 指向已存在的 `.agents/state/agent-runs/<run-id>.json`。它会保留运行/会话标识、供应商、状态和原始工作区指纹。规格中提供的提示优先于运行记录的提示。`source.trace_id` 可以把已上报的事故关联到外部 trace，而不抓取或上传它。

捕获后的清单位于 `.agents/results/incidents/<id>/incident.json`。若提供了初始快照，清单会包含它，还会包含来源证据与检查程序文件的哈希、验收检查、限制说明和清单哈希。已有 ID 不能被覆盖。敏感的观察文本会被脱敏；脱敏会作为精确重放的一项限制被报告。快照收集会拒绝不支持的文件，并设有文件数、总数和总大小的上限。证据引用保留哈希和路径，而不是每个被引用来源文件的副本。

可选的 `cause` 对象包含 `category`、`hypothesis`、`confidence` 和 `evidence`。类别为 `model`、`tool`、`config`、`context`、`application`、`evaluator` 和 `unknown`。省略时原因保持 `unknown`。

## 晋升为技能 fixture

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

已捕获的事故会成为失败智能体当时所执行技能的回归 fixture，于是 `oma skill optimize` 可以据此修复该技能。选择技能的方式，是把事故提示路由到已安装技能目录，并使用与 `oma skill eval --routing` 相同的说明级探针（一次模型调用）。路由没有选中任何技能时，使用 `.agents/agents/<agent>.md` 中智能体定义里 `skills:` 的第一项；再没有就使用名为 `oma-<agent>` 的已安装技能。`--skill` 会覆盖上述结果，晋升记录会记下三者中哪一项做出了决定（`attribution`）。fixture 会带上 `group: incident-<id>` 写入 `.agents/eval/<skill>/incident-<id>.yaml`，因此它绝不会横跨 train/validation/test 划分；晋升记录写在该事故旁边的 `promotion.json`。每次事故只能晋升一次。

检查程序来自验收检查。当每项检查都是 `output_contains` 时，fixture 就是确定性的 `assert`。否则这些检查无法在技能评估中运行（那里没有文件或命令），因此 `--draft` 会请 opt-agent 给出一条以 `PASS only if` 开头、并点明观测失败的评分细则。无论哪种方式，只有记录的失败输出没能通过时，fixture 才会被接纳：观测输出已经满足的 assert，或判定器针对该输出判为通过的草拟细则，都会因不构成回归用例而被拒绝。没有观测输出的事故无法校验，需要 `--force`，这会被记为一项限制。

## 闭合回路

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` 把部署反馈回路收进一条命令：加上 `--scan-runs` 时，先捕获每一个带契约且尚未捕获的失败运行（见上文），再把每一个已捕获但没有 fixture 的事故晋升（必要时起草评分细则），然后按受影响的技能分组，并在加上 `--live` 时让每个技能针对扩大后的套件优化一次，仍受常规关卡约束（held-in/held-out 验收、确认的负迁移、运行器拥有的最终测试）。`.agents/results/feedback/feedback-<ts>.json` 下的报告会列出晋升、被跳过的事故及原因，以及带 diff 的每个技能结果，于是从观测失败到候选编辑的整条链就是一条可审计的记录。请在失败的智能体运行被捕获之后，由调度器或运行后钩子运行它；`oma schedule create <agent> "Run \`oma harness feedback --scan-runs --apply --json\` and summarize the report" --cron "0 3 * * *"` 是夜间形式，下一次会话的状态快照会宣布它应用了哪些内容。

仍由人决定的部分：没有任务契约的运行没有记录预期行为，因此只会被 `incident scan` 列出，只能通过规格捕获；`--skeleton` 会起草一份规格。

## 导出并评估

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

导出会把保存的初始快照和一个单用例的探索性套件实体化。清单哈希与来源运行/trace 标识会随任务一起进入评估和记录。若改动导出的文件、提示、智能体、检查或被固定的检查程序来源，复用即失效。要修改验收契约，请新建一个事故 ID。

默认情况下，`reproduce` 会发起新的实时基线/候选比较并记录它。除非提供 `--yes`，否则适用常规的实时费用确认。该命令使用 harness 任务中配置的智能体供应商，包括 Codex；它不会把技能优化器的受保护编译器配置档强加到任务执行上。

如果没有捕获初始状态，`capture` 和 `show` 仍然可用，但可运行的导出和执行复现会以缺少证据的错误停止。历史运行的当前工作树无法确定它当时的原始状态。即使另外提供一份初始快照，也不能证明它与该历史运行等价；报告会说明这一限制。

## 选择证据操作

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| 操作 | 会发生什么 |
|---|---|
| `inspect` | 读取并汇总已保存的判定。不运行任何检查或智能体。 |
| `rescore` | 把当前的输出/文件检查应用到已保存的原始证据。旧的通过/失败字段会被忽略。 |
| `fixture-replay` | 针对记录的初始状态重放所提供的工具响应数据和文件改动。不运行模型或工具进程。 |
| `rerun` | 从记录的初始状态发起实际的基线/候选智能体调用。这会产生正常的模型用量。 |

要改订验收契约，请另建一个 harness 套件，并用同一套件/任务/事故标识与提示运行 `oma harness eval --action rescore`。导出的事故套件本身不可变。原始证据要求和工具转录结构见 [记录与重放详情](./harness-eval.md)。

外部依赖按 `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }` 声明。fixture 依赖指向一个使用完整 harness 转录结构的文件，其中 `taskId` 为事故 ID。离线事故重放会拒绝 live/unavailable 依赖、缺失的 fixture 文件、发生变化的 fixture 哈希、缺失的具名响应，以及与固定转录不同的请求/响应/文件改动。它仍然无法证明作者声明了全部外部依赖。实时重跑同样不能保证外部服务的表现与历史一致。

捕获、导出和评估会发出本地 `harness.incident.*` 事件，把事故、候选/基线哈希、执行模式，以及被修正或发生回归的任务 ID 连接起来。单个用例的事故只是回归证据，不能替代验证套件和最终测试套件。当前的 harness 配置档会报告 `promotionReady: false`；这些操作不会建立受保护最终测试的隔离，也不会自动晋升候选。
