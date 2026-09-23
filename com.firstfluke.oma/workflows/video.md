---
name: video
description: Agent-native, key-optional video generation workflow that turns a brief into a finished MP4 — script → parallel asset generation (voice/visual/caption) → render-spec → HyperFrames compositor (MPT alternative) → QA loop → output + manifest
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **Key-optional by default (backend rule 11).** The baseline path uses **zero external API keys**: the agent writes the script, oma-voice does TTS, oma-image does visuals, captions are key-free, HyperFrames composites. Every paid upgrade (Pexels stock, Pixelle AIGC) sits behind a key-free fallback and is **off by default**. Never disable the fallback to force a real call, and never silently drop a requested real path.
- **Determinism boundary = `render-spec.json` + asset files (+ seed + embedded Pretendard).** "Reproducible from script/assets, not from brief." Never edit assets or render-spec by hand after generation; re-run the stage that produced them.
- **Demo capture is human-supplied.** `--source web --url` gives URL context only; it neither opens nor records a browser. The human records the flow with Cap or another recorder, then supplies `--capture <path>`. Never automate login or capture credentials. Mask URL query tokens in logs and manifests.
- **The `oma video` CLI owns the pipeline. This workflow owns the brief, the agent-authored script, the QA loop, and decision checkpoints.** Do NOT reimplement orchestration, provider selection, or rendering in the workflow.
- **Code intelligence and state are separate capabilities.** Follow `.agents/skills/_shared/core/code-intelligence.md` for configured tools and native fallback. Follow `.agents/skills/_shared/runtime/memory-protocol.md` for run tracking and result paths. Do not require an MCP memory tool or automatically install, initialize, or track a repository.
- **Read the oma-video skill BEFORE starting.** Read `.agents/skills/oma-video/SKILL.md` and follow its Core Rules and execution protocol, including `resources/execution-protocol.md`. If the skill is not installed, stop and ask the user to run `oma install` first.

---

> **Vendor note:** This workflow executes inline. The script-authoring step (Step 3) is performed by the running agent itself — **the agent is the LLM key** (agent-as-key). A subagent may be spawned only for broad multi-scene research; the asset pipeline (Steps 4-7) runs through the `oma video` CLI, not through subagents.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

This workflow has two required checkpoints: **mode-selection** (Step 2) and **cost-confirmation** (Step 5). Do not skip either emit/verify pair.

---

## Mode Routing

Resolve the mode first — it determines aspect, source, visual track, and compositor. If the user did not name a mode, infer from intent and resolve material ambiguity at Step 2.

| mode | aspect | source | visual track (default → opt) | compositor | output |
|------|:---:|------|------|------|------|
| `shorts` | 9:16 | synthetic (topic → clip) | oma-image stills · Pexels (opt) · Pixelle AIGC (opt) | HyperFrames · MPT alt | `shorts-<slug>.mp4` |
| `explainer` | 16:9 / 9:16 | README · code · data | oma-slide frames + oma-image diagrams + code | HyperFrames (deterministic) | `explainer-<slug>.mp4` |
| `demo` | 16:9 | Human recording via `--capture`; `--source web --url` adds URL context | raw footage (default) · HyperFrames intro · zoom · callouts (`--polish`) | HyperFrames polish | `demo-<slug>.mp4` |

Intent heuristics: "reel / TikTok / short / hook" → `shorts`; "walkthrough / how it works / from the README / explain the architecture" → `explainer`; "record / screen / show the app running / product demo" → `demo`.

For `demo`, resolve the recording path first. Use `--source file --capture <path>` for a recording; `--source web --url <url> --capture <path>` adds URL context to that human recording. The CLI does not open or record a browser. Raw footage is the default output; `--polish` overlays the HyperFrames `Demo` composition.

---

## Cost Guardrail & Key-Optional Notes (read before Step 4)

- **Guardrail**: default `cost.guardrail_usd: 0.20` in `.agents/skills/oma-video/config/video-config.yaml` (reused from oma-image). Any provider whose estimated cost meets or exceeds the guardrail requires spend authorization (`-y` / `--yes` or the Step 5 checkpoint). Reuse an existing authorization covering that provider and amount. `--max-usd <n>` overrides the threshold.
- **Key-optional pairs** (real path is gated; fallback is always wired):

  | capability | real (key/resource) | key-free fallback | deferred marker |
  |------|------|------|------|
  | stock video | Pexels (`PEXELS_API_KEY`) | oma-image stills + Ken Burns | `TODO(oma-deferred): pexels` |
  | AIGC video | Pixelle-MCP + RunningHub (`RUNNINGHUB_API_KEY`) | oma-image stills | `TODO(oma-deferred): pixelle` |
  | caption timing | voicebox-stt (MCP `voicebox_transcribe` → REST) | estimate | `TODO(oma-deferred): whisper-cpp` |
  | music mixing | Strudel offline render (`oma video doctor --install-strudel`) | render without music | — |
  | premium TTS | (not needed — oma-voice is local) | — | — |

