---
name: deepinit
description: Project harness initialization — Generate AGENTS.md, ARCHITECTURE.md, docs/ structure
disable-model-invocation: true
---

# /deepinit

Response language follows the `language` setting in `.agents/config/user-preferences.yaml`.

## Claude Code Adaptation

- Execute inline
- Analyze codebase using Read, Glob, Grep, Bash tools
- Create files: Use Write tool
- Respect `.gitignore`; skip framework-generated cross-platform build directories (android, ios, macos, linux, windows, web)

## Step 1: Analyze Codebase

5-part analysis using Glob, Grep, Read:

1. **Project type** — monorepo / single app / library; packages, apps, services; tech stacks
2. **Architectural patterns** — layer structure, module boundaries, dependency direction, naming conventions, test organization
3. **Implicit rules** — import restrictions, error handling conventions, state management, code organization per domain
4. **Domain assessment** — which areas need domain-specific guidance (frontend, backend, mobile, infra, security-sensitive, reliability-critical)
5. **Boundary detection** — where boundary AGENTS.md files are needed (root always; each package/app in monorepo; major architectural boundaries; NOT every subdirectory)

Report findings before proceeding.

## Step 2: Generate ARCHITECTURE.md

Content: domain map, package layering, dependency direction, data flow, key integration points. Include mermaid diagrams where helpful.

Rules: under 200 lines; topology and relationships only, not implementation details.

## Step 3: Generate docs/ Knowledge Base

Generate only files **relevant and discoverable** from the codebase.

Directory structure:

```
docs/
├── design-docs/
│   ├── index.md           ← catalogue with status (draft/verified/superseded)
│   ├── core-beliefs.md    ← agent-first operating principles
│   └── {decision-name}.md
├── exec-plans/
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── product-specs/
│   ├── index.md
│   └── {feature-name}.md
├── references/
│   └── {library}-llms.txt
├── generated/
├── DESIGN.md, FRONTEND.md, PLANS.md
├── QUALITY-SCORE.md, RELIABILITY.md, SECURITY.md
└── CODE-REVIEW.md
```

Domain docs generation (root-level in `docs/`):

| File | When |
|------|------|
| `DESIGN.md` | Project has UI/design system |
| `FRONTEND.md` | Project has frontend |
| `PLANS.md` | Always |
| `QUALITY-SCORE.md` | Always |
| `RELIABILITY.md` | Has backend/infra |
| `SECURITY.md` | Has auth/data handling |
| `CODE-REVIEW.md` | Always |

Write only what was discovered. Mark uncertain patterns `<!-- TODO: confirm this rule -->`.

## Step 4: Generate Root AGENTS.md

~100 lines. Sections:

- **Architecture** — link to ARCHITECTURE.md
- **Documentation** — links to design-docs, exec-plans, product-specs, references
- **Domain Guides** — only docs actually generated
- **Quality & Planning** — QUALITY-SCORE.md, CODE-REVIEW.md, PLANS.md, tech-debt-tracker.md
- **Project Structure** — brief layout; links to boundary AGENTS.md files
- **Quick Rules** — 3-5 critical rules every agent must know, inlined
- `<!-- MANUAL: Notes below this line are preserved on regeneration -->`

Rules: no file listings; every line points somewhere or states a rule; no dead links.

## Step 5: Generate Boundary AGENTS.md Files

Only at package/app boundaries in monorepos. Max 50 lines each.

Template:

```markdown
<!-- Parent: ../AGENTS.md -->

# {Package/App Name}

> {One-line purpose}

## Constraints
{Rules specific to this boundary}

## Working Here
{How to correctly add/modify code in this area}

## Dependencies
- Depends on: {internal deps}
- Depended on by: {reverse deps}

<!-- MANUAL: Notes below this line are preserved on regeneration -->
```

## Step 5.5: Update Mode

If existing AGENTS.md found:

1. Re-analyze codebase to detect changes since last generation
2. Compare existing docs against current code reality
3. Preserve all `<!-- MANUAL: -->` and `<!-- TODO: -->` blocks exactly
4. Flag potentially stale rules: `<!-- REVIEW: this rule may be outdated -->`
5. Move completed exec-plans from `active/` to `completed/`
6. Report all changes to the user

## Step 6: Verify

Validation checklist:

- No dead links — every file referenced in AGENTS.md exists
- All `<!-- Parent: -->` references in boundary AGENTS.md resolve correctly
- ARCHITECTURE.md consistent with actual package/module structure
- No docs/ file contains agent-derivable info (file listings, symbol enumerations)
- Line limits met: ARCHITECTURE.md < 200, root AGENTS.md ~100, boundary AGENTS.md < 50
- `docs/design-docs/index.md` lists all design docs that exist
- `docs/product-specs/index.md` lists all product specs that exist

Report validation results to the user.

$ARGUMENTS
