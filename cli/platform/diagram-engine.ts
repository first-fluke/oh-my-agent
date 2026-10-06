/**
 * Diagram engine resolution for the `diagram` override section in
 * `.agents/oma-config.yaml`.
 *
 * Workflows that need an architecture / sequence / data-flow diagram
 * (`/architecture`, `/explain` sidecar) ask this module which engine to use:
 *
 *   - `archify`  — tt-a1i/archify agent skill installed on this machine
 *                  (typed JSON IR → validated standalone HTML)
 *   - `mermaid`  — the built-in fallback: Mermaid fenced blocks in Markdown
 *
 * archify is not an npm dependency. It is installed as an agent skill
 * (`npx skills add tt-a1i/archify -g`), so it can live in any of several
 * vendor skill directories. Resolution is filesystem-only and deterministic so
 * every vendor runtime (claude / codex / cursor / …) gets the same answer.
 *
 * Precedence (first hit wins):
 *   1. `diagram.archify.path`      — explicit pin
 *   2. `ARCHIFY_HOME` env          — explicit pin
 *   3. managed install             — oma-owned copy, auto-refreshed to the
 *                                    latest release (see managed.ts)
 *   4. well-known skill dirs       — a copy the user installed with `npx skills add`
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSkillSection } from "../../platform/agent-config/skill-sections.js";
import {
  type ArchifyChannel,
  ensureLatestArchify,
  type ManagedInstall,
} from "./managed.js";

export type DiagramEngine = "archify" | "mermaid";
export type DiagramEngineRequest = DiagramEngine | "auto";
export type ArchifyQuality = "showcase" | "standard";

export interface DiagramConfig {
  engine: DiagramEngineRequest;
  archify: {
    path?: string;
    quality: ArchifyQuality;
    open: boolean;
    /** Keep an oma-owned copy that tracks the latest release (default true). */
    managed: boolean;
    channel: ArchifyChannel;
    /** Minutes between remote version checks; 0 = every call. */
    check_interval_min: number;
  };
  explain_sidecar: boolean;
}

export const DEFAULT_DIAGRAM_CONFIG: DiagramConfig = {
  engine: "auto",
  archify: {
    quality: "showcase",
    open: false,
    managed: true,
    channel: "stable",
    check_interval_min: 60,
  },
  explain_sidecar: false,
};

export const ARCHIFY_BIN_RELATIVE = path.join("bin", "archify.mjs");
export const ARCHIFY_ENV_HOME = "ARCHIFY_HOME";
/** Set on every archify invocation: keeps the skill's update ping offline. */
export const ARCHIFY_ENV_NO_UPDATE = "ARCHIFY_UPDATE_CHECK_DISABLED";

export interface ArchifyInstall {
  /** Directory that contains `bin/archify.mjs` (and `SKILL.md`, `schemas/`). */
  root: string;
  bin: string;
  version?: string;
  /** Where the hit came from: `config` / `env` / `managed` / the well-known dir label. */
  source: string;
  /** Managed installs only: `fresh` (just downloaded), `current`, or `stale` (network failed). */
  status?: ManagedInstall["status"];
  note?: string;
}

