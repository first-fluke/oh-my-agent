// Remotion workspace — always-latest toolchain + per-run scaffold.
//
// oma does NOT own Remotion composition code. Per run, the agent authors the
// composition (following remotion-dev/skills, kept at HEAD) inside the run
// directory; oma only provides:
//
//   toolchain  ~/.cache/oma-video/remotion/<version>/   latest npm remotion +
//              @remotion/* + react, node_modules, Chrome Headless Shell,
//              embedded Pretendard. Refreshed to `latest` (throttled).
//   skills     ~/.cache/oma-video/remotion-skills/<sha>/ remotion-dev/skills
//              (managed via platform/managed-skill.ts, `main` channel).
//   scaffold   <runDir>/remotion/                        package.json (exact
//              toolchain versions), node_modules -> toolchain symlink,
//              remotion.config.ts, tsconfig, src/index.ts, src/render-spec.ts
//              (zod mirror of the CLI contract), a STUB src/Root.tsx the agent
//              must replace, and AUTHORING.md with the contract.
//
// A render that breaks on the latest Remotion is the composition's problem —
// the agent re-authors with the latest skills; oma never pins.
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { http } from "../../../io/http.js";
import {
  ensureLatestManagedSkill,
  type ManagedInstall,
  type ManagedSkillSpec,
  readPackageJsonVersion,
} from "../../../platform/managed-skill.js";
import type { RenderSpec } from "../types.js";
import { runCapture } from "./exec.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function videoCacheRoot(home = homedir()): string {
  return join(home, ".cache", "oma-video");
}
export function toolchainRoot(home?: string): string {
  return join(videoCacheRoot(home), "remotion");
}
export function toolchainDir(version: string, home?: string): string {
  return join(toolchainRoot(home), version);
}
function toolchainStatePath(home?: string): string {
  return join(toolchainRoot(home), "state.json");
}

/** Per-run Remotion project location. */
export const RUN_PROJECT_DIRNAME = "remotion";
export const RUN_FONT_RELATIVE = join("fonts", "PretendardVariable.woff2");
export const STUB_MARKER = "OMA_VIDEO_STUB_ROOT — replace this file";

// ---------------------------------------------------------------------------
// Latest version (throttled)
// ---------------------------------------------------------------------------

export const REMOTION_PACKAGES = [
  "remotion",
  "@remotion/cli",
  "@remotion/captions",
  "@remotion/fonts",
] as const;

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
  reactVersion?: string;
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
          existsSync(
            join(toolchainRoot(home), e.name, "node_modules", "remotion"),
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
  const shellDir = join(
    dir,
    "node_modules",
    ".remotion",
    "chrome-headless-shell",
  );
  if (!existsSync(shellDir)) return false;
  const target =
    process.platform === "win32"
      ? "chrome-headless-shell.exe"
      : "chrome-headless-shell";
  try {
    return (readdirSync(shellDir, { recursive: true }) as string[]).some(
      (rel) => {
        if ((rel.split(/[\\/]/).pop() ?? "") !== target) return false;
        try {
          return statSync(join(shellDir, rel)).size > 1_000_000;
        } catch {
          return false;
        }
      },
    );
  } catch {
    return false;
  }
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
    reactVersion: readPackageJsonVersion(join(dir, "node_modules", "react")),
    status,
    browserReady: headlessShellReady(dir),
    fontReady: existsSync(fontPath(dir)),
    note,
  };
}

/**
 * Ensure `~/.cache/oma-video/remotion/<latest>/` exists with deps, headless
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
    if (ageMin >= 0 && ageMin < opts.checkIntervalMin) {
      return describe(toolchainDir(cached, opts.home), cached, "current");
    }
  }

  let latest: string;
  let react: string;
  try {
    [latest, react] = await Promise.all([
      fetchLatest("remotion"),
      fetchLatest("react"),
    ]);
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
  const installed = existsSync(join(dir, "node_modules", "remotion"));
  if (!installed) {
    const staging = `${dir}.installing`;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    writeFileSync(
      join(staging, "package.json"),
      JSON.stringify(
        {
          name: "oma-video-remotion-toolchain",
          private: true,
          version: latest,
          type: "module",
          dependencies: {
            ...Object.fromEntries(REMOTION_PACKAGES.map((p) => [p, latest])),
            react,
            "react-dom": react,
            zod: "latest",
          },
          devDependencies: { "@types/react": "latest", typescript: "latest" },
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
        REMOTION_SKIP_BROWSER_DOWNLOAD: "1",
        PUPPETEER_SKIP_DOWNLOAD: "1",
      },
    });
    if (
      res.timedOut ||
      res.code !== 0 ||
      !existsSync(join(staging, "node_modules", "remotion"))
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
    renameSync(staging, dir);
  }

  if (!headlessShellReady(dir)) {
    await run("npx", ["remotion", "browser", "ensure"], {
      cwd: dir,
      timeoutMs: 300_000,
    });
  }
  await ensureFont(dir, opts.fetchImpl);

  writeToolchainState(
    { version: latest, lastCheck: now().toISOString() },
    opts.home,
  );
  // Prune older toolchains once the new one is usable.
  for (const v of installedToolchains(opts.home)) {
    if (v !== latest)
      rmSync(toolchainDir(v, opts.home), { recursive: true, force: true });
  }
  return describe(dir, latest, installed ? "current" : "fresh");
}

// ---------------------------------------------------------------------------
// remotion-dev/skills (managed, HEAD)
// ---------------------------------------------------------------------------

export const REMOTION_SKILLS_SPEC: ManagedSkillSpec = {
  id: "video-remotion-skills",
  repo: "remotion-dev/skills",
  packageSubdir: "",
  entryRelative: join("skills", "remotion-best-practices", "SKILL.md"),
  readVersion: readPackageJsonVersion,
};

export function skillsCacheRoot(home?: string): string {
  return join(videoCacheRoot(home), "remotion-skills");
}

export interface RemotionSkills {
  root: string;
  ref: string;
  status: ManagedInstall["status"];
  note?: string;
  /** Absolute SKILL.md paths by skill name (remotion-best-practices, remotion-markup, …). */
  skills: Record<string, string>;
}

