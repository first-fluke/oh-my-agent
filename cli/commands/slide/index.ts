import type { Command } from "commander";
import color from "picocolors";
import { runSlideBundle } from "./bundle.js";
import { runSlideDoctor } from "./doctor.js";
import { runSlideEdit } from "./editor/server.js";
import { runSlidePdf } from "./export/pdf.js";
import { runSlidePng } from "./export/png.js";
import { runSlidePptx } from "./export/pptx.js";
import { runSlideFetchVideo } from "./fetch-video.js";
import { runSlideImportPptx } from "./import-pptx.js";
import { runStylesGet, runStylesList, runStylesPreview } from "./styles.js";
import { runSlideValidate } from "./validate.js";
import { runSlideViewer } from "./viewer.js";
import { runSlideNew } from "./workspace.js";

export function registerSlideCommand(program: Command): void {
  const slide = program
    .command("slide")
    .description(
      "HTML presentation toolkit — scaffold, validate, export, and edit 1920×1080 slide decks",
    )
    .alias("sl");

  // ── new ────────────────────────────────────────────────────────────────────
  slide
    .command("new")
    .description(
      "Scaffold a new slide working directory with starter HTML, assets/, and meta.json",
    )
    .option(
      "--dir <slug>",
      "Working directory name (default: my-deck)",
      "my-deck",
    )
    .option("--force", "Overwrite existing directory without confirmation")
    .action(async (opts: { dir?: string; force?: boolean }) => {
      try {
        const code = await runSlideNew({ dir: opts.dir, force: opts.force });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── validate ───────────────────────────────────────────────────────────────
  slide
    .command("validate")
    .description(
      "Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size",
    )
    .requiredOption("--dir <path>", "Slide working directory")
    .option(
      "--format <fmt>",
      "Output format: json | concise (default: concise)",
      "concise",
    )
    .option(
      "--slide <file>",
      "Validate a single slide file (e.g. slide-01.html)",
    )
    .option(
      "--out <file>",
      "Write JSON report to file (only with --format json)",
    )
    .action(
      async (opts: {
        dir: string;
        format?: string;
        slide?: string;
        out?: string;
      }) => {
        const format =
          opts.format === "json" || opts.format === "concise"
            ? opts.format
            : "concise";
        try {
          const code = await runSlideValidate({
            dir: opts.dir,
            format,
            slide: opts.slide,
            outFile: opts.out,
          });
          process.exitCode = code;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  // ── viewer ─────────────────────────────────────────────────────────────────
  slide
    .command("viewer")
    .description(
      "Build viewer.html (deck-stage web component + presenter view)",
    )
    .requiredOption("--dir <path>", "Slide working directory")
    .action(async (opts: { dir: string }) => {
      try {
        const code = await runSlideViewer({ dir: opts.dir });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── bundle ─────────────────────────────────────────────────────────────────
  slide
    .command("bundle")
    .description(
      "Merge per-slide files into a single self-contained .html deliverable",
    )
    .requiredOption("--dir <path>", "Slide working directory")
    .option("--out <file>", "Output file (default: out/deck.html)")
    .option("--inline-fonts", "Inline font face declarations into the bundle")
    .action(
      async (opts: { dir: string; out?: string; inlineFonts?: boolean }) => {
        try {
          const code = await runSlideBundle({
            dir: opts.dir,
            out: opts.out,
            inlineFonts: opts.inlineFonts,
          });
          process.exitCode = code;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  // ── pdf ────────────────────────────────────────────────────────────────────
  slide
    .command("pdf")
    .description("Export slides to PDF via puppeteer-core")
    .requiredOption("--dir <path>", "Slide working directory")
    .option("--out <file>", "Output PDF file (default: out/deck.pdf)")
    .option(
      "--mode <mode>",
      "Export mode: capture (screenshot) | print (CSS print) (default: capture)",
      "capture",
    )
    .action(async (opts: { dir: string; out?: string; mode?: string }) => {
      const mode =
        opts.mode === "capture" || opts.mode === "print"
          ? opts.mode
          : "capture";
      try {
        const code = await runSlidePdf({ dir: opts.dir, out: opts.out, mode });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── png ────────────────────────────────────────────────────────────────────
  slide
    .command("png")
    .description("Export each slide as a PNG image via puppeteer-core")
    .requiredOption("--dir <path>", "Slide working directory")
    .option("--out-dir <dir>", "Output directory (default: out/png/)")
    .option(
      "--resolution <res>",
      "Resolution preset: 720p | 1080p | 1440p | 2160p | 4k (default: 1080p)",
      "1080p",
    )
    .action(
      async (opts: { dir: string; outDir?: string; resolution?: string }) => {
        try {
          const code = await runSlidePng({
            dir: opts.dir,
            outDir: opts.outDir,
            resolution: opts.resolution,
          });
          process.exitCode = code;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  // ── pptx ───────────────────────────────────────────────────────────────────
  slide
    .command("pptx")
    .description(
      "[EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized)",
    )
    .requiredOption("--dir <path>", "Slide working directory")
    .option("--out <file>", "Output PPTX file (default: out/deck.pptx)")
    .action(async (opts: { dir: string; out?: string }) => {
      try {
        const code = await runSlidePptx({ dir: opts.dir, out: opts.out });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── import-pptx ────────────────────────────────────────────────────────────
  slide
    .command("import-pptx <file>")
    .description(
      "Import a .pptx file into slide fragments via officeparser (bunx, best-effort)",
    )
    .option("--dir <path>", "Output working directory (default: ./<pptx-name>)")
    .action(async (file: string, opts: { dir?: string }) => {
      try {
        const code = await runSlideImportPptx({ file, dir: opts.dir });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── fetch-video ────────────────────────────────────────────────────────────
  slide
    .command("fetch-video <url>")
    .description("Download video via yt-dlp into ./assets/ and print local ref")
    .option("--dir <path>", "Slide working directory")
    .option("--output-name <name>", "Override the output filename")
    .action(
      async (url: string, opts: { dir?: string; outputName?: string }) => {
        try {
          const code = await runSlideFetchVideo({
            url,
            dir: opts.dir,
            outputName: opts.outputName,
          });
          process.exitCode = code;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  // ── edit ───────────────────────────────────────────────────────────────────
  slide
    .command("edit")
    .description(
      "Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner)",
    )
    .requiredOption("--dir <path>", "Slide working directory")
    .option("--port <n>", "Port to bind (default: auto-probe from 3737)", "0")
    .action(async (opts: { dir: string; port?: string }) => {
      try {
        const portNum = opts.port ? Number.parseInt(opts.port, 10) : 0;
        const code = await runSlideEdit({ dir: opts.dir, port: portNum });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── styles ─────────────────────────────────────────────────────────────────
  const styles = slide
    .command("styles")
    .description("Browse and fetch design style presets");

  styles
    .command("list")
    .description(
      "List available style presets (vendored + bold-template index)",
    )
    .action(async () => {
      try {
        const code = await runStylesList();
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  styles
    .command("preview <slug>")
    .description("Preview a style preset in the terminal")
    .action(async (slug: string) => {
      try {
        const code = await runStylesPreview(slug);
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  styles
    .command("get <slug>")
    .description(
      "Fetch a bold template design.md (always-latest main; cached for offline fallback)",
    )
    .option("--refresh", "Force re-fetch ignoring local cache")
    .action(async (slug: string, opts: { refresh?: boolean }) => {
      try {
        const code = await runStylesGet({ slug, refresh: opts.refresh });
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  // ── doctor ─────────────────────────────────────────────────────────────────
  slide
    .command("doctor")
    .description("Probe system Chrome, yt-dlp, and the pptxgenjs optional dep")
    .action(async () => {
      try {
        const code = await runSlideDoctor();
        process.exitCode = code;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });
}
