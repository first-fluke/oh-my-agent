// Runtime constants for hooks. Mirrors the convention in `cli/constants/`:
// constants here, types in `types.ts`. The `Vendor` type in `types.ts` is
// derived from `VENDORS` below so the value and the type stay in sync.

/**
 * Host LLM CLIs supported by Oma's hook layer. This is the single source of
 * truth for which vendors hooks (keyword-detector, persistent-mode, hud,
 * skill-injector) recognise. Adding a new vendor here propagates to the
 * `Vendor` type and to runtime guards such as `CLI_INVOCATION_AT_START`
 * in `keyword-detector.ts`.
 *
 * Excludes:
 *   - `oma` itself (the project's own CLI, listed separately where needed)
 *   - `copilot` and `hermes` (skill-install targets, not hook runtimes)
 *   - third-party harnesses (omc, omx, omo, ouroboros)
 *
 * MUST mirror `cli/constants/vendors.ts` VENDORS — WITH ONE INTENTIONAL
 * EXCEPTION: `pi`. Hooks run as standalone scripts in user environments and
 * cannot import from cli/, so the value is duplicated here. Keep the two
 * arrays in sync by adding or removing the same vendor in both files; CI does
 * not enforce this.
 *
 * `pi` (Earendil's pi-coding-agent) is hook-layer-only and is deliberately
 * absent from the cli runtime `VENDORS`. pi does not register settings-file
 * hooks like the other vendors; instead it auto-loads an in-process extension
 * (`.pi/extensions/oma/index.ts`) that bridges to these same core scripts via
 * subprocess. It therefore needs a `Vendor` identity for the output dialect
 * (`hook-output.ts`) and script-path detection, but must NOT flow through the
 * cli settings-file install path (`installHooksFromVariant`) — that install is
 * forked to `installPiExtension`. See `.agents/hooks/variants/pi/README.md`.
 */
export const VENDORS = [
  "antigravity",
  "claude",
  "codex",
  "commandcode",
  "cursor",
  "grok",
  "kimi",
  "kiro",
  "pi",
  "qwen",
] as const;

/**
 * Fallback session id used when no vendor session id can be resolved from the
 * hook stdin (`getSessionId`). It is shared across BOTH the keyword-detector and
 * persistent-mode hooks so the two stay in sync.
 *
 * A persistent-mode state file keyed to this value cannot be isolated per
 * session: any later session whose id ALSO resolves to the fallback would
 * inherit the stale workflow's persistent block (a cross-session false
 * positive). Both hooks therefore refuse to write — and refuse to act on —
 * persistent state under this id.
 */
export const UNKNOWN_SESSION_ID = "unknown";
