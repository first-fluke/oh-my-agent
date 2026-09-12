---
name: oma-skill-creation
description: "Create or revise OMA skills and their references. Use for skill routing, execution contracts, conditional loading, and authoring validation."
---

# OMA Skill Authoring

## Scheduling

### Goal
Create or revise a usable OMA skill with clear routing, one execution path, domain-specific recovery, and proportionate context.

### Intent signature
- Create, update, audit, or normalize an OMA skill, its resources, or the SSL-lite format.
- Decide whether content belongs inline, in a conditional resource, or should be removed.

### When to use
- Authoring `.agents/skills/{name}/SKILL.md` and supporting resources.
- Reviewing skill routing, execution contracts, reference loading, or duplicated instructions.

### When NOT to use
- Installing third-party skills -> skill installer; creating a Codex plugin -> plugin tooling.
- Application implementation -> the owning specialist; project requirements -> `oma-pm`.

### Expected inputs
Skill purpose, triggers, boundaries, execution model, and existing commands/resources or user edits to preserve.

### Expected outputs
A four-section SKILL.md, only necessary supporting resources, and validation results with unresolved limitations.

### Dependencies
`resources/ssl-lite-template.md` for the skeleton and `resources/validation-checklist.md` for acceptance criteria. Use native file tools and available `oma skill` validators. Follow repository rules for source ownership and generated copies.

## Structural Flow

### Transitions
- New skill: compare 1–3 analogous skills, then use the template.
- Existing skill: preserve working domain detail and change only the requested scope.
- Repeated instructions: retain one authoritative location and a short reference where independently invoked entry points need it.
- Long or conditional detail: move to a named resource with a load condition. Do not move a duplicate merely to keep it elsewhere.
- Machine-checkable artifacts: declare structured `outputs:` as documented in the template.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Overbroad routing | Narrow triggers and add a concrete When NOT to use cross-route |
| Vague execution | Add actual objects, paths, command flags, and evidence to the canonical path |
| Repeated procedure in multiple sections | Keep the canonical procedure; retain only distinct branches or state transitions elsewhere |
| Required tool unavailable | Use the documented fallback; otherwise report which result cannot be verified |
| Conflicting source and generated copies | Use the repository's generation flow; do not hand-edit protected definitions |

### Exit
A completed skill has valid structure, useful routing, executable steps, recoverable failures, valid references, and applicable validation evidence. Missing tools or unresolved assumptions must remain explicit.

## Logical Operations

### Canonical workflow path
1. Read the target, its invoked resources, and relevant repository rules. Identify which entry points run independently and which content the runtime already injects.
2. Select command-heavy, judgment-heavy, or reference-heavy behavior. Use the template's minimal skeleton and optional sections only where they add information.
3. Write the canonical procedure once. Preserve exact command/output contracts, failure mechanisms, side effects, and harmful-action limits; remove generic restatements and redundant examples.
4. Index resources once under References with load conditions. Keep source-adjacent evidence one hop from SKILL.md where possible.
5. Run `oma skill lint --skill <name>` and `git diff --check`. If routing descriptions changed, run `oma skill audit`. Apply the content checks in `resources/validation-checklist.md` that automated lint does not cover.
6. Report the changes, checks, and remaining limits. Do not claim reduced token usage merely from removing duplicate files; measure the context actually loaded when making that claim.

### Resource scope and effects
Skill work reads and may change local definitions/resources and generated vendor copies through the authorized repository flow. User data and credentials are not skill examples. Commits and publishing require the corresponding authorization.

### Guardrails
1. Keep YAML `name` and a routing-grade `description`. Preserve the four top-level headings: Scheduling, Structural Flow, Logical Operations, References.
2. Keep one canonical command/workflow path, an Intent signature, When to use/When NOT to use, input/output expectations, failure recovery, and relevant effects/guardrails. Section titles beyond these are optional when their information is already represented.
3. Entry, Scenes, Actions, and tool/scope tables must add distinct information. Do not repeat a procedure to fill the template.
4. Keep SKILL.md under 500 body lines. Load supporting resources conditionally; do not create README/changelog/install documents inside a skill merely to explain the skill.
5. Keep parsed output/schema examples. Do not prescribe decorative report layouts or add generic self-review loops; use runnable validators and explicit evidence requirements.
6. Process bulk data through deterministic tools and return summaries/artifact paths instead of streaming raw data into context.
7. Preserve unrelated user edits. Apply the shared execution policy to clarification, authorization, and verification.

## References
- Prompt behavior and model comparisons: `resources/prompt-evaluation.md` (routing, injection, authorization, or review-contract changes)
- Skeleton and optional sections: `resources/ssl-lite-template.md` (authoring or restructuring)
- Acceptance criteria: `resources/validation-checklist.md` (validation)
- Context loading: `../_shared/core/context-loading.md` (resource/injection decisions)
- Quality principles: `../_shared/core/quality-principles.md` (domain verification requirements)
- Eval fixtures: `web/docs/guide/skill-eval.md` (when measuring held-out task utility with `oma skill eval` or `oma skill optimize`)
