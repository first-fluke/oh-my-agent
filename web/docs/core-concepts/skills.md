---
title: Skills
description: Complete guide to OMA's 33-skill two-layer architecture, including SKILL.md routing, on-demand resources, shared and conditional protocols, vendor execution, token measurements, and routing mechanics.
---

# Skills

Skills are structured knowledge packages that give a dispatch role its domain guidance. They contain execution protocols, tech stack references, code templates, error playbooks, quality checklists, and examples where the skill supplies them, organized in a two-layer architecture designed for token efficiency.

---

## The two-layer design

### Layer 1: SKILL.md (loaded when the skill is routed)

Every skill has a `SKILL.md` file at its root. It enters the context window when the skill is routed to — the injector hook passes a **path reference**, not the body, so an unrouted skill costs nothing beyond its `description`. It contains:

- **YAML frontmatter** with `name` and `description` (used for routing and display)
- **When to use / When NOT to use**: explicit activation conditions
- **Core rules**: the 5-15 most critical constraints for the domain
- **Architecture overview**: how code should be structured
- **Library list**: approved dependencies and their purposes
- **References**: pointers to Layer 2 resources (never loaded automatically)

Example frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

The description field is critical because it contains the routing keywords that the skill routing system uses to match tasks to agents.

### Layer 2: resources/ (loaded on-demand)

The `resources/` directory contains deep execution knowledge. These files are loaded only when:
1. The host or workflow has selected the skill (for example, through a native skill match or an explicit command)
2. The current task meets the reference's loading condition

This on-demand loading is governed by the context-loading guide (`.agents/skills/_shared/core/context-loading.md`), which distinguishes entry instructions from task-selected references.

---

## File structure example

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Per-skill resource types

| Resource Type | Filename Pattern | Purpose | When Loaded |
|--------------|-----------------|---------|-------------|
| **Execution Protocol** | `execution-protocol.md` | Step-by-step workflow: Analyze -> Plan -> Implement -> Verify | Selected operation needs its command or contract details |
| **Tech Stack** | `tech-stack.md` | Detailed technology specs, versions, configuration | Selected framework or stack decision |
| **Error Playbook** | `error-playbook.md` | Recovery procedures with "3 strikes" escalation | On error only |
| **Checklist** | `checklist.md` | Domain-specific quality verification | At Verify step |
| **Snippets** | `snippets.md` | Copy-paste ready code patterns | Unfamiliar implementation or output shape |
| **Examples** | `examples.md` or `examples/` | Few-shot input/output examples for the LLM | Unfamiliar implementation or output shape |
| **Variants** | `variants/` directory | Language/framework-specific references. Backend ships `node`, `python`, and `rust` seeds; mobile ships a schema and can receive generated platform references. | When a matching stack exists |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Boilerplate file templates | On component creation |
| **Domain Reference** | `orm-reference.md`, `anti-patterns.md`, etc. | Deep domain knowledge for specific subtasks | Task-type specific |

---

## Shared resources (_shared/)

All agents share common foundations from `.agents/skills/_shared/`. These are organized into three categories:

### Core resources (`.agents/skills/_shared/core/`)

| Resource | Purpose | When Loaded |
|----------|---------|-------------|
| **`skill-routing.md`** | Routes by task outcome, ownership, and actual dependencies; no compulsory agent chain or turn quota. | Referenced by orchestrator and coordination skills |
| **`context-loading.md`** | Owning entry, conditional references, and runtime loading boundaries. | When composing context |
| **`prompt-structure.md`** | Guides unfamiliar task handoffs with goal, context, real constraints, and acceptance evidence; no mandatory template for direct tasks. | Referenced by PM agent and all workflows |
| **`clarification-protocol.md`** | Resolves routine details from context and asks only for material missing information or authorization. | When requirements are ambiguous |
| **`context-budget.md`** | File-size estimates, actual prompt measurement, scoped reads, and checkpoints. | Long tasks or context overhead diagnosis |
| **`difficulty-guide.md`** | Chooses planning depth and deliverables from dependencies and verification needs. | When decomposition needs a difficulty estimate |
| **`quality-principles.md`** | Scope, maintainability, evidence, and proportionate verification guidance. | At workflow start for quality-focused workflows (ultrawork) |
| **`vendor-detection.md`** | Protocol for detecting the current runtime environment (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen, and CLI fallback). Uses host markers and configured vendor state. | At workflow start |
| **`session-metrics.md`** | Optional session evidence without conversational or evaluator penalty scores. | Requested retrospective or material correction |
| **`common-checklist.md`** | Applicable cross-domain checks; no global line-count limits or blanket catch requirement. | Cross-domain review when relevant |
| **`lessons-learned.md`** | Capture and apply evidence-backed lessons with version/trigger conditions; no automatic RCA threshold. | Referenced after errors and at session end |
| **`api-contracts/`** | Optional contract template. Reuse project schemas; generated contracts live outside the skill source. | When cross-boundary work is planned |

