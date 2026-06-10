/**
 * Backup and failure-marker helpers for migration 008.
 */
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { backupPathFromRoot } from "../../../io/backup.js";

// ---------------------------------------------------------------------------
// Backup helpers
// ---------------------------------------------------------------------------

/** Canonical 008 failure-marker path (gitignored under the backup root). */
export function failureMarkerPath(cwd: string): string {
  return backupPathFromRoot(cwd, "008-model-preset", "FAILED");
}

export function writeFailureMarker(cwd: string): void {
  const markerPath = failureMarkerPath(cwd);
  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    writeFileSync(
      markerPath,
      `Migration 008 failed at ${new Date().toISOString()}\n`,
    );
  } catch {
    // best-effort
  }
}

export function backupFile(
  srcPath: string,
  backupDir: string,
  relativeName: string,
): void {
  const destPath = join(backupDir, relativeName);
  mkdirSync(dirname(destPath), { recursive: true });
  try {
    cpSync(srcPath, destPath);
  } catch {
    // best-effort
  }
}
