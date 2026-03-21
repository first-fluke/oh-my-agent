---
title: Agents
description: Agent types, workspace strategy, and orchestration flow.
---

# Agents

## Agent Categories

- Ideation: Brainstorm
- Planning: PM agent
- Implementation: Frontend, Backend, Mobile, DB
- Infrastructure: TF-infra agent
- DevOps: Dev-workflow
- Assurance: QA, Debug
- Localization: Translator
- Coordination: oma-coordination, oma-orchestrator

## Workspace Strategy

Separate workspaces reduce merge conflicts:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Agent Manager Flow

1. PM defines decomposition
2. Domain agents execute in parallel
3. Progress streams into Serena memories
4. QA validates system-level consistency

## Serena Runtime Files

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
