# oh-my-agent

This plugin adds the oh-my-agent (oma) skills, rules, and specialist agents.

- Load a skill with `/<skill-name>` (for example `/oma-pm`, `/oma-qa`, `/oma-debug`) when a task needs it; only its name and description are loaded until then.
- Agent definitions stay in English; respond in the user's prompt language.
- Workflows and project hooks need the `oma` CLI (`npm i -g oh-my-agent`), which also installs the native Antigravity hook bridge. Skills and agents work without it.

## Agents

- **architecture-reviewer**: Architecture review and recommendation. Use for system design, module boundaries, ADRs, and tradeoff analysis.
- **backend-engineer**: Backend implementation. Use for API, authentication, DB migration work.
- **db-engineer**: Database design and implementation specialist. Use for schema, ERD, migration, query tuning, vector DB work.
- **debug-investigator**: Bug diagnosis and fix specialist. Error analysis, root cause identification, regression test writing.
- **docs-curator**: Documentation drift detection and sync specialist. Use to update docs/**/*.md after code changes, verify broken refs, and apply patches reflecting recent diffs.
- **frontend-engineer**: React/Next.js/Angular/TypeScript frontend implementation. Use for UI, components, styling work.
- **mobile-engineer**: Flutter/React Native/Swift native/Kotlin Android native mobile implementation. Use for mobile app, widgets, SwiftUI, Jetpack Compose, platform feature work.
- **pm-planner**: PM requirements analysis, task decomposition, API contract definition agent
- **qa-reviewer**: OWASP security, performance, accessibility, code quality review agent
- **refactor-engineer**: Behavior-preserving refactoring specialist. Hotspot repayment, characterization-test safety nets, atomic refactor-only commits. Never changes observable behavior.
- **research-explorer**: Cross-source research specialist. Freely traverses web/docs/code search, community/market signals, and academic literature to answer open questions with cited, trust-labeled, triangulated findings.
- **tf-infra-engineer**: Terraform infrastructure implementation and review. Use for cloud provisioning, IAM/OIDC, networking, and terraform plan review.

## Skills

- `/oma-academic-writing`
- `/oma-architecture`
- `/oma-backend`
- `/oma-brainstorm`
- `/oma-coordination`
- `/oma-db`
- `/oma-debug`
- `/oma-design`
- `/oma-dev-workflow`
- `/oma-docs`
- `/oma-explanation`
- `/oma-frontend`
- `/oma-hwp`
- `/oma-image`
- `/oma-market`
- `/oma-mobile`
- `/oma-observability`
- `/oma-orchestration`
- `/oma-pdf`
- `/oma-pm`
- `/oma-qa`
- `/oma-recap`
- `/oma-refactor`
- `/oma-scholar`
- `/oma-scm`
- `/oma-search`
- `/oma-security`
- `/oma-skill-creation`
- `/oma-slide`
- `/oma-tf-infra`
- `/oma-translation`
- `/oma-video`
- `/oma-voice`
