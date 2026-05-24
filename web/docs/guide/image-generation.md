---
title: "Guide: Image Generation"
description: Complete guide to oh-my-agent image generation, covering multi-vendor dispatch via Codex (gpt-image-2), Pollinations (flux/zimage, free), and Gemini, with reference images, cost guardrails, output layout, troubleshooting, and shared invocation patterns.
---

# Image Generation

`oma-image` is the multi-vendor image router for oh-my-agent. It generates images from natural-language prompts, dispatches to whichever vendor CLI you are authenticated with, and writes a deterministic manifest next to the output so every run is reproducible.

The skill auto-activates on keywords like *image*, *illustration*, *visual asset*, *concept art*, or when another skill needs an image as a side-effect (hero shot, thumbnail, product photo).

---

## When to use

- Generating images, illustrations, product photos, concept art, hero/landing visuals
- Comparing the same prompt across multiple models side-by-side (`--vendor all`)
- Producing assets from inside an editor workflow (Claude Code, Codex, Gemini CLI)
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
| `gemini` | CLI-first → direct API fallback | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` or `GEMINI_API_KEY` + billing | Disabled by default; requires billing |

`pollinations` is the default vendor because `flux` / `zimage` are free, so auto-triggering on keywords is safe.

---

## Quick start

```bash
# Free, zero-config (uses pollinations/flux)
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` is an alias for `oma image`.

---

## Use as a skill

`oma-image` is a skill that auto-activates from natural language and can also be invoked explicitly. There are three entry points.

### 1. Natural language (auto-activation)

Inside Claude Code, Codex CLI, or Gemini CLI, just describe the image. The skill matches keywords like *image*, *illustration*, *visual asset*, *concept art*, *hero shot*, *thumbnail*, *product photo*.

You don't need to remember CLI flags. Say it in plain language and the skill maps it to the right options:

| You say | Skill infers |
|---|---|
| "use codex" / "with gpt-image-2" / "free flux" | `--vendor codex` / `--vendor pollinations` |
| "compare across vendors" / "side by side" | `--vendor all` |
| "portrait" / "landscape" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "high quality" / "draft" | `--quality high` / `--quality low` |
| "three variations" / "give me 3" | `-n 3` |
| "save to ./hero" / "output to docs/assets" | `--out <dir>` |
| Attached image + "make it nighttime" | `-r <attached path>` |
| "just estimate the cost" / "dry run" | `--dry-run` |

Examples:

> "Generate a minimalist sunrise over mountains for the landing hero, landscape, high quality."
> "Compare a ceramic mug product photo across all vendors, three variations each."
> "Use codex to make this otter photo dramatic and nighttime." (with attached reference)

The agent runs the [Clarification Protocol](#clarification-protocol), amplifies the prompt if needed, and calls `oma image generate` with the inferred flags. Use the slash command when you want explicit control over the exact flag values.

### 2. Explicit slash command

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

Every CLI flag (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) works in the slash command and is forwarded to the same `oma image generate` pipeline.

### 3. From another skill (shared infrastructure)

Other skills (design, marketing, docs) call the pipeline as shared infrastructure with JSON output:

```bash
oma image generate "<prompt>" --format json
```

The manifest written to stdout includes output paths, vendor, model, and cost, making it easy to parse and chain.

---

## CLI reference

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Key flags

| Flag | Purpose |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity`, or `all`. With `all`, every requested vendor must be authenticated (strict). |
| `-n, --count <n>` | Number of images per vendor, 1–5 (wall-time bound). |
| `--size <size>` | Aspect: `1024x1024` (square), `1024x1536` (portrait), `1536x1024` (landscape), or `auto`. |
| `--quality <level>` | `low`, `medium`, `high`, or `auto` (vendor default). |
| `--out <dir>` | Output directory. Defaults to `.agents/results/images/{timestamp}/`. Paths outside `$PWD` require `--allow-external-out`. |
| `-r, --reference <path>` | Up to 10 reference images (PNG/JPEG/GIF/WebP, ≤ 5 MB each). Repeatable or comma-separated. Supported on `codex` and `gemini`; rejected on `pollinations`. |
| `-y, --yes` | Skip the cost-confirmation prompt for runs estimated at ≥ `$0.20`. Also via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Store the SHA-256 of the prompt instead of the raw text in `manifest.json`. |
| `--dry-run` | Print the plan and the cost estimate without spending. |
| `--format text\|json` | CLI output format. JSON is the integration surface for other skills. |
| `--strategy <list>` | Gemini-only escalation, e.g. `mcp,stream,api`. Overrides `vendors.gemini.strategies`. |

---

## Reference images

Attach up to 10 reference images to guide style, subject identity, or composition.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Reference support | How |
|---|---|---|
| `codex` (gpt-image-2) | Yes | Passes `-i <path>` to `codex exec` |
| `gemini` (2.5-flash-image) | Yes | Inlines base64 `inlineData` in the request |
| `pollinations` | No | Rejected with exit code 4 (requires URL hosting) |

