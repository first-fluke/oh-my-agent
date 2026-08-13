# Embedded fonts (Pretendard)

`src/load-fonts.ts` embeds **Pretendard Variable** via `@remotion/fonts`
`loadFont()`. Embedding the font locally — instead of relying on a system font
or a network fetch — is what makes a render **byte-identical across machines**
(design 013 §5; design rule 2: CJK-ready font priority).

## What goes here

```
public/fonts/PretendardVariable.woff2
```

`staticFile("fonts/PretendardVariable.woff2")` resolves to this path at render
time. The `.woff2` is **not committed** to keep the skill tree light.

## How it is provisioned

`oma video doctor --install` fetches the font once into this directory
(release-pinned, no fetch during a render). If the fetch fails — e.g. offline —
doctor warns and continues; `ensurePretendard()` then swallows the missing file
and the browser falls back to the system stack defined in `FONT_STACK`
(`system-ui, -apple-system, …`). The render still succeeds, but byte-identical
output across machines is only guaranteed once the font is present (re-run
`oma video doctor --install` with network to fetch it).

Source: Pretendard (OFL-1.1) — https://github.com/orioncactus/pretendard
Pinned release: `v1.3.9` via jsDelivr (see `PRETENDARD_FONT_URL` in
`cli/commands/video/internal/remotion-project.ts`). Keep the pin in sync so
renders stay reproducible.
