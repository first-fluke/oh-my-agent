/**
 * last30days engine resolution for `oma market`.
 *
 * oma-market delegates community-signal research to the upstream
 * mvanhorn/last30days-skill engine (Python 3.12+, zero runtime deps), installed
 * as an agent skill through the skills CLI (`platform/skill-install.ts`). oma
 * never keeps its own copy; `oma market update` installs or updates the skill.
 *
 * Precedence (first hit wins):
 *   1. `market.path`               — explicit pin
 *   2. `LAST30DAYS_HOME` env       — explicit pin
 *   3. installed skill dirs        — `bunx skills add` / Claude plugin cache copies
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { loadSkillSection } from "../../platform/agent-config/skill-sections.js";
import {
  findInstalledSkill,
  installSkills,
  probeSkillDir,
  type SkillsCliSpawn,
  skillsAddCommand,
  type UpstreamSkill,
  updateSkills,
} from "../../platform/skill-install.js";

export const LAST30DAYS_REPO = "mvanhorn/last30days-skill";
export const LAST30DAYS_ENV_HOME = "LAST30DAYS_HOME";
export const LAST30DAYS_ENV_PYTHON = "LAST30DAYS_PYTHON";
export const LAST30DAYS_ENTRY = path.join("scripts", "last30days.py");

export const LAST30DAYS_SKILL: UpstreamSkill = {
  repo: LAST30DAYS_REPO,
  name: "last30days",
  entryRelative: LAST30DAYS_ENTRY,
  pluginCache: path.join("last30days-skill", "last30days"),
};

export const LAST30DAYS_INSTALL_COMMAND = skillsAddCommand(LAST30DAYS_REPO, [
  LAST30DAYS_SKILL.name,
]);

/** Keys from the retired managed-copy policy: accepted, ignored, reported. */
export const DEPRECATED_MARKET_KEYS = [
  "managed",
  "channel",
  "check_interval_min",
] as const;

export interface MarketConfig {
  path?: string;
  python?: string;
  /** Where raw engine output is saved (`--save-dir`). Relative to the workspace. */
  save_dir: string;
  /** Deprecated keys present in the section (ignored). */
  deprecated: string[];
}

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  save_dir: path.join(".agents", "results", "market", "raw"),
  deprecated: [],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function marketConfigFrom(
  section: Record<string, unknown> | undefined,
): MarketConfig {
  const s = isPlainObject(section) ? section : {};
  return {
    path: optString(s.path),
    python: optString(s.python),
    save_dir: optString(s.save_dir) ?? DEFAULT_MARKET_CONFIG.save_dir,
    deprecated: DEPRECATED_MARKET_KEYS.filter((k) => k in s),
  };
}

export function loadMarketConfig(cwd: string): MarketConfig {
  return marketConfigFrom(loadSkillSection(cwd, "market"));
}

export function deprecationNote(config: MarketConfig): string | undefined {
  if (config.deprecated.length === 0) return undefined;
  return `market.${config.deprecated.join(", market.")} ${config.deprecated.length > 1 ? "are" : "is"} ignored: last30days is now a skills-CLI install (update with \`oma market update\`)`;
}

// ---------------------------------------------------------------------------
// Engine location
// ---------------------------------------------------------------------------

export interface EngineInstall {
  /** Directory holding SKILL.md and scripts/ (the upstream `SKILL_DIR`). */
  root: string;
  /** Absolute path of scripts/last30days.py. */
  script: string;
  /** Absolute path of the upstream SKILL.md the agent must follow. */
  skillMd: string;
  version?: string;
  source: string;
}

function expandHome(p: string, home: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(home, p.slice(1)) : p;
}

function probe(dir: string, source: string): EngineInstall | undefined {
  const hit = probeSkillDir(LAST30DAYS_SKILL, dir, source);
  return hit
    ? {
        root: hit.root,
        script: hit.entry,
        skillMd: path.join(hit.root, "SKILL.md"),
        version: hit.version,
        source: hit.source,
      }
    : undefined;
}

export interface FindEngineOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
}

