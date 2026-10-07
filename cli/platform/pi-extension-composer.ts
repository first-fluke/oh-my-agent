import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { copyHookScripts } from "./hooks-composer.js";

/**
 * Install path for the pi (Earendil pi-coding-agent) hook bridge.
 *
 * Unlike the other vendors, pi does not register settings-file hooks; it
 * auto-loads in-process TypeScript extensions and dispatches
 * `pi.on(event, handler)`. So pi is NOT handled by `installHooksFromVariant`.
 * Instead it gets this forked path, invoked from `link()` whenever `pi` is in
 * the configured vendor set.
 *
 * See `.agents/hooks/variants/pi/README.md` and the bridge source at
 * `.agents/hooks/variants/pi/index.ts`.
 */

/** Directory (relative to the install root) of the pi directory-extension. */
export const PI_EXTENSION_DIR = join(".pi", "extensions", "oma");

/**
 * Materialize the pi bridge into `<targetDir>/.pi/extensions/oma/`:
 *  1. Copy the vendor-agnostic core hook scripts (keyword-detector,
 *     skill-injector, test-filter, their deps, and `filter-test-output.sh`)
 *     so the bridge can spawn them as subprocesses.
 *  2. Copy the bridge `index.ts` as the directory-extension entry point.
 *
 * Idempotent: `copyHookScripts` clears stale non-directory entries (including
 * a previous `index.ts`) before recopying, then the bridge is re-written.
 */
export function installPiExtension(sourceDir: string, targetDir: string): void {
  const extDir = join(targetDir, PI_EXTENSION_DIR);

  // 1. Core scripts (also clears stale files in extDir first).
  copyHookScripts(sourceDir, extDir, undefined, { ownedNamespace: true });

  // 2. The bridge entry point.
  const shimSrc = join(
    sourceDir,
    ".agents",
    "hooks",
    "variants",
    "pi",
    "index.ts",
  );
  if (existsSync(shimSrc)) {
    cpSync(shimSrc, join(extDir, "index.ts"), {
      force: true,
      dereference: true,
    });
  }
}
