---
title: "技能效用评估"
sidebar_label: 技能评估
description: "说明如何为 oma skill eval 编写评估任务 fixture、使用 .agents/eval/ 目录约定、选择检查类型，以及使用 mock/live 执行模式。"
---

# 技能效用评估

`oma skill eval` 衡量加载某个技能是否确实改善智能体任务结果。它回答的问题不同于 `oma skill audit`（询问“两个技能是否重复？”）：它询问“这个技能有帮助吗？”。

设计遵循两项研究发现：WikiSkill（arXiv:2608.27454）将原始经验、持久化知识和可执行技能分开，同时保留用于演进的保留集关卡；SkillLens（arXiv:2605.23899）表明技能效用独立于描述的独特性，一个独特的技能仍可能无用，存在重叠的技能仍可能有帮助。

---

## 工作原理

对于每个任务 fixture，命令运行两个分支：

1. **基线分支**：将任务提示调度给一个不提供该技能的智能体。
2. **处理分支**：把 `SKILL.md` 加到提示开头，然后调度相同任务。

每个分支都由任务的检查器评分（0 = 失败，1 = 通过）。主要指标是：

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

`utilityLift ≥ 5%` 时技能通过。低于该阈值时会标记为警告（提升有限）或失败（没有提升）。得出结论至少需要 5 个可评分任务。

---

## `.agents/eval/<skill>/` 约定

将任务 fixture 放在 `.agents/eval/<skill>/` 下。此路径位于 `.agents/` 内，但位于技能目录之外，因此 `oma update` 不会覆盖用户编写的评估。

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

加载任务 fixture 时会跳过以 `_` 开头的文件。`_rollouts/` 子目录保存之前 `--live --record` 运行记录的输出。

---

## 任务 fixture 模式

每个 fixture 都是包含以下字段的 YAML 文件：

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

| 字段 | 必填 | 说明 |
|:------|:---------|:-----------|
| `id` | 是 | 此任务的唯一标识符（用于 rollout 文件名和报告）。 |
| `skill` | 是 | 要评估的技能（与父目录名称匹配）。 |
| `domain` | 是 | 用于分组和选择负迁移邻居任务的领域标签。 |
| `prompt` | 是 | 调度给两个分支的任务提示。 |
| `checker` | 否 | 如何评分智能体输出。省略时默认为 `{ type: judge }`。 |
| `weight` | 是 | 加权平均分使用的相对权重（除非任务重要性不同，否则使用 `1`）。 |
| `group` | 否 | 系列标签。`oma skill optimize` 会让共享同一 group 的 fixture 留在同一个 train/validation/final-test 分区中，避免近似重复的任务跨拆分泄漏。 |

### 检查器类型

#### judge（默认）

LLM 根据 rubric 评估分支输出，并返回 PASS 或 FAIL。省略 `checker` 或省略 `checker.type` 时，这是默认类型。

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

`rubric` 字段可选；省略时使用默认 rubric：“答案是否正确且完整地满足任务提示？”

为了简写，也可以将 rubric 写在顶层：

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**重要**：在 `--mock` 模式中，judge 任务需要 `_rollouts/` 中之前记录的结论。如果任务没有已记录的结论，它会带警告从报告中排除。先运行 `--live --record` 填充 rollout。

任意检查器类型在某个分支完全缺失时也遵循相同规则：任务会被排除，而不是评分为 0。缺失数据不是失败答案，给它评分会让两个分支都变成 0，使零提升读作 `decision: "fail"`。如果排除后已评分数量低于 `MIN_TASKS`，报告会显示 `coverage: "insufficient"`。

#### assert（选择启用）

确定性的子串检查。用于契约、格式或工具调用验证，其中预期输出是精确值。

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

只有当分支输出包含 `expect_contains` 中的每个字符串时才通过。

#### regex（选择启用）

确定性的正则匹配。需要模式而非精确字符串时使用。

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

为防止 ReDoS，超过 200 个字符的模式评分为 0。匹配前会将输出截断到 10,000 个字符。


---

## 执行模式

### --mock（默认）

从 `_rollouts/` 重放已记录的 rollout。完全确定性且离线，不会调用 LLM。

- 对于 `assert`/`regex` 检查器：根据记录的输出字符串计算分数。
- 对于 `judge` 检查器：重放 `--live --record` 记录的 `score` 字段。

如果 judge 任务在 `_rollouts/` 中没有记录的分数，它会从报告中排除（并打印控制台警告）。这样能让 mock 模式严格保持离线。

记录在使用前也会检查是否过期。技能正文、提示、任务/检查器契约、实际生效的 judge rubric 以及评估器协议修订版本发生变化，都会使受影响的条目失效。缺少来源信息的条目同样会被丢弃，并给出包含文件和数量的警告。如果剩余可评分任务少于 `MIN_TASKS`，运行会报告 `coverage: "insufficient"` 而不是结论。

