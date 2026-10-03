---
title: 项目结构
description: 面向读者介绍 oh-my-agent 的安装目录，涵盖 `.agents/` 下的事实来源、代表性技能资源、工作流、已纳入版本控制的智能体定义、运行时状态、供应商集成层和源码仓库布局。
---

# 项目结构

安装 oh-my-agent 后，项目会获得两棵核心目录树：`.agents/`（唯一事实来源，其中包括 `.agents/state/memories/` 协调存储）和运行时集成层（例如 `.claude/`、`.cursor/`、`.codex/`）。如果选择 Serena 作为代码智能提供商，还可能出现可选的 `.serena/` 目录，用于保存 Serena 的引导记忆。本页说明排查问题时需要关注的共享文件及可选或生成路径。

---

## 代表性目录树

下方目录树详细展示共享资源和具有代表性的领域技能。当前目录包含 33 个技能目录；省略的技能遵循相同的 `SKILL.md` 加上可选 `resources/`、`variants/` 或技能专用目录的模式。如果生成文件或可选文件不存在，应以实时 `.agents/` 目录为准。

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```


---

## `.agents/`：事实来源

这是核心目录。智能体所需的一切都位于这里，也是唯一影响智能体行为的目录。其他目录都从它派生。

### oma-config.cue 与 oma-config.yaml

**`oma-config.yaml`**：中央配置文件，包含：
- `language`：响应语言代码（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）
- `date_format`：时间戳格式字符串（`ISO`、`US` 或 `EU`；默认值为 `ISO`）
- `timezone`：IANA 时区标识符；省略时使用系统时区
- `model_preset`：活动模型预设键（默认 `auto`，也可以是固定或自定义预设）
- `providers`：文档、Web、代码智能和语义记忆的能力提供商
- `auto_update_cli`：后台更新检查（默认 `true`，使用 `false` 退出）
- `telemetry`：供应商遥测加入选项（默认 `false`）
- `mcp.devtools_browsers`：可选浏览器列表；未设置时保留现有条目
- `agents`：可选的按智能体覆盖（仅对象形式的 `AgentSpec`）
- `models`：可选的用户定义模型 slug
- `custom_presets`：可选的用户定义预设，支持可选的 `extends:`

### skills/

技能专业知识所在的位置。当前目录包含 33 个技能目录和 `_shared` 资源；`all` 预设从这个实时目录派生。

**`_shared/`**：所有智能体共用的资源：
- `core/`：路由、上下文加载、提示结构、澄清协议、上下文预算、难度评估、推理模板、质量原则、供应商检测、会话指标、通用检查清单、经验教训和 API 契约模板
- `runtime/`：内存协议、事件规范、结果契约以及供应商专用执行协议
- `conditional/`：质量评分、实验账本和探索循环协议（仅在触发时加载）

**`oma-{skill}/`**：按技能划分的目录。每个目录包含：
- `SKILL.md`（当前目录中位数约 2,631 个令牌）：第一层，路由到该技能时加载，包含身份、路由和核心规则
- `resources/`：第二层，按需加载，包含执行协议、示例、检查清单、错误处理手册、技术栈、代码片段和模板
- 某些技能还有额外子目录：`variants/`（后端或移动端种子）、由 `/stack-set` 生成的 `stack/` 参考资料、`reference/`（oma-design）以及技能专用脚本或配置

### workflows/

定义斜杠命令行为的 21 个 Markdown 文件。每个文件包含：
- 带 `description` 的 YAML 前置元数据
- 强制规则部分（响应语言、步骤顺序和 MCP 工具要求）
- 供应商检测指令
- 分步执行协议
- 关卡定义（适用于持久工作流）

持久工作流：`orchestrate.md`、`work.md`、`ultrawork.md` 和 `ralph.md`。
非持久工作流包括 `plan.md`、`brainstorm.md`、`architecture.md`、`deepinit.md`、`review.md`、`debug.md`、`design.md`、`scm.md`、`tools.md`、`stack-set.md`、`convert.md`、`docs.md`、`explain.md`、`recap.md`、`schedule.md` 和 `video.md`。

### agents/

12 个子智能体定义文件，用于通过 Task 工具（Claude Code）或 CLI 启动智能体。每个文件定义：
- 前置元数据：`name`、`description`、`skills`（要加载的技能）
- 执行协议引用
- 章程预检（CHARTER_CHECK）模板
- 架构摘要
- 领域专用规则（10 条）
- 声明：“绝不修改 `.agents/` 文件”

### plan-\{sessionId\}.json

由 `/plan` 工作流生成，包含带智能体分配、优先级、依赖关系和验收标准的结构化任务分解。`/orchestrate` 和 `/work` 会使用它。配套的人类可读跟踪文件位于 `docs/plans/work/{NNN}-{name}.md`，其生命周期通过 `Status` 字段管理。永久设计参考与其并列保存在 `docs/plans/designs/{NNN}-{name}.md` 下。

### state/

持久工作流的活动状态文件。只有在持久工作流运行期间这些 JSON 文件才会存在。删除它们（或说“workflow done”）会停用持久工作流。

`state/memories/` 子目录是规范的协调记忆存储：保存编排会话状态、任务板、智能体进度和结果文件、会话指标及成本遥测。仪表盘会监视该路径，CLI 也会优先解析它；较旧项目会回退到传统的 `.serena/memories/` 位置。详见下方的[.agents/state/memories/：运行时状态](#agentsstatememories-runtime-state)。

### results/

智能体结果文件。已完成的智能体会创建这些文件，其中包含状态（completed/failed）、摘要、变更文件和验收标准检查清单。编排器在收集阶段读取它们，仪表盘也用它们进行监控。

### mcp.json

MCP 服务器配置，包括：
- 服务器定义（Serena 等）
- 内存配置：`memoryConfig.provider`、`memoryConfig.basePath`、`memoryConfig.tools`（读、写、编辑工具名称）
- `/tools` 管理使用的工具组定义

---

## `.claude/`：IDE 集成

此目录把 oh-my-agent 连接到 Claude Code 和其他 IDE。

### settings.json

为 Claude Code 注册钩子和权限。每个事件钩子现在都使用 `oma hook run` 规范 ABI：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```


