---
title: 智能体
description: OMA 的 33 个技能包、13 个规范调度角色和 12 个已签入子智能体定义的参考，涵盖领域、资源、章程预检、渐进式加载、范围规则、质量关卡、工作区策略、编排和运行时内存。
---

# 智能体

OMA 将技能包、调度角色和子智能体定义文件分开。技能负责路由并加载领域指导；规范角色是运行时调度使用的身份；已签入定义为子智能体提供供应商原生的人设。这些层有意重叠，因此应根据任务边界和验收标准判断一个技能是否足够。

agents 目录下的智能体定义是事实来源。OMA 会将它们投影为支持自定义子智能体的运行时所需的供应商原生文件：

- claude agents 文件
- codex agents 文件
- cursor agents、opencode agents，或受支持时的其他选定供应商投影

当工作流将智能体映射到与当前运行时相同的供应商时，应优先使用该运行时的原生智能体文件。跨供应商任务回退到 oma agent spawn。

按智能体调度模型：每个智能体都通过配置中的 model_preset 和可选的 agents 覆盖项解析为特定模型 slug、CLI 供应商和推理强度。配置详情请参见按智能体选择模型，使用 oma doctor profile 查看当前矩阵。

---

受保护标识符补充： `.agents/agents/`、`.agents/oma-config.yaml`、`.claude/agents/*.md`、`.codex/agents/*.toml`、`.cursor/agents/*`、`.opencode/agents/*`、`agents:`、`model_preset`、`oma agent spawn`、`oma doctor --profile`。

## 智能体分类

| 类别 | 智能体 | 职责 |
|------|-------|------|
| **构思** | oma-brainstorm | 探索想法，提出方案，产出设计文档 |
| **架构** | oma-architecture | 系统、模块和服务边界，ADR/ATAM/CBAM 风格分析，权衡记录 |
| **规划** | oma-pm | 需求分解、任务拆分、API 契约、优先级分配 |
| **实现** | oma-frontend、oma-backend、oma-mobile、oma-db | 在各自领域编写代码 |
| **设计** | oma-design | 设计系统、DESIGN.md、令牌、排版、色彩、动效、无障碍 |
| **基础设施** | oma-tf-infra | 多云 Terraform 配置、IAM、成本优化、策略即代码 |
| **DevOps** | oma-dev-workflow | mise 任务运行器、CI/CD、迁移、发布协调、单体仓库自动化 |
| **可观测性** | oma-observability | 可观测性管道、可追溯性路由、MELT+P 信号（metrics/logs/traces/profiles/cost/audit/privacy）、SLO 管理、事件取证、传输层调优 |
| **质量** | oma-qa | 安全审计（OWASP）、性能、无障碍（WCAG）、代码质量审查 |
| **调试** | oma-debug | Bug 复现、根因分析、最小修复、回归测试 |
| **本地化** | oma-translation | 保留语气、语域和领域术语的上下文感知翻译 |
| **协调** | oma-orchestration、oma-coordination | 自动化和手动多智能体编排 |
| **Git** | oma-scm | Conventional Commits 生成、按功能拆分提交 |
| **搜索与检索** | oma-search | 带信任度评分的意图驱动搜索路由（Context7 文档、网络、gh/glab 代码、本地代码智能） |
| **回顾** | oma-recap | 跨工具对话历史分析与主题化工作摘要 |
| **文档处理** | oma-hwp、oma-pdf | 将 HWP/HWPX/HWPML 和 PDF 转为 Markdown，供 LLM/RAG 摄取 |
| **文档** | oma-docs | 检测文档漂移，验证损坏引用，为受 diff 影响的文档提出同步补丁 |
| **讲解** | oma-explanation | 为 diff、分支、PR 或提交范围生成离线交互式 HTML 讲解 |
| **学术写作** | oma-academic-writing、oma-scholar | 面向发表的学术写作起草与审查，以及 Knows sidecar 学术研究、搜索和同行评审 |
| **安全** | oma-deepsec | 以成本意识驱动 Vercel 的 deepsec 智能体漏洞扫描器，涵盖扫描、PR 门禁、匹配器和分诊 |
| **重构** | oma-refactor | 以保持行为为目标的渐进式重组，定位热点并使用特征测试安全网，提交仅含重构 |
| **市场研究** | oma-market | 基于社区信号的痛点、趋势、竞品和发现研究，并使用意图自动选择的 SWOT、Porter 五力和 PESTEL 框架 |
| **技能编写** | oma-skill-creation | 以 SSL-lite 格式创建并验证 OMA 技能 |
| **媒体生成** | oma-image、oma-slide、oma-video、oma-voice | AI 图像生成、HTML 演示文稿、短视频或讲解视频，以及本地 TTS/STT |

受保护标识符补充： `gh`、`glab`。


## 详细智能体参考

### oma-brainstorm
**领域：**规划或实现之前的设计优先构思。

**何时使用：**探索新功能想法、理解用户意图、比较方案。在复杂或模糊的请求之前先于 /plan 使用。

**何时不使用：**需求明确时交给 oma-pm，实现阶段交给领域智能体，代码审查交给 oma-qa。

**核心规则：**
- 设计批准前不进行实现或规划
- 一次只问一个澄清问题，不批量提问
- 始终提出 2 到 3 种方案并给出推荐选项
- 逐节设计，每一步都需要用户确认
- YAGNI：只设计需要的部分

**工作流：**6 个阶段：上下文探索、提问、方案、设计、文档，保存到 docs/plans/，然后过渡到 /plan。

**资源：**仅使用共享资源：clarification-protocol、quality-principles、skill-routing。

受保护标识符补充： `/plan`、`docs/plans/`。

### oma-architecture

**领域：** 软件/系统架构，模块与服务边界、权衡分析、利益相关者综合、决策记录。

**何时使用：** 选择或审查系统架构，定义模块/服务/归属边界，带显式权衡比较架构方案，诊断架构痛点（变更放大、隐藏依赖、别扭的 API），确定架构投资或重构的优先级，编写架构建议或 ADR。

**何时不使用：** 视觉/设计系统（使用 oma-design），功能规划与任务分解（使用 oma-pm），Terraform 实现（使用 oma-tf-infra），Bug 诊断（使用 oma-debug），安全/性能/无障碍审查（使用 oma-qa）。

**方法论：** 诊断路由、design-twice 对比、ATAM 风格风险分析、CBAM 风格优先级排序、ADR 风格决策记录。

**核心规则：**
- 先诊断架构问题，再选择方法
- 对当前决策使用最轻量且足够的方法论
- 将架构设计与 UI/视觉设计以及 Terraform 交付区分开
- 仅当决策足够横切以证明成本合理时，才咨询利益相关者智能体
- 建议质量重于共识表演：广泛咨询，明确决策
- 每项建议必须说明前提、权衡、风险和验证步骤
- 默认具备成本意识：实现成本、运维成本、团队复杂度、未来变更成本

**资源：** `SKILL.md`，包含方法论指南的 `resources/` 目录（diagnostic-routing、design-twice、ATAM、CBAM、ADR 模板）。

---

### oma-pm

**领域：** 产品管理，需求分析、任务分解、API 契约。

**何时使用：** 分解复杂功能、判断可行性、确定工作优先级、定义 API 契约。

**核心规则：**
- API 优先设计：在实现任务之前定义契约
- 每个任务必须包含：智能体、标题、验收标准、优先级、依赖关系
- 最小化依赖以实现最大并行执行
- 安全和测试是每个任务的一部分（不是独立阶段）
- 任务必须可由单个智能体完成
- 输出 JSON 计划 + task-board.md 以兼容编排器

**输出：** `.agents/results/plan-{sessionId}.json`、`.agents/results/result-pm.md`、为编排器写入内存。

**资源：** `execution-protocol.md`、`examples.md`、`iso-planning.md`、`task-template.json`、`../_shared/core/api-contracts/`。

---

受保护标识符补充： `../_shared/core/api-contracts/template.md`、`.agents/results/api-contracts/`。

