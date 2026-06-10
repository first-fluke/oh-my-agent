import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureFeatureFlags } from "./hooks-composer/feature-flags.js";
import {
  buildHookCmd,
  buildOmaHookCmd,
  deriveHookName,
  OMA_HOOK_WRAPPER_FILENAME,
} from "./hooks-composer/hook-command.js";
import {
  generateOmaHookWrapper,
  resolveOmaRecordedPath,
} from "./hooks-composer/oma-hook-wrapper.js";
import {
  copyHookScripts,
  requiredVariantScripts,
} from "./hooks-composer/script-copy.js";
import { mergeIntoSettings } from "./hooks-composer/settings-merge.js";
import type { HookVariant } from "./hooks-composer/variant-types.js";

export { ensureFeatureFlags } from "./hooks-composer/feature-flags.js";
export { buildOmaHookCmd } from "./hooks-composer/hook-command.js";
export { generateOmaHookWrapper } from "./hooks-composer/oma-hook-wrapper.js";
export {
  copyHookScripts,
  requiredVariantScripts,
} from "./hooks-composer/script-copy.js";
export {
  isOmaManagedHookGroup,
  mergeHookGroups,
  mergeIntoSettings,
} from "./hooks-composer/settings-merge.js";
export {
  generateHookShellWrapper,
  HOOK_DEDUP_PREAMBLE,
  withDedup,
} from "./hooks-composer/shell-wrapper.js";
export type {
  HookEvent,
  HookVariant,
} from "./hooks-composer/variant-types.js";

/**
 * Install hooks for any vendor using its variant config from .agents/hooks/variants/.
 * Reads the variant JSON, copies core hooks, generates settings entries.
 *
 * ### Event hook strategy (design 019 §T6)
 *
 * For each event in `variant.events`:
 *   - If ALL configs in that event reference `hud.ts` only:
 *       Keep the current `bun <hookDir>/hud.ts` command (hot-path display,
 *       excluded from oma hook per T1-c).
 *   - Otherwise (at least one non-hud handler):
 *       Emit ONE settings entry whose command is `<oma-hook.sh> --vendor <v>
 *       --event <e> [--matcher <m>]`.  oma runs the WHOLE handler chain
 *       in-process — no longer one entry per handler script.
 *       Hud-only configs within mixed events are intentionally dropped from
 *       the settings entry (display is a statusLine concern, not a handler).
 *
 * ### copyHookScripts copies ONLY the variant's runtime-required scripts
 * `copyHookScripts` materializes just what the hookDir executes or reads at
 * runtime (hud.ts for statusLine/hud-only events, filter-test-output.sh for
 * test-filter — see requiredVariantScripts). Handler .ts files run in-process
 * inside `oma hook` and are NOT copied; the pi bridge, which spawns them as
 * subprocesses, gets the full set via its own composer (pi-extension-composer).
 * We no longer call `patchVendorHookTypes` or `patchVendorDetection` because
 * vendor identity is now a `--vendor` CLI argument, not a runtime detection.
 *
 * ### ONE wrapper per vendor
 * A single `oma-hook.sh` is written to `hookDir`. It resolves the oma binary
 * (PATH → recorded absolute path → exit 0 fail-open) and `exec`s `oma hook "$@"`.
 */
