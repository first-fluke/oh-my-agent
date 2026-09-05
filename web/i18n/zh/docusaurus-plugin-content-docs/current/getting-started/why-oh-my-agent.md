---
title: 为什么选 oh-my-agent
description: 在饱和的 multi-agent CLI 市场中 oh-my-agent 的定位。成本轴已经从实现转移到测试与维护；oh-my-agent 用 quality gate、独立校验、multi-vendor dispatch 与 repo-native 定制能力来回应这种转移。
---

# 为什么选 oh-my-agent

multi-agent CLI 这一品类已经饱和。仅过去一个季度就出现了 20 多个 multi-agent orchestrator：Metateam、OpenSwarm、DevSquad、Praktor、Salacia、Codelegate、agent-of-empires、TTal、Maggy 等。它们大多优化同一条轴——让 agent 写代码更快。

oh-my-agent 优化的是另一条轴。出发假设是：在足够强的模型加持下，SDLC 中分析、设计、实现的成本正在趋近于零。软件开发真正昂贵的部分一直是测试与维护——让系统在首个 commit 之后仍然能跑、安全、可理解。oh-my-agent 正是围绕这条轴设计的。

本页把这个定位写实。原始讨论详见 [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)。

---

## 成本轴已经转移

当一个足够强的模型几分钟就能产出一个可工作的 feature，瓶颈就不再是实现吞吐量。瓶颈是：验证产出是否真的做到了它声称的事、捕捉跨 iteration 的 silent regression、把密钥从 prompt 和日志里挡出去、在 token 花销失控之前让它可见。

只是把 agent spawn 得更快的 harness 解决不了这些问题。为后实现阶段设计的 harness 才行。

---

## oh-my-agent 为真正的成本中心提供了什么

下面每一项能力都对应 multi-agent CLI 品类中已被反复反馈的失败模式。

### 独立校验，而非 LLM 自我评估

`oma verify <agent>` 按 agent 类型运行 14 项确定性检查。全是机械检查：测试命令的 exit code、TypeScript strict 通过、raw SQL 模式探测、硬编码密钥扫描、Flutter analyze、inline 样式扫描、相对 agent charter 的 scope 越界。没有 LLM 来判断"看起来对了"。检查通过当且仅当底层命令报告成功。

这回应了品类中最常见的吐槽——某条社区帖子的总结是"agents lie - they say tests pass when tests do not"。检查列表见 `cli/commands/verify/verify.ts`。

### 跨 iteration 的重新校验

`ralph` 工作流用独立的 JUDGE 阶段包住 `ultrawork`。每次 iteration 后 JUDGE 都重新校验每一个 criterion——包括前几轮已经通过的。这能捕捉到修 C2 时悄悄打破 C1 的情况，而这才是长 agent 会话里大多数 regression 的真正成因。

>30 秒的重型 verification 会按受影响的文件路径缓存，以保证重校验的成本可控。完整协议见 `.agents/workflows/ralph/resources/judge-protocol.md`。

### 在损失发生前阻断的 quota cap

每次 `oma agent spawn` 都会把这次 spawn 的 token 估算写入 `.serena/memories/session-cost-{sessionId}.md`。下一次 spawn 之前，`checkCap` 会查询已配置的 quota cap，任意维度超限就拒绝启动。强制三个维度：总 token、总 spawn 数、按厂商的 token 预算。

这就是事后才知道烧了四万美元，与第 15 次 spawn 时被告知预算还剩 1 次的差别。详见 `cli/io/session-cost.ts`，在 `.agents/oma-config.yaml` 的 `session.quota_cap` 下配置。

### retry 之后转而 explore，而不是 retry 到天荒地老

当 `orchestrate` Step 5 发现校验失败时，会带着错误上下文最多重试 agent 两次。如果第二次仍然失败而且成本 cap 还没超，工作流会切换到 Exploration Loop——在独立的并行 workspace 里 spawn 2-3 个备选假设变体，只保留得分最高的结果。失败的尝试连同成本一起被记录后丢弃。

这是对"某个思路本身就是错的"这种情况的结构化回应。同样的思路一直 retry 永远不会收敛；并行尝试不同思路才会。

### monorepo 感知的 workspace 路由

`detectWorkspace` 读取 pnpm、nx、turbo、lerna 配置，把每个 agent 自动路由到对应的子 workspace。backend agent 跑在 `apps/api/`，frontend agent 跑在 `apps/web/`——orchestrator 不必手动拼路径。见 `cli/io/workspaces.ts`。

---

## multi-vendor 不是可选项

第二条设计假设是：任何认真做 AI 辅助开发的团队都用不止一家服务商。今天意味着 Claude、Codex、Gemini、Copilot、Qwen、Kimi，以及下个季度刚发布的那个。vendor 切换是事实而非 edge case——Anthropic 把 agent 能力挪到了单独付费的 plan、OpenAI 在 Anthropic 模型质量退化的同一周发了 Codex CLI、GitHub Copilot 转向按用量计费。

oh-my-agent 把 vendor 选择当作 per-agent 配置，通过 `.agents/oma-config.yaml` 中的 `model_preset` 和 `agents.<id>.model` 来表达。可移植的 `.agents/` 目录就是 single source of truth，每个受支持的 runtime 都从它投影。使用 oh-my-agent 不需要 vendor lock-in，切换 vendor 也不需要迁移。

---

## repo-native 定制

第三条假设：没有两个团队对"完成"的定义是一样的。一个团队要求每次 backend 改动都跑 OWASP Top 10 扫描。另一个团队要求 QA 报告用韩文。还有一个要求所有 migration 在 merge 前都要由 database agent review。

因为 `.agents/` 就是仓库里的几个文件，每个团队都可以按自己的行为准则和合规姿态添加或修改 agent、skill、workflow、quality gate。定制是一次 `git commit`，不是一张 vendor 支持工单。

---

## 这在实践中意味着什么

如果优先级是"并行 spawn agent 越快越好"，许多工具都覆盖这个表面。如果优先级是"在 agent 离场后代码仍然能跑"，oh-my-agent 就是为这个目标而造的。`oma verify`、JUDGE、Exploration Loop、quota cap、monorepo 路由这些部分不是可选附加项——而是这个项目存在的理由。

每项能力的细节见侧边栏 Core Concepts 部分（Agents、Parallel Execution）。
