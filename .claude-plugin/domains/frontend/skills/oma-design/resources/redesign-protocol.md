# Existing Product Design Scope

Load this resource when reviewing or changing an existing site or app.

## Establish the authorized change

| Operation | Treatment |
|---|---|
| Audit | Inspect the current product and report findings; keep product source, design docs, tokens, and settings unchanged |
| Redesign with brand preservation | Improve the requested area using the existing brand and behavior as constraints |
| Authorized visual overhaul | Establish a new visual direction while retaining content and behavior outside the authorized change |

Use the user's stated scope and prior decisions. If the brief leaves a material
brand-preservation choice unresolved, clarify that choice before changing it.

## Capture the baseline

Read the existing design document and relevant implementation. Identify the
brand colors, type/fallback stack, marks, affected routes and navigation,
conversion paths, form/analytics contracts, accessibility behavior, and relevant
SEO metadata. Record inspected facts separately from proposed improvements.

Reuse an existing `.design-context.md`. Update it only when context documentation
is within the authorized deliverable; an audit can report its baseline directly.

## Preserve project contracts

- Keep approved brand tokens, marks, and copy voice unless their change is part
  of the request. A vendor reference or upstream visual preference does not
  authorize replacing them.
- Preserve supported languages and CJK-capable typography/fallback. Check actual
  language coverage when a font changes.
- Retain URLs, anchors, primary navigation labels, form field identifiers,
  analytics events, and tracking-dependent control names unless their change is
  authorized. Include relevant SEO and analytics checks for an authorized change.
- Preserve legal/consent text and existing accessibility behavior outside the
  requested changes.
- Keep the existing framework, styling, component, state, and i18n conventions.
  Use [oma-frontend](../../oma-frontend/SKILL.md) or
  [oma-mobile](../../oma-mobile/SKILL.md) for implementation.

## Route and verify the requested work

Select one supplier through
[external-design-skills.md](external-design-skills.md). Give it the baseline and
preservation constraints, then use its guidance for the selected operation.
Keep the change proportional to the brief; generic modernization rankings or
assumed visual-lift percentages do not decide scope.

Return findings for an audit. For authorized changes, capture accepted decisions
in the applicable project artifacts and use [checklist.md](checklist.md) to
record responsive, accessibility, and behavior checks actually performed.
