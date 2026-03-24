import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promptUninstallCompetitors } from "../lib/competitors.js";
import {
  fetchRemoteManifest,
  getLocalVersion,
  saveLocalVersion,
} from "../lib/manifest.js";
import { migrateSharedLayout, migrateToAgents } from "../lib/migrate.js";
import {
  createCliSymlinks,
  detectExistingCliSymlinkDirs,
  getInstalledSkillNames,
  installVendorAdaptations,
} from "../lib/skills.js";
import { downloadAndExtract } from "../lib/tarball.js";

/** Thin UI abstraction: interactive (@clack/prompts) vs CI (plain console) */
function createUI(ci: boolean) {
  if (!ci) {
    return {
      intro: (msg: string) => p.intro(msg),
      outro: (msg: string) => p.outro(msg),
      note: (msg: string, title?: string) => p.note(msg, title),
      logError: (msg: string) => p.log.error(msg),
      spinnerStart: (msg: string) => {
        const s = p.spinner();
        s.start(msg);
        return s;
      },
    };
  }
  const noop = {
    start(_msg: string) {},
    stop(msg?: string) {
      if (msg) console.log(msg);
    },
    message(msg: string) {
      console.log(msg);
    },
  };
  return {
    intro: (msg: string) => console.log(msg),
    outro: (msg: string) => console.log(msg),
    note: (msg: string, _title?: string) => console.log(msg),
    logError: (msg: string) => console.error(msg),
    spinnerStart: (msg: string) => {
      console.log(msg);
      return noop;
    },
  };
}

export async function update(force = false, ci = false): Promise<void> {
  if (!ci && process.stdout.isTTY) console.clear();

  const ui = createUI(ci);
  ui.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent update ")));

  const cwd = process.cwd();

  // Auto-migrate from legacy .agent/ to .agents/
  const migrations = migrateToAgents(cwd);
  if (migrations.length > 0) {
    ui.note(
      migrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
      "Migration",
    );
  }

  // Detect and offer to remove competing tools (skip in CI — no stdin)
  if (!ci) {
    await promptUninstallCompetitors(cwd);
  }

  let spinner: ReturnType<typeof ui.spinnerStart> | undefined;

  try {
    spinner = ui.spinnerStart("Checking for updates...");

    const remoteManifest = await fetchRemoteManifest();
    const localVersion = await getLocalVersion(cwd);

    if (localVersion === remoteManifest.version) {
      const sharedLayoutMigrations = migrateSharedLayout(cwd);
      if (sharedLayoutMigrations.length > 0) {
        ui.note(
          sharedLayoutMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
          "Shared layout migration",
        );
      }
      spinner.stop(pc.green("Already up to date!"));
      ui.outro(`Current version: ${pc.cyan(localVersion)}`);
      return;
    }

    spinner.message(`Downloading ${pc.cyan(remoteManifest.version)}...`);

    const { dir: repoDir, cleanup } = await downloadAndExtract();

    try {
      spinner.message("Copying files...");

      // Preserve user-customized config files before bulk copy
      const userPrefsPath = join(
        cwd,
        ".agents",
        "config",
        "user-preferences.yaml",
      );
      const mcpPath = join(cwd, ".agents", "mcp.json");
      const savedUserPrefs =
        !force && existsSync(userPrefsPath)
          ? readFileSync(userPrefsPath)
          : null;
      const savedMcp =
        !force && existsSync(mcpPath) ? readFileSync(mcpPath) : null;

      // Preserve stack/ directories (user-generated or preset)
      const stackBackupDir = join(tmpdir(), `oma-stack-backup-${Date.now()}`);
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

      cpSync(join(repoDir, ".agents"), join(cwd, ".agents"), {
        recursive: true,
        force: true,
      });

      // Restore user-customized config files
      if (savedUserPrefs) writeFileSync(userPrefsPath, savedUserPrefs);
      if (savedMcp) writeFileSync(mcpPath, savedMcp);

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

      // Shared layout migration (core/, conditional/, runtime/)
      const sharedLayoutMigrations = migrateSharedLayout(cwd);
      if (sharedLayoutMigrations.length > 0) {
        ui.note(
          sharedLayoutMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
          "Shared layout migration",
        );
      }

      await saveLocalVersion(cwd, remoteManifest.version);

      // Always update all vendor adaptations (hooks, settings, CLAUDE.md)
      installVendorAdaptations(repoDir, cwd, [
        "claude",
        "codex",
        "gemini",
        "qwen",
      ]);

      const cliTools = detectExistingCliSymlinkDirs(cwd);

      spinner.stop(`Updated to version ${pc.cyan(remoteManifest.version)}!`);

      if (cliTools.length > 0) {
        const skillNames = getInstalledSkillNames(cwd);
        if (skillNames.length > 0) {
          const { created } = createCliSymlinks(cwd, cliTools, skillNames);
          if (created.length > 0) {
            ui.note(
              created.map((s) => `${pc.green("→")} ${s}`).join("\n"),
              "Symlinks updated",
            );
          }
        }
      }

      ui.outro(
        `${remoteManifest.metadata?.totalFiles ?? 0} files updated successfully`,
      );
    } finally {
      cleanup();
    }
  } catch (error) {
    spinner?.stop("Update failed");
    ui.logError(error instanceof Error ? error.message : String(error));
    if (ci) {
      throw error;
    }
    process.exit(1);
  }
}
