---
title: Agents
description: Complete reference for all 32 oh-my-agent agents, covering their domains, tech stacks, resource files, capabilities, charter preflight protocol, two-layer skill loading, scoped execution rules, quality gates, workspace strategy, orchestration flow, and runtime memory.
---

# Agents

Agents in oh-my-agent are specialized engineering roles. Each agent has a defined domain, tech stack knowledge, resource files, quality gates, and execution constraints. Agents are not generic chatbots. They are scoped workers that stay in their lane and follow structured protocols.

The agent definitions under `.agents/agents/` are the source of truth. OMA projects them into vendor-native files for runtimes that support custom subagents:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

When a workflow maps an agent to the same vendor as the current runtime, it should use that runtime's native agent file first. Cross-vendor tasks fall back to `oma agent:spawn`.

> **Per-agent model dispatch:** each agent resolves to a specific model slug, CLI vendor, and reasoning effort through `model_preset` (and optional `agents:` overrides) in `.agents/oma-config.yaml`. See [Per-Agent Models](../guide/per-agent-models.md) for configuration details and [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) to inspect the live matrix.

---

## Agent categories

| Category | Agents | Responsibility |
|----------|--------|---------------|
| **Ideation** | oma-brainstorm | Exploring ideas, proposing approaches, producing design documents |
| **Architecture** | oma-architecture | System/module/service boundaries, ADR/ATAM/CBAM-style analysis, tradeoff records |
| **Planning** | oma-pm | Requirements decomposition, task breakdown, API contracts, priority assignment |
| **Implementation** | oma-frontend, oma-backend, oma-mobile, oma-db | Writing production code in their respective domains |
| **Design** | oma-design | Design systems, DESIGN.md, tokens, typography, color, motion, accessibility |
| **Infrastructure** | oma-tf-infra | Multi-cloud Terraform provisioning, IAM, cost optimization, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migrations, release coordination, monorepo automation |
| **Observability** | oma-observability | Observability pipelines, traceability routing, MELT+P signals (metrics/logs/traces/profiles/cost/audit/privacy), SLO management, incident forensics, transport tuning |
| **Quality** | oma-qa | Security audit (OWASP), performance, accessibility (WCAG), code quality review |
| **Debugging** | oma-debug | Bug reproduction, root cause analysis, minimal fixes, regression tests |
| **Localization** | oma-translator | Context-aware translation preserving tone, register, and domain terms |
| **Coordination** | oma-orchestrator, oma-coordination | Automated and manual multi-agent orchestration |
| **Git** | oma-scm | Conventional Commits generation, feature-based commit splitting |
| **Search & Retrieval** | oma-search | Intent-based search router with trust scoring (Context7 docs, web, `gh`/`glab` code, Serena local) |
| **Retrospective** | oma-recap | Cross-tool conversation history analysis and themed work summaries |
| **Document Processing** | oma-hwp, oma-pdf | HWP/HWPX/HWPML and PDF to Markdown conversion for LLM/RAG ingestion |
| **Documentation** | oma-docs | Documentation drift detection (verify broken refs, propose sync patches for diff-affected docs) |
| **Academic Writing** | oma-academic-writer, oma-scholar | Publication-grade academic prose drafting/audit and Knows-sidecar scholarly research, search, and peer review |
| **Security** | oma-deepsec | Driving Vercel's deepsec agent-powered vulnerability scanner (scan, PR gate, matchers, triage) cost-consciously |
| **Refactoring** | oma-refactor | Behavior-preserving incremental restructuring with hotspot targeting, characterization-test safety nets, refactor-only commits |
| **Market Research** | oma-market | Community-signal pain/trend/competitor/discovery research with intent-auto SWOT/Porter's 5F/PESTEL frameworks |
| **Skill Authoring** | oma-skill-creator | Creating and validating OMA skills in the SSL-lite format |
| **Media Generation** | oma-image, oma-slide, oma-video, oma-voice | AI image generation, HTML presentation decks, short-form/explainer/demo video, and local TTS/STT |

---

## Detailed agent reference

### oma-brainstorm

**Domain:** Design-first ideation before planning or implementation.

**When to use:** Exploring a new feature idea, understanding user intent, comparing approaches. Use before `/plan` for complex or ambiguous requests.

**When NOT to use:** Clear requirements (go to oma-pm), implementation (go to domain agents), code review (go to oma-qa).

**Core rules:**
- No implementation or planning before design approval
- One clarifying question at a time (not batches)
- Always propose 2-3 approaches with a recommended option
- Section-by-section design with user confirmation at each step
- YAGNI: design only what is needed

**Workflow:** 6 phases: Context exploration, Questions, Approaches, Design, Documentation (saves to `docs/plans/`), Transition to `/plan`.

