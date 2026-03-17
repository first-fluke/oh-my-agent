---
name: brainstorm
description: Design-first idea exploration — Understanding user intent and design workflow before implementation
disable-model-invocation: true
---

# /brainstorm

## Claude Code Adaptation

- Execute inline (no need to spawn subagents)
- Explore project using Grep, Glob, Read tools instead of MCP code analysis tools
- Save design docs: `docs/plans/<feature-name>-design.md`

## Key Steps Summary

1. **Explore Project Context**: Analyze existing codebase (Grep, Glob, Read)
2. **Clarification Questions**: Intent, scope, constraints, success criteria (one at a time). Ask questions one at a time. Prefer multiple-choice options where possible.
3. **Propose Approaches**: 2-3 alternatives + pros/cons + effort estimate → User selects. Include a trade-off comparison matrix for alternatives.
4. **Detail Design**: Present by sections, approve each section. Get explicit user approval per section before proceeding.
5. **Save Design**: `docs/plans/<feature-name>-design.md`
6. **Guide Next Steps**: Suggest running `/plan`

## Important

- NO code writing in this workflow
- Focus only on design and exploration
- Response language follows `language` setting in `.agents/config/user-preferences.yaml`

$ARGUMENTS