### oma-frontend
**领域：**基于 FSD-lite 架构使用 React、Next.js 和 TypeScript 构建 Web UI。

**何时使用：**构建用户界面、组件、客户端逻辑、样式、表单验证和 API 集成。

**技术栈：**
- React + Next.js，默认服务端组件，交互时使用客户端组件
- TypeScript，严格模式
- TailwindCSS v4 + shadcn/ui，只读原语，通过 cva 或包装器扩展
- FSD-lite：根目录 src 和功能目录 src/features/*，禁止跨功能导入

**库：**
| 用途 | 库 |
|------|-----|
| 日期 | luxon |
| 样式 | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks 或 @mantine/hooks |
| 工具 | es-toolkit |
| URL 状态 | nuqs |
| 服务端状态 | TanStack Query，存在 OpenAPI 规范时使用 orval 生成的 hooks |
| 客户端状态 | Jotai，尽量少用 |
| 表单 | @tanstack/react-form + Zod |
| 认证 | better-auth |

**核心规则：**
- shadcn/ui 优先，通过 cva 扩展，永远不要直接修改 components/ui/*
- 设计令牌 1:1 映射，永远不硬编码颜色
- 代理优先于中间件，Next.js 16+ 使用 proxy.ts 而不是 middleware.ts 处理代理逻辑
- 属性传递不超过 3 层，超过时使用 Jotai atoms
- 必须使用 @/ 绝对导入
- FCP 目标 < 1s
- 响应式断点：320px、768px、1024px、1440px

**资源：**execution-protocol.md、tech-stack.md、tailwind-rules.md、snippets.md、angular-rules.md、error-playbook.md 和 checklist.md。

**质量关卡检查清单：**
- 无障碍：ARIA 标签、语义化标题、键盘导航
- 移动端：在移动视口上验证
- 性能：无 CLS、快速加载
- 健壮性：错误边界和加载骨架屏
- 测试：逻辑由 Vitest 覆盖
- 质量：类型检查和 lint 通过

受保护标识符补充： `@/`、`angular-rules.md`、`checklist.md`、`components/ui/*`、`error-playbook.md`、`execution-protocol.md`、`middleware.ts`、`proxy.ts`、`snippets.md`、`src/`、`src/features/*/`、`tailwind-rules.md`、`tech-stack.md`。

### oma-backend
**领域：**API、服务端逻辑、认证、数据库操作。

**何时使用：**REST/GraphQL API、数据库迁移、认证、服务端业务逻辑和后台任务。

**架构：**Router（HTTP）-> Service（业务逻辑）-> Repository（数据访问）-> Models。

**栈检测：**读取项目清单文件（pyproject.toml、package.json、Cargo.toml、go.mod 等）确定语言和框架。如果缺少项目专用约定，要求用户运行 /stack-set；该命令会根据随附的 schema 和模板将解析后的 stack 参考资料生成到项目中。

**核心规则：**
- 整洁架构：路由处理器中不放业务逻辑
- 使用项目的验证库验证所有输入
- 仅使用参数化查询，SQL 中禁止字符串插值
- JWT + Argon2id 用于认证，bcrypt 仅可用于旧版兼容；限制认证端点速率
- 在支持的地方使用异步，所有签名加类型注解
- 通过集中错误模块处理自定义异常
- 显式 ORM 加载策略、事务边界和安全生命周期

**资源：**execution-protocol.md、orm-reference.md、checklist.md 和 error-playbook.md。variants/stack.schema.json 定义栈清单形状。

<!-- oma-docs:ignore-start -->
项目专用的 stack/stack.yaml、stack/tech-stack.md、代码片段和 API 模板由 /stack-set 按需生成；在栈被物化之前这些文件不存在。
<!-- oma-docs:ignore-end -->

受保护标识符补充： `/stack-set`、`checklist.md`、`error-playbook.md`、`execution-protocol.md`、`orm-reference.md`、`stack/`、`stack/stack.yaml`、`stack/tech-stack.md`、`variants/stack.schema.json`。

### oma-mobile
**领域：**跨平台和原生移动应用，包括 Flutter、React Native 和 Swift 原生 iOS。

**何时使用：**原生移动应用（iOS + Android）、移动端特定 UI 模式、相机、GPS、推送通知等平台功能、离线优先架构；也用于采用 SwiftUI 和 swift-openapi-generator 的 Swift 原生 iOS 应用。

**架构：**整洁架构：domain -> data -> presentation。Swift iOS 使用 App/Core/Features/Shared 项目布局。

**技术栈：**
- Flutter/Dart：Riverpod/Bloc 管理状态，Dio 带拦截器处理 API，GoRouter 负责导航，Android 使用 Material Design 3，iOS 遵循 iOS HIG。
- Swift 原生 iOS（iOS 17+）：SwiftUI + @Observable（Observation 框架），Apple swift-openapi-generator API 客户端，App/Core/Features/Shared 布局。

**核心规则：**
- 使用 Riverpod/Bloc 管理状态，复杂逻辑不使用原始 setState
- 所有控制器在 dispose() 方法中释放
- 使用带拦截器的 Dio 调用 API，优雅处理离线状态
- 目标 60fps，在两个平台上测试
- Swift：iOS 17+ 使用 @Observable 而不是 ObservableObject；根据 OpenAPI 规范通过 swift-openapi-generator 生成 API 客户端

**资源：**execution-protocol.md、tech-stack.md、screen-template.dart、screen-template.swift、screen-template.tsx、checklist.md 和 error-playbook.md。variants/ 目录包含栈 schema 以及 /stack-set 物化后的平台参考资料。

受保护标识符补充： `/stack-set`、`@Observable`、`App/Core/Features/Shared`、`checklist.md`、`dispose()`、`error-playbook.md`、`execution-protocol.md`、`ObservableObject`、`screen-template.dart`、`screen-template.swift`、`screen-template.tsx`、`swift-openapi-generator`、`tech-stack.md`、`variants/`。

### oma-db

**领域：** 数据库架构，SQL、NoSQL、向量数据库。

**何时使用：** 模式设计、ERD、规范化、索引、事务、容量规划、备份策略、迁移设计、向量数据库/RAG 架构、反模式审查、合规感知设计（ISO 27001/27002/22301）。

**默认工作流：** 探索（识别实体、访问模式、数据量）-> 设计（模式、约束、事务）-> 优化（索引、分区、归档、反模式）。

**核心规则：**
- 先选择模型，再选择引擎
- 关系型默认 3NF；分布式系统需文档化 BASE 权衡
- 记录所有三个模式层：外部、概念、内部
- 完整性是核心：实体、域、引用、业务规则
- 并发永远不是隐式的：定义事务边界和隔离级别
- 向量数据库是检索基础设施，不是数据源头
- 不要将向量搜索当作词法搜索的替代品

**必需交付物：** 外部模式摘要、概念模式、内部模式、数据标准表、术语表、容量估算、备份/恢复策略。向量/RAG：嵌入版本策略、分块策略、混合检索策略。

**资源：** `execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-design

**领域：** 设计系统、UI/UX、DESIGN.md 管理。

**何时使用：** 创建设计系统、着陆页、设计令牌、调色板、排版、响应式布局、无障碍审查。

**工作流：** 7 个阶段：设置（上下文收集）-> 提取（可选，从参考 URL）-> 增强（模糊提示增强）-> 提案（2-3 个设计方向）-> 生成（DESIGN.md + 令牌）-> 审计（响应式、WCAG、Nielsen、AI 泛滥检查）-> 交接。

**反模式强制执行（"杜绝 AI 泛滥"）：**
- 排版：默认系统字体栈；无正当理由不使用默认 Google Fonts
- 色彩：禁止紫蓝渐变、渐变球体/斑块、纯白配纯黑
- 布局：禁止嵌套卡片、仅桌面布局、千篇一律的 3 指标统计布局
- 动效：禁止到处使用弹跳缓动、动画时长不超过 800ms、必须尊重 prefers-reduced-motion
- 组件：禁止到处使用毛玻璃效果，所有交互元素需要键盘/触摸替代

