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
4. If invalid: exit code 4 and a message identifying the offending field.

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
