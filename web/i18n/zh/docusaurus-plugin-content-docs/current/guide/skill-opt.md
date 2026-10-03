---
title: "技能优化"
sidebar_label: 技能优化
description: "使用 oma skill optimize，通过确定性的训练、验证和运行器拥有的保留集关卡，持续、以证据为依据地演进技能。"
---

# 技能优化

`oma skill optimize` 会根据 `oma skill eval` 产生的 `utilityLift`，演进技能的 `SKILL.md` 以最大化测得的提升。它将原始 rollout 证据、持久化的范围知识和可执行技能分开。Wiki Maintainer 汇总可观察到的成功与失败；Proposer 使用这些知识生成有范围的添加/删除/替换编辑。候选必须在不使任一拆分回归的前提下提高训练或验证效用，并且任务和负迁移的测量都必须完整。`--apply` 还要求运行器拥有的最终测试已完整测量且没有回归，并且实时隔离已通过验证。部署时不会额外在推理阶段查询 wiki，输出仍然是一个 `SKILL.md`。

研究依据：Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

当前的 CLI 优化需要 `--live`，并会产生模型调用。默认的非实时路径和 `--mock` 都无法生成或重放提议，因为尚未实现已记录提议的加载器；它们会在评估之前停止。离线重放请使用 `oma skill eval --mock`。注入式的优化器/评分器 API 仍可用于离线测试。同时传入 `--live` 和 `--mock` 会报错。

---

## 硬性依赖：评估任务 fixture

没有评估任务 fixture 时，`oma skill optimize` 无法运行。它要求 `.agents/eval/<skill>/` 中至少有 **5 个任务 fixture**（`MIN_TASKS = 5`）。如果找到的数量不足，命令会立即报错：

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

请参阅[技能效用评估指南](/docs/guide/skill-eval)，了解 `.agents/eval/<skill>/` 目录约定、fixture 模式、检查类型，以及如何为 mock 重放准备 rollout。

晋升还要求存在非空的邻居任务集合：这些任务与目标技能同领域，但属于其他技能。每个候选的验证分数和最终候选分数，都必须用确切的候选正文测量其所评估拆分的邻居任务。缺少邻居任务或成对记录不完整，都无法证明不存在负迁移。离线评估只能重放匹配的候选记录；要生成并评估新的候选，请使用实时优化。

重放和套件范围的知识都与完整的任务/评估器契约绑定，其中包括实际生效的默认 judge rubric 和评分器协议修订版本。这次来源信息升级之后，较早的记录和先前的知识范围都需要新的证据；给旧分数重新贴上新哈希，并不能构成有效的测量。

---

## 工作原理

fixture 按任务 ID 排序，并确定性地拆分为 **train**、**held-out validation** 和 **runner-owned final-test** 集合。至少有五个 fixture 时，目标比例为 60/20/20，并且每个分区至少包含一个任务。例如，八个 fixture 取整后会得到四个 train、一个 validation 和三个 final-test 任务。声明了相同 `group` 的 fixture 会被分到一起，因此措辞改写过的同组任务不会出现在 train 中，而原任务却落在 final test 里；少于三个分组时，会退回到按任务 ID 拆分，并给出警告。final-test 任务来自这组本地 fixture，并对 Maintainer 和 Proposer 隐藏。重复的 final-test 任务 ID 以及与开发拆分的重叠都会被拒绝。

每个 epoch（最多 `--max-epochs` 次，默认 8 次）执行以下步骤：

