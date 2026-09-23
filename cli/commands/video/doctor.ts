// `oma video doctor` — real toolchain readiness checks (design 013 §4.2, §6).
// Reports Node / Chromium / FFmpeg presence, Voicebox /health, oma-image
// vendors (via `oma image doctor`), Pixelle (RunningHub key), and Cap, with
// remediation. Exit 0 when the key-free baseline (Node + Chromium + FFmpeg +
// oma-image) is ready; exit 1 otherwise so callers can gate.
import color from "picocolors";
import { loadVideoConfig } from "./config.js";
import {
  ensureHyperframesSkills,
  ensureLatestToolchain,
} from "./internal/hyperframes-workspace.js";
import { installMptProject } from "./internal/mpt-project.js";
import { runReadinessChecks } from "./internal/readiness.js";
import { installStrudelProject } from "./internal/strudel-project.js";

const BASELINE = new Set([
  "node",
  "hyperframes-toolchain",
  "ffmpeg",
  "ffprobe",
  "oma-image",
]);

export async function runVideoDoctor({
  opts,
}: {
  opts: Record<string, unknown>;
}): Promise<number> {
  const formatMode = (opts.format as string | undefined) ?? "text";

  // Always-latest Hyperframes toolchain + heygen-com/hyperframes. `--install` warms
  // the cache (fresh machines); `--upgrade` forces a latest check now. Both
  // are idempotent — `oma video compose` does the same per run.
  if (opts.install === true || opts.upgrade === true) {
    const policy = (await loadVideoConfig()).hyperframes;
    const tc = await ensureLatestToolchain({
      checkIntervalMin: policy.checkIntervalMin,
      force: opts.upgrade === true,
    });
    const skills = await ensureHyperframesSkills({
      checkIntervalMin: policy.checkIntervalMin,
      force: opts.upgrade === true,
    });
    if (formatMode !== "json") {
      if (tc) {
        const mark = tc.browserReady ? color.green("✓") : color.yellow("!");
        console.log(
          `${mark} hyperframes-toolchain: ${tc.version} (${tc.status}${tc.note ? `, ${tc.note}` : ""})${tc.browserReady ? "" : " — headless shell missing"}${tc.fontReady ? "" : " — font missing"}`,
        );
        console.log(color.dim(`    ${tc.dir}`));
      } else {
        console.log(
          `${color.yellow("!")} hyperframes-toolchain: could not fetch the latest hyperframes (offline?) and nothing is cached`,
        );
      }
      if (skills) {
        console.log(
          `${color.green("✓")} hyperframes-skills: ${skills.ref} (${skills.status}${skills.note ? `, ${skills.note}` : ""}), ${Object.keys(skills.skills).length} skills`,
        );
      } else {
        console.log(
          `${color.yellow("!")} hyperframes-skills: could not fetch heygen-com/hyperframes and nothing is cached`,
        );
      }
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

  // Opt-in, one-time install of the vendored Strudel BGM renderer's deps.
  // Explicit by design: `@strudel/*` is AGPL-3.0-or-later, so it is never
  // installed implicitly and never bundled with the MIT-licensed CLI.
  if (opts.installStrudel === true) {
    const result = await installStrudelProject();
    if (formatMode !== "json") {
      const mark = result.ok ? color.green("✓") : color.yellow("!");
      console.log(`${mark} strudel install: ${result.detail}`);
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
          "Key-free baseline ready (Node + HyperFrames/Chrome + FFmpeg/FFprobe + oma-image).",
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
