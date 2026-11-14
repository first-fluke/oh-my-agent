import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { backupPathFromRoot } from "../../io/backup.js";
import {
  barePresetStubLanguage,
  type SeededStackSource,
  seededStackManifest,
} from "../../platform/skills-installer/stack-manifest.js";

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
  //
  // Those resources described a FastAPI project and are gone by now. The
  // shipped Python variant describes another framework, so its reference files
  // are not copied: only the manifest is written, naming the framework the
  // project was built on and keeping the variant's verify contract.
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
      writeFileSync(
        join(backendStackDir, "stack.yaml"),
        manifestForEarlierInstall(variantPythonDir, "python", "migrated"),
      );
    }
  }

  // An older installer replaced the preset's manifest with a two-line stub,
  // which leaves `oma verify agent backend` with no checks to run. Restore the
  // variant's manifest for a stub that was never edited; a customized or
  // generated manifest is the user's and stays as it is.
  repairBarePresetStub(backendStackDir, repoDir);

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

function repairBarePresetStub(backendStackDir: string, repoDir: string): void {
  const manifestPath = join(backendStackDir, "stack.yaml");
  if (!existsSync(manifestPath)) return;
  let language: string | null;
  try {
    language = barePresetStubLanguage(readFileSync(manifestPath, "utf-8"));
  } catch {
    return;
  }
  if (!language) return;
  const variantDir = join(
    repoDir,
    ".agents",
    "skills",
    "oma-backend",
    "variants",
    language,
  );
  if (!existsSync(join(variantDir, "stack.yaml"))) return;
  writeFileSync(
    manifestPath,
    manifestForEarlierInstall(variantDir, language, "preset"),
  );
}

/**
 * The framework a variant shipped with before its preset changed. A project
 * installed in that era was built on it and still holds that era's reference
 * files in stack/, so a manifest rebuilt for it must not adopt the new one.
 */
const FRAMEWORK_OF_EARLIER_PRESET: Record<string, string> = {
  python: "fastapi",
};

/**
 * The variant manifest for a project installed before this version: the
 * current verify contract, with the framework that install was seeded from.
 */
function manifestForEarlierInstall(
  variantDir: string,
  language: string,
  source: SeededStackSource,
): string {
  const manifest = seededStackManifest(variantDir, language, source);
  const framework = FRAMEWORK_OF_EARLIER_PRESET[language];
  return framework
    ? manifest.replace(/^framework:.*$/m, `framework: ${framework}`)
    : manifest;
}
