---
name: oma-image
description: "Generate raster images or reference-guided variations through the OMA image CLI. Use for image assets or explicit vendor comparisons; pixel editing uses an editor."
---

# Image Agent - Multi-Vendor Image Router

## Scheduling

### Goal
Generate images and visual assets through authenticated multi-vendor routing while preserving prompt clarity, reference-guided regeneration, cost controls, and reproducible output manifests.

### Intent signature
- User asks to generate images, visual assets, illustrations, product photos, concept art, mockups, or AI art.
- Another skill needs shared image-generation infrastructure.
- User provides reference images for a new generated variation or asks for vendor comparison.

### When to use

- Generating images, visual assets, illustrations, product photos, concept art
- Comparing output between multiple image models for the same prompt
- Producing images from prompts within editor workflows (Claude Code, Codex, Antigravity)
- Other skills needing image generation infrastructure (shared invocation)
- Regenerating a new image that follows a supplied reference's subject, style, lighting, or composition

### When NOT to use

- Pixel-level editing, masking, inpainting, object removal, compositing, cropping, resizing, or format conversion -> out of scope; use an image editor or a tool that explicitly supports that operation.
- Generating videos or audio -> out of scope
- Inline vector art / SVG composition from structured data -> use a templating skill
- Simple asset resizing or format conversion -> use a dedicated image library

### Expected inputs
- Image prompt or creative brief
- Optional vendor, size, quality, count, output directory, and reference images
- Authentication/environment state for Codex, Antigravity (`agy`), or Pollinations

### Expected outputs
- Generated image files under `.agents/results/images/` or requested output directory
- `manifest.json` with prompt, vendor, model, and reproducibility metadata
- Vendor comparison outputs when `--vendor all` is used

### Dependencies
- `oma image generate` CLI and vendor authentication
- `oma image doctor` and `oma image vendor list` for vendor availability and supported models
- Codex image generation, Antigravity (`agy`), or the Pollinations API
- `resources/vendor-matrix.md`, `resources/prompt-tips.md`, and the `image:` section of `.agents/oma-config.yaml`

## Structural Flow

### Transitions
- If the subject or intended result cannot be inferred, clarify that missing input; otherwise proceed with reasonable defaults.
- If `--vendor all` is requested, require every requested vendor to be available.
- If the request is reference-guided regeneration and the selected vendor supports references, pass it automatically.
- When the vendor is chosen by the agent (not fixed by an explicit `--vendor`), record it with subject `image.route-selection` per `../_shared/runtime/route-selection.md`: vendor/model, and the auth, reference-support, or cost fact that decided it.
- If the request requires pixel, mask, crop, resize, or format editing, stop before generation and name the unsupported operation and an appropriate editor route.
- If estimated cost exceeds guardrail, require confirmation unless bypassed.

### Failure and recovery
- If auth is missing, report vendor-specific authentication requirement.
- If reference support is unavailable for the selected vendor, reject with actionable guidance.
- If local CLI is outdated, ask user to run `oma update`.
- If generation times out or is blocked, surface exit code and provider status.

### Exit
- Success: images and manifest exist in the output directory.
- Partial success: some vendors fail in comparison mode and failures are reported.
- Failure: no image is produced and the route/cost/auth/safety blocker is explicit.

## Logical Operations

### Canonical command path
1. Check that the request carries enough subject, setting, style, usage, and aspect-ratio signal; resolve gaps per Creative brief.
2. Classify a supplied image as a reference for a newly generated variation, or as a request for unsupported pixel/mask editing (stop per Transitions). Confirm reference paths are accessible.
3. Check vendor authentication, then the cost guardrail, output path and its permissions, and count limit (Guardrails 2-4 and 7):
   ```bash
   oma image doctor
   ```
4. Generate:
   ```bash
   oma image generate "<prompt>" --vendor auto --size auto --quality auto --output json
   ```
   With reference images:
   ```bash
   oma image generate --reference "<absolute-path>" --vendor codex "<prompt>"
   ```
5. Confirm the images and `manifest.json` exist in the output directory, run `resources/checklist.md`, and report the output paths; on failure, report the exit code and provider status.

### Resource scope and effects
Reads attached or reference images. Creates image files and `manifest.json` under `.agents/results/images/` or the requested output directory. Runs the image router and provider CLIs (Codex, `agy`), which call their own backends, and calls the Pollinations API. Uses provider auth and API keys. Provider APIs may be paid or rate-limited.

### Guardrails

1. **Resolve the brief**: use supplied details and reasonable creative defaults. Ask only when a missing choice materially changes the requested result. Do not require approval of an expanded prompt when generation is already authorized.
2. **Authentication-aware dispatch**: detect which vendor CLIs are available and run only those; with `--vendor all`, every requested vendor must be available (strict). Caveat: the `antigravity` health check verifies installation only (`agy --version`) — a signed-out agy passes health and fails at generate time with agy's own error.
3. **Cost guardrail**: confirm before executing runs whose estimated cost is ≥ `$0.20` (configurable). `--yes` / `OMA_IMAGE_YES=1` bypass. Choose generation from the requested outcome, not keyword presence. **Non-interactive contexts** (agents, CI — no TTY on stdin): the CLI cannot prompt, so a run at/over the threshold exits 1 with a message naming `--yes`. Use `--dry-run` to estimate cost. Reuse an existing budget authorization; otherwise confirm the additional spend before re-running with `-y`.
4. **Path safety**: output paths outside `$PWD` require `--allow-external-output`.
5. **Cancellable**: SIGINT/SIGTERM aborts in-flight provider calls and the orchestrator.
6. **Deterministic outputs**: every run writes `manifest.json` next to the images for reproducibility.
7. **Max `n` = 5**: wall-time bound.
8. **Exit codes align with `oma search fetch`** (0, 1, 2=safety, 3=not-found, 4=invalid-input, 5=auth-required, 6=timeout).

### Creative brief
Use the requested subject and constraints. Infer setting, style, lighting, and aspect ratio when unspecified; preserve explicit text and reference intent. Ask only for a material unresolved choice. Read `resources/prompt-tips.md` for an unfamiliar image category.

## References
- Provider invocation, references, and output layout: `resources/invocation.md` (selected vendor or reference-image operation only).

### Configuration

Project-specific settings: the `image:` section of `.agents/oma-config.yaml`, which `oma update` preserves. Shipped defaults live in the CLI (`DEFAULTS` in `cli/commands/image/config.ts`) — write only the keys you change.
Env vars: `OMA_IMAGE_DEFAULT_VENDOR`, `OMA_IMAGE_DEFAULT_OUT`, `OMA_IMAGE_YES`, `POLLINATIONS_API_KEY`.

- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Vendor matrix: `resources/vendor-matrix.md`
- Prompt tips: `resources/prompt-tips.md`
- Checklist (run before handoff): `resources/checklist.md`
- Context loading: `../_shared/core/context-loading.md`