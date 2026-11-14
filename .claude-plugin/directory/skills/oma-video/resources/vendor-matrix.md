# Vendor Matrix

oma-video is a **key-optional** router (backend rule 11). Each capability has a
provider `order` (a fallback chain). The orchestrator probes availability and
walks the chain: the first available provider wins; only chain exhaustion is a
stage failure. Stock and AIGC providers are reached only when they lead the
visual chain (`--visual stock|aigc`) and their env key is set; otherwise the
chain falls through to a key-free default.

## Capabilities -> providers

| Capability | order (config) | real (key/resource) | key-free fallback | marker |
|------------|----------------|---------------------|-------------------|--------|
| script | `[agent-script]` | agent-authored script (agent-as-key) | — | — |
| voice | `[oma-voice]` | Voicebox MCP or VoiceStudio REST TTS + STT timing (`voice.backend`) | estimated timing (no wav) | — |
| visual | by `--visual` and mode (see Visual chain) | oma-slide frame · Pexels stock · Pixelle AIGC | static oma-image stills, else a placeholder | `TODO(oma-deferred): pixelle` |
| caption | `[oma-captions]` | oma-translation for non-source locale | source-locale text from timing | `TODO(oma-deferred): oma-translation` |
| capture | Cap / guided capture | Human-recorded video ingestion | guided protocol + `--capture <path>` | — |
| compositor | `[hyperframes, mpt]` | HyperFrames live render (wired, default) · MPT custom-script | none: missing toolchain, failed render, or invalid output fails with diagnostics | — |

## Visual chain

`--visual` and the mode pick the order walked for each scene:

| `--visual` | Mode | Order |
|------------|------|-------|
| `auto` (default) | `shorts`, `demo` | `providers.visual.order` (default `[oma-image, pexels, pixelle]`) |
| `auto` (default) | `explainer` | `[oma-slide, oma-image, …providers.visual.order]` |
| `generate` | any | `[oma-image]` |
| `slide` | any | `[oma-slide, oma-image]` |
| `stock` | any | `[pexels, oma-image]` |
| `aigc` | any | `[pixelle, oma-image]` |

- The chain advances only past a provider that is unavailable or throws.
  oma-image and oma-slide are always available and write a placeholder instead
  of throwing, so nothing listed after them is reached.
- With the default `providers.visual.order`, oma-image therefore takes every
  scene: Pexels needs `--visual stock` plus `PEXELS_API_KEY`, and Pixelle needs
  `--visual aigc` plus `RUNNINGHUB_API_KEY`.
- oma-slide exports a frame only for a scene whose `visual.ref` is an existing
  deck directory (`script-schema.md`); it does not generate a deck. Every other
  scene it handles gets a placeholder, which includes each explainer scene
  without a deck under `--visual auto`. Build the decks with `oma-slide` first,
  or pass `--visual generate` for oma-image stills.
- A placeholder is recorded in `warnings` as a fallback path for that scene.

## Tier model

| Tier | Surface | Providers | Notes |
|:---:|---------|-----------|-------|
| 1 | CLI-first (subprocess) | HyperFrames, MPT, oma-image, oma-slide, oma-voice (REST) | deterministic; preferred whenever a CLI can drive the work |
| 2 | MCP | Voicebox MCP, Pixelle-MCP | localhost MCP; Pixelle off by default, community-MCP consent + key |
| 3 | Guided (human) | Cap / human-recorded video | `demo` capture is performed by a human |

## oma-voice (VoiceProvider + timing)

| Field | Value |
|-------|-------|
| Surface | Voicebox MCP (Streamable HTTP) at `127.0.0.1:17493/mcp`; REST on the same port |
| Synthesize | MCP `voicebox_speak{text, profile, language}` -> `generation_id` (REST `POST /speak` fallback) |
| Retrieve wav | REST `GET /audio/{generation_id}` (MCP has no save-to-disk) |
| Timing (real) | MCP `voicebox_transcribe{audio_path}` on the wav -> `source: voicebox-stt` (REST `POST /transcribe` fallback) |
| Timing (fallback) | `estimated` (no wav written, `audio` field empty); a whisper.cpp hop is reserved but not wired (`TODO(oma-deferred): whisper-cpp`) |
| Side effect | Narration plays on the speakers during synthesis |

### VoiceStudio backend

`voice.backend` in oma-config selects the speech
backend behind the same `oma-voice` provider: `auto` (default) uses Voicebox
when healthy, otherwise VoiceStudio; `voicebox` and `voicestudio` never fall
through. Any live failure degrades to estimated timing with a warning.

