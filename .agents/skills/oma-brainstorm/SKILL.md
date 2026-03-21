---
name: oma-brainstorm
description: Design-first ideation that explores user intent, constraints, and approaches before any planning or implementation. Use for brainstorming, ideation, exploring concepts, and evaluating approaches.
---

# Brainstorm - Design-First Ideation

## When to use
- Exploring a new feature idea before planning
- Understanding user intent and constraints before committing to an approach
- Comparing multiple design approaches with trade-offs
- When the user says "I have an idea" or "let's design something"
- Before invoking `/plan` for complex or ambiguous requests

## When NOT to use
- Requirements are already clear and well-defined -> use pm-agent directly
- Implementing actual code -> delegate to specialized agents
- Performing code reviews -> use QA Agent
- Debugging existing issues -> use debug-agent

## Core Rules
1. **No implementation or planning before design approval** - brainstorm produces a design document, not code or task plans
2. **One question at a time** - ask clarifying questions sequentially, not in batches
3. **Always propose 2-3 approaches** - include a recommended option with trade-off analysis
4. **Section-by-section design** - present design incrementally with user confirmation at each step
5. **YAGNI** - do not over-engineer; design only what is needed for the stated goal
6. **Save design, then transition** - persist the approved design document before handing off to `/plan`

## How to Execute
Follow the brainstorm workflow step by step:
1. **Phase 1 - Context**: Explore the existing codebase and understand the project landscape
2. **Phase 2 - Questions**: Ask clarifying questions one at a time to understand intent and constraints
3. **Phase 3 - Approaches**: Propose 2-3 approaches with a recommended option and trade-off matrix
4. **Phase 4 - Design**: Present the detailed design section by section, getting user approval at each step
5. **Phase 5 - Documentation**: Save the approved design to `docs/plans/` and project memory
6. **Phase 6 - Transition**: Hand off to `/plan` for task decomposition

## Common Pitfalls
- **Jumping to solutions**: Asking "how" before fully understanding "what" and "why"
- **Too many questions at once**: Overwhelming the user with a wall of questions
- **Single approach bias**: Presenting only one option without alternatives
- **Over-engineering**: Designing for hypothetical future requirements instead of stated needs
- **Skipping confirmation**: Moving forward without explicit user approval on design decisions

## Execution Protocol (CLI Mode)

See `../_shared/execution-protocols/` for vendor-specific protocols.
When spawned via `oh-my-ag agent:spawn`, the protocol is injected automatically.

## References
- Context loading: `../_shared/context-loading.md`
- Reasoning templates: `../_shared/reasoning-templates.md`
- Clarification protocol: `../_shared/clarification-protocol.md`
- Quality principles: `../_shared/quality-principles.md`
- Skill routing: `../_shared/skill-routing.md`