**Resources:** Uses shared resources only (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-architecture

**Domain:** Software/system architecture, including module and service boundaries, tradeoff analysis, stakeholder synthesis, and decision records.

**When to use:** Choosing or reviewing system architecture, defining module/service/ownership boundaries, comparing architectural options with explicit tradeoffs, investigating architectural pain (change amplification, hidden dependencies, awkward APIs), prioritizing architecture investments or refactors, writing architecture recommendations or ADRs.

**When NOT to use:** Visual/design systems (use oma-design), feature planning and task decomposition (use oma-pm), Terraform implementation (use oma-tf-infra), bug diagnosis (use oma-debug), security/performance/accessibility review (use oma-qa).

**Methodologies:** Diagnostic routing, design-twice comparison, ATAM-style risk analysis, CBAM-style prioritization, ADR-style decision records.

**Core rules:**
- Diagnose the architecture problem before selecting a method
- Use the lightest sufficient methodology for the current decision
- Distinguish architectural design from UI/visual design and from Terraform delivery
- Consult stakeholder agents only when the decision is cross-cutting enough to justify the cost
- Recommendation quality matters more than consensus theater: consult broadly, decide explicitly
- Every recommendation must state assumptions, tradeoffs, risks, and validation steps
- Be cost-aware by default: implementation cost, operational cost, team complexity, future change cost

**Resources:** `SKILL.md`, `resources/` directory with methodology guides (diagnostic-routing, design-twice, ATAM, CBAM, ADR templates).

---

### oma-pm

**Domain:** Product management, including requirements analysis, task decomposition, and API contracts.

**When to use:** Breaking down complex features, determining feasibility, prioritizing work, defining API contracts.

**Core rules:**
- API-first design: define contracts before implementation tasks
- Every task has: agent, title, acceptance criteria, priority, dependencies
- Minimize dependencies for maximum parallel execution
- Security and testing are part of every task (not separate phases)
- Tasks must be completable by a single agent
- Output JSON plan + task-board.md for orchestrator compatibility

**Output:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, memory write for orchestrator.

**Resources:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md` (contracts are written to `.agents/results/api-contracts/`).

**Turn limits:** Default 10, max 15.

---

### oma-frontend

**Domain:** Web UI built with React, Next.js, and TypeScript on FSD-lite architecture.

**When to use:** Building user interfaces, components, client-side logic, styling, form validation, API integration.

**Tech stack:**
- React + Next.js (Server Components default, Client Components for interactivity)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (read-only primitives, extend via cva/wrappers)
- FSD-lite: root `src/` + feature `src/features/*/` (no cross-feature imports)

**Libraries:**
| Purpose | Library |
|---------|---------|
| Dates | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks or @mantine/hooks |
| Utils | es-toolkit |
| URL State | nuqs |
| Server State | TanStack Query (orval-generated hooks when an OpenAPI spec exists) |
| Client State | Jotai (minimize use) |
| Forms | @tanstack/react-form + Zod |
| Auth | better-auth |

**Core rules:**
- shadcn/ui first, extend via cva, never modify `components/ui/*` directly
- Design tokens 1:1 mapping (never hardcode colors)
- Proxy over middleware (Next.js 16+ uses `proxy.ts`, not `middleware.ts` for proxy logic)
- No prop drilling beyond 3 levels; use Jotai atoms instead
- Absolute imports with `@/` mandatory
- FCP target < 1s
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

**Resources:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Quality gate checklist:**
- Accessibility: ARIA labels, semantic headings, keyboard navigation
- Mobile: verified on mobile viewports
- Performance: no CLS, fast load
- Resilience: Error Boundaries and Loading Skeletons
- Tests: logic covered by Vitest
- Quality: typecheck and lint pass

**Turn limits:** Default 20, max 30.

---

### oma-backend

**Domain:** APIs, server-side logic, authentication, database operations.

**When to use:** REST/GraphQL APIs, database migrations, auth, server business logic, background jobs.

**Architecture:** Router (HTTP) -> Service (Business Logic) -> Repository (Data Access) -> Models.

**Stack detection:** Reads project manifests (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) to determine language and framework. Falls back to `stack/` directory if present, or asks user to run `/stack-set`.

**Core rules:**
- Clean architecture: no business logic in route handlers
- All inputs validated with the project's validation library
- Parameterized queries only (never string interpolation in SQL)
- JWT + Argon2id for auth (bcrypt acceptable for legacy compatibility); rate limit auth endpoints
- Async where supported; type annotations on all signatures
- Custom exceptions via centralized error module
- Explicit ORM loading strategy, transaction boundaries, safe lifecycle

**Resources:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Stack-specific resources in `stack/` (generated by `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Turn limits:** Default 20, max 30.

---

### oma-mobile

**Domain:** Cross-platform and native mobile apps (Flutter, React Native, and Swift native iOS).

**When to use:** Native mobile apps (iOS + Android), mobile-specific UI patterns, platform features (camera, GPS, push notifications), offline-first architecture; Swift native iOS apps using SwiftUI and `swift-openapi-generator`.

**Architecture:** Clean Architecture: domain -> data -> presentation. For Swift iOS: `App/Core/Features/Shared` project layout.

**Tech stacks:**
- Flutter/Dart: Riverpod/Bloc (state management), Dio with interceptors (API), GoRouter (navigation), Material Design 3 (Android) + iOS HIG.
- Swift native iOS (iOS 17+): SwiftUI + `@Observable` (Observation framework), Apple `swift-openapi-generator` for API clients, `App/Core/Features/Shared` layout.

**Core rules:**
- Riverpod/Bloc for state management (no raw setState for complex logic)
- All controllers disposed in `dispose()` method
- Dio with interceptors for API calls; handle offline gracefully
- 60fps target; test on both platforms
- Swift: use `@Observable` over `ObservableObject` on iOS 17+; generate API clients from OpenAPI specs via `swift-openapi-generator`

**Resources:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `screen-template.swift`, `checklist.md`, `error-playbook.md`, `examples.md`. Swift variant references in `variants/swift-ios/` (generated by `/stack-set`: `stack.yaml`, `tech-stack.md`, `snippets.md`, `api-template.swift`).

**Turn limits:** Default 20, max 30.

---

### oma-db

**Domain:** Database architecture across SQL, NoSQL, and vector databases.

**When to use:** Schema design, ERD, normalization, indexing, transactions, capacity planning, backup strategy, migration design, vector DB/RAG architecture, anti-pattern review, compliance-aware design (ISO 27001/27002/22301).

**Default workflow:** Explore (identify entities, access patterns, volume) -> Design (schema, constraints, transactions) -> Optimize (indexes, partitioning, archival, anti-patterns).

**Core rules:**
- Choose model first, engine second
- 3NF default for relational; document BASE tradeoffs for distributed
- Document all three schema layers: external, conceptual, internal
- Integrity is first-class: entity, domain, referential, business-rule
- Concurrency is never implicit: define transaction boundaries and isolation levels
- Vector DBs are retrieval infrastructure, not source-of-truth
- Never treat vector search as a drop-in replacement for lexical search

**Required deliverables:** External schema summary, conceptual schema, internal schema, data standards table, glossary, capacity estimation, backup/recovery strategy. For vector/RAG: embedding version policy, chunking policy, hybrid retrieval strategy.

**Resources:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domain:** Design systems, UI/UX, DESIGN.md management.

**When to use:** Creating design systems, landing pages, design tokens, color palettes, typography, responsive layouts, accessibility review.

**Workflow:** 7 phases: Setup (context gathering) -> Extract (optional, from reference URLs) -> Enhance (vague prompt augmentation) -> Propose (2-3 design directions) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, AI slop check) -> Handoff.

**Anti-pattern enforcement ("no AI slop"):**
- Typography: system font stack default; no default Google Fonts without justification
- Color: no purple-to-blue gradients, no gradient orbs/blobs, no pure white on pure black
- Layout: no nested cards, no desktop-only layouts, no cookie-cutter 3-metric stat layouts
- Motion: no bounce easing everywhere, no animations > 800ms, must respect prefers-reduced-motion
- Components: no glassmorphism everywhere, all interactive elements need keyboard/touch alternatives

**Core rules:**
- Check `.design-context.md` first; create if missing
- System font stack default (CJK-ready fonts for ko/ja/zh)
- WCAG AA minimum for all designs
- Responsive-first (mobile as default)
- Present 2-3 directions, get confirmation

**Resources:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus `reference/` directory (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) and `examples/` (design-context-example, landing-page-prompt).

---

### oma-tf-infra

**Domain:** Infrastructure-as-code with Terraform, multi-cloud.

**When to use:** Provisioning on AWS/GCP/Azure/Oracle Cloud, Terraform configuration, CI/CD authentication (OIDC), CDN/load balancers/storage/networking, state management, ISO compliance infrastructure.

**Cloud detection:** Reads Terraform providers and resource prefixes (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Includes a full multi-cloud resource mapping table.

**Core rules:**
- Provider-agnostic: detect cloud from project context
- Remote state with versioning and locking
- OIDC-first for CI/CD auth
- Plan before apply always
- Least privilege IAM
- Tag everything (Environment, Project, Owner, CostCenter)
- No secrets in code
- Version pin all providers and modules
- No auto-approve in production

**Resources:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domain:** Monorepo task automation and CI/CD.

**When to use:** Running dev servers, executing lint/format/typecheck across apps, database migrations, API generation, i18n builds, production builds, CI/CD optimization, pre-commit validation.

**Core rules:**
- Always use `mise run` tasks instead of direct package manager commands
- Run lint/test only on changed apps
- Validate commit messages with commitlint
- CI should skip unchanged apps
- Never use direct package manager commands when mise tasks exist

**Resources:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domain:** Intent-based observability and traceability router across layers, boundaries, and signals.

**When to use:** Observability pipeline setup (OTel SDK + Collector + vendor backend), traceability across service and domain boundaries (W3C propagators, baggage, multi-tenant, multi-cloud), transport tuning (UDP/MTU thresholds, OTLP gRPC vs HTTP, Collector DaemonSet vs sidecar topology, sampling recipes), incident forensics (6-dimension localization: code / service / layer / host / region / infra), vendor category selection (OSS full-stack vs commercial SaaS vs high-cardinality specialist vs profiling specialist), observability-as-code (Grafana Jsonnet dashboards, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate alerts), meta-observability (pipeline self-health, clock skew, cardinality guardrails, retention matrix), MELT+P signal coverage (metrics, logs, traces, profiles, cost, audit, privacy), migration off deprecated tools (Fluentd -> Fluent Bit or OTel Collector).

**When NOT to use:** LLM ops / gen_ai observability (use Langfuse, Arize Phoenix, LangSmith, Braintrust), data pipeline lineage (OpenLineage + Marquez, dbt test, Airflow lineage), IoT / datacenter physical-layer telemetry (Nlyte, Sunbird, Device42), chaos engineering orchestration (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU / TPU infrastructure (NVIDIA DCGM Exporter), software supply chain (sigstore, in-toto, SLSA), incident response workflow / paging (PagerDuty, OpsGenie, Grafana OnCall), single-vendor setup already covered by that vendor's own skill.

**Core rules:**
- Classify intent before routing: setup | migrate | investigate | alert | trace | tune | route
- Category-first, not vendor-registry: delegate to vendor-owned skills via `resources/vendor-categories.md`; do not duplicate vendor documentation
- Transport tuning is the moat: UDP/MTU thresholds, OTLP protocol selection, Collector topology, and sampling recipes are depth that other skills do not cover
- Meta-observability is non-negotiable: validate pipeline self-health, clock sync (< 100 ms drift), cardinality, and retention before declaring setup complete
- CNCF-first preference: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd is deprecated (CNCF 2025-10): recommend Fluent Bit or OTel Collector for new and migration work
- W3C Trace Context as default propagator; translate per cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Privacy before features: PII redaction, sampling-aware baggage rules, SOC2/ISO immutable audit + GDPR/PIPA erasure applied at collection, not only at storage

**Resources:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, plus deep resources under `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu), and `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domain:** Quality assurance covering security, performance, accessibility, and code quality.

**When to use:** Final review before deployment, security audits, performance analysis, accessibility compliance, test coverage analysis.

**Review priority order:** Security > Performance > Accessibility > Code Quality.

**Severity levels:**
- **CRITICAL**: Security breach, data loss risk
- **HIGH**: Blocks launch
- **MEDIUM**: Fix this sprint
- **LOW**: Backlog

**Core rules:**
- Every finding must include file:line, description, and fix
- Run automated tools first (npm audit, bandit, lighthouse)
- No false positives; every finding must be reproducible
- Provide remediation code, not just descriptions

**Resources:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Turn limits:** Default 15, max 20.

---

### oma-debug

**Domain:** Bug diagnosis and fixing.

**When to use:** User-reported bugs, crashes, performance issues, intermittent failures, race conditions, regression bugs.

**Methodology:** Reproduce first, then diagnose. Never guess at fixes.

**Core rules:**
- Identify root cause, not just symptoms
- Minimal fix: change only what is necessary
- Every fix gets a regression test
- Search for similar patterns elsewhere
- Document in `.agents/results/`

**Serena MCP tools used:**
- `find_symbol("functionName")`: locate the function
- `find_referencing_symbols("Component")`: find all usages
- `search_for_pattern("error pattern")`: find similar issues

**Resources:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Turn limits:** Default 15, max 25.

---

### oma-translator

**Domain:** Context-aware multilingual translation.

**When to use:** Translating UI strings, documentation, marketing copy, reviewing existing translations, creating glossaries.

**4-stage method:** Analyze Source (register, intent, domain terms, cultural references, emotional connotations, figurative language mapping) -> Extract Meaning (strip source structure) -> Reconstruct in Target Language (natural word order, register matching, sentence splitting/merging) -> Verify (naturalness rubric + anti-AI pattern check).

**Optional 7-stage refined mode** for publication quality: extends with Critical Review, Revision, and Polish stages.

**Core rules:**
- Scan existing locale files first to match conventions
- Translate meaning, not words
- Preserve emotional connotations
- Never produce word-for-word translations
- Never mix registers within a piece
- Preserve domain-specific terminology as-is

**Resources:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domain:** Automated multi-agent coordination via CLI spawning.

**When to use:** Complex features requiring multiple agents in parallel, automated execution, full-stack implementation.

**Configuration defaults:**

| Setting | Default | Description |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maximum concurrent subagents |
| MAX_RETRIES | 2 | Retry attempts per failed task |
| POLL_INTERVAL | 30s | Status check interval |
| MAX_TURNS (impl) | 20 | Turn limit for backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Turn limit for qa/debug |
| MAX_TURNS (plan) | 10 | Turn limit for pm |

**Workflow phases:** Plan -> Setup (session ID, memory initialization) -> Execute (spawn by priority tier) -> Monitor (poll progress) -> Verify (automated + cross-review loop) -> Collect (compile results).

**Agent-to-agent review loop:**
1. Self-review: agent checks own diff against acceptance criteria
2. Automated verify: `oma verify {agent-type} --workspace {workspace}`
3. Cross-review: QA agent reviews changes
4. On failure: issues fed back for fixing (max 5 total loop iterations)

**Clarification Debt monitoring:** Tracks user corrections during sessions. Events scored as clarify (+10), correct (+25), redo (+40). CD >= 50 triggers mandatory RCA. CD >= 80 pauses session.

**Resources:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domain:** Software configuration management (SCM) and Git, covering branching, merges, worktrees, baselines, audit readiness, and Conventional Commits.

**When to use:** After code changes (`/scm`), merge conflicts, branch strategy, releases/tags, or any repo CM question.

**Commit types:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow (commits):** Analyze changes → Split by feature when needed → type → scope → description (imperative, under 72 chars, lowercase, no trailing period) → commit with explicit paths.

**Rules:**
- Never use `git add -A` or `git add .`
- Never commit secrets files
- Always specify files when staging
- Use HEREDOC for multi-line commit messages
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**Domain:** Manual step-by-step multi-agent coordination guide.

**When to use:** Complex projects where you want human-in-the-loop control at every gate, manual agent spawning guidance, step-by-step coordination recipes.

**When NOT to use:** Fully automated parallel execution (use oma-orchestrator), single-domain tasks (use the domain agent directly).

**Core rules:**
- Always present the plan for user confirmation before spawning agents
- One priority tier at a time; wait for completion before next tier
- User approves each gate transition
- QA review is mandatory before merging
- Issue remediation loop for CRITICAL/HIGH findings

**Workflow:** PM plans → User confirms → Spawn by priority tier → Monitor → QA review → Fix issues → Ship.

**Difference from oma-orchestrator:** Coordination is manual and guided (user controls pace), orchestrator is automated (agents spawn and run with minimal user intervention).

---

### oma-search

**Domain:** Intent-based search router with domain trust scoring. Routes queries to Context7 (docs), native web search, `gh`/`glab` (code), Serena (local).

**When to use:** Finding official library/framework documentation, web research for tutorials/examples/comparisons/solutions, GitHub/GitLab code search for implementation patterns, any query where the search channel is unclear (auto-routing), other skills that need search infrastructure (shared invocation).

**When NOT to use:** Local-only codebase exploration (use Serena MCP directly), Git history or blame analysis (use oma-scm), full architecture research (use oma-architecture, which may invoke this skill internally).

**Core rules:**
- Classify intent before searching; every query goes through IntentClassifier first
- One query, one best route; avoid redundant multi-route unless intent is ambiguous
- Trust score every result; all non-local results get domain trust labels from the registry
- Flags override classifier: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: if the primary route fails, fall back gracefully (docs→web, web→`oma search fetch` strategies)
- No additional MCP required: Context7 for docs, runtime-native for web, CLI for code, Serena for local
- Vendor-agnostic web search: use whatever the current runtime provides (WebSearch, Google, Bing)
- Domain-level trust only; no sub-path or page-level scoring

**Resources:** `SKILL.md`, `resources/` directory with intent classifier, route definitions, and trust registry.

---

### oma-recap

**Domain:** Conversation history analysis across multiple AI tools (Claude, Codex, Qwen, Cursor) with themed daily/period work summaries.

**When to use:** Summarizing a day or period of work activity, understanding the flow of work across multiple AI tools, analyzing tool-switching patterns between sessions, preparing daily standups / weekly retros / work logs.

**When NOT to use:** Git commit-based code change retrospective (use `oma retro`), real-time agent monitoring (use `oma dashboard`), productivity metrics (use `oma stats`).

**Process:**
1. Resolve date or time window from natural-language input (today, yesterday, last Monday, explicit date)
2. Fetch conversation data via `oma recap --date YYYY-MM-DD` or `--since` / `--until`
3. Group by tool and session
4. Extract themes (features worked on, bugs fixed, tools explored)
5. Render themed daily/period summary

**Resources:** `SKILL.md`. Defers heavy work to the `oma recap` CLI.

---

### oma-hwp

**Domain:** HWP / HWPX / HWPML (Korean word processor) to Markdown conversion using `kordoc`.

**When to use:** Converting Korean HWP documents (`.hwp`, `.hwpx`, `.hwpml`) to Markdown, preparing Korean government/enterprise documents for LLM context or RAG, extracting structured content (tables, headings, lists, images, footnotes, hyperlinks) from HWP.

**When NOT to use:** PDF files (use oma-pdf), XLSX/DOCX (out of scope), generating/editing HWP (out of scope), already-text files (use Read tool directly).

**Core rules:**
- Use `bunx kordoc@latest` to run (no installation required); always pass `@latest` or a pinned version
- Default output format is Markdown
- If no output directory is specified, output to the same directory as the input
- kordoc handles structure preservation (headings, tables, nested tables, footnotes, hyperlinks, images)
- Security defenses (ZIP bomb, XXE, SSRF, XSS) are provided by kordoc; do not add custom ones
- For encrypted or DRM-locked HWP, report the limitation to the user clearly
- Post-process with `resources/flatten-tables.ts` to convert HTML `<table>` blocks to GFM pipe tables and strip Hancom font Private Use Area characters

**Resources:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domain:** PDF to Markdown conversion using `opendataloader-pdf`.

**When to use:** Converting PDF documents to Markdown for LLM context or RAG, extracting structured content (tables, headings, lists) from PDFs, preparing PDF data for AI consumption.

**When NOT to use:** Generating/creating PDFs (use appropriate document tools), editing existing PDFs (out of scope), simple reading of already-text files (use Read tool directly).

**Core rules:**
- Use `uvx opendataloader-pdf` to run (no installation required)
- Default output format is Markdown
- If no output directory is specified, output to the same directory as the input PDF
- Preserve document structure (headings, tables, lists, images)
- For scanned PDFs, use hybrid mode with OCR
- Always run `uvx mdformat` on the output to normalize Markdown formatting
- Validate the output Markdown is readable and well-structured
- Report any conversion issues (missing tables, garbled text) to the user

**Resources:** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writer

**Domain:** Publication-grade academic English prose: drafting, revising, and auditing essays, reports, analysis sections, executive summaries, conclusions, and literature reviews.

**When to use:** Drafting or revising academic reports/essays/analysis sections, writing executive summaries or conclusions or literature reviews, rewriting AI-sounding prose into natural academic English, polishing a draft to top-band rubric quality (HD, A, top-band), reviewing prose for sentence variety / verb quality / hedging / anti-AI compliance.

**When NOT to use:** Translation (use oma-translator), source discovery / citation gathering / literature search (use oma-scholar), rubric parsing and task decomposition (use oma-pm), code documentation / README / API reference text (use the relevant domain skill), informal or marketing copy, non-English academic writing (draft in English, then hand off to oma-translator).

**Modes:** `draft` (heading + prose + Writing Notes + Claim-Evidence Map), `revise` (original + revised + change list), `review` (PASS/FAIL compliance report across sentence structure, verb quality, anti-AI, specificity, hedging, paragraph clarity, rhythm, claim-evidence alignment).

**Core rules:**
- Quote-before-judgment: cite the literal rubric/constraint text before applying any rule
- Every sentence verifiable; never fabricate data, statistics, or citations
- Banned generic verbs (`show`, `have`, `make`, `do`, `get`, `use`, …) must not be main verbs
- Vary sentence type, length, and openers; never 3+ same-type sentences in a row
- Match hedge strength to evidence strength; no first-person `I think`/`I believe`
- Every claim maps to evidence in the Claim-Evidence Map; weaken or remove unsupported claims

**Workflow:** 6 steps — READ rubric/draft and quote constraints, PLAN paragraphs as Topic-Support-Conclude, DRAFT under all four protocols, AUDIT against the anti-AI checklist, REVERSE-OUTLINE + build Claim-Evidence Map, POLISH (read-aloud, cohesion, specificity, word-count, rhythm).

**Resources:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md`, plus shared `context-loading`, `quality-principles`.

---

### oma-deepsec

**Domain:** Driving Vercel's `deepsec` agent-powered vulnerability scanner end-to-end, safely and cost-consciously, inside a target repository.

**When to use:** First-time deepsec install in a repo (`init`, `INFO.md` write, calibration scan), running a full or scoped scan and processing findings, setting up a per-PR CI gate with `process --diff`, writing project-specific matchers, triaging a findings backlog (severity bucketing, FP cuts via `revalidate`, export), diagnosing deepsec failures.

**When NOT to use:** Generic OWASP / lint-style review without deepsec (use oma-qa), generic CVE / dependency advisories (use oma-qa or oma-search), architecting a non-deepsec SAST pipeline (use oma-architecture), writing or auditing application code (route to oma-backend/frontend/mobile), cloud/IAM/Terraform hardening (use oma-tf-infra), reasoning about a finding's fix in product code (use oma-debug once deepsec produced the finding).

**Core rules:**
- Never launch an unbounded `process` on a repo whose size you have not measured; calibrate first (`--limit 50 --concurrency 5`) when file count is unknown or > 500
- State cost and stopping condition before any AI pass (≈ $25-60 for 100 files up to $500-1,200 for 2,000, with a ×2-3 swing)
- Resume, do not reset: after any quota/network/Ctrl-C interruption, re-run the same command; never delete `data/<id>/` to start clean
- Keep `INFO.md` short and project-specific (50-100 lines, 3-5 examples per section)
- For PR/CI gates use the two-job pattern; never grant `pull-requests: write` to the job that runs PR-controlled code; pin actions to full SHAs in production
- Ask agent choice (`codex`/`gpt-5.5` vs `claude`/`claude-opus-4-8`) before the first paid call; never echo or commit credentials

**Workflow:** PREPARE (intent, repo root, credential, budget, severity floor, agent) → ACQUIRE (config, `INFO.md`, run history, repo signals) → REASON (pick smallest sufficient pass) → ACT (run from inside `.deepsec/`) → VERIFY (`status`, `RunMeta`, exit code) → FINALIZE (findings by severity/verdict, dollar cost, follow-ups).

**Resources:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domain:** Documentation drift detection: verifying `docs/**/*.md` references against the current codebase (verify mode) and proposing patches for diff-affected docs (sync mode).

**When to use:** After a refactor/rename/file deletion to find stale references in docs, before a release to confirm CLI commands / file paths / config keys still exist, after a significant git diff to find which docs reference changed files, routine drift checks on a docs-heavy repo.

**When NOT to use:** Generating docs from scratch for undocumented features, multilingual translation of docs (use oma-translator), symbol-level semantic drift, CI-blocking enforcement (v1 is warn-only).

**Core rules:**
- Never modify `.agents/` (SSOT protection) in any mode
- Never auto-apply sync patches; sync is always interactive (`[y]` confirm required per doc)
- LLM unavailable → graceful degradation: verify falls back to raw JSON, sync to candidate-list-only
- Secret-bearing files (`.env*`, `*.pem`, `*.key`, `id_rsa*`, gitignored) never appear in sync output
- No direct LLM API calls from the CLI: it emits structured data; the host LLM does all synthesis and patch drafting (vendor-agnostic)
- URL link checking is delegated to `lychee`; the hook is warn-only in v1 and never blocks workflow completion

**Workflow:** verify mode — extract → resolve → report (deterministic CLI, exit 0 clean / 1 broken). sync mode — git diff → reverse lookup → candidate list → host-LLM patch proposals → interactive accept/reject → regenerate `doc-refs.json`.

**Resources:** Uses shared resources only; the implementation lives in `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-image

**Domain:** Multi-vendor AI image generation with authentication-aware parallel dispatch (Codex `gpt-image-2`, Antigravity `gemini-2.5-flash-image`/nano-banana via `agy`, Pollinations flux/zimage).

**When to use:** Generating images, visual assets, illustrations, product photos, concept art, or mockups; comparing output across multiple image models for the same prompt; producing images from prompts inside editor workflows.

**When NOT to use:** Editing an existing image or photo manipulation, generating videos or audio (use oma-video / oma-voice), inline vector/SVG composition from structured data, simple asset resizing or format conversion.

**Core rules:**
- Clarify before invoking: if subject/style/composition/usage is ambiguous, ask first or amplify the prompt and show the user the expanded version
- Authentication-aware dispatch: run only authenticated vendors; with `--vendor all`, every requested vendor must be available
- Cost guardrail: confirm before runs whose estimated cost is ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` bypass); default `pollinations` and `antigravity` are free
- Path safety: output outside `$PWD` requires `--allow-external-out`; max `n` = 5
- Deterministic outputs: every run writes `manifest.json` next to the images
- Auto-forward attached reference images via `--reference <path>` (codex/antigravity)

**Workflow:** PREPARE (clarify/amplify prompt, choose vendor) → ACQUIRE (validate auth, references, output path) → ACT (`oma image generate`) → VERIFY (manifest, files, exit code) → FINALIZE (output paths + warnings).

**Resources:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, plus `config/image-config.yaml`.

---

### oma-market

**Domain:** Community-signal market research: pain-point extraction, trend detection, competitor positioning, and discovery across Reddit, HN, Bluesky, Mastodon, GitHub Issues, and web.

**When to use:** Extracting real user pain points from community posts, detecting trends in a category over a 7d/30d/90d/180d window, competitor sentiment analysis and SWOT positioning, open-ended discovery research across multiple sources.

**When NOT to use:** General web research without market framing (use oma-search directly), single-source queries (use `oma search fetch` standalone), live dashboards or scheduled monitoring (v1 is one-shot).

**Core rules:**
- detect-trap first: never harvest without preflight (`--force` bypasses only in test mode)
- Delegate all fetches: `harvest` calls `oma search fetch --only api`; no direct platform HTTP
- Trust labels read-only: no re-scoring; Trust Registry ownership stays with oma-search
- Paid sources (X, TikTok, Instagram, YouTube, Perplexity) auto-skip silently when their env key is absent
- LAW self-check mandatory before file write; no raw evidence dump in the markdown body
- Single brief per run at `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; framework auto-toggles by intent (pain/trend → SWOT, competitor → SWOT + Porter's 5F, discovery → SWOT + PESTEL)

**Workflow:** PREPARE (parse topic/flags, detect-trap, resolve intent/pack/window) → ACT (build per-source fetch URLs) → ACQUIRE (parallel harvest) → VERIFY (score, fuse, cluster) → FINALIZE (render LAW-compliant brief, self-check, write).

**Resources:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md`, `examples.md`, plus `frameworks/` (swot, porters-5f, pestel) and `operator-packs/` (pain, positive, competitor, discovery).

---

### oma-refactor

**Domain:** Behavior-preserving refactoring: safe incremental restructuring with code-smell / SATD / hotspot targeting, characterization-test safety nets, and refactor-only commits.

**When to use:** Executing a refactoring on specific files/modules (extract, move, rename, decompose, idiom alignment), preparatory refactoring before a feature, legacy/brownfield rescue (seam discovery + characterization tests), refactoring target selection by hotspot (churn × complexity), auditing whether code is safe to refactor now.

**When NOT to use:** Fixing a reported bug or failing behavior (use oma-debug; refactoring must not change behavior), security/performance/accessibility audit (use oma-qa), system design / module boundaries / ADRs (use oma-architecture), DB schema design or migration mechanics (use oma-db), commit splitting / staging (use oma-scm), performance optimization as a goal.

**Core rules:**
- Behavior-preserving: the consumer contract (Hyrum-aware) is inviolable; tuning is a side effect, never a goal
- Verifiable: never restructure without a net; if the safety net is missing/weak, write characterization (golden-master) tests FIRST as separate commits
- Incremental: one named transformation per commit; on repeated failure use Mikado (record prerequisite, revert fully, recurse)
- Separated (two hats): never mix behavior changes into refactor commits (`refactor:`-typed only)
- Economic: readability is the dominant objective; don't refactor code slated for deletion or cold low-churn code
- Convention deviation requires the oma-architecture ADR route, not a local edit; all metrics are proxies (Goodhart)

**Workflow:** PREPARE (classify green/brownfield, size gates, hotspot rank) → ACQUIRE (read code via symbol tools, collect metrics + git signals) → REASON (plan atomic transformation sequence / expand-contract) → ACT (one engine-first transformation) → VERIFY (re-run tests unchanged → commit, or Mikado revert) → FINALIZE (metric delta + readability verdict).

**Resources:** `definition.md`, `measurement.md`, `governance.md`, plus shared `context-loading`, `quality-principles`.

---

### oma-scholar

**Domain:** Scholarly research companion using the Knows `.knows.yaml` sidecar spec: generating, validating, reviewing, querying, and comparing structured paper sidecars, plus fetching from knows.academy.

**When to use:** Token-efficient paper reading via sidecars (~700 tokens claims-only vs ~10K full PDF), generating `.knows.yaml` from drafts/LaTeX/notes, validating sidecar structure before sharing, producing peer reviews as sidecars, querying or summarizing existing sidecars, structurally comparing two papers, searching/fetching from knows.academy.

**When NOT to use:** General web search or non-academic content (use oma-search), translating papers (use oma-translator), PDF parsing only without a sidecar (use oma-pdf), full peer-review workflow with editor system.

**Modes:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Core rules:**
- Target spec is v0.9.0 / `paper@1` profile; the host LLM generates sidecars (never shell out to an external LLM SDK)
- Anti-fabrication: if DOI/venue/year is not visible in source, omit the key entirely; never write `doi: TODO` or guess
- Exact field names, single `provenance.actor` object, closed enums, unquoted numbers
- Relation density ≥ 1.5 per statement; every claim needs `supported_by` evidence
- Validate before sharing (`oma scholar lint`); use `--lenient` for third-party sidecars
- knows.academy → OpenAlex fallback for older/non-2026 papers; the public proxy API needs no auth

**Workflow:** PREPARE (mode + source) → ACQUIRE (metadata, sections, or local text) → REASON (extract claims/evidence/relations) → ACT (generate/lint/review/analyze/compare/fetch) → VERIFY (schema, enums, IDs, relations) → FINALIZE (sidecar/report/summary with caveats).

**Resources:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md`, plus `config/scholar-config.yaml`.

---

### oma-skill-creator

**Domain:** Authoring and validating OMA skills in the SSL-lite Markdown format (Scheduling / Structural Flow / Logical Operations / References).

**When to use:** Creating a new skill under `.agents/skills/{name}/SKILL.md`, updating an existing skill to the SSL-lite format, adding a canonical command/workflow path to an execution-heavy skill, auditing whether a skill has enough routing/execution/validation/recovery detail, deciding whether examples belong inline or in `resources/`.

**When NOT to use:** Installing third-party skills into `$CODEX_HOME/skills` (external), creating a Codex plugin bundle (external), writing a general project plan unrelated to skill authoring (use oma-pm), editing product/infrastructure/frontend/backend/mobile code directly (use the matching specialist skill).

**Core rules:**
- Keep the four top-level sections exactly: Scheduling, Structural Flow, Logical Operations, References
- Keep YAML frontmatter with clear `name` and `description`; run `oma skills audit` after editing the description (warn ≥ 60%, fail ≥ 75% TF-IDF cosine collision)
- Include concrete `When NOT to use` boundaries with cross-routes to adjacent skills
- Add exactly one inline canonical path (`Canonical command path` for fragile/repeatable commands, `Canonical workflow path` for judgment/research flow)
- Put long variant-specific detail in `resources/`, not the main body; do not create README/changelog/install docs inside a skill

**Workflow:** PREPARE (purpose, triggers, boundaries, I/O, dependencies) → ACQUIRE (read 1-3 analogous skills + conventions) → REASON (inline vs `resources/`) → ACT (draft from the SSL-lite template) → VERIFY (structural/routing/execution/formatting checks) → FINALIZE (changed files + validation report).

**Resources:** `ssl-lite-template.md`, `validation-checklist.md`, plus shared `context-loading`, `quality-principles`.

---

### oma-slide

**Domain:** Animation-rich HTML presentation deck generation at a fixed 1920×1080 stage, with deterministic validate/bundle/export to PDF/PNG/PPTX via the `oma slide` CLI.

**When to use:** Creating a new presentation from a topic or outline, enhancing or reformatting an existing deck, generating per-slide HTML with animations and design-doctrine aesthetics, exporting a deck to PDF/PNG/PPTX, applying a named style preset, exporting to or importing from Canva.

**When NOT to use:** Plain document creation with no slides, image generation alone (use oma-image directly), brand/design-system definition (use oma-design), deterministic CLI ops (validate/bundle/export) without generation (call the `oma slide` CLI directly).

**Core rules:**
- Skill authors the HTML; the CLI does everything else (scaffold, validate, bundle, export)
- Local assets only: no remote URLs in `<img src>`/`<video src>`, only `./assets/<file>`
- CJK → Pretendard font required on any Korean/Japanese/Chinese slide
- `prefers-reduced-motion` wrapper, visible focus states, and `data-om-validate` required on every slide
- Max 3 auto-fix iterations on validation, then surface the diff to the user
- Defers image generation to oma-image; Canva MCP is optional and auto-provisioned only with explicit user consent

**Workflow:** 7 phases — DETECT (mode), DISCOVER (clarify + evaluate assets), STYLE (3 live previews → user picks), GENERATE (`slide-NN.html` at 1920×1080), VALIDATE (`oma slide validate`, ≤3 auto-fix loops), REVIEW (viewer + optional bbox editor), DELIVER (`bundle` + optional PDF/PNG/PPTX export).

**Resources:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md`, plus an `assets/` directory.

---

### oma-video

**Domain:** Short-form, explainer, and demo video generation via a key-optional 3-tier (CLI-first / MCP / guided) provider router, composing script → narration → visuals → captions → Remotion render.

**When to use:** Generating short-form video (shorts/reels, 9:16) from a topic, explainers (16:9/9:16) from a README/code/data, demos/walkthroughs from a screen capture (`--source file`) or supervised headed web-app capture of any URL (`--source web`), re-rendering an existing run deterministically.

**When NOT to use:** Generating a single still image (use oma-image), generating a slide deck (use oma-slide; video calls it internally for explainer frames), generating speech audio only (use oma-voice), non-linear editing of an existing finished mp4, live streaming (supervised web capture is in scope).

**Core rules:**
- Clarify or infer the mode before invoking; show the user the inferred plan rather than silently rendering from a vague brief
- Key-optional dispatch: every external capability has a real path AND a key-free fallback; paid providers (Pexels, Pixelle) auto-enable only when their env key is present
- Cost guardrail at ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` bypass); limits of 180s duration / 40 scenes
- Deterministic outputs: `render-spec.json` + assets (+ seed + embedded Pretendard) are the determinism boundary; `OMA_VIDEO_MOCK=1` replays golden fixtures
- Demo is human-in-the-loop: web capture only opens a headed browser and records while a human drives the flow — NO credential automation; `--url` and tokens masked in logs/manifest
- Path safety (`--allow-external-out` for output outside `$PWD`)

**Workflow:** PREPARE (mode/aspect/locale, clarify/amplify brief) → ACQUIRE (probe provider availability, validate capture path, check cost) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schema, manifest hashes, exit code, mp4) → FINALIZE (run-dir + mp4 path + coverage warnings).

