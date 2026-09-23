---
title: "Guide: Video Generation"
sidebar_label: Video Generation
description: Complete guide to oh-my-agent video generation — a key-optional, three-tier router that composes script, narration, visuals, captions, and a managed HyperFrames compositor into reproducible run directories across shorts, explainer, and demo modes.
---

# Video Generation

`oma-video` is the video router for oh-my-agent. From a one-line brief it composes a script, narration, visuals, and captions, then records the plan in a run directory. Provider stages are key-optional and can use local or deterministic fallbacks; a real MP4 still requires a working compositor and valid composition.

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
| `demo` | derived | A walkthrough built from a human recording supplied with `--capture`; `--source web --url` supplies context for a supervised headed capture and never automates login. |

The mode picks sensible defaults; pass the relevant flags when you need different values.

---

## Quick start

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Each run prints its run directory. A fixed `--seed` stabilizes the deterministic planning inputs; live provider output and capture footage can still vary. Re-render an existing run directory when you need to reuse its saved render spec and assets.

Other tools that shell out to `oma video generate --output json` parse a JSON envelope from stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. There is no `outputs` key — read output/asset paths from the manifest at `manifestPath`.

---

## CLI reference

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Key flags

| Flag | Purpose |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Narration/caption language tag. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (key-free alignment). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Narration voice, or `none` (the default; omit it and the video renders silent with estimated caption timing). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano`, or `none`. |
| `--compositor <c>` | `hyperframes` (default) \| `mpt`. |
| `--capture <path>` | Input recording path for demo mode (`--source file`). |
| `--source <k>` | Demo capture source: `file` or `web` (default: `file`). |
| `--url <url>` | Target URL for `--source web` (local, staging, or production); it does not replace `--capture` when a recording is required. |
| `--device <name>` | Device frame for web capture; overrides aspect sizing. |
| `--ready-selector <css>` | CSS selector to await before web capture. |
| `--show-cursor` | Overlay a visible cursor in web capture. |
| `--polish` | Overlay the HyperFrames composition on captured footage. |
| `--capture-timeout <sec>` | Hard ceiling for live web capture. |
| `--capture-stop <mode>` | Non-interactive stop for CI: `duration:<sec>` or `selector:<css>`. |
| `--output-dir <path>` | Output base directory. Paths outside `$PWD` require `--allow-external-output`. |
| `--allow-external-output` | Permit output paths outside `$PWD`. |
| `--max-usd <n>` | Maximum estimated cost before confirmation. |
| `--duration <sec>` | Target length, or `auto`. |
| `--seed <n>` | Deterministic seed. |
| `--dry-run` | Emit script / render-spec / manifest, skip rendering. |
| `--script <path>` | Agent-authored `script.json` to inject (overrides the skeleton; controls narration, on-screen text, and per-scene visual prompts). |
| `-y, --yes` | Skip the cost-confirmation prompt. |
| `--output <f>` | CLI output: `text` (default) or `json`. |
| `--no-brief-in-manifest` | Store a SHA-256 of the brief instead of the raw brief. |

---

## Key-optional providers

Provider stages resolve to a **real branch** and, where the stage supports it, a **deterministic fallback**. Missing keys can therefore leave a planned run with estimated timing or local assets. The compositor is a required final stage and has no normal placeholder fallback:

| Capability | Real branch | Fallback |
|------------|-------------|----------|
| script | LLM when a key is present | deterministic outline from the brief |
| voice | `oma-voice` (Voicebox, local) | estimated timing, no audio |
| visual | `oma-image` / `oma-slide` / stock | placeholder asset |
| caption | key-free forced alignment | estimated word timing |
| capture | supervised browser web capture (`--source web`) or a supplied recording (`--source file --capture`) | guided "record it yourself" protocol |
| compositor | HyperFrames (managed) or MoneyPrinterTurbo | no compositor fallback; the run fails with diagnostics |

No credential automation: a human performs any on-screen login during capture; URLs and query tokens are masked in logs and the manifest.

Captions render as **static windowed cues** — the single caption line active at the current frame, CSS-wrapped, with no per-word animation.

---

## Toolchain and `doctor`

The heavy toolchain (the managed HyperFrames project's `node_modules`, the embedded Pretendard font, the MoneyPrinterTurbo checkout, capture browsers, Chrome Headless Shell) is **provisioned on demand**, never shipped in the package. Plain `doctor` is report-only — it never installs anything:

```bash
oma video doctor
```

It reports `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle`, and `cap`, and prints the install hint for anything missing. The baseline requires Node.js 22+, the HyperFrames toolchain and its Chrome browser, FFmpeg/FFprobe, and `oma-image`. A real MP4 also requires authored HTML.

Use the install flags to provision the toolchain:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` also fetches the embedded Pretendard font (pinned release) into the shared toolchain cache — this is part of the determinism boundary. On a network failure it warns and the render falls back to system fonts; browser and OS differences can still affect the encoded output.

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
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

The `render-spec.json` + assets are the determinism boundary; live capture is recorded as `nondeterministic` in the manifest.

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| No MP4 is produced | A compositor, composition, or toolchain check failed. Run `oma video doctor`, then `oma video compose <runDir>` and fix the reported composition before rerunning `oma video render <runDir>`. |
| Narration is silent (`source: estimated`) | Voicebox is unreachable; start the `oma-voice` server, or accept estimated timing. |
| `--source web` prints a guided protocol instead of recording | No TTY or browser capture runtime unavailable → guided fallback. Use an interactive terminal with a provisioned capture runtime and `--capture-stop`, or pass a recorded file with `--capture`. |
| Render is slow on the first run | The HyperFrames browser / MPT checkout is being provisioned once; subsequent runs reuse the cache. |

---

## Always-latest HyperFrames — you author the composition

oh-my-agent ships **no HyperFrames composition code**. Each run gets its own project at `<runDir>/hyperframes/`, scaffolded by `oma video compose` on the latest npm HyperFrames (toolchain cache `~/.cache/oma-video/hyperframes/<version>/`, shared via a `node_modules` symlink) with [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) at HEAD (`~/.cache/oma-video/hyperframes-skills/`). The agent authors the generated composition source following the scaffold's `AUTHORING.md`, the skills, and the mode spec in `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Latest-version checks (npm + GitHub) are throttled by `video.hyperframes.check_interval_min` (default 60; `0` = every compose). `oma update` respects the interval; `oma video doctor --upgrade` forces a check; offline runs use the cached toolchain and report `stale`.
- Reproducibility lives in the run dir: `render-spec.json`, the authored composition source, and the toolchain version recorded in the generated HyperFrames package metadata. Re-rendering the same run reuses that render contract; a new run checks the latest HyperFrames.
- A lint or render failure is **not** hidden behind a placeholder (that exists only for `OMA_VIDEO_MOCK=1`): `oma video render` exits 1 with the diagnostics and the agent fixes the composition using the latest skills. Breakage on a new HyperFrames release is a composition bug, never a reason to pin.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Related

- [`/video` workflow](/docs/core-concepts/workflows) — the brief → script → assets → render-spec → HyperFrames pipeline.
- [Image Generation](/docs/guide/image-generation) — the still-image router reused as a video visual provider.
