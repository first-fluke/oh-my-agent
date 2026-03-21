import {
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  fetchRemoteManifest,
  getLocalVersion,
  saveLocalVersion,
} from "../lib/manifest.js";
import { migrateToAgents } from "../lib/migrate.js";
import {
  createCliSymlinks,
  detectExistingCliSymlinkDirs,
  getInstalledSkillNames,
  installClaudeSkills,
} from "../lib/skills.js";
import { downloadAndExtract } from "../lib/tarball.js";

export async function update(force = false): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent update ")));

  const cwd = process.cwd();

  // Auto-migrate from legacy .agent/ to .agents/
  const migrations = migrateToAgents(cwd);
  if (migrations.length > 0) {
    p.note(
      migrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
      "Migration",
    );
  }
  const spinner = p.spinner();

  try {
    spinner.start("Checking for updates...");

    const remoteManifest = await fetchRemoteManifest();
    const localVersion = await getLocalVersion(cwd);

    if (localVersion === remoteManifest.version) {
      spinner.stop(pc.green("Already up to date!"));
      p.outro(`Current version: ${pc.cyan(localVersion)}`);
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
      const stackBackupDir = join(
        tmpdir(),
        `oma-stack-backup-${Date.now()}`,
      );
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

      cpSync(join(repoDir, ".agents"), join(cwd, ".agents"), {
        recursive: true,
        force: true,
      });

      // Restore user-customized config files
      if (savedUserPrefs) writeFileSync(userPrefsPath, savedUserPrefs);
      if (savedMcp) writeFileSync(mcpPath, savedMcp);

      // Restore stack/ directories
      if (hasBackendStack) {
        mkdirSync(backendStackDir, { recursive: true });
        cpSync(join(stackBackupDir, "oma-backend"), backendStackDir, {
          recursive: true,
          force: true,
        });
        rmSync(stackBackupDir, { recursive: true, force: true });
      }

      // Clean up variants/ from user project (not needed at runtime)
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

      // Migrate legacy Python resources to stack/ (one-time)
      // Check for ANY of the legacy files, not just snippets.md
      const legacyFiles = ["snippets.md", "tech-stack.md", "api-template.py"];
      const backendResourcesDir = join(
        cwd,
        ".agents",
        "skills",
        "oma-backend",
        "resources",
      );
      const hasLegacyFiles = legacyFiles.some((f) =>
        existsSync(join(backendResourcesDir, f)),
      );
      if (hasLegacyFiles && !existsSync(backendStackDir)) {
        mkdirSync(backendStackDir, { recursive: true });
        for (const file of legacyFiles) {
          const src = join(backendResourcesDir, file);
          if (existsSync(src)) {
            renameSync(src, join(backendStackDir, file));
          }
        }
        writeFileSync(
          join(backendStackDir, "stack.yaml"),
          "language: python\nframework: fastapi\norm: sqlalchemy\nsource: migrated\n",
        );
      }

      await saveLocalVersion(cwd, remoteManifest.version);

      const cliTools = detectExistingCliSymlinkDirs(cwd);
      if (cliTools.includes("claude")) {
        installClaudeSkills(repoDir, cwd);
      }

      spinner.stop(`Updated to version ${pc.cyan(remoteManifest.version)}!`);

      if (cliTools.length > 0) {
        const skillNames = getInstalledSkillNames(cwd);
        if (skillNames.length > 0) {
          const { created } = createCliSymlinks(cwd, cliTools, skillNames);
          if (created.length > 0) {
            p.note(
              created.map((s) => `${pc.green("→")} ${s}`).join("\n"),
              "Symlinks updated",
            );
          }
        }
      }

      p.outro(
        `${remoteManifest.metadata.totalFiles} files updated successfully`,
      );
    } finally {
      cleanup();
    }
  } catch (error) {
    spinner.stop("Update failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
