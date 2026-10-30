/**
 * Upstream agent skills that oma's CLI runs (last30days, archify, HyperFrames)
 * come from the open skills CLI (`bunx skills add`), never from an oma-owned
 * copy. Resolution only reads installed skill directories, so every vendor
 * runtime gets the same deterministic answer. Install and update shell out to
 * the skills CLI and run only from explicit commands (`oma market update`,
 * `oma diagram update`, `oma video doctor --upgrade`, `oma update`).
 */
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";

export interface UpstreamSkill {
  /** `owner/name` on GitHub — the `skills add` source. */
  repo: string;
  /** Installed skill directory name (the upstream SKILL.md `name`). */
  name: string;
  /** File that must exist under the skill dir for the install to count. */
  entryRelative: string;
  /** Claude Code plugin cache `<marketplace>/<plugin>` holding versioned copies. */
  pluginCache?: string;
}

export interface InstalledSkill {
  /** The skill directory (the upstream `SKILL_DIR`). */
  root: string;
  /** Absolute path of `entryRelative`. */
  entry: string;
  version?: string;
  /** Where the hit came from, e.g. `home:~/.agents/skills`. */
  source: string;
}

/** Vendor skill dirs the skills CLI writes (`.<vendor>/skills/<name>`). */
const VENDOR_DIRS = [
  "agents",
  "claude",
  "codex",
  "cursor",
  "qwen",
  "kiro",
  "gemini",
  "copilot",
];

function versionSortDesc(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Well-known install locations, project-local first, then per-user. */
export function skillCandidateDirs(
  skill: Pick<UpstreamSkill, "name" | "pluginCache">,
  cwd: string,
  home = os.homedir(),
): Array<{ dir: string; source: string }> {
  const out: Array<{ dir: string; source: string }> = [];
  for (const v of VENDOR_DIRS) {
    out.push({
      dir: path.join(cwd, `.${v}`, "skills", skill.name),
      source: `project:.${v}/skills`,
    });
  }
  for (const v of VENDOR_DIRS) {
    out.push({
      dir: path.join(home, `.${v}`, "skills", skill.name),
      source: `home:~/.${v}/skills`,
    });
  }
  out.push({
    dir: path.join(home, ".config", "agents", "skills", skill.name),
    source: "home:~/.config/agents/skills",
  });
  if (skill.pluginCache) {
    const cache = path.join(
      home,
      ".claude",
      "plugins",
      "cache",
      skill.pluginCache,
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
    // Plugins nest the skill (`<ver>/skills/<name>`) or ship it flat (`<ver>`).
    for (const v of versions) {
      out.push({
        dir: path.join(cache, v, "skills", skill.name),
        source: `home:claude-plugin-cache:${v}`,
      });
      out.push({
        dir: path.join(cache, v),
        source: `home:claude-plugin-cache:${v}`,
      });
    }
  }
  return out;
}

/**
 * Package version: SKILL.md front matter `version` (top level or nested under
 * `metadata:`), else `package.json` `version`.
 */
export function readSkillVersion(dir: string): string | undefined {
  try {
    const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf-8");
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    const m = fm && /^\s*version:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(fm);
    if (m?.[1]) return m[1].trim();
  } catch {
    /* no SKILL.md */
  }
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8"),
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

/** The install at `dir`, when `entryRelative` exists there. */
export function probeSkillDir(
  skill: Pick<UpstreamSkill, "entryRelative">,
  dir: string,
  source: string,
): InstalledSkill | undefined {
  const entry = path.join(dir, skill.entryRelative);
  try {
    if (!fs.statSync(entry).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return { root: dir, entry, version: readSkillVersion(dir), source };
}

export function findInstalledSkill(
  skill: UpstreamSkill,
  opts: { cwd: string; home?: string },
): { install?: InstalledSkill; probed: string[] } {
  const probed: string[] = [];
  for (const { dir, source } of skillCandidateDirs(
    skill,
    opts.cwd,
    opts.home,
  )) {
    probed.push(dir);
    const hit = probeSkillDir(skill, dir, source);
    if (hit) return { install: hit, probed };
  }
  return { probed };
}

// ---------------------------------------------------------------------------
// skills CLI
// ---------------------------------------------------------------------------

export function skillsAddArgs(repo: string, names: string[]): string[] {
  return [
    "skills",
    "add",
    repo,
    ...names.flatMap((n) => ["--skill", n]),
    "-g",
    "-y",
  ];
}

export function skillsUpdateArgs(names: string[]): string[] {
  return ["skills", "update", ...names, "-g", "-y"];
}

/** The exact install command, for `ok: false` reasons and docs. */
export function skillsAddCommand(repo: string, names: string[]): string {
  return ["bunx", ...skillsAddArgs(repo, names)].join(" ");
}

export interface SkillsCliResult {
  ok: boolean;
  /** Last lines of output on failure; empty on success. */
  detail: string;
}

export type SkillsCliSpawn = (
  args: string[],
  env: NodeJS.ProcessEnv,
) => Pick<SpawnSyncReturns<string>, "status" | "stdout" | "stderr" | "error">;

const SKILLS_CLI_TIMEOUT_MS = 600_000;

const defaultSpawn: SkillsCliSpawn = (args, env) =>
  spawnSync("bunx", args, {
    encoding: "utf-8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: SKILLS_CLI_TIMEOUT_MS,
  });

function runSkillsCli(args: string[], spawn?: SkillsCliSpawn): SkillsCliResult {
  // oma runs the skills CLI on the user's behalf: no install telemetry.
  const env = { ...process.env, DISABLE_TELEMETRY: "1" };
  const r = (spawn ?? defaultSpawn)(args, env);
  if (r.error) {
    const missing = (r.error as NodeJS.ErrnoException).code === "ENOENT";
    return {
      ok: false,
      detail: missing
        ? "bunx not found — install Bun (https://bun.sh) and retry"
        : r.error.message,
    };
  }
  if (r.status === 0) return { ok: true, detail: "" };
  const plain = stripVTControlCharacters(
    `${r.stderr ?? ""}\n${r.stdout ?? ""}`,
  );
  const tail = plain
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" | ");
  return {
    ok: false,
    detail: `skills CLI exit ${r.status ?? "?"}${tail ? `: ${tail}` : ""}`,
  };
}

/** `bunx skills add <repo> --skill <name>… -g -y` */
export function installSkills(
  repo: string,
  names: string[],
  spawn?: SkillsCliSpawn,
): SkillsCliResult {
  return runSkillsCli(skillsAddArgs(repo, names), spawn);
}

/** `bunx skills update <name>… -g -y` */
export function updateSkills(
  names: string[],
  spawn?: SkillsCliSpawn,
): SkillsCliResult {
  return runSkillsCli(skillsUpdateArgs(names), spawn);
}
