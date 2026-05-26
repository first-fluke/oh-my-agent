import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import color from "picocolors";

const FRAME_W = 1920;
const FRAME_H = 1080;

/**
 * meta.json contract — source of truth for slide sequence and deck metadata.
 * Producer: skill (agent). Consumer: CLI viewer / bundle / export.
 */
export interface SlideMeta {
  title: string;
  order: string[];
  style: string;
  density: "sparse" | "balanced" | "dense";
  speakerNotes: Record<string, string>;
}

/** Validated working-directory context used by all subcommands. */
export interface SlideWorkspace {
  dir: string;
  meta: SlideMeta;
  metaPath: string;
}

/**
 * Canonical starter slide using the deck-stage.js DOM contract (fixed-stage.md §3):
 *
 *   <deck-stage>
 *     <div class="deck-viewport">
 *       <div class="deck-stage">
 *         <section class="slide" id="slide-01">…</section>
 *       </div>
 *     </div>
 *   </deck-stage>
 *
 * deck-stage.js queries `.deck-stage > .slide` — without this structure it
 * silently does nothing (no scaling, no navigation).
 * The validator (validate.ts IN_PAGE_CHECK_FN) also keys on `.deck-stage > .slide`
 * to anchor geometry measurements at the correct 1920×1080 frame origin.
 */
const DEFAULT_SLIDE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Slide 01</title>
  <link rel="stylesheet" href="./viewport-base.css" />
  <style>
    .slide {
      /* 1920×1080 design-space canvas — do NOT change; validator checks at this size */
      position: absolute;
      inset: 0;
      width: ${FRAME_W}px;
      height: ${FRAME_H}px;
      overflow: hidden;
      background: #0f1117;
      color: #f0f0f0;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    h1 {
      font-size: 80px;
      font-weight: 700;
      margin: 0 0 24px;
    }
    p {
      font-size: 40px;
      opacity: 0.7;
      margin: 0;
    }
  </style>
</head>
<body>
  <deck-stage>
    <div class="deck-viewport">
      <div class="deck-stage">
        <section
          class="slide"
          id="slide-01"
          data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
        >
          <h1>Slide Title</h1>
          <p>Add your content here</p>
        </section>
      </div>
    </div>
  </deck-stage>
  <script src="./deck-stage.js"></script>
</body>
</html>
`;

// Minimal placeholder viewport-base.css — written when the canonical asset
// from oma-slide resources is not yet present (frontend agent task T3).
const PLACEHOLDER_VIEWPORT_BASE_CSS = `/* viewport-base.css — minimal placeholder
 * TODO(oma-deferred): replace with canonical asset from
 *   .agents/skills/oma-slide/resources/assets/viewport-base.css
 * once the frontend agent delivers task T3.
 */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${FRAME_W}px;
  height: ${FRAME_H}px;
  overflow: hidden;
  background: #0f1117;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

// Minimal placeholder deck-stage.js
const PLACEHOLDER_DECK_STAGE_JS = `/* deck-stage.js — minimal placeholder
 * TODO(oma-deferred): replace with canonical asset from
 *   .agents/skills/oma-slide/resources/assets/deck-stage.js
 * once the frontend agent delivers task T3.
 */
(function () {
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var DESIGN_W = ${FRAME_W}, DESIGN_H = ${FRAME_H};
  function scale() {
    var scaleX = window.innerWidth / DESIGN_W;
    var scaleY = window.innerHeight / DESIGN_H;
    var s = Math.min(scaleX, scaleY);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.transformOrigin = 'top left';
    stage.style.position = 'fixed';
    stage.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
    stage.style.top = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';
  }
  scale();
  window.addEventListener('resize', scale);
})();
`;

const OMA_SLIDE_ASSETS_RELATIVE = join(
  ".agents",
  "skills",
  "oma-slide",
  "resources",
  "assets",
);

const SENTINEL = "deck-stage.js";