1. **在 TRAIN 拆分上为当前最佳 `SKILL.md` 评分**：`oma skill eval` 返回每项任务可观察到的提示、输出和提升。内部拆分中的每个任务都必须有两个分支的评分；失败或缺失的比较不能缩小分母。
2. **Wiki Maintainer 汇总证据**：最多五个失败和三个成功会变成与证据关联的模式。失败按学习价值挑选：先选回归，再选最严重的共同失败；两个分支都已通过的任务会被剔除，因为它们对下一次编辑没有参考价值。成功按提升排序。范围模式和之前的关卡结果会从 OMA 的 L1/L2/L3 内存系统中召回。
3. **Proposer 生成 K 个候选编辑**（最多 `--edits-per-epoch` 个，默认 4 个）。持久化拒绝历史中已经存在的精确编辑会跳过。
4. **对每个候选编辑：**
   - 将编辑应用到 `SKILL.md` 的内存副本。
   - 验证候选（frontmatter 的 `name`/`description` 必须保留；正文必须能解析）。
   - 执行文本学习率预算：净字符变化超过 `--lr`（默认 600 字符）的编辑会丢弃。
   - 重新为候选评分，覆盖 **held-out validation** 拆分中的每个任务（对邻居任务做基线/候选成对比较）和 **held-in training** 拆分中的每个任务（不做邻居比较）。
5. **按 held-in/held-out 规则接受最佳有效候选**：候选在任一拆分上都没有损失（`Δval ≥ 0` 且 `Δtrain ≥ 0`），并且至少在其中一个拆分上有所提升。候选按 `Δval + Δtrain` 排序。不要求验证严格提升，因为已通过全部验证任务的正文，仍可以针对训练失败得到修复，而不丢掉保留集上的成绩；这次修复能否泛化，由最终测试决定。任务覆盖必须完整，非空的负迁移样本必须被完整测量，任何邻居都不得出现差值达到或低于 `NEG_TRANSFER_FAIL = -0.1` 的确认回归。在实时运行中，首次成对比较就回归的邻居会重新测量一次；记录的差值是两次比较的平均值，只有可复现的回归（`confirmed: true`）才会拒绝候选。mock 重放无法重新测量，因此单次试验的回归结果保持有效。实时报告必须声明 `isolation: "enforced"`。提议关卡的结果会与 `deltaLift`（验证）、`deltaTrainLift` 以及作为结论依据的邻居差值一起记录。
6. **连续 2 个 epoch 没有接受编辑后提前停止**（`OPT_EARLY_STOP_PATIENCE = 2`）。
7. **演进后运行运行器拥有的最终测试**。原始正文和验证胜者都必须覆盖每个 final-test 任务。候选不得损失最终测试提升（`candidateLift >= baselineLift`；它被接受时所依据的提升已经在开发拆分上得到证明，而在小规模冻结测试上要求严格提升，会让大多数修复无法晋升），并且必须通过另一次完整的、针对该候选的负迁移检查。`finalTest.findings` 列出原始正文和候选在每个任务上的提升，因此失败的测试可以被解读为真实回归，或只是单个有噪声的任务。缺失、不完整或失败的最终测试都会阻止晋升。已测得的最终失败仍作为审计记录保留，不会成为后续优化的拒绝知识。

优化器在循环期间使用内存中的候选副本工作。

未能测量的候选会被记录为 `inconclusive`，原因例如 `insufficient-coverage`、`negative-transfer-unmeasured` 或 `unverified-isolation`。它们不会进入已学到的拒绝历史，并且在评估条件修复后仍可重试。已确认的邻居回归、任一拆分上的损失（`split-regression`），或两个拆分都没有提升（`no-validation-lift`），都属于拒绝。表明评估不完整或维护降级的诊断会阻止晋升。

---

## 用法

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### 标志

