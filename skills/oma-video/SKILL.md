---
name: oma-video
description: Create short, explainer, or recorded-demo videos through the OMA
  video CLI. Use for scripts, narration, assets, composition, and video
  delivery.
---

# Video Router

## Scheduling

### When to use

Use this skill for a short/reel, README or code explainer, or demo walkthrough.

| Request | Mode | Default aspect | Required source |
|---|---|---|---|
| Short, reel, social clip | `shorts` | `9:16` | Topic or brief |
| README, code, data explanation | `explainer` | `16:9` | Topic or source path |
| Demo or walkthrough | `demo` | `16:9` | Human recording via `--capture` |

### When NOT to use

Use `oma-image` for a still image, `oma-slide` for a deck, `oma-voice` for
audio only, and `oma-explanation` for an interactive HTML explainer. Editing an
existing finished video and live streaming are out of scope.

## Structural Flow

Inputs are a brief plus optional mode, aspect, locale, captions, visual, voice,
music, duration, compositor, capture path, and seed. Outputs live in
`.agents/results/videos/<timestamp>-<shortid>-<mode>/`:

- `script.json`, `timing.json`, and `render-spec.json` form the deterministic
  asset bus.
- Captions and acquired audio/visual assets are recorded in `manifest.json`
  with hashes, providers, cost, warnings, and exit code.
- A successful real render contains `<mode>-<slug>.mp4`, an encoded video
  stream, and a positive ffprobe duration.

`OMA_VIDEO_MOCK=1` is a test harness only. It can create deterministic text
placeholders with an `.mp4` name; those files are never a user deliverable. A
missing Remotion/MPT toolchain, an un-authored composition, a render error, or
an invalid video fails with diagnostics and leaves the script/render spec for
recovery.

### Decide and confirm

Infer mode when clear: short/reel -> `shorts`; README/code/data/explain ->
`explainer`; demo/walkthrough/capture -> `demo`. For a one-line request, state
the inferred mode, aspect, duration, visual strategy, captions, locale, and
voice/music before invoking. Do not make the user complete a questionnaire
when those defaults are clear.

Ask only when it changes the result: an ambiguous mode/source, a required demo
recording, or a cost confirmation. Respect an explicit mode, aspect, duration,
captions, or voice verbatim.

For a demo, a human records the screen and controls login. `--source web --url`
provides context only; it never automates login or starts a recorder. Without
`--capture`, return guided capture instructions and stop.

## Logical Operations

### Guardrails

1. Keep output and capture paths inside `$PWD` unless external output is
   explicitly allowed. Validate capture formats and copy external assets into
   the run directory. Mask URL query/hash tokens in logs and manifests.
2. Provider configuration is key-optional: use the configured chain. Paid
   providers require their environment key and the cost guardrail. Local
   fallbacks may replace voice, visuals, captions, or music; record coverage in
   warnings. A compositor failure is never a fallback video.
3. Confirm estimated spend at or above `cost.guardrail_usd` or `--max-usd`
   unless `--yes` or `OMA_VIDEO_YES=1` authorizes it.
4. Respect `limits.max_duration_sec` (180) and `limits.max_scenes` (40).
   Cancel subprocess work on SIGINT/SIGTERM.
5. Keep run directories. Never auto-prune a user’s video artifacts.
6. `--dry-run` writes only planning artifacts and does no provider render.
   It does not prove an MP4 exists.

### Canonical command path

```bash
# Plan or create the asset bus. Supply --script whenever an agent authored it.
oma video generate "Jeju coffee" --mode shorts --aspect 9:16 \
  --captions tiktok --script ./script.json --output json

# Deterministic planning only; no real render or provider work.
oma video generate "explain this project" --mode explainer --seed 42 --dry-run

# Human-recorded demo input.
oma video generate "feature walkthrough" --mode demo --capture <absolute-path>.mp4

# Scaffold the per-run Remotion project, author src/Root.tsx as instructed,
# then render and validate the encoded output.
oma video compose <runDir> --output json
oma video render <runDir> --output json

# Diagnose required toolchains without changing a run.
oma video doctor
oma video provider list
```

`oma video generate --output json` returns
`{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`.
Read video and asset paths from the manifest; the JSON envelope has no
`outputs` field.

### Failure and recovery

- Missing Remotion composition: `oma video compose <runDir>` prepares the
project and authoring contract. Author `<runDir>/remotion/src/Root.tsx` using
the generated `AUTHORING.md`, then invoke `oma video render <runDir>`. The
command typechecks, renders, and ffprobes the output. Fix a reported composition
or toolchain failure and re-run; return a failure report when it cannot render.

- Missing MPT toolchain: `--compositor mpt` requires the installed checkout, its virtual environment,
and ffmpeg. Use `oma video doctor --install-mpt` when setup is authorized and
available. MPT setup failures, driver failures, and non-video output fail with
the diagnostic; they do not write a placeholder MP4.

Success means all asset schemas and manifest hashes validate and a real MP4
passes video-stream and duration validation. A partial success may use a
key-free visual, timing, caption, or music fallback, but it still requires that
real video validation.

## References

### Conditional resources

Load only what the task needs:

- `resources/execution-protocol.md` for the full ordered pipeline, failure
  mapping, and JSON reporting rules.
- `resources/vendor-matrix.md` before changing providers, keys, cost, or
  fallback order.
- `resources/script-schema.md` when authoring or validating `--script` input.
- `resources/prompt-tips.md` when turning a brief into scene prompts.
- `resources/remotion-authoring/README.md` and the selected mode guide before
  writing `Root.tsx`.
- `resources/checklist.md` before handing a real video to a user.

### Verification

For CLI/runtime changes, add a regression test for the affected success and
failure paths. At minimum run the focused Vitest files, for example:

```bash
cd cli
bunx vitest run commands/video/providers/compositor.test.ts \
  commands/video/orchestrator.test.ts
bunx biome check commands/video/providers/compositor.ts \
  commands/video/providers/compositor.test.ts
```

Do not run a live render merely to test documentation or a mock-only branch.