/**
 * Walk upward from `startDir` until we find a directory that contains
 * `.agents/skills/oma-slide/resources/assets/deck-stage.js`, or we reach
 * the filesystem root.  Returns the assets dir path or null.
 */
function walkUpForAssets(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, OMA_SLIDE_ASSETS_RELATIVE);
    if (existsSync(join(candidate, SENTINEL))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Resolve the canonical oma-slide assets directory.
 *
 * For each start dir (in priority order) we walk upward through ancestor
 * directories looking for `.agents/skills/oma-slide/resources/assets/deck-stage.js`.
 * This makes the resolver layout-agnostic: it works whether the cwd is the
 * repo root, `cli/`, `cli/bin/` (bundled), or any deeply nested working dir.
 *
 * Start-dir priority:
 *   1. OMA_HOME env var  — explicit override wins
 *   2. process.cwd()     — user's project root in installed usage
 *   3. dirname(import.meta.url) — module location (source: cli/commands/slide/;
 *                                  bundled: cli/bin/; walks up to repo root either way)
 *   4. os.homedir()      — global ~/.agents install
 *
 * Returns the first assets dir found, or null (caller writes placeholder).
 */
export function resolveAssetsSourceDir(): string | null {
  const startDirs: string[] = [];

  const omaHome = process.env.OMA_HOME;
  if (omaHome) startDirs.push(omaHome);

  startDirs.push(process.cwd());

  try {
    startDirs.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url unavailable in some test runners — skip
  }

  startDirs.push(homedir());

  for (const startDir of startDirs) {
    const found = walkUpForAssets(startDir);
    if (found) return found;
  }
  return null;
}

function copyOrPlaceholder(
  srcDir: string,
  filename: string,
  destPath: string,
  placeholder: string,
): void {
  const srcPath = join(srcDir, filename);
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
  } else {
    writeFileSync(destPath, placeholder, "utf8");
    console.log(
      color.dim(
        `  [TODO] ${filename} not yet available — wrote minimal placeholder.`,
      ),
    );
  }
}

/**
 * Scaffold a new slide working directory.
 */
