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
 * archify is not an npm dependency. It is installed as an agent skill through
 * the skills CLI (`bunx skills add tt-a1i/archify --skill archify -g -y`, run by
 * `oma diagram update`), so it can live in any of several vendor skill
 * directories. Resolution is filesystem-only and deterministic so every vendor
 * runtime (claude / codex / cursor / …) gets the same answer.
 *
 * Precedence (first hit wins):
 *   1. `diagram.archify.path`      — explicit pin
 *   2. `ARCHIFY_HOME` env          — explicit pin
 *   3. installed skill dirs        — see `platform/skill-install.ts`
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSkillSection } from "./agent-config/skill-sections.js";
import {
  installSkills,
  type SkillsCliSpawn,
  skillCandidateDirs,
  skillsAddCommand,
  type UpstreamSkill,
  updateSkills,
} from "./skill-install.js";

export type DiagramEngine = "archify" | "mermaid";
export type DiagramEngineRequest = DiagramEngine | "auto";
export type ArchifyQuality = "showcase" | "standard";

export interface DiagramConfig {
  engine: DiagramEngineRequest;
  archify: {
    path?: string;
    quality: ArchifyQuality;
    open: boolean;
  };
  explain_sidecar: boolean;
  /** Retired managed-copy keys present under `diagram.archify` (ignored). */
  deprecated: string[];
}

export const DEFAULT_DIAGRAM_CONFIG: DiagramConfig = {
  engine: "auto",
  archify: {
    quality: "showcase",
    open: false,
  },
  explain_sidecar: false,
  deprecated: [],
};

export const ARCHIFY_BIN_RELATIVE = path.join("bin", "archify.mjs");
export const ARCHIFY_REPO = "tt-a1i/archify";
export const ARCHIFY_SKILL: UpstreamSkill = {
  repo: ARCHIFY_REPO,
  name: "archify",
  entryRelative: ARCHIFY_BIN_RELATIVE,
};
export const ARCHIFY_INSTALL_COMMAND = skillsAddCommand(ARCHIFY_REPO, [
  ARCHIFY_SKILL.name,
]);
const DEPRECATED_ARCHIFY_KEYS = [
  "managed",
  "channel",
  "check_interval_min",
] as const;
export const ARCHIFY_ENV_HOME = "ARCHIFY_HOME";
/** Set on every archify invocation: keeps the skill's update ping offline. */
export const ARCHIFY_ENV_NO_UPDATE = "ARCHIFY_UPDATE_CHECK_DISABLED";

export interface ArchifyInstall {
  /** Directory that contains `bin/archify.mjs` (and `SKILL.md`, `schemas/`). */
  root: string;
  bin: string;
  version?: string;
  /** Where the hit came from: `config` / `env` / the well-known dir label. */
  source: string;
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
  /** Deprecation notes for ignored config keys. */
  warnings: string[];
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
    },
    explain_sidecar: section?.explain_sidecar === true,
    deprecated: DEPRECATED_ARCHIFY_KEYS.filter((k) => k in archify),
  };
}

function deprecationNote(config: DiagramConfig): string | undefined {
  if (config.deprecated.length === 0) return undefined;
  const keys = config.deprecated.map((k) => `diagram.archify.${k}`);
  return `${keys.join(", ")} ${keys.length > 1 ? "are" : "is"} ignored: archify is now a skills-CLI install (update with \`oma diagram update\`)`;
}

function expandHome(p: string, home: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(home, p.slice(1)) : p;
}

/**
 * Well-known skill directories, project-local first, then the per-user
 * equivalents (shared with every skills-CLI install), plus Raven's workspace.
 */
export function archifyCandidateDirs(
  cwd: string,
  home = os.homedir(),
): Array<{ dir: string; source: string }> {
  const out = skillCandidateDirs(ARCHIFY_SKILL, cwd, home);
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

/** Full search: pins → installed skill dirs. */
export function findArchify(opts: FindArchifyOptions): {
  install?: ArchifyInstall;
  probed: string[];
} {
  const pinned = findPinnedArchify(opts);
  if (pinned.install) return pinned;
  const skill = findSkillDirArchify(opts);
  return {
    install: skill.install,
    probed: [...pinned.probed, ...skill.probed],
  };
}

export interface ResolveDiagramOptions
  extends Omit<FindArchifyOptions, "configPath"> {
  /** Override the config-file engine (CLI flag / prompt phrasing). */
  engine?: DiagramEngineRequest;
  config?: DiagramConfig;
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
  const note = deprecationNote(config);
  const base = {
    requested,
    quality: config.archify.quality,
    open: config.archify.open,
    explainSidecar: config.explain_sidecar,
    warnings: note ? [note] : [],
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

  const { install, probed } = findArchify({
    cwd: opts.cwd,
    configPath: config.archify.path,
    env: opts.env,
    home: opts.home,
  });

  if (install) {
    return {
      ...base,
      engine: "archify",
      archify: install,
      reason: `archify${install.version ? ` ${install.version}` : ""} via ${install.source}`,
      probed,
      ok: true,
    };
  }

  if (requested === "archify") {
    return {
      ...base,
      engine: "mermaid",
      reason: `diagram.engine is pinned to archify but it is not installed — run \`oma diagram update\` (runs \`${ARCHIFY_INSTALL_COMMAND}\`) or set diagram.archify.path / ARCHIFY_HOME`,
      probed,
      ok: false,
    };
  }

  return {
    ...base,
    engine: "mermaid",
    reason: `archify is not installed — run \`oma diagram update\` (runs \`${ARCHIFY_INSTALL_COMMAND}\`)`,
    probed,
    ok: true,
  };
}

export type ArchifyUpdateAction =
  | "installed"
  | "updated"
  | "skipped-pinned"
  | "failed";

/**
 * Install archify with the skills CLI when it is missing, otherwise update it.
 * Pinned copies (diagram.archify.path / ARCHIFY_HOME) are left to their owners.
 */
export async function updateArchify(
  opts: Omit<ResolveDiagramOptions, "engine"> & { spawn?: SkillsCliSpawn },
): Promise<{
  action: ArchifyUpdateAction;
  detail: string;
  resolution: DiagramResolution & { ok: boolean };
}> {
  const before = await resolveDiagramEngine({ ...opts, engine: "archify" });
  const source = before.archify?.source ?? "";
  let action: ArchifyUpdateAction;
  let detail = "";
  if (source.startsWith("config:") || source.startsWith("env:")) {
    action = "skipped-pinned";
    detail = `pinned via ${source}; update it yourself`;
  } else {
    const r = before.archify
      ? updateSkills([ARCHIFY_SKILL.name], opts.spawn)
      : installSkills(ARCHIFY_REPO, [ARCHIFY_SKILL.name], opts.spawn);
    action = r.ok ? (before.archify ? "updated" : "installed") : "failed";
    detail = r.detail;
  }
  const resolution = await resolveDiagramEngine({ ...opts, engine: "archify" });
  return { action, detail, resolution };
}