export async function ensureRemotionSkills(opts: {
  checkIntervalMin: number;
  force?: boolean;
  offline?: boolean;
  home?: string;
  managed?: () => Promise<ManagedInstall | undefined>;
}): Promise<RemotionSkills | undefined> {
  const m = await (opts.managed
    ? opts.managed()
    : ensureLatestManagedSkill(REMOTION_SKILLS_SPEC, {
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

// ---------------------------------------------------------------------------
// Per-run scaffold
// ---------------------------------------------------------------------------

export interface RunProject {
  projectDir: string;
  rootTsx: string;
  authoringGuide: string;
  composition: string;
  /** True when src/Root.tsx is still the stub (agent has not authored yet). */
  stub: boolean;
}

export function runProjectDir(runDir: string): string {
  return join(runDir, RUN_PROJECT_DIRNAME);
}

export function isStubRoot(projectDir: string): boolean {
  try {
    return readFileSync(join(projectDir, "src", "Root.tsx"), "utf-8").includes(
      STUB_MARKER,
    );
  } catch {
    return true;
  }
}

const RENDER_SPEC_TS = `// render-spec.ts — zod mirror of the oma CLI RenderSpec contract (schemaVersion "1.0").
// GENERATED by \`oma video compose\`; do not edit. render-spec.json is passed to
// \`npx remotion render\` as --props and validated against this schema.
import { z } from "zod";

export const VIDEO_SCHEMA_VERSION = "1.0" as const;
export const CaptionStyleSchema = z.enum(["tiktok", "lower-third", "none"]);
export const SafeAreaSchema = z.object({
  topPct: z.number().nonnegative(),
  bottomPct: z.number().nonnegative(),
  leftPct: z.number().nonnegative(),
  rightPct: z.number().nonnegative(),
});
export const RenderSpecSceneSchema = z.object({
  id: z.string().min(1),
  fromFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
  visual: z.object({
    type: z.enum(["image", "video", "slide", "capture", "placeholder"]),
    src: z.string().min(1),
    kenBurns: z.boolean().default(false),
  }),
  onScreenText: z.array(z.string()).default([]),
  transitionOut: z.string().optional(),
});
export const RenderSpecSchema = z.object({
  schemaVersion: z.literal(VIDEO_SCHEMA_VERSION),
  compositor: z.enum(["remotion", "mpt"]),
  composition: z.string().min(1),
  slug: z.string().min(1).optional(),
  fps: z.number().int().positive(),
  dimensions: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  durationInFrames: z.number().int().nonnegative(),
  audio: z.object({
    narration: z.string().optional(),
    music: z.string().optional(),
    musicGainDb: z.number().optional(),
  }),
  scenes: z.array(RenderSpecSceneSchema),
  captions: z.object({
    file: z.string().optional(),
    style: CaptionStyleSchema,
    fontFamily: z.string(),
    maxWidthPct: z.number().positive().max(100),
    safeArea: SafeAreaSchema,
  }),
  background: z.object({ type: z.enum(["color", "image", "video"]), src: z.string().optional() }),
  seed: z.number().int(),
});
export type RenderSpec = z.infer<typeof RenderSpecSchema>;
export type RenderSpecScene = z.infer<typeof RenderSpecSceneSchema>;
export type SafeArea = z.infer<typeof SafeAreaSchema>;
`;

const INDEX_TS = `// Remotion entry point. \`npx remotion render src/index.ts <CompositionId> ...\`
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
`;

const CONFIG_TS = `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      jsx: "react-jsx",
      strict: true,
      noUncheckedIndexedAccess: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      noEmit: true,
    },
    include: ["src"],
  },
  null,
  2,
);

function stubRoot(composition: string): string {
  return `// ${STUB_MARKER}
//
// This project was scaffolded by \`oma video compose\`. Author the composition
// per AUTHORING.md (contract) and the remotion-dev/skills it points to, then
// run \`oma video render <runDir>\`. Rendering while this stub is in place fails.
import { Composition } from "remotion";
import { RenderSpecSchema } from "./render-spec";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="${composition}"
    component={() => {
      throw new Error("${STUB_MARKER}");
    }}
    schema={RenderSpecSchema}
    defaultProps={{} as never}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1}
  />
);
`;
}

function authoringGuide(args: {
  spec: RenderSpec;
  runDir: string;
  toolchain: Toolchain;
  skills?: RemotionSkills;
  modeSpecPath?: string;
}): string {
  const { spec, runDir, toolchain, skills, modeSpecPath } = args;
  const skillLines = skills
    ? Object.entries(skills.skills)
        .sort()
        .map(([name, p]) => `- \`${name}\` → ${p}`)
        .join("\n")
    : "- (remotion-dev/skills unavailable offline — author from Remotion knowledge; run `oma video doctor --install` once online)";
  return `# Authoring contract — ${spec.composition} (${spec.dimensions.width}×${spec.dimensions.height} @ ${spec.fps}fps, ${spec.durationInFrames} frames)

Remotion **${toolchain.version}** (react ${toolchain.reactVersion ?? "?"}) — always the latest release. If an API you expect is gone or renamed, that is your problem to solve with the latest skills below, never a reason to pin.

## Skills to read first (remotion-dev/skills @ ${skills?.ref ?? "n/a"})
${skillLines}

Read \`remotion-best-practices\` fully, then \`remotion-markup\` (layout/animation/fonts/media), \`remotion-captions\` (SRT), and \`remotion-render\`.

## What you must produce
Replace \`src/Root.tsx\` (the stub) with a \`RemotionRoot\` that registers **one** \`<Composition id="${spec.composition}">\` whose component consumes \`render-spec.json\` as input props:

- \`schema={RenderSpecSchema}\` from \`./render-spec\` (generated; do not edit).
- \`calculateMetadata\` returns \`{ width, height, fps, durationInFrames }\` from the props — the render-spec, not static values, drives geometry and length.
- Add components under \`src/\` freely (\`src/components/*.tsx\`). Keep everything inside this project directory.
- No network fetches, no randomness (\`Math.random\`, \`Date.now\`): every frame is a pure function of (frame, props, seed).

## render-spec.json → what the composition must honour
| Field | Meaning |
|---|---|
| \`scenes[]\` | timeline; place each with \`<Sequence from={fromFrame} durationInFrames>\`. \`visual.type\`: \`image\`/\`slide\` → \`<Img>\`; \`video\`/\`capture\` → \`<OffthreadVideo>\`; \`placeholder\` or a \`#hex\` src → solid color. \`kenBurns\` → deterministic slow zoom (1 → ~1.08 over the scene). \`onScreenText[]\` → title text (top ~10%, bold, shadowed, ≤ 86% width). |
| \`background\` | \`color\` → fill; \`image\`/\`video\` → full-frame layer under all scenes (demo mode puts the capture here). |
| \`audio.narration\` / \`audio.music\` | \`<Audio src={staticFile(...)}>\`; music volume = 10^(musicGainDb/20), default −18 dB. |
| \`captions\` | when \`style !== "none"\`, parse \`captions.file\` (SRT) with \`@remotion/captions\` \`parseSrt\` and show the **single cue active at the current frame** (cues are sentence-level, back-to-back — do NOT merge into TikTok pages). \`tiktok\`: centered, 64px, bold, no box, bottom \`safeArea.bottomPct\`%. \`lower-third\`: left, 40px, dark 55% band, 12px radius. Respect \`maxWidthPct\` and \`safeArea\`. |
| \`seed\` | reproducibility token; use it for any deterministic variation. |

All \`src\` paths are **run-dir relative** and resolve through \`staticFile()\` because the render passes \`--public-dir=${runDir}\`.

## Font
Pretendard is at \`staticFile("${RUN_FONT_RELATIVE}")\`. Load it with \`@remotion/fonts\` \`loadFont({ family: "Pretendard", url, format: "woff2", weight: "100 900", display: "block" })\`, probing the URL with \`fetch\` HEAD first (a missing file must degrade to \`system-ui\`, not cancel the render). Font stack: \`"Pretendard", "Noto Sans CJK KR", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif\`.
${modeSpecPath ? `\n## Mode layout spec\nRead ${modeSpecPath} for the ${spec.composition} layout rules (framing, motion budget, caption placement).\n` : ""}
## Verify, then render
\`\`\`bash
cd ${runProjectDir(runDir)} && npx tsc --noEmit
oma video render ${runDir} --format json
\`\`\`
\`oma video render\` typechecks, renders \`${spec.composition}\` to the run dir, and ffprobes the result. A non-zero exit is a real failure: read the diagnostics, fix the composition (consult the skills again), re-run. Never hand back a run without a rendered mp4.
`;
}

