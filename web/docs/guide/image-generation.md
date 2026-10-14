---
title: "Guide: Image Generation"
sidebar_label: Image Generation
description: Complete guide to oh-my-agent image generation, covering multi-vendor dispatch via Codex (gpt-image-2), Pollinations (flux/zimage, free), and Antigravity through Gemini Code Assist, with reference images, cost guardrails, output layout, troubleshooting, and shared invocation patterns.
---

# Image Generation

`oma-image` is the multi-vendor image router for oh-my-agent. It generates images from natural-language prompts, dispatches to whichever vendor CLI you are authenticated with, and writes a manifest next to the output with the inputs and provider decisions needed to audit or repeat a run. Live provider output can still vary.

The skill activates on phrases such as "generate an image", "create an image", "make a picture", "draw me …", or "image of …", on a vendor name (`gpt-image`, `nano-banana`, `pollinations`), or when another skill needs an image as a side effect (hero shot, thumbnail, product photo).

> **TL;DR** You need one of: `POLLINATIONS_API_KEY` (free `flux` / `zimage`), `codex login` (gpt-image-2 on your ChatGPT plan), or a signed-in `agy`. Run `oma image doctor`, then `oma image generate "<prompt>" --vendor pollinations`. Images and `manifest.json` land in `.agents/results/images/{timestamp}-{shortid}/`.

---

## When to use

- Generating images, illustrations, product photos, concept art, hero/landing visuals
- Comparing the same prompt across multiple models side-by-side (`--vendor all`)
- Producing assets from inside any runtime that loads oma skills (Claude Code, Codex CLI, Antigravity, Cursor, and others)
- Letting another skill (design, marketing, docs) call the image pipeline as shared infrastructure

## When NOT to use

- Editing or retouching an existing image (out of scope; use a dedicated tool)
- Generating videos or audio (out of scope)
- Inline SVG / vector composition from structured data (use a templating skill)
- Simple resize / format conversion (use an image library, not a generation pipeline)

---

## Vendors at a glance

The skill is CLI-first: when a vendor's native CLI can return raw image bytes, the subprocess path is preferred over a direct API key.

