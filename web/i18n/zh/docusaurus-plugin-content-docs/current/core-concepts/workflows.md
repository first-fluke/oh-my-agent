---
title: 工作流
description: 全部 16 个 oh-my-agent 工作流的完整参考。斜杠命令、持久化与非持久化模式、11 种语言的触发关键词、阶段和步骤、读写文件、通过 triggers.json 和 keyword-detector.ts 的自动检测机制、信息性模式过滤和持久化模式状态管理。
---

# 工作流

工作流是由斜杠命令或自然语言关键词触发的结构化多步骤流程。它们定义了智能体如何在任务上协作，从单阶段工具到复杂的 5 阶段质量关卡。

共有 16 个工作流，其中 4 个是持久化的（它们维护状态且不能被意外中断）。

---

## 持久化工作流

持久化工作流持续运行直到所有任务完成。它们在 `.agents/state/` 中维护状态，并在每条用户消息中重新注入 `[OMA PERSISTENT MODE: ...]` 上下文，直到显式停用。

### /orchestrate

**说明：** 基于 CLI 的自动化并行智能体执行。通过 CLI 启动子智能体，通过 MCP 内存协调，监控进度，运行验证循环。

**持久化：** 是。状态文件：`.agents/state/orchestrate-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "orchestrate" |
| 英语 | "parallel"、"do everything"、"run everything" |
| 韩语 | "자동 실행"、"병렬 실행"、"전부 실행"、"전부 해" |
| 日语 | "オーケストレート"、"並列実行"、"自動実行" |
| 中文 | "编排"、"并行执行"、"自动执行" |
| 西班牙语 | "orquestar"、"paralelo"、"ejecutar todo" |
| 法语 | "orchestrer"、"parallèle"、"tout exécuter" |
| 德语 | "orchestrieren"、"parallel"、"alles ausführen" |
| 葡萄牙语 | "orquestrar"、"paralelo"、"executar tudo" |
| 俄语 | "оркестровать"、"параллельно"、"выполнить всё" |
| 荷兰语 | "orkestreren"、"parallel"、"alles uitvoeren" |
| 波兰语 | "orkiestrować"、"równolegle"、"wykonaj wszystko" |

**触发正则模式**（意图 + 名词白名单，参见[自动检测：模式字段](#pattern-field-raw-regex)）：
| 分节 | 模式 | 触发示例 |
|------|------|---------|
| `*`（通用） | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication"、"Create an awesome web service"、"Develop a backend with PostgreSQL" |
| `*`（通用） | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘"、"REST API 구현해"、"백엔드를 개발해주세요" |

名词白名单（15 个）：app、api、service、server、cli、tool、website、dashboard、system、feature、backend、frontend、prototype、mvp、bot。

**步骤：**
1. **步骤 0：准备** 读取协调技能、上下文加载指南、内存协议。检测供应商。
2. **步骤 1：加载/创建计划** 检查 `.agents/results/plan-{sessionId}.json`。如果缺失，提示用户先运行 `/plan`。
3. **步骤 2：初始化会话** 加载 `oma-config.yaml`，显示 CLI 映射表，生成会话 ID（`session-YYYYMMDD-HHMMSS`），在内存中创建 `orchestrator-session.md` 和 `task-board.md`。
4. **步骤 3：启动智能体** 对每个优先级层（先 P0，然后 P1...），使用供应商适配的方式启动智能体（Claude Code 用 Agent 工具，Gemini/Antigravity 用 `oma agent:spawn`，Codex 用模型协调）。不超过 MAX_PARALLEL。
5. **步骤 4：监控** 轮询 `progress-{agent}.md` 文件，更新 `task-board.md`。监视完成、失败、崩溃。
6. **步骤 5：验证** 对每个完成的智能体运行 `verify.sh {agent-type} {workspace}`。失败时带错误上下文重新启动（最多 2 次重试）。2 次重试后，激活探索循环：生成 2-3 个假设，启动并行实验，评分，保留最佳。
7. **步骤 6：收集** 读取所有 `result-{agent}.md` 文件，汇总摘要。
8. **步骤 7：最终报告** 呈现会话摘要。如果测量了质量评分，包含实验账本摘要和自动生成的经验教训。

**读取文件：** `.agents/results/plan-{sessionId}.json`、`.agents/oma-config.yaml`、`progress-{agent}.md`、`result-{agent}.md`。
**写入文件：** `orchestrator-session.md`、`task-board.md`（内存）、最终报告。

**何时使用：** 需要最大并行度和自动化协调的大型项目。

---

### /work

**说明：** 逐步多领域协调。PM 先规划，然后智能体在每个关卡经用户确认后执行，接着进行 QA 审查和问题修复。

**持久化：** 是。状态文件：`.agents/state/work-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "work"、"step by step" |
| 韩语 | "코디네이트"、"단계별" |
| 日语 | "コーディネート"、"ステップバイステップ" |
| 中文 | "协调"、"逐步" |
| 西班牙语 | "coordinar"、"paso a paso" |
| 法语 | "coordonner"、"étape par étape" |
| 德语 | "koordinieren"、"schritt für schritt" |