### Runtime resources (`.agents/skills/_shared/runtime/`)

| Resource | Purpose |
|----------|---------|
| **`memory-protocol.md`** | Memory file format and operations for CLI subagents. Defines On Start, During Execution, and On Completion protocols using configurable memory tools (read/write/edit). Includes experiment tracking extension. |
| **`execution-protocols/claude.md`** | Claude Code-specific execution patterns. Injected by `oma agent spawn` when vendor is claude. |
| **`execution-protocols/antigravity.md`** | Antigravity CLI (`agy`) execution patterns. |
| **`execution-protocols/codex.md`** | Codex CLI-specific execution patterns. |
| **`execution-protocols/commandcode.md`** | CommandCode execution patterns. |
| **`execution-protocols/grok.md`** | Grok execution patterns. |
| **`execution-protocols/kimi.md`** | Kimi Code execution patterns. |
| **`execution-protocols/kiro.md`** | Kiro execution patterns. |
| **`execution-protocols/opencode.md`** | OpenCode extension execution patterns. |
| **`execution-protocols/pi.md`** | pi extension execution patterns. |
| **`execution-protocols/qwen.md`** | Qwen CLI-specific execution patterns. |

Vendor-specific execution protocols are injected automatically for CLI-spawned agents by `oma agent spawn`. Native subagents use the selected vendor's integration rules.

### Conditional resources (`.agents/skills/_shared/conditional/`)

These are loaded only when specific conditions are met during execution:

| Resource | Trigger Condition | Loaded By |
|----------|-------------------|-----------|
| **`quality-score.md`** | A defined baseline or experiment comparison is needed | Orchestrator (passes to QA agent prompt) |
| **`experiment-ledger.md`** | First experiment is recorded after establishing an IMPL baseline | Orchestrator (inline, after baseline measurement) |
| **`exploration-loop.md`** | Repeated recovery fails and alternatives merit testing within budget | Orchestrator (inline, before spawning hypothesis agents) |

These resources are deferred until their individual triggers apply. Difficulty alone does not inject them.

---

## How skills route via skill-routing.md

The skill routing map defines how tasks are matched to agents:

### Simple routing (single domain)

A prompt containing "Build a login form with Tailwind CSS" matches the keywords `UI`, `component`, `form`, `Tailwind`, and routes to **oma-frontend**.

### Complex request routing

Multi-domain requests follow established execution orders:

| Request Pattern | Execution Order |
|----------------|----------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) parallel -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) parallel -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> relevant agents -> oma-qa |
| "Do everything automatically" | oma-orchestration (internally: oma-pm -> agents -> oma-qa) |

### Inter-agent dependency rules

**Can run in parallel (no dependencies):**
- oma-backend + oma-frontend (when API contract is pre-defined)
- oma-backend + oma-mobile (when API contract is pre-defined)
- oma-frontend + oma-mobile (independent of each other)

**Must run sequentially:**
- oma-brainstorm -> oma-pm (design comes before planning)
- oma-pm -> all other agents (planning comes first)
- implementation agent -> oma-qa (review after implementation)
- oma-backend -> oma-frontend/oma-mobile (when no pre-defined API contract)

**QA is always last**, except when the user requests review of specific files only.

---

## Token savings math

Measure before claiming savings:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

The script reports UTF-8 bytes / 4 estimates for file-size scenarios. `routed` is the entry alone; `simple`, `medium`, and `complex` add hypothetical protocol, example, and stack files for comparison. Their names are retained for script compatibility, not as preload instructions. `all` is a resource-size ceiling, not a runtime configuration. A fresh checkout may use one platform seed as a size proxy; it does not load every platform.

The context command displays the actual task-context injection. It does not include the rest of the conversation or every host/runtime instruction. Use an assembled prompt or usage telemetry to measure total input tokens, latency, and cost on a named model. Do not infer those from repository size or generated mirror counts.

