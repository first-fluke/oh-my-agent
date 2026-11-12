// Cross-vendor hook loading suppression for `oma hook`.
//
// Some hosts also load other vendors' hook files for compatibility:
//
//   Grok    loads `.claude/settings.json` (+ `settings.local.json`, and the
//           `~/.claude` copies) and `.cursor/hooks.json` (+ `~/.cursor`),
//           `compat.claude.hooks` / `compat.cursor.hooks`, both on by default
//           (Grok user guide, "Hook Locations").
//   Cursor  loads `.claude/settings.json`, `.claude/settings.local.json` and
//           `~/.claude/settings.json`, mapping Claude event names onto its
//           own (cursor-agent 2026.10 `claudeProjectHooks` /
//           `claudeUserHooks`).
//
// When oma registered hooks for both the host and the foreign vendor, one
// prompt or tool call then runs the oma chain twice — once as the host and
// once as `--vendor claude` / `--vendor cursor`, mis-attributing state,
// telemetry and skill routes to the foreign vendor. The dedup claim store
// cannot catch it: the two deliveries differ in vendor and payload dialect.
//
// So a delivery yields when the process was launched by a different host AND
// that host has its own oma registration, which handles the same event. When
// the host has no oma hooks of its own, the foreign registration is the only
// oma coverage there and still dispatches.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveProjectRoot } from "../../../.agents/hooks/core/fs-utils.js";
import type { Vendor } from "./types.js";

/** Hosts known to load another vendor's hook settings files. */
export type CompatHost = "grok" | "cursor";

/**
 * The host that actually launched this hook run, when it can load foreign
 * hook files. Grok injects `GROK_HOOK_*` into every hook it spawns; Cursor's
 * payload always carries `cursor_version`.
 */
export function detectCompatHost(
  payload: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): CompatHost | null {
  if (env.GROK_HOOK_EVENT || env.GROK_HOOK_NAME) return "grok";
  if (typeof payload.cursor_version === "string") return "cursor";
  return null;
}

/** Hook files where oma registers the host's own hooks (project, then home). */
function hostHookFiles(
  host: CompatHost,
  projectRoot: string,
  home: string,
): string[] {
  const rel =
    host === "grok"
      ? join(".grok", "hooks", "oma-hooks.json")
      : join(".cursor", "hooks.json");
  return [join(projectRoot, rel), join(home, rel)];
}

const VENDOR_ARG = (host: CompatHost) =>
  new RegExp(`--vendor\\s+['"]?${host}['"]?(?:\\s|$)`);

/** True when an oma hook registration for `host` exists in its hook files. */
export function hostHasOmaHooks(
  host: CompatHost,
  projectRoot: string,
  home: string = homedir(),
): boolean {
  const pattern = VENDOR_ARG(host);
  for (const file of hostHookFiles(host, projectRoot, home)) {
    try {
      if (!existsSync(file)) continue;
      if (pattern.test(readFileSync(file, "utf-8"))) return true;
    } catch {
      // Unreadable: treat as no registration (dispatch, fail-open).
    }
  }
  return false;
}

export interface CompatYieldInput {
  vendor: Vendor;
  rawStdin: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
}

/**
 * Whether this delivery should be dropped because the launching host loaded
 * a foreign vendor's oma hook and runs its own oma registration for the same
 * event. Fail-open: any doubt dispatches.
 */
export function shouldYieldToHostRegistration(
  input: CompatYieldInput,
): boolean {
  try {
    let payload: Record<string, unknown> = {};
    if (input.rawStdin.trim()) {
      const parsed: unknown = JSON.parse(input.rawStdin);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    }
    const host = detectCompatHost(payload, input.env ?? process.env);
    if (!host || host === input.vendor) return false;
    const roots = payload.workspace_roots;
    const payloadCwd =
      (typeof payload.cwd === "string" && payload.cwd) ||
      (Array.isArray(roots) && typeof roots[0] === "string" && roots[0]) ||
      (typeof payload.workspaceRoot === "string" && payload.workspaceRoot) ||
      input.cwd;
    return hostHasOmaHooks(
      host,
      resolveProjectRoot(payloadCwd),
      input.home ?? homedir(),
    );
  } catch {
    return false;
  }
}