**Resources:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, plus the vendored `remotion/` compositor, the `playwright/` web-capture driver, and the `mpt/` fallback compositor; `config/video-config.yaml`.

---

### oma-voice

**Domain:** Local-first text-to-speech and speech-to-text via the Voicebox MCP server — fully on-device, no cloud, no API keys, no per-call cost.

**When to use:** Generating short notification audio for agent task completion or blockers, producing voiceover/narration/audio assets (mp3 or wav), transcribing local audio files (mp3, wav, m4a, webm, flac) to Markdown, comparing voice profiles by re-running the same text against different profile ids.

**When NOT to use:** Cloud TTS or high-fidelity multilingual cloud voices, real-time terminal microphone dictation (use Voicebox's hotkey dictation), voice cloning sample upload / profile creation (done in the Voicebox desktop app UI), video/music/sound design.

**Core rules:**
- Voicebox required: on handshake / `GET /health` failure, exit with a one-shot install/launch hint; do not retry or auto-relaunch
- Profile required: if `voicebox_list_profiles` is empty, point the user at the app UI, then exit
- Length limits: TTS caps at 5000 chars per call (warn at 2000), STT at 30 minutes; v1 does not auto-chunk
- Auto-invocation transparency: notifications fire only when the task exceeds `auto_notify_after_sec` (default 60s); always announce intent in one line
- Path safety (warn + confirm for output outside `$PWD`); SIGINT writes no partial output
- Manifest required on every generation; no cost guard (Voicebox is free)

**Workflow:** PREPARE (validate text/audio/language/path/profile) → ACQUIRE (clarify once if a signal is missing) → ACT (MCP `voicebox_speak` or `voicebox_transcribe`) → VERIFY (audio/transcript presence + manifest fields) → FINALIZE (write `manifest.json`, report path).

**Resources:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md`, plus `config/voice-config.yaml`.

---

## Charter preflight (CHARTER_CHECK)

Before writing any code, every implementation agent must output a CHARTER_CHECK block:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Purpose:**
- Declares what the agent will and will not do
- Catches scope creep before code is written
- Makes assumptions explicit for user review
- Provides testable success criteria

**Clarification levels:**
- **LOW**: Clear requirements. Proceed with stated assumptions.
- **MEDIUM**: Partially ambiguous. List options, proceed with most likely.
- **HIGH**: Very ambiguous. Set status to blocked, list questions, DO NOT write code.

In subagent mode (CLI-spawned), agents cannot ask users directly. LOW proceeds, MEDIUM narrows and interprets, HIGH blocks and returns questions for the orchestrator to relay.

---

## Two-layer skill loading

Each agent's knowledge is split across two layers:

**Layer 1: SKILL.md (~800 bytes)**
Always loaded. Contains frontmatter (name, description), when to use / not use, core rules, architecture overview, library list, and references to Layer 2 resources.

**Layer 2: resources/ (loaded on-demand)**
Loaded only when the agent is actively working, and only the resources matching the task type and difficulty:

| Difficulty | Resources Loaded |
|-----------|-----------------|
| **Simple** | execution-protocol.md only |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Additional resources are loaded during execution as needed:
- `checklist.md`: at the Verify step
- `error-playbook.md`: only when errors occur
- `common-checklist.md`: for final verification of Complex tasks

---

## Scoped execution

Agents operate under strict domain boundaries:

- A frontend agent will not modify backend code
- A backend agent will not touch UI components
- A DB agent will not implement API endpoints
- Agents document out-of-scope dependencies for other agents

When a task is discovered that belongs to a different domain during execution, the agent documents it in its result file as an escalation item, rather than attempting to handle it.

---

## Workspace strategy

For multi-agent projects, separate workspaces prevent file conflicts:

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Workspaces are specified with the `-w` flag when spawning agents:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestration flow

When running a multi-agent workflow (`/orchestrate` or `/work`):

1. **PM Agent** decomposes the request into domain-specific tasks with priorities (P0, P1, P2) and dependencies
2. **Session initialized**: session ID generated, `orchestrator-session.md` and `task-board.md` created in memory
3. **P0 tasks** spawned in parallel (up to MAX_PARALLEL concurrent agents)
4. **Progress monitored**: orchestrator polls `progress-{agent}.md` files every POLL_INTERVAL
5. **P1 tasks** spawned after P0 completes, and so on
6. **Verification loop** runs for each completed agent (self-review -> automated verify -> cross-review by QA)
7. **Results collected** from all `result-{agent}.md` files
8. **Final report** with session summary, files changed, remaining issues

---

## Agent definitions

Agents are defined in two locations:

**`.agents/agents/`**: Contains the abstract source-of-truth agent definitions, including:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`

These files define the agent's identity, execution protocol reference, CHARTER_CHECK template, architecture summary, and rules. They are used when spawning subagents via the Task/Agent tool (Claude Code) or CLI.

**Vendor-native projections**: OMA materializes the source definitions into runtime-specific agent files:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

These generated files are refreshed by `oma link`, `oma install`, and `oma update`.

---

## Runtime state (project memory store)

During orchestration sessions, agents coordinate through shared memory files in `.agents/state/memories/` (older projects fall back to the legacy `.serena/memories/` path; configurable via `mcp.json`):

| File | Owner | Purpose | Others |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orchestrator | Session ID, status, start time, phase tracking | Read-only |
| `task-board.md` | Orchestrator | Task assignments, priorities, status updates | Read-only |
| `progress-{agent}.md` | That agent | Turn-by-turn progress: actions taken, files read/modified, current status | Orchestrator reads |
| `result-{agent}.md` | That agent | Final output: status (completed/failed), summary, files changed, acceptance criteria checklist | Orchestrator reads |
| `session-metrics.md` | Orchestrator | Clarification Debt tracking, Quality Score progression | QA reads |
| `experiment-ledger.md` | Orchestrator/QA | Experiment tracking when Quality Score is active | All read |

Memory tools are configurable. By default agents read and write these coordination files directly with their native file tools (`Read`, `Write`, `Edit`), but custom tools and a custom base path can be configured in `mcp.json`:

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

Dashboards (`oma dashboard` and `oma dashboard:web`) watch these memory files for real-time monitoring.
