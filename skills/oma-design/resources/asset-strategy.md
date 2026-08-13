# Asset Strategy: Images, Logos, and Visual Material

Landing pages and portfolios are visual products. A text-only page with
fake-screenshot divs is slop, not minimalism. Even a restrained editorial
page needs at least 2-3 real images (hero, one product/lifestyle shot,
one supporting image).

## Source Priority (in order)

1. **Image generation first.** If an image-generation path is available,
   use it — in the oma ecosystem, route to the `oma-image` skill
   (Codex gpt-image-2 / nano-banana / Pollinations). Generate
   section-specific assets at the right aspect ratio: hero photography,
   product shots, texture backgrounds, mood images. Do not skip this
   because hand-rolled CSS feels faster.
2. **Real web images second.** When no generation tool is available:
   - `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` for
     placeholder photography. The seed should describe the section
     (e.g. `oma-cookware-kitchen`), not be random.
   - Actual stock or brand URLs when the brief provides them.
   - Open-license sources (Unsplash direct URL, Pexels) if explicitly allowed.
     Never emit guessed/unverified Unsplash URLs — they break.
3. **Last resort: tell the user.** Do NOT fill the page with hand-rolled
   SVG illustrations or div-based fake screenshots. Leave clearly labeled
   placeholder slots (`<!-- TODO: hero product photo, 1600x1200 -->`) and
   report at the end: "This page needs real images at: [placements]."

## Logo Walls ("Trusted by" / "Used by")

- Use real SVG logos, never plain text wordmarks styled in a row:
  - **Simple Icons**: `https://cdn.simpleicons.org/{slug}/{hex}` or the
    `simple-icons` npm package (most known brands)
  - **devicon** for tech-stack logos
- Invented brand name → invented mark: generate a simple monogram
  (one letter in a circle, two-letter ligature, abstract glyph) as inline
  `<svg>` matching the page style.
- Logos must render in both light and dark mode (single-color theme
  variable, or white-on-dark / black-on-light variants).
- **Logo-only rule**: a logo wall is logos and nothing else. No industry
  or category labels under each logo. Brand name goes in alt text.
- The logo wall lives in its own section directly BELOW the hero,
  never inside the hero.

## Product Previews

Div-based fake screenshots are banned: no fake task lists, fake dashboards,
or fake terminal windows built from styled `<div>` rectangles. If you need
to show a product:

- Use a real screenshot URL if one exists
- Generate one via the image tool
- Use a real component preview (an actual mini-version of the UI on the page)
- Or skip the preview and use editorial photography

A hero of "text + gradient blob" is a placeholder, not a hero.

## Hand-Rolled SVG

- Icons: always from a library (see component guidance); never draw icon
  paths from scratch. One icon family per project, standardized strokeWidth.
- Decorative illustrations: strongly discouraged as default. Acceptable only
  when the brief explicitly asks, the mark is a single simple geometric
  shape, and quality is assured.
