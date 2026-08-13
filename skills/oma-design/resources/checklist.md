# Design Audit Checklist

## 1. Responsive (MANDATORY, run first)
- [ ] All sections render correctly at 375px width
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets >= 44x44pt on mobile
- [ ] Text readable without zooming on mobile (min 16px body)
- [ ] Images/videos scale or have mobile alternatives
- [ ] Navigation collapses appropriately (hamburger/drawer)
- [ ] Buttons stack vertically on mobile if needed (flex-col)
- [ ] No fixed-width containers causing overflow

## 2. WCAG 2.2 Accessibility
- [ ] Text contrast >= 4.5:1 AA (normal text)
- [ ] Large text contrast >= 3:1 AA (18px bold / 24px+)
- [ ] UI component contrast >= 3:1 against adjacent colors
- [ ] Focus indicators visible with >= 3:1 contrast
- [ ] All images have appropriate alt text (decorative: alt="")
- [ ] Semantic HTML landmarks (header, nav, main, footer)
- [ ] Sequential heading hierarchy (h1 → h2 → h3, no skips)
- [ ] One h1 per page
- [ ] prefers-reduced-motion respected for all animations
- [ ] All interactive elements keyboard-accessible
- [ ] Skip-to-content link present
- [ ] aria-label on icon-only buttons
- [ ] No content conveyed by color alone

## 3. Nielsen's 10 Heuristics
- [ ] Visibility of system status (loading, progress, feedback)
- [ ] Match between system and real world (familiar language, conventions)
- [ ] User control and freedom (undo, back, escape, close)
- [ ] Consistency and standards (same patterns throughout)
- [ ] Error prevention (confirmations for destructive actions)
- [ ] Recognition rather than recall (visible options, no memorization)
- [ ] Flexibility and efficiency (shortcuts for expert users)
- [ ] Aesthetic and minimalist design (no unnecessary elements)
- [ ] Help users recognize and recover from errors (clear messages)
- [ ] Help and documentation (if needed, searchable and task-oriented)

## 4. AI Slop Check
- [ ] Passes the "AI made this" test (would a human designer be proud?)
- [ ] No purple gradient backgrounds
- [ ] No Inter-only or Geist-only typography without justification
- [ ] No triple-nested cards
- [ ] No bounce easing on all animations
- [ ] No generic hero with 3-metric stats row
- [ ] No gradient + glassmorphism + blur triple combo
- [ ] No gradient orbs/blobs as primary decoration
- [ ] Texture/noise preferred over plain gradients where applicable
- [ ] Design reflects project-specific context, not a generic template
- [ ] Custom fonts justified by brand needs, not used by default

## 5. Design System Consistency
- [ ] All colors from the defined palette (no hardcoded hex outside system)
- [ ] All spacing from 8px grid scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
- [ ] Typography uses the defined type scale (no arbitrary font sizes)
- [ ] Component variants consistent (same border-radius, shadow, border treatment)
- [ ] Dark/light theme tokens defined if applicable
- [ ] CSS custom properties used for all design tokens
- [ ] Tailwind config extends theme correctly (no arbitrary values in templates)

## 6. Mechanical Checks (countable — verify by counting/grep, not judgment)

These checks are deliberately mechanical so an agent can self-verify them
deterministically. A failed count is a failed audit; fix before handoff.

### Consistency locks
- [ ] Accent lock: ONE accent color, used identically across all sections (no blue CTA appearing on a warm-grey page in section 7)
- [ ] Radius lock: ONE corner-radius system (all-sharp / all-soft / all-pill), or a documented mixed rule applied everywhere
- [ ] Theme lock: ONE theme (light, dark, or auto) for the whole page; no single section inverting mid-scroll

### Layout counts
- [ ] Eyebrow count: micro-labels (uppercase + letter-spacing above section headlines) <= ceil(sectionCount / 3); hero counts as one
- [ ] Layout-family repetition: no layout family (3-col cards, image+text split, full-width quote, bento...) used for more than one section; a page of 8 sections uses >= 4 distinct families
- [ ] Zigzag cap: max 2 consecutive image+text split sections; the 3rd consecutive one fails
- [ ] Marquee: max 1 horizontal marquee per page
- [ ] Bento cell count: N items → exactly N cells; no empty filler tiles
- [ ] Long lists (> 5 items): grouped chunks / card grid / tabs / carousel — not a default `<ul>` with a hairline under every row

### Hero discipline
- [ ] Hero fits the initial viewport: headline <= 2 lines desktop, subtext <= 20 words, primary CTA visible without scroll
- [ ] Hero stack: max 4 text elements (eyebrow OR brand strip, headline, subtext, CTAs); no trust micro-strip / pricing teaser / tagline-under-CTAs inside the hero
- [ ] Logo wall lives in its own section BELOW the hero, never inside it

### CTA and copy counts
- [ ] ZERO em-dashes: `grep -rn '—' <output files>` returns nothing in visible strings; en-dash (`–`) not used as a separator either (hyphen only)
- [ ] No CTA label wraps to 2+ lines at desktop (primary CTA <= 3 words)
- [ ] One label per CTA intent: no "Get in touch" + "Let's talk" (same contact intent) coexisting on one page; same for signup and portfolio intents
- [ ] Every CTA/button text passes WCAG AA contrast against its own background (no white-on-white, no ghost button vanishing over photos)

### Navigation
- [ ] Nav renders on a single line at desktop (condense labels or use hamburger if not)
- [ ] Nav height <= 80px desktop

### Typography & icons
- [ ] Inter used only with an explicit justification (user asked for neutral/Linear-style, or public-sector/a11y-first brief) — never by reflex
- [ ] ONE icon family per project: grep icon imports; all come from a single library, consistent strokeWidth
- [ ] lucide-react present only if explicitly requested or already a project dependency