- **Pixelle AIGC is a community MCP**: off by default, requires one-time explicit user consent plus a source review before connecting, and is always cost-gated on RunningHub credits.
- **Asset-provider fallbacks are not failures.** A run may use key-free timing, visual, caption, or music paths and record `pathTaken: fallback` with a warning. An unavailable, failed, or invalid compositor remains an error.

---

## Step 1: Resolve Brief & Preflight

1. Capture the brief from the user's request. If absent, ask:
   ```
   What is the video about? Give me a one-line brief, and a mode if you have one (shorts / explainer / demo).
   ```
2. Run the readiness check and surface gaps before spending any time on assets:
   ```bash
   oma video doctor --output json
   ```
   This reports Node / Chromium / FFmpeg, the HyperFrames project, the embedded Pretendard font, Voicebox MCP (oma-voice), oma-image vendors, optional Pixelle-MCP, Cap, and MPT readiness. **Doctor does NOT auto-bootstrap** — plain `oma video doctor` only reports. If HyperFrames is not yet installed, run `oma video doctor --install` (one-time: deps + Chrome Headless Shell + Pretendard font fetch) — do not install during a run. MPT needs a one-time `oma video doctor --install-mpt` (clone + venv + deps).
3. If doctor reports a hard blocker for the chosen mode (e.g. no compositor for `shorts`/`explainer`), report the remediation and stop. If only an optional provider is missing (Pexels, Pixelle, Cap), note it and continue on the fallback.
4. Record run start in the configured file-memory path: brief summary, requested mode, and doctor result.

---

## Step 2: Confirm Mode & Plan

1. State the resolved **mode**, **aspect**, **locale**, **caption style**, **visual track**, and **compositor** you intend to use, and the expected output name.
2. For `demo` mode, state up front: **"Capture is performed by a human."** Resolve the **source**:
   - `--source file`: require `--capture <path>`; if absent, ask the user to record and provide the file path before proceeding.
   - `--source web --url <url>`: also require `--capture <path>`. The URL provides context only; the human records the flow separately. No login or browser capture is automated, and URL query tokens are masked in logs and the manifest.
3. Apply `.agents/skills/_shared/core/execution-policy.md`: proceed when the requested work or decision is already authorized; ask only for a material missing decision or new authorization.
4. Once the mode is resolved under the execution policy, emit and verify the mode-selection decision with its actual authorization source:
   ```bash
   oma state emit "decision.made" '{"subject":"video.mode-selection","decision":"<resolved mode and pipeline plan>","rationale":"<existing instruction, delegated choice, or new user decision authorizing the plan>"}'
   oma state verify --workflow video --checkpoint mode-selection
   ```

---

## Step 3: Author `script.json` (agent-as-key)

The agent writes the script — this is the start of the determinism boundary. Do NOT call an external LLM; you are the script provider.

1. Produce a script honoring the `script.json` schema (`schemaVersion: "1.0"` — required literal — plus `mode, aspect, locale, title, scenes[{id, durationSec, narration, onScreenText, visual{kind: still|clip|mixed|slide|capture, prompt, ref, source}, transition}], music, brand`). Author against `.agents/skills/oma-video/resources/script-schema.md` (full field reference + example) — a schema mismatch is exit 4.
2. Respect limits from `.agents/skills/oma-video/config/video-config.yaml` (`max_duration_sec: 180`, `max_scenes: 40`). Keep narration tight and per-scene so scene boundaries map cleanly to TTS timing.
3. Mode-specific sourcing:
   - `shorts`: a hook-first synthetic script from the topic; each scene gets a `visual.prompt` for oma-image.
   - `explainer`: ground scenes in the README / code / data the user pointed to; mark scenes that should become oma-slide frames vs oma-image diagrams.
   - `demo`: narration + on-screen callouts over the captured footage; visual refs point at the ingested capture segments.
4. Translate narration / on-screen text via oma-translation when `locale` differs from the source language (key-free). If oma-translation is absent, keep the source text and let the run warn.
5. Write the agent-authored script to a file and hand it to the CLI via `--script <path>` so it validates against the schema. **`--script` is mandatory for the agent-as-key path: without it the CLI builds its own skeleton script from the brief and your authored script is never used.** Use `--dry-run` for the first pass so the pipeline emits `script.json` + `render-spec.json` + `manifest.json` **without rendering**:
   ```bash
   oma video generate "<brief>" --mode <mode> --aspect <aspect> --locale <lang> \
     --captions <tiktok|lower-third|none> --visual <auto|generate|stock|aigc|slide> \
     --voice <profile|none> --music <upbeat|calm|cinematic|lofi|piano|none> --duration <sec|auto> \
     --compositor <hyperframes|mpt> --seed <n> \
     --script <path-to-agent-authored-script.json> --dry-run --output json
   ```
