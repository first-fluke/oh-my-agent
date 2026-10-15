import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { CliVendor } from "../../types/index.js";
import { ensureCueBinary } from "../../utils/cue.js";
import type { DevToolsBrowser } from "../../vendors/serena.js";
import { saveDevToolsBrowsers } from "./browser-preferences.js";
import { patchUserConfig } from "./preferences.js";
import {
  type ProviderSelection,
  saveProviders,
} from "./provider-preferences.js";

/** Best-effort `cue` binary check/install with the install's log lines. */
export function ensureCueBinaryWithLog(): void {
  const cueBinary = ensureCueBinary({
    onInstallStart: () =>
      p.log.info("Checking/installing CUE binary for typed configuration…"),
  });
  if (cueBinary.status === "installed") {
    p.log.success(pc.green("Installed CUE binary"));
  } else if (cueBinary.status === "install-failed") {
    p.log.warn(
      `CUE binary not found — install via 'brew install cue' (macOS) or see https://cuelang.org/docs/install/`,
    );
  }
}

export interface InstallPreferenceChoices {
  language: string;
  modelPreset: string;
  vendors: CliVendor[];
  devToolsBrowsers: DevToolsBrowser[];
  providers: ProviderSelection;
}

/**
 * Persist the install choices before link() projects them.
 *
 * A project whose shared config is `oma-config.cue` can only tell where a
 * choice takes effect (and so save it at all) once CUE evaluates, which needs
 * the `cue` binary. It is therefore ensured first for such a project; a
 * YAML-only project is left as before. Returns whether the binary was checked,
 * so the caller does not check it a second time.
 */
export function persistInstallPreferences(
  installRoot: string,
  choices: InstallPreferenceChoices,
): { cueChecked: boolean } {
  const cueChecked = existsSync(join(installRoot, ".agents", "oma-config.cue"));
  if (cueChecked) ensureCueBinaryWithLog();

  // Persist the selection before linking vendor MCP configurations.
  saveDevToolsBrowsers(installRoot, choices.devToolsBrowsers);
  // Language, model_preset and vendors; regex-level replacement preserves
  // user-edited fields (timezone, etc.).
  patchUserConfig(
    installRoot,
    choices.language,
    choices.modelPreset,
    choices.vendors,
  );
  saveProviders(installRoot, choices.providers);
  return { cueChecked };
}
