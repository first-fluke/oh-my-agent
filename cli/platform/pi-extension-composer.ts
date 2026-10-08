import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { standaloneHookSources } from "./hooks-composer/standalone-wrapper.js";
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
 *  1. Install generated Bun handler entries that dispatch through the CLI,
 *     with supporting files such as `filter-test-output.sh`.
 *  2. Copy the bridge `index.ts` as the directory-extension entry point.
 *
 * Idempotent: tracked handler entries are reconciled by their fingerprints;
 * modified entries are preserved. The managed bridge is re-written.
 */
export function installPiExtension(sourceDir: string, targetDir: string): void {
  const extDir = join(targetDir, PI_EXTENSION_DIR);

  // The bridge keeps its Bun/script ABI; generated handlers delegate to the
  // CLI so semantic delivery uses its profile-scoped queue and provider config.
  copyHookScripts(sourceDir, extDir, undefined, {
    ownedNamespace: true,
    generatedSources: standaloneHookSources("pi"),
  });

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
