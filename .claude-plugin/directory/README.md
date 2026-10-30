# oh-my-agent

**Ship 400+ commits a day.**

oh-my-agent turns Claude into a team. A planner splits the work, engineers build in parallel, a reviewer checks the result, and a debugger fixes the root cause.

This plugin adds 33 skills and 12 specialist agents. Claude loads a skill only when a task needs it, so the rest stay out of your context.

## Agents

- **architecture-reviewer** Architecture review and recommendation. Use for system design, module boundaries, ADRs, and tradeoff analysis.
- **backend-engineer** Backend implementation. Use for API, authentication, DB migration work.
- **db-engineer** Database design and implementation specialist. Use for schema, ERD, migration, query tuning, vector DB work.
- **debug-investigator** Bug diagnosis and fix specialist. Error analysis, root cause identification, regression test writing.
- **docs-curator** Documentation drift detection and sync specialist. Use to update docs/**/*.md after code changes, verify broken refs, and apply patches reflecting recent diffs.
- **frontend-engineer** React/Next.js/Angular/TypeScript frontend implementation. Use for UI, components, styling work.
- **mobile-engineer** Flutter/React Native/Swift native/Kotlin Android native mobile implementation. Use for mobile app, widgets, SwiftUI, Jetpack Compose, platform feature work.
- **pm-planner** PM requirements analysis, task decomposition, API contract definition agent
- **qa-reviewer** OWASP security, performance, accessibility, code quality review agent
- **refactor-engineer** Behavior-preserving refactoring specialist. Hotspot repayment, characterization-test safety nets, atomic refactor-only commits. Never changes observable behavior.
- **research-explorer** Cross-source research specialist. Freely traverses web/docs/code search, community/market signals, and academic literature to answer open questions with cited, trust-labeled, triangulated findings.
- **tf-infra-engineer** Terraform infrastructure implementation and review. Use for cloud provisioning, IAM/OIDC, networking, and terraform plan review.

## Skills

- **oma-academic-writing** Draft and revise academic prose against a rubric, evidence, and citation requirements. Use for essays, reports, literature reviews, or academic style audits.
- **oma-architecture** Evaluate system boundaries and architectural tradeoffs. Use for architecture decisions, design reviews, and ADRs.
- **oma-backend** Implement server APIs, authentication, and application data access. Schema modeling and query tuning use oma-db.
- **oma-brainstorm** Explore goals, constraints, and alternative approaches before choosing a design. Use when the user requests ideation or design exploration.
- **oma-coordination** Coordinate assigned specialist tasks and handoffs manually. Use when supervising a multi-agent project step by step.
- **oma-db** Design schemas and migrations, tune queries, or plan vector retrieval and database operations. Application API implementation uses oma-backend.
- **oma-debug** Diagnose a reproducible failure, fix its cause, and verify the regression. Use for crashes, incorrect behavior, and failing tests.
- **oma-design** Define or review a visual system, DESIGN.md, or redesign direction. Use for typography, layout, color, motion, and interaction design decisions.
- **oma-dev-workflow** Configure development tasks, git hooks, CI/CD, or release automation. Use when creating or fixing a repository development workflow.
- **oma-docs** Check documentation references, sync docs to code changes, and detect translation drift. Use for documentation maintenance in a repository.
- **oma-explanation** Create an offline HTML explanation of a code change (diff, PR, branch) or of a topic, system, or question. Use when a visual walkthrough document is requested.
- **oma-frontend** Implement or modify web UI in React, Next.js, or Angular. Use for components, pages, styles, forms, and frontend state or data flows.
- **oma-hwp** Convert Hangul HWP, HWPX, or HWPML documents to Markdown with kordoc. Use for text, table, and image extraction from these formats.
- **oma-image** Generate raster images or reference-guided variations through the OMA image CLI. Use for image assets or explicit vendor comparisons; pixel editing uses an editor.
- **oma-market** Research customer pain points, trends, and competitors through the OMA market engine. Use for market discovery or voice-of-customer analysis.
- **oma-mobile** Implement Flutter, React Native, native Swift, or native Kotlin Android apps. Use for mobile screens, widgets, platform integrations, and application data flows.
- **oma-observability** Design or troubleshoot telemetry, SLOs, and incident diagnostics. Route to the relevant signal, system boundary, or vendor guide.
- **oma-orchestration** Dispatch and supervise parallel specialist agents with durable task state. Use when automated multi-agent execution is requested.
- **oma-pdf** Extract PDF text, headings, tables, and images into Markdown using opendataloader-pdf. Use for PDF parsing, not PDF layout creation.
- **oma-pm** Turn product requirements into scoped tasks with dependencies and acceptance criteria. Use for implementation planning and prioritization.
- **oma-qa** Review changes for correctness, security, accessibility, and performance. Use for scoped quality reviews or verification plans; bug fixes use oma-debug.
- **oma-recap** Summarize AI conversation histories for a specified date or period. Use for daily work recaps and cross-tool activity summaries.
- **oma-refactor** Restructure existing code while preserving observable behavior. Use for targeted technical debt or hotspot work with characterization tests.
- **oma-scholar** Search academic literature and generate, validate, or compare Knows paper sidecars. Use for claim/evidence analysis and literature synthesis.
- **oma-scm** Manage Git branches, merges, conflicts, commits, and release baselines. Use for repository history and change-management operations.
- **oma-search** Find external documentation, web sources, or remote code with citations. Local code navigation uses the configured code tools.
- **oma-security** Scan application source, agent skills, and MCP components; run penetration tests against scoped web test deployments, validate findings, and configure scan gates. Use oma-qa for broad quality reviews and domain skills for remediation.
- **oma-skill-creation** Create or revise OMA skills and their references. Use for skill routing, execution contracts, conditional loading, and authoring validation.
- **oma-slide** Create, import, revise, or export presentation decks through the OMA slide CLI or the ppt-master route. Use for HTML slides, editable PPTX, and PDF, PNG, or PPTX deck delivery.
- **oma-tf-infra** Create or review Terraform infrastructure and plans. Use for cloud resources, IAM, networking, state management, and infrastructure changes.
- **oma-translation** Translate or revise localized UI strings and prose while preserving meaning, terminology, placeholders, and structure.
- **oma-video** Create videos through the OMA video CLI, or analyze and edit existing clips with media tools. Use for frame extraction, visual analysis, silence cuts, dubbing assembly, sound effects, scripts, and composition; audio-only work uses oma-voice.
- **oma-voice** Generate or transcribe speech with Voicebox or VoiceStudio, or process existing audio locally. Use for narration, transcripts, timed speech, and loudness conversion; video editing uses oma-video.

## What this plugin runs

This plugin has no hooks, no MCP servers, and no install step. It only adds instructions.

Some skills ask Claude to run local tools such as `git`, `gh`, or the `oma` command line tool when they are installed. A few skills can call services you set up yourself, such as a search, image, or video provider. Claude runs those commands under your normal permission settings, and nothing runs on its own.

For workflows, project hooks, and the `oma` command line tool, install the full runtime from [first-fluke/oh-my-agent](https://github.com/first-fluke/oh-my-agent).

## License

MIT
