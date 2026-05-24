import { homedir } from "node:os";
import {
  getLocalVersion,
  readVersionInstallMode,
  readVersionSchemaVersion,
} from "../../platform/manifest.js";

export type InstallProbe = {
  installed: boolean;
  version: string | null;
  mode: "project" | "global" | null;
  /**
   * Schema version of `_version.json`:
   *   0 — file missing (no install)
   *   1 — legacy install (only `{ version }`); `mode` will be null
   *   2 — current install (`{ version, mode, installedAt, schemaVersion: 2 }`)
   */
  schemaVersion: number;
};

export type DualInstallReport = {
  project: InstallProbe;
  global: InstallProbe;
  warnings: string[];
};

async function probe(root: string): Promise<InstallProbe> {
  const version = await getLocalVersion(root);
  const mode = readVersionInstallMode(root);
  const schemaVersion = readVersionSchemaVersion(root);
  return {
    installed: version !== null,
    version,
    mode,
    schemaVersion,
  };
}

/**
 * Checks for project-level and global oma installations and reports
 * version/mode mismatches between them. Reads `<root>/.agents/skills/_version.json`
 * (schemaVersion=2 carries mode + installedAt; schemaVersion=1 legacy installs
 * carry only `version` — those get backfilled on next install/update).
 */
export async function checkDualInstall(
  cwd: string,
  home: string = homedir(),
): Promise<DualInstallReport> {
  const project = await probe(cwd);
  const global = await probe(home);
  const warnings: string[] = [];

  if (project.installed && global.installed) {
    if (project.version !== global.version) {
      warnings.push(
        `Version mismatch: project=${project.version ?? "unknown"} vs global=${global.version ?? "unknown"}. Run \`oma update --global\` or \`oma update\` to align.`,
      );
    }
    if (project.mode !== null && project.mode !== "project") {
      warnings.push(
        `Project _version.json has mode=${project.mode}; expected "project".`,
      );
    }
    if (global.mode !== null && global.mode !== "global") {
      warnings.push(
        `Global _version.json has mode=${global.mode}; expected "global".`,
      );
    }
  } else if (!project.installed && !global.installed) {
    warnings.push(
      "No oma install detected. Run `oma install` (project) or `oma install --global` (HOME).",
    );
  }

  // Legacy install hint — `mode` is missing because schemaVersion=1
  for (const [label, p] of [
    ["Project", project],
    ["Global", global],
  ] as const) {
    if (p.installed && p.mode === null) {
      warnings.push(
        `${label} install pre-dates the install-mode marker (schemaVersion=1). Run \`oma update${label === "Global" ? " --global" : ""}\` to backfill.`,
      );
    }
  }

  return { project, global, warnings };
}
