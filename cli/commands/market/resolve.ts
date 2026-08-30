/**
 * last30days engine resolution for `oma market`.
 *
 * oma-market delegates community-signal research to the upstream
 * mvanhorn/last30days-skill engine (Python 3.12+, zero runtime deps). oma keeps
 * an always-latest managed copy (see `platform/managed-skill.ts`) so users never
 * run a stale engine, and resolves a compatible Python interpreter once.
 *
 * Precedence (first hit wins):
 *   1. `market.path`               — explicit pin
 *   2. `LAST30DAYS_HOME` env       — explicit pin
 *   3. managed install             — oma-owned copy, auto-refreshed to the latest release
 *   4. well-known skill dirs       — `npx skills add` / Claude plugin cache copies
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSkillSection } from "../../platform/agent-config/skill-sections.js";
import {
  defaultManagedCacheRoot,
  ensureLatestManagedSkill,
  type ManagedChannel,
  type ManagedInstall,
  type ManagedSkillSpec,
  readSkillMdVersion,
} from "../../platform/managed-skill.js";

export const LAST30DAYS_REPO = "mvanhorn/last30days-skill";
export const LAST30DAYS_ENV_HOME = "LAST30DAYS_HOME";
export const LAST30DAYS_ENV_PYTHON = "LAST30DAYS_PYTHON";
export const LAST30DAYS_ENTRY = path.join("scripts", "last30days.py");

export const LAST30DAYS_SPEC: ManagedSkillSpec = {
  id: "market",
  repo: LAST30DAYS_REPO,
  packageSubdir: path.join("skills", "last30days"),
  entryRelative: LAST30DAYS_ENTRY,
  readVersion: readSkillMdVersion,
};

export function defaultCacheRoot(home?: string): string {
  return path.join(
    defaultManagedCacheRoot(LAST30DAYS_SPEC, home),
    "last30days",
  );
}

export interface MarketConfig {
  managed: boolean;
  channel: ManagedChannel;
  check_interval_min: number;
  path?: string;
  python?: string;
  /** Where raw engine output is saved (`--save-dir`). Relative to the workspace. */
  save_dir: string;
}

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  managed: true,
  channel: "stable",
  check_interval_min: 60,
  save_dir: path.join(".agents", "results", "market", "raw"),
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
  const minutes = s.check_interval_min;
  return {
    managed: s.managed !== false,
    channel: s.channel === "main" ? "main" : "stable",
    check_interval_min:
      typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0
        ? minutes
        : DEFAULT_MARKET_CONFIG.check_interval_min,
    path: optString(s.path),
    python: optString(s.python),
    save_dir: optString(s.save_dir) ?? DEFAULT_MARKET_CONFIG.save_dir,
  };
}

export function loadMarketConfig(cwd: string): MarketConfig {
  return marketConfigFrom(loadSkillSection(cwd, "market"));
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
  status?: ManagedInstall["status"];
  note?: string;
}

function expandHome(p: string, home: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(home, p.slice(1)) : p;
}

function probe(dir: string, source: string): EngineInstall | undefined {
  const script = path.join(dir, LAST30DAYS_ENTRY);
  try {
    if (!fs.statSync(script).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return {
    root: dir,
    script,
    skillMd: path.join(dir, "SKILL.md"),
    version: readSkillMdVersion(dir),
    source,
  };
}

function versionSortDesc(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Well-known user-installed copies, project-local first. */
export function engineCandidateDirs(
  cwd: string,
  home = os.homedir(),
): Array<{ dir: string; source: string }> {
  const vendors = ["agents", "claude", "codex", "cursor", "qwen", "kiro"];
  const out: Array<{ dir: string; source: string }> = [];
  for (const v of vendors) {
    out.push({
      dir: path.join(cwd, `.${v}`, "skills", "last30days"),
      source: `project:.${v}/skills`,
    });
  }
  for (const v of vendors) {
    out.push({
      dir: path.join(home, `.${v}`, "skills", "last30days"),
      source: `home:~/.${v}/skills`,
    });
  }
  // Claude Code marketplace plugin cache: <ver>/skills/last30days (nested) or <ver> (flat)
  const cache = path.join(
    home,
    ".claude",
    "plugins",
    "cache",
    "last30days-skill",
    "last30days",
  );
  let versions: string[] = [];
  try {
    versions = fs
      .readdirSync(cache, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(versionSortDesc);
  } catch {
    /* no plugin cache */
  }
  for (const v of versions) {
    out.push({
      dir: path.join(cache, v, "skills", "last30days"),
      source: `home:claude-plugin-cache:${v}`,
    });
    out.push({
      dir: path.join(cache, v),
      source: `home:claude-plugin-cache:${v}`,
    });
  }
  return out;
}

export interface FindEngineOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
  /** Managed-install step; `null` disables it. */
  managed?: (() => Promise<ManagedInstall | undefined>) | null;
}

export async function findEngine(opts: FindEngineOptions): Promise<{
  install?: EngineInstall;
  probed: string[];
}> {
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

  if (opts.managed) {
    probed.push("managed:~/.cache/oma-market/last30days");
    const m = await opts.managed();
    if (m) {
      return {
        install: {
          root: m.root,
          script: m.entry,
          skillMd: path.join(m.root, "SKILL.md"),
          version: m.version,
          source: `managed:${m.ref}`,
          status: m.status,
          note: m.note,
        },
        probed,
      };
    }
  }

  for (const { dir, source } of engineCandidateDirs(opts.cwd, home)) {
    probed.push(dir);
    const hit = probe(dir, source);
    if (hit) return { install: hit, probed };
  }
  return { probed };
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
}

export interface ResolveMarketOptions {
  cwd: string;
  config?: MarketConfig;
  env?: NodeJS.ProcessEnv;
  home?: string;
  refresh?: boolean;
  offline?: boolean;
  managed?: FindEngineOptions["managed"];
  cacheRoot?: string;
  /** Skip the interpreter probe (resolve engine only). */
  skipPython?: boolean;
  pythonProbe?: (candidate: string) => string | undefined;
  uvFind?: () => string | undefined;
}

export async function resolveMarketEngine(
  opts: ResolveMarketOptions,
): Promise<MarketResolution> {
  const config = opts.config ?? loadMarketConfig(opts.cwd);
  const managed =
    opts.managed !== undefined
      ? opts.managed
      : config.managed
        ? () =>
            ensureLatestManagedSkill(LAST30DAYS_SPEC, {
              channel: config.channel,
              checkIntervalMin: config.check_interval_min,
              force: opts.refresh,
              offline: opts.offline,
              cacheRoot: opts.cacheRoot ?? defaultCacheRoot(opts.home),
            })
        : null;

  const { install, probed } = await findEngine({
    cwd: opts.cwd,
    configPath: config.path,
    env: opts.env,
    home: opts.home,
    managed,
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
      reason:
        "last30days engine unavailable: managed download failed or is disabled and no local install was found — run `oma market update` once online, or set market.path / LAST30DAYS_HOME",
      probed,
    };
  }
  const suffix = install.note ? ` — ${install.note}` : "";
  const engineLine = `last30days${install.version ? ` ${install.version}` : ""} via ${install.source}${install.status ? ` (${install.status})` : ""}${suffix}`;
  if (!opts.skipPython && !python.path) {
    return {
      ok: false,
      engine: install,
      python,
      saveDir,
      reason: `${engineLine}; ${python.hint}`,
      probed,
    };
  }
  return {
    ok: true,
    engine: install,
    python,
    saveDir,
    reason: engineLine,
    probed,
  };
}
