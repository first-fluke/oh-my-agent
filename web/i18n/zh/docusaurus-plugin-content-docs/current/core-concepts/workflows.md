---
title: 工作流
description: OMA 全部 21 个工作流的完整参考，涵盖斜杠命令、持久化与非持久化模式、11 种语言的触发关键词、阶段和步骤、读写文件、通过 triggers.json 与 keyword-detector.ts 实现的自动检测、信息性模式过滤，以及持久化模式的状态管理。
---

# 工作流

工作流是由斜杠命令或自然语言关键词触发的结构化多步骤流程。它们定义智能体如何协作处理任务，范围从单阶段工具到包含 5 个阶段的复杂质量关卡。

共有 21 个工作流，其中 4 个是持久化工作流（会维护状态，不能被意外中断）。

---

## 选择技能或工作流 {#choosing-a-skill-or-workflow}

根据任务所需的协调和验证方式选择。如果已经选择了工作流，就遵循该工作流；工作流启动后应持续执行，除非你明确取消或更换。新任务尚未选择工作流时，可参考下表：

| 任务需求 | 选择 | 示例 |
|---|---|---|
| 单一领域，无需协调智能体 | [单技能](/docs/guide/single-skill) | 添加 API 端点并测试输入验证 |
| 多个领域，需要逐步规划、实现和 QA | `/work` | 协调 API 变更及其 Web 和移动端客户端的修改 |
| 自动分派独立任务，并行执行 | `/orchestrate` | 解决依赖关系后并行实现后端和前端任务 |
| 明确要求完整的质量流程 | `/ultrawork` | 完整执行规划、实现、验证、改进和发布就绪审查 |
| 明确要求反复执行，直到可用程序验证的标准通过 | `/ralph` | 在循环安全措施允许的范围内，反复实现并独立验证，直到指定的回归检查通过 |

`/orchestrate` 会先加载可用计划，或通过 `/plan` 创建计划，再启动智能体。你无需先运行 `/plan`。因此，是否已有计划并不是 `/work` 和 `/orchestrate` 的区别；应根据所需的协调方式选择。两者都能并行执行独立任务。

单技能任务也需要验收标准和测试。仅有这些要求不意味着要用 `/ralph`：Ralph 每次迭代都会执行完整的 ultrawork 流程，并由独立 judge 验证，适合明确需要这种重复验证循环的任务。安全措施触发时，即使还有未完成或受阻的工作，循环也可能停止。

此表提供选择建议，并非自动工作流路由器。宿主智能体可以推荐合适的方式；推荐或解释工作流不会启动它。斜杠命令可以明确选择工作流。启用关键词检测钩子后，匹配配置中的关键词或模式也可能激活工作流，但仍受信息性查询过滤规则约束。检测器不会判断领域数量、检查计划是否可执行，也不会把此表用作优先级算法。

计划审查沿用任务已有的授权。智能体只会在缺少关键决策或操作超出授权范围时询问。发布就绪审查本身不构成发布或部署授权。

---

## 持久化工作流 {#persistent-workflows}

持久化工作流持续运行直到所有任务完成。它们在 `.agents/state/` 中维护状态，并在每条用户消息中重新注入 `[OMA PERSISTENT MODE: ...]` 上下文，直到显式停用。

只有**显式调用**才会启动持久模式，即工作流自己的名称（`triggers.json` 中的 `explicit` 列表，例如“orchestrate”、“ultrawork”/“ulw”、“ralph”/“랄프”、“work mode”）。下面的其他触发关键词是自然语言提示：它们只会把工作流作为建议注入，不会激活持久模式；当提示的第一行或最后一行是以 `?` 结尾的问句时，它们也绝不会触发。

### /orchestrate

**说明**：基于 CLI 的自动化并行智能体执行。通过 CLI 启动子智能体，使用持久化运行状态和回执协调它们，监控进度并运行验证循环。

