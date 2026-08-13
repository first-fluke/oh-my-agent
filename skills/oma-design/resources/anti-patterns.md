# Anti-Patterns: AI Design Slop Detection

> "If you showed this interface to someone and said 'AI made this,'
>  would they believe you immediately? If yes, that's the problem."

## Typography
- DON'T: Default to custom Google Fonts when system fonts suffice
- DON'T: Reach for Inter as the default custom sans. When a custom font is justified (brand identity), pick deliberately from alternatives first (Geist, Outfit, Cabinet Grotesk, Satoshi, or a brand-appropriate face). Inter-by-reflex is the LLM signature. OVERRIDE: Inter is acceptable when the user explicitly asks for a neutral / standard / Linear-style feel, or the brief is public-sector / accessibility-first. CJK rules always win (Pretendard Variable / Noto Sans CJK)
- DON'T: Load 3+ font families without clear justification
- DON'T: Set body text below 16px on mobile
- DON'T: Use light font-weight (300) for body on dark backgrounds without testing contrast
- DON'T: Apply identical letter-spacing to headings and body
- DON'T: Use latin-only fonts when the service targets CJK users
- DO: Start with system font stack, add custom fonts only for brand identity
- DO: For CJK services, add Pretendard or Noto Sans CJK explicitly
- DO: Use modular type scale with clamp() for fluid sizing
- DO: Test CJK characters at every size (line-height 1.7-1.8)
- DO: Use font-display: swap to prevent FOIT
- DO: Subset fonts to needed character ranges for performance

## Color & Gradient
- DON'T: Purple-to-blue linear gradient backgrounds (strongest AI slop signal)
- DON'T: Purple-to-pink gradient text
- DON'T: Rainbow/multi-stop gradient borders
- DON'T: Gradient orbs/blobs as hero decoration ("AI SaaS look")
- DON'T: Mesh gradient backgrounds as primary visual
- DON'T: Gradient + glassmorphism + blur combo (triple AI slop)
- DON'T: Gray text on colored backgrounds without checking contrast
- DON'T: Pure white (#fff) on pure black (#000); too harsh, causes eye strain
- DON'T: Rely on color alone to convey meaning (accessibility violation)
- DO: Use solid colors or subtle single-hue gradients
- DO: Derive gradients from brand colors with clear functional purpose
- DO: Prefer texture (noise, grain, dither) over gradient for visual interest
- DO: Use gradients only for functional purposes (fade overlays, depth cues)
- DO: Name colors semantically ("Deep Ocean Navy #1a2332" not "dark blue")
- DO: Test with color blindness simulators before finalizing palette

## Layout & Space
- DON'T: Nested cards inside nested cards
- DON'T: Mix spacing values outside the 8px grid scale
- DON'T: Hero sections with identical 3-metric stats layout (AI pattern)
- DON'T: Generate fixed-width desktop-only layouts
- DON'T: Use padding less than 16px on mobile containers
- DON'T: Force identical card heights with arbitrary min-height
- DON'T: Use the same card grid layout for every section
- DO: Consistent section rhythm (same vertical padding across similar sections)
- DO: Responsive-first: mobile layout as default, enhance upward
- DO: Every section must work at 375px width minimum
- DO: Mix layout patterns within a page (chess, grid, bento, full-bleed)
- DO: Use gap instead of margins for grid/flex children

## Motion & Animation
- DON'T: Bounce easing on everything (strongest motion AI slop signal)
- DON'T: Animation duration > 800ms for UI transitions
- DON'T: Animate layout-triggering properties (width, height, top, left)
- DON'T: Auto-play animations that cannot be paused (a11y violation)
- DON'T: More than 2-3 animated elements visible simultaneously
- DON'T: Use will-change on everything; consumes GPU memory
- DON'T: Use linear easing for UI elements; looks robotic
- DO: Animate only transform and opacity for 60fps
- DO: 150ms for micro-interactions, 200-500ms for transitions
- DO: Always honor prefers-reduced-motion media query
- DO: Use Intersection Observer to trigger animations only when visible
- DO: Pause off-screen Canvas/WebGL renderers

