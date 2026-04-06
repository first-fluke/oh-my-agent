---
title: "指南：仪表盘监控"
description: 全面的仪表盘指南，涵盖终端和 Web 仪表盘、数据源、3 终端布局、故障排除和技术实现细节。
---

# 指南：仪表盘监控

## 两个仪表盘命令

oh-my-agent 提供两个实时仪表盘，用于在多智能体工作流期间监控智能体活动。

| 命令 | 界面 | URL | 技术 |
|:-----|:-----|:----|:-----|
| `oma dashboard` | 终端（TUI） | 无 —— 在终端中渲染 | chokidar 文件监视器、picocolors 渲染 |
| `oma dashboard:web` | 浏览器 | `http://localhost:9847` | HTTP 服务器、WebSocket、chokidar 文件监视器 |

两个仪表盘监视相同的数据源：`.serena/memories/` 目录。

### 终端仪表盘

```bash
oma dashboard
```

直接在终端中渲染方框绘制 UI。内存文件变化时自动更新。按 `Ctrl+C` 退出。

```
╔════════════════════════════════════════════════════════╗
║  Serena Memory Dashboard                              ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**状态符号：**
- `●`（绿色）—— 运行中
- `✓`（青色）—— 已完成
- `✗`（红色）—— 失败
- `○`（黄色）—— 阻塞
- `◌`（暗色）—— 等待中

### Web 仪表盘

```bash
oma dashboard:web
```

在端口 9847 上启动 web 服务器（可通过 `DASHBOARD_PORT` 环境变量配置）。浏览器 UI 通过 WebSocket 连接并接收实时更新。

```bash
# 自定义端口
DASHBOARD_PORT=8080 oma dashboard:web

# 自定义内存目录
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

Web 仪表盘显示与终端仪表盘相同的信息，但具有深色主题的样式化 UI，包含：
- 连接状态徽章（已连接 / 断开 / 正在连接，自动重连）
- 会话 ID 和状态栏
- 带动画状态点的智能体状态表
- 最新活动信息流
- 自动更新的时间戳

---

## 推荐 3 终端布局

对于多智能体工作流，推荐使用三个终端面板：

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   终端 1：主智能体             │   终端 2：仪表盘               │
│                                │                                │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   终端 3：临时命令                                              │
│                                                                 │
│   $ oma agent:status session-20260324-143052 backend frontend   │
│   $ oma stats                                                   │
│   $ oma verify backend -w ./api                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**终端 1** 运行你的主智能体会话（Gemini CLI、Claude Code、Codex 等），你在其中与 `/orchestrate` 或 `/work` 等工作流交互。

**终端 2** 运行仪表盘进行被动监控。它自动更新 —— 无需交互。

**终端 3** 用于临时命令：检查智能体状态、运行验证、查看统计或调试问题。

---

## .serena/memories/ 中的数据源

仪表盘从 `.serena/memories/` 目录读取。此目录由智能体和工作流在执行期间使用 MCP 内存工具填充。

### 文件类型及其内容

| 文件模式 | 创建者 | 内容 |
|:---------|:-------|:-----|
| `orchestrator-session.md` | `/orchestrate` 步骤 2 | 会话 ID、开始时间、状态（RUNNING/COMPLETED/FAILED）、工作流版本 |
| `session-{workflow}.md` | `/work`、`/ultrawork` | 会话元数据、阶段进度、用户请求摘要 |
| `task-board.md` | 编排工作流 | Markdown 表格，含智能体分配、状态和任务 |
| `progress-{agent}.md` | 每个启动的智能体 | 当前轮次号、智能体正在做什么、中间结果 |
| `result-{agent}.md` | 每个完成的智能体 | 最终状态（COMPLETED/FAILED）、变更的文件、发现的问题、交付物 |
| `debug-{id}.md` | `/debug` 工作流 | Bug 诊断、根因、应用的修复、回归测试位置 |
| `experiment-ledger.md` | 质量评分系统 | 实验跟踪：基线分数、增量、保留/丢弃决策 |
| `lessons-learned.md` | 会话结束时自动生成 | 从丢弃的实验（增量 <= -5）中提取的教训 |