6. Review the emitted `script.json` for scene count, durations, and narration quality. Iterate here — fixing the script is cheap; fixing a render is not.

---

## Step 4: Parallel Asset Generation (voice / visual / caption)

The CLI orchestrator fans out the asset tracks per the asset bus. Trigger the full (non-dry) run; the orchestrator runs the tracks and writes them into the run directory. **Do not author assets by hand.**

```bash
oma video generate "<brief>" --mode <mode> [same flags as Step 3, incl. --script <path>, without --dry-run] --output json
```

The three tracks (per `.agents/skills/oma-video/SKILL.md` and its execution protocol):

- **Voice** (oma-voice / Voicebox MCP) → a **single** `audio/narration-01.wav` (all scene lines joined into one track — not per-scene files) + `timing.json`. Timing source: `voicebox-stt` (MCP `voicebox_transcribe`, REST `/transcribe` fallback, on the generated wav) → `estimated` (the `tts-native` / `whisper-cpp` source values are reserved but deferred). **The default voice is `none` → a silent video with estimated timing; pass `--voice <profile>` for narration.** If oma-voice is down, the run falls back to silent + estimated timing and warns — it does not hard-fail.
- **Visual** (per-scene, fallback chain `oma-image → pexels → pixelle`) → `visuals/scene-NN.*`. Default is key-free oma-image stills (aspect snapped to the nearest 16-multiple; HyperFrames crops to exact frame). `--visual stock` engages Pexels only when `PEXELS_API_KEY` is set; `--visual aigc` engages Pixelle only after consent + cost gate. Each scene that falls back is recorded with `pathTaken: fallback`.
- **Caption** (key-free) → `captions.srt` / `.vtt`, aligned to `timing.json`, styled `tiktok` or `lower-third`, with platform safe-area presets. Non-source locales translate via oma-translation; if absent, captions keep the source locale and warn.

Report which path each track took (real vs fallback) and surface any warnings.

### Demo capture track (`--mode demo`)

For `demo`, the orchestrator produces the footage in place of synthetic visuals, dispatched on `--source`:

- **`--source file --capture <path>`** — ingest the human recording (absolutized, `$PWD`-guarded, format-validated). Without `--capture`, return the guided protocol and stop.
- **`--source web --url <url> --capture <path>`** — ingest the same human recording and use the URL as context. The CLI does not open a browser, wait on selectors, record the screen, or accept interactive stop controls. The URL and query tokens are masked in logs and `manifest.json`.

---

## Step 5: Cost Gate & `render-spec.json`

1. Inspect the cost estimate the orchestrator computed across providers (`cost.usd` + breakdown in the manifest/JSON output).
2. **If the estimate meets or exceeds the guardrail** (default $0.20, or `--max-usd`), present the breakdown and reuse existing spend authorization if it covers the provider and amount. Otherwise obtain authorization before the paid render proceeds. Then emit and verify the actual decision:
   ```bash
   oma state emit "decision.made" '{"subject":"video.cost-confirmation","decision":"Proceed with the estimated paid cost or fall back to the key-free path.","rationale":"Estimated cost crossed the guardrail; the user confirmed spend or chose the fallback."}'
   oma state verify --workflow video --checkpoint cost-confirmation
   ```
   If the user declines, re-run with the key-free providers (drop `--visual stock|aigc`) — the fallback chain keeps the run alive.
3. If the estimate is under the guardrail, note "cost under guardrail ($X.XX < $0.20)" and continue without a confirmation prompt.
4. Confirm `render-spec.json` was written. This is the **deterministic compute boundary**: `compositor, composition, fps, dimensions, durationInFrames, audio, scenes[], captions, background, seed`. The seed is embedded so re-renders are byte-identical.

---

## Step 6: Composite (HyperFrames — you author the composition; MPT is an alternative)

1. **HyperFrames** (default, all modes):
   1. `generate` prepares `<runDir>/hyperframes/` with a `composition pending` warning. Use `oma video compose <runDir> --output json` to refresh it.
   2. Read `<runDir>/hyperframes/AUTHORING.md`, the listed `hyperframes-core`, `hyperframes-animation`, and `hyperframes-cli` API references, and `.agents/skills/oma-video/resources/hyperframes-authoring/<mode>.md`.
   3. Author `index.html`. Use the staged render spec and local assets, timed HTML clips, uniquely identified audio elements, and a paused GSAP timeline. Honor the spec's dimensions, duration, captions, and audio levels.
   4. Run `oma video render <runDir> --output json`. It lints, renders, verifies the encoded video, and updates the manifest. Diagnose and fix any failure before delivery.