:::note `oma skill optimize --mock`
优化器会为候选 SKILL.md 正文评分。由于记录只对创建它的正文有效，候选正文没有匹配的 rollout，报告会显示未覆盖。使用 `--live` 为候选评分。
:::

适合 CI。设置 `OMA_SKILLEVAL_MOCK=1` 强制使用此模式。

```bash
oma skill eval --skill oma-scholar
```

### --live

通过 `oma agent spawn --read-only` 生成真实智能体分支。每个任务分支都在各自的临时工作区中运行，因此一个分支产生的文件不会影响另一个分支。进程失败、API 错误信封和 judge 失败会把整个成对比较排除在评分和记录之外；部分输出只是诊断数据。

调度前，命令会打印成本预览，其中列出任务数、分支调度数、judge 调度数和解析出的供应商。使用 `y` 确认，或使用 `--yes` 跳过确认。

以下控制项对 CI 和覆盖率调查有帮助：

| 选项 | 作用 |
| --- | --- |
| `--task-dir <path>` | 从 `.agents/eval/<skill>` 之外的目录评估 fixture。 |
| `--max-tasks <n>` | 为有界实时运行限制 fixture 数量。 |
| `--trials <n>` | 将每个分支重复 `n` 次（1 到 10）。先启动的分支在各次试验之间交替，每个任务的分数取平均，报告会增加任务内方差。`--neg-transfer` 的邻居任务只运行一次。 |
| `--neg-transfer` | 在属于其他技能的同领域任务上测量候选技能，默认关闭。 |
| `--routing` | 测量激活情况：对每个任务，根据每个技能的 `description` 询问会加载哪个已安装技能。live 会实际测量（每个任务多一次调度）；mock 会重放在同一技能目录下录制的路由记录。 |
| `--require-coverage` | 可评分的成对任务少于五个，或所请求的负迁移检查不完整时，以非零状态退出。 |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### 负迁移测量

使用 `--neg-transfer` 时，每个被选中的邻居任务会运行两次：先是不含候选的全新基线，再是注入了确切候选正文的处理分支。邻居是同一 `domain` 中属于其他技能的任务。如果没有其他技能共享该领域，则改用有上限的跨领域样本（最多六个任务，分散在其他技能中），并且 `negativeTransferCoverage.scope` 报告 `cross-domain`；注入正文造成的干扰并不局限于它自己的领域；技能独占某个领域，也不能让这项检查无法进行。两个分支使用同一个评估器和各自独立的空工作区。差值为处理组分数减去基线分数；负值表示候选损害了该邻居任务。实时预览包含这些额外的分支和 judge 调度。`--max-tasks` 同样会限制邻居样本，并在有任务被省略时给出警告。

使用 `--live --neg-transfer --record`，可将针对候选的比较保存到 `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/` 下。mock 重放要求候选标识、正文哈希、完整的任务/检查器哈希，以及两个分支共用的比较 ID 全部匹配。邻居任务的普通评估记录不能代替这项测量。

每个 `negativeTransfer` 条目都带有 `trials`（`delta` 背后的成对比较次数）。优化运行会在拒绝候选之前，对发生回归的邻居重新测量一次，并加入 `confirmed`（重复测量也回归时为 `true`，否则为 `false`）；`oma skill eval --neg-transfer` 只报告单次比较。报告包含 `negativeTransferCoverage`，其中有 `status`、`expected` 和 `scored`。未使用该标志时，状态为 `not-requested`；每个被选中的邻居都有有效的成对结果且样本非空时，状态为 `measured`；邻居数为零或任何比较缺失时，状态为 `insufficient`。空的 `negativeTransfer` 数组因此并不能证明不存在回归。当所请求的负迁移覆盖不足时，JSON 的 `ok` 为 false。

#### 技能隔离（保持基线诚实） {#skill-isolation-keeping-the-baseline-honest}

只有当**基线分支在没有目标技能的情况下运行**时，`utilityLift` 才有意义。问题在于：被调度的智能体会自动加载其运行时安装的所有技能，因此一个朴素的基线仍会加载本应被测量为“不提供”的技能，导致比较被污染（基线约等于处理组，提升约等于 0）。

为防止这种情况，`--live` 会**让两个分支各自在独立的临时工作区中运行**。受保护的 Claude 和 Codex 配置档会禁用自动的技能/指令发现以及智能体工具。处理分支**只**通过注入的 `SKILL.md` 获得目标技能。探索性配置档使用不含目标技能的已过滤技能目录，但仅凭这一点不能证明已经隔离。

干净的工作目录会隐藏项目本地的技能发现，但运行时隔离还取决于供应商配置档。报告通过 `isolation` 字段声明经过验证的级别：