**步骤：**
1. **步骤 0：准备** 读取技能、上下文加载、内存协议。记录会话开始。
2. **步骤 1：分析需求** 识别涉及的领域。如果是单一领域，建议直接使用智能体。
3. **步骤 2：PM 智能体规划** PM 分解需求，定义 API 契约，创建优先级任务分解，保存到 `.agents/results/plan-{sessionId}.json`。
4. **步骤 3：审查计划** 向用户展示计划。**必须获得确认后才能继续。**
5. **步骤 4：启动智能体** 按优先级层启动，同层并行，独立工作空间。
6. **步骤 5：监控** 轮询进度文件，验证智能体间的 API 契约对齐。
7. **步骤 6：QA 审查** 启动 QA 智能体进行安全（OWASP）、性能、无障碍、代码质量审查。
8. **步骤 6.1：质量评分**（条件）：测量并记录基线。
9. **步骤 7：迭代** 如果发现 CRITICAL/HIGH 问题，重新启动责任智能体。如果同一问题在 2 次尝试后仍存在，激活探索循环。

**何时使用：** 跨越多个领域的功能，你需要逐步控制和每个关卡的用户批准。

---

### /ultrawork

**说明：** 以质量为核心的工作流。5 个阶段，17 个总步骤，其中 11 个是审查步骤。每个阶段都有必须通过才能继续的关卡。

**持久化：** 是。状态文件：`.agents/state/ultrawork-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "ultrawork"、"ulw" |

**阶段和步骤：**

| 阶段 | 步骤 | 智能体 | 审查视角 |
|------|------|-------|---------|
| **PLAN** | 1-4 | PM 智能体（内联） | 完整性、元审查、过度工程/简洁性 |
| **IMPL** | 5 | 开发智能体（启动） | 实现 |
| **VERIFY** | 6-8 | QA 智能体（启动） | 对齐性、安全性（OWASP）、回归预防 |
| **REFINE** | 9-13 | Debug 智能体（启动） | 文件拆分、复用性、级联影响、一致性、死代码 |
| **SHIP** | 14-17 | QA 智能体（启动） | 代码质量（lint/覆盖率）、UX 流程、相关问题、部署就绪 |

**关卡定义：**
- **PLAN_GATE：** 计划已文档化、假设已列出、替代方案已考虑、过度工程审查已完成、用户确认。
- **IMPL_GATE：** 构建成功、测试通过、仅修改了计划中的文件、记录了基线质量评分（如果测量）。
- **VERIFY_GATE：** 实现匹配需求、零 CRITICAL、零 HIGH、无回归、质量评分 >= 75（如果测量）。
- **REFINE_GATE：** 无大文件/函数（> 500 行 / > 50 行）、集成机会已捕获、副作用已验证、代码已清理、质量评分未回退。
- **SHIP_GATE：** 质量检查通过、UX 已验证、相关问题已解决、部署清单完成、最终质量评分 >= 75 且增量非负、用户最终批准。

**关卡失败行为：**
- 第一次失败：返回相关步骤，修复，重试。
- 同一问题第二次失败：激活探索循环（生成 2-3 个假设，逐一实验，评分，保留最佳）。

**条件增强：** 质量评分测量、保留/丢弃决策、实验账本、假设探索、自动学习（从丢弃的实验中提取经验）。

**REFINE 跳过条件：** 50 行以下的简单任务。

**何时使用：** 最高质量交付。代码必须达到生产就绪且经过全面审查。

---

### /ralph

**说明：** 持久化的自引用执行循环。用独立验证器包装 ultrawork，在每次迭代后检查完成标准。一直循环直到所有标准通过或安全措施触发。

**持久化：** 是。状态文件：`.agents/state/ralph-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "ralph" |
| 英语 | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| 韩语 | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| 日语 | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| 中文 | "不要停", "直到完成", "全部完成", "做完为止" |
| 西班牙语 | "no pares", "hasta completar", "termina todo" |
| 法语 | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| 德语 | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**阶段：**
1. **Phase 0：INIT** 加载前置条件（context-loading、内存协议、judge 协议）。定义可验证的完成标准（每项必须可机械验证，测试通过、构建成功、文件存在）。向用户展示标准以供确认。以 `max_iterations: 5` 初始化会话。
2. **Phase 1：WORK** 将 ultrawork（PLAN → IMPL → VERIFY → REFINE → SHIP）作为一次迭代执行。
3. **Phase 2：JUDGE** 独立验证器将每个完成标准与项目实际状态核对（运行测试、检查构建、验证文件存在）。将每个标准评为 PASS/FAIL 并附上证据。
4. **Phase 3：DECIDE** 若所有标准 PASS → 结束循环，生成最终报告。若有 FAIL → 递增迭代计数器，回传失败上下文，返回 Phase 1。
5. **安全措施：** 当 `current_iteration >= max_iterations`（默认 5）达到时，或同一标准因相同根本原因连续失败 3 次时（卡住检测），循环停止。

