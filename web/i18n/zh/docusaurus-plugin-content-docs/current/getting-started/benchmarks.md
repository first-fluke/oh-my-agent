---
title: 基准测试
description: 五个 Claude Code 框架基于完全相同的提示构建同一款儿童 3D 学习平台 MVP。oh-my-agent 在功能、规格、视觉、工程和效率五个维度上以 80.6/100 的总分位列第一。
---

# 基准测试

五个 Claude Code 框架从完全相同的原始提示出发，构建了同一款儿童 3D 创意学习平台 MVP。**oh-my-agent 以 80.6/100 的成绩位列第一**，评分体系涵盖 5 个维度（功能、规格、视觉、工程、效率）。

> 运行条件：`claude-opus-4-6`，effort `max`，`--max-budget-usd 20`，`--no-session-persistence`，`--setting-sources project,local`。通过用户已登录的 `claude` CLI 进行 OAuth 认证（不使用 `ANTHROPIC_API_KEY`）。

---

## 参与对比的框架

| 框架 | 机制 |
|---|---|
| `vanilla` | 原生 Claude Code，无插件/技能（基线） |
| `oma` | `oh-my-agent` 源码注入（`.agents/` + `.claude/`） |
| `omc` | `oh-my-claudecode`，通过 `--plugin-dir` 加载 |
| `ecc` | `everything-claude-code`，安装至 `~/.claude/` |
| `superpowers` | `superpowers`，通过 `--plugin-dir` 加载 |

---

## 最终评分榜

| 排名 | 框架 | **总分** | 功能/35 | 规格/15 | 视觉/20 | 工程/20 | 效率/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### 运行经济性

| 框架 | 轮次 | 时长 | 成本 | 文件数（src） |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## 着陆页对比

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

完整的逐屏对比（世界构建器、AI 面板、画廊、保存→重载状态）请见 [GitHub 基准报告](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks)。

---

## 各维度的计算方式

| 维度 | 权重 | 关键信号 | 工具链 |
|---|---|---|---|
| **功能** | 35 | 构建退出码、dev 服务器启动（HTTP 200 ≤45s）、5 项用户旅程检查、lint、ts-clean | `pm install/build/lint`、curl、chrome-devtools MCP、`tsc --noEmit` |
| **规格** | 15 | 13 项明确的提示交付物、真实 API 加分项 | LLM 评审 + 大括号平衡的 JSON 提取器 |
| **视觉** | 20 | 反模式、儿童友好的 UX、设计系统一致性、无障碍性 | 基于截图的 LLM 评审 |
| **工程** | 20 | 代码广度、TS strict、最大文件大小 + 文件夹深度、deferred-stub 标记、不存在硬编码密钥 | 静态分析（jq + grep + find） |
| **效率** | 10 | 完成所需轮次、墙钟时长、文件均摊成本 | `claude -p` 结果 JSON |

规格与视觉评审通过 `judge-multi.sh` 在每个框架上运行 3 轮，逐项分数取多轮平均。实现位于 [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis)。

---

## 注意事项

1. **superpowers 的提示覆盖**：这是该框架在非交互模式下正常运作的必要条件（其 `<HARD-GATE>` 头脑风暴技能会阻断单次运行）。其结果反映的是"绕过该 gate 之后 superpowers 能做到什么"，并非纯粹的同等条件对比。
2. **规格与视觉采用多轮评审平均，用户旅程仅单轮**：用户旅程评审需要一个运行中的 dev 服务器，因此保持单轮。约 2 分以内的旅程差距可视为噪声。每个框架的样本量为 1 次构建。
3. **成本归一化**：效率维度采用文件均摊成本计算，绝对成本（5 个框架介于 $1.28 至 $8.19 之间）并未反映在最终分数中。
4. **oma 的 `lint-clean` 扣分是有意为之**：oma 刻意将 lint/typecheck 的强制执行交给 git hooks（husky + lint-staged）和 CI，而不是把 ESLint 特定规则塞进智能体技能中。单轮基准测试因此在 `lint-clean` 上扣 5 分；但在真实工作流中，相同的问题会在 pre-push 阶段就被拦截，根本不会到达远端。

---

## 复现

```bash
# Run all 5 harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Generate the report
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

每个框架的完整叙述、原始分数和截图都维护在 [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md)。该文件由 `build-report.sh` 基于每次运行的 `multiaxis/*.json` 生成，因此始终与最新的评分产物保持同步。