**核心规则：**
- 首先检查 `.design-context.md`；缺失则创建
- 默认系统字体栈（中日韩语言使用 CJK 就绪字体）
- 所有设计至少达到 WCAG AA 标准
- 响应式优先（移动端为默认）
- 提出 2-3 个方向，获得确认

**资源：** `execution-protocol.md`、`anti-patterns.md`、`checklist.md`、`design-md-spec.md`、`design-tokens.md`、`prompt-enhancement.md`、`stitch-integration.md`、`error-playbook.md`，以及 `reference/` 目录（typography、color-and-contrast、spatial-design、motion-design、responsive-design、component-patterns、accessibility、shader-and-3d）。

---

### oma-tf-infra

**领域：** 使用 Terraform 的基础设施即代码，多云。

**何时使用：** 在 AWS/GCP/Azure/Oracle Cloud 上部署、Terraform 配置、CI/CD 认证（OIDC）、CDN/负载均衡/存储/网络、状态管理、ISO 合规基础设施。

**云检测：** 读取 Terraform 提供者和资源前缀（`google_*` = GCP、`aws_*` = AWS、`azurerm_*` = Azure、`oci_*` = Oracle Cloud）。包含完整的多云资源映射表。

**核心规则：**
- 提供者无关：从项目上下文检测云
- 带版本控制和锁定的远程状态
- CI/CD 认证优先使用 OIDC
- 始终先 plan 再 apply
- 最小权限 IAM
- 为一切打标签（Environment、Project、Owner、CostCenter）
- 代码中不存放密钥
- 版本锁定所有提供者和模块
- 生产环境禁止自动批准

**资源：** `execution-protocol.md`、`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-dev-workflow

**领域：** 单体仓库任务自动化和 CI/CD。

**何时使用：** 运行开发服务器、跨应用执行 lint/format/typecheck、数据库迁移、API 生成、i18n 构建、生产构建、CI/CD 优化、提交前验证。

**核心规则：**
- 始终使用 `mise run` 任务而非直接使用包管理器命令
- 仅对变更的应用运行 lint/test
- 使用 commitlint 验证提交消息
- CI 应跳过未变更的应用
- 存在 mise 任务时不要使用直接的包管理器命令

**资源：** `validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。

---

### oma-observability

**领域：** 跨层、跨边界、跨信号的基于意图的可观测性与可追溯性路由器。

**何时使用：** 可观测性管道搭建（OTel SDK + Collector + 厂商后端）、跨服务与领域边界的可追溯性（W3C propagator、baggage、多租户、多云）、传输层调优（UDP/MTU 阈值、OTLP gRPC vs HTTP、Collector DaemonSet vs sidecar 拓扑、采样配方）、事件取证（六维定位：code / service / layer / host / region / infra）、厂商类别选型（OSS 全栈 vs 商用 SaaS vs 高基数专精 vs 剖析专精）、observability-as-code（Grafana Jsonnet 仪表板、PrometheusRule CRD、OpenSLO YAML、SLO burn-rate 告警）、元可观测性（管道自身健康度、时钟偏差、基数护栏、保留策略矩阵）、MELT+P 信号覆盖（metrics、logs、traces、profiles、cost、audit、privacy）、从已弃用工具迁移（Fluentd -> Fluent Bit 或 OTel Collector）。

**何时不使用：** LLM ops / gen_ai 可观测性（使用 Langfuse、Arize Phoenix、LangSmith、Braintrust）、数据管道 lineage（OpenLineage + Marquez、dbt test、Airflow lineage）、IoT / 数据中心物理层遥测（Nlyte、Sunbird、Device42）、混沌工程编排（Chaos Mesh、Litmus、Gremlin、ChaosToolkit）、GPU / TPU 基础设施（NVIDIA DCGM Exporter）、软件供应链（sigstore、in-toto、SLSA）、事件响应工作流 / 告警派单（PagerDuty、OpsGenie、Grafana OnCall）、已由该厂商自有 skill 覆盖的单厂商配置。

**核心规则：**
- 路由前先分类意图：setup | migrate | investigate | alert | trace | tune | route
- 类别优先，而非厂商注册表：通过 `resources/vendor-categories.md` 委派给厂商自有 skill；不重复厂商文档
- 传输层调优是护城河：UDP/MTU 阈值、OTLP 协议选择、Collector 拓扑与采样配方是其他 skill 未覆盖的深度
- 元可观测性不可妥协：在声明搭建完成前，验证管道自身健康度、时钟同步（< 100 ms 漂移）、基数与保留策略
- CNCF 优先偏好：Prometheus、Jaeger、Thanos、Fluent Bit、OpenTelemetry、Cortex、OpenCost、OpenFeature、Flagger、Falco
- Fluentd 已弃用（CNCF 2025-10）：新建和迁移工作推荐 Fluent Bit 或 OTel Collector
- W3C Trace Context 作为默认 propagator；按云做转换（AWS X-Ray `X-Amzn-Trace-Id`、GCP Cloud Trace、Datadog、Cloudflare、Linkerd）
- 隐私优先于功能：PII 脱敏、采样感知的 baggage 规则、SOC2/ISO 不可变审计 + GDPR/PIPA 删除应在采集时应用，而不仅是在存储层

**资源：** `SKILL.md`、`resources/execution-protocol.md`、`resources/intent-rules.md`、`resources/vendor-categories.md`、`resources/matrix.md`、`resources/checklist.md`、`resources/anti-patterns.md`、`resources/examples.md`、`resources/meta-observability.md`、`resources/observability-as-code.md`、`resources/incident-forensics.md`、`resources/standards.md`，以及 `resources/layers/` 下的深度资源（L3-network、L4-transport、L7-application、mesh）、`resources/signals/`（metrics、logs、traces、profiles、cost、audit、privacy）、`resources/transport/`（collector-topology、otlp-grpc-vs-http、sampling-recipes、udp-statsd-mtu）和 `resources/boundaries/`（cross-application、multi-tenant、release、slo）。

---

### oma-qa

**领域：** 质量保证，安全、性能、无障碍、代码质量。

**何时使用：** 部署前的最终审查、安全审计、性能分析、无障碍合规、测试覆盖率分析。

**审查优先级顺序：** 安全 > 性能 > 无障碍 > 代码质量。

**严重级别：**
- **CRITICAL**：安全漏洞、数据丢失风险
- **HIGH**：阻碍发布
- **MEDIUM**：本迭代修复
- **LOW**：待办

**核心规则：**
- 每个发现必须包含文件:行号、描述和修复方案
- 先运行自动化工具（npm audit、bandit、lighthouse）
- 不允许误报：每个发现必须可复现
- 提供修复代码，而非仅描述

**资源：** `execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`、`examples.md`。

---

### oma-debug
**领域：**Bug 诊断与修复。

**何时使用：**用户报告的 Bug、崩溃、性能问题、间歇性故障、竞态条件和回归 Bug。

**方法论：**先复现，再诊断。永远不要猜测修复方案。

**核心规则：**
- 找到根因，而非仅处理症状
- 最小修复：只改必要的部分
- 每个修复都要有回归测试
- 搜索代码库中的相似模式
- 记录到 .agents/results/

**使用的代码智能工具（Gortex 或 Serena）：**
- find_symbol("functionName") 或 Gortex 符号导航：定位函数
- find_referencing_symbols("Component") 或 Gortex 影响分析：查找所有用法
- search_for_pattern("error pattern") 或 Gortex 搜索：查找相似问题

**资源：**execution-protocol.md、common-patterns.md、debugging-checklist.md、bug-report-template.md、error-playbook.md、examples.md。

受保护标识符补充： `.agents/results/`、`bug-report-template.md`、`common-patterns.md`、`debugging-checklist.md`、`error-playbook.md`、`examples.md`、`execution-protocol.md`、`find_referencing_symbols("Component")`、`find_symbol("functionName")`、`search_for_pattern("error pattern")`。

