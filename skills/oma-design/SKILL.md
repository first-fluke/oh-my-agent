---
name: oma-design
description: Define or review a visual system, DESIGN.md, or redesign direction.
  Use for typography, layout, color, motion, and interaction design decisions.
---

# oma-design

## Scheduling

### Goal
Design specialist that defines, creates, and validates project design systems.
DESIGN.md is the central artifact; all design work revolves around it.

### Intent signature
- User asks for design system, `DESIGN.md`, visual direction, typography, color, motion, accessibility, anti-pattern review, or component guidance.
- User needs design decisions before frontend implementation or wants UI quality audited from a design perspective.

### When to use
- Defining or revising a project design system
- Creating or auditing `DESIGN.md`
- Selecting typography, color, layout, motion, or component direction
- Reviewing UI work for responsive behavior, accessibility, and visual quality
- Redesigning an existing site or app (preserve vs overhaul modes)
- Using optional vendor inspiration from Stitch MCP or getdesign

### When NOT to use
- Implementing frontend components or application UI -> use `oma-frontend`
- Planning product scope or task breakdown -> use `oma-pm`
- Backend, database, infrastructure, or mobile implementation -> use the relevant specialist skill
- General quality/security review outside visual, interaction, and accessibility concerns -> use `oma-qa`

### Expected inputs
- Product, brand, audience, platform, and UI/design problem
- Existing `.design-context.md`, `DESIGN.md`, screenshots, references, or component constraints
- Accessibility, responsive, language, and implementation constraints

### Expected outputs
- Design direction, revised `DESIGN.md`, audit findings, component guidance, or handoff notes
- Responsive-first, WCAG-aware design recommendations
- Optional vendor seed attribution when getdesign is used

```yaml
outputs:
  - name: design-doc
    description: Updated DESIGN.md when the run materially advances the design system
    artifact: "DESIGN.md"
    required: false
  - name: design-context
    description: Refreshed .design-context.md snapshot when a discovery pass runs
    artifact: ".design-context.md"
    required: false
```

### Dependencies
- `.design-context.md` and `DESIGN.md`
- Design resources, references, anti-pattern catalog, and optional Stitch/getdesign integrations
- shadcn/component library context when recommending components

### Control-flow features
- Branches by missing context, CJK language support, vendor seed availability, and anti-pattern audit results
- May read/write design docs and call optional design/vendor tooling
- Asks about a direction only when a material choice is unresolved; otherwise follows the supplied brief

## Structural Flow

### Entry
1. Read relevant existing design context; gather missing context only when needed for the requested decision.
2. Identify target audience, platform, content language, and design artifact.
3. Decide whether vendor inspiration or Stitch integration is relevant.

### Transitions
- Create `.design-context.md` when a discovery pass materially informs a design-system decision.
- If the target is an existing site/app, load `resources/redesign-protocol.md` and classify Preserve vs Overhaul before proposing.
- If CJK support is needed, prioritize CJK-ready fonts.
- If vendor seed fetch fails, choose retry, continue without seed, or abort.
- If anti-patterns appear, surface alternatives before finalizing.

### Failure and recovery
- If design context is insufficient, ask for one focused clarification or propose assumptions.
- If vendor inspiration is unavailable, continue with local design synthesis.
- If accessibility checks fail, revise before handoff.

### Exit
- Success: design artifact is project-specific, responsive-first, accessible, and audit-ready.
- Partial success: missing context, vendor failure, or open design decision is explicit.

## Logical Operations

### Tools and instruments
- Design references, anti-pattern catalog, checklist, Stitch integration, getdesign fetcher
- shadcn CLI recommendations when component guidance is needed

### Canonical workflow path
```text
1. Inspect relevant existing context; create `.design-context.md` only when substantive discovery is needed.
2. Use the chosen direction. Offer alternatives only for requested exploration or a material unresolved design decision.
3. Generate or revise `DESIGN.md`, then run the design checklist.
```

Optional vendor seed discovery:
```bash
bunx getdesign@latest list
```

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `LOCAL_FS` | `.design-context.md`, `DESIGN.md`, design resources |
| `CODEBASE` | Existing UI and component patterns |
| `NETWORK` | Optional getdesign/vendor references |
| `PROCESS` | Optional CLI/tool invocations |

### Preconditions
- Target design problem and artifact are identifiable.
- Design context exists or setup can create it.

### Effects and side effects
- May create or modify `DESIGN.md` and design context artifacts.
- May fetch vendor seed material and append MIT attribution.
- Does not implement frontend code directly.

### Guardrails
1. Inspect relevant existing context and tokens. Create `.design-context.md` for substantive discovery, not every visual edit.
2. System font stack as default (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). Add custom fonts only with project justification.
3. If the service supports CJK languages (ko/ja/zh): prioritize CJK-ready fonts (Pretendard Variable > Noto Sans CJK > system-ui fallback). If latin-only: choose fonts appropriate for the target audience.
4. Enforce anti-patterns strictly; reject AI slop. See `resources/anti-patterns.md`.
5. Name colors semantically with hex values: "Deep Ocean Navy (#1a2332)" not "dark blue".
6. Recommend components with install commands (shadcn CLI).
7. ALL output must be responsive-first (mobile layout as default, enhance upward).
8. WCAG AA minimum for all designs. Respect `prefers-reduced-motion`.
9. Stitch MCP is optional; all phases work without it.
10. Present directions when design exploration is requested or a material direction is unresolved; reuse an already chosen direction.
11. State a material design assumption when it affects the outcome. Ask only about unresolved choices; no fixed opening phrase is required.
12. Redesigns follow `resources/redesign-protocol.md`: detect Preserve vs Overhaul, audit before touching, never silently change URLs, nav labels, form field names, or brand marks.
13. Visual assets follow `resources/asset-strategy.md`: image generation (oma-image) first, picsum seed second, labeled placeholder last. Div-based fake screenshots are banned.
14. Consistency locks: one accent color, one corner-radius system, one theme per page. Lock them early, audit against them in Phase 6 (checklist section 6 mechanical checks).

## References
- `resources/execution-protocol.md`: selected design operation and its phases
- `resources/redesign-protocol.md`: existing-site redesign
- `resources/design-md-spec.md`: creating or changing DESIGN.md
- `resources/checklist.md`: applicable visual verification checks
- `resources/anti-patterns.md`: affected visual or copy category
- `resources/getdesign-fetcher.md`: explicitly relevant vendor inspiration
- `resources/stitch-integration.md`: requested Stitch operation
- `resources/asset-strategy.md`: selecting visual assets
- `resources/design-tokens.md`: token export
- `resources/prompt-enhancement.md`: incomplete design brief
- `resources/error-playbook.md`: observed design-tool failure
- `reference/visual-hierarchy.md`: 7 hierarchy principles (Alignment, Color, Contrast, Proximity, Size, Texture, Time)
- `reference/typography.md`: Font selection, type scale, CJK
- `reference/color-and-contrast.md`: Color psychology, WCAG contrast
- `reference/spatial-design.md`: 8px grid, breakpoints, spacing
- `reference/motion-design.md`: motion/react, GSAP, Three.js, ogl, Temporal UX
- `reference/responsive-design.md`: Mobile-first, theme system
- `reference/component-patterns.md`: shadcn/Aceternity/React Bits catalog
- `reference/accessibility.md`: WCAG 2.2, ARIA, focus, reduced-motion
- `reference/shader-and-3d.md`: WebGL, R3F, ogl, performance