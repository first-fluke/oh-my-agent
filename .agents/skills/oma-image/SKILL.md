---
name: oma-image
description: Multi-vendor AI image generation with authentication-aware parallel dispatch. Routes to Codex (gpt-image-2 via ChatGPT OAuth) and Pollinations (flux/zimage, free with signup). Gemini provider is present but disabled by default (requires billing). Use for image generation, image creation, visual asset generation, and AI art.
---

# Image Agent - Multi-Vendor Image Router

## When to use

- Generating images, visual assets, illustrations, product photos, concept art
- Comparing output between multiple image models for the same prompt
- Producing images from prompts within editor workflows (Claude Code, Codex, Gemini CLI)
- Other skills needing image generation infrastructure (shared invocation)

## When NOT to use

- Editing an existing image or photo manipulation -> out of scope
- Generating videos or audio -> out of scope
- Inline vector art / SVG composition from structured data -> use a templating skill
- Simple asset resizing or format conversion -> use a dedicated image library

## Core Rules

1. **Clarify before invoking** — if the user's request is ambiguous about subject, style, composition, or usage context, **ask the user first** or **amplify the prompt explicitly** (showing the user the expanded version for approval). Do NOT silently generate from a vague prompt. See `Clarification Protocol` below.
2. **Authentication-aware dispatch** — detect which vendor CLIs are authenticated and run only those; with `--vendor all`, every requested vendor must be available (strict).
3. **Cost guardrail** — confirm before executing runs whose estimated cost is ≥ `$0.20` (configurable). `--yes` / `OMA_IMAGE_YES=1` bypass. Default vendor `pollinations` (flux/zimage) is free, so auto-triggering on keywords is safe.
4. **Path safety** — output paths outside `$PWD` require `--allow-external-out`.
5. **Cancellable** — SIGINT/SIGTERM aborts in-flight provider calls and the orchestrator.
6. **Deterministic outputs** — every run writes `manifest.json` next to the images for reproducibility.
7. **Max `n` = 5** — wall-time bound.
8. **Exit codes align with `oma search fetch`** (0, 1, 2=safety, 3=not-found, 4=invalid-input, 5=auth-required, 6=timeout).

## Clarification Protocol

Before invoking `oma image generate`, the calling agent runs this checklist against the user's request. **If any answer is "no / unknown", clarify with the user first.**

**Required signal (must be present or inferable):**
- [ ] **Subject** — what is the primary thing in the image? (object, person, scene)
- [ ] **Setting / backdrop** — where is it? (context, environment)

**Strongly recommended (ask if absent AND not inferable from context):**
- [ ] **Style** — photorealistic, illustration, 3D render, oil painting, concept art, flat vector, …?
- [ ] **Mood / lighting** — bright vs moody, warm vs cool, dramatic vs minimal
- [ ] **Usage context** — hero image, icon, thumbnail, product shot, poster? (dictates aspect ratio + composition)
- [ ] **Aspect ratio** — square (`1024x1024`), portrait (`1024x1536`), landscape (`1536x1024`)?

**Amplification shortcut.** For brief prompts (e.g. "a red apple"), do not pop clarifying questions if the request is genuinely that simple — instead **amplify inline and show the user** the expanded version before invoking:

> User: "a red apple"
> Agent: "I'll generate this as: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Shall I proceed, or would you like a different style/composition?"

Skip both clarification and amplification when the user has clearly authored a full creative brief (≥ 2 of: subject + style + lighting + composition). Respect their prompt verbatim.

**Category-specific briefs** (app mockup, poster, thumbnail, infographic, comic panel, avatar): consult `resources/prompt-tips.md` → *External Prompt Libraries*.

**Output language.** Generation prompts are sent to the provider in English (image models are trained predominantly on English captions). Translate the user's request if they wrote in another language, and show them the translated version during amplification so they can correct misreadings.

## Vendors

| Vendor | Primary Strategy | Models | Trigger |
|--------|-----------------|--------|---------|
| `codex` | `codex exec` (OAuth via ChatGPT subscription) → built-in `image_gen` | `gpt-image-2` | Logged into Codex CLI |
| `pollinations` | `gen.pollinations.ai/v1/images/generations` (OpenAI-compatible) | Free: `flux`, `zimage`. Credit-gated (requires pollen balance): `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` is set (free key at https://enter.pollinations.ai) |
| `gemini` | `@google/genai` SDK (direct API) | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `GEMINI_API_KEY` set + billing activated on AI Studio account |

## Invocation

### Standalone

```
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

### Shell CLI

```
oma image generate "<prompt>" [--vendor auto|codex|pollinations|gemini|all] [-n 1..5] \
                             [--size 1024x1024|1024x1536|1536x1024|auto] \
                             [--quality low|medium|high|auto] \
                             [--out <dir>] [--allow-external-out] \
                             [-r <path>]... \
                             [--timeout 180] [-y] [--no-prompt-in-manifest] \
                             [--dry-run] [--format text|json]
oma image doctor
oma image list-vendors
```

Gemini-only escalation flag: `--strategy mcp,stream,api` (overrides `vendors.gemini.strategies`).

### Reference Images (`-r`, `--reference`)

Attach up to 10 reference images (PNG/JPEG/GIF/WebP, ≤ 5MB each) to guide style, subject identity, or composition. Repeatable or comma-separated.

```
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting"
oma image generate -r a.png -r b.png "blend these two styles"
```

Supported vendors:

| Vendor | Support | How |
|--------|---------|-----|
| `codex` (gpt-image-2) | ✅ | Passes `-i <path>` to `codex exec` |
| `gemini` (2.5-flash-image) | ✅ | Inlines base64 `inlineData` parts in request |
| `pollinations` | ❌ | Rejected with exit code 4 (requires URL hosting; see PR #2 roadmap) |

**Paths**: absolute or relative to `$CWD`. Host CLIs usually expose attached images via:
- **Claude Code**: `~/.claude/image-cache/<session>/N.png` (surfaced in system messages as `[Image: source: <path>]`)
- **Antigravity**: workspace upload directory (exact path shown in IDE)
- **Codex CLI as host**: user must pass the filesystem path explicitly; in-conversation attachments are not forwarded

### Shared Infrastructure (from other skills)

Other skills call `oma image generate --format json` and parse the JSON manifest from stdout.

## Output Layout

```
.agents/results/images/
├── 20260424-143052-ab12cd/                    # single-vendor run
│   └── pollinations-flux.jpg
│       (or codex-gpt-image-2.png)
│       manifest.json
└── 20260424-143122-7z9kqw-compare/            # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

## How to Execute

Follow `resources/execution-protocol.md` step by step.
See `resources/vendor-matrix.md` for strategy precheck rules.
Use `resources/prompt-tips.md` for writing effective prompts.
Before submitting, run `resources/checklist.md`.

## Configuration

Project-specific settings: `config/image-config.yaml`.
Env vars: `OMA_IMAGE_DEFAULT_VENDOR`, `OMA_IMAGE_DEFAULT_OUT`, `OMA_IMAGE_YES`, `POLLINATIONS_API_KEY`, `GEMINI_API_KEY`, `OMA_IMAGE_GEMINI_STRATEGIES`.

## References

- Execution steps: `resources/execution-protocol.md`
- Vendor matrix: `resources/vendor-matrix.md`
- Prompt tips: `resources/prompt-tips.md`
- Checklist: `resources/checklist.md`
- Context loading: `../_shared/core/context-loading.md`