| 状态 | 含义 |
|---|---|
| `enforced` | 目标 ID 有效且没有 HOME 副本的受保护 Claude，或具备发现/工具抑制以及运行时线程检查的原生 Codex。运行时契约失败会中止调度。 |
| `best-effort` | 没有受保护文本配置档的运行时、无效的目标 ID，或存在 Claude HOME 副本；隔离未经验证。 |
| `unavailable` | 基于 HOME 的供应商（例如 **antigravity**，它读取 `~/.gemini/antigravity-cli/skills`）；干净的 cwd 无法隐藏它。打印警告，结果标记为低置信度。 |
| n/a | mock 模式，不进行实时调度。 |

其他运行时配置档仍可用于探索性评估，但 `best-effort` 和 `unavailable` 的结果会阻止实时优化的晋升。评估供应商遵循项目的模型配置。Codex 通过 `app-server` 使用其原生 CLI 登录以及已配置的模型/提供方；它不会悄悄切换到 Claude 或基于 API 密钥的客户端。受保护的 Codex 契约面向 macOS/Linux 上的 CLI 0.154.x，要求使用原生文件凭据存储，并且已存在 `auth.json`。私有的临时配置主目录引用原始的配置/认证文件，同时排除共享的引导状态；凭据不会被复制，原生刷新使用原始认证文件。目前不支持 keyring、auto 和 ephemeral 凭据存储。不受支持的版本、存储模式和契约失败都会变成调度错误。

judge 在全新的临时目录中运行，并禁用优化内存。Claude 和 Codex 的 judge 使用与评估分支相同的受保护文本传输。judge 的供应商配置在本次运行期间保持固定。

### --live --record

运行实时分支，并将捕获的输出（包括 judge 检查器任务的判定）写入 `_rollouts/<hash>.json`。文件名是任务 ID 集合的确定性 SHA-256 哈希，不使用日期或随机值。

使用此模式在自己的机器上准备 `--mock` 运行所需的数据，让重复运行保持离线。

每个条目都携带来源信息，以便之后的重放判断它是否仍适用：

| 字段 | 记录于 | 比较对象 |
|---|---|---|
| `skillBodyHash` | 仅 `treatment` | 正在评估的 SKILL.md 正文 |
| `promptHash` | 两个分支 | fixture 当前的 `prompt` |
| `taskHash` | 两个分支 | 完整任务、实际生效的检查器/默认 judge rubric，以及 `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | 两个分支（`--trials` > 1） | 将同一次重复中的基线和处理分支配对；单次试验时不存在 |
| `judgeResponse` | judge 任务 | judge 解包后的判定文本（有长度上限），保留它以便审计已存储的 `score` |

分支输出以答案文本记录。当供应商 CLI 返回 JSON 结果信封时，会存储并评分 `result` 字段；信封中的记账信息绝不会被 `assert`/`regex` 检查器匹配，也不会被 judge 解析器读取。

基线分支不提供技能，因此仅编辑 SKILL.md 不会使其记录失效。对任务或评估器契约的改动会使两个分支都失效。实时记录会重新运行两个分支。

早于完整任务/评估器来源信息的记录，必须用 `--live --record` 重新生成（邻居比较还要加上 `--neg-transfer`）；给旧分数补上新哈希无法验证它们。同一份契约也参与优化套件的标识，因此在更新后的契约下不会复用此前套件范围内的知识。当评分器行为、judge 提示/判定解析或其他隐含的评估器行为发生变化时，请通过递增来维护 `SKILL_EVAL_PROTOCOL_REVISION`。

:::caution `_rollouts/` 仅限本地使用，请勿提交
记录只对创建它时的确切 SKILL.md 正文重放。编辑技能后，处理记录会在下一次 `--mock` 运行中被丢弃，并为所有拉取该仓库的人产生警告。该目录已加入 gitignore，请在本地记录。
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

成功的实时运行后，报告包含基线和处理组计数、`utilityLift`、`coverage: "ok"`、隔离状态以及 pass/warn/fail 决策。之后的 mock 运行只会复用任务提示和处理技能正文仍然匹配的记录。

---

### 并发与调度超时

实时分支、邻居分支、judge 调用和路由探测通过一个最多包含 `OMA_SKILL_EVAL_CONCURRENCY` 个子进程的有界池运行（默认 4，最多 16）。一次试验的两个分支总是一起在各自独立的空目录中运行，先启动的分支在各次试验之间交替，结果保持任务顺序，因此记录和分数与串行运行相同。将该变量设为 1 即可串行执行。

每个实时分支和 judge 调用会在 `OMA_SKILL_EVAL_TIMEOUT_MS`（默认 180000）到期后被终止。超时的调度会先重试一次，之后才把任务排除出报告，因为一次缓慢的响应是传输失败，而不是答案；第二次超时会排除该任务（在优化中还会使该拆分的覆盖检查失败）。如果 fixture 确实需要长答案，请调高该限制。

## 路由：技能会被选中吗？

效用提升衡量的是正文被加载之后它能做什么。供应商根据技能 frontmatter 中的 `description` 决定是否加载该技能，因此更好但从未被选中的正文并不算改进。`--routing` 会把每个任务提示，连同每个已安装技能的名称和描述，发送给同一个受保护模型，并询问它会加载哪一个技能（或 `NONE`）。选中目标技能算作一次激活；选中其他技能算作误路由；`NONE` 算作未命中。

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

JSON 报告带有 `routing`，其中包含 `status`、各项计数、`activationRate`、`misroutedTo` 和 `catalogSize`；`findings` 中的每个条目带有 `routing: target | other | none | unparsed`。使用 `--record` 时，这些选择会连同技能目录的哈希一起保存到 `_rollouts/<hash>.routing.json`。之后的 `--mock --routing` 只有在每条描述和每个任务都未改变时才会重放它们；否则 `status` 为 `stale`，且不计入任何内容。

这是通过受保护传输，对照技能目录来衡量描述。它不检验供应商自己的发现机制（受保护配置档特意禁用了它），也不衡量已加载技能的流程是否被遵循；那仍属于效用测量。

## 最小可用 fixture 集

要得出结论，需要五个 fixture（`MIN_TASKS = 5`）。下面是虚构 `oma-scholar` 技能的最小集合：

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

至少再重复创建三个任务。然后运行：

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```