export function findEngine(opts: FindEngineOptions): {
  install?: EngineInstall;
  probed: string[];
} {
  const env = opts.env ?? process.env;
  const home = opts.home ?? os.homedir();
  const probed: string[] = [];
  const tryDir = (raw: string | undefined, source: string) => {
    if (!raw) return undefined;
    const dir = path.resolve(opts.cwd, expandHome(raw, home));
    probed.push(dir);
    return probe(dir, source);
  };

  const fromConfig = tryDir(opts.configPath, "config:market.path");
  if (fromConfig) return { install: fromConfig, probed };
  const fromEnv = tryDir(
    env[LAST30DAYS_ENV_HOME],
    `env:${LAST30DAYS_ENV_HOME}`,
  );
  if (fromEnv) return { install: fromEnv, probed };

  const installed = findInstalledSkill(LAST30DAYS_SKILL, {
    cwd: opts.cwd,
    home,
  });
  probed.push(...installed.probed);
  const hit =
    installed.install &&
    probe(installed.install.root, installed.install.source);
  return hit ? { install: hit, probed } : { probed };
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

export interface PythonResolution {
  path?: string;
  version?: string;
  source: string;
  /** Set when nothing usable was found. */
  hint?: string;
}

export const PYTHON_MIN = [3, 12] as const;

function pythonVersion(candidate: string): string | undefined {
  const r = spawnSync(
    candidate,
    ["-c", "import sys; print('.'.join(map(str, sys.version_info[:3])))"],
    { encoding: "utf-8", timeout: 5_000 },
  );
  if (r.status !== 0) return undefined;
  const v = r.stdout.trim();
  const [maj = Number.NaN, min = 0] = v
    .split(".")
    .map((n) => Number.parseInt(n, 10));
  if (
    Number.isNaN(maj) ||
    maj < PYTHON_MIN[0] ||
    (maj === PYTHON_MIN[0] && min < PYTHON_MIN[1])
  )
    return undefined;
  return v;
}

export function resolvePython(opts: {
  configPython?: string;
  env?: NodeJS.ProcessEnv;
  /** Test seam. */
  probe?: (candidate: string) => string | undefined;
  uvFind?: () => string | undefined;
}): PythonResolution {
  const env = opts.env ?? process.env;
  const probe = opts.probe ?? pythonVersion;
  const tryOne = (c: string | undefined, source: string) => {
    if (!c) return undefined;
    const v = probe(c);
    return v ? { path: c, version: v, source } : undefined;
  };

  const pinned =
    tryOne(env[LAST30DAYS_ENV_PYTHON], `env:${LAST30DAYS_ENV_PYTHON}`) ??
    tryOne(opts.configPython, "config:market.python");
  if (pinned) return pinned;

  for (const c of [
    "python3.14",
    "python3.13",
    "python3.12",
    "python3",
    "python",
  ]) {
    const hit = tryOne(c, "PATH");
    if (hit) return hit;
  }

  const uvFind =
    opts.uvFind ??
    (() => {
      const r = spawnSync("uv", ["python", "find", ">=3.12"], {
        encoding: "utf-8",
        timeout: 10_000,
      });
      return r.status === 0 ? r.stdout.trim() || undefined : undefined;
    });
  const viaUv = tryOne(uvFind(), "uv");
  if (viaUv) return viaUv;

  return {
    source: "none",
    hint: "last30days needs Python 3.12+. Install it (macOS: `brew install python@3.12`; Linux: `sudo apt install python3.12`; or `uv python install 3.12`) or set LAST30DAYS_PYTHON / market.python.",
  };
}

// ---------------------------------------------------------------------------
// resolveMarketEngine
// ---------------------------------------------------------------------------

export interface MarketResolution {
  ok: boolean;
  engine?: EngineInstall;
  python: PythonResolution;
  saveDir: string;
  reason: string;
  probed: string[];
  /** Deprecation notes for ignored config keys. */
  warnings: string[];
}

export interface ResolveMarketOptions {
  cwd: string;
  config?: MarketConfig;
  env?: NodeJS.ProcessEnv;
  home?: string;
  /** Skip the interpreter probe (resolve engine only). */
  skipPython?: boolean;
  pythonProbe?: (candidate: string) => string | undefined;
  uvFind?: () => string | undefined;
}

export async function resolveMarketEngine(
  opts: ResolveMarketOptions,
): Promise<MarketResolution> {
  const config = opts.config ?? loadMarketConfig(opts.cwd);
  const note = deprecationNote(config);
  const warnings = note ? [note] : [];
  const { install, probed } = findEngine({
    cwd: opts.cwd,
    configPath: config.path,
    env: opts.env,
    home: opts.home,
  });
  const saveDir = path.resolve(opts.cwd, config.save_dir);

  const python = opts.skipPython
    ? { source: "skipped" }
    : resolvePython({
        configPython: config.python,
        env: opts.env,
        probe: opts.pythonProbe,
        uvFind: opts.uvFind,
      });

  if (!install) {
    return {
      ok: false,
      python,
      saveDir,
      reason: `last30days is not installed — run \`oma market update\` (runs \`${LAST30DAYS_INSTALL_COMMAND}\`), or set market.path / ${LAST30DAYS_ENV_HOME}`,
      probed,
      warnings,
    };
  }
  const engineLine = `last30days${install.version ? ` ${install.version}` : ""} via ${install.source}`;
  if (!opts.skipPython && !python.path) {
    return {
      ok: false,
      engine: install,
      python,
      saveDir,
      reason: `${engineLine}; ${python.hint}`,
      probed,
      warnings,
    };
  }
  return {
    ok: true,
    engine: install,
    python,
    saveDir,
    reason: engineLine,
    probed,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// updateMarketEngine
// ---------------------------------------------------------------------------

export type MarketUpdateAction =
  | "installed"
  | "updated"
  | "skipped-pinned"
  | "skipped-plugin"
  | "failed";

export interface MarketUpdateResult {
  action: MarketUpdateAction;
  detail: string;
  resolution: MarketResolution;
}

/**
 * Install last30days when it is missing, otherwise `skills update` it. Pinned
 * copies (market.path / LAST30DAYS_HOME) and Claude plugin installs are left to
 * their owners.
 */
export async function updateMarketEngine(
  opts: Omit<ResolveMarketOptions, "skipPython"> & { spawn?: SkillsCliSpawn },
): Promise<MarketUpdateResult> {
  const before = await resolveMarketEngine({ ...opts, skipPython: true });
  const source = before.engine?.source ?? "";
  let action: MarketUpdateAction;
  let detail = "";
  if (source.startsWith("config:") || source.startsWith("env:")) {
    action = "skipped-pinned";
    detail = `pinned via ${source}; update it yourself`;
  } else if (source.startsWith("home:claude-plugin-cache")) {
    action = "skipped-plugin";
    detail = "installed as a Claude Code plugin; update it with /plugin";
  } else {
    const r = before.engine
      ? updateSkills([LAST30DAYS_SKILL.name], opts.spawn)
      : installSkills(LAST30DAYS_REPO, [LAST30DAYS_SKILL.name], opts.spawn);
    action = r.ok ? (before.engine ? "updated" : "installed") : "failed";
    detail = r.detail;
  }
  const resolution = await resolveMarketEngine({ ...opts, skipPython: true });
  return { action, detail, resolution };
}