### 仪表盘如何读取它们

仪表盘使用多种策略提取信息：

1. **会话检测** —— 先查找 `orchestrator-session.md`，然后回退到最近修改的 `session-*.md` 文件。从关键词解析状态：`RUNNING`、`IN PROGRESS`、`COMPLETED`、`DONE`、`FAILED`、`ERROR`。

2. **任务看板解析** —— 将 `task-board.md` 作为 Markdown 表格读取。从列中提取智能体名称、状态和任务描述。

3. **智能体发现** —— 如果不存在任务看板，通过扫描所有 `.md` 文件中的 `**Agent**: {name}` 模式、`Agent: {name}` 行或包含 `_agent` 或 `-agent` 的文件名来发现智能体。

4. **轮次计数** —— 对每个发现的智能体，读取 `progress-{agent}.md` 文件，从 `turn: N` 模式中提取轮次号。

5. **活动信息流** —— 列出最近修改的 5 个 `.md` 文件，提取最后一行有意义的内容（标题、状态行、操作项）作为活动消息。

---

## 每个仪表盘显示什么

### 会话状态

顶部区域显示：
- **会话 ID** —— 从会话文件提取（格式：`session-YYYYMMDD-HHMMSS`）。
- **状态** —— 颜色编码：绿色表示 RUNNING，青色表示 COMPLETED，红色表示 FAILED，黄色表示 UNKNOWN。

### 任务看板

智能体表格显示每个检测到的智能体：
- **智能体名称** —— 领域标识符（backend、frontend、mobile、qa、debug、pm）。
- **状态** —— 当前状态及视觉指示器（running/completed/failed/blocked/pending）。
- **轮次** —— 智能体当前的轮次号（已完成多少次迭代）。从进度文件提取。
- **任务** —— 智能体正在做什么的简短描述（截断以适应显示）。

### 智能体进度

通过 `progress-{agent}.md` 文件跟踪进度。每个文件由智能体在工作时更新。仪表盘轮询这些文件以获取：
- 轮次号（随智能体推进递增）。
- 当前操作（智能体正在做什么）。
- 中间结果（部分完成情况）。

### 结果

当智能体完成时，它写入 `result-{agent}.md`，包含：
- 最终状态（COMPLETED 或 FAILED）。
- 变更的文件列表。
- 遇到的问题。
- 产出的交付物。

仪表盘通过此文件的存在检测完成，并相应更新智能体的状态。

---

## 故障排除手册

### 信号 1：智能体显示 "running" 但无轮次进展

**症状：** 仪表盘显示智能体正在运行，但轮次号已经好几分钟没有变化。

**可能原因：**
- 智能体卡在长时间操作上（大型代码库扫描、缓慢的 API 调用）。
- 智能体已崩溃但 PID 文件仍存在。
- 智能体正在等待用户输入（在自动批准模式下不应发生）。

**操作：**
1. 检查智能体的日志文件：`cat /tmp/subagent-{session-id}-{agent-id}.log`
2. 检查进程是否实际在运行：`oma agent:status {session-id} {agent-id}`
3. 如果进程未运行但状态显示 "running"，智能体已崩溃。带错误上下文重新启动。

### 信号 2：智能体显示 "crashed"

**症状：** `oma agent:status` 对智能体返回 `crashed`。

**可能原因：**
- CLI 供应商进程意外退出（内存不足、API 配额用尽、网络超时）。
- 工作区目录被删除或权限变更。
- 供应商 CLI 未安装或未认证。

**操作：**
1. 检查日志文件了解错误详情：`cat /tmp/subagent-{session-id}-{agent-id}.log`
2. 验证 CLI 安装：`oma doctor`
3. 检查认证：`oma auth:status`
4. 使用相同任务重新启动智能体：`oma agent:spawn {agent-id} "{task}" {session-id} -w {workspace}`

### 信号 3：仪表盘显示 "No agents detected yet"

**症状：** 仪表盘正在运行但未显示任何智能体。