`statusLine` 条目仍直接使用 `bun` 路径（热路径显示，不通过 `oma hook run` 路由）。

### hooks/

供应商的 `hooks/` 目录**只包含运行时会从该目录执行或读取的文件**。处理器链本身（关键词检测、持久模式、技能注入等）在 `oma` 二进制内部通过 `oma hook run` 进程内运行；处理器 `.ts` 文件在构建 CLI 时打包，不会写入供应商目录。

**`oma-hook.sh`**：由 `oma link`、`oma install` 或 `oma update` 写入的生成包装脚本。每个供应商钩子事件都会通过此文件。运行时解析顺序为：`$OMA_BIN`（显式覆盖）→ `command -v oma`（PATH）→ `$HOME/.bun/bin` 和 `$HOME/.local/share/mise/shims` 等已知安装目录（GUI 启动的智能体会继承精简 PATH）→ `exit 0`（故障开放，绝不阻塞智能体）。脚本不会写入机器特定信息，因此所有开发者得到的文件都逐字节相同，可安全提交。它会原样传递 `"$@"`，因此 `--vendor`、`--event` 和 `--matcher` 参数会不变地传到 `oma hook run`。其中包含自去重前导代码，用于在项目安装和全局安装同时注册相同事件时抑制重复触发。

**`hud.ts`**：在状态栏中渲染 `[OMA]` 指示器，显示模型名称、上下文使用量（按绿/黄/红标色）和活动工作流状态。它直接注册在 `statusLine` 下（不经 `oma hook run`），以保留热路径的渲染延迟。仅当供应商变体注册 `statusLine` 或仅 HUD 事件时才会生成（例如 claude、antigravity 和 qwen）。它从自身安装路径推断供应商方言，因此每个供应商的副本都承担实际作用。

**`filter-test-output.sh`**：削减测试运行器噪声的 Shell 过滤器。进程内的 test-filter 处理器会把检测到的 Bash 测试命令重写为通过 `<hookDir>/filter-test-output.sh`，因此每个注册 `test-filter.ts` 变体的供应商都会生成此文件（cursor 除外）。

#### 处理器逻辑实际所在的位置

处理器源代码是 `.agents/hooks/core/` 下的事实来源，并通过 `oma hook run` 在进程内运行：

