---
title: 프로젝트 구조
description: CLI와 web 문서 워크스페이스 분리 이후의 최신 레포 구조.
---

# 프로젝트 구조

현재 모노레포(`cli` + `web` 워크스페이스) 기준 최신 디렉토리 트리입니다.

## 최상위 트리

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

## 핵심 변경점

- CLI 소스가 `src/`에서 `cli/`로 이동했습니다.
- 문서 본문은 `web/content/{lang}/{group}/*.md`에서 관리합니다.
- 루트 `docs/`는 컨슈머용 템플릿/데모 전용으로 유지합니다.
