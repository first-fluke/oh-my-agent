# Motion Principles

Rules for authoring `script.json` and the HyperFrames composition. The mode
guides in `hyperframes-authoring/` define layout; these rules define what
appears, what moves, and when, and they replace any conflicting guidance
elsewhere in this skill. Only an explicit user request or brand guide
overrides them. Numbers are starting points, not gates.

## Scenes

- One idea per scene, drawn as one diagram or visual. Each narration sentence
  adds at most one element to it; no decoration per sentence.
- Explainer scenes run about 15-20 seconds. Split a scene that passes about 25
  seconds or carries two subtopics. Shorts keep their short scenes.
- Scene cast: one hero object, one or two supporting objects, at most one text
  block (a number, a label). Fold an eighth group into a summary instead of
  adding it.
- When an event finishes, move on; do not hold a finished screen. Do not open
  on a decorative intro.

## Motion

- Animate only when something enters or changes state, then settle. No idle
  floating, wobble, breathing zoom, or colour cycling.
- Keep the anchor fixed and change only the subject. Motion that explains no
  relation is an instant replace. No page-turn effects.
- A hard concept gets a still screen that defines it; a simple relation gets
  one arrow.
- Entrances ease out (an `easeOutExpo`-like curve) and move by transform
  rather than fading in.
- Transitions happen only at scene boundaries. Cut hard by default; use a
  dissolve or fade only when requested.
- A standout effect appears once or twice per video, not per scene.
- Keep sizes, positions, emphasis boxes, and backing plates consistent across
  the video.

## Text

- Text is the last resort. Drawable words become objects, logos, or charts:
  a comparison as bars, a change as a line, a ratio as a 10-cell grid, an
  order as arrows.
- Do not repeat the caption as on-screen text. Leave `onScreenText` empty when
  it would duplicate the narration.

## Picture and narration

- The picture never runs ahead of the narration. Show a new object on the
  frame where its word is spoken (`timing.json` word timings); captions start
  with the speech.
- Show what is being talked about. "I built the app" shows the app; terminals
  and code appear only when the process itself is the subject.
- Prefer the real thing. When a real source exists (the repository, the post,
  the official site, the product screen), use a user-supplied screenshot or
  recording rather than a generated image; never automate a login. Generated
  stills cover concepts with no real counterpart.
- Use footage only for words meant literally: one clip per sentence, each held
  for at least 3 seconds.

## Recordings

- Zoom to where the narration points and box the exact text or button; mark
  people and objects with arrows. No decoration over the recording.
- Cut instantly from one recording to the next.
- Mask personal information before rendering (`hyperframes-authoring/demo.md`).

## Diagrams

Build each diagram in four steps:

1. Write its message as one sentence.
2. State the question it answers.
3. Pick its form from the vocabulary in Text (bars, line, grid, arrows) or a
   plain object.
4. Check it against the scene cast, motion, and text rules above, marking each
   pass, partial, or fail. Fix every fail before rendering.

## Sound

Sound effects follow `sound-design.md`: only at scene boundaries and points of
emphasis, at most 15 per minute, and never the same file twice within 30
seconds.
