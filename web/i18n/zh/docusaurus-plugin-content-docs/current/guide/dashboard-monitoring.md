---
title: "指南：仪表盘监控"
sidebar_label: 仪表盘监控
description: 从终端或回环 Web 仪表盘监控 OMA 会话，选择状态目录，并恢复常见的连接和发现问题。
---

# 指南：仪表盘监控

## 两个仪表盘命令 {#two-dashboard-commands}

oh-my-agent 提供两个实时仪表盘，用于在多智能体工作流期间监控智能体活动。

| 命令 | 界面 | URL | 技术 |
|:-----|:-----|:----|:-----|
| `oma dashboard terminal` | 终端（TUI） | 无（在终端中渲染） | chokidar 文件监视器、picocolors 渲染 |
| `oma dashboard web` | 浏览器 | `http://127.0.0.1:9847/`（启动时打印） | HTTP 服务器、WebSocket、chokidar 文件监视器 |

两个仪表盘默认监视当前目录下的 `.agents/state/memories/`。传入 `--project-root <path>` 可监视其他项目；如果协调文件位于其他位置，请设置 `MEMORIES_DIR`。仪表盘不会自动回退到 `.serena/memories/`。

### 终端仪表盘 {#terminal-dashboard}

```bash
oma dashboard terminal
```

直接在终端中渲染方框绘制界面。内存文件变化时自动更新。按 `Ctrl+C` 退出。屏幕从上到下分为四个区域：

| 区域 | 显示内容 | 来源 |
|:-------|:------|:-------|
| 页头 | `OMA Memory Dashboard` 和 `Session: <id> [<status>]` | `orchestrator-session.md`，否则为最新的 `session-*.md`；两者都不存在时显示 `N/A [UNKNOWN]` |
| 智能体表格 | Agent、Status、Turn 和 Task（前 20 个字符）；为空时显示 `No agents detected yet` | `task-board.md`，否则为在内存文件中发现的智能体 |
| Latest Activity | 最多五行 `[<name>] <message>`；为空时显示 `No activity yet` | 最近修改的五个 `.md` 文件中最后一行有意义的内容 |
| 页脚 | `Updated: <time>  \|  Ctrl+C to exit` | 上次重绘的时间 |

**状态符号：**
- `●`（绿色）：运行中
- `✓`（青色）：已完成
- `✗`（红色）：失败
- `○`（黄色）：阻塞
- `◌`（暗色）：等待中

### Web 仪表盘 {#web-dashboard}

```bash
oma dashboard web
```

