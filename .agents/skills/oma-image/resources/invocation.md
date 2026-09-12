# Image Invocation Reference

### Vendors

This skill follows oh-my-agent's CLI-first concept: whenever a vendor's native CLI can drive generation (and return raw bytes), the subprocess path is preferred over direct API keys. Direct API is only used as a fallback for vendors whose CLI can't yet emit raw image bytes.

| Vendor | Strategy | Models | Trigger |
|--------|----------|--------|---------|
| `codex` | CLI-first via `codex exec` over ChatGPT OAuth (`codex login`), built-in `image_gen` | `gpt-image-2` | Logged in via Codex CLI (no API key) |
| `pollinations` | Direct HTTP via `gen.pollinations.ai/v1/images/generations` (free signup for key) | Free: `flux`, `zimage`. Credit-gated: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` set (free at https://enter.pollinations.ai). No native CLI exists. |
| `antigravity` | `agy -p --dangerously-skip-permissions --add-dir <outDir>` — Antigravity's agentic CLI runs over the user's Gemini Code Assist subscription. agy writes raw bytes to absolute target paths we embed in the prompt; the provider sniffs format via magic bytes and renames the file extension to match. Model selection is opaque — agy picks internally, we never name a model. | (opaque — chosen by agy) | `agy` CLI installed + signed in. No API key, no per-image charge. |

> The direct Gemini path (`gemini -p` stream, `generativelanguage.googleapis.com` API) is deprecated. `agy` is the supported Gemini image route — it's free with Gemini Code Assist and doesn't require billing on AI Studio.

### Invocation

#### Standalone

```
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

#### Shell CLI

```
oma image generate "<prompt>" [--vendor auto|codex|pollinations|antigravity|all] [-n 1..5] \
                             [--size WxH|auto] \
                             [--quality low|medium|high|auto] \
                             [--model <name>] \
                             [--output-dir <dir>] [--allow-external-output] \
                             [-r <path>]... \
                             [--timeout 180] [-y] [--no-prompt-in-manifest] \
                             [--dry-run] [--output text|json]
oma image doctor
oma image vendor list
```

`--model <name>` overrides the vendor's default model for this run — e.g. `--vendor pollinations --model zimage`, or a credit-gated Pollinations model like `gpt-image-2`. It applies to every vendor in the run set, so combine it with an explicit `--vendor`; `antigravity` ignores it (agy picks its model internally).

#### Reference-guided regeneration (`-r`, `--reference`)

Attach up to 10 reference images (PNG/JPEG/GIF/WebP, ≤ 5MB each) to guide a **newly generated** image's style, subject identity, lighting, or composition. Repeatable or comma-separated. The output is a new generation, not a pixel-preserving edit of the input.

```
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting"
oma image generate -r a.png -r b.png "blend these two styles"
```

Supported vendors:

| Vendor | Support | How |
|--------|---------|-----|
| `codex` (gpt-image-2) | PASS | Passes `-i <path>` to `codex exec` |
| `antigravity` | PASS | Refs copied to a per-run temp dir, `agy --add-dir <tmpdir>` grants access, paths inlined into the prompt |
| `pollinations` | N/A | Rejected with exit code 4 when explicitly selected (requires URL hosting; see PR #2 roadmap). Under `--vendor auto`, reference-unsupported vendors are silently dropped from the run set instead. |

**Paths**: absolute or relative to `$CWD`. Host CLIs usually expose attached images via:
- **Claude Code**: `~/.claude/image-cache/<session>/N.png` (surfaced in system messages as `[Image: source: <path>]`)
- **Antigravity**: workspace upload directory (exact path shown in IDE)
- **Codex CLI as host**: user must pass the filesystem path explicitly; in-conversation attachments are not forwarded

#### Agent Behavior: Auto-forward Attached References (MANDATORY)

When ALL of the following are true, the calling agent MUST pass the attached image via `--reference <path>` automatically. Never describe the image in prose as a workaround.

1. The user asks for a new generated variation (for example, "same subject in dramatic lighting", "make a new illustration in this style", or "regenerate this at a different angle").
2. A host-surfaced attached image is visible to the agent (e.g. a Claude Code system message with `[Image: source: <path>]`, or an Antigravity workspace upload path, or an explicit filesystem path in the user's message).
3. The selected vendor supports references (`codex` or `antigravity`).

**Required action**: invoke `oma image generate --reference <absolute-path> --vendor <codex|antigravity> "<prompt>"`. If the user didn't specify a vendor, default to `codex` (CLI-first, widest availability). Do NOT:

- Fall back to prose description ("I'll describe the otter's appearance...").
- Ask the user to re-type or re-attach the path.
- Claim the CLI doesn't support references without first running `oma image generate --help` to verify.

**If the local CLI is outdated** (`--reference` is missing from `--help`): tell the user to run `oma update` once, then retry. Do not silently degrade to prose.

**If the reference path is from Claude Code's `image-cache`**: note to the user that the path is session-scoped and suggest copying the file to a durable location if they want to reuse it later. Still proceed with the generation.

**Unsupported edit requests**: Do not route requests such as "remove this object", "change only the background", "paint inside this mask", "keep every pixel except", "crop", "resize", or "convert this file" through `--reference`. They need pixel/mask editing or deterministic image processing, neither of which this CLI provides. Say whether the request can instead be phrased as a reference-guided regeneration; otherwise route to an appropriate image editor or processing tool.

#### Shared Infrastructure (from other skills)

Other skills call `oma image generate --output json` and parse the JSON manifest from stdout.

### Output Layout

Filenames follow `<vendor>[-<model>]-<shortid>[-<n>].<ext>` — the model segment is omitted for `antigravity` (opaque model), the extension reflects the sniffed format (JPEG is common), and `-<n>` appears only when `-n` > 1.

```
.agents/results/images/
├── 20260424-143052-ab12cd/                    # single-vendor run
│   ├── pollinations-flux-ab12cd.jpg
│   │   (or codex-gpt-image-2-ab12cd.png, antigravity-ab12cd.jpg)
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/            # --vendor all run
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg
    └── manifest.json
```
