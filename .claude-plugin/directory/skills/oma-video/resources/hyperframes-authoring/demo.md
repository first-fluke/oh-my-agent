# Demo (16:9, `--polish`) — layout spec

Composition id `Demo`. The human-recorded capture arrives as
`background.type: "video"` (full-frame, `<video>`, `objectFit: cover`);
scenes are overlays on top of it.

- **Opening**: start on the capture. Add an intro card only when the user asks for one: solid brand color, centered title 72px weight 800, hard cut in and out.
- **Callout scenes**: box the exact text or button the narration points to with a thin accent outline. `onScreenText` appears as a lower-third pill (bottom `safeArea.bottomPct%`, 40px, weight 700, band `rgba(0,0,0,.6)`) only when it adds something the narration does not say.
- **Zoom**: when the narration points at a region, scale and translate the background layer so that region fills the view. Ease out once on the frame where the narration reaches it, then hold still; drive it from the frame, not the clock. Choose the region from the inspected frames; the render spec's `kenBurns` flag is not the zoom signal.
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
