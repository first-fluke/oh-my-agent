/**
 * import-pptx.ts — oma slide import-pptx <file.pptx> --dir
 *
 * Best-effort .pptx → per-slide HTML scaffolds, in pure TypeScript.
 *
 * Parsing is delegated to the `officeparser` CLI (MIT, actively maintained),
 * run on demand via `bunx` — officeparser is intentionally NOT a declared
 * dependency, so its heavy transitive deps (pdfjs-dist, tesseract.js) are only
 * fetched + cached by bunx when a user actually imports a deck. Its default
 * (no --format) output is the full AST as JSON; the top-level `slide` nodes
 * carry a 1-based `slideNumber` and `paragraph` children — we map one slide
 * node to one `slide-NN.html` in the canonical DOM
 * (.deck-viewport > .deck-stage > .slide).
 *
 * Security / robustness:
 *   - File size capped at 50 MB (statSync gate before parse).
 *   - officeparser parses OOXML with @xmldom/xmldom (no external-entity/DTD
 *     network fetches) — not vulnerable to classic XXE.
 *   - Input path validated against traversal before use.
 *
 * Graceful degradation:
 *   - bunx/officeparser unavailable (offline, no runner) → clear hint + exit 0
 *     (graceful skip, not a hard fail).
 *
 * Output (best-effort / lossy — TEXT ONLY; layout, fonts, colors, images NOT preserved):
 *   - <dir>/slide-NN.html  (first paragraph → <h1>, remaining → <p>)
 *   - <dir>/{viewport-base.css, deck-stage.js}  (copied from skill resources)
 *   - <dir>/meta.json  (order[] + per-slide speaker notes when present)
 *
 * Exit codes: 0 ok (incl. graceful skip) · 1 error · 4 invalid-input
 */

import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import color from "picocolors";
import { resolveAssetsSourceDir } from "./workspace.js";

const MAX_PPTX_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── officeparser via bunx (on-demand CLI, NOT a declared dependency) ────────

interface OfficeNode {
  type?: string;
  text?: string;
  value?: string;
  slideNumber?: number;
  children?: OfficeNode[];
  content?: OfficeNode[];
}

interface OfficeAst {
  content?: OfficeNode[];
}

interface ParseResult {
  ok: boolean;
  ast?: OfficeAst;
  error?: string;
}

/**
 * Parse a .pptx by shelling out to the `officeparser` CLI via `bunx`. The
 * default (no --format) output is the full AST as JSON on stdout.
 */
