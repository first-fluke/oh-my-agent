import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { omaHome } from "../../utils/oma-home.js";
import type { Migration } from "./index.js";

/**
 * Migration 012 — backfill install mode in `_version.json`.
 *
 * Legacy installs (schemaVersion=1) only carry `{ version }`. The current
 * schema (v2) adds `mode: "project" | "global"` so `oma doctor` can
 * distinguish dual installs. This migration infers the mode from the file
 * location and stamps it in:
 *
 *   - `<homedir>/.agents/skills/_version.json` → mode: "global"
 *   - other locations                          → mode: "project"
 *
 * Idempotent: skipped when `mode` is already present or the file is missing.
 * Preserves all other fields (needsReconcile etc.).
 */
function backfill(cwd: string): string[] {
  const actions: string[] = [];
  const versionFile = join(cwd, ".agents", "skills", "_version.json");
  if (!existsSync(versionFile)) return actions;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(versionFile, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return actions;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    typeof parsed.version !== "string"
  ) {
    return actions;
  }

  if (parsed.mode === "project" || parsed.mode === "global") {
    return actions; // already backfilled
  }

  const inferredMode: "project" | "global" =
    cwd === homedir() || cwd === omaHome() ? "global" : "project";

  const next = {
    ...parsed,
    schemaVersion: 2,
    mode: inferredMode,
  };

  try {
    writeFileSync(versionFile, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    actions.push(
      `.agents/skills/_version.json: backfilled mode="${inferredMode}", schemaVersion=2`,
    );
  } catch {
    // best-effort
  }

  return actions;
}

export const migrateVersionInstallMode: Migration = {
  name: "012-version-install-mode",
  up: backfill,
};
