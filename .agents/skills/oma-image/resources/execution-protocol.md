# Image Agent - Execution Protocol

## Step -1: Clarify / Amplify Prompt (agent-side, before `oma image generate`)

Run the **Clarification Protocol** in `SKILL.md` before shelling out.

## Step 0: Parse Request

1. Extract prompt and flags from the invocation.
2. Resolve defaults from `config/image-config.yaml` → env vars → CLI flags (lowest to highest precedence).
3. Validate:
   - `count` ∈ [1, 5]
   - `size` ∈ {`1024x1024`, `1024x1536`, `1536x1024`, `auto`}
   - `quality` ∈ {`low`, `medium`, `high`, `auto`}
   - `vendor` ∈ {`auto`, `codex`, `pollinations`, `gemini`, `all`} or a concrete registered name.
   - `reference` (if any): each path exists, is a regular file ≤ 5MB, magic-byte-matches PNG/JPEG/GIF/WebP, ≤ 10 total, and duplicate paths are rejected with exit 4.
4. If invalid: exit code 4 and a message identifying the offending field.

## Step 0.5: Reference Image Handling

When `--reference <path...>` is supplied:

1. Validate every path via `reference-guard.ts`. On failure → exit 4.
2. Reject the request if the selected vendor(s) do not support references (currently only `codex` and `gemini`). Pollinations returns exit 4 with a hint to switch vendor.
3. Pass validated absolute paths through `GenerateInput.referenceImages`:
   - `codex` provider appends `-i <path>` per reference to `codex exec` and adds a guidance sentence to the instruction text.
   - `gemini` api strategy reads each file, base64-encodes it, and prepends `{ inlineData: { mimeType, data } }` parts before the text prompt.
4. Record reference paths in `manifest.json` under `reference_images` (top-level array of absolute paths).

### Auto-forward attached images (MANDATORY)

If the user asks to generate/edit an image AND a host-attached image is visible to the agent (e.g. `[Image: source: <path>]` in a Claude Code system message, Antigravity workspace upload, or explicit user-provided path), the agent MUST pass it via `--reference <path>`. Do not fall back to describing the image in prose. Do not ask the user to re-type the path. If `oma image generate --help` shows no `--reference` flag, instruct the user to run `oma update` and retry — do not silently degrade.

### Host-Specific Reference Paths

Agents invoking `oma image generate --reference` should surface the following host-specific locations to the user:

| Host CLI | Attachment Surface | Path pattern |
|----------|--------------------|--------------|
| **Claude Code** | `[Image: source: ...]` in system messages | `~/.claude/image-cache/<session-uuid>/<N>.png` (undocumented, verified empirically; cache is cleared on session end) |
| **Antigravity IDE** | Workspace upload via "Upload to Agent" | Project workspace upload dir; exact path shown in IDE file tree |
| **Codex CLI as host** | `-i` flag attaches to LLM context only | No filesystem path exposed. User must provide an explicit path (e.g., `~/Downloads/foo.png`). In-conversation pastes cannot be forwarded. |
| **Gemini CLI as host** | Varies by version | Prefer explicit paths over paste |

Agents should prefer user-supplied explicit paths (e.g., `~/Downloads/otter.jpeg`) over host-cache paths when durability across sessions matters.

## Step 1: Vendor Selection

1. Call `health()` on every registered provider in parallel.
2. Classify:
   - `healthy` — `ok: true`
   - `unhealthy` — `ok: false` with a hint
3. Decide based on `--vendor`:
   - `auto`: continue with every `healthy` provider. If zero → exit 5.
   - `all`: every provider must be healthy. Any missing → exit 5 naming the specific vendor.
   - `<name>`: resolve the named provider. If unhealthy → exit 5 with its hint.
4. Log `using: <vendor(s)>` to stderr before generation.

## Step 2: Cost Guardrail

1. Estimate cost as `sum(per_image_usd[vendor][model][quality] × count)` over all selected vendors.
2. If `--dry-run`: print the plan (vendors, counts, outDir, cost) and exit 0.
3. If estimate ≥ `cost_guardrail.estimate_threshold_usd` and not `--yes`/`OMA_IMAGE_YES=1`:
   - Prompt user on stderr: `Estimated cost $X.XX. Proceed? (y/N)`
   - Decline → exit 1.

## Step 3: Cancellation Setup

1. Install `SIGINT`/`SIGTERM` handlers that call `AbortController.abort()`.
2. Thread the signal into every provider call via `GenerateInput.signal`.

## Step 4: Dispatch

- **Single vendor** — run `provider.generate(input)` sequentially.
- **Multi-vendor (`all` or `auto` with 2+ healthy)** — `Promise.allSettled` across providers.
- Providers with sub-strategies escalate internally (e.g. Gemini: `mcp → stream → api`). Record every strategy attempt (ok/skipped/failed with reason).
- Non-retryable errors (safety-refused, invalid-input) short-circuit the escalation chain.

## Step 5: Write Artifacts

1. Save each image to `outDir/<vendor>-<model>[-<n>].png`.
2. Build `manifest.json` with schema version 1 (see `vendor-matrix.md` for fields).
3. If `--no-prompt-in-manifest` is set, replace `prompt` with `prompt_sha256`.

## Step 6: Report

1. For each run, print a one-line status to stderr:
   - `[oma image] <vendor> ok (Xs) -> <file>`
   - `[oma image] <vendor> failed (<kind>): <reason>`
2. Print manifest path.
3. For `--format json`: write `{exitCode, manifestPath, runs}` to stdout as one JSON object.

## Step 7: Exit Code Aggregation

- Any successful run in parallel mode → exit 0 (failures still in manifest).
- All failures → pick the most specific exit code:
  - `safety-refused` → 2
  - `invalid-input` → 4
  - `auth-required` / `not-installed` → 5
  - `timeout` → 6
  - otherwise → 1

## On Error

| Situation | Action |
|-----------|--------|
| No vendors authenticated | Exit 5, print `Run: oma image doctor` |
| Specific vendor unhealthy | Exit 5 with the vendor's setup guide (URL + env var + steps, rendered by `oma image doctor`) |
| All sub-strategies failed for a provider | Exit 1 with last classified error; include `strategy_attempts` in manifest |
| Timeout | Exit 6, manifest records `after_ms` |
| Cancelled (Ctrl+C) | Exit 130 (signal); no manifest if abort was pre-write |
