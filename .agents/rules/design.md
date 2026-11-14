---
description: Design system, typography, color, accessibility (WCAG 2.2), responsive-first layout, and motion design standards
globs:
alwaysApply: false
---

# Design Standards

## Core Rules

1. System font stack as default (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). Add custom fonts only with project justification.
2. If the service supports CJK languages: prioritize CJK-ready fonts (Pretendard Variable > Noto Sans CJK > system-ui fallback).
3. Name colors semantically with hex values: "Deep Ocean Navy (#1a2332)" not "dark blue".
4. Keep the project's existing implementation stack; component libraries, styling syntax, and dependencies belong to the implementation specialist.
5. ALL output must be responsive-first (mobile layout as default, enhance upward).
6. WCAG AA minimum for all designs.
7. Present directions when design exploration is requested or a material direction is unresolved; reuse an already chosen direction.

## Anti-Patterns to Avoid

- **Typography**: Don't default to custom web fonts; body text minimum 16px on mobile; test CJK at every size
- **Layout**: works at 375px minimum; follow the project's existing spacing scale instead of imposing a new grid
- **Motion**: follow `.agents/skills/_shared/ui-interaction-quality.md`; keep the project's existing timing scale and honor reduced-motion
- **Components**: all interactive elements must have visible focus states
- **Assets and claims**: no invented logos, metrics, endorsements, or mockups presented as real product screenshots
