# Asset Strategy: Images, Logos, and Visual Material

Choose visual material that supports the brief. Product demonstrations, portfolios,
and photo-led pages often need images; documentation and operational screens can be
text-only. Do not add images to meet a minimum count.

## Source Selection

1. Prefer relevant assets already supplied by the user or project: real product
   screenshots, approved brand marks, and photography.
2. Generate an asset through `oma-image` when the brief needs an original image and
   that generation is within the requested scope. Match its aspect ratio to placement.
3. Use verified stock or placeholder URLs when allowed. Label placeholders as such;
   do not present stock photography as the user's product or an actual customer.
4. If a required asset is unavailable, leave a labeled slot and report the missing
   placement. If the content does not need an image, omit the slot.

Never emit guessed/unverified asset URLs. Decorative assets should not replace a
real demonstration when the page makes a claim about an existing product.

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
- Use a generated concept only when the brief asks for one, and label it as a concept rather than the actual product
- Use a real component preview (an actual mini-version of the UI on the page)
- Or skip the preview and use editorial photography

A decorative background does not substitute for a product demonstration when the brief requires one.

## Hand-Rolled SVG

- Icons: always from a library (see component guidance); never draw icon
  paths from scratch. One icon family per project, standardized strokeWidth.
- Decorative illustrations: strongly discouraged as default. Acceptable only
  when the brief explicitly asks, the mark is a single simple geometric
  shape, and quality is assured.