export async function runSlideNew(opts: {
  dir?: string;
  force?: boolean;
}): Promise<number> {
  const slug = opts.dir ?? "my-deck";
  const workDir = resolve(process.cwd(), slug);

  if (existsSync(workDir)) {
    const entries = readdirSync(workDir);
    if (entries.length > 0 && !opts.force) {
      console.error(
        color.red(`Directory "${workDir}" already exists and is not empty.`),
      );
      console.error(
        color.dim(`  Use --force to overwrite (existing files will be kept).`),
      );
      return 4; // invalid-input
    }
  }

  mkdirSync(workDir, { recursive: true });
  mkdirSync(join(workDir, "assets"), { recursive: true });
  mkdirSync(join(workDir, "out"), { recursive: true });

  // Copy (or write placeholder) fixed-stage assets
  const assetsSourceDir = resolveAssetsSourceDir();
  if (assetsSourceDir) {
    copyOrPlaceholder(
      assetsSourceDir,
      "viewport-base.css",
      join(workDir, "viewport-base.css"),
      PLACEHOLDER_VIEWPORT_BASE_CSS,
    );
    copyOrPlaceholder(
      assetsSourceDir,
      "deck-stage.js",
      join(workDir, "deck-stage.js"),
      PLACEHOLDER_DECK_STAGE_JS,
    );
  } else {
    // Canonical assets not yet delivered by the frontend agent (T3).
    writeFileSync(
      join(workDir, "viewport-base.css"),
      PLACEHOLDER_VIEWPORT_BASE_CSS,
      "utf8",
    );
    writeFileSync(
      join(workDir, "deck-stage.js"),
      PLACEHOLDER_DECK_STAGE_JS,
      "utf8",
    );
    console.log(
      color.dim(
        "  [TODO] Stage assets not found — wrote minimal placeholders.",
      ),
    );
    console.log(
      color.dim(
        "         Run `oma slide new` again after the frontend agent delivers T3.",
      ),
    );
  }

  // Write starter slide
  writeFileSync(join(workDir, "slide-01.html"), DEFAULT_SLIDE_HTML, "utf8");

  // Write meta.json
  const meta: SlideMeta = {
    title: slug,
    order: ["slide-01.html"],
    style: "default",
    density: "balanced",
    speakerNotes: {},
  };
  writeFileSync(
    join(workDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  console.log(color.green(`Created slide workspace: ${workDir}`));
  console.log(color.dim("  slide-01.html   — starter slide (1920×1080 stage)"));
  console.log(color.dim("  assets/         — place local images/video here"));
  console.log(color.dim("  meta.json       — deck config + slide order"));
  console.log(color.dim("  viewport-base.css + deck-stage.js — stage runtime"));
  console.log();
  console.log(
    `Next: author your slide HTML, then run ${color.cyan(`oma slide validate --dir ${slug}`)}`,
  );

  return 0;
}

/**
 * M1: Validate a single order[] entry for path-traversal.
 * Enforced both in parseMeta (at load time) and again in validate.ts
 * assertSafeSlideFile (at render time), as defense-in-depth.
 */
function assertSafeOrderEntry(entry: string): void {
  if (entry.includes("/") || entry.includes("\\") || entry.includes("..")) {
    throw new Error(
      `meta.json order[] entry "${entry}" contains path traversal characters — must be a bare filename.`,
    );
  }
}

function parseMeta(raw: unknown): SlideMeta {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("meta.json must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.order)) {
    throw new Error('meta.json missing required field "order" (array)');
  }
  if (typeof obj.title !== "string") {
    throw new Error('meta.json missing required field "title" (string)');
  }
  return {
    title: obj.title as string,
    order: (obj.order as unknown[]).map((v) => {
      if (typeof v !== "string")
        throw new Error("meta.json order[] must be strings");
      assertSafeOrderEntry(v);
      return v;
    }),
    style: typeof obj.style === "string" ? obj.style : "default",
    density:
      obj.density === "sparse" ||
      obj.density === "balanced" ||
      obj.density === "dense"
        ? obj.density
        : "balanced",
    speakerNotes:
      typeof obj.speakerNotes === "object" &&
      obj.speakerNotes !== null &&
      !Array.isArray(obj.speakerNotes)
        ? (obj.speakerNotes as Record<string, string>)
        : {},
  };
}

/**
 * Resolve and validate an existing slide working directory.
 * Used by validate, viewer, bundle, export, edit subcommands.
 */
export function resolveWorkspace(dir: string): SlideWorkspace {
  const workDir = resolve(process.cwd(), dir);
  if (!existsSync(workDir)) {
    throw new Error(
      `Slide workspace not found: "${workDir}". Run "oma slide new --dir ${dir}" first.`,
    );
  }
  const metaPath = join(workDir, "meta.json");
  if (!existsSync(metaPath)) {
    throw new Error(
      `meta.json not found in "${workDir}". Is this an oma slide workspace?`,
    );
  }
  let meta: SlideMeta;
  try {
    const raw = JSON.parse(readFileSync(metaPath, "utf8")) as unknown;
    meta = parseMeta(raw);
  } catch (err) {
    throw new Error(`Failed to parse meta.json: ${(err as Error).message}`);
  }
  if (meta.order.length === 0) {
    throw new Error('meta.json "order" is empty — add at least one slide.');
  }
  for (const slideFile of meta.order) {
    const slidePath = join(workDir, slideFile);
    if (!existsSync(slidePath)) {
      throw new Error(
        `Slide file listed in meta.json order[] not found: "${slidePath}"`,
      );
    }
  }
  return { dir: workDir, meta, metaPath };
}