---

## 阅读报告

**文本输出：**

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

**JSON 输出**（使用 `--json`）：

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

`usage` 汇总供应商为已评分分支报告的用量，并单独汇总其 judge 调用的用量：调度次数、输入和输出 token（包括缓存读取和写入），以及以美元计的费用。每次调度都报告了用量时，`status` 为 `actual`；部分调度没有报告时为 `partial`；全都没有报告时为 `unknown`（Codex bridge 这类纯文本传输不会报告任何内容）。已记录的 rollout 在每个条目中都带有 `usage` 和 `judgeUsage`，因此 mock 重放报告的是它所复用记录的费用，而不是零。

`repeatability` 把任务层面的差异与重跑差异区分开。`liftCi95` 是对各任务提升值做的成对 95% t 区间（已评分任务少于两个时为 null）。`--trials` 为 2 或更大时，`withinTaskStdDev` 是各任务的试验间提升值标准差的平均值，并且只有当区间在提升值所在一侧排除零时，`status` 才为 `stable`；否则为 `unstable`，`pass` 会被降级为 `warn`。单次试验的运行会报告 `single-trial`：它可以显示提升，但不能证明这种提升可以重复出现。

只有当 `coverage === "ok"`、`decision === "pass"`，并且所请求的任何负迁移检查都有足够覆盖时，`ok` 才为 `true`。`isolation` 字段报告基线分支是否确实在没有目标技能的情况下运行（请参阅[技能隔离](#skill-isolation-keeping-the-baseline-honest)）；在 `--mock` 模式下，`isolation` 为 `"n/a"`。


---

## CI 集成

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

退出码：
- `0`：通过或警告
- `1`：失败，或使用 `--require-coverage` 时任务/负迁移覆盖率不足

---

## 选择实时或 mock

对 judge 检查器使用 `--live`，测量开放式任务上的实际效用。使用 `--mock` 离线重放之前记录的 judge 判定，或运行确定性的 `assert`/`regex` 契约检查。

mock 的确定性来自于：在 `--live --record` 期间将 judge 的二元判定（PASS/FAIL）记录到 rollout 条目中，然后在后续 `--mock` 运行中重放已记录的分数，不会再次调用 LLM。

**数据外流：**`--live` 期间，judge 会将候选分支输出调度给配置的供应商评分。每次实时运行开始时都会打印一次性警告。

如果 mock 运行报告覆盖率不足，请检查警告中被丢弃或缺失的 `_rollouts` 条目，修复 fixture 或技能后再运行实时记录。实时晋升要求有可用的受保护 Claude 或 Codex 配置档，且 `isolation: "enforced"`；其他配置档仍属探索性。

---

## 随技能发布评估任务

技能可以通过将 fixture 放在 `.agents/eval/<skill>/` 下，来包含一组评估任务。这些是技能目录之外的用户编写文件，因此会在 `oma update` 后保留。使用 `oma-skill-creation` 创建新技能时，加入匹配的 `eval/` fixture 集，为未来作者提供验证技能效果的方法。请参阅 `.agents/skills/oma-skill-creation/SKILL.md` 了解技能创作流程。
