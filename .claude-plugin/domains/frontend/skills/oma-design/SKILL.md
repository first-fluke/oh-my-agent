---
name: oma-design
description: Define or review a visual system, DESIGN.md, or redesign direction.
  Use for typography, layout, color, motion, and interaction design decisions.
---

# oma-design

## Scheduling

### Goal
Resolve project design intent, select the applicable external design skill, and
retain the project's visual contract and verification evidence. `DESIGN.md`
records the design system when the task creates or materially changes it.

### Intent signature
- Design system, `DESIGN.md`, visual direction, redesign, or UI design review.
- Typography, color, layout, motion, accessibility, or component decisions before implementation.

### When to use
- Define or revise a visual system or substantial design direction.
- Review an existing UI or refine a chosen visual direction.
- Extract design decisions from existing UI, screenshots, or supplied references.

### When NOT to use
- Implement application UI or export framework-specific tokens -> `oma-frontend` or `oma-mobile`.
- Plan product scope -> `oma-pm`; generate an image -> `oma-image`.
- Review general correctness or security -> `oma-qa` or `oma-security`.

### Expected inputs
- Requested surface and outcome, existing brand and project facts, and change scope.
- Available `DESIGN.md`, `.design-context.md`, UI, screenshots, and references.
- Platform, incumbent stack, content languages, accessibility, and responsive constraints.

### Expected outputs
- Requested design decision, findings, or implementation handoff with observed evidence.
- Selected supplier, operation, resolved source, and capability or verification limits.

```yaml
outputs:
  - name: design-doc
    description: Updated visual contract when the design system materially changes
    artifact: "DESIGN.md"
    required: false
  - name: design-context
    description: Existing context refreshed after substantive discovery
    artifact: ".design-context.md"
    required: false
```

### Dependencies
- Interface Design, Taste, or Impeccable, selected through `resources/external-design-skills.md`.
- Project design artifacts and relevant local resources; Stitch and getdesign are optional inputs.
- The implementation specialist's existing stack and validation tools.

## Structural Flow

### Transitions
- A scoped correction reuses the affected UI and tokens; a discovery document is unnecessary.
- For existing products, establish Preserve or Overhaul from the brief and current system.
- For existing-UI critique, audit, polish, or system extraction, select the matching Impeccable operation.
- For dashboards, admin panels, SaaS product UI, or internal tools needing visual direction, select Interface Design.
- For other new web art direction or an authorized visual overhaul, select Taste.
- A documentation-only or token-contract task can remain local when no new visual judgment is needed.
- Load one supplier for the current operation. A later operation may select another using the same project context.
- A chosen GPU effect, cinematic video-scroll scene, or GSAP behavior adds the matching frontend implementation extension; it does not select another visual-direction supplier.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Missing or incomplete external bundle | Resolve the catalog entry or use the bounded upstream loading path; retain its complete support directory. |
| Supplier changes the stack, brand, or task scope | Restore the project constraints and choose the applicable operation; implementation remains with the owning specialist. |
| A supplier gate needs an unavailable runtime or unauthorized build | Report the gate as unrun; do not replace it with a claimed pass. |
| Explicitly requested supplier is unavailable | Report the failed route and missing capability; do not silently substitute a different supplier. |
| Missing context changes the design decision | Reuse existing artifacts and the brief; ask only about the material unresolved choice. |

### Exit
The requested decision or artifact is ready for the next action, with the selected
route, project constraints, observed checks, and unresolved limits recorded.

## Logical Operations

### Canonical workflow path
1. Inspect the relevant UI, design artifacts, and brief. Establish scope, platform,
   incumbent stack, languages, brand preservation, and applicable verification.
2. Use `resources/external-design-skills.md` to select and load the supplier for
   this operation. Follow its relevant instructions and support files.
3. Apply the result to the requested decision or artifact. Update `DESIGN.md`
   only when the visual system changes; use its local specification and semantic
   token contract. Optional Stitch/getdesign inputs remain project references.
4. Check the affected result using `resources/checklist.md`. Hand implementation
   to the owning frontend/mobile specialist with the route and project constraints.
   Include a specialized frontend route when the brief calls for that capability.

### Resource scope and effects
Reads project UI and design references; may write requested design artifacts and
load external skill bundles. Supplier installers, hooks, engine downloads,
background processes, and paid services are separate effects, not skill loading.

### Guardrails
1. Keep existing brand, content, URLs, navigation, form contracts, analytics, and
   legal text within the authorized scope; use the redesign preservation contract.
2. Keep incumbent fonts when suitable. For ko/ja/zh, verify glyph coverage,
   fallback, line breaking, and readable metrics; Latin-only references do not establish CJK support.
3. Carry accessibility, responsive, reduced-motion, and platform requirements into
   the selected supplier. Keep WCAG AA as the default accessibility target, or
   the project's stricter target. Its house style does not override that contract.
4. Use actual project assets and claims. Preserve attribution and label concepts
   and placeholders through the asset strategy.
5. Keep the existing implementation stack. The implementation specialist owns
   CSS/Tailwind/component-library syntax and dependencies.
6. Keep review-only operations read-only. Existing task authorization and the
   shared execution policy govern builds, clarification, scope, and side effects.
7. Keep supplier visual cookbooks upstream. OMA's shared interaction-quality
   guidance owns its adopted motion and interaction acceptance rules; do not
   copy an entire external method catalog into these definitions.

## References
- `resources/external-design-skills.md`: supplier selection and complete-bundle loading.
- `../oma-frontend/resources/specialized-visual-implementation.md`: chosen GPU, video-scroll, or GSAP implementation capability.
- `references/_shared/ui-interaction-quality.md`: motion intent, feedback, and interaction-quality decisions.
- `resources/execution-protocol.md`: operation scope, artifacts, and handoff.
- `resources/redesign-protocol.md`: preserving an existing product.
- `resources/design-md-spec.md`: creating or materially revising DESIGN.md.
- `resources/design-tokens.md`: semantic token handoff to implementation.
- `resources/checklist.md`: affected-result verification and evidence.
- `resources/asset-strategy.md`: actual assets, claims, provenance, and placeholders.
- `resources/getdesign-fetcher.md`: explicitly relevant vendor inspiration.
- `resources/stitch-integration.md`: requested Stitch operation.
- `resources/error-playbook.md`: an observed supplier or design-tool failure.
- `references/_shared/core/execution-policy.md`: authorization, budgets, builds, and completion.