**与 /ultrawork 的主要区别：** Ultrawork 是一次性的 5 阶段工作流。Ralph 将 ultrawork 包装在重试循环中，由独立的 judge 客观验证完成情况，它会一直运行直到工作真正完成，而不仅仅是"已审查"。

**读取文件：** `.agents/workflows/ralph/resources/judge-protocol.md`，以及所有 ultrawork 文件。
**写入文件：** `session-ralph.md`（内存）、迭代日志、最终报告。

**何时使用：** 当需要有保障的完成时，智能体必须持续工作直到可验证的标准通过，而不是只做一次就报告。

---

## 非持久化工作流

### /plan

**说明：** PM 驱动的任务分解。分析需求，选择技术栈，分解为带依赖关系的优先级任务，定义 API 契约。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "task breakdown" |
| 英语 | "plan" |
| 韩语 | "계획"、"요구사항 분석"、"스펙 분석" |
| 日语 | "計画"、"要件分析"、"タスク分解" |
| 中文 | "计划"、"需求分析"、"任务分解" |

**步骤：** 收集需求 -> 分析技术可行性（MCP 代码分析）-> 定义 API 契约 -> 分解为任务 -> 与用户审查 -> 保存计划。

**输出：** `.agents/results/plan-{sessionId}.json`、内存写入，复杂计划可选输出到 `docs/exec-plans/active/`。

**执行方式：** 内联（不启动子智能体）。由 `/orchestrate` 或 `/work` 消费。

---

### /exec-plan

**说明：** 创建、管理和跟踪执行计划，将其作为一等仓库产物存储在 `docs/exec-plans/` 中。

**触发关键词：** 无（排除在自动检测之外，必须显式调用）。

**步骤：** 准备 -> 分析范围（评估复杂度：简单/中等/复杂）-> 创建执行计划（Markdown 存储在 `docs/exec-plans/active/` 中）-> 定义 API 契约（如果跨边界）-> 与用户审查 -> 执行（交给 `/orchestrate` 或 `/work`）-> 完成（移至 `completed/`）。

**输出：** `docs/exec-plans/active/{plan-name}.md`，包含任务表、决策日志、进度备注。

**何时使用：** 在 `/plan` 之后，用于需要跟踪执行和决策记录的复杂功能。

---

### /brainstorm

**说明：** 设计优先的创意探索。探索意图，澄清约束，提出方案，在规划前产出一份经批准的设计文档。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "brainstorm" |
| 英语 | "ideate"、"explore design" |
| 韩语 | "브레인스토밍"、"아이디어"、"설계 탐색" |
| 日语 | "ブレインストーミング"、"アイデア"、"設計探索" |
| 中文 | "头脑风暴"、"创意"、"设计探索" |