| 标志 | 默认值 | 说明 |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | 要优化的技能 ID（简单名称，不能包含路径分隔符）。 |
| `--dry-run` | **yes (default)** | 提议编辑并打印 diff，不改变 `SKILL.md`；生成的证据和演进事件仍会持久化。 |
| `--apply` | 无 | 在所有晋升关卡通过后写入已验证的候选，包括完整的最终测试和负迁移证据；原子写入前先备份原文件。OMA 拥有的技能还需要 `--yes`。 |
| `--mock` | 非实时默认值 | CLI 尚未实现提议重放，因此该路径会在评估之前停止。离线评估重放请使用 `oma skill eval --mock`。 |
| `--live` | 无 | 当前 CLI 优化必需。会产生真实模型调用；打印成本预览，除非使用 `--yes`，否则要求确认。 |
| `--max-epochs <n>` | `8` | 最大优化 epoch 数。 |
| `--edits-per-epoch <k>` | `4` | 每个 epoch 优化器 LLM 提议的候选编辑数。 |
| `--lr <chars>` | `600` | 文本学习率预算：每个接受的编辑允许的最大净字符变化。 |
| `--yes` | 无 | 跳过实时成本预览确认，并在应用于 OMA 拥有的技能时确认已知晓覆盖行为。 |
| `--json` | 无 | 输出 JSON，供 CI/CD 使用。 |
| `--output <format>` | `text` | 输出格式（`text` 或 `json`）。 |

---

## 最小端到端示例

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

八个 fixture 且候选通过全部晋升关卡时的示意输出：

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

diff 会显示优化器准备写入的内容。`SKILL.md` 保持不变，而生成的演进证据和范围关卡结果会持久化，供后续运行使用。

---

## 应用已验证的改进

确认提议的 diff 后，使用 `--apply` 重新运行：

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### 作为产物的流程

优化器和 Maintainer 的提示就是改进流程。它们以内置默认值的形式随附，并且可以被 `.agents/evolution/` 下的文件覆盖（由用户拥有：不会被安装清单复制，也不会被 `oma update` 删除，这一点与 `.agents/eval/` 不同）：

| 文件 | 作用 | 必需的占位符 |
|---|---|---|
| `optimizer.md` | 根据训练证据和持久化知识提议 SKILL.md 编辑 | `{{body}}`、`{{findings}}`、`{{editsPerEpoch}}`（还有 `{{knowledge}}`） |
| `maintainer.md` | 将证据汇总为可复用的模式 | `{{evidence}}`、`{{priorFacts}}`（还有 `{{skillId}}`、`{{suiteHash}}`、`{{epoch}}`） |
| `constitution.yaml` | 循环绝不能写入的部分、元优化可以修改流程的哪些部分、元运行默认的基准真值 `anchors`，以及调度预算 | 必须在 `immutable` 下列出自身 |

`budget.max_dispatches_per_run`（默认 `null`，即不限）会在实时运行中强制执行：每次底层模型调用（任务分支、邻居分支、judge、优化器、Maintainer）都消耗一个单位，会超出上限的调用在发出之前就会被拒绝。随后循环以 `budget:exhausted` 诊断停止，最终测试被跳过，晋升被阻止，结果会报告 `budget: { limit, used }`。无论是否触及上限，用量都会记录在运行摘要中，因此可以同时按成本和收益比较不同流程。

`oma skill procedure` 会打印当前生效的来源和哈希；`--export` 会写出默认值供编辑，且不会覆盖已有文件。去掉必需占位符的模板会被拒绝，而不是悄悄降级。每次运行都会在其结果、运行摘要和晋升谱系中记录 `procedure`（每个部分的哈希加一个组合哈希）和 `memory`，因此在一种流程下产生的证据绝不会与另一种流程混淆。

优化器的回复只在格式上被宽松解析：代码围栏和空行会被忽略，但任何不是有效 `EDIT:` 行（或单独一个 `NO_ACTION`）的内容行都属于 `parse-error`，并且诊断现在会包含第一条违规行，以便追查失败原因。

### 内存消融与长期运行统计

`--memory none` 让运行从空知识开始（没有召回的模式或关卡历史），同时仍会记录该运行。在相同预算下比较 `--memory recall`（默认）和 `--memory none` 的运行，是检验持久化知识是否有帮助的方法；要声称循环能从经验中学习，需要这种比较，而不是只看是否存在内存。

