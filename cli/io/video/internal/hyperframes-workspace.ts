// Shared HyperFrames toolchain cache and per-run HTML project preparation.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { http } from "../../../io/http.js";
import {
  ensureLatestManagedSkill,
  type ManagedInstall,
  type ManagedSkillSpec,
  readPackageJsonVersion,
} from "../../../platform/managed-skill.js";
import type { RenderSpec } from "../types.js";
import { runCapture } from "./exec.js";
import { type RunProject, scaffoldRunProject } from "./hyperframes-project.js";

export {
  isStubRoot,
  runProjectDir,
  STUB_MARKER,
  scaffoldRunProject,
} from "./hyperframes-project.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function videoCacheRoot(home = homedir()): string {
  return join(home, ".cache", "oma-video");
}
export function toolchainRoot(home?: string): string {
  return join(videoCacheRoot(home), "hyperframes");
}
export function toolchainDir(version: string, home?: string): string {
  return join(toolchainRoot(home), version);
}
function toolchainStatePath(home?: string): string {
  return join(toolchainRoot(home), "state.json");
}

interface ToolchainState {
  version: string;
  lastCheck: string;
}

function readToolchainState(home?: string): ToolchainState | undefined {
  try {
    const raw = JSON.parse(readFileSync(toolchainStatePath(home), "utf-8"));
    return raw && typeof raw.version === "string"
      ? (raw as ToolchainState)
      : undefined;
  } catch {
    return undefined;
  }
}

function writeToolchainState(state: ToolchainState, home?: string): void {
  const p = toolchainStatePath(home);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, p);
}

export async function fetchLatestNpmVersion(pkg: string): Promise<string> {
  try {
    const res = await http.get<{ version?: string }>(
      `https://registry.npmjs.org/${encodeURIComponent(pkg).replace("%40", "@")}/latest`,
      { timeout: 8_000, headers: { Accept: "application/json" } },
    );
    if (typeof res.data?.version === "string") return res.data.version;
  } catch {
    /* fall through */
  }
  const r = await runCapture("npm", ["view", pkg, "version"], {
    timeoutMs: 20_000,
  });
  const v = r.stdout.trim().split("\n").at(-1)?.trim();
  if (r.code !== 0 || !v) throw new Error(`npm view ${pkg} version failed`);
  return v;
}

export interface ToolchainOptions {
  checkIntervalMin: number;
  force?: boolean;
  offline?: boolean;
  home?: string;
  now?: () => Date;
  /** Test seams. */
  fetchLatest?: (pkg: string) => Promise<string>;
  run?: typeof runCapture;
  fetchImpl?: typeof fetch;
}

export interface Toolchain {
  dir: string;
  version: string;
  status: "fresh" | "current" | "stale";
  browserReady: boolean;
  fontReady: boolean;
  note?: string;
}

