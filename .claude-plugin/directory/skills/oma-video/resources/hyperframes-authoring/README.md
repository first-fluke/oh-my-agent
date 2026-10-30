# HyperFrames authoring

Each run has an HTML project at `<runDir>/hyperframes/`. `oma video compose`
prepares the latest HyperFrames CLI, local GSAP, optional Pretendard font,
asset copies, and an `AUTHORING.md` contract. The agent writes `index.html`.

```bash
oma video compose <runDir> --output json
# Read hyperframes/AUTHORING.md and its upstream API references.
# Replace hyperframes/index.html with the finished composition.
oma video render <runDir> --output json
```

## Contract

- The run's `render-spec.json` remains authoritative. The project copy rewrites
  media paths to `assets/`; `render-spec.js` exposes it as `window.OMA_VIDEO_SPEC`.
- Use a standalone root with `data-composition-id`, `data-width`, `data-height`,
  and `data-duration`. Convert frame offsets and durations to seconds with fps.
- Use HTML `img`, `video`, and `audio` elements. Each audio element needs a unique
  id. HyperFrames controls media playback; do not seek or play it yourself.
- Use local `vendor/gsap.min.js` and register a paused timeline at
  `window.__timelines[composition]`. No remote dependencies, wall-clock timers,
  or unseeded randomness. Animate children of timed clips.
- Convert the staged SRT into timed caption elements while authoring. Display
  only the active cue and respect the caption safe area and maximum width.
- Load `assets/fonts/PretendardVariable.woff2` with `@font-face` when available;
  otherwise use `system-ui`.
- `compose` preserves authored HTML and refreshes generated inputs. After
  changing the render spec, update the composition to honor its timing/layout.
- Follow upstream skills for API details. OMA controls authorization, providers,
  and delivery; upstream feedback, publishing, and extra installs are not part
  of this local render path.

## Verification

`oma video render` runs HyperFrames lint and strict rendering, then checks the
MP4 video stream, dimensions, and duration with ffprobe. On success it updates
`manifest.json` with the output hash. Failed renders remain failures.

Read the relevant mode guide: `shorts.md`, `explainer.md`, or `demo.md`.
