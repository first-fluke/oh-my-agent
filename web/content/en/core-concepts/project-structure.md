---
title: Project Structure
description: Updated repository tree after splitting CLI and web docs workspaces.
---

# Project Structure

Updated directory tree for the current monorepo layout (`cli` + `web` workspaces).

## Top-Level Tree

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml
│   ├── workflows/
│   │   ├── brainstorm.md
│   │   ├── coordinate.md
│   │   ├── debug.md
│   │   ├── deepinit.md
│   │   ├── exec-plan.md
│   │   ├── orchestrate.md
│   │   ├── plan.md
│   │   ├── review.md
│   │   ├── setup.md
│   │   ├── tools.md
│   │   └── ultrawork.md
│   └── skills/
│       ├── _shared/
│       ├── oma-backend/
│       ├── oma-brainstorm/
│       ├── oma-commit/
│       ├── oma-db/
│       ├── oma-debug/
│       ├── oma-dev-workflow/
│       ├── oma-frontend/
│       ├── oma-mobile/
│       ├── oma-orchestrator/
│       ├── oma-pm/
│       ├── oma-qa/
│       ├── oma-tf-infra/
│       ├── oma-translator/
│       └── oma-coordination/
├── .github/
│   └── workflows/
│       ├── release-please.yml
│       └── docs-deploy.yml
├── .serena/
│   └── memories/
├── cli/
│   ├── bin/
│   │   └── cli.js
│   ├── package.json
│   ├── cli.ts
│   ├── commands/
│   ├── lib/
│   ├── types/
│   ├── __tests__/
│   ├── dashboard.ts
│   ├── terminal-dashboard.ts
│   └── generate-manifest.ts
├── web/
│   ├── content/
│   │   ├── en/
│   │   │   ├── getting-started/
│   │   │   ├── core-concepts/
│   │   │   ├── guide/
│   │   │   └── cli-interfaces/
│   │   └── ko/
│   │       ├── getting-started/
│   │       ├── core-concepts/
│   │       ├── guide/
│   │       └── cli-interfaces/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── next.config.ts
├── docs/
│   ├── consumer-templates/
│   └── demo/
├── package.json
├── bun.lock
├── README.md
└── README.ko.md
```

## Key Notes

- CLI source moved from `src/` to `cli/`.
- Documentation pages are now maintained under `web/content/{lang}/{group}/*.md`.
- Root `docs/` is now reserved for templates and demos used by consumers.
