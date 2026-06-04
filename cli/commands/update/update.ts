import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../../io/github.js";
import { maybeSelfUpdate } from "../../io/self-update.js";
import { ensureSerenaProject, inferSerenaLanguages } from "../../io/serena.js";
import { downloadAndExtract } from "../../io/tarball.js";
import pkg from "../../package.json";
import {
  getInstallMode,
  getInstallRoot,
} from "../../platform/install-context.js";
import {
  diffArtifacts,
  fetchRemoteManifest,
  getLocalVersion,
  getNeedsReconcile,
  hasArtifactChanges,
  hasInstalledProject,
  readSkillDescription,
  readWorkflowDescription,
  saveLocalVersion,
  setNeedsReconcile,
  snapshotArtifacts,
} from "../../platform/manifest.js";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  createVendorSymlinks,
  createVendorWorkflowSymlinks,
  EXTENSION_VENDORS,
  getInstalledSkillNames,
  getInstalledWorkflowNames,
  REPO,
  vendorRequiresHomeConsent,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import { promptUninstallCompetitors } from "../../utils/competitors.js";
import {
  isTelemetryEnabled,
  loadOmaConfig,
  loadSerenaConfig,
} from "../../utils/config.js";
import {
  formatGeminiDeprecationWarning,
  usesGeminiCli,
} from "../../utils/gemini-deprecation.js";
import { t } from "../../utils/i18n.js";
import {
  acquireLock,
  bindInstallLockRelease,
} from "../../utils/install-lock.js";
import { link } from "../link/link.js";
import { runMigrations } from "../migrations/index.js";

/**
 * Resolve whether to auto-update the CLI binary.
 *
 * Precedence (highest first):
 *   1. Project-level: <cwd>/.agents/oma-config.yaml
 *   2. Global-level:  <HOME>/.agents/oma-config.yaml
 *   3. Default: true (opt-out model)
 *
 * When both installs are present, project config beats global.
 * TODO: see docs/oma-config-semantics.md (Task 53)
 */
export function resolveAutoUpdateCli(cwd: string): boolean {
  // 1. Project-level config
  const projectConfigPath = join(cwd, ".agents", "oma-config.yaml");
  if (existsSync(projectConfigPath)) {
    try {
      const content = readFileSync(projectConfigPath, "utf-8");
      const match = content.match(/^auto_update_cli:\s*(true|false)/m);
      if (match) {
        return match[1] === "true";
      }
    } catch {
      // fall through
    }
  }

  // 2. Global-level config
  const globalConfigPath = join(homedir(), ".agents", "oma-config.yaml");
  if (existsSync(globalConfigPath)) {
    try {
      const content = readFileSync(globalConfigPath, "utf-8");
      const match = content.match(/^auto_update_cli:\s*(true|false)/m);
      if (match) {
        return match[1] === "true";
      }
    } catch {
      // fall through
    }
  }

  // 3. Default: opt-out (enabled unless explicitly set to false)
  return true;
}

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

export function classifyUpdateTarget(
  localVersion: string | null,
  hasExistingInstall: boolean,
): "ready" | "legacy" | "missing" {
  if (localVersion !== null) return "ready";
  return hasExistingInstall ? "legacy" : "missing";
}

export type UpdateOptions = {
  force?: boolean;
  ci?: boolean;
  global?: boolean;
  yes?: boolean;
  all?: boolean;
  vendor?: string;
};

const VENDOR_ROOTS: Record<CliVendor, string[]> = {
  antigravity: [".gemini/antigravity-cli"],
  claude: [".claude"],
  codex: [".codex"],
  copilot: [".github"],
  cursor: [".cursor"],
  gemini: [".gemini"],
  grok: [".grok"],
  hermes: [".hermes"],
  kiro: [".kiro"],
  pi: [".pi"],
  qwen: [".qwen"],
};

const UPDATE_VENDORS = [...ALL_CLI_VENDORS, ...EXTENSION_VENDORS].sort();

