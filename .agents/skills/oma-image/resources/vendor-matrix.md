# Vendor Matrix

## Reference Image Support (`--reference` / `-r`)

| Vendor | Reference input | Transport | Notes |
|--------|-----------------|-----------|-------|
| `codex` | ✅ | `codex exec -i <path>` (repeatable) | Local file path; 5MB-per-file cap enforced by Codex CLI |
| `gemini` | ✅ | `inlineData` parts (base64) prepended to text prompt | Up to 14 refs supported by `gemini-2.5-flash-image`; OMA caps at 10 |
| `pollinations` | ❌ | — | Requires URL hosting; rejected with exit 4. Planned for PR #2. |

All paths are validated in `reference-guard.ts` (magic-byte MIME check + size + count + duplicate rejection) before dispatch. The magic-byte-detected MIME is threaded through `GenerateInput.referenceImages` and used verbatim at the vendor API boundary — file extension is never trusted for MIME type.

## Codex

| Field | Value |
|-------|-------|
| Binary | `codex` (npm: `@openai/codex`) |
| Auth | OAuth via `codex login` |
| Health check | `codex login status` output contains "Logged in" |
| Model | `gpt-image-2` |
| Transport | `codex exec "<instruction>"` — internal bridge invokes `image_gen` tool |
| Image location | `~/.codex/generated_images/<session>/ig_*.png` → copied to `outDir` |
| Sizes | `1024x1024`, `1024x1536`, `1536x1024` |
| Qualities | `low`, `medium`, `high`, `auto` |

Codex requires `--skip-git-repo-check` for invocation inside a git worktree; this is inherited from the upstream `codex-image` skill and is a known dependency of the Codex CLI image path.

## Gemini

Strategies are tried in order from `vendors.gemini.strategies` (default `mcp → stream → api`). Each strategy has a `precheck()` that returns `{ ok, reason? }` — a failed precheck is recorded as `skipped` and the runner continues.

### α — mcp

| Field | Value |
|-------|-------|
| Requirement | `mcp-genmedia` MCP server wired into the Gemini CLI |
| Precheck | `OMA_IMAGE_GEMINI_MCP=1` (explicit opt-in) |
| Model | vendor model (default `gemini-2.5-flash-image`) |
| Status | v1: precheck scaffold only — full implementation deferred to P1+ |

### β — stream (disabled)

| Field | Value |
|-------|-------|
| Status | **Disabled at precheck** as of Gemini CLI 0.38 |
| Reason | `gemini -p` always runs the full agent loop. Its `stream-json` output contains `init`/`message`/`tool_use`/`tool_result` events — not raw `inlineData` image bytes. Asked to generate an image, `gemini` tries to invoke image-generation tools itself (including ironically this very `oma-image` skill), rather than returning bytes on stdout. |
| Re-enable | When Gemini CLI exposes a non-agentic image surface, update `geminiStreamStrategy.precheck()` to return `{ ok: true }` and reuse the existing parser (`extractImageFromStream`) which is still unit-tested. |
| Parser kept | `extractImageFromStream` remains in place + tested so the code path can be unbricked quickly when the CLI surface changes. |

### γ — api

| Field | Value |
|-------|-------|
| Requirement | `GEMINI_API_KEY` env var |
| Transport | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…` |
| Parsing | First candidate part with `inlineData.data` |
| Retry | 429 → throw `rate-limit` with `Retry-After` header |

## Strategy Attempt Record

Manifest field `strategy_attempts` is always an array of objects:

```
{ "strategy": "mcp" | "stream" | "api",
  "status": "ok" | "skipped" | "failed",
  "reason"?: string,
  "duration_ms"?: number }
```

The last successful strategy also appears on the run as `strategy`.

## Error Classification

| Error kind | Retry policy | Exit code when solo |
|------------|-------------|---------------------|
| `not-installed` | fail (the vendor skips the strategy via precheck before this kind appears) | 5 |
| `auth-required` | fail; printed hint tells user how to authenticate | 5 |
| `invalid-input` | fail; surfaces validation problems from the provider | 4 |
| `safety-refused` | short-circuit — no fallback to other strategies | 2 |
| `rate-limit` | record attempt as failed; continue to next strategy | 1 (if no vendor succeeded) |
| `timeout` | record attempt as failed; continue | 6 |
| `network` | `retryable=true` → continue; `false` → record and continue | 1 |
| `other` | continue through remaining strategies | 1 |