export function installHooksFromVariant(
  sourceDir: string,
  targetDir: string,
  variant: HookVariant,
): void {
  // 1. Materialize ONLY the scripts this variant executes/reads from hookDir
  //    (hud.ts, filter-test-output.sh — see requiredVariantScripts). The
  //    destination is cleared first, so re-install also sweeps stale handler
  //    copies left by older full-copy installs.
  const hooksDest = join(targetDir, variant.hookDir);
  copyHookScripts(sourceDir, hooksDest, requiredVariantScripts(variant));

  // 2. Write the single oma-hook wrapper (one per vendor hookDir).
  const wrapperPath = join(hooksDest, OMA_HOOK_WRAPPER_FILENAME);
  const recordedOmaPath = resolveOmaRecordedPath();
  writeFileSync(wrapperPath, generateOmaHookWrapper(recordedOmaPath), {
    mode: 0o755,
  });

  // 3. Build hook entries from events.
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  const hookEntries: Record<string, any> = {};
  for (const [eventName, rawConfig] of Object.entries(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;

    // Determine whether ALL hooks in this event are hud-only (display, not handlers).
    const nonHudConfigs = configs.filter((c) => c.hook !== "hud.ts");
    const allHud = nonHudConfigs.length === 0;

    // biome-ignore lint/suspicious/noExplicitAny: hook entry shape varies
    let entry: any;
    const matcher = configs.find((c) => c.matcher)?.matcher;

    if (allHud) {
      // Hud-only event — keep the current bun path (T1-c: statusLine/hud stays
      // on its current mechanism; gemini uses hud via events rather than statusLine).
      const hooks = configs.map((c) => ({
        name: deriveHookName(c.hook),
        type: "command",
        command: buildHookCmd(variant, c.hook),
        timeout: c.timeout,
      }));
      entry = { hooks };
      if (matcher) entry.matcher = matcher;
    } else {
      // Handler event — route through oma hook (one entry for the whole chain).
      // Timeout = sum of all handler timeouts + 5 s margin for oma startup/IPC.
      const handlerTimeout =
        nonHudConfigs.reduce((sum, c) => sum + c.timeout, 0) + 5;
      const omaHookCmd = buildOmaHookCmd(variant, eventName, matcher);
      if (variant.flatHookEntries) {
        // Flat-entry vendors (Cursor): the event array holds the hook object
        // directly — nested {matcher, hooks: [...]} groups do not fire there.
        entry = { command: omaHookCmd, timeout: handlerTimeout };
        if (matcher) entry.matcher = matcher;
      } else {
        entry = {
          hooks: [
            {
              name: `oma-hook-${eventName}`,
              type: "command",
              command: omaHookCmd,
              timeout: handlerTimeout,
            },
          ],
        };
        if (matcher) entry.matcher = matcher;
      }
    }

    hookEntries[eventName] = [entry];
  }

  // 4. Build extra settings (statusLine, permissions, etc.).
  //    statusLine keeps the current bun/hud path (T1-c: not routed via oma hook).
  // biome-ignore lint/suspicious/noExplicitAny: extra settings are dynamic
  const extra: Record<string, any> = {};
  if (variant.statusLine) {
    const statusLineEntry = {
      type: "command",
      command: buildHookCmd(variant, variant.statusLine.hook),
    };
    if (variant.statusLineKey) {
      // Qwen Code reads `ui.statusLine`; a root-level entry is ignored.
      extra[variant.statusLineKey] = { statusLine: statusLineEntry };
    } else {
      extra.statusLine = statusLineEntry;
    }
  }
  if (variant.extra) Object.assign(extra, variant.extra);

  // 5. Merge into settings file (or write Grok-native hook file).
  if (variant.vendor === "grok") {
    // Grok discovers hooks from .grok/hooks/*.json files (directory-based).
    // Write a single well-named file with the double-nested shape Grok expects.
    const grokHookFile = join(targetDir, variant.settingsFile);
    mkdirSync(dirname(grokHookFile), { recursive: true });
    const grokPayload = { hooks: hookEntries };
    writeFileSync(grokHookFile, `${JSON.stringify(grokPayload, null, 2)}\n`);
  } else {
    mergeIntoSettings(
      join(targetDir, variant.settingsFile),
      hookEntries,
      Object.keys(extra).length > 0 ? extra : undefined,
    );
  }

  // 6. Vendor-specific feature flags (e.g., Codex config.toml).
  if (variant.featureFlags) {
    ensureFeatureFlags(
      join(targetDir, variant.featureFlags.file),
      variant.featureFlags.section,
      variant.featureFlags.flags,
    );
  }
}