**`keyword-detector.ts`**：纯处理器（`run(input, ctx): HandlerResult | null`），用于检测关键词。逻辑如下：
1. 清理输入（去除代码块、引号字符串和粘贴的系统回显块）
2. 在清理后的输入中扫描触发器的 `keywords`（字面短语）和 `patterns`（正则表达式）
3. 在每次匹配前后 60 个字符的窗口内检查信息模式
4. 应用强化保护机制（同一工作流在 60 秒内触发 2 次或以上时抑制）
5. 返回 `context` 结果，注入 `[OMA WORKFLOW: ...]` 或 `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**：纯处理器（`run()`），检查 `.agents/state/` 中的活动状态文件，并强化持久工作流执行。在 `Stop` 事件上通过 `oma hook run` 进程内调用。

**`scm-guard.ts`**：在 `PreToolUse`（Bash/Shell 工具）上运行的纯处理器（`run()`），拒绝对可能含密钥文件执行 `git add`。它使用 `.agents/skills/oma-scm/config/commit-config.yaml` 中的 `forbidden_patterns` 减去 `allowed_exceptions` 强制执行规则（配置缺失时使用内置默认值）。在 claude、codex、cursor、grok、kimi、kiro 和 qwen 的链中先于 `test-filter` 运行；在 opencode 桥接中会通过 `tool.execute.before` 抛出异常来阻止，在 pi 桥接中会返回 `tool_call` 的 `{ block: true, reason }`；命令以 `OMA_SCM_ALLOW_SECRETS=1` 为前缀时，在用户明确批准后可以绕过保护。广泛暂存（`git add -A` / `git add .`）有意不拦截，因为该规则依赖钩子无法观察的用户同意。

**`code-intelligence-guard.ts`**：在 `PreToolUse` 上运行的纯处理器（`run()`），以程序化方式强制执行“Code Search”规则。当 `providers.code_intelligence` 解析为 `serena`（或 `gortex`），且 `providers.code_intelligence_guard` 不是 `off` 时，它会拒绝原生搜索工具（Claude Code 上的 `Grep`、`Glob`），以及起始可执行文件是递归代码搜索工具的 shell 命令（`rg`、`ag`、`ack`、`fd`、`grep -r`、`find -name`/`-path`、`git grep`），拒绝原因会指明应改用的提供方工具（`search_for_pattern`、`find_file`、`find_symbol`）。非递归的 `grep`（管道过滤、单个文件）、不带名称谓词的 `find` 以及读取操作从不受影响。它在 claude、codex、cursor、grok、kimi、kiro 和 qwen 的链中紧接 `scm-guard` 之后注册；安装器会合并链中的匹配器，因此 Claude 的 `PreToolUse` 条目变为 `Bash|Grep|Glob`。包含 `OMA_CI_ALLOW_NATIVE=1` 的 shell 命令仍可绕过该保护，但它只是操作者的应急出口，用于搜索项目之外的资源，或保护未能识别的被忽略路径。拒绝原因不会提到该前缀，它也不是搜索项目源代码的回退手段。

**`triggers.json`**：在构建时静态内联到 `oma` 二进制的关键词到工作流映射（源文件：`.agents/hooks/core/triggers.json`）。它定义：
- `workflows`：工作流名称到 `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }` 的映射。`keywords` 是字面短语；`patterns` 是原始正则表达式字符串（用 `iu` 标志编译）。`explicit`（仅限持久工作流）列出算作显式调用的关键词，只有它们会激活持久模式；其他所有匹配都会作为建议注入。
- `informationalPatterns`：表示问题的短语（会从自动检测中过滤）
- `excludedWorkflows`：要求显式 `/command` 调用的工作流

`keywords`、`patterns` 和 `informationalPatterns` 中的语言区段遵循以下约定：
- `*`：通用/英语。
- `en`：功能上等同于 `*`。
- `ko`/`ja`/`zh`/等：特定语言的措辞。

所有区段始终加载；`.agents/oma-config.yaml` 中的 `language` 设置只控制响应语言。单词边界取决于关键词本身：ASCII 关键词匹配完整单词，含有非 ASCII 文本的关键词按子串匹配。

#### 供应商生成：之前与之后

较旧的安装会把 `.agents/hooks/core/` 的**全部**文件（约 20 个）复制到每个供应商的钩子目录，虽然进程内调度使其中大部分成为无效文件：

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```


