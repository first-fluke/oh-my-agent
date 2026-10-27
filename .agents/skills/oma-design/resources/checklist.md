# Design Delivery Checks

Run checks that apply to the requested operation. Record the action and result;
a checked item without supporting evidence is not a passed verification.

## Scope and provenance

- [ ] The result matches the requested audit, design document, direction, or
  implementation; any product/doc/token changes are within the authorized scope.
- [ ] The applicable upstream supplier or local contract was selected through
  [external-design-skills.md](external-design-skills.md); any supplier source and
  available version/revision are recorded.
- [ ] Findings distinguish inspected facts, assumptions, proposals, and changes.
- [ ] References, assets, quotations, and product claims have an identified
  source; placeholders are labeled.

## Existing product and project contract

- [ ] The redesign scope and preserved brand, URLs, navigation, form fields,
  analytics events, content, and legal text follow
  [redesign-protocol.md](redesign-protocol.md).
- [ ] Supported languages are recorded. CJK text uses fonts with suitable
  coverage and fallback; supplied Latin references have not replaced that policy.
- [ ] A changed `DESIGN.md` contains the nine sections and a usable Section 9
  defined in [design-md-spec.md](design-md-spec.md).
- [ ] Token changes map semantic roles to the existing project format and theme
  source under [design-tokens.md](design-tokens.md).
- [ ] Product implementation follows `oma-frontend` or `oma-mobile` and the existing stack.

## Rendered responsive evidence

- [ ] Identify the page/component, route or artifact, revision, and states tested.
- [ ] Record the actual viewport widths and relevant breakpoints tested,
  including the target's narrow mobile width when mobile web is in scope.
- [ ] Inspect the affected content and controls for overflow, overlap, truncation,
  and loss of actions at those sizes; record any unresolved finding and location.
- [ ] Exercise affected navigation, forms, overlays, and media where they change
  with viewport or input mode. Real-device claims identify the device tested.

## Rendered accessibility evidence

- [ ] State the applicable project accessibility target and the affected states.
- [ ] Exercise affected actions with the keyboard; record focus visibility,
  reading/order issues, and overlay focus/escape behavior where relevant.
- [ ] Measure contrast for changed foreground/background pairs and relevant
  states; report the values and target, rather than judging from a screenshot.
- [ ] Inspect affected labels, names, semantic structure, error announcements,
  and image alternatives using the available browser/accessibility tools.
- [ ] Exercise reduced-motion behavior when motion changes, and the relevant
  touch/hover behavior when those interactions change.
- [ ] Record automated checks separately from manual inspection; neither is
  reported as complete accessibility coverage.

## Handoff and limits

- [ ] The implementation handoff identifies affected files/screens, accepted design
  decisions, semantic token roles, preserved behavior, and acceptance criteria.
- [ ] List checks that passed, findings that remain, and checks that were not run.
  A document-only task reports rendered checks as pending, not passed.
- [ ] Audit-only delivery contains findings and recommendations; product source,
  design documents, tokens, dependencies, and tool settings remain unmodified.