在 9847 端口启动仅限回环的 Web 服务器（可通过 `DASHBOARD_PORT` 配置）。该命令会打印 `http://127.0.0.1:9847/` 和 `Watching: <memories dir>`。每次启动都会生成新的访问令牌，并嵌入它提供的页面中，因此打开打印出的 URL 即可，无需复制任何内容。页面在 `/api/state`、`/api/recap` 和 WebSocket 请求中携带该令牌；不带令牌的请求返回 `401`。

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# Recap view from the same process: http://127.0.0.1:9847/recap
```

Web 仪表盘显示与终端仪表盘相同的信息，但使用带样式的深色主题界面，包括：
- 连接状态徽章（Connected / Disconnected / Connecting，并自动重连）
- 会话 ID 和状态栏
- 带动画状态点的智能体状态表
- 最新活动信息流
- 自动更新的时间戳

---

## 推荐 3 终端布局 {#recommended-3-terminal-layout}

多智能体工作流推荐使用三个终端面板：

| 面板 | 运行 | 用途 |
|:-----|:----|:--------|
| 1. 主智能体 | 宿主 CLI（`claude`、`codex`、`agy`、`qwen` 等），然后运行 `/orchestrate` 或 `/work` | 驱动工作流 |
| 2. 仪表盘 | `oma dashboard terminal`（或 `oma dashboard web`） | 被动观察进度；无需交互即可自动更新 |
| 3. 临时命令 | `oma agent status session-20260324-143052 backend frontend`、`oma stats get`、`oma verify agent backend -w ./api` | 检查智能体状态、运行验证、查看统计或调试问题 |

---

## .agents/state/memories/ 中的数据源 {#data-sources-in-agentsstatememories}

仪表盘从 `.agents/state/memories/` 目录读取。智能体和工作流在执行期间写入协调文件来填充此目录。如果项目状态存储在其他位置，请使用 `MEMORIES_DIR`。

### 文件类型及其内容 {#file-types-and-their-contents}

| 文件模式 | 创建者 | 内容 |
|:---------|:-------|:-----|
| `orchestrator-session.md` | `/orchestrate` 步骤 2 | 会话 ID、开始时间、状态（RUNNING/COMPLETED/FAILED）、工作流版本 |
| `session-{workflow}.md` | `/work`、`/ultrawork` | 会话元数据、阶段进度、用户请求摘要 |
| `task-board.md` | 编排工作流 | 包含智能体分配、状态和任务的 Markdown 表格 |
| `progress-{agent}.md` | 每个启动的智能体 | 当前回合号、正在进行的工作、中间结果 |
| `result-{agent}.md` | 每个完成的智能体 | 最终状态（COMPLETED/FAILED）、变更文件、发现的问题、交付物 |
| `debug-{id}.md` | `/debug` 工作流 | Bug 诊断、根因、应用的修复、回归测试位置 |
| `experiment-ledger-{sessionId}.md` | 实际实验 | 可比较的基线/候选证据、必需检查和决定 |
| `lessons-{sessionId}.md` | 有证据支持可复用原因时 | 会话范围的教训；不会因评分而触发生成 |

### 仪表盘如何读取这些文件 {#how-the-dashboard-reads-them}

仪表盘使用多种策略提取信息：

1. **会话检测**：先查找 `orchestrator-session.md`，然后回退到最近修改的 `session-*.md` 文件。从 `RUNNING`、`IN PROGRESS`、`COMPLETED`、`DONE`、`FAILED`、`ERROR` 等关键词解析状态。

2. **任务看板解析**：将 `task-board.md` 作为 Markdown 表格读取，从列中提取智能体名称、状态和任务描述。

3. **智能体发现**：如果没有任务看板，则扫描所有 `.md` 文件中的 `**Agent**: {name}` 模式、`Agent: {name}` 行，或文件名中包含 `_agent` 或 `-agent` 的文件来发现智能体。

4. **回合计数**：对每个发现的智能体读取 `progress-{agent}.md` 文件，从 `turn: N` 模式提取回合号。

5. **活动信息流**：列出最近修改的 5 个 `.md` 文件，提取最后一行有意义的内容（标题、状态行、操作项）作为活动消息。Web 仪表盘还在 `/recap` 提供回顾视图。

---

## 每个仪表盘显示什么 {#what-each-dashboard-shows}

### 会话状态 {#session-status}

顶部区域显示：
- **会话 ID**：从会话文件提取（格式：`session-YYYYMMDD-HHMMSS`）。
- **状态**：颜色编码，绿色表示 RUNNING，青色表示 COMPLETED，红色表示 FAILED，黄色表示 UNKNOWN。

### 任务看板 {#task-board}

智能体表格显示每个检测到的智能体：
- **智能体名称**：领域标识符（backend、frontend、mobile、qa、debug、pm）。
- **状态**：当前状态及视觉指示器（running/completed/failed/blocked/pending）。
- **回合**：智能体当前的回合号（已完成的迭代数），从进度文件提取。
- **任务**：智能体正在处理的简短描述（截断以适应显示）。

### 智能体进度 {#agent-progress}

通过 `progress-{agent}.md` 文件跟踪进度。每个文件由智能体在工作时更新。仪表盘轮询这些文件以获取：
- 回合号（随智能体推进递增）。
- 当前操作（智能体此刻正在做什么）。
- 中间结果（部分完成情况）。

### 结果 {#results}

智能体完成时，会写入 `result-{agent}.md`，包含：
- 最终状态（COMPLETED 或 FAILED）。
- 变更文件列表。
- 遇到的问题。
- 产出的交付物。

仪表盘通过该文件的存在检测完成，并相应更新智能体状态。

---

## 故障排查手册 {#troubleshooting-runbook}

### 信号 1：智能体显示 "running" 但回合没有进展 {#signal-1-agent-shows-running-but-no-turn-progress}

**症状：** 仪表盘显示智能体正在运行，但回合号几分钟没有变化。

**可能原因：**
- 智能体卡在长时间操作上（大型代码库扫描、缓慢的 API 调用）。
- 智能体已崩溃但 PID 文件仍存在。
- 智能体正在等待用户输入（自动批准模式下不应发生）。

**操作：**
1. 检查智能体日志文件。`oma agent spawn` 会以 `Log: ...` 打印其路径；它位于操作系统临时目录中：`cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"`
2. 检查进程是否实际运行：`oma agent status {session-id} {agent-id}`
3. 如果进程未运行但状态显示 "running"，说明智能体已崩溃。带错误上下文重新启动。

### 信号 2：智能体显示 "crashed" {#signal-2-agent-shows-crashed}

**症状：** `oma agent status` 对某个智能体返回 `crashed`。

**可能原因：**
- CLI 供应商进程意外退出（内存不足、API 配额用尽、网络超时）。
- 工作区目录被删除或权限改变。
- 供应商 CLI 未安装或未认证。

**操作：**
1. 检查日志文件了解错误详情：`cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"`（即 `oma agent spawn` 打印的 `Log:` 路径）
2. 验证 CLI 安装：`oma doctor`
3. 检查认证：`oma auth status`
4. 使用相同任务重新启动智能体：`oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### 信号 3：仪表盘显示 "no agents detected yet" {#signal-3-dashboard-shows-no-agents-detected-yet}

**症状：** 仪表盘正在运行但未显示任何智能体。

**可能原因：**
- 工作流尚未到达智能体启动步骤。
- `.agents/state/memories/` 目录为空。
- 仪表盘正在监视错误的目录。

**操作：**
1. 验证内存目录：`ls -la .agents/state/memories/`
2. 检查工作流是否仍在规划阶段（智能体尚未启动）。
3. 确保仪表盘监视正确的项目目录：仪表盘从当前工作目录解析内存路径。请在项目根目录运行，或传入 `--project-root /path/to/project`。`oma dashboard web` 会以 `Watching: <path>` 打印所监视的路径。
4. 如果使用自定义路径：`MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### 信号 4：Web 仪表盘显示 "disconnected" {#signal-4-web-dashboard-shows-disconnected}