**步骤：** 探索项目上下文（MCP 分析）-> 逐一提出澄清问题 -> 提出 2-3 个方案并分析权衡 -> 逐节展示设计（每步需用户批准）-> 保存设计文档到 `docs/plans/` -> 过渡：建议运行 `/plan`。

**规则：** 设计批准前不进行实现或规划。不输出代码。遵循 YAGNI 原则。

---

### /architecture

**说明：** 软件架构工作流，诊断架构问题，选择合适的分析方法（诊断路由 / design-twice / ATAM / CBAM / ADR），对比选项，综合利益相关者的意见，并产出建议、评审或 ADR。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "architecture"、"ADR"、"ATAM"、"CBAM" |
| 英语 | "architecture review"、"architectural tradeoff" |
| 韩语 | "아키텍처"、"설계 검토" |
| 日语 | "アーキテクチャ" |
| 中文 | "架构" |

**步骤：** 界定决策（新架构 / 评审 / 权衡分析 / 投资优先级 / 撰写 ADR）-> 通过诊断路由选择方法论 -> 通过 MCP 代码分析（`get_symbols_overview`、`find_symbol`、`find_referencing_symbols`）分析当前架构 -> 综合利益相关者意见（仅当决策足够横切以证明成本合理时）-> 产出带有明确假设、权衡、风险、验证步骤的建议 -> 需要实现时交接给 `/plan`。

**规则：** 不要在此工作流中编写实现代码或任务计划。架构决策后交接给 `/plan`。始终使用 MCP 工具；不要用原始文件读取或 grep 代替。

**何时使用：** 系统架构选择、模块/服务/所有权边界决策、重构优先级、撰写 ADR、调查架构痛点（变更放大、隐藏依赖、笨拙的 API）。

---

### /deepinit

**说明：** 完整项目初始化。分析现有代码库，生成 AGENTS.md、ARCHITECTURE.md 和结构化的 `docs/` 知识库。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "deepinit" |
| 韩语 | "프로젝트 초기화" |
| 日语 | "プロジェクト初期化" |
| 中文 | "项目初始化" |

**步骤：** 准备 -> 分析代码库（项目类型、架构、隐含规则、领域、边界）-> 生成 ARCHITECTURE.md（领域地图，不超过 200 行）-> 生成 `docs/` 知识库（design-docs/、exec-plans/、generated/、product-specs/、references/、领域文档）-> 生成根 AGENTS.md（约 100 行，目录）-> 生成边界 AGENTS.md 文件（monorepo 包，每个不超过 50 行）-> 更新现有框架（如果重新运行）-> 验证（无死链接，行数限制）。

**输出：** AGENTS.md、ARCHITECTURE.md、docs/design-docs/、docs/exec-plans/、docs/PLANS.md、docs/QUALITY-SCORE.md、docs/CODE-REVIEW.md 以及发现的领域特定文档。

---

### /review

**说明：** 完整 QA 审查流水线。安全审计（OWASP Top 10）、性能分析、无障碍检查（WCAG 2.1 AA）和代码质量审查。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "code review"、"security audit"、"security review" |
| 英语 | "review" |
| 韩语 | "리뷰"、"코드 검토"、"보안 검토" |
| 日语 | "レビュー"、"コードレビュー"、"セキュリティ監査" |
| 中文 | "审查"、"代码审查"、"安全审计" |

**步骤：** 确定审查范围 -> 自动安全检查（npm audit、bandit）-> 手动安全审查（OWASP Top 10）-> 性能分析 -> 无障碍审查（WCAG 2.1 AA）-> 代码质量审查 -> 生成 QA 报告。

**可选的修复-验证循环**（使用 `--fix`）：QA 报告后，启动领域智能体修复 CRITICAL/HIGH 问题，重新运行 QA，最多重复 3 次。

**委派：** 对于大范围审查，将步骤 2-7 委派给启动的 QA 智能体子智能体。

---

### /deepsec

