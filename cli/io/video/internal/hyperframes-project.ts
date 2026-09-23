import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { RenderSpec } from "../types.js";
import type { HyperframesSkills, Toolchain } from "./hyperframes-workspace.js";

export const STUB_MARKER = "OMA_VIDEO_STUB_HTML — replace this file";
export const runProjectDir = (runDir: string): string =>
  join(runDir, "hyperframes");

export interface RunProject {
  projectDir: string;
  entryHtml: string;
  authoringGuide: string;
  composition: string;
  stub: boolean;
}

export function isStubRoot(projectDir: string): boolean {
  try {
    return readFileSync(join(projectDir, "index.html"), "utf8").includes(
      STUB_MARKER,
    );
  } catch {
    return true;
  }
}

/** Copy only referenced local assets and rewrite their paths for the HTML project. */
export function stageRenderSpec(runDir: string, spec: RenderSpec): RenderSpec {
  const projectDir = runProjectDir(runDir);
  const root = realpathSync(runDir);
  const copy = (src: string): string => {
    if (isAbsolute(src) || /^[a-z][a-z\d+.-]*:/i.test(src)) {
      throw new Error(`video asset must be run-relative: ${src}`);
    }
    const source = realpathSync(resolve(root, src));
    const rel = relative(root, source);
    if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`video asset escapes run directory: ${src}`);
    }
    const dest = join(projectDir, "assets", rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(source, dest);
    return `assets/${rel.split(sep).join("/")}`;
  };
  const staged = structuredClone(spec);
  for (const scene of staged.scenes) {
    if (
      scene.visual.type !== "placeholder" &&
      !scene.visual.src.startsWith("#")
    ) {
      scene.visual.src = copy(scene.visual.src);
    }
  }
  if (staged.background.type !== "color" && staged.background.src) {
    staged.background.src = copy(staged.background.src);
  }
  if (staged.audio.narration)
    staged.audio.narration = copy(staged.audio.narration);
  if (staged.audio.music) staged.audio.music = copy(staged.audio.music);
  if (staged.captions.file) staged.captions.file = copy(staged.captions.file);
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(
    join(projectDir, "render-spec.json"),
    `${JSON.stringify(staged, null, 2)}\n`,
  );
  writeFileSync(
    join(projectDir, "render-spec.js"),
    `window.OMA_VIDEO_SPEC = ${JSON.stringify(staged)};\n`,
  );
  return staged;
}

function authoringGuide(
  spec: RenderSpec,
  toolchain: Toolchain,
  skills?: HyperframesSkills,
): string {
  const skillLines = Object.entries(skills?.skills ?? {})
    .filter(([name]) =>
      ["hyperframes-core", "hyperframes-animation", "hyperframes-cli"].includes(
        name,
      ),
    )
    .map(([name, file]) => `- ${name}: ${file}`)
    .join("\n");
  return `# HyperFrames authoring contract

Replace index.html, including its stub marker, with the finished composition.
HyperFrames ${toolchain.version}; ${spec.dimensions.width} × ${spec.dimensions.height}; ${spec.fps} fps; ${spec.durationInFrames / spec.fps} seconds.

## References
${skillLines || "Read https://hyperframes.heygen.com/introduction and the composition contract at https://github.com/heygen-com/hyperframes/tree/main/skills/hyperframes-core."}
Use upstream references for HTML, animation, and CLI APIs. OMA owns provider selection,
authorization, and delivery. Do not invoke upstream publishing, telemetry feedback,
skill installation, or additional media providers as part of this local render.

## Inputs and layout
- render-spec.json is the project-local copy of the run's authoritative spec. Its asset paths already point inside assets/. render-spec.js exposes it as window.OMA_VIDEO_SPEC without a network fetch.
- Use a standalone root with data-composition-id="${spec.composition}", data-width="${spec.dimensions.width}", data-height="${spec.dimensions.height}", and data-duration="${spec.durationInFrames / spec.fps}". Root CSS width and height are 100%.
- Convert scene fromFrame and durationInFrames to seconds by dividing by fps. Put data-start and data-duration on timed clips; use z-index for visual stacking.
- Image/slide visuals use img, video/capture visuals use video, placeholders use a color. Honor onScreenText and transitionOut; only use Ken Burns when kenBurns is true.
- For Demo, place background video beneath overlays. Do not give a video a data-start when its plain ancestor already has one. Preserve source audio only once if the recording needs it.
- Give every audio element a unique id. Place narration and music from frame zero. Music data-volume is 10 ** ((musicGainDb ?? -18) / 20). The framework owns playback; do not call play(), seek media, or use timers.
- When captions.style is not none, read the staged SRT while authoring and emit one timed cue per interval. Show only the active cue. tiktok: centered, bold, 64px, no box; lower-third: left aligned, 40px, dark translucent band. Respect safeArea and maxWidthPct; no per-word animation.
- Load assets/fonts/PretendardVariable.woff2 with @font-face when present; otherwise use system-ui. No remote font or script dependencies.
- Use vendor/gsap.min.js. Register one paused timeline at window.__timelines["${spec.composition}"]; animate children of clips. No wall-clock timers, unseeded randomness, or render-time network calls.
- Shorts: keep titles and captions clear of vertical platform UI. Explainer: keep diagrams readable and still. Demo: keep the recording legible beneath callouts.

## Verification
Run the local CLI with node node_modules/hyperframes/bin/hyperframes.mjs lint and check.
Preview with node node_modules/hyperframes/bin/hyperframes.mjs preview when visual inspection is needed.
Then run oma video render <runDir> --output json. It lints, renders, validates the video with ffprobe, and updates the manifest. Fix any failure before delivery.
`;
}