**持久化：** 是。状态文件：`.agents/state/orchestrate-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 显式（持久） | "orchestrate"、"オーケストレート"、"orquestar"、"orchestrer"、"orchestrieren"、"orquestrar"、"оркестровать"、"orkestreren"、"orkiestrować" |
| 英语 | "do everything"、"run everything"、"everything in parallel"、"automate everything" |
| 韩语 | "전부 실행"、"전부 해"、"전부 병렬로"、"자동으로 해줘" |
| 日语 | "全部実行"、"全部並列で"、"自動でやって" |
| 中文 | "编排"、"全部执行"、"全部并行"、"自动处理" |
| 西班牙语 | "ejecutar todo"、"todo en paralelo" |
| 法语 | "tout exécuter"、"tout en parallèle" |
| 德语 | "alles ausführen"、"alles parallel" |
| 葡萄牙语 | "executar tudo"、"tudo em paralelo" |
| 俄语 | "выполнить всё"、"всё параллельно" |
| 荷兰语 | "alles uitvoeren"、"alles parallel" |
| 波兰语 | "wykonaj wszystko"、"wszystko równolegle" |

单独的“parallel”/“automate”（及其各语言译法）不是触发词：“run the tests in parallel”或“automate the release notes”是普通请求，不是多智能体编排。

**触发正则模式**（意图 + 名词白名单，参见[自动检测：模式字段](#pattern-field-raw-regex)）：
| 分节 | 模式 | 触发示例 |
|------|------|---------|
| `*`（通用） | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication"、"Create an awesome web service"、"Develop a backend with PostgreSQL" |
| `*`（通用） | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘"、"REST API 구현해"、"백엔드를 개발해주세요" |

名词白名单（14 个）：app、api、service、server、cli、tool、website、dashboard、system、backend、frontend、prototype、mvp、bot。单个功能（“implement the login feature”、“로그인 기능 구현해줘”）或已有的东西（“make the API faster”）不会匹配。

**步骤：**
1. **步骤 0，准备**：读取协调技能、上下文加载指南和内存协议。检测供应商。
2. **步骤 1，加载或创建计划**：先检查 `.agents/results/plan-{sessionId}.json`，再检查最新的 `plan-*.json`。如果没有计划，或计划尚不可执行（任务缺少智能体、优先级层、依赖关系或验收标准），则在当前流程中内联委派 `/plan` 创建计划，并沿用同一会话 ID。展示计划并沿用已有授权；只有缺少关键决策或需要新增授权时，才在委派前询问。
3. **步骤 2，初始化会话**：加载 `oma-config.yaml`，显示 CLI 映射表，沿用创建计划时的会话 ID，或生成新的会话 ID（`session-YYYYMMDD-HHMMSS`），并在配置的内存存储中创建 `orchestrator-session-{sessionId}.md` 和 `task-board-{sessionId}.md`。
4. **步骤 3，启动智能体**：按优先级层处理每个任务（先 P0，再 P1……），使用供应商适配的方法启动智能体（当前运行时和目标供应商相同时使用原生子智能体；外部或跨供应商工作使用 `oma agent spawn`）。绝不超过 MAX_PARALLEL。
5. **步骤 4，监控**：轮询运行范围内的 `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` 文件和结构化回执，然后更新任务板。留意完成、失败和崩溃。
6. **步骤 5，验证**：对每个完成的智能体运行 `verify.sh {agent-type} {workspace}`。失败时带上错误上下文重新启动（最多重试 2 次）。反复失败时，可以考虑尝试其他假设，但所有尝试共用同一份恢复总预算。如果预算不足以支撑一轮对比，则保留未解决的证据。
7. **步骤 6，收集**：读取运行范围内的结果文件和结构化声明，然后编写摘要。
8. **步骤 7，最终报告**：呈现会话摘要。如果运行了实验，则总结证据和决策；仅在确认了可复用的原因时才记录经验教训。

**读取文件：**`.agents/results/plan-{sessionId}.json`、`.agents/oma-config.yaml`、运行范围内的进度和结果文件，以及结构化运行回执。
**写入文件**：配置内存存储中的运行范围会话和任务板状态、结构化回执和声明，以及最终报告。

**何时使用**：需要最大并行度和自动化协调的大型项目。

### /work

**说明：** 逐步多领域协调。PM 先规划，然后智能体在授权范围内执行，接着完成 QA 审查和问题修复。

**持久化：** 是。状态文件：`.agents/state/work-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 显式（持久） | "work mode"、"work workflow" |
| 通用 | "step by step" |
| 英语 | "one by one"、"one step at a time" |
| 韩语 | "단계별"、"하나씩 해줘"、"차근차근" |
| 日语 | "ステップバイステップ"、"一歩ずつ" |
| 中文 | "逐步"、"一步一步" |
| 西班牙语 | "paso a paso"、"uno por uno" |
| 法语 | "étape par étape"、"un par un" |
| 德语 | "schritt für schritt"、"der reihe nach" |

单独的“work”不是触发词，它只是普通词汇（“Does this work on Windows?”）。

**步骤：**
1. **步骤 0：准备** 读取技能、上下文加载、内存协议。记录会话开始。
2. **步骤 1：分析需求** 识别涉及的领域。如果是单一领域，建议直接使用智能体。
3. **步骤 2：PM 智能体规划** PM 分解需求，定义 API 契约，创建优先级任务分解，保存到 `.agents/results/plan-{sessionId}.json`。
4. **步骤 3：审查计划** 展示计划，并在已有授权范围内继续执行。只有缺少关键决策或需要新增授权时才询问。
5. **步骤 4：启动智能体** 按优先级层启动，同层并行，独立工作空间。
6. **步骤 5：监控** 轮询进度文件，验证智能体间的 API 契约对齐。
7. **步骤 6：QA 审查** 启动 QA 智能体进行安全（OWASP）、性能、无障碍、代码质量审查。
8. **步骤 6.1：测量**（条件）：需要做明确定义的对比时，记录基线。
9. **步骤 7：迭代** 如果发现 CRITICAL/HIGH 问题，重新启动责任智能体。如果同一问题在 2 次尝试后仍存在，激活探索循环。