function isCliTool(vendor: CliVendor): vendor is CliTool {
  return vendor in CLI_SKILLS_DIR;
}

function parseVendorList(raw: string): CliVendor[] {
  const validVendors = new Set<string>(UPDATE_VENDORS);
  const vendors = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const invalid = vendors.filter((v) => !validVendors.has(v));

  if (invalid.length > 0) {
    throw new Error(
      `Unsupported vendor(s): ${invalid.join(", ")}. Supported vendors: ${UPDATE_VENDORS.join(", ")}`,
    );
  }

  return [...new Set(vendors)] as CliVendor[];
}

function hasExistingVendorRoot(cwd: string, vendor: CliVendor): boolean {
  const roots = [...VENDOR_ROOTS[vendor]];
  if (isCliTool(vendor)) roots.push(CLI_SKILLS_DIR[vendor].projectPath);
  return roots.some((rel) => existsSync(join(cwd, rel)));
}

function supportedProjectVendors(): CliVendor[] {
  return UPDATE_VENDORS.filter((vendor) => {
    if (!isCliTool(vendor)) return true;
    return !vendorRequiresHomeConsent(vendor);
  });
}

export function resolveUpdateVendors(
  cwd: string,
  options: Pick<UpdateOptions, "all" | "vendor"> = {},
): CliVendor[] {
  if (options.vendor) return parseVendorList(options.vendor);
  if (options.all) return supportedProjectVendors();

  return UPDATE_VENDORS.filter((vendor) => hasExistingVendorRoot(cwd, vendor));
}