## Content & Copy
- DON'T: Generic persona names ("John Doe", "Jane Smith") or slop brand names ("Acme", "Nexus", "SmartFlow", "Cloudly")
- DON'T: Fake-perfect numbers (99.99%, 50%, 1234567); use organic data (47.2%) or label mocks explicitly
- DON'T: Fake-precise specs the brand never claimed (invented "5.8mm", "4.1x" for spec aesthetics)
- DON'T: Filler verbs — "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize", "Game-changer"
- DON'T: Lorem Ipsum; write real draft copy
- DON'T: Poetic/performative section labels ("From the field", "Quietly trusted by", "On our desks"); use plain functional labels ("Testimonials", "Latest writing") or none
- DON'T: Section-number eyebrows ("001 · Capabilities", "06 · how it works") or version labels in the hero (BETA, V0.6) unless the brief is a launch
- DON'T: Scroll cues ("Scroll to explore", animated mouse icons) or decorative locale/time/weather strips
- DON'T: Mix copy registers (technical mono + editorial prose + marketing punch) in one page without brand justification
- DON'T: Quotes longer than 3 lines; attribution is name + role, never name only ("- Sarah")
- DON'T: Em-dash (`—`) ANYWHERE in visible output — the #1 LLM stylistic tell. Zero tolerance: banned in headlines, eyebrows, pills, body copy, quotes, attribution, captions, button text, and alt text. No "sparingly" allowance — the model ignores soft limits. Restructure instead: two sentences, a comma, parentheses, or a colon
- DON'T: En-dash (`–`) as a separator; date ranges (2018-2026) and number ranges use a plain hyphen. The only permitted dashes are the hyphen (`-`) and the math minus sign
- DO: Copy self-audit before handoff — re-read every visible string; rewrite anything grammatically broken, unclear-referent, or AI-cute. Plain functional copy beats clever broken copy
- DO: One label per CTA intent across the page
- DO: Apply register rules per content language (CJK copy follows i18n-guide)

## Consistency Locks
- DON'T: Introduce a second accent color mid-page (a rose-accented site does not get a teal badge in the footer)
- DON'T: Mix corner-radius systems without a documented rule (round buttons in a square layout is broken design)
- DON'T: Invert theme for a single section mid-page (one light warm-paper section inside a dark page reads as a paste accident)
- DO: Pick accent, radius scale, and theme ONCE per page; lock them; audit every component against the locks before handoff
- DO: If a deliberate full theme switch is a composition device, use it at most once per page with a strong transition

## Assets & Imagery
- DON'T: Div-based fake screenshots (fake dashboards, task lists, terminal windows built from styled divs) — the #1 AI-design tell
- DON'T: Text-only pages passing as "minimalism"; even restrained pages need 2-3 real images
- DON'T: Plain text wordmarks in "Trusted by" logo walls; use real SVG logos or generated monogram marks
- DON'T: Hand-rolled SVG icons or decorative illustrations by default
- DON'T: Pills/labels overlaid on images, photo-credit captions as decoration, guessed Unsplash URLs
- DO: Source priority: image generation (oma-image) → picsum seed → labeled placeholder slot + tell the user
- DO: See `resources/asset-strategy.md` for full rules

## Iconography
- DON'T: Default to `lucide-react`. It ships with shadcn/ui, so every AI-generated site carries the same icon set. OVERRIDE: acceptable when the user explicitly asks for it, or the project already depends on it (including shadcn base components — never mix families to escape it)
- DON'T: Hand-roll SVG icon paths. If a glyph is missing, install a second allowed library or compose from primitives
- DON'T: Mix icon families in one component tree (no Phosphor + Lucide together)
- DON'T: Inconsistent stroke widths; standardize strokeWidth globally (e.g. 1.5 or 2.0)
- DO: Pick deliberately, priority order: `@phosphor-icons/react` > `hugeicons-react` > `@radix-ui/react-icons` > `@tabler/icons-react`
- DO: One icon family per project, declared in DESIGN.md

## Components
- DON'T: Glassmorphism on every element; reserve for badges, nav pills, accent cards
- DON'T: Icon + Title + Description card grid as the only layout pattern
- DON'T: Hover-only interactions without touch/keyboard alternatives
- DON'T: Identical card heights forced with arbitrary min-height
- DO: Mix section patterns within a page (chess + grid + stats + testimonials)
- DO: Choose component libraries intentionally (shadcn for base, Aceternity/React Bits for accents)
- DO: All interactive elements must have visible focus states
- DO: Include install commands when recommending components
