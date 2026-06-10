import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupPathFromRoot } from "../../../io/backup.js";

export type BackendStackState = {
  stackBackupDir: string;
  backendStackDir: string;
  hasBackendStack: boolean;
  hasLegacyFiles: boolean;
};

/**
 * Capture (and back up) the oma-backend stack state before the bulk
 * `.agents` copy overwrites it.
 */
export function captureBackendStackBeforeCopy(
  cwd: string,
  force: boolean,
): BackendStackState {
  // Preserve stack/ directories (user-generated or preset).
  // Lands under the canonical gitignored backup root; survives the bulk
  // .agents/ cpSync below (cpSync overwrites, never prunes) and is cleared
  // with the rest of the backup root after a successful update.
  const stackBackupDir = backupPathFromRoot(cwd, "stack");
  const backendStackDir = join(
    cwd,
    ".agents",
    "skills",
    "oma-backend",
    "stack",
  );
  const hasBackendStack = !force && existsSync(backendStackDir);
  if (hasBackendStack) {
    mkdirSync(stackBackupDir, { recursive: true });
    cpSync(backendStackDir, join(stackBackupDir, "oma-backend"), {
      recursive: true,
    });
  }

  // Detect legacy Python resources BEFORE cpSync overwrites them
  // (new source moves these files to variants/python/, so they won't exist after copy)
  const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
  const backendResourcesDir = join(
    cwd,
    ".agents",
    "skills",
    "oma-backend",
    "resources",
  );
  const hasLegacyFiles =
    !force &&
    !hasBackendStack &&
    legacyFiles.some((f) => existsSync(join(backendResourcesDir, f)));

  return { stackBackupDir, backendStackDir, hasBackendStack, hasLegacyFiles };
}

/**
 * Restore the oma-backend stack after the bulk `.agents` copy: restore the
 * stack backup, migrate legacy Python resources, and clean up variants/.
 */
export function restoreBackendStackAfterCopy(
  cwd: string,
  repoDir: string,
  state: BackendStackState,
): void {
  const { stackBackupDir, backendStackDir, hasBackendStack, hasLegacyFiles } =
    state;

  // Restore stack/ directories
  if (hasBackendStack) {
    try {
      mkdirSync(backendStackDir, { recursive: true });
      cpSync(join(stackBackupDir, "oma-backend"), backendStackDir, {
        recursive: true,
        force: true,
      });
    } finally {
      rmSync(stackBackupDir, { recursive: true, force: true });
    }
  }

  // Migrate legacy Python resources to stack/ (one-time)
  // hasLegacyFiles was captured before cpSync (old resources/ had Python files)
  // Read variant from repoDir (source temp dir), not cwd (already overwritten)
  if (hasLegacyFiles) {
    const variantPythonDir = join(
      repoDir,
      ".agents",
      "skills",
      "oma-backend",
      "variants",
      "python",
    );
    if (existsSync(variantPythonDir)) {
      mkdirSync(backendStackDir, { recursive: true });
      cpSync(variantPythonDir, backendStackDir, {
        recursive: true,
        force: true,
      });
      writeFileSync(
        join(backendStackDir, "stack.yaml"),
        "language: python\nframework: fastapi\norm: sqlalchemy\nsource: migrated\n",
      );
    }
  }

  // Clean up variants/ from user project (not needed at runtime)
  // Must run AFTER migration (which reads from repoDir, not cwd)
  const backendVariantsDir = join(
    cwd,
    ".agents",
    "skills",
    "oma-backend",
    "variants",
  );
  if (existsSync(backendVariantsDir)) {
    rmSync(backendVariantsDir, { recursive: true, force: true });
  }
}
