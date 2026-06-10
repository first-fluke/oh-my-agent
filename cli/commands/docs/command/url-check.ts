import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseOmaConfig } from "../../../platform/agent-config.js";
import type { DocRefsIndex } from "../../../types/docs.js";

const URL_REPORT_FILENAME = "url-drift.json";

/** Resolve the path where background URL drift reports are written. */
export function urlReportPath(repoRoot: string): string {
  return path.join(repoRoot, "docs", "generated", URL_REPORT_FILENAME);
}

/**
 * Read `docs.check_urls` from `.agents/oma-config.yaml`. Defaults to true
 * (URL checking enabled) when the config or field is absent.
 */
export function readCheckUrlsConfig(repoRoot: string): boolean {
  try {
    const cfgPath = path.join(repoRoot, ".agents", "oma-config.yaml");
    if (!fs.existsSync(cfgPath)) return true;
    const yaml = fs.readFileSync(cfgPath, "utf-8");
    const cfg = parseOmaConfig(yaml);
    return cfg?.docs?.check_urls ?? true;
  } catch {
    return true;
  }
}

/** Detect whether `lychee` is on PATH. */
export function hasLychee(): boolean {
  try {
    execSync("lychee --version", {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/** Count URL refs in the index — used to decide whether background spawn is needed. */
export function countUrlRefs(index: DocRefsIndex): number {
  let n = 0;
  for (const doc of index.docs) {
    for (const ref of doc.refs) {
      if (ref.kind === "url") n++;
    }
  }
  return n;
}

/**
 * Detect which files in changedFiles would be excluded by secret-redaction rules.
 * Mirrors the logic in sync-propose.ts for user notification.
 */
/**
 * Build lychee command-line args. Limits scope to the same path glob the
 * verify command was invoked with (or `**​/*.md` when no path was given).
 *
 * Output: lychee `--format json` writes a structured report we save under
 * docs/generated/url-drift.json. Users can also point a CI step at this
 * file to surface URL drift without re-running the check.
 */
export function lycheeArgs(
  pathArg: string | undefined,
  outPath: string,
): string[] {
  const target = pathArg && pathArg.trim() !== "" ? pathArg : "**/*.md";
  return [
    "--format",
    "json",
    "--output",
    outPath,
    // lychee already excludes hidden dirs and gitignored content by default,
    // but explicitly skipping common build outputs avoids surprises.
    "--exclude-path",
    "node_modules",
    "--exclude-path",
    "dist",
    "--exclude-path",
    "coverage",
    target,
  ];
}

/**
 * Detached background lychee. Parent exits without waiting; the child
 * survives via `detached: true` + `unref()`. CI runners may terminate
 * the child group on step exit — use `--urls-sync` instead in that case.
 */
export function spawnLycheeBackground(
  repoRoot: string,
  pathArg: string | undefined,
  outPath: string,
): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const child = spawn("lychee", lycheeArgs(pathArg, outPath), {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

/**
 * Synchronous lychee — used by `--urls-sync` for CI scenarios that need
 * URL drift data alongside the core report.
 */
export function runLycheeSync(
  repoRoot: string,
  pathArg: string | undefined,
  outPath: string,
): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  try {
    execSync(
      `lychee ${lycheeArgs(pathArg, outPath)
        .map((a) => `"${a}"`)
        .join(" ")}`,
      {
        cwd: repoRoot,
        stdio: ["ignore", "ignore", "inherit"],
      },
    );
  } catch {
    // lychee exits non-zero when broken links are found; that's expected.
    // The JSON report is still written, so we don't propagate the error.
  }
}