function toCliTools(vendors: CliVendor[]): CliTool[] {
  return vendors.filter(isCliTool);
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  const { force = false, ci = false, yes = false } = options;
  const nonInteractive =
    ci ||
    yes ||
    process.env.OMA_YES === "1" ||
    process.env.OMA_YES === "true" ||
    process.env.CI === "true" ||
    process.env.CI === "1";

  if (!ci && process.stdout.isTTY) console.clear();

  const ui = createUI(ci);
  ui.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent update ")));

  const installRoot = getInstallRoot();
  const mode = getInstallMode();

  // Acquire install lock — prevents concurrent install/update runs
  const lock = acquireLock(installRoot);
  if (!lock.ok) {
    const msg = t("install.lockHeld", { pid: lock.held.pid });
    if (ci) {
      throw new Error(msg);
    }
    p.cancel(msg);
    process.exit(1);
  }
  const releaseLock = bindInstallLockRelease(lock.release);

  // In global mode, target the global SSOT and show a banner.
  if (mode === "global") {
    ui.note(
      `Updating global install at ${pc.cyan(installRoot)}`,
      "Global mode",
    );
  }

  // Project-mode operations use the project cwd; global mode uses installRoot.
  const cwd = mode === "global" ? installRoot : process.cwd();

  try {
    await maybeSelfUpdate({
      currentVersion: pkg.version,
      enabled: resolveAutoUpdateCli(cwd),
      onSpawnStart: (msg) => ui.note(msg, "CLI auto-update"),
      onNotice: (msg) => ui.note(msg, "CLI update available"),
    });

    const localVersion = await getLocalVersion(cwd);
    const hasExistingInstall = hasInstalledProject(cwd);
    const targetState = classifyUpdateTarget(localVersion, hasExistingInstall);

    if (targetState === "missing") {
      const message =
        "oh-my-agent is not installed in this project. Run `oma install` first.";
      ui.logError(message);
      if (ci) {
        throw new Error(message);
      }
      process.exit(1);
    }

    // Run all migrations (after confirming project is installed)
    const migrationActions = runMigrations(cwd);
    if (migrationActions.length > 0) {
      ui.note(
        migrationActions.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
        "Migration",
      );
    }

    // Determine if reconcile is needed (migrations ran, or previous reconcile failed)
    const needsReconcile =
      migrationActions.length > 0 || getNeedsReconcile(cwd);

    // Persist reconcile flag so a failed download doesn't lose the intent
    if (migrationActions.length > 0 && !getNeedsReconcile(cwd)) {
      setNeedsReconcile(cwd, true);
    }

    // Detect and offer to remove competing tools (skip in CI — no stdin)
    if (!nonInteractive) {
      await promptUninstallCompetitors(cwd);
    }

    if (targetState === "legacy") {
      ui.note(
        "Existing .agents installation detected without _version.json. Updating in place and restoring version metadata.",
        "Legacy install",
      );
    }

    let spinner: ReturnType<typeof ui.spinnerStart> | undefined;

    try {
      spinner = ui.spinnerStart("Checking for updates...");

      const remoteManifest = await fetchRemoteManifest();

      if (localVersion === remoteManifest.version && !needsReconcile) {
        spinner.stop(pc.green("Already up to date!"));
        ui.outro(`Current version: ${pc.cyan(localVersion)}`);
        return;
      }

      const isReconcileOnly = localVersion === remoteManifest.version;

      spinner.message(`Downloading ${pc.cyan(remoteManifest.version)}...`);

      const { dir: repoDir, cleanup } = await downloadAndExtract();

      try {
        spinner.message("Copying files...");

        // Run migrations (e.g. legacy config path rename)
        runMigrations(cwd);

        // Preserve user-customized config files before bulk copy
        const userPrefsPath = join(cwd, ".agents", "oma-config.yaml");
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

        const beforeArtifacts = snapshotArtifacts(cwd);

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

        // Post-copy migrations
        const postCopyMigrations = runMigrations(cwd);
        if (postCopyMigrations.length > 0) {
          ui.note(
            postCopyMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
            "Migration",
          );
        }

        // Reconcile all vendor adaptations via the link kernel. agy HUD,
        // Claude .mcp.json seeding, vendor settings (Claude / Gemini / Qwen /
        // Codex telemetry-aware), Cursor MCP + rules, doc merging, and CLI
        // skill symlinks are all owned by link() — adding a new vendor only
        // requires changes in cli/commands/link/link.ts.
        const updateVendors = resolveUpdateVendors(cwd, options);
        link({
          vendorFilter: updateVendors,
          quiet: true,
          telemetry: isTelemetryEnabled(cwd),
          refreshSymlinks: false,
        });
        const cliSymlinks =
          updateVendors.length > 0
            ? createVendorSymlinks(
                cwd,
                toCliTools(updateVendors),
                getInstalledSkillNames(cwd),
              )
            : { created: [], skipped: [] };

        // Workflows are surfaced via direct symlinks at .agents/workflows/*.md.
        if (updateVendors.length > 0) {
          createVendorWorkflowSymlinks(
            cwd,
            toCliTools(updateVendors),
            getInstalledWorkflowNames(cwd),
          );
        }

        // Vendor adaptations complete — clear reconcile flag
        if (needsReconcile) {
          setNeedsReconcile(cwd, false);
        }

        // Clean up migration backups (no longer needed after successful update)
        const migrationBackupDir = join(cwd, ".agents", ".migration-backup");
        if (existsSync(migrationBackupDir)) {
          rmSync(migrationBackupDir, { recursive: true, force: true });
        }

        // --- Serena Project Setup ---
        {
          const serenaLangs = inferSerenaLanguages(cwd);
          ensureSerenaProject(cwd, serenaLangs);
        }

        // --- Optional Serena Binary Upgrade ---
        // Opt-in via `serena.auto_update: true` in .agents/oma-config.yaml.
        // Skip silently if uv is not installed or the upgrade fails — the
        // serena MCP still works on the previously installed version.
        if (loadSerenaConfig(cwd).autoUpdate) {
          try {
            execSync("uv tool upgrade serena-agent --prerelease=allow", {
              stdio: "ignore",
            });
            ui.note(
              "Upgraded serena-agent to the latest prerelease.",
              "Serena",
            );
          } catch {
            ui.note(
              "Skipped serena upgrade (uv unavailable or upgrade failed).",
              "Serena",
            );
          }
        }

        // Stamp the new version AND the install mode into _version.json
        // (schemaVersion=2). This both records the new version and ensures
        // legacy installs that lack `mode` get backfilled on next update.
        await saveLocalVersion(cwd, remoteManifest.version, mode);

        if (mode === "project") {
          ui.note(
            "Skipped global HOME-level configuration updates during project update.",
            "Notice",
          );
        }

        spinner.stop(
          isReconcileOnly
            ? pc.green("Reconciled after migrations!")
            : `Updated to version ${pc.cyan(remoteManifest.version)}!`,
        );

        const artifactDiff = diffArtifacts(
          beforeArtifacts,
          snapshotArtifacts(cwd),
        );
        if (hasArtifactChanges(artifactDiff)) {
          const lines: string[] = [];
          if (artifactDiff.addedSkills.length > 0) {
            lines.push(pc.green("+ Skills"));
            for (const name of artifactDiff.addedSkills) {
              const desc = readSkillDescription(cwd, name);
              lines.push(
                desc
                  ? `  ${pc.cyan(name)}: ${pc.dim(desc)}`
                  : `  ${pc.cyan(name)}`,
              );
            }
          }
          if (artifactDiff.addedWorkflows.length > 0) {
            lines.push(pc.green("+ Workflows"));
            for (const name of artifactDiff.addedWorkflows) {
              const desc = readWorkflowDescription(cwd, name);
              lines.push(
                desc
                  ? `  ${pc.cyan(name)}: ${pc.dim(desc)}`
                  : `  ${pc.cyan(name)}`,
              );
            }
          }
          if (artifactDiff.removedSkills.length > 0) {
            lines.push(
              `${pc.red("- Skills")}    ${artifactDiff.removedSkills.join(", ")}`,
            );
          }
          if (artifactDiff.removedWorkflows.length > 0) {
            lines.push(
              `${pc.red("- Workflows")} ${artifactDiff.removedWorkflows.join(", ")}`,
            );
          }
          ui.note(lines.join("\n"), "What's new");
        }

        if (cliSymlinks.created.length > 0) {
          ui.note(
            cliSymlinks.created.map((s) => `${pc.green("→")} ${s}`).join("\n"),
            "Symlinks updated",
          );
        }

        const postUpdateOmaConfig = loadOmaConfig(cwd);
        if (usesGeminiCli(postUpdateOmaConfig)) {
          ui.note(formatGeminiDeprecationWarning(), "Gemini CLI deprecation");
        }

        ui.outro(
          isReconcileOnly
            ? `Reconciled to version ${pc.cyan(remoteManifest.version)}`
            : `${remoteManifest.metadata?.totalFiles ?? 0} files updated successfully`,
        );

        if (
          !nonInteractive &&
          isGhInstalled() &&
          isGhAuthenticated() &&
          !isAlreadyStarred()
        ) {
          const shouldStar = await p.confirm({
            message: `${pc.yellow("⭐")} Star ${pc.cyan(REPO)} on GitHub? It helps a lot!`,
          });

          if (!p.isCancel(shouldStar) && shouldStar) {
            try {
              execSync(`gh api -X PUT /user/starred/${REPO}`, {
                stdio: "ignore",
              });
              p.log.success(`Starred ${pc.cyan(REPO)}! Thank you! 🌟`);
            } catch {
              p.log.warn(
                `Could not star automatically. Try: ${pc.dim(`gh api --method PUT /user/starred/${REPO}`)}`,
              );
            }
          }
        }
      } finally {
        cleanup();
      }
    } catch (error) {
      spinner?.stop("Update failed");
      ui.logError(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
      if (ci) {
        throw error;
      }
      process.exit(1);
    }
  } finally {
    releaseLock();
  }
}
