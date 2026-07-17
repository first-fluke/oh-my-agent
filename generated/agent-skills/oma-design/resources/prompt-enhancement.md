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

### User Input
> "Make a landing page for my SaaS product"

### Enhanced Output

```
SECTION: Hero
- Layout: centered, full viewport height, max-w-5xl
- Background: subtle animated gradient (brand colors) or solid dark
- Content:
  - Badge: glass pill with announcement text ("New: Feature X launched")
  - Heading: display font, clamp(2rem, 5.5rem), tight leading (0.9)
  - Subtext: body font, muted color, max-w-md, font-light
  - CTA: primary button (solid) + secondary button (glass outline)
- Motion: heading BlurText word reveal, subtext fade-in at 0.8s delay
- Responsive: heading scales down 2 steps, buttons stack vertically

SECTION: Social Proof
- Layout: horizontal bar below hero, centered
- Background: transparent (same as hero)
- Content:
  - Badge: glass pill "Trusted by teams at..."
  - Logos/names: infinite marquee scroll, 5-8 partner names
- Motion: continuous marquee, pauses on hover
- Responsive: reduce gap, smaller text

SECTION: Features (Chess Layout)
- Layout: alternating text/image rows, py-24 px-6 md:px-16 lg:px-24
- Background: solid dark
- Content per row:
  - H3 heading + paragraph + CTA button
  - Image/video/GIF in glass rounded container
  - Row 1: text left, image right
  - Row 2: image left, text right (lg:flex-row-reverse)
- Motion: fade-in on scroll intersection
- Responsive: stack vertically on mobile (image above text)

SECTION: Features (Grid)
- Layout: 3-4 column card grid, gap-6
- Content per card:
  - Icon in glass circle (w-10 h-10)
  - Title: heading font, text-lg
  - Description: body font, muted, text-sm
- Motion: staggered entrance on scroll
- Responsive: 1 col mobile → 2 col tablet → 3-4 col desktop

SECTION: Stats
- Layout: glass card, 4-column grid, centered
- Background: desaturated video or solid with texture
- Content:
  - 3-4 large display numbers + small labels
  - Values: display font, text-5xl
  - Labels: body font, muted, text-sm
- Motion: number count-up on scroll intersection
- Responsive: 2x2 grid on mobile

SECTION: Testimonials
- Layout: 3-column grid
- Content per card:
  - Glass surface card, p-8
  - Quote: italic, muted white (text-white/80)
  - Avatar + Name + Role
- Motion: none or subtle fade-in
- Responsive: 1 col stack on mobile

SECTION: CTA
- Layout: centered, py-32
- Background: gradient overlay or video
- Content:
  - Large heading: display font, text-6xl
  - Subtext: body font, muted
  - Two buttons: primary (solid) + secondary (glass)
- Responsive: heading scales down, buttons stack

SECTION: Footer
- Layout: multi-column links grid + copyright bar
- Content:
  - 4 columns: Product, Company, Resources, Legal
  - Bottom bar: copyright + links (text-white/40 text-xs)
  - Border-top: border-white/10
- Responsive: stack into 2 columns on mobile, 1 on small mobile
```

## Worked Example: Landing Page Prompt

This is the level of detail Phase 3 (Enhance) should produce.
Based on motionsites.ai-level specifications.

### Project Context
- Dark premium SaaS landing page
- React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Pure black background throughout
- "Liquid glass" morphism effect for UI chrome

### Design System

#### Fonts
- Heading: Instrument Serif (italic) for display headings only
- Body: system-ui stack (or Pretendard for CJK)

#### CSS Variables
```css
:root {
  --background: 0 0% 3.9%;
  --foreground: 30 10% 95%;
  --primary: 142 71% 45%;
  --primary-foreground: 0 0% 3.9%;
  --border: 0 0% 100% / 0.1;
  --radius: 0.75rem;
}
```

#### Liquid Glass Utility
```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(4px);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
/* ::before pseudo-element for gradient border mask */
```

### Section Specifications

#### HERO (full viewport)
- **Layout**: centered, min-h-screen, flex column
- **Background**: video (mp4, autoplay loop muted) with gradient overlay to black at bottom
- **Badge**: liquid-glass rounded-full pill with "New" tag + announcement text
- **Heading**: BlurText component (motion/react), word-by-word blur-to-clear animation
  - text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic
  - leading-[0.8] tracking-[-4px]