`oma skill evolution-stats --skill <id>` 会汇总某个技能在 `.agents/results/skill-evolution/<id>/*.jsonl` 中的每次已记录运行：按状态统计的运行、按关卡结果统计的提议及接受率、已验证的改进（最终测试通过且具备晋升资格）、应用与回滚次数、平均最终提升、已计量运行的模型调用次数和每次已验证改进的调用次数（流程的成本，而非单次运行的成本），以及按内存模式和流程哈希拆分的同样数据。元优化报告会显示当前流程和每个候选的每次内层运行平均调用次数，因此靠多花调用才在收益上获胜的流程可以被看出来。

### 元优化：把流程作为候选

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` 把优化器（或 Maintainer）的提示当作被测对象。它在当前流程下，对每个指定的保留集技能运行内层循环（`oma skill optimize --dry-run`）`--repeats` 次；请一个 proposer 对模板提出最多 `--candidates` 个小编辑；在每个候选下以相同的 `--max-epochs` 和 `--edits-per-epoch` 预算再次运行内层循环；并按（技能，重复）逐对比较每个候选与当前流程，比较的依据是内层循环取得的训练提升与验证提升增益之和。

只有当候选增益差的成对 bootstrap 95% 区间位于零之上（固定随机种子，1000 次重采样）、至少存在三对结果，并且没有任何在当前流程下有所改进的技能在该候选下损失超过其增益的一半时，候选才会被晋升。评估被阻塞（覆盖不足、隔离未验证、预算耗尽）的内层运行会被报告为失败并排除在配对之外，因此一次中断不会被算作其中一个分支的增益为零。保留集技能必须有提升空间：当前正文已经得满分的技能，在任何流程下都不会显示出增益。`--anchor` 指定永远不用于选择、但会在当前流程和获胜流程下各运行一次以显示漂移的技能；不使用该标志时，会采用 constitution 的 `anchors` 列表，因此只需声明一次的基准真值集会在每次元运行中得到检查。使用 `--apply` 时，获胜模板会写入 `.agents/evolution/<target>.md`，同时生成带时间戳的备份、统一 diff 补丁，以及写入 `.agents/results/skill-evolution/_procedure/promotions.jsonl` 的一条记录，其中包含父级和候选哈希、constitution 哈希以及证据（技能、重复次数、预算、配对、区间）。不使用 `--apply` 时不会写入任何内容。

保持冻结的部分：每个技能的 final-test 分区绝不会被读取用于选择（指标是训练增益加验证增益），评估器和优化代码在 constitution 中被列为不可变，constitution 本身不能成为目标，且目标必须出现在 `meta_targets` 中。内层运行默认使用 `--memory none`，使流程根据它产生的编辑来评判，而不是根据从早先运行中召回的知识。同一分支的内层运行会在各技能之间重叠执行（`OMA_META_CONCURRENCY`，默认最多 4 个），而同一技能的重复保持串行，因为每个技能的证据都写入它自己的产物文件。每次内层运行都会记录其所用的组合流程哈希，因此 `oma skill evolution-stats` 可以把之后的结果归因到产生它们的流程。

这就是自我改进系统综述中描述的 L5 形态（Self-Harness 的 held-in/held-out 晋升、ADAS 带 bootstrap 区间的重复评估、AlphaEvolve 式的冻结评估器）：流程由系统自己修订，但外层判断留在循环触及不到的地方。成本按 skills × repeats × (1 + candidates) 次内层运行增长；命令会打印上限，并在未使用 `--yes` 时请求确认。

### 晋升谱系

每次 `--apply` 写入都会向 `.agents/results/skill-evolution/<skill>/promotions.jsonl` 追加一条记录，并在其旁边的 `promotions/<candidate-hash>.patch` 中写入一份可审查的统一 diff。记录会写明父级和候选正文的哈希、安装路径、备份路径，以及写入所依据的证据：验证和最终测试的提升、晋升决策、fixture 套件哈希、评估器协议修订版本，以及来源/目标运行时。`oma skill promotions --skill <id>` 会列出该日志。

`oma skill rollback --skill <id>` 会恢复最近一次应用所替换掉的正文。当已安装的文件与那次应用的候选不再一致（之后的手工编辑会被丢弃）、备份与记录的父级不匹配，或那次应用已经被回滚时，它会拒绝执行；成功的回滚会追加到同一份日志中，并用 `reverses` 指向那次应用。若技能由 OMA 拥有，补丁就是要带入源仓库或用户覆盖层的产物，因为 `oma update` 会覆盖已安装的副本；记录会标记 `omaOwned: true`，使后来的更新不会被误认为回归。

`--apply` 要求至少有一个没有验证损失的已接受编辑、`finalTest.passed: true` 以及 `promotion.eligible: true`。这些关卡要求内部任务覆盖完整、存在非空且完整测量的针对候选的负迁移样本，以及强制执行的实时隔离。缺少最终测试、测量不完整或编译器诊断降级，都会阻止写入。原子写入前会先备份原始 `SKILL.md`，并打印 diff 供审查。

实时评估可以通过受保护的 Claude 或原生 Codex 配置档满足隔离关卡。Claude 保留 HOME/目标检查。Codex 在提交提示之前，会验证临时的 app-server 线程没有指令来源或工具环境。其他运行时配置档仍属探索性。

### 查看演进了什么

这个循环会在三个地方公布自己的变化，全部读取自只追加的谱系日志，而不是来自任何声明：

- `oma skill promotions --all` 会为每个技能和流程的每次变更各打印一句话：编辑了什么（被接受编辑的锚点和替换内容）、前后的 held-in 与 held-out 提升、最终测试是否成立，以及对流程晋升而言的成对增益差、其区间和测量所用的技能。`--skill <id>` 可缩小到某一个技能。由此版本写入的应用记录带有被接受的编辑和训练提升；较早的记录则退回为哈希。
- `oma doctor` 会显示一条 **Evolution** 提示：已应用和已回滚的技能编辑、每个技能的最新变更、流程晋升，以及等待反馈的内容（尚无 fixture 的已捕获事故、尚未捕获的失败运行），并给出可处理它们的命令。
- 会话开始时，状态快照钩子会注入一个 `harness evolved since your last session` 块，列出自上一次显示过该块的会话以来记录的晋升；每项变更只公布一次。标记保存在 `.agents/state/evolution-notice.json`。

启用[项目 Harness 演进](./harness-evolution.md)，即可按计划运行带预算的反馈周期：

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

自动周期会把通过的变更作为项目覆盖层应用，保留未完成的工作以便重试，并在整个周期内共用一个调度额度。默认计划是每天本地时间 03:00。使用 `--mode propose` 可只评估而不应用，使用 `oma harness evolution disable` 可停止计划。流程元优化仍然是单独的手动命令。

---

## 实时模式

实时模式会调用真实的 Maintainer 和 Proposer，并在每个 epoch 重新运行实时评估分支。它成本较高：每项评分任务需要基线和处理组调用，judge fixture 会增加评分调用，最终测试还会为原始正文和候选正文评分。预览会根据实际拆分报告上限，其中包括初始验证基线、训练和编译器调用、候选验证调用、两次最终测试评分，以及每个候选加最终候选的成对邻居检查。每次调用超时为 120 秒。受保护的 Claude 和 Codex 分支会禁用工具、自动指令发现、MCP 和优化内存。

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

成本预览会在任何 LLM 调用前列出底层模型调用的上限。

Maintainer、Proposer、评估分支和 judge 在全新的临时目录中共用一个受保护的文本传输。Claude 使用其受限的 CLI 配置档。Codex 使用原生的 `codex app-server`，沿用现有的 CLI 登录、所选模型/提供方和推理强度；它不会改用基于 API 密钥的客户端，也不会回退到 Claude。Codex 配置档面向 macOS/Linux 上的 CLI 0.154.x，要求使用原生文件凭据存储，并且已存在 `auth.json`。每次调用都会准备一个私有的临时 `CODEX_HOME`，它引用原始的配置/认证文件，而不复制凭据内容。原生 token 刷新仍使用原始认证文件。共享的引导状态被排除，临时状态会在之后清理。目前不支持 keyring、auto 和 ephemeral 凭据存储。线程契约会在发送模型输入之前检查；不受支持的版本、存储模式和协议失败都会终止调度。工具、启动时的指令发现、MCP 访问和会话持久化均被禁用，使编译器进程无法通过智能体工具读取被隐藏的 fixture。其他编译器供应商在拥有经过验证的传输之前会明确报错失败。

优化器对有效编辑报告 `proposed`；只有明确的 `NO_ACTION` 响应才报告 `no-action`。进程/API 失败变为 `dispatch-error`；没有有效编辑的格式错误响应变为 `parse-error`。这些错误不能变成空的编辑列表。如果 Maintainer 无法提供经过验证的模式，它会报告 `degraded` 并给出调度或解析方面的原因；回退模式会被排除在持久化知识之外，且该运行无法晋升候选。评估失败会出现在 `diagnostics` 和提议关卡记录中，而不是已学到的拒绝历史中。

---

## JSON 输出

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` 要求满足 `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`、`finalTest.passed === true` 以及 `promotion.eligible === true`。`baselineTrainLift` 和 `finalTrainLift` 在验证提升之外，还报告 held-in 拆分的提升。同样的条件也控制 `--apply`：仅凭训练修复而被接受的编辑，只有在最终测试也通过时才会写入。缺少最终测试或晋升对象时，无法得到 `ok: true`。`_split` 计数显示此次运行使用的本地 fixture 分区实际数量。