/** Locate the oma-video skill's mode authoring spec, if the skill is installed. */
function findModeSpec(runDir: string, composition: string): string | undefined {
  const rel = join(
    ".agents",
    "skills",
    "oma-video",
    "resources",
    "remotion-authoring",
    `${composition.toLowerCase()}.md`,
  );
  let dir = resolve(runDir);
  for (;;) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Create (or refresh) `<runDir>/remotion/`. Idempotent and non-destructive:
 * an already-authored `src/Root.tsx` is never overwritten; generated files
 * (render-spec.ts, index.ts, config, tsconfig, AUTHORING.md, node_modules
 * link, package.json) are always refreshed to the current toolchain.
 */
export function scaffoldRunProject(args: {
  runDir: string;
  spec: RenderSpec;
  toolchain: Toolchain;
  skills?: RemotionSkills;
}): RunProject {
  const { runDir, spec, toolchain, skills } = args;
  const projectDir = runProjectDir(runDir);
  mkdirSync(join(projectDir, "src"), { recursive: true });

  const tcPkg = JSON.parse(
    readFileSync(join(toolchain.dir, "package.json"), "utf-8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: `oma-video-run-${spec.slug ?? spec.composition.toLowerCase()}`,
        private: true,
        type: "module",
        description:
          "Per-run Remotion project scaffolded by oma video compose; src/ is agent-authored.",
        scripts: {
          render: `remotion render src/index.ts ${spec.composition}`,
          studio: "remotion studio src/index.ts",
          typecheck: "tsc --noEmit",
        },
        dependencies: tcPkg.dependencies ?? {},
        devDependencies: tcPkg.devDependencies ?? {},
        omaVideo: {
          remotion: toolchain.version,
          toolchainDir: toolchain.dir,
          skillsRef: skills?.ref,
        },
      },
      null,
      2,
    ),
  );

  // node_modules -> shared toolchain (symlink; copy on filesystems that refuse links)
  const nm = join(projectDir, "node_modules");
  try {
    if (lstatSync(nm).isSymbolicLink()) rmSync(nm);
    else rmSync(nm, { recursive: true, force: true });
  } catch {
    /* absent */
  }
  try {
    symlinkSync(
      join(toolchain.dir, "node_modules"),
      nm,
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch {
    cpSync(join(toolchain.dir, "node_modules"), nm, { recursive: true });
  }

  writeFileSync(join(projectDir, "remotion.config.ts"), CONFIG_TS);
  writeFileSync(join(projectDir, "tsconfig.json"), TSCONFIG);
  writeFileSync(join(projectDir, "src", "index.ts"), INDEX_TS);
  writeFileSync(join(projectDir, "src", "render-spec.ts"), RENDER_SPEC_TS);
  const rootTsx = join(projectDir, "src", "Root.tsx");
  if (!existsSync(rootTsx)) writeFileSync(rootTsx, stubRoot(spec.composition));

  // Font into the run dir (public dir) so staticFile("fonts/...") resolves.
  const fontSrc = fontPath(toolchain.dir);
  const fontDst = join(runDir, RUN_FONT_RELATIVE);
  if (existsSync(fontSrc) && !existsSync(fontDst)) {
    mkdirSync(dirname(fontDst), { recursive: true });
    cpSync(fontSrc, fontDst);
  }

  const modeSpecPath = findModeSpec(runDir, spec.composition);
  const guide = join(projectDir, "AUTHORING.md");
  writeFileSync(
    guide,
    authoringGuide({ spec, runDir, toolchain, skills, modeSpecPath }),
  );

  return {
    projectDir,
    rootTsx,
    authoringGuide: guide,
    composition: spec.composition,
    stub: isStubRoot(projectDir),
  };
}

/** Toolchain + skills + scaffold in one call (what `oma video compose` and the orchestrator use). */
export async function prepareRemotionRun(args: {
  runDir: string;
  spec: RenderSpec;
  checkIntervalMin: number;
  force?: boolean;
  offline?: boolean;
  home?: string;
}): Promise<{
  toolchain: Toolchain;
  skills?: RemotionSkills;
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
      "remotion toolchain unavailable: could not download the latest remotion and nothing is cached — run `oma video doctor --install` once online",
    );
  }
  const skills = await ensureRemotionSkills({
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
