---
title: "Guide: Video Generation"
description: Complete guide to oh-my-agent video generation — a key-optional, three-tier router that composes script, narration, visuals, captions, and a vendored Remotion compositor into reproducible run directories across shorts, explainer, and demo modes.
---

# Video Generation

`oma-video` is the video router for oh-my-agent. From a one-line brief it composes a script, narration, visuals, and captions, then renders them with a vendored compositor into a reproducible run directory — every stage degrades to a deterministic fallback, so a run completes with **no API keys**.

The skill auto-activates on keywords like *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast*, or when another skill needs a video as a side effect.

---

## When to use

- Turning a brief, README, code, or data into a short clip.
- Producing a narrated explainer or a demo/walkthrough recording.
- Any reproducible "brief → `.mp4`" pipeline you want to re-run deterministically.

## When NOT to use

- Single still images → use [`oma-image`](/docs/guide/image-generation).
- Live screen broadcasting / streaming → out of scope (capture is supervised, not streamed).
- Standalone narration audio → use `oma-voice`.

---

## Modes at a glance

| Mode | Aspect | What it composes |
|------|--------|------------------|
| `shorts` | 9:16 | Short-form vertical clip (script → narration → visuals → captions). |
| `explainer` | 16:9 | Horizontal explainer from a README, code, or data brief. |
| `demo` | derived | A walkthrough built from a screen recording — a pre-recorded file (`--source file`) or a supervised headed web capture of any URL (`--source web`). |

The mode picks sensible defaults; every default is overridable by a flag.

---

## Quick start

```bash
# Key-free short — script, captions, and a placeholder-free local render
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a supervised web capture of a running app (you drive the flow; ENTER stops)
oma video generate "product walkthrough" --mode demo --source web --url http://localhost:3000 --polish
```

Each run prints its run directory. Re-running with the same `--seed` reproduces the same script and render-spec.

Other tools that shell out to `oma video generate --format json` parse a JSON envelope from stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. There is no `outputs` key — read output/asset paths from the manifest at `manifestPath`.

---

## CLI reference

```
oma video generate <brief...> [options]
oma video doctor [--install|--install-mpt|--install-playwright]  # toolchain readiness / provisioning
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video list-providers         # provider availability + key/fallback status
```

### Key flags

| Flag | Purpose |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Narration/caption language tag. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (key-free alignment). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Narration voice, or `none` (the default — omit it and the video renders silent with estimated caption timing). |
| `--compositor <c>` | `remotion` (default) \| `mpt`. |
| `--source <k>` | Demo capture source: `file` \| `web`. |
| `--url <url>` | Target URL for `--source web` (local, staging, or prod). |
| `--polish` | Overlay the Remotion composition on captured footage. |
| `--duration <sec>` | Target length, or `auto`. |
| `--seed <n>` | Deterministic seed. |
| `--dry-run` | Emit script / render-spec / manifest, skip rendering. |
| `--script <path>` | Agent-authored `script.json` to inject (overrides the skeleton; controls narration, on-screen text, and per-scene visual prompts). |
| `-y, --yes` | Skip the cost-confirmation prompt. |
| `--format <f>` | CLI output: `text` (default) \| `json`. |

---

## Key-optional providers

Every capability resolves to a provider with a **real branch** and a **deterministic fallback** (backend rule 11), so a run never hard-fails for a missing key or tool:

| Capability | Real branch | Fallback |
|------------|-------------|----------|
| script | LLM when a key is present | deterministic outline from the brief |
| voice | `oma-voice` (Voicebox, local) | estimated timing, no audio |
| visual | `oma-image` / `oma-slide` / stock | placeholder asset |
| caption | key-free forced alignment | estimated word timing |
| capture | supervised Playwright web capture (`--source web`) or Cap (`--source file`) | guided "record it yourself" protocol |
| compositor | Remotion (vendored) or MoneyPrinterTurbo | deterministic placeholder mp4 |

No credential automation: a human performs any on-screen login during capture; URLs and query tokens are masked in logs and the manifest.

Captions render as **static windowed cues** — the single caption line active at the current frame, CSS-wrapped, with no per-word animation.

---

## Toolchain and `doctor`

The heavy toolchain (the vendored Remotion project's `node_modules`, the embedded Pretendard font, the MoneyPrinterTurbo checkout, Playwright browsers, Chrome Headless Shell) is **provisioned on demand**, never shipped in the package. Plain `doctor` is report-only — it never installs anything:

```bash
oma video doctor
```

It reports `node`, `chromium`, `ffmpeg`, `remotion-project`, `pretendard-font`, `mpt-project`, `playwright`, `voicebox`, `oma-image`, `pixelle`, and `cap`, and prints the install hint for anything missing. The key-free baseline (Node + Chromium + FFmpeg + `oma-image`) is enough to produce a real `.mp4`.

Use the install flags to provision the toolchain:

```bash
oma video doctor --install             # vendored Remotion deps + Chrome Headless Shell + Pretendard font fetch
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
oma video doctor --install-playwright  # Playwright + Chromium for web capture
```

`--install` also fetches the embedded Pretendard font (pinned release) into the vendored project — this is part of the determinism boundary. On a network failure it warns and the render falls back to system fonts; byte-identical output across machines is only guaranteed once the font is present.

---

## Output layout

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

The `render-spec.json` + assets are the determinism boundary; live capture is recorded as `nondeterministic` in the manifest.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Output is a tiny text file, not an mp4 | The compositor fell back to the placeholder — run `oma video doctor` and provision the flagged tool. |
| Narration is silent (`source: estimated`) | Voicebox is unreachable; start the `oma-voice` server, or accept estimated timing. |
| `--source web` prints a guided protocol instead of recording | No TTY (CI) or Playwright absent → guided fallback. Install with `oma video doctor --install-playwright`. |
| Render is slow on the first run | The Remotion browser / MPT checkout is being provisioned once; subsequent runs reuse the cache. |

---

## Related

- [`/video` workflow](/docs/core-concepts/workflows) — the brief → script → assets → render-spec → Remotion pipeline.
- [Image Generation](/docs/guide/image-generation) — the still-image router reused as a video visual provider.
