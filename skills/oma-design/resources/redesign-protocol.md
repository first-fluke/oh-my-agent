# Redesign Protocol

Applies whenever the target is an EXISTING site or app, not a greenfield build.
Misclassifying the mode is the biggest source of bad redesign output.

## 1. Detect the Mode (first action)

| Mode | Meaning | Treatment |
|------|---------|-----------|
| Greenfield | No existing site, or full overhaul approved | Normal 7-phase flow |
| Redesign - Preserve | Modernize without breaking the brand | Audit first, extract brand tokens, evolve gradually |
| Redesign - Overhaul | New visual language on existing content | Greenfield for visuals; preserve content and IA |

If ambiguous, ask ONCE: "Should this redesign preserve the existing brand,
or are we starting visually from scratch?" Never a multi-question dump.

## 2. Audit Before Touching

Document the current state before proposing any change:

- **Brand tokens**: primary/accent colors, type stack, logo treatment, radii
- **Information architecture**: page tree, primary nav, key conversion paths
- **Content blocks**: what exists, what's doing work, what's filler
- **Patterns to preserve**: signature interactions, recognizable hero, copy voice
- **Patterns to retire**: AI-slop tells, broken layouts, dead links, generic stock imagery, perf traps
- **SEO baseline**: ranking pages, meta titles, structured data, OG cards.
  SEO migration is the #1 redesign risk.

Record the audit in `.design-context.md` (a `## Redesign Audit` section)
so later phases and subagents can see it.

## 3. Preservation Rules (Preserve mode)

1. Do not change information architecture unless asked. Keep page slugs,
   anchor IDs, and primary nav labels stable (SEO + muscle memory).
2. Extract brand colors BEFORE applying anti-pattern rules. A brand that is
   already purple stays purple — execute it with intent instead of banning it.
3. Preserve copy voice unless asked for a rewrite. Visual modernization
   is not a content rewrite.
4. Honor existing accessibility wins. Never regress focus states, alt text,
   keyboard nav, or contrast.
5. Respect existing analytics events. Do not rename buttons, form fields,
   or section IDs that downstream tracking depends on.

## 4. Modernization Levers (priority order)

Apply in order; stop when the brief is satisfied. Earlier levers give the
biggest visual lift per unit of risk:

1. **Typography refresh** — biggest instant improvement, lowest risk
   (CJK rules from SKILL.md still win: Pretendard Variable / Noto Sans CJK)
2. **Spacing & rhythm** — section padding, vertical rhythm, 8px grid
3. **Color recalibration** — desaturate, unify neutrals, keep brand accent
4. **Motion layer** — add restrained micro-interactions to existing components
5. **Hero & key-section recomposition** — restructure top-of-funnel
6. **Full block replacement** — only when the existing block is unsalvageable

## 5. Decision Tree

- IA, content, and SEO sound → **targeted evolution** (levers 1-4).
  ~70% of the value at ~40% of the risk.
- Visual debt is structural (broken IA, no design system, broken mobile)
  → **full redesign** with strict content preservation.
- Brand itself is changing → treat as **greenfield**.

## 6. What Never Changes Silently

Never modify without explicit user approval:

- URL structure / route slugs
- Primary nav labels
- Form field names or order (breaks analytics + autofill)
- Brand logo or wordmark
- Existing legal / consent / cookie copy

## 7. Implementation Rules

- Work with the existing tech stack. Do not migrate frameworks or styling
  libraries as part of a redesign.
- Before recommending any new library, check the project's dependency file.
- Keep changes reviewable and focused: small targeted improvements over
  big rewrites. Frontend implementation itself is delegated to `oma-frontend`.
