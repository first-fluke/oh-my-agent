# Prompt Enhancement Protocol

## Purpose

Transform vague user requests into detailed, section-by-section design
specifications that produce high-quality, specific output.

## When to Activate

Activate when the user request is vague:
- Less than 3 sentences
- No section details specified
- Generic terms like "make a landing page" or "design a website"

Do NOT activate when the user provides detailed specs (section layouts, specific components, color choices).

## Process

### 1. Input Analysis

Identify what the user explicitly specified vs what needs inference:

| Specified | Needs Inference |
|-----------|-----------------|
| "dark landing page" | which sections? |
| "for AI product" | what components? |
| "premium feel" | which animation strategy? |
| (nothing about mobile) | responsive approach? |

### 2. Section-by-Section Enhancement

For each section, specify:
1. **Layout**: structure, columns, alignment, max-width
2. **Background**: solid / gradient / video / animated shader
3. **Typography**: heading font + size + weight, body style
4. **Components**: specific elements (badges, cards, buttons, forms)
5. **Motion**: entrance animation, scroll behavior, hover effects
6. **Responsive**: how it changes on mobile vs desktop

### 3. Enhancement Template

```
SECTION: [Name]
- Layout: [structure description]
- Background: [background treatment]
- Content:
  - [element 1]: [description with styling notes]
  - [element 2]: [description with styling notes]
- Motion: [animation approach]
- Responsive: [mobile behavior]
```

## Example Enhancement

User input: "Make a landing page for my SaaS product."

Use the supplied product description, brand, and existing project stack. Resolve missing
product facts before writing claims. This outline demonstrates layout choices, not a
required list of sections or dependencies.

```text
SECTION: Hero
- Layout: clear heading, supporting paragraph, primary action; max-width suited to copy
- Background: existing brand surface with measured text contrast
- Content: verified product benefit and functional CTA; omit an announcement if none exists
- Typography: heading clamp(2rem, 6vw, 5.5rem); body at least 16px on mobile
- Motion: optional brief fade; content remains visible with reduced motion or JS disabled
- Responsive: maintain reading order; actions may stack on narrow screens

SECTION: Relevant product features
- Layout: comparable features share one pattern; use a list or grid based on content
- Content: only features supplied in the brief; preserve qualifiers and limits
- Visual: actual screenshot when useful and available; otherwise omit or label a placeholder
- Icons: reuse the project's selected family if needed; no new library by default
- Surface: normal project surfaces; reserve glass or other effects for a justified accent
- Responsive: readable text and touch targets without horizontal overflow

SECTION: Evidence (only when provided)
- Content: approved customer names/logos, metrics, or attributed testimonials
- Do not invent partner companies, adoption figures, quotations, or endorsements
- Omit this section when no evidence is supplied

SECTION: CTA and footer
- Content: one label per action; include supplied contact/legal destinations
- Layout: preserve visible focus and adequate contrast in both themes
```

Any demo-only company, metric, or quote must be labeled as a placeholder and replaced
before production delivery. Add motion/video dependencies only when the brief and project
justify them. Keep the specification proportional to the requested page.

## Post-Enhancement

After presenting the enhanced prompt:
1. Resolve only material unanswered choices; proceed under existing authorization when the brief is sufficient
2. Apply feedback
3. Proceed to Phase 4 (Propose) with the refined specification