### oma-translation
**领域：**上下文感知的多语言翻译。

**何时使用：**翻译 UI 字符串、文档、营销文案，审查现有翻译，创建术语表。

**六幕流程：**Prepare、Acquire、Reason、Act、Verify 和 Finalize。翻译方法有四步：阅读含义和受保护语法，选择语域，在目标语言中重构，并在适当处保留作者风格。

**核心规则：**
- 先扫描现有区域设置文件以匹配惯例
- 翻译含义，而非逐字翻译
- 保留情感内涵
- 永远不要逐字翻译
- 同一篇文章中不混合语域
- 保留领域特定术语原文

**资源：**translation-rubric.md、anti-ai-patterns.md（均与语言无关），以及 resources/lang/ 下按目标语言划分的配置文件（ko、ja、zh、en；新增语言可复制 _template.md）。

受保护标识符补充： `_template.md`、`anti-ai-patterns.md`、`en`、`ja`、`ko`、`resources/lang/`、`translation-rubric.md`、`zh`。

### oma-orchestration

**领域：** 通过 CLI 启动的自动化多智能体协调。

**何时使用：** 需要多个智能体并行处理的复杂功能、自动化执行、全栈实现。

**配置默认值：**

| 设置 | 默认值 | 说明 |
|------|-------|------|
| MAX_PARALLEL | 3 | 最大并发子智能体数 |
| MAX_RETRIES | 2 | 每个失败任务的重试次数 |
| POLL_INTERVAL | 30s | 状态检查间隔 |

**工作流阶段：** 规划 -> 设置（会话 ID、内存初始化）-> 执行（按优先级层启动）-> 监控（轮询进度）-> 验证（自动化 + 交叉审查循环）-> 收集（汇编结果）。

**智能体间审查循环：**
1. 自审：智能体根据验收标准检查自己的差异
2. 自动验证：`oma verify {agent-type} --workspace {workspace}`
3. 交叉审查：QA 智能体审查变更
4. 失败时：问题反馈进行修复（最多 5 次总循环迭代）

**澄清债务监控：** 追踪会话期间的用户纠正。事件评分为 clarify（+10）、correct（+25）、redo（+40）。CD >= 50 触发强制根因分析。CD >= 80 暂停会话。

**资源：** `subagent-prompt-template.md`、`memory-schema.md`。

---

受保护标识符补充： `oma verify agent {agent-type} --workspace {workspace}`。

### oma-scm
**领域：**软件配置管理（SCM）和 Git，涵盖分支、合并、工作区、基线、审计就绪性和 Conventional Commits。

**何时使用：**代码变更完成后（/scm）、处理合并冲突、分支策略、发布或标签，以及任何仓库配置管理问题。

**提交类型：**feat、fix、refactor、docs、test、chore、style、perf。

**提交工作流：**分析变更 → 必要时按功能拆分 → 类型 → 范围 → 描述（祈使语气、不超过 72 个字符、小写、末尾不加句号）→ 使用明确路径提交。

**规则：**
- 永远不要使用 git add -A 或 git add .
- 永远不要提交密钥文件
- 暂存时始终明确指定文件
- 多行提交消息使用 HEREDOC
- 仅当有效的 scm.co_author 配置启用共同作者并提供姓名和邮箱时，才加入共同作者尾注。

受保护标识符补充： `/scm`、`git add -A`、`git add .`、`scm.co_author`。

### oma-coordination

**领域：** 手动逐步多智能体协调指南。

**何时使用：** 希望在每个关卡都有人类介入控制的复杂项目、手动智能体启动指导、逐步协调配方。

**何时不使用：** 完全自动化的并行执行（使用 oma-orchestration）、单一领域的任务（直接使用对应领域的智能体）。

**核心规则：**
- 在启动智能体之前，始终向用户呈现计划以获得确认
- 一次只处理一个优先级层：在进入下一层之前等待完成
- 用户批准每次关卡转换
- 合并前必须进行 QA 审查
- 针对 CRITICAL/HIGH 发现的问题修复循环

**工作流：** PM 规划 → 用户确认 → 按优先级层启动 → 监控 → QA 审查 → 修复问题 → 交付。

**与 oma-orchestration 的区别：** coordination 是手动且有引导的（用户控制节奏），orchestrator 是自动化的（智能体以最少的用户干预启动并运行）。

---

### oma-search

**领域：** 带域信任度评分的意图驱动搜索路由，将查询路由到 Context7（文档）、原生网络搜索、`gh`/`glab`（代码）、Serena（本地）。

**何时使用：** 查找官方库/框架文档，关于教程/示例/对比/解决方案的网络调研，针对实现模式的 GitHub/GitLab 代码搜索，搜索通道不明确的查询（自动路由），需要搜索基础设施的其他技能（共享调用）。

**何时不使用：** 仅限本地的代码库探索（直接使用 Serena MCP），Git 历史或 blame 分析（使用 oma-scm），完整架构调研（使用 oma-architecture，该技能可能在内部调用本技能）。

**核心规则：**
- 搜索前先分类意图：每个查询先经过 IntentClassifier
- 一次查询、一条最佳路由：除非意图模糊，否则避免冗余的多路由
- 为每个结果评信任分：所有非本地结果均从注册表获得域信任标签
- 标志优先于分类器：`--docs`、`--code`、`--web`、`--strict`、`--wide`、`--gitlab`
- 失败则前进：如主路由失败，优雅降级（docs→web，web→`oma search fetch` 策略）
- 无需额外 MCP：文档用 Context7，网络用运行时原生，代码用 CLI，本地用 Serena
- 厂商中立的网络搜索：使用当前运行时提供的任何方案（WebSearch、Google、Bing）
- 仅域级信任度：无子路径或页面级评分

**资源：** `SKILL.md`，包含意图分类器、路由定义和信任注册表的 `resources/` 目录。

---

### oma-recap
**领域：**分析多个 AI 工具（Claude、Codex、Qwen、Cursor）的对话历史，生成主题化的每日或周期工作摘要。

**何时使用：**汇总一天或一段时间的工作活动，理解多个 AI 工具之间的工作流，分析会话之间的工具切换模式，准备每日站会、每周回顾或工作日志。

**何时不使用：**基于 Git 提交的代码变更回顾（使用 oma retro）、实时智能体监控（使用 oma dashboard terminal）、生产力指标（使用 oma stats get）。

**流程：**
1. 从自然语言输入（今天、昨天、上周一、明确日期）解析日期或时间窗口
2. 通过 oma recap --date YYYY-MM-DD 或 --since / --until 获取对话数据
3. 按工具和会话分组
4. 提取主题（完成的功能、修复的 Bug、探索的工具）
5. 生成主题化的每日或周期摘要

**资源：**SKILL.md。繁重工作由 oma recap CLI 延迟处理。

受保护标识符补充： `--since`、`--until`、`oma dashboard terminal`、`oma recap`、`oma recap --date YYYY-MM-DD`、`oma retro`、`oma stats get`、`SKILL.md`。

### oma-hwp

**领域：** 使用 `kordoc` 的 HWP / HWPX / HWPML（韩文字处理器）→ Markdown 转换。

**何时使用：** 将韩文 HWP 文档（`.hwp`、`.hwpx`、`.hwpml`）转换为 Markdown，为 LLM 上下文或 RAG 准备韩国政府/企业文档，从 HWP 中提取结构化内容（表格、标题、列表、图像、脚注、超链接）。

**何时不使用：** PDF 文件（使用 oma-pdf），XLSX/DOCX（超出范围），生成/编辑 HWP（超出范围），已是文本的文件（直接使用 Read 工具）。