## Resource loading by task

Every difficulty level starts with the owning skill. The graph is a reference index; adjacency does not authorize loading another specialist, an error playbook, or a conditional experiment workflow.

The loader uses soft budgets of 1,500 / 4,000 / 8,000 estimated tokens for Simple / Medium / Complex. An entry that exceeds the budget is retained and the overrun is reported. Supporting references remain deferred unless explicitly selected after their task trigger is resolved. A required entry is never replaced with smaller unrelated documents.

Verification follows the task's risk and project requirements. A difficulty label does not require a full test suite, a fixed preflight response, or a second approval of already authorized work.

## Context-loading task maps (per agent)

These are examples of references to consult when the task needs them. Use the owning skill's current index and select only applicable sections:

### Backend agent

| Task Type | Required Resources |
|-----------|-------------------|
| CRUD API creation | matching `variants/{node,python,rust}/snippets.md` when present |
| Authentication | matching variant `snippets.md` + `tech-stack.md` when present |
| DB migration | matching variant `snippets.md` when present |
| Performance optimization | `orm-reference.md` and any matching examples supplied by the skill |
| Existing code modification | project code-intelligence provider and relevant execution resources |

### Frontend agent

| Task Type | Required Resources |
|-----------|-------------------|
| Component creation | snippets.md + the project’s existing component patterns |
| Form implementation | snippets.md (form + Zod) |
| API integration | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Page layout | snippets.md (grid) |

### Design agent

| Task Type | Required Resources |
|-----------|-------------------|
| Design system creation | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Landing page design | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| Design audit | checklist.md + anti-patterns.md |
| Design token export | design-tokens.md |
| 3D / shader effects | reference/shader-and-3d.md + reference/motion-design.md |
| Accessibility review | reference/accessibility.md + checklist.md |

### QA agent

| Task Type | Required Resources |
|-----------|-------------------|
| Security review | checklist.md (Security section) |
| Performance review | checklist.md (Performance section) |
| Accessibility review | checklist.md (Accessibility section) |
| Full audit | checklist.md (full) + self-check.md |
| Defined metric comparison | quality-score.md (conditional) |

---

## Orchestrator prompt composition

When the orchestrator composes prompts for subagents, it includes only task-relevant resources:

1. Owning SKILL.md path (CLI dispatch already injects the body)
2. A selected operation's execution-protocol section when needed
3. Resources matching the specific task type (from the maps above)
4. The relevant error-playbook section only after an observed failure
5. Memory Protocol (CLI mode)

This targeted composition avoids loading unnecessary resources, maximizing the subagent's available context for actual work.

---

## Session evidence and retrospective review

Session records capture material corrections, scope changes, rework, and adjudicated review findings with evidence. Necessary clarification carries no penalty. The former CD and EA weighted scores and threshold-triggered RCA rules have been removed; they were prompt instructions, not CLI-computed metrics.

Use existing task results where possible. A separate `session-metrics-{sessionId}.md` is optional under the configured coordination store. A repeated failure or requested retrospective may justify a lesson, but an ordinary failing check or a disputed finding does not automatically establish one. Keep historical logs; do not rewrite them into the new format.

`oma stats` reports productivity and recorded usage/cost summaries. `oma retro` groups actual gate, blocker, and missing-decision events into suggestions. Neither computes CD/EA scores from these Markdown artifacts.

## Task decomposition and context recovery

Plan around dependencies and independently verifiable behavior. Fixed sprint counts, file counts, and turn estimates do not determine review depth or completion. Keep tests and error handling with the behavior they verify.

For an observed stall or loss of useful context, save completed work, remaining criteria, relevant paths, and verification evidence before resuming or re-dispatching. Preserve existing work and avoid duplicating a live attempt. A turn/progress ratio alone does not require a reset.

## Conditional measurement and exploration

A defined baseline or experiment comparison activates measurement guidance; simply having tests or lint does not. Record comparable metrics with units, method, revision, and evidence. Required correctness and security checks remain independent. OMA has no default composite formula, letter-grade gate, or score-triggered rollback.

An actual experiment records its hypothesis, baseline and candidate evidence, required checks, decision, and owned files. Repeated failures may justify testing another mechanism within the existing recovery budget. Isolate experiment changes, preserve unrelated edits, and verify the integrated candidate before resuming the gate.