**何时使用：** 功能跨越多个领域，需要逐步协调规划、实现和 QA。

---

### /ultrawork

**说明**：以质量为核心的工作流。包含 5 个阶段、17 个总步骤和 12 个隔离审查步骤。每个阶段都有必须通过才能继续的关卡。

**持久化：** 是。状态文件：`.agents/state/ultrawork-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 显式（持久） | "ultrawork"、"ulw" |

**阶段和步骤：**

| 阶段 | 步骤 | 智能体 | 审查视角 |
|------|------|-------|---------|
| **PLAN** | 1-4 | PM 智能体（内联） | 完整性、元审查、过度工程/简洁性 |
| **IMPL** | 5 | 开发智能体（启动） | 实现 |
| **VERIFY** | 6-8 | QA 智能体（启动） | 对齐性、安全性（OWASP）、回归预防 |
| **REFINE** | 9-13 | 重构智能体（启动） | 文件拆分、复用性、级联影响、一致性、死代码 |
| **SHIP** | 14-17 | QA 智能体（启动） | 代码质量（lint/覆盖率）、UX 流程、相关问题、部署就绪 |

**关卡定义：**
- **PLAN_GATE：** 计划已文档化、假设已列出、替代方案已考虑、过度工程审查已完成、工作范围已获授权。
- **IMPL_GATE：** 适用的不生成产物的检查和测试通过、仅修改了计划中的文件、已为实际实验记录基线证据。只有明确要求时才运行构建检查。
- **VERIFY_GATE：** 实现匹配需求、零 CRITICAL、零 HIGH、无回归、适用的项目测量目标已达成。
- **REFINE_GATE：** 遵循项目的可维护性规则、集成机会已捕获、副作用已验证、代码已清理、无未解决的回归。
- **SHIP_GATE：** 质量检查通过、UX 已验证、相关问题已解决、部署清单完成、适用的项目测量目标已达成并有最新证据支撑。沿用已有授权；发布或部署需获得针对该操作的授权。

**关卡失败行为：**
- 第一次失败：返回相关步骤，修复，重试。
- 同一问题第二次失败：重新评估原因；如果剩余预算内值得测试其他方案，则对照所需行为和已定义的指标，比较相互隔离的实验。

**条件增强：** 已定义指标的对比、实验决策与证据、有预算限制的假设探索，以及有可复用原因支撑的经验教训。

**REFINE 跳过条件：** 50 行以下的简单任务。

**何时使用**：在决定结果是否达到发布条件前运行完整的审查流程。工作流会记录检查和发现，但不会替你做出生产就绪决定。

---

### /ralph

**说明：** 持久化的自引用执行循环。用独立验证器包装 ultrawork，在每次迭代后检查完成标准。所有标准通过时报告全部完成，只剩已通过和受阻的标准时报告部分完成，安全措施触发时则停止。

**持久化：** 是。状态文件：`.agents/state/ralph-state.json`。

**触发关键词：**
| 语言 | 关键词 |
|------|-------|
| 显式（持久） | "ralph", "랄프" |
| 英语 | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| 韩语 | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| 日语 | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| 中文 | "不要停", "直到完成", "全部完成", "做完为止" |
| 西班牙语 | "no pares", "hasta completar", "termina todo" |
| 法语 | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| 德语 | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

单独的续接用语（“keep going”、“carry on”、“계속해”、“続けて”、“продолжай”等）不是触发词：用户输入它们是为了在中断后继续。

**阶段：**
1. **Phase 0：INIT** 加载前置条件（context-loading、内存协议、judge 协议）。定义并记录可用程序验证的完成标准，例如测试断言、不生成产物的类型检查、退出码或文件是否存在。只有明确要求时才纳入构建检查。展示标准，并在授权范围内继续执行。以 `max_iterations: 5` 初始化会话。
2. **Phase 1：WORK** 将 ultrawork（PLAN → IMPL → VERIFY → REFINE → SHIP）作为一次迭代执行。
3. **Phase 2：JUDGE** 独立验证器将每个完成标准与项目实际状态核对（运行已授权的检查，并验证文件是否存在）。记录证据和标准状态，包括 PASS、FAIL、REGRESSED 或 BLOCKED。
4. **Phase 3：DECIDE** 若所有标准 PASS → 报告全部完成。若只剩 PASS 和 BLOCKED → 报告部分完成。若存在 FAIL 或 REGRESSED → 在安全措施允许的范围内，将失败上下文带入下一次迭代。
5. **安全措施：** 当 `current_iteration >= max_iterations`（默认 5）达到时，或同一标准因相同根本原因连续失败 3 次时（卡住检测），循环停止。

**与 /ultrawork 的主要区别：** Ultrawork 执行 5 阶段流程，阶段关卡失败时会重试。Ralph 将 ultrawork 包装在重试循环中，由独立 judge 客观验证完成情况。循环结束时会报告全部完成、因工作受阻而部分完成，或触发了安全措施。

**读取文件：** `.agents/workflows/ralph/resources/judge-protocol.md`，以及所有 ultrawork 文件。
**写入文件：** `session-ralph.md`（内存）、迭代日志、最终报告。

**何时使用：** 明确需要反复执行，并独立验证可用程序检查的完成标准时。仅有测试要求并不需要 Ralph；选择时应考虑每次迭代都包含完整的 ultrawork 流程，以及循环本身的安全措施。

---

## 非持久化工作流

### /plan

**说明**：PM 驱动的任务分解。分析需求，选择技术栈，分解为带依赖关系的优先级任务，并定义 API 契约。

**触发关键词：**
| 语言 | 关键词 |
|----------|----------|
| 通用 | "task breakdown" |
| 英语 | "plan" |
| 韩语 | "계획"、"요구사항 분석"、"스펙 분석" |
| 日语 | "計画"、"要件分析"、"タスク分解" |
| 中文 | "计划"、"需求分析"、"任务分解" |

**步骤**：收集需求 -> 使用 MCP 代码分析评估技术可行性 -> 评估复杂度（Simple、Medium、Complex）-> 在跨边界时定义 API 契约 -> 分解任务 -> 与用户审查 -> 保存计划工件（Medium/Complex 时同时保存机器可读 JSON 和人类可读的 Markdown 跟踪文件）。

**输出：**`.agents/results/plan-{sessionId}.json`、内存写入，以及 Medium/Complex 任务的 `docs/plans/work/{NNN}-{name}.md`，其中包含任务表、决策日志和进度备注。Markdown 标题中的 `Status` 字段记录生命周期（`Active` -> `Completed`），计划不会在目录间移动。通过 `/brainstorm` 创建的设计保存到 `docs/plans/designs/{NNN}-{name}.md`。

**执行方式**：内联执行（不启动子智能体）。由 `/orchestrate` 或 `/work` 消费，后者会在执行期间更新任务和状态字段。

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

**步骤：** 准备 -> 分析代码库（项目类型、架构、隐含规则、领域、边界）-> 生成 ARCHITECTURE.md（领域地图，不超过 200 行）-> 生成 `docs/` 知识库（design-docs/、plans/、generated/、product-specs/、references/、领域文档）-> 生成根 AGENTS.md（约 100 行，目录）-> 生成边界 AGENTS.md 文件（monorepo 包，每个不超过 50 行）-> 更新现有框架（如果重新运行）-> 验证（无死链接，行数限制）。

**输出：** AGENTS.md、ARCHITECTURE.md、docs/design-docs/、docs/plans/、docs/PLANS.md、docs/QUALITY-SCORE.md、docs/CODE-REVIEW.md 以及发现的领域特定文档。

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

**规则**：绝不使用 `git add -A`。绝不提交密钥。多行消息使用 HEREDOC。只有生效的 `scm.co_author` 配置启用并同时提供两个值时，才添加共同作者尾注。

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

### /convert

**说明：** 按媒体类别路由，将文件从一种格式转换为另一种格式。**文档**（PDF 通过 `opendataloader-pdf`/`oma-pdf`；HWP/HWPX/HWPML 通过 `kordoc`/`oma-hwp`）提取为 Markdown。**图像**、**视频**和**音频**文件通过 `ffmpeg` 转码为目标格式（`oma-video` 已预先配置）。

**触发关键词：** 无（须使用输入文件路径显式调用）。

**步骤：** 验证输入并按类别路由（文档 `.pdf`/`.hwp*`；图像 `.jpg`/`.png`/`.webp`/…；视频 `.mp4`/`.mov`/…；音频 `.mp3`/`.wav`/…）-> 确定目标格式（文档默认 = Markdown；媒体 = 显式 `--to`）-> 转换（PDF：`uvx opendataloader-pdf`，扫描 PDF 使用混合 OCR；HWP：`bunx kordoc@latest`；媒体：`ffmpeg`）-> 规范化文档（PDF：`uvx mdformat`；HWP：`flatten-tables.ts`）-> 验证（读取 Markdown / `ffprobe` 检查媒体）-> 报告源→目标格式以及任何质量/编解码器选择。

**规则：** 按类别路由：切勿对媒体文件运行文档转换器，反之亦然。默认输出位置是与输入文件相同的目录。报告媒体的质量/编解码器选择（转码并非无损）。永远不要跳过步骤。响应语言遵循 `.agents/oma-config.yaml`。

**何时使用：** 将 PDF 或韩文 HWP 系列文档转换为 Markdown 以用于 LLM/RAG 摄取，或在不同格式间转码图像（jpg→webp/png）、视频（mov→mp4、mp4→gif）和音频（wav→mp3）。

---

### /docs

**说明**：通过 `oma-docs` 检测文档漂移并同步。验证模式会检查仓库中全部 Markdown（默认 glob 为 `**/*.md`）的损坏引用；同步模式会为受 Git diff 影响的文档提出逐文档补丁。内联执行（不启动子智能体）；所有供应商都直接调用 `oma docs`。

**触发关键词**：通用：“oma-docs”、“docs verify”、“docs sync”。英语：“verify docs”、“check docs”、“docs drift”、“broken doc links”、“stale docs”、“sync docs”、“patch docs”。韩语：“문서 검증”、“문서 드리프트”、“문서 동기화”。日语：“ドキュメント検証”、“ドキュメント同期”。中文：“文档校验”、“文档同步”。

**步骤**：检测模式（默认 `verify`；提示包含 sync 或 Git diff 范围时使用 `sync`）-> 预检（`command -v oma`；同步时确认可用 diff，回退到 `HEAD~1..HEAD`）-> 验证：运行 `oma docs verify --json`（干净时退出 `0`，有损坏引用时退出 `1`），或同步：针对范围运行 `oma docs sync --json` -> 按宿主 LLM 契约综合结果（验证：按 CRITICAL/HIGH/MEDIUM/LOW 分组并给出具体修复；同步：起草最小统一 diff 补丁）-> 逐个交互呈现同步补丁（`[y] apply [n] skip [d] show diff [s] show full proposal`，绝不自动应用）-> 应用后用 `oma docs verify --json` 重新生成索引 -> 报告模式、按类型统计的数量，以及 `docs/generated/doc-refs.json` / `url-drift.json` 的位置。

**规则**：绝不自动应用同步补丁（每篇文档都需要 `[y]` 确认）。绝不修改 `.agents/`（SSOT）。如果缺少 `oma docs`，打印安装提示后退出，不回退到手工 grep。

**读取文件**：目标 Markdown（`**/*.md` 或请求的 glob），以及同步模式中 `changedFiles` 对应的 `git diff`。
**写入文件：**`docs/generated/doc-refs.json`（验证时始终重新生成）、`docs/generated/url-drift.json`（运行 URL 检查时），以及获准的文档补丁（同步选择 `[y]` 时）。

**何时使用**：检查文档是否仍与代码库一致（损坏的文件路径、CLI 命令、配置键、环境变量），或在代码变更后提出补丁。

### /recap

**说明**：通过 `oma-recap` 生成每日或周期工作回顾。解析自然语言中的日期或时间窗口，通过 `oma recap --json` 汇总多个 AI 工具的历史（Grok、Claude、Codex、Qwen、Cursor、Antigravity），将主题分析和 Markdown 格式化交给技能，并报告 TL;DR 和保存路径。内联执行（不启动子智能体）。

**触发关键词**：通用：“recap”。韩语：“리캡”。日语：“リキャップ”。

**步骤**：检测模式并解析窗口（默认 `daily`，使用今天；短语如“this week”或“지난 7일”解析为 `--window Nd` 的 `period`）-> 只有用户明确指定工具时才提取 `--tool` 过滤器（`grok, claude, codex, qwen, cursor, antigravity`）-> 预检（`command -v oma`）-> 运行 `oma recap --json`（daily：`--date YYYY-MM-DD` 或省略；period：`--window 7d` / `30d`）-> 按技能契约综合（15 分钟主题阈值，使用 daily 或多日模板）-> 报告 3 条 TL;DR 和保存路径。

**规则**：绝不修改 `.agents/`（SSOT）。保存的回顾中绝不自动翻译技术术语（项目名、工具名、CLI 标志）。没有来源时不要编造回顾。

**读取文件**：AI 工具对话历史（通过 `oma recap`）。
**写入文件：**`.agents/results/recap/{date}.md` 或 `.agents/results/recap/{start}~{end}.md`。

**何时使用**：总结某一天或某个周期内跨 AI 工具完成的工作，可选按工具过滤。

### /stack-set

**说明**：自动检测项目技术栈，为已解析的领域技能（backend 或 mobile）生成语言专用参考资料。它会检测移动端技术栈（通过 `Package.swift` / `.xcodeproj` 检测 Swift/iOS，通过 `pubspec.yaml` 检测 Flutter，通过 `package.json` + react-native 检测 React Native），并路由到 `oma-mobile`；否则路由到 `oma-backend`。如果单体仓库同时存在两者，则询问要配置哪一个。

**触发关键词**：无（排除在自动检测之外）。

<!-- oma-docs:ignore-start -->
**步骤**：检测（扫描清单：pyproject.toml、package.json、Cargo.toml、pom.xml、go.mod、mix.exs、Gemfile、*.csproj、Package.swift、*.xcodeproj、pubspec.yaml）-> 确认（显示检测到的技术栈并获取用户确认）-> 生成（`stack/stack.yaml`、`stack/tech-stack.md`、包含 8 个必需模式的 `stack/snippets.md`、`stack/api-template.*`）-> 验证。
<!-- oma-docs:ignore-end -->

**输出**：写入已解析领域技能的 `stack/` 目录，例如 `.agents/skills/oma-backend/stack/` 或 `.agents/skills/oma-mobile/stack/`。不会修改 SKILL.md 或 `resources/`。


### /video

**说明**：端到端驱动 `oma-video` 技能：简介 -> 脚本 -> 旁白 -> 视觉素材 -> 字幕 -> render-spec -> 受管的 HyperFrames（或 MoneyPrinterTurbo）合成器。工作流会创建可复现的运行目录，只有合成器和 ffprobe 检查通过后才输出真实的 `.mp4`。受支持素材回退的供应商配置可以不提供密钥；合成器或工具链失败仍会使运行失败。内联执行（不启动子智能体）。

**触发关键词：**
| 语言 | 关键词 |
|----------|----------|
| 通用 | "/video"、"oma-video"、"hyperframes"、"shorts"、"reels"、"screencast" |
| 英语 | "generate video"、"create a video"、"make a video"、"short-form video"、"explainer video"、"demo video"、"walkthrough video"、"video from readme"、"video from code" |
| 韩语 | "영상 만들어"、"영상 생성"、"비디오 만들어"、"숏폼 만들어"、"쇼츠 영상"、"릴스 영상"、"데모 영상"、"설명 영상" |
| 日语 | "動画を生成"、"動画を作成"、"ショート動画"、"解説動画"、"デモ動画" |
| 中文 | "生成视频"、"制作视频"、"短视频"、"讲解视频"、"演示视频" |

**步骤：**
1. **解析简介和模式**：选择 `shorts`（9:16）、`explainer`（16:9）或 `demo`（屏幕或 Web 捕获），应用模式默认值，可用标志覆盖。
2. **组合脚本**：生成场景和旁白（有密钥时使用 LLM，否则从简介生成确定性大纲）。
3. **合成素材**：使用 `oma-voice` 生成旁白，使用 `oma-image` / `oma-slide` / 素材库生成视觉内容，使用免密钥字幕对齐，或在 `demo --source web` 中使用受监督的浏览器 Web 捕获。每个供应商都会降级为确定性回退。
4. **构建 render-spec**：在运行目录中写入 `render-spec.json`（确定性边界）和素材。
5. **渲染**：以子进程启动受管的 HyperFrames 项目（或 MoneyPrinterTurbo）。普通合成器或工具链失败会使运行失败；确定性占位符仅可通过显式 mock/test 路径（`OMA_VIDEO_MOCK=1`）使用。实时捕获会在清单中记录为 `nondeterministic`。

**输出：**`.agents/results/videos/{timestamp}-{shortid}-{mode}/` 下的运行目录，包含 `script.json`、`render-spec.json`、`timing.json`、`captions.{srt,vtt}`、`audio/`、`visuals/`、`{composition}.mp4` 和 `manifest.json`。参见[视频生成指南](../guide/video-generation.md)。

### /schedule

**说明**：通过 `oma schedule <action>` 命令注册和管理基于时间的智能体作业。作业保存在全局注册表（`~/.agents/schedule/`），通过操作系统原生调度器触发（macOS 为 launchd，Linux 为 systemd 用户计时器，Windows 为 schtasks，POSIX 回退为 crontab），每次运行都会通过 `oma agent spawn` 重新进入 harness。

**触发关键词**：无（针对 `oma schedule <action>` 时间作业的斜杠调用工作流）。

**步骤**：解析意图（add / list / remove / sync）-> 解析计划（显式 `--cron`，或通过 `--every` 使用自然语言）-> 使用 `oma schedule create` 注册（仅捕获命名环境变量，文件权限 0600）-> 使用 `oma schedule list` 验证（清单 × 操作系统漂移，按项目分组）-> 报告作业 ID 和下次触发时间。

**何时使用**：必须在没有交互式会话时也能触发的重复性智能体任务，例如夜间回顾、计划扫描和周期性维护。

### /explain

**说明**：端到端驱动 `oma-explanation` 技能，把 diff、PR、分支或提交范围转换为自包含的交互式 HTML 讲解（Background / Intuition / Code / Quiz）。内联执行（不启动子智能体）。

**触发关键词**：无（“explain”是日常词语，关键词检测会在普通“解释这个函数”问题中产生误报，因此只能通过斜杠命令调用）。

**步骤**：解析参数（目标引用：显式 PR# / 分支 / SHA 范围 → 暂存区 → dirty tree → `HEAD~1..HEAD`；读者级别 `onboarding` | `reviewer`；输出语言；题目数）-> 加载契约（`oma-explanation` SKILL.md 和资源）-> 收集并设门禁（diff + 周边代码；生成前机密扫描；将 diff/PR 文本严格作为数据）-> 按文档和 HTML 契约生成 HTML -> 验证（包含最终 HTML 机密扫描的 grep 清单，最多 3 个修复循环）-> 交付（`open` 仅警告，不阻断；TL;DR + 路径）。

**输出：**`.agents/results/explain/{YYYY-MM-DD}-{slug}.html`（Asia/Seoul 日期；同一日期和 slug 再运行会覆盖）。参见[代码讲解指南](../guide/code-explainer.md)。

## 技能与工作流的区别

| 方面 | 技能 | 工作流 |
|--------|--------|-----------|
| **定义** | 智能体的专业知识（智能体知道什么） | 编排流程（智能体如何协作） |
| **位置** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **激活方式** | 通过技能路由关键词自动激活 | 斜杠命令或触发关键词 |
| **范围** | 单领域执行 | 多步骤，通常涉及多个智能体 |
| **示例** | “构建 React 组件” | “规划功能 -> 构建 -> 审查 -> 提交” |

---

## 自动检测：工作原理

### 钩子系统

oh-my-agent 使用 `UserPromptSubmit` 钩子，在处理每条用户消息前运行。供应商设置会注册一个 `<hookDir>/oma-hook.sh --vendor <v> --event <e>` 入口，将请求路由到 `oma hook run`，由处理器链在进程内运行。处理器链包括：

1. **`triggers.json`**（`.agents/hooks/core/triggers.json`，内联在 `oma` 二进制中）：定义全部 11 种支持语言（英语、韩语、日语、中文、西班牙语、法语、德语、葡萄牙语、俄语、荷兰语、波兰语）的关键词到工作流映射。
2. **`keyword-detector.ts`**（`.agents/hooks/core/keyword-detector.ts`）：对照所有语言的触发关键词扫描用户输入，并注入工作流激活上下文的 TypeScript 逻辑。
3. **`persistent-mode.ts`**（`.agents/hooks/core/persistent-mode.ts`）：检查活跃状态文件并重新注入工作流上下文，以强制执行持久化工作流。

### 检测流程

1. 用户输入自然语言。
2. 钩子检查是否存在显式 `/command`。如果存在，则跳过检测以避免重复。
3. 钩子会清理输入（去除代码块、引号字符串和粘贴的系统回显块），然后对照 `.agents/hooks/core/triggers.json` 扫描关键词列表（字面短语）和 `patterns`（原始正则）。如果同一工作流在最近 60 秒内已触发 2 次或更多次，强化保护机制会抑制再次触发。
4. 如果找到匹配项，检查输入是否匹配信息性模式。
5. 如果属于信息性问题（例如“什么是 orchestrate？”），将其过滤，不触发工作流。
6. 如果属于可执行请求，将 `[OMA WORKFLOW: {workflow-name}]` 注入上下文。多个工作流同时匹配时，显式调用优先，其次是最长的关键词。
7. 对于持久化工作流，只有显式调用（`triggers.json` 中的 `explicit`）才会写入持久模式状态文件；自然语言匹配只会作为建议注入，以问句结尾的提示（第一行或最后一行有 `?`）则完全不会触发它。
8. 智能体读取注入的标签，并从 `.agents/workflows/` 加载对应的工作流文件。

### 语言分节约定

`.agents/hooks/core/triggers.json` 对 `keywords`、`patterns` 和 `informationalPatterns` 使用按语言分节的结构：

| 分节 | 行为 |
|----------|----------|
| `*` | 通用。用于英语内容（通用语）以及真正跨语言的标记，例如工作流名 `"orchestrate"`。 |
| `en` | 英语。功能上等同于 `*`。 |
| `ko`、`ja`、`zh`、`es`、`fr`、`de`、`pt`、`ru`、`nl`、`pl` | 特定语言的措辞。 |

所有区段始终加载：用户会用自己习惯的语言输入提示，而 `.agents/oma-config.yaml` 中的 `language` 设置只控制响应语言。用某种语言写成的关键词，只能匹配含有该种文字的提示，因此合并所有区段不会在无关的提示上触发。

单词边界只取决于关键词本身，与 `language` 无关：ASCII 关键词只匹配完整单词（所以“work”不会匹配“network”，“review”不会匹配“preview”），而含有非 ASCII 文本的关键词按子串匹配，因为 CJK 的助词和词形变化会直接附着在词上（“리뷰해줘”）。

### 模式字段（原始正则） {#pattern-field-raw-regex}

除字面量 `keywords` 外，每个工作流还可以声明 `patterns`，这些原始正则字符串会使用 `iu` 标志编译。模式支持多标记意图匹配，否则需要组合数量巨大的关键词列表。

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

编写规则：

- 字符串会直接编译。反斜杠要分别为 JSON 和正则转义一次（`\\b`、`\\s+`）。
- 不会自动包裹单词边界，模式作者要自行处理 `\b`。
- 无效正则会在运行时静默跳过，但可在配置编辑时通过测试失败发现。

### 信息性模式过滤

`.agents/hooks/core/triggers.json` 的 `informationalPatterns` 部分定义表示提问而非命令的短语。系统会在每个潜在工作流匹配项周围 60 个字符的窗口内检查这些短语：

| 分节 | 模式示例 |
|---------|----------|
| `*`（通用英语） | “what is”、“what are”、“how to”、“how does”、“how do”、“should we”、“should i”、“could we”、“would you”、“what if”、“what about”、“why build”、“false positive”、“trigger when”、“auto-trigger” |
| `ko` | “뭐야”、“무엇”、“어떻게”、“설명해”、“알려줘”、“트리거”、“발동”、“메타”、“왜 만들”、“어떻게 만들”、“어떨까”、“한다면”、“할까요” |
| `ja` | “とは”、“って何”、“どうやって”、“説明して” |
| `zh` | “是什么”、“什么是”、“怎么”、“解释” |

如果输入同时匹配工作流触发器和信息性模式，信息性模式优先，不触发工作流。正是这一点阻止了以下提示：

- `"How do you build a TODO app?"`：`*` 中的 `how do` 会阻止 orchestrate 意图正则。
- `"orchestrate 트리거 해주면 되나요?"`：`ko` 中的 `트리거` 会阻止 orchestrate 关键词。

### 排除的工作流

以下工作流不会由关键词触发，必须使用显式 `/command` 调用。`/tools` 和 `/stack-set` 位于 `excludedWorkflows` 中，已特意从关键词检测中移除；`/convert` 不附带触发关键词（`oma-pdf` 和 `oma-hwp` 技能各自携带关键词检测）；`/schedule` 是斜杠调用工作流（用于 `oma schedule <action>` 时间作业）；`/explain` 不附带触发关键词，因为“explain”是日常词语，关键词检测会不断产生误报：

- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`