**核心规则：**
- 使用 `bunx kordoc@latest` 运行：无需安装；始终传递 `@latest` 或固定版本
- 默认输出格式为 Markdown
- 若未指定输出目录，则输出到与输入相同的目录
- kordoc 负责结构保留（标题、表格、嵌套表格、脚注、超链接、图像）
- 安全防护（ZIP 炸弹、XXE、SSRF、XSS）由 kordoc 提供：禁止添加自定义防护
- 对于加密或 DRM 锁定的 HWP，向用户清晰报告限制
- 使用 `resources/flatten-tables.ts` 后处理将 HTML `<table>` 块转换为 GFM 管道表格，并去除 Hancom 字体私用区域字符

**资源：** `SKILL.md`、`config/`、`resources/flatten-tables.ts`。

---

### oma-pdf

**领域：** 使用 `opendataloader-pdf` 的 PDF → Markdown 转换。

**何时使用：** 将 PDF 文档转换为 Markdown 以用于 LLM 上下文或 RAG，从 PDF 中提取结构化内容（表格、标题、列表），为 AI 消费准备 PDF 数据。

**何时不使用：** 生成/创建 PDF（使用合适的文档工具），编辑现有 PDF（超出范围），简单读取已是文本的文件（直接使用 Read 工具）。

**核心规则：**
- 使用 `uvx opendataloader-pdf` 运行：无需安装
- 默认输出格式为 Markdown
- 若未指定输出目录，则输出到与输入 PDF 相同的目录
- 保留文档结构（标题、表格、列表、图像）
- 对扫描 PDF，使用带 OCR 的混合模式
- 始终对输出运行 `uvx mdformat` 以规范化 Markdown 格式
- 验证输出 Markdown 是否可读且结构良好
- 向用户报告任何转换问题（缺失表格、乱码文本）

**资源：** `SKILL.md`、`config/`、`resources/`。

---

### oma-academic-writing

**领域：**面向出版质量的学术写作能力，负责起草、修订和审查学术论文、报告、分析章节、执行摘要、结论和文献综述。

**何时使用：**撰写或修订学术文本，需要精确的动词、校准后的限定语、句式变化，或需要针对评分标准和反 AI 风格要求审查文本。

**何时不使用：**一般文案或产品文档（使用相应领域技能），学术搜索和论文 sidecar（使用 oma-scholar），一般翻译（使用 oma-translation）。

**核心规则：**
- 先确认体裁、读者、评分标准和证据边界
- 使用精确动词和适度限定语，避免无根据的确定性
- 通过句式和段落结构变化保持自然的人类风格
- 审查主张、证据、引文和推理链
- 避免套话、空泛总结和可预测的段落节奏

**工作流：**读取要求和文本 → 识别论点、证据和语域 → 修订结构与句子 → 运行反 AI 风格审查 → 交付带有依据的最终稿。

**资源：**sentence-structure-reference.md、academic-verb-tiers.md、hedging-guide.md、anti-ai-checklist.md 和 prompt-tips.md。

---

受保护标识符补充： `academic-verb-tiers.md`、`anti-ai-checklist.md`、`context-loading`、`do`、`draft`、`get`、`have`、`hedging-guide.md`、`I believe`、`I think`、`make`、`quality-principles`、`review`、`revise`、`sentence-structure-reference.md`、`show`、`use`。

### oma-deepsec

**领域：**以成本意识驱动 Vercel 的 deepsec 智能体漏洞扫描器，涵盖扫描、PR 门禁、自定义匹配器、分诊、重新验证和导出。

**何时使用：**安装或引导 .deepsec/ 工作区，运行成本可控的 scan、process、triage、revalidate 和 export，使用 process --diff 为 PR 设置门禁，编写自定义匹配器，或分诊扫描结果。

**何时不使用：**一般安全审查（使用 oma-qa），应用代码修复（使用相应领域技能），没有可用凭据或扫描器未安装时的猜测性安全结论。

**核心规则：**
- 先初始化 .deepsec/ 工作区和 INFO.md
- 选择合适的模式和范围，优先使用 process --diff 进行 PR 门禁
- 成本受控：小范围扫描优先，避免重复处理
- 结果必须可复现，并记录扫描配置、匹配器和分诊决定
- 绝不把凭据写入结果、提示或版本库

**工作流：**初始化 → 读取 INFO.md → 选择扫描或处理范围 → 运行 scan、process、triage、revalidate、export → 复核匹配器和严重性 → 导出报告或 PR 门禁结果。

**资源：**scanning.md、matchers.md、triage.md、validation-checklist.md、error-playbook.md、INFO.md，以及 .deepsec/ 工作区。CLI 可通过 oma deepsec scan、oma deepsec process --diff、oma deepsec triage、oma deepsec revalidate 和 oma deepsec export 调用。

---

受保护标识符补充： `--limit 50 --concurrency 5`、`.deepsec/`、`claude`、`claude-opus-4-8`、`codex`、`config.md`、`data/<id>/`、`deepsec`、`gpt-5.5`、`INFO.md`、`init`、`matchers.md`、`pr-review.md`、`process`、`process --diff`、`pull-requests: write`、`revalidate`、`RunMeta`、`scanning.md`、`setup.md`、`status`、`triage.md`。

### oma-docs

**领域：**让 docs/**/*.md 与实时代码库保持一致，验证损坏引用并为受 diff 影响的文档提出同步补丁。

**何时使用：**代码变更可能使文档中的文件路径、CLI 命令、配置键、环境变量、脚本或链接失效时，或需要审查 i18n 文档漂移和 CJK 风格问题时。

**何时不使用：**直接修改代码（交给领域智能体），与代码变更无关的全面重写，以及密钥相邻文件的自动处理。

**核心规则：**
- 先运行 oma docs verify --json 获取基线
- 再运行 oma docs sync <range> --json 生成受影响候选
- 只修改 diff 实际使其失效的文档内容
- 排除 .env*、*.pem、*.key、id_rsa* 等密钥文件
- 重跑验证并记录修改前后的漂移计数

**工作流：**验证基线 → 读取同步候选及变更文件 → 逐篇比较文档和 diff → 起草最小补丁 → 应用 → 重跑 oma docs verify --json → 报告未解决的越界漂移。

**资源：**SKILL.md、docs-curator.md、config.md、intent-rules.md、measurement.md、validation-checklist.md、pr-review.md、doc-refs.json、cli/commands/docs/，以及 extract.ts、resolve.ts、reporter.ts 和 sync-propose.ts。

---

受保护标识符补充： `*.key`、`*.pem`、`.agents/`、`.env*`、`[y]`、`cli/commands/docs/`、`doc-refs.json`、`docs/**/*.md`、`extract.ts`、`id_rsa*`、`lychee`、`reporter.ts`、`resolve.ts`、`sync-propose.ts`。

### oma-explanation

**领域：**将代码变更、diff、PR、分支或提交范围转为丰富的离线 HTML 讲解。

**何时使用：**需要向读者解释代码变更的背景、直觉、实现细节和理解检查时，或需要可离线打开的单文件讲解时。

**何时不使用：**普通文档翻译、只需要简短代码评论，或需要修改产品代码。

**工作流：**读取 diff 和相关上下文 → 设计 Background、Intuition、Code、Quiz 四部分 → 生成单个离线 HTML → 检查图表、可访问性和离线资源 → 交付文件。

**资源：**generation-protocol.md、measurement.md、output-laws.md、quality-principles、context-loading、validation-checklist.md 和 error-playbook.md。

---

受保护标识符补充： `.agents/results/explain/`、`/explain`、`oma-slide`。

### oma-image

**领域：**使用多供应商后端生成图像和视觉素材，并生成可复现的运行目录。

**何时使用：**生成全新图像、编辑现有图像、选择供应商、比较变体，或需要带清单和提示词的可审计图像运行。

**何时不使用：**生成视频或演示文稿（使用 oma-video 或 oma-slide），只需要代码或矢量素材，以及没有授权执行付费供应商调用时。

