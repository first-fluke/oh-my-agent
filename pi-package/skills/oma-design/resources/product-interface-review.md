# Recommended Product-Interface Review

Use this route after `oma-frontend` creates or substantially changes an admin
console, dashboard, SaaS product UI, or internal tool. OMA owns the handoff and
review status; Interface Design owns the detailed design-review method.

## Eligibility and priority

- Recommend this pass for changes to information hierarchy, navigation,
  data density, tables, filters, forms, or a substantial product workflow.
- A copy-only correction, nonvisual state/API change, or unchanged interface
  does not need this pass. Record `not-applicable` when that distinction matters.
- This recommendation does not introduce a mandatory approval gate. Perform a
  scoped pass when the task scope, available evidence, tools, and budget allow;
  otherwise record `recommended-not-run` with the reason and continue.
- Explicit user requirements and supplier choices take precedence. Accessibility,
  responsive, or technical audits still use the applicable Impeccable operation;
  do not load both suppliers for this product-interface review by default.

## Frontend handoff

Pass the affected routes/screens/components and diff, the intended users and
workflow, existing `DESIGN.md` and design context, incumbent stack and tokens,
brand/CJK/accessibility constraints, and the relevant table/grid requirements.
Include observed desktop and narrow-viewport states or screenshots when available,
plus the actual functional and responsive checks already run. Preserve approved
behavior, content, navigation, and form contracts.

Missing runtime evidence is a limit, not a reason to claim the rendered UI passed.
Do not start an unauthorized build, download a browser, or install a plugin just
to clear this advisory review.

## Design review

1. `oma-design` resolves Interface Design using
   [external-design-skills.md](external-design-skills.md). Load its core skill,
   the selected `design-review` instructions, and required support files from
   the same resolved upstream revision. Do not assume plugin slash commands are
   registered merely because the skill instructions were loaded.
2. Review only the affected interface against the project's visual contract.
   Apply the upstream method for hierarchy, density, typography, spacing,
   contrast, component consistency, and interaction/state completeness. For a
   data-heavy surface, include [data-grid.md](data-grid.md).
3. Return findings with an inspected route/component/state, evidence, impact,
   and a recommendation. Keep this pass read-only. Hand accepted findings back
   to `oma-frontend`; fixes use the task's existing implementation authorization.
4. Record one status: `completed` with findings and observed evidence,
   `recommended-not-run` with the missing tool/bundle/evidence or scope reason,
   or `not-applicable`. A completed review is not automatically a passing design
   sign-off. Do not silently replace an unavailable Interface Design review with
   another supplier or turn its internal approval bar into an OMA stop gate.

Required functional, responsive, accessibility, and task-specific acceptance
checks retain their existing requirements regardless of this advisory status.

## Source

- [Interface Design](https://github.com/Dammyjay93/interface-design): core skill
  and the upstream `.claude/commands/design-review.md` review instructions.