**可能原因：**
- 工作流尚未到达智能体启动步骤。
- `.serena/memories/` 目录为空。
- 仪表盘正在监视错误的目录。

**操作：**
1. 验证内存目录：`ls -la .serena/memories/`
2. 检查工作流是否仍在规划阶段（智能体尚未启动）。
3. 确保仪表盘监视正确的项目目录：仪表盘从当前工作目录解析内存路径。
4. 如果使用自定义路径：`MEMORIES_DIR=/path/to/.serena/memories oma dashboard`

### 信号 4：Web 仪表盘显示 "Disconnected"

**症状：** Web 仪表盘的连接徽章显示红色的 "Disconnected"。

**可能原因：**
- `oma dashboard:web` 进程被终止。
- 浏览器和 localhost 之间的网络问题。
- 端口被其他进程占用。

**操作：**
1. 检查仪表盘进程是否在运行：`ps aux | grep dashboard`
2. 尝试不同的端口：`DASHBOARD_PORT=8080 oma dashboard:web`
3. 检查端口可用性：`lsof -i :9847`
4. Web 仪表盘使用指数退避自动重连（初始 1 秒，最大 10 秒）。等待几秒钟让它重连。

---

## 合并前监控清单

在认为多智能体会话完成之前，通过仪表盘验证：

- [ ] **所有智能体显示 "completed"** —— 没有智能体卡在 "running" 或 "blocked" 状态。
- [ ] **没有智能体显示 "failed"** —— 如果有失败的，检查日志并重新启动。
- [ ] **QA 智能体已完成审查** —— 查找 `result-qa-agent.md` 或 `result-qa.md`。
- [ ] **零 CRITICAL/HIGH 发现** —— 检查 QA 结果文件的严重度计数。
- [ ] **会话状态为 COMPLETED** —— 会话文件应显示最终状态。
- [ ] **活动信息流显示最终报告** —— 最后一条活动应为摘要报告。

---

## 完成标准

仪表盘监控在以下情况完成：
1. 所有启动的智能体已达到终态（completed 或 failed-and-handled）。
2. QA 审查循环已结束，无阻塞问题。
3. 会话状态反映最终结果。
4. 结果已记录在内存中供未来参考。

---

## 技术细节

### 终端仪表盘（oma dashboard）

- **文件监视：** 使用 [chokidar](https://github.com/paulmillr/chokidar)，配置 `awaitWriteFinish`（200ms 稳定阈值、50ms 轮询间隔）以避免渲染部分写入的文件。
- **渲染：** 在每次文件变更事件时清除并重新绘制整个终端。使用 `picocolors` 进行 ANSI 颜色输出，使用 Unicode 方框绘制字符作为边框。
- **内存目录：** 从 `MEMORIES_DIR` 环境变量、CLI 参数或 `{cwd}/.serena/memories` 解析。
- **优雅关闭：** 捕获 `SIGINT` 和 `SIGTERM`，关闭 chokidar 监视器，干净退出。

### Web 仪表盘（oma dashboard:web）

- **HTTP 服务器：** Node.js `createServer` 在 `/` 提供 HTML 页面，在 `/api/state` 提供 JSON 状态。
- **WebSocket：** 使用 `ws` 库。`WebSocketServer` 附加到 HTTP 服务器。连接时，客户端立即收到完整状态。后续更新作为 `{ type: "update", event, file, data }` 消息推送。
- **文件监视：** 与终端仪表盘相同的 chokidar 设置。文件变更触发 `broadcast()` 函数，该函数构建当前状态并发送给所有连接的 WebSocket 客户端。
- **防抖：** 更新以 100ms 防抖，避免在快速文件写入时（如多个智能体同时写入进度时）淹没客户端。
- **自动重连：** 浏览器客户端在 WebSocket 连接断开时使用指数退避重连（初始 1 秒，1.5 倍乘数，最大 10 秒）。
- **端口：** 默认 9847，可通过 `DASHBOARD_PORT` 环境变量配置。
- **状态构建：** `buildFullState()` 函数在每次更新时将会话信息、任务看板、智能体状态、轮次计数和活动信息流聚合为单个 JSON 对象。