**核心规则：**
- 先检查凭据和供应商可用性，支持 vendor all 并行比较
- 费用达到 $0.20 时需要 yes 或环境变量 OMA_IMAGE_YES=1 绕过确认
- 外部输出路径必须显式使用 allow-external-output，默认限制在 PWD
- 单次变体数 n 最多为 5，使用 reference path 指定参考图
- 每次运行写入 manifest.json，记录供应商、模型、提示词、种子、路径和成本

**工作流：**准备 → 检查供应商 → 生成或编辑 → 按需放大或比较 → 验证输出和清单 → 报告路径与限制。

**资源：**generation-protocol.md、vendor-matrix.md、style-presets.md、fallback-providers.md、checklist.md、error-playbook.md、config/image-config.yaml。CLI：oma image generate。

---

受保护标识符补充： `$PWD`、`--allow-external-output`、`--reference <path>`、`--vendor all`、`--yes`、`agy`、`antigravity`、`checklist.md`、`config/image-config.yaml`、`execution-protocol.md`、`gpt-image-2`、`manifest.json`、`n`、`oma image generate`、`OMA_IMAGE_YES=1`、`pollinations`、`prompt-tips.md`、`vendor-matrix.md`。

### oma-market

**领域：**通过社区信号进行痛点、趋势、竞品和发现研究，并使用意图自动选择的 SWOT、Porter 五力和 PESTEL 框架。

**何时使用：**需要跨 Reddit、X、YouTube、TikTok、HN、Polymarket、GitHub、arXiv、Techmeme、Bluesky 等来源提取近期信号、检测趋势、比较竞品或发现机会时。

**何时不使用：**只需一次网络搜索、没有社区信号的静态事实核查，或无法使用受支持研究引擎时。

**核心规则：**
- 先运行陷阱检测，再使用唯一的最新引擎；oma market resolve 会在运行前刷新托管副本
- 严格遵循解析出的上游 SKILL.md，仅把原始 last30days.py 调用替换为 oma market run args
- 不允许仅依赖 WebSearch：没有引擎、Python 3.12+ 不可用或退出码非零时停止并报告
- 只有上游设置向导获得用户同意后才启用带密钥来源；跳过的来源仍在页脚中显示
- 框架只引用引擎聚类；写入文件前必须满足首行徽章和上游 LAW
- 每次运行仅生成一份 market 结果简报；按意图自动切换框架

**工作流：**detect-trap → oma market resolve → 读取上游 SKILL.md → 上游研究前步骤（设置向导、处理句柄或 subreddit 解析、查询计划）→ oma market run emit compact → 按上游 OUTPUT CONTRACT 综合 → 添加框架 → 自检 → 写入。

**资源：**intent-rules.md、output-laws.md、execution-protocol.md、checklist.md、error-playbook.md，以及 frameworks/（swot、porters-5f、pestel）。CLI：oma market detect-trap、resolve、update、run。

---

受保护标识符补充： `--discover`、`--force`、`.agents/results/market/{topic-slug}-{YYYYMMDD}.md`、`checklist.md`、`error-playbook.md`、`execution-protocol.md`、`frameworks/`、`intent-rules.md`、`last30days`、`oma market detect-trap | resolve | update | run`、`oma market resolve`、`oma market run <args>`、`oma market run … --emit=compact`、`oma schedule <action>`、`output-laws.md`、`python3 scripts/last30days.py`、`SKILL.md`、`~/.cache/oma-market/last30days/<tag>/`。

### oma-refactor

**领域：**保持行为的重构：以安全的渐进式重组处理代码异味、SATD 和热点，并使用特征测试安全网，提交仅含重构。

**何时使用：**对特定文件或模块执行提取、移动、重命名、拆分或惯用法对齐；在功能开发前预先重构；通过接缝发现和特征测试救援遗留或棕地代码；按热点（变更频率 × 复杂度）选择重构目标；审查代码是否已具备安全重构条件。

**何时不使用：**修复报告的 Bug 或失败行为（使用 oma-debug，重构不得改变行为），安全、性能或无障碍审查（使用 oma-qa），系统设计或模块边界（使用 oma-architecture），数据库模式设计或迁移机制（使用 oma-db），提交拆分或暂存（使用 oma-scm），以性能优化为目标的工作。

**核心规则：**
- 保持行为：消费者契约不可破坏；调优只能是副作用，不能成为目标
- 可验证：没有安全网就不重组；缺失或薄弱时，先以独立提交编写特征测试
- 渐进式：每个提交只进行一个命名变换；反复失败时使用 Mikado 记录前置条件、完整回退并递归处理
- 分离两种职责：行为变更不得混入重构提交，仅使用 refactor: 类型
- 经济性：可读性是主要目标；不要重构计划删除或低变更率代码
- 约定偏离需要走 oma-architecture ADR 路由，而不是局部修改；所有指标都只是代理，需警惕 Goodhart

**工作流：**PREPARE（分类 greenfield 或 brownfield、规模关卡、热点排序）→ ACQUIRE（通过符号工具读取代码，收集指标和 Git 信号）→ REASON（规划原子变换顺序或 expand-contract）→ ACT（以引擎为先进行一个变换）→ VERIFY（不变地重跑测试后提交，或使用 Mikado 回退）→ FINALIZE（指标差异和可读性结论）。

**资源：**definition.md、measurement.md、governance.md，以及共享的 context-loading、quality-principles。

---

受保护标识符补充： `context-loading`、`definition.md`、`governance.md`、`measurement.md`、`quality-principles`、`refactor:`。

### oma-scholar

**领域：**使用 Knows .knows.yaml sidecar 规范进行学术研究，生成、验证、审查、查询和比较结构化论文 sidecar，并从 knows.academy 获取内容。

**何时使用：**用 sidecar 高效阅读论文（仅主张约 700 个令牌，完整 PDF 约 10K），从草稿、LaTeX 或笔记生成 .knows.yaml，分享前验证 sidecar 结构，生成 sidecar 形式的同行评审，查询或总结现有 sidecar，结构化比较两篇论文，或搜索、获取 knows.academy 内容。

**何时不使用：**一般网络搜索或非学术内容（使用 oma-search），翻译论文（使用 oma-translation），只做 PDF 解析而不需要 sidecar（使用 oma-pdf），使用编辑系统进行完整同行评审工作流。

**模式：**Generate、Validate、Review、Analyze、Compare、Remote（搜索或获取）。

**核心规则：**
- 目标规范是 v0.9.0 / paper@1 配置；由宿主 LLM 生成 sidecar，绝不调用外部 LLM SDK
- 防止编造：若源文未显示 DOI、期刊或年份，则完全省略该键；永远不要写 doi: TODO 或猜测
- 字段名必须准确，provenance.actor 只能是单个对象，枚举值封闭，数字不加引号
- 每条陈述的关系密度至少为 1.5；每个主张都需要 supported_by 证据
- 分享前验证（oma scholar lint）；第三方 sidecar 使用 lenient
- 对较旧或非 2026 年论文使用 knows.academy → OpenAlex 回退；公共代理 API 不需要认证

**工作流：**PREPARE（模式和来源）→ ACQUIRE（元数据、章节或本地文本）→ REASON（提取主张、证据和关系）→ ACT（生成、lint、审查、分析、比较或获取）→ VERIFY（schema、枚举、ID、关系）→ FINALIZE（带有注意事项的 sidecar、报告或摘要）。

**资源：**execution-protocol.md、sidecar-spec.md、api-endpoints.md、setup-openalex.md、upstream-spec-cache.md、fallback-providers.md、checklist.md 和 config/scholar-config.yaml。

---

受保护标识符补充： `--lenient`、`.knows.yaml`、`api-endpoints.md`、`checklist.md`、`config/scholar-config.yaml`、`doi: TODO`、`execution-protocol.md`、`fallback-providers.md`、`oma scholar lint`、`paper@1`、`provenance.actor`、`setup-openalex.md`、`sidecar-spec.md`、`supported_by`、`upstream-spec-cache.md`。

### oma-skill-creation

**领域：**以 SSL-lite Markdown 格式（Scheduling / Structural Flow / Logical Operations / References）编写并验证 OMA 技能。