export interface DiagramResolution {
  requested: DiagramEngineRequest;
  engine: DiagramEngine;
  quality: ArchifyQuality;
  open: boolean;
  explainSidecar: boolean;
  archify?: ArchifyInstall;
  /** Human-readable reason for the chosen engine. */
  reason: string;
  /** Every location that was probed, in order. */
  probed: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asEngineRequest(value: unknown): DiagramEngineRequest {
  return value === "archify" || value === "mermaid" || value === "auto"
    ? value
    : DEFAULT_DIAGRAM_CONFIG.engine;
}

function asQuality(value: unknown): ArchifyQuality {
  return value === "standard" ? "standard" : "showcase";
}

function asChannel(value: unknown): ArchifyChannel {
  return value === "main" ? "main" : "stable";
}

function asMinutes(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

/** Merge the sparse `diagram:` section onto the shipped defaults. */
export function loadDiagramConfig(cwd: string): DiagramConfig {
  const section = loadSkillSection(cwd, "diagram");
  return diagramConfigFrom(section);
}

export function diagramConfigFrom(
  section: Record<string, unknown> | undefined,
): DiagramConfig {
  const archify = isPlainObject(section?.archify) ? section.archify : {};
  const rawPath = archify.path;
  return {
    engine: asEngineRequest(section?.engine),
    archify: {
      path: typeof rawPath === "string" && rawPath.trim() ? rawPath : undefined,
      quality: asQuality(archify.quality),
      open: archify.open === true,
      managed: archify.managed !== false,
      channel: asChannel(archify.channel),
      check_interval_min: asMinutes(
        archify.check_interval_min,
        DEFAULT_DIAGRAM_CONFIG.archify.check_interval_min,
      ),
    },
    explain_sidecar: section?.explain_sidecar === true,
  };
}

function expandHome(p: string, home: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(home, p.slice(1)) : p;
}

/**
 * Well-known skill directories, project-local first (the `skills` CLI writes
 * `.agents/skills/<name>` as its canonical location and symlinks vendor dirs
 * onto it), then the per-user equivalents.
 */
export function archifyCandidateDirs(
  cwd: string,
  home = os.homedir(),
): Array<{ dir: string; source: string }> {
  const rel = ["agents", "claude", "codex", "cursor", "qwen", "kiro"];
  const out: Array<{ dir: string; source: string }> = [];
  for (const vendor of rel) {
    out.push({
      dir: path.join(cwd, `.${vendor}`, "skills", "archify"),
      source: `project:.${vendor}/skills`,
    });
  }
  for (const vendor of rel) {
    out.push({
      dir: path.join(home, `.${vendor}`, "skills", "archify"),
      source: `home:~/.${vendor}/skills`,
    });
  }
  out.push({
    dir: path.join(home, ".raven", "workspace", "skills", "archify"),
    source: "home:~/.raven/workspace/skills",
  });
  return out;
}

function readVersion(root: string): string | undefined {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf-8"),
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

function probe(dir: string, source: string): ArchifyInstall | undefined {
  const bin = path.join(dir, ARCHIFY_BIN_RELATIVE);
  try {
    if (!fs.statSync(bin).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return { root: dir, bin, version: readVersion(dir), source };
}

export interface FindArchifyOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
  /** Managed-install step; `null` disables it (tests / `managed: false`). */
  managed?: (() => Promise<ManagedInstall | undefined>) | null;
}

/** Explicit pins only: config path, then ARCHIFY_HOME. */
export function findPinnedArchify(opts: FindArchifyOptions): {
  install?: ArchifyInstall;
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
  const fromConfig = tryDir(opts.configPath, "config:diagram.archify.path");
  if (fromConfig) return { install: fromConfig, probed };
  const fromEnv = tryDir(env[ARCHIFY_ENV_HOME], `env:${ARCHIFY_ENV_HOME}`);
  if (fromEnv) return { install: fromEnv, probed };
  return { probed };
}

/** User-installed skill copies in the well-known directories. */
export function findSkillDirArchify(opts: FindArchifyOptions): {
  install?: ArchifyInstall;
  probed: string[];
} {
  const home = opts.home ?? os.homedir();
  const probed: string[] = [];
  for (const { dir, source } of archifyCandidateDirs(opts.cwd, home)) {
    probed.push(dir);
    const hit = probe(dir, source);
    if (hit) return { install: hit, probed };
  }
  return { probed };
}

/**
 * Full search: pins → managed latest → skill dirs.
 */
export async function findArchify(opts: FindArchifyOptions): Promise<{
  install?: ArchifyInstall;
  probed: string[];
}> {
  const pinned = findPinnedArchify(opts);
  if (pinned.install) return pinned;
  const probed = [...pinned.probed];

  if (opts.managed) {
    probed.push("managed:~/.cache/oma-diagram/archify");
    const m = await opts.managed();
    if (m) {
      return {
        install: {
          root: m.root,
          bin: m.bin,
          version: m.version,
          source: `managed:${m.ref}`,
          status: m.status,
          note: m.note,
        },
        probed,
      };
    }
  }

  const skill = findSkillDirArchify(opts);
  return { install: skill.install, probed: [...probed, ...skill.probed] };
}

export interface ResolveDiagramOptions
  extends Omit<FindArchifyOptions, "configPath" | "managed"> {
  /** Override the config-file engine (CLI flag / prompt phrasing). */
  engine?: DiagramEngineRequest;
  config?: DiagramConfig;
  /** Ignore the check throttle and re-check the remote version now. */
  refresh?: boolean;
  /** Never touch the network; use cached / local copies only. */
  offline?: boolean;
  /** Test seam for the managed step (overrides config `managed`). */
  managed?: FindArchifyOptions["managed"];
  cacheRoot?: string;
}

/**
 * Decide the engine. `auto` prefers archify when installed; an explicit
 * `archify` request with no install is an error state (`engine` still falls
 * back to mermaid, but `reason` says why and callers should treat it as
 * exit 1) so a user who pinned archify never silently gets Mermaid.
 */
export async function resolveDiagramEngine(
  opts: ResolveDiagramOptions,
): Promise<DiagramResolution & { ok: boolean }> {
  const config = opts.config ?? loadDiagramConfig(opts.cwd);
  const requested = opts.engine ?? config.engine;
  const base = {
    requested,
    quality: config.archify.quality,
    open: config.archify.open,
    explainSidecar: config.explain_sidecar,
  };

  if (requested === "mermaid") {
    return {
      ...base,
      engine: "mermaid",
      reason: "diagram.engine is pinned to mermaid",
      probed: [],
      ok: true,
    };
  }

  const managed =
    opts.managed !== undefined
      ? opts.managed
      : config.archify.managed
        ? () =>
            ensureLatestArchify({
              channel: config.archify.channel,
              checkIntervalMin: config.archify.check_interval_min,
              force: opts.refresh,
              offline: opts.offline,
              cacheRoot: opts.cacheRoot,
            })
        : null;

  const { install, probed } = await findArchify({
    cwd: opts.cwd,
    configPath: config.archify.path,
    env: opts.env,
    home: opts.home,
    managed,
  });

  if (install) {
    const suffix = install.note ? ` — ${install.note}` : "";
    return {
      ...base,
      engine: "archify",
      archify: install,
      reason: `archify${install.version ? ` ${install.version}` : ""} via ${install.source}${install.status ? ` (${install.status})` : ""}${suffix}`,
      probed,
      ok: true,
    };
  }

  if (requested === "archify") {
    return {
      ...base,
      engine: "mermaid",
      reason:
        "diagram.engine is pinned to archify but no install could be resolved — run `oma diagram update` (network) or set diagram.archify.path / ARCHIFY_HOME",
      probed,
      ok: false,
    };
  }

  return {
    ...base,
    engine: "mermaid",
    reason:
      "archify unavailable: managed download failed or is disabled and no local skill install was found — run `oma diagram update` once online",
    probed,
    ok: true,
  };
}