/** Refresh generated inputs while preserving the agent's authored HTML. */
export function scaffoldRunProject(args: {
  runDir: string;
  spec: RenderSpec;
  toolchain: Toolchain;
  skills?: HyperframesSkills;
}): RunProject {
  const { runDir, spec, toolchain, skills } = args;
  const projectDir = runProjectDir(runDir);
  stageRenderSpec(runDir, spec);
  const modules = join(projectDir, "node_modules");
  try {
    if (lstatSync(modules).isSymbolicLink()) rmSync(modules);
    else throw new Error(`expected a managed node_modules link at ${modules}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  symlinkSync(
    join(toolchain.dir, "node_modules"),
    modules,
    process.platform === "win32" ? "junction" : "dir",
  );
  const pkg = JSON.parse(
    readFileSync(join(toolchain.dir, "package.json"), "utf8"),
  );
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "oma-video-composition",
        private: true,
        type: "module",
        dependencies: pkg.dependencies,
        scripts: {
          preview: "hyperframes preview",
          lint: "hyperframes lint",
          render: "hyperframes render",
        },
        omaVideo: {
          hyperframes: toolchain.version,
          toolchainDir: toolchain.dir,
          skillsRef: skills?.ref,
        },
      },
      null,
      2,
    ),
  );
  mkdirSync(join(projectDir, "vendor"), { recursive: true });
  cpSync(
    join(toolchain.dir, "node_modules", "gsap", "dist", "gsap.min.js"),
    join(projectDir, "vendor", "gsap.min.js"),
  );
  const font = join(toolchain.dir, "fonts", "PretendardVariable.woff2");
  if (existsSync(font)) {
    mkdirSync(join(projectDir, "assets", "fonts"), { recursive: true });
    cpSync(
      font,
      join(projectDir, "assets", "fonts", "PretendardVariable.woff2"),
    );
  }
  const entryHtml = join(projectDir, "index.html");
  if (!existsSync(entryHtml)) {
    writeFileSync(
      entryHtml,
      `<!doctype html>
<!-- ${STUB_MARKER} -->
<html><head><meta charset="utf-8"><script src="vendor/gsap.min.js"></script><script src="render-spec.js"></script></head>
<body><p>Author this composition using AUTHORING.md.</p></body></html>\n`,
    );
  }
  const guide = join(projectDir, "AUTHORING.md");
  writeFileSync(guide, authoringGuide(spec, toolchain, skills));
  return {
    projectDir,
    entryHtml,
    authoringGuide: guide,
    composition: spec.composition,
    stub: isStubRoot(projectDir),
  };
}
