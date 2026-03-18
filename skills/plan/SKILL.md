---
name: plan
description: PM-based requirements analysis, task decomposition, API contract definition
disable-model-invocation: true
---

# /plan

## Claude Code Adaptation

- Execute PM Agent logic inline (no need to spawn subagents)
- Analyze code using Read, Grep, Glob tools instead of MCP tools
- Save plans: `.agents/plan.json` (maintain compatibility)
- Optionally save to `docs/exec-plans/active/` as well
- Response language follows `language` setting in `.agents/config/user-preferences.yaml`

## Key Steps Summary

1. **Requirements Gathering**: User description, target users, features, constraints, deployment target (web, mobile, both)
2. **Technical Feasibility Analysis**: Codebase analysis (using Glob, Grep, Read)
3. **API Contract Definition**: Per-endpoint spec includes Method, path, request/response schemas, auth requirements, error responses. Save to `.agents/skills/_shared/api-contracts/`
4. **Task Decomposition**: agent, title, acceptance criteria, priority (P0-P3), dependencies
5. **User Review**: Always get user confirmation before saving
6. **Save Plan**: `.agents/plan.json` + memory. For complex plans (many tasks, multi-domain), also create exec-plan artifact in `docs/exec-plans/active/` per exec-plan format

## Guidance After Output

When plan is complete, guide user on execution options:
- `/orchestrate` — Automatic parallel execution
- `/coordinate` — Task-based coordinated execution
- `/ultrawork` — 5-phase Phase Gate execution

$ARGUMENTS