**何时使用：**在 agents skills name SKILL.md 下创建技能，将现有技能更新为 SSL-lite 格式，为执行繁重的技能添加规范命令或工作流路径，审查技能是否具备足够的路由、执行、验证和恢复细节，决定示例应内嵌还是放在 resources/。

**何时不使用：**将第三方技能安装到 CODEX_HOME skills，创建 Codex 插件包，编写与技能无关的一般项目计划（使用 oma-pm），直接编辑产品、基础设施、前端、后端或移动代码（使用相应专业技能）。

**核心规则：**
- 四个顶层部分必须完全保留：Scheduling、Structural Flow、Logical Operations、References
- YAML frontmatter 必须包含明确的 name 和 description；修改描述后运行 oma skill audit（TF-IDF 余弦碰撞达到 60% 警告，75% 失败）
- 包含明确的 When NOT to use 边界，并交叉路由到相邻技能
- 为脆弱或可重复命令添加且只添加一条内嵌规范路径（Canonical command path）；研究或判断流程使用 Canonical workflow path
- 将长的变体专用细节放入 resources/，不要在技能主体中添加 README、变更日志或安装文档

**工作流：**PREPARE（目的、触发器、边界、输入输出、依赖）→ ACQUIRE（读取 1 至 3 个相似技能和约定）→ REASON（内联还是 resources/）→ ACT（从 SSL-lite 模板起草）→ VERIFY（结构、路由、执行和格式检查）→ FINALIZE（变更文件和验证报告）。

**资源：**ssl-lite-template.md、validation-checklist.md，以及共享的 context-loading、quality-principles。

---

受保护标识符补充： `$CODEX_HOME/skills`、`.agents/skills/{name}/SKILL.md`、`Canonical command path`、`Canonical workflow path`、`context-loading`、`description`、`name`、`oma skill audit`、`quality-principles`、`resources/`、`ssl-lite-template.md`、`validation-checklist.md`、`When NOT to use`。

### oma-slide

**领域：**在固定 1920×1080 舞台上生成带丰富动画的 HTML 演示文稿，并通过 oma slide CLI 确定性验证、打包和导出为 PDF/PNG/PPTX。

**何时使用：**根据主题或大纲创建新演示文稿，增强或重新排版现有演示文稿，生成带动画和设计规范审美的逐页 HTML，导出演示文稿，应用命名样式预设，或导出到 Canva 及从 Canva 导入。

**何时不使用：**没有幻灯片的普通文档创建，单独生成图像（直接使用 oma-image），定义品牌或设计系统（使用 oma-design），不需要生成而只做确定性 CLI 操作（直接调用 oma slide CLI）。

**核心规则：**
- 技能负责编写 HTML；CLI 负责其他工作（脚手架、验证、打包、导出）
- 仅使用本地素材：img src 和 video src 不得使用远程 URL，只能使用 ./assets/file
- 任意韩语、日语或中文幻灯片必须使用 Pretendard 字体
- 每张幻灯片都必须有 prefers-reduced-motion 包装器、可见焦点状态和 data-om-validate
- 验证最多自动修复 3 次，之后将 diff 提交给用户
- 图像生成交给 oma-image；Canva MCP 只有在用户明确同意后才可选配并自动提供

**工作流：**7 个阶段：DETECT（模式）→ DISCOVER（澄清并评估素材）→ STYLE（3 个实时预览，用户选择）→ GENERATE（以 1920×1080 生成 slide-NN.html）→ VALIDATE（oma slide validate，最多 3 次自动修复循环）→ REVIEW（查看器和可选 bbox 编辑器）→ DELIVER（打包并可选导出 PDF/PNG/PPTX）。

**资源：**generation-protocol.md、design-doctrine.md、fixed-stage.md、style-presets.md、selection-index.json、animation-patterns.md、canva-integration.md、checklist.md，以及 assets/ 目录。

---

受保护标识符补充： `./assets/<file>`、`<img src>`、`<video src>`、`animation-patterns.md`、`assets/`、`bundle`、`canva-integration.md`、`checklist.md`、`data-om-validate`、`design-doctrine.md`、`fixed-stage.md`、`generation-protocol.md`、`oma slide`、`oma slide validate`、`prefers-reduced-motion`、`selection-index.json`、`slide-NN.html`、`style-presets.md`。

### oma-video

**领域：**通过 oma video CLI 生成短视频、讲解视频和真人录制演示，组合脚本 → 旁白 → 视觉素材 → 字幕 → Remotion 渲染。

**何时使用：**从主题生成短视频（shorts/reels，9:16），从 README、代码或数据生成讲解视频（16:9/9:16），从屏幕录制（source file）或监督式有头浏览器录制任意 URL 的 Web 应用演示（source web），或对现有运行进行确定性重新渲染。

**何时不使用：**生成单张静态图像（使用 oma-image），生成演示文稿（使用 oma-slide），只生成语音音频（使用 oma-voice），对现有成品 mp4 做非线性编辑，或直播。

**核心规则：**
- 调用前先澄清或推断模式；不要从含糊简报中静默渲染，应向用户展示推断计划
- 对支持的素材回退，供应商配置可不使用密钥；Pexels、Pixelle 等付费供应商仅在存在环境密钥时自动启用，但合成器失败时绝不替换成回退视频
- 费用达到 0.20 美元时需要 yes 或 OMA_VIDEO_YES=1 绕过确认；时长限制 180 秒、场景限制 40 个
- 渲染输入记录在 render-spec.json、素材、种子和嵌入的 Pretendard 中；OMA_VIDEO_MOCK=1 是用于 golden fixture 的测试工具，不是用户交付物
- 演示录制需要人在回路中：Web 录制只打开有头浏览器并由人驱动，禁止凭据自动化；日志或清单中会遮蔽 url 和令牌
- 路径安全：输出到 PWD 之外必须使用 allow-external-output

**工作流：**PREPARE（模式、画面比例、语区，澄清或扩展简报）→ ACQUIRE（探测供应商可用性、验证录制路径、检查费用）→ ACT（脚本 → 语音 ∥ 视觉素材 ∥ 字幕 → render-spec → 渲染）→ VERIFY（schema、清单哈希、退出码、mp4）→ FINALIZE（运行目录、mp4 路径和覆盖率警告）。

**资源：**execution-protocol.md、vendor-matrix.md、prompt-tips.md、checklist.md，以及 vendored remotion/ 合成器、Web 录制驱动和 mpt/ 回退合成器；config/video-config.yaml。

---

受保护标识符补充： `$0.20`、`$PWD`、`--allow-external-output`、`--source file`、`--source web`、`--url`、`--yes`、`checklist.md`、`config/video-config.yaml`、`execution-protocol.md`、`mpt/`、`oma video`、`OMA_VIDEO_MOCK=1`、`OMA_VIDEO_YES=1`、`prompt-tips.md`、`remotion/`、`render-spec.json`、`vendor-matrix.md`。

### oma-voice

**领域：**通过 Voicebox MCP 服务器进行本地优先的文本转语音和语音转文本，完全在设备上运行，无云端、无 API 密钥、无单次调用费用。

**何时使用：**生成智能体任务完成或阻塞时的短通知音频，制作旁白或音频素材（mp3 或 wav），将本地音频文件（mp3、wav、m4a、webm、flac）转录为 Markdown，或对不同 profile id 重新运行相同文本以比较语音配置。

**何时不使用：**云端 TTS 或高保真多语言云端语音，实时终端麦克风听写，上传语音克隆样本或创建 profile，视频、音乐或声音设计。

**核心规则：**
- 必须使用 Voicebox：握手或 GET /health 失败时退出，并给出一次性安装或启动提示；不要重试或自动重新启动
- 必须有 profile：若 voicebox_list_profiles 为空，指引用户打开应用界面，然后退出
- 长度限制：每次 TTS 最多 5000 个字符（2000 个字符时警告），STT 最长 30 分钟；v1 不会自动分块
- 自动调用透明度：只有任务超过 auto_notify_after_sec（默认 60 秒）时才发送通知；始终用一行说明意图
- 路径安全：输出到 PWD 之外时警告并确认；SIGINT 不写入部分输出
- 每次生成都必须有清单；Voicebox 免费，不设费用门槛

