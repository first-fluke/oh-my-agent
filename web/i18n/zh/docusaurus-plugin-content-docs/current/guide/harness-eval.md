---
title: "Harness 评估"
sidebar_label: Harness 评估
description: "使用成对、隔离的仓库任务和确定性产物检查，评估完整的 OMA harness 覆盖层。"
---

# Harness 评估

`oma harness eval` 用于衡量候选 OMA harness 是否能在不改变目标智能体模型的情况下提升它的表现。它采用 [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307) 中的测试时评估模式：固定目标模型，改变 harness，并在同一组任务上比较结果。

该命令评估的单元比 `oma skill eval` 更大：

| 命令 | 处理对象 | 评分目标 |
|:--------|:----------|:-------------|
| `oma skill eval` | 一个 `SKILL.md` 正文 | 智能体输出 |
| `oma harness eval` | 范围限定的 `.agents/` 覆盖层 | 仓库工作区中产生的文件和输出 |

用技能评估回答“这个技能有帮助吗？”，用 harness 评估回答“这组技能、工作流、规则和智能体指令，能否让固定智能体更可靠地完成仓库任务？”

## 评估模型

实时运行会把每个任务作为成对实验来评估：

1. OMA 捕获初始的任务 fixture。完整快照为两个分支提供初始文件，使它们从相同的文件开始，即使源 fixture 在执行期间发生变化。
2. OMA 将当前的 `agents`、`config`、`rules`、`skills` 和 `workflows` 定义复制到该工作区，并投影为所选供应商格式。
3. OMA 在第二个新的工作区中重复设置，然后在那里应用候选覆盖层。
4. 两个分支使用相同的主智能体、供应商路由、提示、写权限和超时。
5. 确定性检查会检查生成的工作区以及可选的智能体输出。受信任的命令检查随后在任务产物的全新副本中运行。

真实项目永远不会作为任一分支的工作目录。OMA 会在检查和清理临时工作区之前，捕获原始输出和最终任务产物。所选供应商自己的进程沙箱仍是访问该工作目录以外内容的权威边界。

## 候选目录布局

候选路径是包含部分 `.agents/` 树的目录：

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

只接受 `.agents/agents`、`.agents/rules`、`.agents/skills` 和 `.agents/workflows` 下的文件。钩子、评估 fixture、状态、结果、配置文件、符号链接和供应商智能体变体都会被拒绝。受保护的智能体 frontmatter 字段，例如 `model`、`tools`、`effort` 和执行限制，必须与基线一致。若运行中的智能体在评分前修改受保护的 `.agents/` 定义，该分支也会失败。

## 套件格式

套件由一个 YAML 文件和每个任务一个 fixture 目录组成：

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

版本 2 要求同时包含 `validation` 和 `final-test` 任务。每个任务都必须声明其分区。默认为 validation；候选选定后如需单独的最终运行，请使用 `--partition final-test`。两个分区不能共享或嵌套 fixture 目录。请将记录文件保存在 fixture 目录、候选覆盖层和评估器输入之外；放在这些位置会被拒绝，以防止后续运行看到最终检查。版本 1 的套件仍作为 `exploratory` 运行，不能被选为 final-test。

任务 ID 必须唯一。fixture 路径和检查路径必须保持在项目与任务工作区内。套件和 fixture 还必须位于复制到每个分支的基线定义之外。fixture 不能包含符号链接，也不能包含 `.agents`、`.codex`、`.claude`、供应商技能目录或根目录智能体指令文件等 harness 控制面。这样可以防止任务数据遮蔽两个分支所使用的受控 harness。

像 `node_modules` 和 `.venv` 这样的生成依赖目录不会从基线 harness 复制。将确定性的辅助源代码和依赖清单提交到技能中；检查需要运行时依赖时，在任务 fixture 中提供它们。

### 检查类型

