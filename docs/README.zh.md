# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md) 

有没有想过，要是你的 AI 助手有同事就好了？oh-my-agent 就是干这个的。

与其让一个 AI 包揽一切（然后做到一半就迷路），oh-my-agent 把工作分配给**专业 agent** — frontend、backend、architecture、QA、PM、DB、mobile、infra、debug、design 等等。每个 agent 深耕自己的领域，拥有专属工具和检查清单，各司其职。

支持所有主流 AI IDE：Antigravity、Claude Code、Cursor、Gemini CLI、Codex CLI、OpenCode 等。

## 快速开始

```bash
# 一行搞定（自动安装 bun & uv）
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# 或者手动运行
bunx oh-my-agent@latest
```

选个预设就能开始：

| 预设 | 包含内容 |
|------|---------|
| ✨ All | 所有 agent 和 skill |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Agent 团队

| Agent | 职责 |
|-------|------|
| **oma-architecture** | 架构权衡、边界划分，以及 ADR/ATAM/CBAM 视角下的分析 |
| **oma-backend** | 用 Python、Node.js 或 Rust 开发 API |
| **oma-brainstorm** | 动手之前先探索想法 |
| **oma-db** | Schema 设计、迁移、索引、vector DB |
| **oma-debug** | 根因分析、修复、回归测试 |
| **oma-design** | 设计系统、token、无障碍、响应式 |
| **oma-dev-workflow** | CI/CD、发布、monorepo 自动化 |
| **oma-frontend** | React/Next.js、TypeScript、Tailwind CSS v4、shadcn/ui |
| **oma-mobile** | Flutter 跨平台应用 |
| **oma-orchestrator** | 通过 CLI 并行执行 agent |
| **oma-pdf** | PDF 转 Markdown |
| **oma-pm** | 任务规划、需求拆解、API 契约定义 |
| **oma-qa** | OWASP 安全、性能、无障碍审查 |
| **oma-recap** | 会话历史分析与主题化工作摘要 |
| **oma-scm** | SCM（软件配置管理）— 分支、合并、worktree、基线；Conventional Commits |
| **oma-tf-infra** | 多云 Terraform IaC（Infrastructure as Code，基础设施即代码） |
| **oma-translator** | 自然的多语言翻译 |

## 工作原理

直接聊就行。描述你想要什么，oh-my-agent 会自动选择合适的 agent。

```
You: "做一个带用户认证的 TODO 应用"
→ PM 规划任务
→ Backend 构建认证 API
→ Frontend 构建 React UI
→ DB 设计 schema
→ QA 审查全部代码
→ 完成：协调一致、经过审查的代码
```

也可以用斜杠命令执行结构化工作流：

| 步骤 | 命令 | 说明 |
|------|------|------|
| 1 | `/brainstorm` | 自由发散想法 |
| 2 | `/architecture` | 软件架构评审、权衡、ADR/ATAM/CBAM 式分析 |
| 2 | `/design` | 7 阶段设计系统工作流 |
| 2 | `/plan` | PM 把功能拆解成任务 |
| 3 | `/work` | 逐步执行多 agent 协作 |
| 3 | `/orchestrate` | 自动并行 agent 调度 |
| 3 | `/ultrawork` | 含 11 个审查门禁的 5 阶段质量工作流 |
| 4 | `/review` | 安全 + 性能 + 无障碍审计 |
| 5 | `/debug` | 结构化根因调试 |
| 6 | `/scm` | SCM 与 Git 工作流，Conventional Commits 支持 |

**自动检测**：甚至不需要斜杠命令 — 消息里出现“架构”“计划”“审查”“调试”等关键词（支持 11 种语言！）即可自动激活对应工作流。

## CLI

```bash
# 全局安装
bun install --global oh-my-agent   # 或者: brew install oh-my-agent

# 随处使用
oma doctor                  # 健康检查
oma dashboard               # 实时 agent 监控
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

## 为什么选 oh-my-agent？

> [深入了解 →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **可移植** — `.agents/` 跟着项目走，不被任何 IDE 绑定
- **角色化** — 像真正的工程团队一样建模，而不是一堆 prompt 的堆砌
- **省 token** — 双层 skill 设计节省约 75% 的 token
- **质量优先** — 内置 Charter preflight、quality gate 和审查工作流
- **多厂商** — 按 agent 类型混用 Gemini、Claude、Codex、Qwen
- **可观测** — 终端和 Web 仪表盘实时监控

## 架构

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## 了解更多

- **[详细文档](./AGENTS_SPEC.md)** — 完整技术规格和架构
- **[支持的 Agent](./SUPPORTED_AGENTS.md)** — 各 IDE 的 agent 支持情况
- **[Web 文档](https://first-fluke.github.io/oh-my-agent/)** — 指南、教程和 CLI 参考

## 赞助

本项目由慷慨的赞助者们支持维护。

> **喜欢这个项目？** 给个 star 吧！
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> 试试我们优化过的入门模板：[fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[成为赞助者 →](https://github.com/sponsors/first-fluke)

完整赞助者列表请查看 [SPONSORS.md](../SPONSORS.md)。



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## 许可证

MIT
