import { homedir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  ensureSerenaProject,
  resolveSerenaLanguages,
} from "../../io/serena.js";
import { downloadAndExtract } from "../../io/tarball.js";
import {
  getInstallMode,
  getInstallRoot,
} from "../../platform/install-context.js";
import {
  getLocalVersion,
  readVersionInstallMode,
  saveLocalVersion,
} from "../../platform/manifest.js";
import {
  createVendorSymlinks,
  createVendorWorkflowSymlinks,
  getInstalledWorkflowNames,
  INSTALLED_SKILLS_DIR,
  installAgents,
  installConfigs,
  installHooks,
  installRules,
  installShared,
  installSkill,
  installWorkflows,
} from "../../platform/skills-installer.js";
import { promptUninstallCompetitors } from "../../utils/competitors.js";
import { isTelemetryEnabled } from "../../utils/config.js";
import {
  acquireLock,
  bindInstallLockRelease,
  DEAD_PID_GRACE_MS,
  lockPath,
} from "../../utils/install-lock.js";
import { link } from "../link/link.js";
import { runMigrations } from "../migrations/index.js";
import {
  detectWsl,
  type InstallOptions,
  isExplicitYes,
  isNonInteractive,
} from "./install/environment.js";
import { maybePromptGithubStar } from "./install/github-star.js";
import { patchUserConfig } from "./install/preferences.js";
import {
  promptBackendVariant,
  promptLanguage,
  promptModelPreset,
  promptProjectSkills,
  promptVendors,
  selectClisWithConsent,
} from "./install/prompts.js";
import { cleanDanglingSymlinks } from "./install/symlinks.js";

export {
  detectWsl,
  type InstallOptions,
  isExplicitYes,
  isNonInteractive,
} from "./install/environment.js";
export {
  getExistingLanguage,
  getExistingPreset,
  scanLanguages,
} from "./install/preferences.js";
export { cleanDanglingSymlinks } from "./install/symlinks.js";