现在，安装器从供应商的变体 JSON（`cli/platform/hooks-composer.ts` 中的 `requiredVariantScripts`）派生白名单，只生成该供应商实际执行或读取的文件：

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```


| 供应商 | 生成的文件 | 原因 |
|---|---|---|
| claude、qwen | `oma-hook.sh`、`hud.ts`、`filter-test-output.sh` | statusLine + test-filter |
| codex、grok、kiro | `oma-hook.sh`、`filter-test-output.sh` | test-filter，无 statusLine |
| cursor | `oma-hook.sh` | 无 statusLine，无 test-filter |
| commandcode | `oma-hook.sh` | 仅 Stop；Command Code 没有 prompt 事件，且 PreToolUse 无法重写输入（[钩子参考](https://commandcode.ai/docs/hooks/reference)） |
| antigravity | 无（项目内）→ `hud.ts` + 核心钩子复制到 `~/.gemini/antigravity-cli/hooks/` | agy 只从 HOME 读取设置，并从 `.agents/hooks.json` 读取工作区钩子；后者直接运行 `.agents/hooks/core/` 中的处理器。项目 `.gemini/antigravity-cli/` 永远不会加载（`homeOnly` 变体标志） |
| pi | `.agents/hooks/core/` 全部文件放在 `.pi/extensions/oma/` 下 | pi 桥接会把处理器作为子进程启动，而不是使用设置钩子 |

目标目录在复制前会清空，因此在旧安装上重新运行 `oma install`、`oma update` 或 `oma link` 会自动清除旧的完整复制文件。

#### 单独调试处理器链

可以用真实载荷运行任意处理器链，而不触发实时智能体会话：

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```


`oma hook run` 始终以 0 退出（故障开放）。空标准输出表示该事件的链没有产生操作。处理器触发时，供应商方言 JSON（或 kiro 提示使用的纯文本）会写入标准输出。

#### 从 pre-019 安装迁移

已有旧安装包含 `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` 条目的，在下次运行 `oma install`、`oma update` 或 `oma link` 时会自动迁移。安装器使用基于标记的替换：只替换 OMA 管理的钩子组（由其 `name`/`command` 模式识别），你自行添加的钩子组会按原顺序保留。`statusLine`/HUD 路径不变。pi 进程内桥接不受影响。路由器实现见 `cli/commands/hook/command.ts`（内部称为“design 019”），供应商生成逻辑见 `cli/platform/hooks-composer/`。

### skills/

指向 `.agents/skills/` 的符号链接。这样，读取 `.claude/skills/` 的 IDE 可以看到技能，同时 `.agents/` 仍是唯一事实来源。

### agents/

为 Claude Code 的 Agent 工具格式化的子智能体定义。这些定义引用技能文件并包含 CHARTER_CHECK 模板。

---

## `.agents/state/memories/`：运行时状态 {#agentsstatememories-runtime-state}

智能体在编排会话期间写入进度的位置。这是规范的协调记忆存储；CLI 会优先解析它，并为迁移前创建的项目回退到传统 `.serena/memories/` 路径。仪表盘会监视此目录，以实时更新。

| 文件 | 所有者 | 用途 |
|------|-------|------|
| `orchestrator-session-{sessionId}.md` | 编排器 | 会话元数据：ID、状态、开始时间和当前阶段 |
| `task-board-{sessionId}.md` | 编排器 | 任务分配：智能体、任务、优先级、状态和依赖关系 |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | 该运行 | 按轮次记录的进度：执行的操作、读取或修改的文件以及当前状态 |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | 该运行 | 最终输出：完成状态、摘要、变更文件和验收标准 |
| `session-metrics.md` | 编排器 | 实质性纠正和实验证据 |
| `experiment-ledger.md` | 编排器/QA | 实际实验的证据行 |
| `session-work.md` | work 工作流 | work 专用会话状态 |
| `session-ultrawork.md` | ultrawork 工作流 | ultrawork 专用阶段跟踪 |
| `session-cost-{sessionId}.md` | 系统 | 每个会话的启动成本遥测 |
| `archive/metrics-{date}.md` | 系统 | 归档的会话指标（保留 30 天） |

内存文件路径和工具名称可以通过 `.agents/mcp.json` 中的 `memoryConfig` 配置。

Serena 自己的引导记忆（`code_style.md`、`project_purpose.md` 及类似知识文件）仍位于 `.serena/memories/`，与这些协调产物分开。

---

## oh-my-agent 源码仓库结构

如果你在开发 oh-my-agent 本身，而不只是使用它，该仓库是一个 monorepo：

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```


在源代码仓库中，允许修改 `.agents/`（这是源码仓库本身的 SSOT 例外）。关于不得修改此目录的 `.agents/` 规则适用于使用者项目，不适用于 oh-my-agent 源码仓库。

开发命令（从仓库根目录运行）：
- `bun run test`：CLI 测试（vitest）
- `bun run lint`：检查 CLI 和 Web workspace
- `bun run build`：构建 CLI
- `bun run typecheck`：对 CLI 和 Web 执行类型检查
- 提交必须遵循 Conventional Commit 格式（由 commitlint 强制执行）
