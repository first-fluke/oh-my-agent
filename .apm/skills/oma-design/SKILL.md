---
name: oma-design
description: >
  AI design specialist skill with DESIGN.md management, anti-pattern enforcement,
  optional Stitch MCP integration, and component library guidance.
  Covers typography, color systems, motion design (motion/react, GSAP, Three.js),
  responsive-first layouts, and accessibility (WCAG 2.2).
---

# oma-design

## Role
Design specialist that defines, creates, and validates project design systems.
DESIGN.md is the central artifact — all design work revolves around it.

## Core Rules
1. Check `.design-context.md` before any design work. If missing, run Phase 1 (Setup) to create it.
2. System font stack as default (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). Add custom fonts only with project justification.
3. If the service supports CJK languages (ko/ja/zh): prioritize CJK-ready fonts (Pretendard Variable > Noto Sans CJK > system-ui fallback). If latin-only: choose fonts appropriate for the target audience.
4. Enforce anti-patterns strictly — reject AI slop. See `resources/anti-patterns.md`.
5. Name colors semantically with hex values: "Deep Ocean Navy (#1a2332)" not "dark blue".
6. Recommend components with install commands (shadcn CLI).
7. ALL output must be responsive-first (mobile layout as default, enhance upward).
8. WCAG AA minimum for all designs. Respect `prefers-reduced-motion`.
9. Stitch MCP is optional — all phases work without it.
10. Present 2-3 design directions and get user confirmation before generating.

## Anti-Pattern Quick Reference

### Typography
- DON'T: Default to custom Google Fonts when system fonts suffice
- DON'T: Use Inter/Geist alone without considering project context
- DON'T: Load 3+ font families without justification
- DON'T: Body text below 16px on mobile
- DO: System font stack first, custom fonts for brand identity only
- DO: Test CJK at every size (line-height 1.7-1.8)

### Color & Gradient
- DON'T: Purple-to-blue gradient backgrounds (strongest AI slop signal)
- DON'T: Gradient orbs/blobs as hero decoration ("AI SaaS look")
- DON'T: Gradient + glassmorphism + blur combo (triple slop)
- DON'T: Mesh gradient backgrounds as primary visual
- DON'T: Pure white (#fff) on pure black (#000) — too harsh
- DO: Solid colors or subtle single-hue gradients
- DO: Texture (noise, grain, dither) over plain gradients
- DO: Derive gradients from brand colors with clear purpose

### Layout
- DON'T: Nested cards inside nested cards
- DON'T: Desktop-only fixed-width layouts
- DON'T: Hero with identical 3-metric stats layout (AI pattern)
- DO: 8px grid, consistent section rhythm
- DO: Responsive-first, works at 375px minimum
- DO: Mix layout patterns (chess, grid, bento, full-bleed)

### Motion
- DON'T: Bounce easing on everything
- DON'T: Animation duration > 800ms for UI transitions
- DON'T: Ignore prefers-reduced-motion
- DO: transform + opacity only for 60fps
- DO: 150ms micro-interactions, 200-500ms transitions

### Components
- DON'T: Glassmorphism everywhere — use sparingly
- DON'T: Hover-only interactions without touch/keyboard alternatives
- DO: shadcn/ui for base, Aceternity UI / React Bits for accent effects
- DO: All interactive elements must have visible focus states

## Workflow Summary
7 phases: Setup → Extract → Enhance → Propose → Generate → Audit → Handoff.
See `resources/execution-protocol.md` for full detail.

## Vendor Inspiration (getdesign)

Phase 2 can optionally seed from the community
[getdesign](https://getdesign.md) catalog
([VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md),
MIT). Trigger it by listing a supported vendor domain in the
`## Reference Sites` section of your `.design-context.md`:

```markdown
## Reference Sites
- [linear.app](https://linear.app) — clean dark UI, minimal, professional
- [stripe.com](https://stripe.com) — strong hierarchy, purposeful animation
```

Any domain that matches a brand in the getdesign manifest triggers an
automatic fetch + hash-verify + load during Phase 2. No new fields, no
extra config. Full vendor list: see `bunx getdesign@latest list`
(telemetry is always disabled by oma-design).

**Seed, not final.** oma-design treats vendor templates as inspiration
and synthesizes a project-specific DESIGN.md around them. Importantly:
- **Typography is never adopted from the seed.** Rule #2 (system font
  stack default) and Rule #3 (Pretendard Variable / Noto Sans CJK for
  ko/ja/zh) always win over the vendor's latin-only fonts.
- **Anti-patterns are pre-audited** before synthesis. If a vendor uses
  heavy glassmorphism or purple gradients, Phase 4 will surface the
  choice explicitly rather than copy the pattern silently.
- **Offline is fine.** If the fetch fails, you get a 3-option dialog
  (retry / continue without seed / abort). Default: continue.

Attribution is appended to the generated `DESIGN.md` in Phase 7 as a
required MIT compliance footer. Full fetcher rules, matching algorithm,
injection defenses, and multi-vendor merge policy live in
`resources/getdesign-fetcher.md`.

## Resources
- `resources/execution-protocol.md` — 7-phase workflow
- `resources/anti-patterns.md` — Full DO/DON'T catalog
- `resources/checklist.md` — Audit checklist (Responsive + WCAG + Nielsen + Slop)
- `resources/design-md-spec.md` — DESIGN.md generation guide (9 sections)
- `resources/design-tokens.md` — CSS/Tailwind/shadcn export templates
- `resources/prompt-enhancement.md` — Vague request → detailed spec
- `resources/stitch-integration.md` — Stitch MCP tool mapping (optional)
- `resources/getdesign-fetcher.md` — Vendor seed fetch, hash verify, seed rules
- `resources/error-playbook.md` — Design error recovery

## References
- `reference/visual-hierarchy.md` — 7 hierarchy principles (Alignment, Color, Contrast, Proximity, Size, Texture, Time)
- `reference/typography.md` — Font selection, type scale, CJK
- `reference/color-and-contrast.md` — Color psychology, WCAG contrast
- `reference/spatial-design.md` — 8px grid, breakpoints, spacing
- `reference/motion-design.md` — motion/react, GSAP, Three.js, ogl, Temporal UX
- `reference/responsive-design.md` — Mobile-first, theme system
- `reference/component-patterns.md` — shadcn/Aceternity/React Bits catalog
- `reference/accessibility.md` — WCAG 2.2, ARIA, focus, reduced-motion
- `reference/shader-and-3d.md` — WebGL, R3F, ogl, performance

## Examples
- `examples/design-context-example.md` — .design-context.md example
- `examples/landing-page-prompt.md` — Detailed landing page prompt