- **Subtext**: motion.p, fade-in with blur at 0.8s delay
  - text-white/60 font-body font-light max-w-md
- **CTAs**: motion.div at 1.1s delay
  - Primary: liquid-glass-strong rounded-full + ArrowUpRight icon
  - Secondary: text-only "Watch the Film" + Play icon
- **Responsive**: heading clamp(2rem, 5.5rem), CTAs stack on mobile

#### PARTNERS BAR
- **Layout**: centered column, below hero
- **Badge**: liquid-glass rounded-full labeled "Trusted by the teams behind"
- **Names**: horizontal row, text-2xl md:text-3xl font-heading italic text-white, gap-12
- **Companies**: Stripe, Vercel, Linear, Notion, Figma
- **Responsive**: reduce gap, text-xl on mobile, wrap if needed

#### HOW IT WORKS (video background)
- **Layout**: full-width, min-h-[700px], py-32 px-6 md:px-16 lg:px-24
- **Background**: HLS video (hls.js), absolute cover, z-0
  - Top + bottom fade gradients (200px each, black ↔ transparent)
- **Content** (z-10, centered):
  - Badge: liquid-glass rounded-full labeled "How It Works"
  - Heading: "You dream it. We ship it."
  - Subtext: description paragraph
  - Button: liquid-glass-strong rounded-full + ArrowUpRight

#### FEATURES CHESS (alternating rows)
- **Layout**: py-24 px-6 md:px-16 lg:px-24
- **Header**: badge "Capabilities", heading "Pro features. Zero complexity."
- **Row 1** (text left, image right):
  - H3 + paragraph + CTA button
  - Image in liquid-glass rounded-2xl container
- **Row 2** (image left, text right; lg:flex-row-reverse):
  - Same structure, reversed layout
- **Responsive**: stack vertically, image above text on mobile

#### FEATURES GRID (4 columns)
- **Layout**: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- **Each card**: liquid-glass rounded-2xl p-6
  - Icon: liquid-glass-strong rounded-full w-10 h-10
  - Title: text-lg font-heading italic text-white
  - Description: text-white/60 font-body font-light text-sm
- **Responsive**: 1 col → 2 col → 4 col

#### STATS (video background)
- **Background**: HLS video, desaturated (filter: saturate(0))
  - Top + bottom black fades (200px)
- **Content**: liquid-glass rounded-3xl p-12 md:p-16
  - Grid: grid-cols-2 lg:grid-cols-4 gap-8 text-center
  - Values: text-4xl md:text-5xl lg:text-6xl font-heading italic
  - Labels: text-white/60 font-body font-light text-sm
- **Responsive**: 2x2 on mobile, 4-col on desktop

#### TESTIMONIALS
- **Layout**: 3-column grid
- **Each card**: liquid-glass rounded-2xl p-8
  - Quote: text-white/80 font-body font-light text-sm italic
  - Name: text-white font-body font-medium text-sm
  - Role: text-white/50 font-body font-light text-xs
- **Responsive**: 1 col stack on mobile

#### CTA + FOOTER
- **Background**: HLS video + top/bottom black fades
- **CTA Content** (z-10, centered):
  - Heading: text-5xl md:text-6xl lg:text-7xl
  - Subtext: description
  - Buttons: liquid-glass-strong + bg-white text-black
- **Footer**: mt-32 pt-8 border-t border-white/10
  - Links: Privacy, Terms, Contact (text-white/40 text-xs)
  - Copyright: (c) 2026 Studio

### Dependencies
- hls.js (HLS video streaming)
- motion (animation; import from "motion/react")
- lucide-react (icons)
- tailwindcss-animate

### Key Patterns
- All badges: liquid-glass rounded-full px-3.5 py-1 text-xs font-medium
- All headings: text-4xl md:text-5xl lg:text-6xl font-heading italic tracking-tight leading-[0.9]
- All video fades: 200px height gradient overlays
- Page wrapper: bg-black overflow-visible

## Post-Enhancement

After presenting the enhanced prompt:
1. Ask the user for confirmation or adjustments
2. Apply feedback
3. Proceed to Phase 4 (Propose) with the refined specification
