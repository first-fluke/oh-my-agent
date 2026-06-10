import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import color from "picocolors";
import { findChromeExecutable } from "../search/strategies/browser.js";
import { FRAME_H_PX, FRAME_W_PX } from "./validate/constants.js";
import { pxToPt } from "./validate/geometry.js";
import { loadPuppeteer } from "./validate/puppeteer.js";
import {
  assertSafeSlideFile,
  isLocalUrl,
  validateSlide,
} from "./validate/slide-checks.js";
import type {
  IssueCode,
  SlideResult,
  ValidateReport,
} from "./validate/types.js";
import { resolveWorkspace } from "./workspace.js";

// Re-export the public surface that previously lived in this module.
export type { Rect } from "./validate/geometry.js";
export { isOverflowing, isOverlapping, pxToPt } from "./validate/geometry.js";
export { assertSafeSlideFile } from "./validate/slide-checks.js";
export type {
  IssueCode,
  SlideResult,
  ValidateIssue,
  ValidateReport,
} from "./validate/types.js";

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface ValidateOptions {
  dir: string;
  format?: "json" | "concise";
  slide?: string;
  outFile?: string;
}

export async function runSlideValidate(opts: ValidateOptions): Promise<number> {
  // Resolve workspace
  let ws: ReturnType<typeof resolveWorkspace>;
  try {
    ws = resolveWorkspace(opts.dir);
  } catch (err) {
    console.error(color.red((err as Error).message));
    return 4; // invalid-input
  }

  // Load puppeteer
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    console.error(
      color.red("puppeteer-core not installed. Run: bun add puppeteer-core"),
    );
    return 1;
  }

  // Resolve Chrome
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    console.error(
      color.red(
        "Chrome/Chromium not found. Install a Chromium-based browser or set OMA_CHROME_PATH.",
      ),
    );
    return 1;
  }

  // Determine which slides to validate
  const allSlides = ws.meta.order;
  const slidesToValidate = opts.slide
    ? allSlides.filter((s) => s === opts.slide)
    : allSlides;

  if (slidesToValidate.length === 0) {
    console.error(
      color.red(
        opts.slide
          ? `Slide "${opts.slide}" not found in meta.json order[]`
          : "No slides to validate",
      ),
    );
    return 4;
  }

  // M1: validate all slide paths before launching the browser
  for (const slideFile of slidesToValidate) {
    try {
      assertSafeSlideFile(slideFile, ws.dir);
    } catch (err) {
      console.error(color.red((err as Error).message));
      return 4;
    }
  }

  const format = opts.format ?? "concise";
  if (format === "concise") {
    console.log(
      color.bold(
        `Validating ${slidesToValidate.length} slide(s) in "${ws.dir}" …`,
      ),
    );
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const slideResults: SlideResult[] = [];

  try {
    for (const slideFile of slidesToValidate) {
      // assertSafeSlideFile already validated — use direct join here
      const slidePath = join(ws.dir, slideFile);
      if (!existsSync(slidePath)) {
        console.error(color.red(`  Slide not found: ${slidePath}`));
        slideResults.push({
          file: slideFile,
          status: "fail",
          issues: [
            {
              code: "no_overflowing_text",
              message: `Slide file not found on disk: ${slideFile}`,
              slide: slideFile,
            },
          ],
        });
        continue;
      }

      const page = await browser.newPage();
      await page.setViewport({ width: FRAME_W_PX, height: FRAME_H_PX });

      // Intercept requests — block non-local network (offline render context)
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (isLocalUrl(url, ws.dir)) {
          req.continue().catch(() => {});
        } else {
          req.abort().catch(() => {});
        }
      });

      const fileUrl = `file://${slidePath.replace(/\\/g, "/")}`;

      try {
        const result = await validateSlide(page, slideFile, fileUrl);
        slideResults.push(result);
        if (format === "concise") {
          const icon =
            result.status === "pass" ? color.green("✓") : color.red("✗");
          const issueCount = result.issues.length;
          console.log(
            `  ${icon} ${slideFile}${issueCount > 0 ? color.dim(` (${issueCount} issue(s))`) : ""}`,
          );
          for (const issue of result.issues) {
            const isWarning = issue.code === "remote_asset_ref";
            const bullet = isWarning ? color.yellow("  ⚠") : color.red("  ✗");
            console.log(`${bullet} [${issue.code}] ${issue.message}`);
            if (issue.selector) {
              console.log(color.dim(`      selector: ${issue.selector}`));
            }
          }
        }
      } catch (err) {
        console.error(
          color.red(
            `  Error validating ${slideFile}: ${(err as Error).message}`,
          ),
        );
        slideResults.push({
          file: slideFile,
          status: "fail",
          issues: [
            {
              code: "no_overflowing_text",
              message: `Validation error: ${(err as Error).message}`,
              slide: slideFile,
            },
          ],
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  // Build report
  const criticalCodes: IssueCode[] = [
    "no_overflowing_text",
    "no_overlapping_text",
    "slide_sized_text",
  ];
  const allIssues = slideResults.flatMap((s) => s.issues);
  const criticalIssues = allIssues.filter((i) =>
    criticalCodes.includes(i.code),
  ).length;
  const warnings = allIssues.filter(
    (i) => i.code === "remote_asset_ref",
  ).length;
  const failedSlides = slideResults.filter((s) => s.status === "fail").length;

  const report: ValidateReport = {
    generatedAt: new Date().toISOString(),
    frame: {
      widthPt: pxToPt(FRAME_W_PX),
      heightPt: pxToPt(FRAME_H_PX),
      widthPx: FRAME_W_PX,
      heightPx: FRAME_H_PX,
    },
    summary: {
      totalSlides: slideResults.length,
      passedSlides: slideResults.length - failedSlides,
      failedSlides,
      criticalIssues,
      warnings,
    },
    slides: slideResults,
  };

  if (format === "json") {
    const json = JSON.stringify(report, null, 2);
    if (opts.outFile) {
      mkdirSync(join(ws.dir, "out"), { recursive: true });
      const outPath = opts.outFile.startsWith("/")
        ? opts.outFile
        : join(ws.dir, "out", opts.outFile);
      writeFileSync(outPath, json, "utf8");
      console.log(color.dim(`Validation report written to: ${outPath}`));
    } else {
      console.log(json);
    }
  } else {
    console.log();
    if (criticalIssues === 0 && warnings === 0) {
      console.log(
        color.green(`All ${slideResults.length} slide(s) passed validation.`),
      );
    } else {
      if (criticalIssues > 0) {
        console.log(
          color.red(
            `${failedSlides}/${slideResults.length} slide(s) failed — ${criticalIssues} critical issue(s).`,
          ),
        );
      }
      if (warnings > 0) {
        console.log(
          color.yellow(
            `${warnings} warning(s) — remote asset reference(s) found.`,
          ),
        );
      }
    }
  }

  // Exit non-zero when criticalIssues > 0 — gates CI / auto-fix loop
  return criticalIssues > 0 ? 1 : 0;
}
