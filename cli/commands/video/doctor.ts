// `oma video doctor` — real toolchain readiness checks (design 013 §4.2, §6).
// Reports Node / Chromium / FFmpeg presence, Voicebox /health, oma-image
// vendors (via `oma image doctor`), Pixelle (RunningHub key), and Cap, with
// remediation. Exit 0 when the key-free baseline (Node + Chromium + FFmpeg +
// oma-image) is ready; exit 1 otherwise so callers can gate.
import color from "picocolors";
import { installMptProject } from "./internal/mpt-project.js";
import { installPlaywright } from "./internal/playwright-project.js";
import { runReadinessChecks } from "./internal/readiness.js";
import { installRemotionProject } from "./internal/remotion-project.js";

const BASELINE = new Set(["node", "chromium", "ffmpeg", "oma-image"]);

export async function runVideoDoctor({
  opts,
}: {
  opts: Record<string, unknown>;
}): Promise<number> {
  const formatMode = (opts.format as string | undefined) ?? "text";

  // Opt-in, one-time install of the vendored Remotion project's deps. Runs
  // before the readiness table so the report reflects the post-install state.
  if (opts.install === true) {
    const result = await installRemotionProject();
    if (formatMode !== "json") {
      const mark = result.ok ? color.green("✓") : color.yellow("!");
      console.log(`${mark} remotion-project install: ${result.detail}`);
      if (result.dir) console.log(color.dim(`    ${result.dir}`));
    }
  }

  // Opt-in, one-time install of the MoneyPrinterTurbo checkout (clone + venv +
  // deps) into the cache dir OUTSIDE the repo. Never vendored into git.
  if (opts.installMpt === true) {
    const result = await installMptProject();
    if (formatMode !== "json") {
      const mark = result.ok ? color.green("✓") : color.yellow("!");
      console.log(`${mark} mpt-project install: ${result.detail}`);
      if (result.dir) console.log(color.dim(`    ${result.dir}`));
    }
  }

  // Opt-in, one-time install of Playwright (npm i playwright + chromium) into
  // the cache dir OUTSIDE the repo, for the live web-capture branch of demo mode.
  if (opts.installPlaywright === true) {
    const result = await installPlaywright();
    if (formatMode !== "json") {
      const mark = result.ok ? color.green("✓") : color.yellow("!");
      console.log(`${mark} playwright install: ${result.detail}`);
      if (result.dir) console.log(color.dim(`    ${result.dir}`));
    }
  }

  const checks = await runReadinessChecks();

  if (formatMode === "json") {
    console.log(
      JSON.stringify({
        checks: checks.map((c) => ({
          name: c.name,
          ok: c.ok,
          detail: c.detail,
          remediation: c.remediation,
        })),
      }),
    );
  } else {
    console.log(color.bold("\noma video doctor — toolchain readiness\n"));
    const width = Math.max(...checks.map((c) => c.name.length)) + 2;
    for (const check of checks) {
      const mark = check.ok ? color.green("✓") : color.yellow("!");
      const name = check.name.padEnd(width);
      const detail = check.ok
        ? color.dim(check.detail)
        : color.yellow(check.detail);
      console.log(`  ${mark} ${name} ${detail}`);
      if (!check.ok && check.remediation) {
        console.log(`      ${color.cyan("→")} ${check.remediation}`);
      }
    }
    console.log();
  }

  const baselineMissing = checks.filter((c) => BASELINE.has(c.name) && !c.ok);
  if (formatMode !== "json") {
    if (baselineMissing.length === 0) {
      console.log(
        color.green(
          "Key-free baseline ready (Node + Chromium + FFmpeg + oma-image).",
        ),
      );
    } else {
      console.log(
        color.yellow(
          `${baselineMissing.length} baseline dependency(ies) missing: ${baselineMissing
            .map((c) => c.name)
            .join(", ")}.`,
        ),
      );
    }
  }
  return baselineMissing.length > 0 ? 1 : 0;
}
