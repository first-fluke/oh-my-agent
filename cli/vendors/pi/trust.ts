/**
 * pi project trust for oh-my-agent project installs.
 *
 * pi 0.79+ treats a folder with project inputs — `.pi/extensions`,
 * `.pi/settings.json`, `.agents/skills`, … (an oma project always has
 * `.pi/extensions/oma` and `.agents/skills`) — as untrusted until decided.
 * Interactive runs ask; `pi -p` / json / rpc silently skip the protected
 * inputs, so oma's extension and skills do not load. The global
 * `~/.pi/agent/extensions/oma` is not gated.
 *
 * Decisions live in `${PI_CODING_AGENT_DIR || ~/.pi/agent}/trust.json` as
 * `{ "<realpath>": true | false | null }` (keys sorted), and the nearest
 * decided folder upward wins (`trust-manager.js`). Running `oma install` in
 * the project is the user's intent to run oma there, so oma records `true`
 * for the project — unless the nearest decision is an explicit `false`,
 * which a closer `true` would silently override. Skipped when pi's agent dir
 * does not exist (pi never run); harmless on pi < 0.79, which ignores it.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseJsonForMerge } from "../../utils/merge-read.js";
import { safeWriteFile } from "../../utils/safe-write.js";

export interface PiTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** `$PI_CODING_AGENT_DIR`, default `~/.pi/agent`. */
export function piAgentHome(): string {
  return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
}

/** Record project trust for `projectRoot` in pi's `trust.json` at `trustPath`. */
export function trustPiProject(
  trustPath: string,
  projectRoot: string,
): PiTrustResult {
  const skip = (reason: string): PiTrustResult => ({
    changed: false,
    alreadyTrusted: false,
    reason,
  });
  if (!existsSync(dirname(trustPath))) {
    return skip(
      `${dirname(trustPath)} not found (pi not initialized) — skipped`,
    );
  }
  let store: Record<string, unknown> = {};
  if (existsSync(trustPath)) {
    const read = parseJsonForMerge(readFileSync(trustPath, "utf-8"));
    if (read.status !== "ok") return skip(`${trustPath} could not be parsed`);
    store = read.value;
  }
  let key = projectRoot;
  try {
    key = realpathSync(projectRoot);
  } catch {
    // Keep the given path.
  }
  for (let dir = key; ; dir = dirname(dir)) {
    const decision = store[dir];
    if (decision === true) return { changed: false, alreadyTrusted: true };
    if (decision === false) {
      return skip(`${dir} is marked untrusted in ${trustPath} — left as is`);
    }
    if (dirname(dir) === dir) break;
  }
  store[key] = true;
  const sorted = Object.fromEntries(
    Object.entries(store).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  safeWriteFile(trustPath, `${JSON.stringify(sorted, null, 2)}\n`);
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept pi project trust for a project install. */
export function ensurePiProjectTrust(projectRoot: string): PiTrustResult {
  return trustPiProject(join(piAgentHome(), "trust.json"), projectRoot);
}