| Vendor | Strategy | Models | Trigger | Cost |
|---|---|---|---|---|
| `pollinations` | Direct HTTP | Free: `flux`, `zimage`. Credit-gated: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` set (free signup at https://enter.pollinations.ai) | Free for `flux` / `zimage` |
| `codex` | CLI-first via `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login` (no API key needed) | Charged to your ChatGPT plan |
| `antigravity` | `agy` CLI over the Gemini Code Assist subscription | Model is selected internally by `agy` | `agy` installed and signed in | No per-image charge through Code Assist |

How `--vendor` picks the vendors for a run:

| `--vendor` | Vendors that run | Output folder | Exit 5 when |
|---|---|---|---|
| `auto` (default) | every vendor whose health check passes | `{timestamp}-{shortid}-compare/` when two or more run | no vendor is healthy |
| `all` | every enabled vendor | `{timestamp}-{shortid}-compare/` when two or more run | any requested vendor is unhealthy |
| `codex`, `pollinations`, or `antigravity` | that vendor | `{timestamp}-{shortid}/` | that vendor is unhealthy |

The built-in vendor mode is `auto`: it runs **every** provider that passes its health check, in parallel. Pass `--vendor pollinations` to stay on the free path. Pollinations' `flux` and `zimage` models are free per image but still require a `POLLINATIONS_API_KEY`; Codex and Antigravity require their own sign-in. Paid estimates still use the cost confirmation guardrail.

---

## Quick start

Before the first generation, check which provider is ready and authenticate one of the supported paths:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

A successful text-mode run prints progress like this (paths are illustrative):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Use as a skill

`oma-image` is a skill that auto-activates from natural language and can also be invoked explicitly. There are three entry points.

### 1. Natural language (auto-activation)

In any runtime that loads oma skills (Claude Code, Codex CLI, Antigravity, Cursor, and others), just describe the image. Phrases such as "generate an image", "make a picture", "draw me …", or "image of …" activate the skill; runtimes that match skills by their description may also pick it up for requests like "concept art" or "hero shot".

You don't need to remember CLI flags. Say it in plain language and the skill maps it to the right options:

| You say | Skill infers |
|---|---|
| "use codex" / "with gpt-image-2" / "free flux" | `--vendor codex` / `--vendor pollinations` |
| "compare across vendors" / "side by side" | `--vendor all` |
| "portrait" / "landscape" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "high quality" / "draft" | `--quality high` / `--quality low` |
| "three variations" / "give me 3" | `-n 3` |
| "save to ./hero" / "output to docs/assets" | `--output-dir <dir>` |
| Attached image + "make it nighttime" | `-r <attached path>` |
| "just estimate the cost" / "dry run" | `--dry-run` |

Examples:

> "Generate a minimalist sunrise over mountains for the landing hero, landscape, high quality."
> "Compare a ceramic mug product photo across all vendors, three variations each."
> "Use codex to make this otter photo dramatic and nighttime." (with attached reference)

The agent [resolves the brief](#clarification-protocol), fills gaps with defaults, and calls `oma image generate` with the inferred flags. Use the slash command when you want explicit control over the exact flag values.

### 2. Explicit slash command

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Every CLI flag (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) works in the slash command and is forwarded to the same `oma image generate` pipeline.

### 3. From another skill (shared infrastructure)

Other skills (design, marketing, docs) call the pipeline as shared infrastructure with JSON output:

```bash
oma image generate "<prompt>" --output json
```

With `--output json`, stdout is one JSON object `{exitCode, manifestPath, runs}`; each entry in `runs` reports its vendor, status, and output files. Read `manifestPath` for the full record. `--dry-run` prints the text header `[oma image] dry-run plan:` before the plan, so skip that line when you parse it.

---

## CLI reference

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Key flags

| Flag | Purpose |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity`, or `all`. With `all`, every requested vendor must be healthy (strict). |
| `-n, --count <n>` | Number of images per vendor, 1–5 (wall-time bound). Default 1. |
| `--size <size>` | `WxH` with each edge a multiple of 16 between 16 and 3840 and an aspect ratio between 1:3 and 3:1 (for example `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), or `auto`. Default `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high`, or `auto` (default). |
| `--output-dir <dir>` | Output directory; files go straight into it. Defaults to `.agents/results/images/{timestamp}-{shortid}/`. Paths outside `$PWD` require `--allow-external-output`. |
| `--allow-external-output` | Permit an output directory outside `$PWD`. |
| `--model <name>` | Model override for **every** vendor in the run, so combine it with one `--vendor` (for example `--vendor pollinations --model zimage`). `antigravity` ignores it because `agy` chooses its model. |
| `-r, --reference <path>` | Up to 10 reference images (PNG/JPEG/GIF/WebP, ≤ 5 MB each). Repeatable or comma-separated. Supported on `codex` and `antigravity`; rejected on `pollinations`. |
| `-y, --yes` | Skip the cost-confirmation prompt for runs estimated at ≥ `$0.20`. Also via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Store the SHA-256 of the prompt instead of the raw text in `manifest.json`. |
| `--dry-run` | Print the plan and the cost estimate without spending. |
| `--output text\|json` | CLI output format. JSON is the integration surface for other skills. |
| `--timeout <duration>` | Per-image timeout. Default 180 seconds. |

---

## Reference images

Attach up to 10 reference images to guide style, subject identity, or composition.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Vendor | Reference support | How |
|---|---|---|
| `codex` (gpt-image-2) | Yes | Passes `-i <path>` to `codex exec` |
| `antigravity` | Yes | Copies references into a per-run directory and grants `agy` access to them |
| `pollinations` | No | Rejected with exit code 4 (requires URL hosting) |

### Where attached images live

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, surfaced in system messages as `[Image: source: <path>]`. Session-scoped; copy to a durable location if you want to reuse it later.
- **Antigravity**: workspace upload directory (the IDE shows the exact path)
- **Codex CLI as host**: must be passed explicitly; in-conversation attachments are not forwarded

When the user attaches an image and asks to generate or edit one based on it, the calling agent **must** forward it via `--reference <path>` rather than describing it in prose. If the local CLI is too old to support `--reference`, run `oma update` and retry.

---

## Output layout

By default each run writes to a timestamped, hash-suffixed folder under `.agents/results/images/`; with `--output-dir`, files go straight into that directory:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` records the vendor, model, prompt (or its SHA-256), size, quality, and cost, so the request can be audited and repeated. It does not force identical pixels from a live provider.

---

## Cost, safety, and cancellation

1. **Cost guardrail**: runs estimated at ≥ `$0.20` ask for confirmation; without an interactive terminal the run exits 1 with a message naming `--yes`. Bypass with `-y` or `OMA_IMAGE_YES=1`. Only `--vendor pollinations` with `flux` / `zimage` is guaranteed free; `auto` can also include a signed-in Codex.
2. **Path safety**: output paths outside `$PWD` require `--allow-external-output` to avoid surprising writes.
3. **Cancellable**: `Ctrl+C` (SIGINT/SIGTERM) aborts every in-flight provider call and the orchestrator together.
4. **Stable run record**: `manifest.json` is always written next to the images.
5. **Max `n` = 5**: a wall-time bound, not a quota.
6. **Exit codes**: aligned with `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## How the agent resolves a brief {#clarification-protocol}

The agent uses what you said and fills gaps with reasonable creative defaults for setting, style, lighting, and aspect ratio. It asks a question only when a missing choice would materially change the result, and it does not stop for approval of an expanded prompt once you have asked it to generate. Explicit wording, on-image text, and reference intent are kept as given.

| You say | What happens |
|---|---|
| "a red apple" | Generated right away; the agent fills in setting, style, lighting, and size |
| "a red apple as a flat vector icon, 512x512" | Your style and size are used as given |
| "something for the homepage" | One question about the subject, because it changes the result |

To see exactly what was sent to the provider, check the `prompt` field in `manifest.json` (stored as a SHA-256 with `--no-prompt-in-manifest`).

---

## Configuration

- **Project config:** the `image:` section of `.agents/oma-config.yaml`. The legacy `config/image-config.yaml` is no longer read.
- **Environment variables:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: overrides the configured default vendor (`auto`). The `--vendor` flag itself defaults to `auto`, so pass `--vendor` per command when you need a specific vendor.
  - `OMA_IMAGE_DEFAULT_OUT`: overrides the default output directory
  - `OMA_IMAGE_YES`: `1` to bypass cost confirmation
  - `POLLINATIONS_API_KEY`: required for the pollinations vendor (free signup)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Exit code `5` (auth-required) | Selected vendor is not authenticated | Run `oma image doctor` to see which vendor needs login. Then `codex login`, sign in to `agy`, or set `POLLINATIONS_API_KEY`. |
| Exit code `4` on `--reference` | `pollinations` rejects references, or file too large / wrong format | Switch to `--vendor codex` or `--vendor antigravity`. Each reference must be ≤ 5 MB and PNG/JPEG/GIF/WebP. |
| `--reference` not recognized | Local CLI is outdated | Run `oma update` and retry. Do not fall back to prose description. |
| Cost confirmation blocks automation | Run is estimated at ≥ `$0.20` | Pass `-y` or set `OMA_IMAGE_YES=1`. Better: switch to free `pollinations`. |
| `--vendor all` aborts immediately | One of the requested vendors is not healthy (strict mode) | Install/sign in to the missing vendor, or pick a specific `--vendor`. |
| Output written to an unexpected directory | Default is `.agents/results/images/{timestamp}-{shortid}/` | Pass `--output-dir <dir>`. Paths outside `$PWD` need `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (exit 1) | `--output-dir` points outside the project | Rerun with `--allow-external-output` (the message still shows the old flag name), or pick a directory inside the project. |
| Several vendors ran and the folder ends in `-compare` | `--vendor auto` runs every healthy vendor | Pass one `--vendor` to run a single vendor. |
| Antigravity fails after health passes | `agy --version` proves installation, not sign-in | Sign in to Gemini Code Assist, then retry with `oma image doctor` and `--vendor antigravity`. |

---

## Next steps

- [Video Generation](./video-generation.md): `oma-video` reuses `oma-image` as its visual provider
- [Content and Research Workflows](./content-and-research.md): other content capabilities and their prerequisites
- [Skills](../core-concepts/skills.md): the two-layer skill architecture that powers `oma-image`
- [CLI Commands: image](../cli-interfaces/commands.md#image): full `oma image` command reference
- [CLI Options](../cli-interfaces/options.md): global option matrix