/** Installed toolchain versions in the cache, newest first. */
export function installedToolchains(home?: string): string[] {
  try {
    return readdirSync(toolchainRoot(home), { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(e.name) &&
          existsSync(toolchainCli(join(toolchainRoot(home), e.name))) &&
          existsSync(
            join(
              toolchainRoot(home),
              e.name,
              "node_modules",
              "gsap",
              "dist",
              "gsap.min.js",
            ),
          ),
      )
      .map((e) => e.name)
      .sort((a, b) => compareVersions(b, a));
  } catch {
    return [];
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function headlessShellReady(dir: string): boolean {
  try {
    const { path } = JSON.parse(
      readFileSync(join(dir, "browser.json"), "utf8"),
    );
    return typeof path === "string" && existsSync(path);
  } catch {
    return false;
  }
}

export function toolchainCli(dir: string): string {
  return join(dir, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
}

export const PRETENDARD_FONT_URL =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2";

function fontPath(dir: string): string {
  return join(dir, "fonts", "PretendardVariable.woff2");
}

async function ensureFont(
  dir: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const dest = fontPath(dir);
  if (existsSync(dest)) return true;
  try {
    const res = await fetchImpl(PRETENDARD_FONT_URL, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return false;
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

function describe(
  dir: string,
  version: string,
  status: Toolchain["status"],
  note?: string,
): Toolchain {
  return {
    dir,
    version,
    status,
    browserReady: headlessShellReady(dir),
    fontReady: existsSync(fontPath(dir)),
    note,
  };
}

/**
 * Ensure `~/.cache/oma-video/hyperframes/<latest>/` exists with deps, headless
 * shell, and font. Network failures fall back to the newest cached toolchain
 * (`stale`); nothing cached + no network → undefined.
 */
export async function ensureLatestToolchain(
  opts: ToolchainOptions,
): Promise<Toolchain | undefined> {
  const now = opts.now ?? (() => new Date());
  const run = opts.run ?? runCapture;
  const fetchLatest = opts.fetchLatest ?? fetchLatestNpmVersion;
  const cached = installedToolchains(opts.home)[0];
  const state = readToolchainState(opts.home);

  if (opts.offline) {
    return cached
      ? describe(
          toolchainDir(cached, opts.home),
          cached,
          "stale",
          "offline: using cached toolchain",
        )
      : undefined;
  }

  if (
    cached &&
    !opts.force &&
    opts.checkIntervalMin > 0 &&
    state?.version === cached
  ) {
    const ageMin =
      (now().getTime() - new Date(state.lastCheck).getTime()) / 60_000;
    if (
      ageMin >= 0 &&
      ageMin < opts.checkIntervalMin &&
      headlessShellReady(toolchainDir(cached, opts.home)) &&
      existsSync(fontPath(toolchainDir(cached, opts.home)))
    ) {
      return describe(toolchainDir(cached, opts.home), cached, "current");
    }
  }

  let latest: string;
  try {
    latest = await fetchLatest("hyperframes");
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(latest))
      throw new Error("invalid npm version");
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return cached
      ? describe(
          toolchainDir(cached, opts.home),
          cached,
          "stale",
          `version check failed (${why}); using cached ${cached}`,
        )
      : undefined;
  }

  const dir = toolchainDir(latest, opts.home);
  const installed =
    existsSync(toolchainCli(dir)) &&
    existsSync(join(dir, "node_modules", "gsap", "dist", "gsap.min.js"));
  if (!installed) {
    const staging = `${dir}.installing`;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    writeFileSync(
      join(staging, "package.json"),
      JSON.stringify(
        {
          name: "oma-video-hyperframes-toolchain",
          private: true,
          version: latest,
          type: "module",
          dependencies: { hyperframes: latest, gsap: "latest" },
        },
        null,
        2,
      ),
    );
    const res = await run("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: staging,
      timeoutMs: 900_000,
      env: {
        ...process.env,
        PUPPETEER_SKIP_DOWNLOAD: "1",
      },
    });
    if (
      res.timedOut ||
      res.code !== 0 ||
      !existsSync(toolchainCli(staging)) ||
      !existsSync(join(staging, "node_modules", "gsap", "dist", "gsap.min.js"))
    ) {
      rmSync(staging, { recursive: true, force: true });
      const why = res.timedOut
        ? "npm install timed out"
        : `npm install exit ${res.code}: ${(res.stderr || res.stdout).trim().split("\n").slice(-3).join(" | ")}`;
      return cached
        ? describe(
            toolchainDir(cached, opts.home),
            cached,
            "stale",
            `${why}; using cached ${cached}`,
          )
        : undefined;
    }
    const pkgPath = join(staging, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.dependencies.gsap =
      readPackageJsonVersion(join(staging, "node_modules", "gsap")) ??
      pkg.dependencies.gsap;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    rmSync(dir, { recursive: true, force: true });
    renameSync(staging, dir);
  }

  if (!headlessShellReady(dir)) {
    const env = { ...process.env, DO_NOT_TRACK: "1" };
    const ensured = await run(
      "node",
      [toolchainCli(dir), "browser", "ensure"],
      {
        cwd: dir,
        timeoutMs: 300_000,
        env,
      },
    );
    if (ensured.code === 0) {
      const browser = await run(
        "node",
        [toolchainCli(dir), "browser", "path"],
        {
          cwd: dir,
          timeoutMs: 30_000,
          env,
        },
      );
      const browserPath = browser.stdout.trim();
      if (browser.code === 0 && existsSync(browserPath)) {
        writeFileSync(
          join(dir, "browser.json"),
          JSON.stringify({ path: browserPath }),
        );
      }
    }
  }
  await ensureFont(dir, opts.fetchImpl);

  writeToolchainState(
    { version: latest, lastCheck: now().toISOString() },
    opts.home,
  );
  // Retain installed versions: authored runs link to their recorded toolchain.
  return describe(dir, latest, installed ? "current" : "fresh");
}

// ---------------------------------------------------------------------------
// heygen-com/hyperframes (managed, HEAD)
// ---------------------------------------------------------------------------

export const HYPERFRAMES_SKILLS_SPEC: ManagedSkillSpec = {
  id: "video-hyperframes-skills",
  repo: "heygen-com/hyperframes",
  packageSubdir: "",
  entryRelative: join("skills", "hyperframes-core", "SKILL.md"),
  readVersion: readPackageJsonVersion,
};

export function skillsCacheRoot(home?: string): string {
  return join(videoCacheRoot(home), "hyperframes-skills");
}

export interface HyperframesSkills {
  root: string;
  ref: string;
  status: ManagedInstall["status"];
  note?: string;
  /** Absolute SKILL.md paths by upstream skill name. */
  skills: Record<string, string>;
}

export async function ensureHyperframesSkills(opts: {
  checkIntervalMin: number;
  force?: boolean;
  offline?: boolean;
  home?: string;
  managed?: () => Promise<ManagedInstall | undefined>;
}): Promise<HyperframesSkills | undefined> {
  const m = await (opts.managed
    ? opts.managed()
    : ensureLatestManagedSkill(HYPERFRAMES_SKILLS_SPEC, {
        channel: "main",
        checkIntervalMin: opts.checkIntervalMin,
        force: opts.force,
        offline: opts.offline,
        cacheRoot: skillsCacheRoot(opts.home),
      }));
  if (!m) return undefined;
  const skillsDir = join(m.root, "skills");
  const skills: Record<string, string> = {};
  try {
    for (const e of readdirSync(skillsDir, { withFileTypes: true })) {
      const md = join(skillsDir, e.name, "SKILL.md");
      if (e.isDirectory() && existsSync(md)) skills[e.name] = md;
    }
  } catch {
    /* none */
  }
  return { root: m.root, ref: m.ref, status: m.status, note: m.note, skills };
}

/** Toolchain + skills + scaffold in one call (what `oma video compose` and the orchestrator use). */
export async function prepareHyperframesRun(args: {
  runDir: string;
  spec: RenderSpec;
  checkIntervalMin: number;
  force?: boolean;
  offline?: boolean;
  home?: string;
}): Promise<{
  toolchain: Toolchain;
  skills?: HyperframesSkills;
  project: RunProject;
}> {
  const toolchain = await ensureLatestToolchain({
    checkIntervalMin: args.checkIntervalMin,
    force: args.force,
    offline: args.offline,
    home: args.home,
  });
  if (!toolchain) {
    throw new Error(
      "hyperframes toolchain unavailable: could not download the latest hyperframes and nothing is cached — run `oma video doctor --install` once online",
    );
  }
  const skills = await ensureHyperframesSkills({
    checkIntervalMin: args.checkIntervalMin,
    force: args.force,
    offline: args.offline,
    home: args.home,
  });
  const project = scaffoldRunProject({
    runDir: args.runDir,
    spec: args.spec,
    toolchain,
    skills,
  });
  return { toolchain, skills, project };
}

/** Cheap offline description for doctor/readiness. */
export function describeToolchain(home?: string): {
  version?: string;
  dir?: string;
  browserReady: boolean;
  fontReady: boolean;
} {
  const v = installedToolchains(home)[0];
  if (!v) return { browserReady: false, fontReady: false };
  const dir = toolchainDir(v, home);
  return {
    version: v,
    dir,
    browserReady: headlessShellReady(dir),
    fontReady: existsSync(fontPath(dir)),
  };
}
