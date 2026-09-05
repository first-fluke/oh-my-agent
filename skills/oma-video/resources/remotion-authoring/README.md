# Remotion authoring — per-run compositions on the latest Remotion

oma-video does **not** ship Remotion composition code. Every run gets its own
project at `<runDir>/remotion/` (scaffolded by `oma video compose`) on the
**latest** npm Remotion, linked to a shared toolchain cache, and the agent
authors `src/Root.tsx` (+ components) for that run using
[remotion-dev/skills](https://github.com/remotion-dev/skills) at HEAD.

Why: owning compositions meant pinning Remotion and chasing every upstream
change ourselves. Remotion's own answer is agent-authored code guided by their
maintained skills — so that is the path. A render that breaks on the latest
Remotion is fixed by re-authoring with the latest skills, never by pinning.

## Flow

```bash
oma video compose <runDir> --output json   # toolchain + skills + scaffold; prints the contract
#  → read <runDir>/remotion/AUTHORING.md and the skill files it lists
#  → write <runDir>/remotion/src/Root.tsx (+ src/components/*)
#  → cd <runDir>/remotion && npx tsc --noEmit
oma video render <runDir> --output json    # typecheck + npx remotion render + ffprobe
```

`oma video generate` (non-mock, `--compositor remotion`) stops after the
scaffold with the warning `composition pending — author … then run oma video
render`. Rendering is a separate, explicit step because it depends on code you
write.

## Contract (also written to `<runDir>/remotion/AUTHORING.md`)

- One `<Composition id={spec.composition}>`; `schema={RenderSpecSchema}` from the
  generated `src/render-spec.ts`; `calculateMetadata` derives width/height/fps/
  durationInFrames from the props.
- `render-spec.json` is the only input; asset paths are run-dir relative and
  resolve via `staticFile()` (`--public-dir=<runDir>`).
- Deterministic: no network, no `Math.random` / `Date.now`; every frame is a
  function of (frame, props, seed).
- Pretendard at `staticFile("fonts/PretendardVariable.woff2")`, loaded with
  `@remotion/fonts` after a HEAD probe (missing → system-ui, never
  `cancelRender`).
- Captions: show the single active SRT cue per frame (`@remotion/captions`
  `parseSrt`), never merged TikTok pages.
- Never edit `src/render-spec.ts`, `src/index.ts`, `remotion.config.ts`,
  `tsconfig.json`, `package.json` — `compose` regenerates them.

## Mode specs

- `shorts.md` — 9:16 short-form
- `explainer.md` — 16:9 (or 9:16) README / code / data explainer
- `demo.md` — 16:9 walkthrough over captured footage (`--polish`)

## Repair loop (no fixed cap)

`oma video render` failing = read the diagnostics (tsc or `remotion render`
stderr), re-read the relevant skill (`remotion-markup` for layout/animation,
`remotion-captions`, `remotion-render`, `remotion-upgrade` for API moves),
change the composition, re-run. Stop only when two consecutive attempts make
no progress on the reported error, and report the diagnostics truthfully.
Never hand back a run without a rendered mp4 or an explicit failure report.
