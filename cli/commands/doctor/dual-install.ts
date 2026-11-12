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

export type OmaOnPath = {
  path: string;
  /** Version of the package the entry runs, or null when it resolves lazily. */
  version: string | null;
  /**
   * True when the entry is a package-manager launcher that hard-codes an
   * oh-my-agent package dir which no longer exists. Running it can only fail —
   * and because PATH stops at the first match, it also hides the working
   * install behind it.
   */
  dead: boolean;
};

const PACKAGE_NAME = "oh-my-agent";

function packageVersionAt(dir: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (pkg.name === PACKAGE_NAME && typeof pkg.version === "string") {
      return pkg.version;
    }
  } catch {
    // not a package root
  }
  return null;
}

/**
 * Version of the oh-my-agent package an `oma` entry resolves into, checked
 * against every layout a global installer actually produces:
 *
 *   - inside the package — unix symlinks land on `<pkg>/bin/cli.js`
 *   - `<dir>/node_modules/oh-my-agent` — npm/pnpm/yarn write the launcher next
 *     to `node_modules`, so on Windows (`%AppData%\npm\oma.cmd`,
 *     `%LOCALAPPDATA%\pnpm\oma.cmd`) no ancestor of the entry ever *is* the
 *     package and an ancestor-only walk finds nothing
 *   - `<dir>/lib/node_modules/oh-my-agent`, `<dir>/install/global/node_modules/oh-my-agent`
 *     — bun keeps the package under `~/.bun/install/global` while the shim sits
 *     in `~/.bun/bin`
 */
function omaPackageVersion(bin: string): string | null {
  let dir: string;
  try {
    dir = dirname(realpathSync(bin));
  } catch {
    return null;
  }
  for (let depth = 0; depth < 4; depth++) {
    for (const candidate of [
      dir,
      join(dir, "node_modules", PACKAGE_NAME),
      join(dir, "lib", "node_modules", PACKAGE_NAME),
      join(dir, "install", "global", "node_modules", PACKAGE_NAME),
    ]) {
      const version = packageVersionAt(candidate);
      if (version) return version;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * npm-family installers quote the package path verbatim in the launcher they
 * write (`%~dp0\node_modules\oh-my-agent\bin\cli.js`,
 * `$basedir/node_modules/oh-my-agent/bin/cli.js`), so such a file whose package
 * is gone is a confirmed dead command — unlike a mise/volta/asdf shim, which
 * resolves lazily and may legitimately hold no package path.
 */
function isDeadLauncher(bin: string): boolean {
  if (bin.toLowerCase().endsWith(".exe")) return false;
  let text: string;
  try {
    text = readFileSync(bin, "utf8");
  } catch {
    return false;
  }
  if (!new RegExp(`node_modules[/\\\\]${PACKAGE_NAME}`).test(text))
    return false;
  return omaPackageVersion(bin) === null;
}

/**
 * Every distinct oh-my-agent install reachable as `oma` on PATH, in PATH
 * order. Lazy version-manager shims that resolve into no package are skipped.
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
      const version = omaPackageVersion(bin);
      const dead = version === null && isDeadLauncher(bin);
      if (version === null && !dead) continue;
      // One report per prefix: npm writes a `.cmd`, a `.ps1`, and a bash
      // launcher for the same missing package.
      const key = dead ? dirname(real) : real;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ path: bin, version, dead });
    }
  }
  return found;
}

/**
 * Warn about PATH entries that cannot run the install the user expects.
 * Whichever entry comes first wins for bare `oma` — including the vendor hook
 * wrappers, which resolve `oma` the same way and exit 0 when it fails, so a
 * broken entry neither runs the working install nor reports itself.
 */
export function checkOmaPathInstalls(
  installs: OmaOnPath[] = findOmaOnPath(),
): string[] {
  const warnings: string[] = [];

  const dead = installs.filter((install) => install.dead);
  if (dead.length > 0) {
    warnings.push(
      `Dead oma launcher on PATH: ${dead.map((install) => install.path).join(", ")}. Its oh-my-agent package dir is gone, so \`oma\` fails with MODULE_NOT_FOUND and the working install behind it never runs; vendor hooks fail the same way but exit 0, so they go quiet instead of erroring. Remove the launcher with the package manager that wrote it (e.g. \`npm uninstall -g oh-my-agent\`), then re-check with \`where oma\` (Windows) or \`command -v oma\`.`,
    );
  }

  const resolved = installs.flatMap((install) =>
    install.version === null ? [] : [install],
  );
  if (new Set(resolved.map((install) => install.version)).size < 2) {
    return warnings;
  }
  const list = resolved
    .map((install) => `${install.path} (${install.version})`)
    .join(", ");
  warnings.push(
    `Multiple oma versions on PATH: ${list}. The first one runs for vendor MCP entries and hooks; uninstall the stale one with the package manager that installed it.`,
  );
  return warnings;
}
