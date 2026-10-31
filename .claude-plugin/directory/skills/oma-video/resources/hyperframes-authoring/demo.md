# Demo (16:9, `--polish`) — layout spec

Composition id `Demo`. The human-recorded capture arrives as
`background.type: "video"` (full-frame, `<video>`, `objectFit: cover`);
scenes are overlays on top of it.

- **Intro card** (first scene, usually `placeholder` visual + `onScreenText`): solid brand color, centered title 72px weight 800, 10-frame fade in/out.
- **Callout scenes**: `onScreenText` as a lower-third pill (bottom `safeArea.bottomPct%`, 40px, weight 700, band `rgba(0,0,0,.6)`); `kenBurns: true` on a callout scene means a gentle zoom of the **background capture** (1 → 1.06) for that scene's duration — implement by scaling the background layer while the scene is active, deterministically from the frame.
- **Captions**: as `lower-third` in explainer.md.
- Never obscure the center 60% of the frame during callouts; the capture is the content.
- Audio as in shorts.md; the capture's own audio track is muted unless `audio.narration` is absent.

## Personal information (required)

A human recording shows whatever was on screen. Before authoring, sample frames
across the whole capture through the existing-media branch
(`../existing-media.md`) and inspect them with the host vision tool. Look for
user names in paths and prompts, account names and avatars, email addresses,
sidebars and file lists (editor, Finder, Orca), notifications, session and
request IDs, tokens or keys, memo and chat windows, and browser tabs or
bookmarks.

- Keep each finding out of the delivered frame: frame the zoom so it falls
  outside the view, or cover it with an opaque layer timed to the interval it
  is visible (`data-start` / `data-duration`). Do not rely on blur or
  pixelation for text.
- Record each masked region and interval for the delivery report. The source
  capture stays unmasked in the run directory; never deliver it.
- If frames cannot be inspected (no vision tool, no frame extraction), stop
  and report that the capture is unchecked instead of rendering it.