function parsePptxViaCli(pptxPath: string): Promise<ParseResult> {
  return new Promise((res) => {
    const child = spawn("bunx", ["officeparser", pptxPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", (err) => res({ ok: false, error: err.message }));
    child.on("close", (code) => {
      if (code !== 0) {
        res({ ok: false, error: stderr.trim() || `exit ${code}` });
        return;
      }
      try {
        res({ ok: true, ast: JSON.parse(stdout) as OfficeAst });
      } catch (e) {
        res({
          ok: false,
          error: `invalid JSON from officeparser: ${(e as Error).message}`,
        });
      }
    });
  });
}

// ─── Input validation ────────────────────────────────────────────────────────

function validatePptxPath(filePath: string): { ok: boolean; reason?: string } {
  if (!filePath?.trim()) {
    return { ok: false, reason: "File path is empty." };
  }
  if (filePath.includes("..") && !filePath.startsWith("/")) {
    return {
      ok: false,
      reason: `Path "${filePath}" contains traversal sequences.`,
    };
  }
  if (!/\.pptx$/i.test(filePath)) {
    return {
      ok: false,
      reason: `File "${filePath}" does not have a .pptx extension.`,
    };
  }
  return { ok: true };
}

// ─── AST → slides ─────────────────────────────────────────────────────────────

interface ExtractedSlide {
  slideNumber: number;
  /** Paragraph texts in document order; [0] is treated as the heading. */
  lines: string[];
}

/** Collect paragraph texts under a slide node (document order). */
function collectParagraphs(node: OfficeNode): string[] {
  const out: string[] = [];
  const walk = (n: OfficeNode | undefined): void => {
    if (!n) return;
    if (n.type === "paragraph") {
      const t = (n.text ?? n.value ?? "").toString().trim();
      if (t) out.push(t);
      return; // paragraph text already aggregates its child runs
    }
    for (const c of n.children ?? n.content ?? []) walk(c);
  };
  for (const c of node.children ?? node.content ?? []) walk(c);
  // Fallback: a slide node may carry text directly.
  if (out.length === 0) {
    const t = (node.text ?? "").toString().trim();
    if (t) out.push(t);
  }
  return out;
}

function extractSlides(ast: OfficeAst): {
  slides: ExtractedSlide[];
  notes: Map<number, string>;
} {
  const slides: ExtractedSlide[] = [];
  const notes = new Map<number, string>();
  let fallbackNum = 0;

  for (const node of ast.content ?? []) {
    if (node.type === "slide") {
      fallbackNum += 1;
      slides.push({
        slideNumber: node.slideNumber ?? fallbackNum,
        lines: collectParagraphs(node),
      });
    } else if (node.type === "note") {
      const num = node.slideNumber ?? fallbackNum;
      const text = collectParagraphs(node).join("\n").trim();
      if (text) notes.set(num, text);
    }
  }
  return { slides, notes };
}

// ─── HTML generation ────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSlideHtml(lines: string[]): string {
  const [heading, ...rest] = lines;
  const headingHtml = heading
    ? `      <h1 style="font-size: 96px; line-height: 1.1;">${escapeHtml(heading)}</h1>\n`
    : "";
  const bodyHtml = rest
    .map(
      (l) =>
        `      <p style="font-size: 40px; line-height: 1.4;">${escapeHtml(l)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="./viewport-base.css" />
</head>
<body>
  <div class="deck-viewport">
    <div class="deck-stage">
      <section class="slide" data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text" style="display: flex; flex-direction: column; justify-content: center; gap: 32px; padding: 96px;">
${headingHtml}${bodyHtml}
      </section>
    </div>
  </div>
  <script src="./deck-stage.js"></script>
</body>
</html>
`;
}

function copyStageAssets(outDir: string): boolean {
  const assetsDir = resolveAssetsSourceDir();
  if (!assetsDir) return false;
  let copied = false;
  for (const file of ["viewport-base.css", "deck-stage.js"]) {
    const src = join(assetsDir, file);
    if (existsSync(src)) {
      copyFileSync(src, join(outDir, file));
      copied = true;
    }
  }
  return copied;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface ImportPptxOptions {
  file: string;
  dir?: string;
}

export async function runSlideImportPptx(
  opts: ImportPptxOptions,
): Promise<number> {
  const { file } = opts;

  const validation = validatePptxPath(file);
  if (!validation.ok) {
    console.error(color.red(`Invalid input: ${validation.reason}`));
    return 4;
  }

  const pptxPath = file.startsWith("/") ? file : resolve(process.cwd(), file);
  if (!existsSync(pptxPath)) {
    console.error(color.red(`PPTX file not found: "${pptxPath}"`));
    return 4;
  }

  const size = statSync(pptxPath).size;
  if (size > MAX_PPTX_BYTES) {
    console.error(
      color.red(
        `PPTX file is ${(size / 1024 / 1024).toFixed(1)} MB — exceeds the 50 MB import cap.`,
      ),
    );
    return 4;
  }

  // Resolve output dir (default: pptx filename stem)
  const outDir = opts.dir
    ? opts.dir.startsWith("/")
      ? opts.dir
      : resolve(process.cwd(), opts.dir)
    : resolve(
        process.cwd(),
        file.replace(/\.pptx$/i, "").replace(/.*[/\\]/, "") || "imported-deck",
      );

  console.log(color.bold(`Importing PPTX: ${pptxPath}`));
  console.log(color.dim(`  Output directory: ${outDir}`));
  console.log(
    color.dim(
      "  Best-effort import: text extracted; layout/fonts/images NOT preserved.",
    ),
  );

  // Parse via the officeparser CLI (bunx, on demand — not a declared dep)
  const parsed = await parsePptxViaCli(pptxPath);
  if (!parsed.ok || !parsed.ast) {
    console.warn(
      color.yellow(
        `\n  Could not read the .pptx via 'bunx officeparser': ${parsed.error ?? "unknown error"}`,
      ),
    );
    console.warn(
      color.dim(
        "  import-pptx runs the officeparser CLI on demand (no install needed) —",
      ),
    );
    console.warn(
      color.dim("  ensure 'bunx' + npm network access are available."),
    );
    console.log(color.yellow("\n  Graceful skip — no slides were extracted."));
    return 0;
  }

  const { slides, notes } = extractSlides(parsed.ast);
  if (slides.length === 0) {
    console.warn(
      color.yellow(
        "\n  No slide text extracted (deck may be image-only). Nothing written.",
      ),
    );
    return 0;
  }

  mkdirSync(outDir, { recursive: true });
  if (!copyStageAssets(outDir)) {
    console.warn(
      color.yellow(
        "  Stage assets not found — run `oma slide new --dir <dir> --force` to add viewport-base.css / deck-stage.js.",
      ),
    );
  }

  const order: string[] = [];
  const speakerNotes: Record<string, string> = {};
  slides.forEach((slide, idx) => {
    const fileName = `slide-${String(idx + 1).padStart(2, "0")}.html`;
    writeFileSync(join(outDir, fileName), buildSlideHtml(slide.lines), "utf8");
    order.push(fileName);
    const note = notes.get(slide.slideNumber);
    if (note) speakerNotes[fileName] = note;
    console.log(
      color.green(`  ✓ ${fileName}`) +
        color.dim(` (${slide.lines.length} text block(s))`),
    );
  });

  const meta = {
    title: file.replace(/\.pptx$/i, "").replace(/.*[/\\]/, ""),
    order,
    style: "imported",
    density: "reading-first",
    speakerNotes,
  };
  writeFileSync(
    join(outDir, "meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );

  console.log(
    color.green(`\nImport complete: ${order.length} slide(s) → ${outDir}`),
  );
  console.log();
  console.log(color.bold("Next steps:"));
  console.log(`  1. Restyle the extracted slides (text-only, lossy import).`);
  console.log(
    `  2. Validate: ${color.cyan(`oma slide validate --dir ${outDir}`)}`,
  );
  console.log(
    `  3. Preview: ${color.cyan(`oma slide viewer --dir ${outDir}`)}`,
  );
  return 0;
}
