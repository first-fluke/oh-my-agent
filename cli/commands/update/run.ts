import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { backupRoot } from "../../io/backup.js";
import { maybeApplyRecommendedGitConfig } from "../../io/git-recommended.js";
import { maybeSelfUpdate } from "../../io/self-update.js";
import {
  deriveSerenaLanguages,
  ensureOmaSerenaContexts,
  ensureSerenaProject,
  inferSerenaLanguages,
} from "../../io/serena.js";
import { downloadAndExtract } from "../../io/tarball.js";
import pkg from "../../package.json";
import { appendMissingConfigKeys } from "../../platform/agent-config/config-merge.js";
import {
  getInstallMode,
  getInstallRoot,
} from "../../platform/install-context.js";
import {
  fetchRemoteManifest,
  getLocalVersion,
  getNeedsReconcile,
  hasInstalledProject,
  readSkillDescription,
  saveLocalVersion,
  setNeedsReconcile,
  snapshotArtifacts,
} from "../../platform/manifest.js";
import {
  createVendorSymlinks,
  createVendorWorkflowSymlinks,
  getInstalledSkillNames,
  getInstalledWorkflowNames,
} from "../../platform/skills-installer.js";
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
import {
  acquireLock,
  bindInstallLockRelease,
  DEAD_PID_GRACE_MS,
  lockPath,
} from "../../utils/install-lock.js";
import { link } from "../link/run.js";
import { runMigrations } from "../migrations/index.js";
import { resolveAutoUpdateCli } from "./auto-update-config.js";
import {
  captureBackendStackBeforeCopy,
  restoreBackendStackAfterCopy,
} from "./backend-stack.js";
import { maybePromptGitHubStar } from "./github-star.js";
import {
  classifyUpdateTarget,
  collectAgentRequiredSkills,
  selectSkillsToPrune,
} from "./install-state.js";
import { noteArtifactDiff, noteNewSkills } from "./notes.js";
import type { UpdateOptions } from "./types.js";
import { createUI } from "./ui.js";
import { resolveUpdateVendors, toCliTools } from "./vendors.js";

export { resolveAutoUpdateCli } from "./auto-update-config.js";
export {
  classifyUpdateTarget,
  collectAgentRequiredSkills,
  selectSkillsToPrune,
} from "./install-state.js";
export type { UpdateOptions } from "./types.js";
export { resolveUpdateVendors } from "./vendors.js";

