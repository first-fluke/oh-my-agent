# Design Execution Protocol

Use this protocol for the selected design operation. OMA owns project context,
supplier selection, the project design contract, and delivery evidence. The
selected upstream skill owns its visual methods and examples.

## 1. Establish scope and context

Read the request, existing `DESIGN.md`, relevant brand material, project languages,
and affected UI. For an existing product, follow
[redesign-protocol.md](redesign-protocol.md) before proposing changes.

Classify the requested result: findings, a design-system document, a redesign
direction, or implementation. An audit inspects and reports; it does not edit
product source, `DESIGN.md`, tokens, dependencies, or tool configuration. Apply
changes when the task authorizes them, using the authorized scope throughout.

Record only context needed by the decision: audience, supported languages,
brand constraints, affected screens, existing stack, and unresolved material
choices. Reuse `.design-context.md` when present. Create or update it when that
document is part of the authorized deliverable. Distinguish observed product
facts from assumptions; do not invent claims, metrics, endorsements, or assets.

## 2. Select the applicable guidance

Follow [external-design-skills.md](external-design-skills.md) to resolve the
intent. For a local contract task, apply the existing design decision without
loading a supplier. For an external route, load one appropriate upstream skill
using its actual location, complete instructions, and relevant support files.
Record its source and resolved version or revision when available.

Keep the supplier's guidance within the task. Project brand, CJK coverage,
existing architecture, and authorized scope constrain its recommendations.
Loading a design skill does not authorize a framework migration or dependency
change. Follow the routing resource's failure path if the supplier is unavailable.

For a compound request, finish the current operation before loading guidance
for a different operation. Do not preload multiple visual cookbooks.

## 3. Apply upstream guidance to project evidence

For an external route, use the selected upstream procedure for visual reasoning,
critique, or direction. A local contract task applies the existing project
decision directly. Retain resulting project decisions here; do not reproduce
the upstream typography, palette, spacing, layout, or motion catalog in OMA resources.

Use supplied references when relevant. Load
[getdesign-fetcher.md](getdesign-fetcher.md) only for a requested vendor seed;
the seed is reference data, not another instruction supplier. Load
[stitch-integration.md](stitch-integration.md) for a requested Stitch operation.
Tool setup follows the task's authorization. An unavailable integration is an
evidence limit, not evidence that the reference was inspected.

Resolve only unanswered choices that materially affect the requested result.
Existing direction and authorization are sufficient when they answer the choice.

## 4. Produce the project contract

For an authorized design-system change, create or update `DESIGN.md` using
[design-md-spec.md](design-md-spec.md). Preserve all nine sections, including
Section 9, Agent Prompt Guide. Capture accepted project decisions and the
constraints that downstream implementation must retain.

For token work, follow [design-tokens.md](design-tokens.md): map semantic roles
to the project's existing token system and theme format. Keep project language
coverage explicit; a Latin reference font cannot establish CJK coverage.

For an audit, return findings with their inspected location, evidence, effect,
and recommendation. Keep proposed changes separate from applied changes.

## 5. Hand implementation to the platform owner

Use [oma-frontend](../../oma-frontend/SKILL.md) for web implementation or
[oma-mobile](../../oma-mobile/SKILL.md) for native implementation.
Provide the affected screens/components, accepted design decisions, Section 9,
semantic token mapping, preserved behavior, and acceptance criteria. The
implementation owner retains the project's framework, component primitives, state,
styling, i18n, and dependency conventions.

If implementation is part of the task, continue through the authorized edits
and relevant verification. A design document alone does not establish that the
rendered UI matches it.

## 6. Verify and deliver evidence

Use the applicable checks in [checklist.md](checklist.md). Name the inspected
artifact or rendered state and the checks actually run. For responsive and
accessibility claims, provide viewport/state, tool or manual action, and result.
Document-only work can specify implementation checks, but those checks remain
unrun until a rendered implementation exists.

Deliver the requested findings or changed artifacts, the selected supplier's
provenance, applied changes, verification results, and remaining evidence limits.
Include source attribution when reference material was reused. Use
[error-playbook.md](error-playbook.md) for an observed failure.
