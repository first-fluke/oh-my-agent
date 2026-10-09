import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  getLocalVersion,
  readVersionInstallMode,
  readVersionSchemaVersion,
} from "../../platform/manifest.js";
import { omaHome } from "../../utils/oma-home.js";

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
  const global = await probe(omaHome(process.env, home));
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
      "No oma install detected. Run `oma install` (project) or `oma install --global` (OMA home).",
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

export type OmaOnPath = { path: string; version: string };

/** Version of the oh-my-agent package an `oma` entry resolves into. */
function omaPackageVersion(bin: string): string | null {
  let dir: string;
  try {
    dir = dirname(realpathSync(bin));
  } catch {
    return null;
  }
  for (let i = 0; i < 4; i++) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      if (pkg.name === "oh-my-agent" && typeof pkg.version === "string") {
        return pkg.version;
      }
    } catch {
      // keep walking up
    }
    dir = dirname(dir);
  }
  return null;
}

/**
 * Every distinct oh-my-agent install reachable as `oma` on PATH, in PATH
 * order. Version-manager shims that do not resolve into a package are skipped.
 */
export function findOmaOnPath(
  pathEnv: string = process.env.PATH ?? "",
  platform: NodeJS.Platform = process.platform,
): OmaOnPath[] {
  const names = platform === "win32" ? ["oma.cmd", "oma.exe", "oma"] : ["oma"];
  const seen = new Set<string>();
  const found: OmaOnPath[] = [];
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const bin = join(dir, name);
      if (!existsSync(bin)) continue;
      let real: string;
      try {
        real = realpathSync(bin);
      } catch {
        continue;
      }
      if (seen.has(real)) continue;
      seen.add(real);
      const version = omaPackageVersion(bin);
      if (version) found.push({ path: bin, version });
    }
  }
  return found;
}

/**
 * Warn when PATH holds oh-my-agent installs of different versions. Whichever
 * comes first wins for vendor MCP entries and hooks that run bare `oma`, so a
 * forgotten global install silently serves stale commands.
 */
export function checkOmaPathInstalls(
  installs: OmaOnPath[] = findOmaOnPath(),
): string[] {
  if (new Set(installs.map((install) => install.version)).size < 2) return [];
  const list = installs
    .map((install) => `${install.path} (${install.version})`)
    .join(", ");
  return [
    `Multiple oma versions on PATH: ${list}. The first one runs for vendor MCP entries and hooks; uninstall the stale one with the package manager that installed it.`,
  ];
}