export async function update(options: UpdateOptions = {}): Promise<void> {
  const {
    force = false,
    withNewSkills = false,
    ci = false,
    yes = false,
  } = options;
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
    const msg =
      `Another oma install/update is running (pid=${lock.held.pid}). ` +
      `If none is running it crashed — remove ${lockPath(installRoot)}, ` +
      `or wait ~${DEAD_PID_GRACE_MS / 1000}s for it to auto-clear.`;
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

    // Vendors this update is allowed to touch. Migrations share the set the
    // reconcile step below uses (`link` at the end of this function), so a
    // vendor excluded from the update never has its config rewritten.
    const migrationVendors = resolveUpdateVendors(cwd, options);

    // Run all migrations (after confirming project is installed)
    const migrationActions = runMigrations(cwd, { vendors: migrationVendors });
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
        await maybeSelfUpdate({
          currentVersion: pkg.version,
          enabled: resolveAutoUpdateCli(cwd),
          onSpawnStart: (msg) => ui.note(msg, "CLI auto-update"),
          onNotice: (msg) => ui.note(msg, "CLI update available"),
        });
        return;
      }

      const isReconcileOnly = localVersion === remoteManifest.version;

      spinner.message(`Downloading ${pc.cyan(remoteManifest.version)}...`);

      const { dir: repoDir, cleanup } = await downloadAndExtract();

      try {
        spinner.message("Copying files...");

        // Run migrations (e.g. legacy config path rename)
        runMigrations(cwd, { vendors: migrationVendors });

        // Preserve user-customized config files before bulk copy
        const userPrefsPath = join(cwd, ".agents", "oma-config.yaml");
        const mcpPath = join(cwd, ".agents", "mcp.json");
        const savedUserPrefs =
          !force && existsSync(userPrefsPath)
            ? readFileSync(userPrefsPath)
            : null;
        const savedMcp =
          !force && existsSync(mcpPath) ? readFileSync(mcpPath) : null;

        const backendStackState = captureBackendStackBeforeCopy(cwd, force);

        const beforeArtifacts = snapshotArtifacts(cwd);

        cpSync(join(repoDir, ".agents"), join(cwd, ".agents"), {
          recursive: true,
          force: true,
          filter: (src) => !src.replace(/\\/g, "/").includes(".agents/eval"),
        });

        const evalDir = join(cwd, ".agents", "eval");
        if (existsSync(evalDir)) {
          rmSync(evalDir, { recursive: true, force: true });
        }

        // Restore user-customized config files
        if (savedUserPrefs) writeFileSync(userPrefsPath, savedUserPrefs);
        if (savedMcp) writeFileSync(mcpPath, savedMcp);

        restoreBackendStackAfterCopy(cwd, repoDir, backendStackState);

        // Post-copy migrations
        const postCopyMigrations = runMigrations(cwd, {
          vendors: migrationVendors,
        });
        if (postCopyMigrations.length > 0) {
          ui.note(
            postCopyMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
            "Migration",
          );
        }

        // Append template config keys the user's file is missing. User-set
        // keys are preserved verbatim; only new keys from the shipped
        // template are added (with template defaults).
        if (savedUserPrefs) {
          const templateConfigPath = join(
            repoDir,
            ".agents",
            "oma-config.yaml",
          );
          if (existsSync(templateConfigPath)) {
            const merged = appendMissingConfigKeys(
              readFileSync(userPrefsPath, "utf-8"),
              readFileSync(templateConfigPath, "utf-8"),
            );
            if (merged.addedKeys.length > 0) {
              writeFileSync(userPrefsPath, merged.content);
              ui.note(
                merged.addedKeys.map((k) => `${pc.green("+")} ${k}`).join("\n"),
                "oma-config.yaml — new keys added",
              );
            }
          }
        }

        // Preserve the user's skill selection. The bulk copy above drops in
        // every skill the release ships; prune the ones that are new and were
        // not already installed so an update refreshes the existing selection
        // instead of growing it. `--with-new-skills` opts into the new ones.
        // Capture descriptions before pruning so we can still surface them.
        const prunedSkills = selectSkillsToPrune(
          beforeArtifacts.skills,
          getInstalledSkillNames(cwd),
          withNewSkills,
          collectAgentRequiredSkills(cwd),
        );
        const newSkillNotes = prunedSkills.map((name) => ({
          name,
          desc: readSkillDescription(cwd, name),
        }));
        for (const name of prunedSkills) {
          rmSync(join(cwd, ".agents", "skills", name), {
            recursive: true,
            force: true,
          });
        }

        // Reconcile all vendor adaptations via the link kernel. agy HUD,
        // Claude .mcp.json seeding, vendor settings (Claude / Gemini / Qwen /
        // Codex telemetry-aware), Cursor MCP + rules, doc merging, and CLI
        // skill symlinks are all owned by link() — adding a new vendor only
        // requires changes in cli/commands/link/link.ts.
        const updateVendors = migrationVendors;
        link({
          root: cwd,
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
            : { created: [], skipped: [], removed: [] };

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

        // Clean up backups (no longer needed after a successful update): the
        // canonical root plus legacy scatter from pre-consolidation versions.
        const backupCleanupDirs = [
          backupRoot(cwd), // .agents/backup
          join(cwd, ".migration-backup"), // legacy (migrations 011/013)
          join(cwd, ".agents", ".migration-backup"), // legacy (migration 002)
        ];
        for (const dir of backupCleanupDirs) {
          if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
        }

        // --- Serena Project Setup ---
        // Language servers follow the project's own files; the skill-derived
        // set only fills in when detection comes up empty. Each open agent
        // session spawns its own serena + LSP tree, so an unused language
        // server costs its memory once per concurrent session.
        //
        // Skipped in global mode: `cwd` is then $HOME (or OMA_HOME), which is
        // not a project — see isForbiddenSerenaProjectRoot. Gating on the mode
        // also avoids scanning $HOME for languages.
        if (mode !== "global") {
          const { languages, prunable } = deriveSerenaLanguages(
            cwd,
            inferSerenaLanguages(cwd),
          );
          ensureSerenaProject(cwd, languages, { prunable });
        }

        // --- Optional Serena Binary Upgrade ---
        // On by default; opt out via `serena.auto_update: false` in .agents/oma-config.yaml.
        // Skip silently if uv is not installed or the upgrade fails — the
        // serena MCP still works on the previously installed version.
        if (loadSerenaConfig(cwd).autoUpdate) {
          try {
            execFileSync(
              "uv",
              ["tool", "upgrade", "serena-agent", "--prerelease=allow"],
              { stdio: "ignore" },
            );
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

        // --- Always-latest Remotion toolchain + remotion-dev/skills (oma-video) ---
        // Only refreshes a cache that already exists; a first `oma video compose`
        // fetches it on demand. Warn-only.
        try {
          const [
            { describeToolchain, ensureLatestToolchain, ensureRemotionSkills },
            { loadVideoConfig },
          ] = await Promise.all([
            import("../video/internal/remotion-workspace.js"),
            import("../video/config.js"),
          ]);
          if (describeToolchain().version) {
            const policy = (await loadVideoConfig(cwd)).remotion;
            const tc = await ensureLatestToolchain({
              checkIntervalMin: policy.checkIntervalMin,
              force: true,
            });
            const skills = await ensureRemotionSkills({
              checkIntervalMin: policy.checkIntervalMin,
              force: true,
            });
            const parts = [
              tc
                ? `remotion ${tc.version} (${tc.status})`
                : "remotion: check failed",
              skills
                ? `skills ${skills.ref} (${skills.status})`
                : "skills: check failed",
            ];
            ui.note(parts.join(", "), "Remotion");
          }
        } catch (err) {
          ui.note(
            `Skipped remotion refresh (${err instanceof Error ? err.message : String(err)}).`,
            "Remotion",
          );
        }

        const serenaContexts = ensureOmaSerenaContexts();
        if (serenaContexts.failed.length > 0) {
          ui.note(
            `Could not install Serena's OMA context: ${serenaContexts.failed.join(", ")}`,
            "Serena",
          );
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

        noteArtifactDiff(ui, cwd, beforeArtifacts);

        noteNewSkills(ui, newSkillNotes);

        if (cliSymlinks.created.length > 0 || cliSymlinks.removed.length > 0) {
          ui.note(
            [
              ...cliSymlinks.removed.map((s) => `${pc.red("×")} ${s}`),
              ...cliSymlinks.created.map((s) => `${pc.green("→")} ${s}`),
            ].join("\n"),
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

        await maybeApplyRecommendedGitConfig({ nonInteractive });
        await maybePromptGitHubStar(nonInteractive);

        // A detached self-update replaces the global executable while this
        // process keeps running. Starting it before the project reconciliation
        // lets an old process copy stale release contents into `.agents/`.
        // Defer it until every project write has completed; the new CLI still
        // takes effect on the next command, as documented by maybeSelfUpdate.
        await maybeSelfUpdate({
          currentVersion: pkg.version,
          enabled: resolveAutoUpdateCli(cwd),
          onSpawnStart: (msg) => ui.note(msg, "CLI auto-update"),
          onNotice: (msg) => ui.note(msg, "CLI update available"),
        });
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
