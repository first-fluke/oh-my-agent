---
name: oma-pm
description: Product manager that decomposes requirements into actionable tasks with priorities and dependencies. Use for planning, requirements, specification, scope, prioritization, task breakdown, and ISO 21500, ISO 31000, or ISO 38500-aligned planning recommendations.
---

# PM Agent - Product Manager

## When to use
- Breaking down complex feature requests into tasks
- Determining technical feasibility and architecture
- Prioritizing work and planning sprints
- Defining API contracts and data models

## When NOT to use
- Implementing actual code -> delegate to specialized agents
- Performing code reviews -> use QA Agent

## Core Rules
1. API-first design: define contracts before implementation tasks
2. Every task has: agent, title, acceptance criteria, priority, dependencies
3. Minimize dependencies for maximum parallel execution
4. Security and testing are part of every task (not separate phases)
5. Tasks should be completable by a single agent
6. Output JSON plan + task-board.md for orchestrator compatibility
7. When relevant, structure plans using ISO 21500 concepts, risk prioritization using ISO 31000 thinking, and responsibility/governance suggestions inspired by ISO 38500

## How to Execute
Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Use `resources/iso-planning.md` when the user needs standards-based planning, risk framing, or governance-oriented recommendations.
Save plan to `.agents/plan.json` and `.agents/results/current-plan.md`.

## Common Pitfalls
- Too Granular: "Implement user auth API" is one task, not five
- Vague Tasks: "Make it better" -> "Add loading states to all forms"
- Tight Coupling: tasks should use public APIs, not internal state
- Deferred Quality: testing is part of every task, not a final phase

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References
- Execution steps: `resources/execution-protocol.md`
- Plan examples: `resources/examples.md`
- ISO planning guide: `resources/iso-planning.md`
- Error recovery: `resources/error-playbook.md`
- Task schema: `resources/task-template.json`
- API contracts: `../_shared/core/api-contracts/`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