export async function install(options: InstallOptions = {}): Promise<void> {
  const nonInteractive = isNonInteractive(options);
  const explicitYes = isExplicitYes(options);

  // Task 27 — sudo + HOME refusal (EC-5)
  const isLinuxOrMac = process.platform !== "win32";
  if (
    isLinuxOrMac &&
    typeof process.geteuid === "function" &&
    process.geteuid() === 0 &&
    typeof process.env.SUDO_USER === "string" &&
    process.env.SUDO_USER.length > 0
  ) {
    p.cancel(
      "Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.",
    );
    process.exit(1);
  }

  // Task 29 — CI + --global warning (EC-15)
  if (
    getInstallMode() === "global" &&
    (process.env.CI === "true" || process.env.CI === "1")
  ) {
    p.log.warn(
      "Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.",
    );
    // Continue — no abort.
  }

  // Task 26 — context-bound installRoot (replaces process.cwd())
  const installRoot = getInstallRoot();

  // Task 38 — install/update lock (aborts on concurrent run; auto-clears stale)
  const lockResult = acquireLock(installRoot);
  if (!lockResult.ok) {
    p.cancel(
      `Another oma install/update is running (pid=${lockResult.held.pid}). If none is running it crashed — remove ${lockPath(installRoot)}, or wait ~${DEAD_PID_GRACE_MS / 1000}s for it to auto-clear.`,
    );
    process.exit(1);
  }
  const releaseLock = bindInstallLockRelease(lockResult.release);

  try {
    console.clear();
    p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent ")));

    if (nonInteractive) {
      p.log.info(pc.dim("Non-interactive mode — using defaults."));
    }

    // Task 28 — cwd === homedir() warning when NOT --global (EC-12)
    if (getInstallMode() === "project" && process.cwd() === homedir()) {
      if (nonInteractive) {
        p.cancel(
          "Refusing to install in HOME without --global. Re-run with --global, or cd to a project directory first.",
        );
        process.exit(1);
      } else {
        const homeConsent = await p.confirm({
          message:
            "You're running oma in your HOME directory without --global. This will scatter files in ~/. Are you sure?",
          initialValue: false,
        });
        if (p.isCancel(homeConsent) || !homeConsent) {
          p.cancel("Cancelled.");
          process.exit(0);
        }
      }
    }

    // Task 30 — WSL detection + PowerShell HOME guidance (T2.13)
    if (getInstallMode() === "global" && detectWsl()) {
      p.log.info(
        pc.dim(
          "WSL detected: your $HOME (" +
            installRoot +
            ") is the WSL Linux home and is distinct from your Windows %USERPROFILE%. " +
            "oma will install only to the WSL HOME. " +
            "If you want a Windows-side install, re-run this command from PowerShell.",
        ),
      );
    }

    // Task 26 — HOME consent for global mode
    if (getInstallMode() === "global") {
      if (!nonInteractive) {
        const globalConsent = await p.confirm({
          message: `You're about to install oh-my-agent globally to ${installRoot}/.agents/. This will modify ~/.claude/, ~/.codex/, etc. Proceed?`,
          initialValue: false,
        });
        if (p.isCancel(globalConsent) || !globalConsent) {
          p.cancel("Cancelled.");
          process.exit(0);
        }
      }

      // Task 31 — First-run --global explanatory prompt (T2.6)
      // "First run" = no global-mode marker in _version.json yet.
      const priorMode = readVersionInstallMode(installRoot);
      if (priorMode !== "global" && !nonInteractive) {
        p.note(
          [
            "This is your first global install of oh-my-agent.",
            "Scope:",
            "  - SSOT: ~/.agents/  (all skills, workflows, rules)",
            "  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)",
            "  - Lock file: ~/.agents/_install.lock",
            "Existing per-project installs are not affected.",
          ].join("\n"),
        );
        const firstRunConsent = await p.confirm({
          message: "Proceed with the global install?",
          initialValue: false,
        });
        if (p.isCancel(firstRunConsent) || !firstRunConsent) {
          p.cancel("Cancelled.");
          process.exit(0);
        }
      }
    }

    // Run all migrations (legacy dirs, shared layout, config rename)
    const migrationActions = runMigrations(installRoot);
    if (migrationActions.length > 0) {
      p.note(
        migrationActions.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
        "Migration",
      );
    }

    // Detect and offer to remove competing tools (skipped in non-interactive
    // mode — destructive HOME-level operation should stay opt-in).
    if (!nonInteractive) {
      await promptUninstallCompetitors(installRoot);
    }

    const spinner = p.spinner();
    spinner.start("Downloading...");

    let repoDir: string;
    let cleanup: () => void;
    try {
      const result = await downloadAndExtract();
      repoDir = result.dir;
      cleanup = result.cleanup;
    } catch (error) {
      spinner.stop("Download failed");
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    spinner.stop("Downloaded!");

    const language = await promptLanguage(
      repoDir,
      installRoot,
      nonInteractive,
      cleanup,
    );

    const modelPreset = await promptModelPreset(
      installRoot,
      nonInteractive,
      cleanup,
    );

    const vendors = await promptVendors(modelPreset, nonInteractive);

    const selectedSkills = await promptProjectSkills(nonInteractive);

    const variantSelections = await promptBackendVariant(
      selectedSkills,
      nonInteractive,
    );

    const selectedClis = await selectClisWithConsent(
      vendors,
      nonInteractive,
      cleanup,
    );

    spinner.start("Installing skills...");

    let linkResult: ReturnType<typeof link> | null = null;

    try {
      try {
        // Clean up dangling symlinks in vendor skill directories before
        // re-creating the skill set (R15: broken symlink pollutes .claude/skills/)
        const vendorSkillDirs = [
          ".claude/skills",
          ".codex/skills",
          ".gemini/skills",
          ".github/skills",
          ".qwen/skills",
        ];
        for (const relDir of vendorSkillDirs) {
          cleanDanglingSymlinks(join(installRoot, relDir));
        }

        installShared(repoDir, installRoot);
        installHooks(repoDir, installRoot);
        installAgents(repoDir, installRoot);
        installWorkflows(repoDir, installRoot);
        installRules(repoDir, installRoot);
        installConfigs(repoDir, installRoot, false);

        for (const skillName of selectedSkills) {
          spinner.message(`Installing ${pc.cyan(skillName)}...`);
          installSkill(
            repoDir,
            skillName,
            installRoot,
            variantSelections[skillName],
          );
        }

        spinner.stop("Skills installed!");

        // Patch oma-config.yaml with selected language, model_preset, and vendors.
        // Uses regex-level replacement to preserve user-edited fields (timezone, etc.).
        patchUserConfig(installRoot, language, modelPreset, vendors);

        // Reconcile all vendor adaptations via the link kernel. agy HUD,
        // Claude .mcp.json seeding, vendor settings (Claude / Gemini / Qwen /
        // Codex telemetry-aware), Codex / Copilot workflow skills, Cursor MCP
        // + rules, and doc merging are all owned by link(). install handles
        // its own CLI skill symlinks below with the explicit consent list
        // (`selectedClis`), so we skip link's auto-detection here.
        spinner.start("Installing vendor adaptations...");
        linkResult = link({
          vendorFilter: vendors,
          quiet: true,
          telemetry: isTelemetryEnabled(installRoot),
          refreshSymlinks: false,
        });
        spinner.stop("Vendor adaptations installed!");

        const bundledVersion = await getLocalVersion(repoDir);
        if (bundledVersion) {
          await saveLocalVersion(installRoot, bundledVersion);
        }

        const postInstallMigrations = runMigrations(installRoot);
        if (postInstallMigrations.length > 0) {
          p.note(
            postInstallMigrations
              .map((m) => `${pc.green("✓")} ${m}`)
              .join("\n"),
            "Migration",
          );
        }
      } finally {
        cleanup();
      }

      const cliSymlinks = createVendorSymlinks(
        installRoot,
        selectedClis,
        selectedSkills,
      );

      // Expose workflows as slash-command skills by symlinking the workflow
      // files directly (no generated wrapper under .agents/skills).
      createVendorWorkflowSymlinks(
        installRoot,
        selectedClis,
        getInstalledWorkflowNames(installRoot),
      );

      p.note(
        [
          ...selectedSkills.map((s) => `${pc.green("✓")} ${s}`),
          "",
          pc.dim(`Location: ${join(installRoot, INSTALLED_SKILLS_DIR)}`),
          ...(cliSymlinks.created.length > 0
            ? [
                "",
                pc.cyan("Symlinks:"),
                ...cliSymlinks.created.map((s) => `${pc.green("→")} ${s}`),
              ]
            : []),
          ...(cliSymlinks.skipped.length > 0
            ? [
                "",
                pc.dim("Skipped:"),
                ...cliSymlinks.skipped.map((s) => pc.dim(`  ${s}`)),
              ]
            : []),
        ].join("\n"),
        "Installed",
      );

      // Surface link kernel's work to the user. Cursor export, doc merging,
      // and agy wiring are all done inside link() above — these messages are
      // for parity with the previous install UX.
      if (vendors.includes("cursor")) {
        p.log.success(pc.green("Cursor rules exported (.cursor/rules/)"));
      }
      for (const target of linkResult?.mergedDocs ?? []) {
        p.log.success(pc.green(`oma guide merged into ${target}`));
      }
      if (linkResult?.agyInstalled) {
        p.log.success(
          pc.green("Antigravity HUD installed (~/.gemini/antigravity-cli/)"),
        );
      } else if (linkResult?.agySkipReason) {
        p.log.warn(`agy: ${linkResult.agySkipReason}`);
      }

      // --- Serena Project Setup ---
      {
        const serenaLangs = resolveSerenaLanguages(
          selectedSkills,
          variantSelections["oma-backend"],
        );
        const { configured, registered } = ensureSerenaProject(
          installRoot,
          serenaLangs,
        );
        if (configured) {
          p.log.success(
            pc.green(`Serena project configured (${serenaLangs.join(", ")})`),
          );
        }
        if (registered) {
          p.log.success(pc.green("Project registered in Serena"));
        }
      }

      p.log.info(pc.dim("Skipped global HOME-level configuration updates."));

      // Task 26 — stamp install mode into _version.json (schemaVersion=2).
      // The mode field lets `oma doctor` distinguish project vs global installs
      // and lets backwards-compatible callers fall back to "project" when absent.
      const bundledVersionFinal = await getLocalVersion(installRoot).catch(
        () => null,
      );
      if (bundledVersionFinal) {
        await saveLocalVersion(
          installRoot,
          bundledVersionFinal,
          getInstallMode(),
        );
      }

      // Task 32 — Outro next-steps guidance (T2.7)
      p.note(
        [
          "1. Open your project in your IDE",
          "2. Type /orchestrate to spawn a multi-agent workflow",
          "3. Run `oma doctor` if anything looks off",
        ].join("\n"),
        "Next steps",
      );
      p.outro(pc.green("Done!"));

      // Task 33 — Skip GitHub star prompt when --global + --yes (T2.3)
      await maybePromptGithubStar(explicitYes, nonInteractive);
    } catch (error) {
      spinner.stop("Installation failed");
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  } finally {
    releaseLock();
  }
}