2. **MoneyPrinterTurbo** (`--compositor mpt`, shorts e2e alternative): the agent-written script is injected in custom-script mode; provider keys are env-only and masked in logs. It needs `oma video doctor --install-mpt` once. Setup or render failures fail with diagnostics; only `OMA_VIDEO_MOCK=1` tests may create a placeholder file.
3. If the toolchain cannot be fetched (offline, nothing cached): `oma video doctor --install` once online. Do not pin or hand-install HyperFrames.
4. Confirm the output MP4 exists, matches `<mode>-<slug>.mp4`, has a video stream, and has a positive ffprobe duration.

---

## Step 7: QA Loop

Review the finished video against the brief and the quality bars. Iterate by re-running the **smallest** upstream stage that owns the defect — never patch the artifact.

1. **Checklist** (priority order: correctness → sync → readability → polish):
   - Output plays; duration matches the script total within tolerance.
   - Narration audio is present (or intentionally silent) and aligns to scenes.
   - Captions are synced to `timing.json`, within the safe area, and legible (static windowed cues, CSS-wrapped, Pretendard, design rule 2).
   - Visuals match each scene's intent; any placeholder visual asset is declared in warnings, and a real validated MP4 remains required.
   - Aspect / dimensions are correct for the mode; branding applied as requested. (A requested music mode yields `music/bgm.wav` mixed at −18 dB, or a fallback warning and a silent render when Strudel is not installed.)
2. **Route each defect to its stage:**
   - script/narration/scene-count → **Step 3** (re-author script).
   - audio/timing → **Step 4** voice track (check oma-voice, re-synthesize).
   - wrong/placeholder visual → **Step 4** visual track (adjust prompt or `--visual` mode).
   - missing/incomplete demo capture → **Step 4** demo capture track (obtain a new human recording and pass `--capture`; `--url` is context only).
   - caption sync/wrap/locale → **Step 4** caption track (or oma-translation).
   - layout/transition/crop → **Step 6** edit the composition (`<runDir>/hyperframes/index.html`) or the render-spec → `oma video render` (for `demo`, toggle `--polish`).
3. **Determinism guard:** when validating reproducibility, run the golden harness — render-spec and assets must be byte-identical:
   ```bash
   OMA_VIDEO_MOCK=1 oma video generate "<brief>" --mode <mode> --seed <n> --dry-run --output json
   ```
4. Stop after three render attempts or ten minutes of render recovery. Report diagnostics and recovery artifacts; if a further change needs a different visual track, mode framing, or compositor, obtain the user's direction before continuing.
5. Repeat until the checklist passes or the user accepts the result.

---

## Step 8: Output & Manifest

1. Confirm the run directory is complete (mirrors `.agents/results/videos/<runId>-<mode>/`):
   ```
   script.json · timing.json · render-spec.json
   audio/narration-01.wav                # single narration track (all lines joined)
   visuals/scene-*.{jpg,png,mp4}        # synthetic modes
   capture.mp4                           # demo: human recording ingested by the CLI
   captions.srt (+ .vtt)
   <mode>-<slug>.mp4
   manifest.json
   ```
2. Verify `manifest.json` is the reproducibility record: `runId, mode, providers{...}, assets[{path,sha256,bytes,seed}], outputs{video,durationSec,sha256}, cost{usd,breakdown}, warnings[], exitCode`. All external assets are copied into the run dir and hashed — no URL refs. For `demo --source web`, the manifest records a **masked** URL context (query tokens stripped), never credentials.
3. Report to the user:
   - Output MP4 path (absolute) and duration.
   - Providers used per track, and which tracks took the **fallback** path.
   - Final cost (`$0.00` on the all-key-free path).
   - Any warnings (silent audio, source-locale captions, placeholder visuals).
   - Reproduce command: `oma video render <runDir>`.
4. Record run completion in the configured file-memory path: run dir, output path, providers, cost, and warnings.

---

## Exit Codes (aligned with `oma search fetch`)

`0` ok · `1` generic · `2` safety · `3` not-found · `4` invalid-input · `5` auth-required · `6` timeout.

Common error → action map:

| error | exit | action |
|------|:---:|------|
| `ProviderUnavailableError` | 5 | a required provider is down → run `oma video doctor`, fix or fall back |
| `CompositorBootstrapError` | 1 | HyperFrames not installed → `oma video doctor` install-once, then re-render |
| `CostGuardrailError` | confirm | estimate crossed guardrail → Step 5 confirmation or drop paid providers |
| `CaptureRequiredError` | guided | demo needs a human recording → provide `--capture <path>`; `--source web` also requires `--url` context |
| `SchemaValidationError` | 4 | script/render-spec invalid, missing demo capture, or `--source web` without `--url` → fix in Step 3 and re-validate with `--dry-run` |
