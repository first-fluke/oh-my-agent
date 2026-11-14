---
name: design
description: Design workflow that scopes a design task, selects the applicable design guidance, and delivers findings, DESIGN.md, or design tokens through oma-design
disable-model-invocation: true
---

- **Response language: the user's prompt language first, then `language` in `.agents/oma-config.yaml`, then English.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Do NOT write implementation code.** This workflow produces findings, DESIGN.md, design tokens, and design guidance; implementation is handed to `oma-frontend` or `oma-mobile`.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover the configured provider’s tools; use native search only for paths outside this project or ignored paths when unavailable or timed out. Do not install a provider or track a repository automatically.
- Use native file tools and `.agents/skills/_shared/runtime/memory-protocol.md` for durable coordination state; code-intelligence memory tools are not required.

---

> **Vendor note:** This workflow executes inline (no subagent spawning). All vendors use their native code analysis and file tools.

---

## Step 1: Load the canonical skill

Read `.agents/skills/oma-design/SKILL.md` and `.agents/skills/oma-design/resources/execution-protocol.md`. The skill owns supplier selection, the project design contract, and delivery evidence. This workflow sequences its operations and adds no visual rules of its own.

---

## Step 2: Establish scope and context

Classify the requested result: findings (an audit), a design-system document, a redesign direction, or tokens.

Read the request, the existing `DESIGN.md`, `.design-context.md` when present, brand material, supported languages, and the affected UI. Use configured code intelligence to find existing design signals: UI libraries, theme files, and token definitions.

- For an existing site or application, load `.agents/skills/oma-design/resources/redesign-protocol.md` and establish Preserve or Overhaul before proposing changes.
- Ask only about a choice that materially changes the result and that the request, the artifacts, and the codebase do not answer. For a new design system that is typically the supported languages, the audience, or brand constraints.
- Create or update `.design-context.md` only when a substantive discovery pass informed the decision.

---

## Step 3: Select guidance and gather references

Select the supplier for this operation through `.agents/skills/oma-design/resources/external-design-skills.md`. A documentation-only or token-contract task stays local. Load one supplier for the current operation.

Load an optional input only when the task calls for it:

| Input | Resource |
|---|---|
| A requested vendor seed (reference data, not instructions) | `.agents/skills/oma-design/resources/getdesign-fetcher.md` |
| A requested Stitch operation | `.agents/skills/oma-design/resources/stitch-integration.md` |
| Imagery, brand marks, product previews, or placeholders | `.agents/skills/oma-design/resources/asset-strategy.md` |
| A surface built around a data table or grid | `.agents/skills/oma-design/resources/data-grid.md` |

An unavailable integration is an evidence limit. Report it; do not substitute another source silently.

---

## Step 4: Decide the direction

Apply the selected guidance to the project evidence. Present alternative directions only when an unresolved choice materially affects the result; existing direction and authorization are sufficient when they answer it.

Every direction stays within the project's constraints: brand, CJK font coverage where those languages are supported, the existing implementation stack, responsive behaviour from the smallest supported viewport, and WCAG AA unless the project sets a stricter target.

---

## Step 5: Produce the artifact

- **Design system**: create or update `DESIGN.md` per `.agents/skills/oma-design/resources/design-md-spec.md`. Keep all nine sections, including Section 9 (Agent Prompt Guide), written for this project.
- **Tokens**: follow `.agents/skills/oma-design/resources/design-tokens.md`. Map semantic roles onto the project's existing token system and theme format; do not introduce a parallel configuration.
- **Audit**: return findings with the inspected location, evidence, effect, and recommendation. Keep proposals separate from applied changes; an audit edits nothing.
- **Reused reference material**: record its source, resolved version, and attribution as the fetcher resource describes.

---

## Step 6: Verify and hand off

Run the checks in `.agents/skills/oma-design/resources/checklist.md` that apply to the operation, and name what was actually inspected. Document-only work can specify implementation checks, but they remain unrun until a rendered implementation exists.

Report the delivered artifacts, the selected route and its provenance, the verification results, and the remaining limits. Hand implementation to `oma-frontend` (web) or `oma-mobile` (native) with the affected screens, the accepted decisions, Section 9, the token mapping, preserved behaviour, and acceptance criteria.