**工作流：**PREPARE（验证文本、音频、语言、路径和 profile）→ ACQUIRE（缺少信号时仅澄清一次）→ ACT（MCP voicebox_speak 或 voicebox_transcribe）→ VERIFY（音频或转录存在且清单字段完整）→ FINALIZE（写入 manifest.json，报告路径）。

**资源：**voice-matrix.md、prompt-tips.md、execution-protocol.md、checklist.md，以及 config/voice-config.yaml。

受保护标识符补充： `$PWD`、`auto_notify_after_sec`、`checklist.md`、`config/voice-config.yaml`、`execution-protocol.md`、`GET /health`、`manifest.json`、`prompt-tips.md`、`voice-matrix.md`、`voicebox_list_profiles`、`voicebox_speak`、`voicebox_transcribe`。

## 章程预检（CHARTER_CHECK）

在编写任何代码之前，每个实现智能体都必须输出 CHARTER_CHECK 块：

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```


CHARTER_CHECK:

**目的：**
- 声明智能体将做什么以及不会做什么
- 在编写代码前发现范围蔓延
- 让假设明确，便于用户审查
- 形成可测试的成功标准

**澄清级别：**
- **LOW**：需求明确。按所述假设继续。
- **MEDIUM**：存在部分歧义。列出选项，按最可能的方案继续。
- **HIGH**：歧义很大。将状态设为 blocked，列出问题，禁止编写代码。

在子智能体模式（CLI 启动）下，智能体不能直接询问用户。LOW 继续执行，MEDIUM 收窄并解释，HIGH 阻塞并返回问题，由编排器转达。

---

## 两层技能加载

每个智能体的知识分为两层：

**第一层：SKILL.md（中位数约 3,100 个令牌）**
始终加载。包含 frontmatter（name、description）、何时使用或不使用、核心规则、架构概览、库清单以及第二层资源的引用。

**第二层：resources/（按需加载）**
仅当智能体正在处理任务时加载，并根据任务类型和难度加载匹配的资源：

| 难度 | 加载的资源 |
|-----------|---------------|
| **简单** | 仅 execution-protocol.md |
| **中等** | execution-protocol.md + examples.md |
| **复杂** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

执行期间还会按需加载：
- checklist.md：验证步骤
- error-playbook.md：仅在发生错误时
- common-checklist.md：复杂任务的最终验证

---

受保护标识符补充： `checklist.md`、`common-checklist.md`、`error-playbook.md`。

## 限定执行

智能体受严格的领域边界约束：

- 前端智能体不会修改后端代码
- 后端智能体不会触碰 UI 组件
- 数据库智能体不会实现 API 端点
- 智能体会为其他智能体记录范围外依赖

如果执行期间发现任务属于其他领域，智能体会在结果文件中记录升级事项，而不是尝试处理。

---

## 工作空间策略

多智能体项目使用独立工作区来避免文件冲突：

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```


启动智能体时使用 -w 标志指定工作区：

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```


---

受保护标识符补充： `-w`。

## 编排流程

运行多智能体工作流（/orchestrate 或 /work）时：

1. **PM 智能体**按领域将请求分解为带优先级（P0、P1、P2）和依赖关系的任务
2. **初始化会话**：生成会话 ID，并在配置的内存存储中创建 orchestrator-session-{sessionId}.md 和 task-board-{sessionId}.md
3. **启动 P0 任务**：并行启动（最多 MAX_PARALLEL 个智能体）
4. **监控进度**：每隔 POLL_INTERVAL 轮询运行范围内的 progress-{agentId}-{taskId}-{runId}-{sessionId}.md
5. **启动 P1 任务**：P0 完成后继续，依此类推
6. **验证循环**：每个完成的智能体都执行（自审 → 自动验证 → QA 交叉审查）
7. **收集结果**：收集运行范围内的结果文件和结构化声明
8. **最终报告**：会话摘要、变更文件和剩余问题

**智能体间审查循环：**
1. 自审：智能体根据验收标准检查自身 diff
2. 自动验证：oma verify agent {agent-type} --workspace {workspace}
3. 交叉审查：QA 智能体审查变更
4. 失败时：将问题反馈并修复（循环最多 5 次）

**澄清债务监控：**跟踪会话期间的用户更正。事件计分为 clarify（+10）、correct（+25）、redo（+40）。CD >= 50 触发强制 RCA。CD >= 80 暂停会话。

---

受保护标识符补充： `/orchestrate`、`/work`、`orchestrator-session-{sessionId}.md`、`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`、`task-board-{sessionId}.md`。

## 智能体定义

智能体定义位于两个位置：

**agents 目录：**包含 12 个已签入的事实来源子智能体定义，包括：

这些文件定义智能体身份、执行协议引用、CHARTER_CHECK 模板、架构摘要和规则。启动子智能体时，Task/Agent 工具（Claude Code）或 CLI 会使用这些定义。

运行时还提供 13 个规范调度角色：orchestrator、architecture、qa、pm、backend、frontend、mobile、db、debug、refactor、docs、tf-infra 和 explore。research-explorer.md 是映射到 explore 的已签入定义；orchestrator 是没有单独定义文件的运行时协调角色。

**供应商原生投影：**OMA 会将源定义物化为运行时专用智能体文件：

这些生成文件由 oma link、oma install 和 oma update 刷新。

---

受保护标识符补充： `.agents/agents/`、`.claude/agents/*.md`、`.codex/agents/*.toml`、`.cursor/agents/*`、`.opencode/agents/*`、`architecture`、`architecture-reviewer.md`、`backend`、`backend-engineer.md`、`db`、`db-engineer.md`、`debug`、`debug-investigator.md`、`docs`、`docs-curator.md`、`explore`、`frontend`、`frontend-engineer.md`、`mobile`、`mobile-engineer.md`、`oma install`、`oma link`、`oma update`、`orchestrator`、`pm`、`pm-planner.md`、`qa`、`qa-reviewer.md`、`refactor`、`refactor-engineer.md`、`research-explorer.md`、`tf-infra`、`tf-infra-engineer.md`。

## 运行时状态（项目内存存储）

在编排会话期间，智能体通过共享内存文件协调：

| 文件 | 所有者 | 目的 | 其他 |
|------|-------|---------|--------|
| orchestrator-session-{sessionId}.md | 编排器 | 会话 ID、状态、开始时间、阶段追踪 | 只读 |
| task-board-{sessionId}.md | 编排器 | 任务分配、优先级、状态更新 | 只读 |
| progress-{agentId}-{taskId}-{runId}-{sessionId}.md | 该运行 | 逐回合进度：执行的操作、读取或修改的文件、当前状态 | 编排器读取 |
| result-{agentId}-{taskId}-{runId}-{sessionId}.md | 该运行 | 最终输出：状态（completed/failed）、摘要、变更文件、验收标准清单 | 编排器读取 |
| session-metrics.md | 编排器 | 澄清债务追踪、质量评分进展 | QA 读取 |
| experiment-ledger.md | 编排器或 QA | Quality Score 启用时的实验追踪 | 全部读取 |

内存工具可配置。默认情况下，智能体使用原生文件工具直接读写这些协调文件，也可以在 mcp.json 中配置自定义工具和基础路径：

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```


仪表盘会监视这些内存文件，实时显示进度。

受保护标识符补充： `.agents/state/memories/`、`.serena/memories/`、`Edit`、`experiment-ledger.md`、`mcp.json`、`oma dashboard terminal`、`oma dashboard web`、`orchestrator-session-{sessionId}.md`、`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`、`Read`、`result-{agentId}-{taskId}-{runId}-{sessionId}.md`、`session-metrics.md`、`task-board-{sessionId}.md`、`Write`。