### Where attached images live

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, surfaced in system messages as `[Image: source: <path>]`. Session-scoped; copy to a durable location if you want to reuse it later.
- **Antigravity**: workspace upload directory (the IDE shows the exact path)
- **Codex CLI as host**: must be passed explicitly; in-conversation attachments are not forwarded

When the user attaches an image and asks to generate or edit one based on it, the calling agent **must** forward it via `--reference <path>` rather than describing it in prose. If the local CLI is too old to support `--reference`, run `oma update` and retry.

---

## Output layout

Every run writes to `.agents/results/images/` with a timestamped, hash-suffixed directory:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` records the vendor, model, prompt (or its SHA-256), size, quality, and cost, so every run is reproducible from the manifest alone.

---

## Cost, safety, and cancellation

1. **Cost guardrail**: runs estimated at ≥ `$0.20` ask for confirmation. Bypass with `-y` or `OMA_IMAGE_YES=1`. Default `pollinations` (flux/zimage) is free, so the prompt is skipped for it automatically.
2. **Path safety**: output paths outside `$PWD` require `--allow-external-out` to avoid surprising writes.
3. **Cancellable**: `Ctrl+C` (SIGINT/SIGTERM) aborts every in-flight provider call and the orchestrator together.
4. **Deterministic outputs**: `manifest.json` is always written next to the images.
5. **Max `n` = 5**: a wall-time bound, not a quota.
6. **Exit codes**: aligned with `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Clarification protocol

Before invoking `oma image generate`, the calling agent runs this checklist. If anything is missing and not inferable, it asks first or amplifies the prompt and shows the expansion for approval.

**Required:**
- **Subject**: what is the primary thing in the image? (object, person, scene)
- **Setting / backdrop**: where is it?

**Strongly recommended (ask if absent and not inferable):**
- **Style**: photorealistic, illustration, 3D render, oil painting, concept art, flat vector?
- **Mood / lighting**: bright vs moody, warm vs cool, dramatic vs minimal
- **Usage context**: hero image, icon, thumbnail, product shot, poster?
- **Aspect ratio**: square, portrait, or landscape

For a brief prompt like *"a red apple"*, the agent does **not** ask follow-up questions. Instead it amplifies inline and shows the user:

> User: "a red apple"
> Agent: "I'll generate this as: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Shall I proceed, or would you like a different style/composition?"

When the user has authored a complete creative brief (≥ 2 of: subject + style + lighting + composition), their prompt is respected verbatim, with no clarification and no amplification.

**Output language.** Generation prompts are sent to the provider in English (image models are trained predominantly on English captions). If the user wrote in another language, the agent translates and shows the translation during amplification so the user can correct any misreading.

---

## Configuration

- **Project config:** `config/image-config.yaml`
- **Environment variables:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: overrides the default vendor (otherwise `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT`: overrides the default output directory
  - `OMA_IMAGE_YES`: `1` to bypass cost confirmation
  - `POLLINATIONS_API_KEY`: required for the pollinations vendor (free signup)
  - `GEMINI_API_KEY`: required when the gemini vendor falls back to the direct API
  - `OMA_IMAGE_GEMINI_STRATEGIES`: comma-separated escalation order for gemini (`mcp,stream,api`)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Exit code `5` (auth-required) | Selected vendor is not authenticated | Run `oma image doctor` to see which vendor needs login. Then `codex login` / set `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Exit code `4` on `--reference` | `pollinations` rejects references, or file too large / wrong format | Switch to `--vendor codex` or `--vendor gemini`. Each reference must be ≤ 5 MB and PNG/JPEG/GIF/WebP. |
| `--reference` not recognized | Local CLI is outdated | Run `oma update` and retry. Do not fall back to prose description. |
| Cost confirmation blocks automation | Run is estimated at ≥ `$0.20` | Pass `-y` or set `OMA_IMAGE_YES=1`. Better: switch to free `pollinations`. |
| `--vendor all` aborts immediately | One of the requested vendors is not authenticated (strict mode) | Authenticate the missing vendor, or pick a specific `--vendor`. |
| Output written to an unexpected directory | Default is `.agents/results/images/{timestamp}/` | Pass `--out <dir>`. Paths outside `$PWD` need `--allow-external-out`. |
| Gemini returns no image bytes | Gemini CLI's agentic loop does not emit raw `inlineData` on stdout (as of 0.38) | Provider falls back to the direct API automatically. Set `GEMINI_API_KEY` and ensure billing. |

---

## Related

- [Skills](/docs/core-concepts/skills): the two-layer skill architecture that powers `oma-image`
- [CLI Commands](/docs/cli-interfaces/commands): full `oma image` command reference
- [CLI Options](/docs/cli-interfaces/options): global option matrix
