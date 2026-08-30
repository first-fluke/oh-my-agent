# Demo (16:9, `--polish`) — layout spec

Composition id `Demo`. The human-recorded capture arrives as
`background.type: "video"` (full-frame, `<OffthreadVideo>`, `objectFit: cover`);
scenes are overlays on top of it.

- **Intro card** (first scene, usually `placeholder` visual + `onScreenText`): solid brand color, centered title 72px weight 800, 10-frame fade in/out.
- **Callout scenes**: `onScreenText` as a lower-third pill (bottom `safeArea.bottomPct%`, 40px, weight 700, band `rgba(0,0,0,.6)`); `kenBurns: true` on a callout scene means a gentle zoom of the **background capture** (1 → 1.06) for that scene's duration — implement by scaling the background layer while the scene is active, deterministically from the frame.
- **Captions**: as `lower-third` in explainer.md.
- Never obscure the center 60% of the frame during callouts; the capture is the content.
- Audio as in shorts.md; the capture's own audio track is muted unless `audio.narration` is absent.