例如，未能测量的候选可能产生下面这段报告摘录：

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

重试之前，请检查 `diagnostics`、`promotion.reasons` 以及任何 `finalTest.blocker`。inconclusive 的提议不会增加 `rejectedCount`。已测得的最终测试失败可以增加该运行的审计拒绝计数，同时仍被排除在持久化拒绝知识之外。

---

## `oma-*` 技能的 SSOT 注意事项

ID 以 `oma-` 开头的技能由 oh-my-agent 拥有，并会被 `oma update` **覆盖**。对于这些技能，不建议使用 `--apply`，请使用默认的 `--dry-run`，审阅提议的 diff；如果改进有意义，请将变更上游到注册表。用户编写的技能可以安全使用 `--apply`。

目标技能属于 OMA 时，命令会打印警告：

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## 过拟合保护

Maintainer 和 Proposer 接收 TRAIN rollout 证据。候选选择使用保留的 VALIDATION 拆分，运行器拥有单独的 TEST 拆分。不使用工具的编译器执行，可以防止通过工作区访问这些被隐藏的 fixture 和评估器。

最终测试失败会阻止应用。其结果仍可用于审计，但最终测试的关卡结果和 inconclusive 的提议都不会进入持久化的优化知识。记录器、历史重载和语义召回路径也会排除旧版的最终测试结果，因此后续运行无法把先前最终测试的成败当作训练反馈。

---

## CI 集成

使用评估重放，对已有的针对候选的记录做离线 CI 检查：

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

CLI 优化本身需要 `--live`；它还没有已记录提议的重放适配器。此前将 `oma skill optimize --mock` 描述为完整离线优化器的指引是错误的。请把离线重放任务迁移到 `oma skill eval --mock`，或明确启用实时优化并承担其模型成本。运行优化时，请检查 JSON 的 `ok` 和 `promotion.eligible`：退出码为零也涵盖了已完成但没有找到可晋升候选的运行。

优化退出码：
- `0`：优化完成（无论是否有改进）
- `1`：输入无效或执行失败，包括非实时 CLI 优化、`--live --mock` 标志冲突、fixture 数量不足、不受支持的编译器供应商、优化器调度失败或优化器输出格式错误

---

## 另请参阅

- [技能效用评估](/docs/guide/skill-eval)：编写评估任务 fixture、检查类型、mock/live 模式和 `_rollouts/` 目录。
- [CLI 命令](/docs/cli-interfaces/commands)：所有技能管理命令的标志参考。