| Field | Value |
|-------|-------|
| Surface | VoiceStudio REST at `OMA_VOICESTUDIO_URL` / `VOICESTUDIO_URL` (default `127.0.0.1:3900`) |
| Synthesize | `POST /v1/audio/speech{model: tts-1, voice: <profile id>, input, response_format: wav}`; a non-WAV body is rejected |
| Timing (real) | `POST /v1/audio/transcriptions` (`verbose_json`, word + segment timestamps) -> `source: voicestudio-stt`; a failed transcription keeps the wav with estimated segments |
| Auth | none on loopback; `OMNIVOICE_API_KEY` bearer only to a loopback or HTTPS backend |
| Side effect | none on the speakers; first use of an engine may download its model inside the backend |
| Doctor | `oma video doctor` reports `voicestudio` as an optional check |

## oma-image (VisualProvider: generate) — default key-free visual

| Field | Value |
|-------|-------|
| Transport | `oma image generate "<prompt>" --vendor auto --size <16-multiple> --output json --output-dir <runDir>/visuals` |
| Aspect -> size | snapped to nearest 16-multiple: 9:16 -> 1088×1920, 16:9 -> 1920×1088, 1:1 -> 1088×1088 |
| Crop | HyperFrames crops the still to the exact frame; the still stays static |
| Cost | free defaults (pollinations / antigravity); codex per-image per oma-image config |

## oma-slide (VisualProvider: slide, explainer) — key-free

| Field | Value |
|-------|-------|
| Input | `scenes[].visual.ref` = path of an existing deck directory, authored beforehand with `oma-slide`; the provider never generates a deck |
| Transport | `oma slide export png --workspace <visual.ref> --output-dir <runDir>/visuals/slides`; the first exported frame becomes the scene visual, so give each slide scene its own single-slide deck |
| Requires | a Chrome/Chromium executable for the headless export |
| Fallback | no `visual.ref`, a missing directory, no browser, or a failed export -> placeholder (the chain does not continue to oma-image) |
| Use | explainer structure and code frames |

## Pexels (VisualProvider: stock) — paid, opt-in

| Field | Value |
|-------|-------|
| Auth | `PEXELS_API_KEY` env var |
| Enabled | the key is present and Pexels leads the chain (`--visual stock`) |
| Fallback | absent key -> skip; chain falls to static oma-image stills. A query or download miss writes a placeholder |

## Pixelle-MCP + RunningHub (VisualProvider: aigc) — paid, off by default

| Field | Value |
|-------|-------|
| Surface | MCP `http://localhost:9004/pixelle/mcp`; RunningHub cloud or local ComfyUI |
| Setup | `uvx pixelle@latest` + wizard; one-time **explicit consent + source review** |
| Auth | `RUNNINGHUB_API_KEY` env var; cost gates on RunningHub credits via `--max-usd` |
| Enabled | the key is present and Pixelle leads the chain (`--visual aigc`); never auto-connects |
| Fallback | absent/declined -> oma-image stills |
| Marker | `TODO(oma-deferred): pixelle` on the real-call branch: the live MCP call is not wired, so a selected Pixelle scene gets a placeholder |

## Cap (CaptureProvider, demo) — Tier 3 guided

| Field | Value |
|-------|-------|
| Real | A human records with Cap or any recorder; the CLI detects Cap only to tailor the instructions |
| Fallback | guided protocol: instruct the human to record, then pass `--capture <path>` |
| Path safety | `--capture` is absolutized, `$PWD`-guarded, existence + format validated |

## Compositor: HyperFrames (default) / MPT (alt)

| Field | Value |
|-------|-------|
| Real | Agent-authored `<runDir>/hyperframes/index.html`; `compose` stages local assets and the authoring contract. `render` runs the cached CLI: lint → strict MP4 render → ffprobe. |
| Requires | Node + Chrome Headless Shell + FFmpeg (bootstrapped once via `oma video doctor --install`) |
| Failure | Missing toolchain, render error, missing video stream, or non-positive duration fails with diagnostics. `OMA_VIDEO_MOCK=1` may write a deterministic placeholder only for tests. |
| Determinism | Saved render spec, local assets, authored HTML, seed, recorded CLI version, and embedded font. Byte identity across different browser/OS versions is not guaranteed. |
| MPT alt | inject the agent-written script (custom-script mode); keys env-only + log masking; `--compositor mpt` |

## Error Classification

| Error kind | Retry policy | Exit code when solo |
|------------|-------------|---------------------|
| `provider-unavailable` | try next provider in `order`; chain-exhaustion fails | 5 |
| `auth-required` | fail; hint tells the user how to authenticate | 5 |
| `compositor-bootstrap` | fail; point to `oma video doctor` or `oma video doctor --install-mpt` | 1 |
| `cost-guardrail` | confirm; decline -> stop | 1 |
| `capture-required` | guided protocol; not a hard error | (guided) |
| `schema-validation` | fail; identify the offending field | 4 |
| `safety-refused` | short-circuit (no fallback) | 2 |
| `not-found` | fail; missing profile / asset | 3 |