**症状：** Web 仪表盘的连接徽章显示红色 "Disconnected"。

**可能原因：**
- `oma dashboard web` 进程被终止。
- `oma dashboard web` 进程已重启，而打开的标签页仍持有上一个进程的令牌。

**操作：**
1. 检查仪表盘进程是否运行：`ps aux | grep dashboard`
2. 如果重启过仪表盘，请重新加载页面以获取新令牌。
3. 如果进程已停止，再次启动 `oma dashboard web`，然后重新加载页面。
4. 如果启动失败并提示 `Dashboard failed: port 9847 is already in use`，请检查端口（`lsof -i :9847`）并换一个端口：`DASHBOARD_PORT=8080 oma dashboard web`
5. Web 仪表盘会使用指数退避自动重连（初始 1 秒，最大 10 秒）。等待几秒让它重连。

---

## 合并前监控清单 {#pre-merge-monitoring-checklist}

在认为多智能体会话完成之前，通过仪表盘验证：

- [ ] **所有智能体显示 "completed"**：没有智能体卡在 "running" 或 "blocked" 状态。
- [ ] **没有智能体显示 "failed"**：如有失败，检查日志并重新启动。
- [ ] **QA 智能体已完成审查**：查找 `result-qa-agent.md` 或 `result-qa.md`。
- [ ] **零 CRITICAL/HIGH 发现**：检查 QA 结果文件的严重度计数。
- [ ] **会话状态为 COMPLETED**：会话文件应显示最终状态。
- [ ] **活动信息流显示最终报告**：最后一条活动应为摘要报告。

---

## 完成标准 {#done-criteria}

仪表盘监控在以下情况完成：
1. 所有启动的智能体已达到终态（completed 或 failed-and-handled）。
2. QA 审查循环已结束，没有阻塞问题。
3. 会话状态反映最终结果。
4. 结果已记录在内存中，供未来参考。

---

## 技术细节 {#technical-details}

### 终端仪表盘（oma dashboard terminal） {#terminal-dashboard-oma-dashboard-terminal}

- **文件监视：** 使用 [chokidar](https://github.com/paulmillr/chokidar)，配置 `awaitWriteFinish`（200ms 稳定阈值、50ms 轮询间隔），避免渲染部分写入的文件。
- **渲染：** 每次文件变更事件时清除并重新绘制整个终端。使用 `picocolors` 输出 ANSI 颜色，使用 Unicode 方框绘制字符作为边框。
- **内存目录：** 设置了 `MEMORIES_DIR` 时使用它；否则为 `<project>/.agents/state/memories`，其中 `<project>` 是 `--project-root <path>` 或当前目录。目录不存在时会创建空目录。
- **优雅关闭：** 捕获 `SIGINT` 和 `SIGTERM`，关闭 chokidar 监视器并干净退出。

### Web 仪表盘（oma dashboard web） {#web-dashboard-oma-dashboard-web}

- **HTTP 服务器：** Node.js `createServer` 在 `/` 提供 HTML 页面，在 `/recap` 提供回顾页面，在 `/api/state` 提供 JSON 状态，在 `/api/recap` 提供回顾数据。服务器绑定到 `127.0.0.1`。
- **WebSocket：** 使用 `ws` 库。回环来源的连接必须在查询字符串中包含进程令牌。连接时客户端立即收到完整状态，后续更新以 `{ type: "update", event, file, data }` 消息推送。
- **文件监视：** 与终端仪表盘相同的 chokidar 设置。文件变更触发 `broadcast()` 函数，它构建当前状态并发送给所有连接的 WebSocket 客户端。
- **防抖：** 更新以 100ms 防抖，避免快速文件写入时淹没客户端（例如多个智能体同时写入进度）。
- **自动重连：** WebSocket 连接断开时，浏览器客户端使用指数退避重连（初始 1 秒，乘数 1.5，最大 10 秒）。
- **端口：** 默认 9847，可通过 `DASHBOARD_PORT` 环境变量配置。API 请求接受 `X-OMA-Dashboard-Token` 或 `?token=...`；缺少或无效令牌返回 `401`。
- **状态构建：** `buildFullState()` 函数在每次更新时将会话信息、任务看板、智能体状态、回合计数和活动信息流聚合为一个 JSON 对象。

---

## 后续步骤 {#next-steps}

- 运行结束后审计或恢复结果：[结果与恢复](./agent-results-and-resume.md)
- 按症状排查仪表盘和运行故障：[故障排查](./troubleshooting.md)
- 规划并运行多智能体工作：[多智能体项目](./multi-agent-project.md)