**说明：** 端到端驱动 `oma-deepsec` 技能。安装 `.deepsec/`、校准成本、运行 scan/process/triage/revalidate/export 流程、通过 `process --diff` 设置 PR 门禁、编写自定义匹配器，并将发现路由到专业智能体。内联执行（不启动子智能体）。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "/deepsec"、"deepsec workflow" |
| 英语 | "run deepsec"、"deepsec scan this repo"、"scan repo with deepsec"、"deepsec pr review"、"deepsec ci gate"、"deepsec triage"、"deepsec matchers" |
| 韩语 | "딥섹 워크플로우"、"딥섹 실행"、"딥섹 스캔"、"딥섹으로 검사"、"딥섹 PR 리뷰"、"딥섹 CI 게이트" |
| 日语 | "ディープセック実行"、"deepsecワークフロー"、"deepsecでスキャン"、"deepsec PRレビュー" |
| 中文 | "运行 deepsec"、"deepsec 工作流"、"用 deepsec 扫描"、"deepsec PR 审查" |

**步骤：**
1. **步骤 1，加载技能：** 读取 `.agents/skills/oma-deepsec/SKILL.md`，然后仅加载匹配已解析意图的资源文件（`setup.md`、`scanning.md`、`pr-review.md`、`matchers.md`、`triage.md`、`config.md`）。若仓库根目录已存在 `.deepsec/`，按增量运行处理，绝不重新 `init`。
2. **步骤 2，分类意图：** 解析为 `setup`、`scan`、`pr-review`、`matchers`、`triage`、`config`、`troubleshoot` 中的恰好一种。多意图提示按顺序执行。若 `.deepsec/` 缺失，则在任何 AI 调用意图前插入 `setup`。
3. **步骤 3，确认智能体选择：** 任何付费调用前，确认 `claude`（推理最强、最贵）与 `codex`（只读沙箱、更便宜）。若用户指定、`deepsec.config.ts` 中固定了 `defaultAgent`，或用户委托选择，则跳过。
4. **步骤 4，执行已解析意图：**
   - **4A `setup`：** `bunx deepsec init`、`bun install`、编辑 `.env.local`，用 `scan --limit 20` + `process --limit 5` 验证，然后撰写 `data/<id>/INFO.md`（50-100 行，项目特定）。**`INFO.md` 需要用户确认。**
   - **4B `scan`：** Scan -> 用 `--limit 50 --concurrency 5` 校准 -> 报告成本外推（需明确用户许可）-> 完整 `process` -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`。
   - **4C `pr-review`：** 直接模式 `process --diff origin/${BASE_REF} --comment-out comment.md`。发布双任务 CI 模式（`analyze` 不带 `pull-requests: write`，`comment` 仅消费净化后的工件）。退出码 `1` = 至少一个全新发现。
   - **4D `matchers`：** 遍历 `data/<id>/files/` 查找入口点缺口，在 `.deepsec/matchers/<slug>.ts` 编写按 slug 的匹配器，使用合适的噪声层级（`precise` / `normal` / `noisy`），通过 `.deepsec/deepsec.config.ts` 连接，使用 `scan --matchers` 验证。
   - **4E `triage`：** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> 将导出过滤为仅 `true-positive` / `uncertain`。记录重复出现的 FP 形态，用于下一次 `INFO.md` 修订。
   - **4F `config` / `troubleshoot`：** 应用 `resources/config.md` 中的症状表。
5. **步骤 5，总结与路由：** 生成运行摘要（项目 id、流程类型、agent/model、扫描文件数、发现数量、revalidate 后的 TP、成本、墙钟时间、停止条件）。按**脆弱文件的层级**路由后续工作（backend -> `oma-backend`，frontend -> `oma-frontend`，mobile -> `oma-mobile`，IaC -> `oma-tf-infra`，DB -> `oma-db`，CI -> `oma-dev-workflow`，文档漂移 -> `oma-docs`，入口点缺口 -> 重新进入步骤 4D）。层级模糊或 `revalidation.verdict === "uncertain"` 时，先用 `oma-debug` 作为分诊跳点。
6. **步骤 6，停止条件：** 在完成意图 + 步骤 5 摘要、阻塞前提条件（凭证缺失、`INFO.md` 被拒绝），或带有安全恢复命令的配额停止时结束。

**读取文件：** `.agents/skills/oma-deepsec/SKILL.md`、`.agents/skills/oma-deepsec/resources/*.md`（按意图范围）、`data/<id>/INFO.md`、`data/<id>/files/`、`deepsec.config.ts`。
**写入文件：** `.deepsec/`（`setup` 时）、`.env.local`（已 gitignore）、`data/<id>/INFO.md`、`.deepsec/matchers/<slug>.ts`、`findings/`（`export` 时）、`comment.md`（`pr-review` 时）。

**规则：** 此工作流不修改产品源代码（交由专家处理）。不回显或提交凭证（`vck_…`、`sk-ant-…`、OIDC 令牌）。不向任何运行 PR 控制代码的 CI 任务授予 `pull-requests: write`。恢复，不重置：中断时重新运行相同命令；未经用户明确指示，绝不 `rm -rf data/<id>/`。

**使用场景：** 仓库的智能体驱动漏洞扫描、通过 `process --diff` 的 CI/PR 安全门禁、为入口点覆盖编写项目特定匹配器、对现有发现进行分诊以减少 FP。

---

### /debug

**说明：** 结构化的 bug 诊断和修复，包含回归测试编写和类似模式扫描。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "debug" |
| 英语 | "fix bug"、"fix error"、"fix crash" |
| 韩语 | "디버그"、"버그 수정"、"에러 수정"、"버그 찾아"、"버그 고쳐" |
| 日语 | "デバッグ"、"バグ修正"、"エラー修正" |
| 中文 | "调试"、"修复 bug"、"修复错误" |

**步骤：** 收集错误信息 -> 复现（MCP `search_for_pattern`、`find_symbol`）-> 诊断根因（MCP `find_referencing_symbols` 追踪执行路径）-> 提出最小修复方案（需用户确认）-> 应用修复 + 编写回归测试 -> 扫描类似模式（范围超过 10 个文件时可能启动 debug-investigator 子智能体）-> 在内存中记录 bug。

**子智能体启动条件：** 错误跨越多个领域、扫描范围超过 10 个文件、或需要深层依赖追踪。

---

### /design

**说明：** 7 阶段设计工作流，产出包含 token、组件模式和无障碍规则的 DESIGN.md。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 通用 | "design system"、"DESIGN.md"、"design token" |
| 英语 | "design"、"landing page"、"ui design"、"color palette"、"typography"、"dark theme"、"responsive design"、"glassmorphism" |
| 韩语 | "디자인"、"랜딩페이지"、"디자인 시스템"、"UI 디자인" |
| 日语 | "デザイン"、"ランディングページ"、"デザインシステム" |
| 中文 | "设计"、"着陆页"、"设计系统" |

**阶段：** SETUP（上下文收集，`.design-context.md`）-> EXTRACT（可选，从参考 URL/Stitch 提取）-> ENHANCE（模糊提示增强）-> PROPOSE（2-3 个设计方向，包含颜色、字体、布局、动效、组件）-> GENERATE（DESIGN.md + CSS/Tailwind/shadcn token）-> AUDIT（响应式、WCAG 2.2、Nielsen 启发式、AI 痕迹检测）-> HANDOFF（保存，通知用户）。

**强制要求：** 所有输出响应式优先（移动端 320-639px、平板 768px+、桌面 1024px+）。

---

### /scm

**说明：** 生成符合 Conventional Commits 规范的提交，支持自动按功能拆分。

**触发关键词：** 无（排除在自动检测之外）。

**步骤：** 分析变更（git status、git diff）-> 分离功能（如果超过 5 个文件且跨越不同 scope/type）-> 确定类型（feat/fix/refactor/docs/test/chore/style/perf）-> 确定范围（变更的模块）-> 编写描述（祈使语气，< 72 字符）-> 立即执行提交（不需确认提示）。

**规则：** 不使用 `git add -A`。不提交密钥。多行消息使用 HEREDOC。Co-Author: `First Fluke <our.first.fluke@gmail.com>`。

---

### /tools

**说明：** 管理 MCP 工具的可见性和限制。

**触发关键词：** 无（排除在自动检测之外）。

**功能：** 显示当前 MCP 工具状态，启用/禁用工具组（memory、code-analysis、code-edit、file-ops），永久或临时（`--temp`）更改，自然语言解析（"只用 memory 工具"、"禁用 code edit"）。

**工具组：**
- memory: read_memory、write_memory、edit_memory、list_memories、delete_memory
- code-analysis: get_symbols_overview、find_symbol、find_referencing_symbols、search_for_pattern
- code-edit: replace_symbol_body、insert_after_symbol、insert_before_symbol、rename_symbol
- file-ops: list_dir、find_file

---

### /pdf

**说明：** 使用 `opendataloader-pdf` 将 PDF 转换为 Markdown，以正确的阅读顺序提取文本、表格、标题和图像。

**触发关键词：** 无（必须使用输入文件路径显式调用）。

**步骤：** 验证输入（确认文件存在）-> 确定输出位置（用户指定或与输入相同的目录）-> 运行 `uvx opendataloader-pdf`（无需安装）-> 对于扫描 PDF 使用带 OCR 的混合模式 -> 使用 `uvx mdformat` 规范化输出 -> 验证可读性和结构 -> 报告任何转换问题（缺失表格、乱码文本）。

**规则：** 默认输出位置是与输入 PDF 相同的目录。永远不要跳过步骤。响应语言遵循 `.agents/oma-config.yaml`。

**何时使用：** 将 PDF 文档转换为 Markdown 以用于 LLM 上下文或 RAG 摄取、从 PDF 中提取结构化内容（表格、标题、列表）。

---

### /stack-set

**说明：** 自动检测项目技术栈并为 backend 技能生成语言特定的参考资料。

**触发关键词：** 无（排除在自动检测之外）。

**步骤：** 检测（扫描配置清单：pyproject.toml、package.json、Cargo.toml、pom.xml、go.mod、mix.exs、Gemfile、*.csproj）-> 确认（显示检测到的技术栈，获取用户确认）-> 生成（`stack/stack.yaml`、`stack/tech-stack.md`、包含 8 个必需模式的 `stack/snippets.md`、`stack/api-template.*`）-> 验证。

**输出：** 文件保存在 `.agents/skills/oma-backend/stack/` 中。不修改 SKILL.md 或 `resources/`。

---

## 技能 vs. 工作流

| 方面 | 技能 | 工作流 |
|------|------|-------|
| **本质** | 智能体的专业能力（智能体知道什么） | 编排流程（智能体如何协作） |
| **位置** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **激活方式** | 通过技能路由关键词自动激活 | 斜杠命令或触发关键词 |
| **范围** | 单领域执行 | 多步骤，通常多智能体 |
| **示例** | "构建一个 React 组件" | "规划功能 -> 构建 -> 审查 -> 提交" |

---

## 自动检测：工作原理

### 钩子系统

oh-my-agent 使用 `UserPromptSubmit` 钩子，在处理每条用户消息之前运行。钩子系统由以下部分组成：

1. **`triggers.json`**（`.claude/hooks/triggers.json`）：为全部 11 种支持语言（英语、韩语、日语、中文、西班牙语、法语、德语、葡萄牙语、俄语、荷兰语、波兰语）定义关键词到工作流的映射。

2. **`keyword-detector.ts`**（`.claude/hooks/keyword-detector.ts`）：TypeScript 逻辑，扫描用户输入与触发关键词的匹配，支持语言特定匹配，并注入工作流激活上下文。

3. **`persistent-mode.ts`**（`.claude/hooks/persistent-mode.ts`）：通过检查活跃状态文件并重新注入工作流上下文来强制执行持久化工作流。

### 检测流程

1. 用户输入自然语言。
2. 钩子检查是否存在显式 `/command`（如果有，跳过检测以避免重复）。
3. 钩子先净化输入（剥离代码块、引号字符串以及粘贴的系统回显块），再扫描其与 `.agents/hooks/core/triggers.json` 的匹配，涵盖关键词列表（字面短语）和 `patterns`（原始正则）；同时强化保护机制会抑制 60 秒内已触发 2 次或以上的同一工作流，避免重复触发。
4. 如果找到匹配，检查输入是否匹配信息性模式。
5. 如果是信息性的（如 "什么是 orchestrate？"），过滤掉，不触发工作流。
6. 如果是可操作的，将 `[OMA WORKFLOW: {workflow-name}]` 注入上下文。
7. 智能体读取注入的标签，并从 `.agents/workflows/` 加载对应的工作流文件。

### 语言分节约定

`.agents/hooks/core/triggers.json` 对 `keywords`、`patterns` 和 `informationalPatterns` 使用按语言分节的结构：

| 分节 | 行为 |
|------|------|
| `*` | 通用：无论 `.agents/oma-config.yaml` 中的 `language` 设置如何都会加载。用于英语内容（通用语）以及真正跨语言的 token（如工作流名 `"orchestrate"`）。 |
| `en` | 英语：为向后兼容而加载。功能上等价于 `*`。新的英语内容应放入 `*`。 |
| `ko`、`ja`、`zh`、`es`、`fr`、`de`、`pt`、`ru`、`nl`、`pl` | 语言专用：仅当 `.agents/oma-config.yaml` 中设置了 `language: <lang>` 时才加载。 |

**含义**：如果在 `.agents/oma-config.yaml` 中设置 `language: en`，则只会加载 `*` 和 `en` 模式。即使用户使用韩语/日语等输入，这些自然语言触发器也不会触发。要启用非英语语言，请相应地设置 `language: <code>`。`*` 中的英语回退始终保持活跃。

### 模式字段（原始正则） {#pattern-field-raw-regex}

除了字面量 `keywords` 之外，每个工作流还可以声明 `patterns`，使用 `iu` 标志编译的原始正则表达式字符串。模式可实现多 token 的意图匹配，否则需要组合爆炸的关键词列表才能覆盖。

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

编写规则：
- 字符串会被直接编译：反斜杠需要转义两次：一次给 JSON，一次给正则（`\\b`、`\\s+`）
- 不会自动包裹单词边界：模式作者需自行处理 `\b`
- 无效正则在运行时会被静默跳过（在配置编辑期间通过测试失败可见）

### 信息性模式过滤

`.agents/hooks/core/triggers.json` 中的 `informationalPatterns` 部分定义了表示提问而非命令的短语。在每个潜在工作流匹配周围 60 个字符的窗口内进行检查：

| 分节 | 模式示例 |
|------|---------|
| `*`（通用英语） | "what is"、"what are"、"how to"、"how does"、"how do"、"should we"、"should i"、"could we"、"would you"、"what if"、"what about"、"why build"、"false positive"、"trigger when"、"auto-trigger" |
| `ko` | "뭐야"、"무엇"、"어떻게"、"설명해"、"알려줘"、"트리거"、"발동"、"메타"、"왜 만들"、"어떻게 만들"、"어떨까"、"한다면"、"할까요" |
| `ja` | "とは"、"って何"、"どうやって"、"説明して" |
| `zh` | "是什么"、"什么是"、"怎么"、"解释" |

如果输入同时匹配工作流触发器和信息性模式，信息性模式优先，不触发任何工作流。这正是用于阻止以下提示的机制：
- `"How do you build a TODO app?"`：`*` 中的 `how do` 阻止 orchestrate 意图正则
- `"orchestrate 트리거 해주면 되나요?"`（在 `language: ko` 下） ， `ko` 中的 `트리거` 阻止 orchestrate 关键词

### 排除的工作流

以下工作流排除在自动检测之外，必须使用显式 `/command` 调用：
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`
- `/pdf`

---

## 持久化模式机制

### 状态文件

持久化工作流（orchestrate、ultrawork、work）在 `.agents/state/` 中创建状态文件：

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

这些文件包含：工作流名称、当前阶段/步骤、会话 ID、时间戳以及任何待处理状态。

### 强化

当持久化工作流活跃时，`persistent-mode.ts` 钩子会在每条用户消息中注入 `[OMA PERSISTENT MODE: {workflow-name}]`。这确保工作流即使跨越多次对话轮次也能持续执行。

### 停用

要停用持久化工作流，用户说 "workflow done"（或其配置语言的等价表达）。这将：
1. 从 `.agents/state/` 删除状态文件
2. 停止注入持久化模式上下文
3. 恢复正常操作

当所有步骤完成且最终关卡通过时，工作流也可以自然结束。

---

## 典型工作流序列

### 快速功能
```
/plan → 审查输出 → /exec-plan
```

### 复杂多领域项目
```
/work → PM 规划 → 用户确认 → 智能体启动 → QA 审查 → 修复问题 → 发布
```

### 最高质量交付
```
/ultrawork → PLAN（4 个审查步骤）→ IMPL → VERIFY（3 个审查步骤）→ REFINE（5 个审查步骤）→ SHIP（4 个审查步骤）
```

### Bug 调查
```
/debug → 复现 → 根因 → 最小修复 → 回归测试 → 类似模式扫描
```

### 设计到实现的流水线
```
/brainstorm → 设计文档 → /plan → 任务分解 → /orchestrate → 并行实现 → /review → /scm
```

### 新代码库设置
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
