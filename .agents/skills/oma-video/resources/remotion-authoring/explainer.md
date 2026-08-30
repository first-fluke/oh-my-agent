# Explainer (16:9 / 9:16) — layout spec

Composition id `Explainer`. 1920×1080 default; honour the spec's dimensions.

- Scenes are slide frames (`visual.type: "slide"`), diagrams/stills (`image`), or code frames; render with `<Img>` `objectFit: contain` on the background color so slide edges are never cropped (use `cover` only for photographic stills).
- **On-screen text**: lower-left title band for 16:9 (bottom `safeArea.bottomPct%`, left `safeArea.leftPct%`, 48px, weight 700, dark 55% band, 12px radius); for 9:16 use the Shorts top placement.
- **Captions** (`lower-third` default): left-aligned, 40px, band `rgba(0,0,0,.55)`, `padding: 12px 20px`, radius 12, within the safe area.
- **Transitions**: `transitionOut` when present → 12-frame cross-fade into the next scene; otherwise hard cut.
- **Ken Burns** only when `kenBurns: true` (diagrams usually false).
- Audio as in shorts.md.