| 类型 | 字段 | 通过条件 |
|:-----|:-------|:---------------|
| `file_exists` | `path` | 分支完成后路径存在。 |
| `file_not_exists` | `path` | 路径不存在。 |
| `file_contains` | `path`、`value` | 文件存在且包含该值。 |
| `file_not_contains` | `path`、`value` | 文件存在且不包含该值。 |
| `output_contains` | `value` | 捕获的智能体输出包含该值。 |
| `output_not_contains` | `value` | 捕获的智能体输出不包含该值。 |
| `output_judge` | `rubric` | 随事故携带、靠评分判定的契约；机械评估器将其报告为未评估（参见[事故回归用例](./harness-incidents.md)）。 |
| `file_json_equals` | `path`、`value`、可选的 `pointer` | 解析后的文件 JSON 等于 `value`，可选在某个 JSON Pointer 指向的位置比较。 |
| `output_json_equals` | `value`、可选的 `pointer` | 捕获的输出是有效 JSON 且等于 `value`，可选在某个 JSON Pointer 指向的位置比较。 |
| `command` | `argv`、`checker`、`timeout_ms`、`expected_exit_code` | 受信任的子进程在超时前完成，并返回指定的退出码。 |

JSON 断言比较解析后的值，包括类型；表示成功的文字描述无法满足 JSON 状态断言。`pointer` 使用 JSON Pointer 语法，例如 `/result/count`，默认指向整个值。

