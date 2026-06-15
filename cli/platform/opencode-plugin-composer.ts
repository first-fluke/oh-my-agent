import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { copyHookScripts } from "./hooks-composer.js";

/**
 * Install path for the opencode (Sst opencode) plugin bridge.
 *
 * Unlike the other vendors, opencode does not register settings-file hooks; it
 * auto-loads in-process TypeScript plugins from `.opencode/plugins/` subdirs. So
 * opencode is NOT handled by `installHooksFromVariant`. Instead it gets this
 * forked path, invoked from `link()` whenever `opencode` is in the configured
 * vendor set.
 *
 * See `.agents/hooks/variants/opencode/oma.ts` for the bridge source.
 */

/** Directory (relative to the install root) of the opencode plugin. */
export const OPENCODE_PLUGIN_DIR = join(".opencode", "plugins", "oma");

/**
 * Materialize the opencode bridge into `<targetDir>/.opencode/plugins/oma/`:
 *  1. Copy the vendor-agnostic core hook scripts (keyword-detector,
 *     skill-injector, test-filter, their deps, and `filter-test-output.sh`)
 *     so the bridge can spawn them as subprocesses.
 *  2. Copy the bridge `oma.ts` as the plugin entry point.
 *
 * Idempotent: `copyHookScripts` clears stale non-directory entries (including
 * a previous `oma.ts`) before recopying, then the bridge is re-written.
 */
export function installOpencodePlugin(
  sourceDir: string,
  targetDir: string,
): void {
  const pluginDir = join(targetDir, OPENCODE_PLUGIN_DIR);

  // 1. Core scripts (also clears stale files in pluginDir first).
  copyHookScripts(sourceDir, pluginDir);

  // 2. The bridge entry point.
  const shimSrc = join(
    sourceDir,
    ".agents",
    "hooks",
    "variants",
    "opencode",
    "oma.ts",
  );
  if (existsSync(shimSrc)) {
    cpSync(shimSrc, join(pluginDir, "oma.ts"), {
      force: true,
      dereference: true,
    });
  }
}