---

## 持久化模式机制 {#persistent-mode-mechanics}

### 状态文件

持久化工作流（orchestrate、ultrawork、work、ralph）在被显式调用时会在 `.agents/state/` 中创建状态文件（参见[持久化工作流](#persistent-workflows)）：

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

这些文件包含工作流名称、当前阶段或步骤、会话 ID、时间戳和任何待处理状态。

### 强化

持久化工作流活跃时，`persistent-mode.ts` 钩子会在每条用户消息中注入 `[OMA PERSISTENT MODE: {workflow-name}]`。即使跨越多次对话轮次，工作流也会继续执行。

### 目标契约（可选的停止关卡和预算）

`oma goal set` 会为活跃的持久化工作流附加机械完成契约：

- `--gate typecheck|test|lint`：Stop 钩子只有在对应 `package.json` 脚本通过后才允许会话结束（以 argv 数组运行，不使用 shell；设计上拒绝自由格式命令）。失败时会用输出末尾阻塞；失败和超时会计入强化限制，因此失败的关卡不会永久阻塞会话。
- `--budget-minutes <n>`：从激活时起计算墙钟预算。超时会停用工作流，允许诚实地部分停止，并记录在会话事件轨迹中。

没有契约时，持久化模式仍按上文运行，契约是可选项。参见 [CLI 命令参考](../cli-interfaces/commands.md#goal-set) 中的 `goal set`。

### 停用

要停用持久化工作流，用户说“workflow done”（或配置语言中的等价表达）。这会：

1. 从 `.agents/state/` 删除状态文件。
2. 停止注入持久化模式上下文。
3. 返回普通操作。

当所有步骤完成且最终关卡通过时，工作流也可以自然结束。配置了 `goal set` 关卡时，关卡通过会自动停用工作流。


---

## 典型工作流序列

### 单领域功能

```
Describe the task → relevant skill → implement → focused verification
```

### 复杂多领域项目

```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### 自动并行实现

```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### 最高质量交付

```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Bug 调查

```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### 设计到实现的流水线

```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### 新代码库设置

```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### 反复执行并独立验证

```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