命令检查由受信任的套件所有者编写：

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` 相对于套件文件解析。它必须是独立的普通源文件，存放在所有 fixture、候选覆盖层和基线 `.agents` 定义之外。`argv[0]` 必须是项目之外以绝对路径给出的可执行文件；`{checker}` 必须是完整的参数。OMA 直接传递参数，不经过 shell 插值。超时必须是不超过 300,000 毫秒的正整数。退出码是 0 到 255 的整数。

调度前，OMA 会对检查程序的源码字节做快照，并对评估器定义和可执行文件计算哈希。调度后，它会把任务产物复制到单独的临时工作区，把已做快照的检查程序写到这些产物之外，并在那里调用它。每条命令都会得到全新的副本；一个检查程序无法改变下一项检查的输入。生成的 harness 投影会被排除，产物中的符号链接会被拒绝。分支运行期间检查程序源码发生变化，会使该分支失败；被修改的源码绝不会替代快照。检查程序应针对产物或应用行为使用固定断言，不应把判定交给候选能够编辑的测试或包脚本。

检查及检查程序路径不会加入智能体提示或 fixture。所选任务的输入在其运行期间必然可见。这样既保护评估器的完整性，又能分隔各分区；它不能阻止同一用户的进程读取主机上的其他文件。

## 运行并记录

实时模式会为每个所选任务发起两次调度，打印调度预览，并要求确认：

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

使用 `--yes` 进行非交互式执行，使用 `--timeout-minutes` 设置两个分支相同的墙钟限制。实时执行要求供应商能相对于项目工作区发现 harness 文件。OMA 拒绝基于 HOME 的发现，因为这样基线可能看到全局安装的候选内容。

`--record` 会写入不可变的版本 2 JSON 记录。默认位置是套件旁的 `_runs/`，文件名中带有基线/候选哈希。再次实时运行时请使用新的 `--record-file`；已存在的目标会在调度前被拒绝。记录会保留：

- 套件标识、分区、提示与 fixture 的来源信息、基线/候选哈希，以及评估器/检查程序/可执行文件的哈希；
- 原始输出及其哈希，包括失败调度中可获得的诊断 stdout；
- 初始和最终的产物清单，包含文件字节、每个文件的哈希、文件/目录权限模式和清单摘要；
- 检查程序引用、分支结果、提供时的事故标识，以及重跑所依据的来源记录哈希。

任务快照的上限为：每个文件 5 MiB、总计 32 MiB、2,000 个条目。符号链接、特殊文件、含机密的路径、不可读文件和超大数据会被记录为省略项。复制进来的 harness 控制面不会进入最终任务产物。不完整的快照仍然是明确的证据限制；它们不能支撑固定文件重跑，也不能满足文件重新评分。原始调度成功时，原始输出仍可支持仅针对输出的检查。

记录有自己的完整性哈希。记录或产物哈希发生变化会被拒绝。这些哈希用于标识证据；它们不能证明进程的访问受到限制，也不会使结果具备晋升条件。

### 执行条件

每次实时或重跑评估都会在第一次调度之前解析出执行清单，并以 `manifest` 存入记录。它写明判定所描述的条件，使已保存的评分不会被误认为是关于另一个模型、CLI 或 OMA 构建的证据：

| 字段 | 含义 |
|---|---|
| `vendor`、`dispatchMode`、`runtimeVendor`、`command` | 解析出的调度路由和 CLI 可执行文件名称。 |
| `model`、`modelSource` | OMA 从智能体计划或供应商默认值解析出的模型。`vendor-session` 表示由供应商自己的会话配置选择模型，OMA 没有固定它。 |
| `effort`、`thinking` | 取自智能体计划的推理设置（若存在）。 |
| `cliVersion`、`cliVersionStatus` | `<command> --version` 的第一行（`probed`），探测失败时为 `unavailable`。 |
| `omaVersion`、`platform`、`arch`、`node` | 主机和 OMA 构建。 |
| `environmentPolicy` | 分支收到的环境变量名称、被强制设置的条目，以及被丢弃的数量。绝不记录值。 |
| `memory`、`confinement` | 每个分支的 `memory` 都是 `disabled`；`confinement` 说明调度限制了什么、没有限制什么（临时工作区、不受限制的网络、继承的凭据、供应商默认工具）。 |
| `manifestHash` | 上述条件的标识。 |

清单只是描述，不是证明：它记录 OMA 解析出的内容，其 confinement 字段也明确说明网络和凭据隔离并未强制执行。`promotionReady` 保持为 `false`。

### 环境策略

两个分支收到相同的经允许列表过滤的环境。基础变量（`PATH`、`HOME`、区域设置、临时目录、代理和证书设置）、所有 `OMA_*` 变量，以及目标供应商的凭据和运行时检测前缀会传入进程；调度构建器为本次调用添加的条目也会保留。其余变量一律丢弃，使候选不会意外拿到部署令牌或其他提供商的密钥。`OMA_NO_AGENTMEMORY=1` 被强制设置，使供应商内存无法在基线和候选分支之间传递上下文。

设置 `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2` 可透传任务确实需要的额外变量。这些名称会出现在清单的 `environmentPolicy.extra` 下。供应商没有已知前缀集时，清单会报告 `vendorKnown: false`，只有基础变量、`OMA_*` 和透传条目会到达进程。

## 复用记录

该命令区分四种操作：

| 操作 | 执行的工作 | 智能体/模型调用 |
|:-------|:---------------|:------------------|
| `inspect` | 在来源校验之后汇总已保存的分支判定。不运行任何检查。 | 无 |
| `rescore` | 将当前的输出/文件检查应用于原始输出和产物字节。 | 无 |
| `fixture-replay` | 匹配提供的工具请求转录，重放其中的 fixture 响应和文件改动，然后应用受支持的检查。 | 无 |
| `rerun` | 在以已记录初始快照为起点的全新工作区中运行已配置的智能体。 | 每个所选任务两次 |

`--action inspect` 是默认值。`--mock` 是 `inspect` 的别名，不能与其他操作组合使用。`inspect` 和 `fixture-replay` 都不会重新运行智能体。

### 查看已保存的判定

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

`inspect` 要求原始套件、分区、评估器、基线和候选的哈希全部匹配。它会显示已记录的评分，而不调用检查程序，也不重新评估输出。版本 1 的记录在所需来源信息匹配时仍可用于查看。缺少分区/评估器来源信息的更早记录无法通过当前 CLI 的校验。旧版判定不能被重新标记为新的原始证据：如需重新评分、fixture 重放或固定文件重跑，请收集新的实时记录。

### 重新评分原始证据

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

重新评分使用当前的检查，并忽略原始的 `passed` 值和检查判定。套件标识、任务 ID/提示/事故标识、基线、候选以及所选分区仍必须匹配。检查程序的定义可以变化；新的结果说明原始字节在这些检查下的表现。当前 fixture 文件的改动不会取代已记录的最终产物。

命令检查不足以支持离线重新评分，因为记录没有固定外部运行时和环境。针对被排除或不完整产物的检查同样不足。失败的原始调度只留下诊断输出，无法通过重新评分变成有效的测量。当前验收标准需要执行命令时，请使用实时重跑。

### 重放工具 fixture

转录文件包含一个对象，或包含任务 ID 互不相同的对象数组。请为每个所选任务提供一份转录：

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

请求必须按工具名称和请求值，与步骤序列精确匹配。`writes` 和 `removes` 是可选的、以相对路径表示的任务文件改动；它们不能逃出工作区，也不能修改 harness 控制面。工具名称只是数据，不会执行转录中的任何命令。`output` 是 fixture 数据，输出检查需要时必须提供。

每个声明的依赖都有 `name`、`repeatability`（`fixture`、`live` 或 `unavailable`），以及可选的 `reason` 和 `fixture` 引用。fixture 依赖要求存在工具名称与之匹配的步骤。live 或 unavailable 依赖会使重放结果不充分。可选的 `fixture` 字段只起说明作用；重放使用所提供的步骤，而不会加载该路径。转录重放会校验已声明的依赖，但不能证明每个历史依赖都已被捕获。

两个已记录的分支必须具有相同的完整初始快照。OMA 对每个分支应用相同的转录，并运行当前的输出/文件检查。命令检查需要实时重跑。这些结果只表明所提供的 fixture 序列可以被重放；它们不能证明候选在行为上有改进，也不能证明模型可复现。

### 基于固定的初始文件重跑智能体

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

重跑要求套件/任务标识匹配，并且两个原始分支的完整初始快照完全相同。它使用当前的基线、候选、已配置的供应商/模型路由和当前检查，发起真实的智能体调用。它不会把原始最终产物当作起始状态，所以之后对源 fixture 的编辑不会悄悄改变已记录的初始状态。

重跑与实时运行具有相同的调度预览、确认和超时行为。它们可以使用变更后的候选；请用 `--record-file` 显式选择原始来源。添加 `--record` 可保存一个以 `-rerun-<timestamp>.json` 结尾的新同级文件，并链接到来源记录哈希。原始记录会保留。

固定的文件无法复现外部服务状态、时钟行为或模型采样。重跑是在所述条件下新得到的行为证据，并不意味着原始智能体轨迹被确定性地复现。

### 重放时的已记录条件

`inspect`、`rescore` 和 `fixture-replay` 会报告记录中保存的清单，并带有 `conditions: "recorded"`；早于清单出现的记录则为 `conditions: "unavailable"`。OMA 还会解析当前条件，并把供应商、调度模式、模型、effort、thinking、CLI 版本、OMA 版本或主机上的每一处差异列为重放限制和晋升阻碍项：

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

只有当记录本身带有已探测的版本时，重放才会探测 CLI 版本；缺少探测结果的版本对会被报告为不可比较，而不是相等。已记录的判定仍可在其原始条件下查看。在实时或重跑评估产生清单匹配的记录之前，它们不能作为候选在当前条件下的证据。

### 用量

供应商报告用量时，每个分支都会存储 `usage`：输入和输出 token、以美元计的费用、墙钟时间，以及产生大部分输出的模型。评估会把它们汇总为 `usage`，其 `status` 为 `actual`、`partial`（部分分支没有报告任何内容）或 `unknown`。供应商的结果信封会在检查运行之前、输出被记录之前解包，因此 `output_contains` 和 `output_json_equals` 看到的是智能体的答案，而不是它外面的 JSON 记账信息；信封中的用量正是此字段的来源。

### 报告标签

报告包含 `executionMode`、`evidenceStatus`（`complete`、`insufficient` 或 `legacy`）、`replayLimitations`，以及可用时的 `sourceRecordHash`。实时和重跑报告还会加入 `manifest`、`conditions: "current"` 和 `traceSession`。证据完整性描述当前操作能够查看或评估的内容。即使当前的文件捕获是完整的，继承而来的事故限制仍然可见。`promotionReady` 在每种模式下都保持为 `false`。

## Trace 事件

每次实时或重跑评估都会向本地会话 `oma-harness-<suite-id>` 写入相互关联的事件：

| 事件 | 载荷 |
|---|---|
| `harness.eval.started` | 操作、套件/基线/候选/评估器哈希、分区、清单哈希、解析出的供应商、模型、CLI 版本和任务数。 |
| `harness.arm.completed` | 每个分支一条：任务、分支、通过状态、时长、输出哈希、调度错误、退出码、超时标志和分支 trace。`parentEventId` 指向 started 事件。 |
| `harness.eval.completed` | 决策、提升值、证据状态，以及使用 `--record` 时的记录路径和哈希。 |

同一次评估的所有事件共用一个 `causalityKey`。某个事件无法写入时，报告会把 `Trace event <kind> was not recorded` 列为重放限制，而不是悄悄省略它。

每次分支运行还会在记录中保存 `diagnostics` 和 `trace`：

- `diagnostics`：退出码、信号、超时标志，以及 stderr 的最后 8 KiB 和 `stderrStatus`（`captured`、`truncated` 或 `unavailable`）。
- `trace`：harness 能够观察到的内容。`output` 为 `complete`、`partial`（失败的进程仍产生了 stdout）或 `unavailable`；`artifacts` 说明最终快照是否完整；`changedPaths` 列出分支相对于固定初始工作区新增、修改或删除的文件（上限为 200 个，并带有 `changedPathsTruncated`）；`toolCalls` 始终为 `unsupported`，因为供应商 CLI 不会向 harness 暴露逐个工具的观察结果。

失败的分支因此会保留其部分输出、stderr 末尾、退出状态和文件改动，使最后一个错误可以追溯到该分支改动了什么。缺失的观察会被记录为一种状态；它绝不会被读成一次干净的运行。

## 指标和决策关卡

只有每项检查都通过时，任务才通过。评分是成对任务的加权平均值：

```text
lift = candidateScore - baselineScore
```

OMA 还会报告：

- 已修正任务：基线失败而候选通过；
- 已回归任务：基线通过而候选失败；
- 覆盖率：至少需要五个成对且可评分的任务。

评分决策在提升值至少为 5 个百分点且没有回归时为 `pass`。任何回归都会使候选失败。非负但低于 5 个百分点的提升会发出警告，成对任务少于五个会产生 `insufficient` 决策。在 CI 中添加 `--require-coverage`，让覆盖不足以非零状态退出。如果某个分支缺失、记录哈希过期或确定性检查未完成，评分不构成证据。实时调度错误和评估器完整性错误会强制得到失败决策；它们不能算作成功的提升。重新评分和 fixture 重放会把证据不足的分支从可评分的成对任务中剔除，并报告 `insufficient` 决策，而不是把缺失的证据当作候选回归。

评分通过并不意味着具备晋升资格。报告包含分区、评估器哈希、`promotionReady: false` 以及明确的阻碍项。旧版运行和 validation 运行都缺少 final-test 证据。当前的调度路由无法证明文件系统访问受到限制，因此即使是 final-test 运行，也不能声称完成了受保护的最终评估，或批准晋升。在执行提供方能够建立这一边界之前，该字段始终为 false。

## 当前边界

候选覆盖层由外部生成；该命令不实现构建器，也不实现自动化的 `harness opt` 循环。目前已提供产物捕获、离线重新评分、工具 fixture 重放、固定文件重跑、分区选择、做过快照的评估器、执行清单、环境允许列表和相互关联的 trace 事件，但对保留数据的操作系统级保密、网络或凭据的访问限制、重复的随机试验、token 记账，以及为嵌套子智能体调用强制固定模型，都尚未建立。环境允许列表限制供应商进程继承哪些变量；它不能阻止供应商 CLI 读取自己的凭据存储或访问网络。在嵌套调用固定功能存在前，计划测量一个固定模型的套件应避免会生成其他已配置智能体角色的候选工作流。
