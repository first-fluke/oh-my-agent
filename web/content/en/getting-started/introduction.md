---
title: Introduction
description: What oh-my-agent is and how multi-agent collaboration works.
---

# Introduction

oh-my-agent is a multi-agent orchestrator for AI IDEs. It routes requests to specialized skills and coordinates agents through Serena memories.

## What You Get

- Request-driven skill routing
- Workflow-based execution for planning/review/debugging
- CLI orchestration for parallel agent runs
- Real-time dashboards for session monitoring

## Agent Roles

| Agent | Responsibility |
|---|---|
| oma-coordination | Coordinates complex multi-domain projects |
| oma-pm | Planning and architecture decomposition |
| oma-frontend | React/Next.js implementation |
| oma-backend | API/database/auth implementation |
| oma-mobile | Flutter/mobile implementation |
| oma-qa | Security/performance/accessibility review |
| oma-debug | Root-cause analysis and regression-safe fixes |
| oma-brainstorm | Design-first ideation and concept exploration |
| oma-db | Database modeling, schema design, and query tuning |
| oma-dev-workflow | Developer workflow optimization and CI/CD |
| oma-tf-infra | Terraform infrastructure-as-code provisioning |
| oma-translator | Context-aware multilingual translation |
| oma-orchestrator | CLI-based sub-agent orchestration |
| oma-commit | Conventional commit workflow |

## Project Structure

- `.agents/skills/`: skill definitions and resources
- `.agents/workflows/`: explicit workflow commands
- `.serena/memories/`: runtime orchestration state
- `cli/cli.ts`: source of truth for command interfaces

## Progressive Disclosure

1. Identify request intent
2. Load only required skill resources
3. Execute with specialized agents
4. Verify and iterate via QA/debug loops
