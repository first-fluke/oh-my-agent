import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { maybeApplyRecommendedGitConfig } from "../../io/git-recommended.js";
import {
  deriveSerenaLanguages,
  ensureOmaSerenaContexts,
  ensureSerenaBinary,
  ensureSerenaProject,
  resolveSerenaLanguages,
  SERENA_INSTALL_HINT,
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
import {
  isTelemetryEnabled,
  loadDevToolsBrowsers,
} from "../../utils/config.js";
import {
  acquireLock,
  bindInstallLockRelease,
  DEAD_PID_GRACE_MS,
  lockPath,
} from "../../utils/install-lock.js";
import { ensureAsideInstalled } from "../../vendors/aside.js";
import { link } from "../link/run.js";
import { runMigrations } from "../migrations/index.js";
import { saveDevToolsBrowsers } from "./browser-preferences.js";
import {
  detectWsl,
  type InstallOptions,
  isExplicitYes,
  isNonInteractive,
} from "./environment.js";
import { maybePromptGithubStar } from "./github-star.js";
import { patchUserConfig } from "./preferences.js";
import {
  promptBackendVariant,
  promptDevToolsBrowsers,
  promptLanguage,
  promptModelPreset,
  promptProjectSkills,
  promptVendors,
  selectClisWithConsent,
} from "./prompts.js";
import { cleanDanglingSymlinks } from "./symlinks.js";

export {
  detectWsl,
  type InstallOptions,
  isExplicitYes,
  isNonInteractive,
} from "./environment.js";
export {
  getExistingLanguage,
  getExistingPreset,
  scanLanguages,
} from "./preferences.js";
export { cleanDanglingSymlinks } from "./symlinks.js";

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

    // Run all migrations (legacy dirs, shared layout, config rename).
    // Vendor selection has not been prompted yet, so no vendor-owned file may
    // be touched here — `vendors: []` blocks those writes. The post-install
    // pass below re-runs every migration with the selection the user made.
    const migrationActions = runMigrations(installRoot, { vendors: [] });
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

    const vendors = await promptVendors(installRoot, nonInteractive);

    const devToolsBrowsers = await promptDevToolsBrowsers(
      nonInteractive,
      cleanup,
      loadDevToolsBrowsers(installRoot) ?? ["aside"],
    );

    await ensureAsideInstalled(devToolsBrowsers);

    const modelPreset = await promptModelPreset(
      installRoot,
      vendors,
      nonInteractive,
      cleanup,
    );

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
    // Hermes has no project MCP scope. A declined HOME export must also
    // exclude its config writer and must not become recorded consent.
    const configuredVendors = vendors.filter(
      (vendor) => vendor !== "hermes" || selectedClis.includes("hermes"),
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

        for (const skillName of selectedSkills ?? []) {
          spinner.message(`Installing ${pc.cyan(skillName)}...`);
          installSkill(
            repoDir,
            skillName,
            installRoot,
            variantSelections[skillName],
          );
        }

        spinner.stop("Skills installed!");

        const evalDir = join(installRoot, ".agents", "eval");
        if (existsSync(evalDir)) {
          rmSync(evalDir, { recursive: true, force: true });
        }

        // Persist the selection before linking vendor MCP configurations.
        saveDevToolsBrowsers(installRoot, devToolsBrowsers);

        // Patch oma-config.yaml with selected language, model_preset, and vendors.
        // Uses regex-level replacement to preserve user-edited fields (timezone, etc.).
        patchUserConfig(installRoot, language, modelPreset, configuredVendors);

        // Reconcile all vendor adaptations via the link kernel. agy HUD,
        // Claude .mcp.json seeding, vendor settings (Claude / Gemini / Qwen /
        // Codex telemetry-aware), Codex / Copilot workflow skills, Cursor MCP
        // + rules, and doc merging are all owned by link(). install handles
        // its own CLI skill symlinks below with the explicit consent list
        // (`selectedClis`), so we skip link's auto-detection here.
        spinner.start("Installing vendor adaptations...");
        linkResult = link({
          root: installRoot,
          vendorFilter: configuredVendors,
          quiet: true,
          telemetry: isTelemetryEnabled(installRoot),
          refreshSymlinks: false,
        });
        spinner.stop("Vendor adaptations installed!");

        const bundledVersion = await getLocalVersion(repoDir);
        if (bundledVersion) {
          await saveLocalVersion(installRoot, bundledVersion);
        }

        const postInstallMigrations = runMigrations(installRoot, { vendors });
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

      // No vendor selected: the .agents/ SSOT is installed but nothing is wired
      // into a runtime, so oma won't trigger anywhere until the user links one.
      if (vendors.length === 0) {
        p.log.warn(
          "No CLI vendor configured — .agents/ is installed but no runtime is wired. Run `oma link <vendor>` (e.g. `oma link claude`) to activate one.",
        );
      }

      // --- Serena Project Setup ---
      {
        // A global install has no project: its root is $HOME (or OMA_HOME),
        // which is not a codebase. Running per-project setup against it wrote
        // `~/.serena/project.yml` and appended $HOME to serena's `projects:`
        // list on every (re)install — see isForbiddenSerenaProjectRoot for what
        // that breaks. Serena resolves the real project from the session's
        // working directory at MCP start (`--project-from-cwd`), so there is
        // nothing for install to do here. Gating on the MODE (not just the
        // path) also skips the language scan, which would otherwise walk up to
        // 20k files under $HOME for no result.
        if (getInstallMode() === "global") {
          p.log.info(
            pc.dim(
              "Serena project setup skipped (global install) — serena resolves the project from your working directory.",
            ),
          );
        } else {
          // Detection from the project's own files wins; the skill-derived set
          // is the fallback for an empty scaffold, where there is nothing to
          // detect yet and pruning would be guesswork.
          const { languages: serenaLangs, prunable } = deriveSerenaLanguages(
            installRoot,
            resolveSerenaLanguages(
              selectedSkills,
              variantSelections["oma-backend"],
            ),
          );
          const { configured, registered, maxAnswerChars } =
            ensureSerenaProject(installRoot, serenaLangs, { prunable });
          if (configured === "created") {
            p.log.success(
              pc.green(`Serena project configured (${serenaLangs.join(", ")})`),
            );
          } else if (configured === "reconciled") {
            p.log.success(
              pc.green(`Serena languages updated (${serenaLangs.join(", ")})`),
            );
          }
          if (registered) {
            p.log.success(pc.green("Project registered in Serena"));
          }
          if (maxAnswerChars) {
            p.log.success(
              pc.green(
                "Serena default_max_tool_answer_chars set (avoids truncated search hits)",
              ),
            );
          }
        }

        // The Serena MCP transport runs `command: "serena"` (migration 009), so
        // the binary must be on PATH. Best-effort self-install when missing —
        // graceful when `uv` is absent (e.g. CI), so install never hard-fails.
        const serenaBinary = ensureSerenaBinary({
          onInstallStart: () =>
            p.log.info(
              "Installing serena-agent (uv tool install — first run may take a minute)…",
            ),
        });
        if (serenaBinary.status === "installed") {
          p.log.success(pc.green("Installed serena-agent"));
        } else if (serenaBinary.status === "installed-not-on-path") {
          p.log.warn(
            "Installed serena-agent, but `serena` is not on PATH — run `uv tool update-shell`, then restart your terminal or IDE.",
          );
        } else if (serenaBinary.status === "install-failed") {
          p.log.warn(
            `serena-agent install failed — run \`${SERENA_INSTALL_HINT}\` manually.`,
          );
        } else if (serenaBinary.status === "uv-missing") {
          p.log.warn(
            `serena not found and uv is unavailable — install uv, then run \`${SERENA_INSTALL_HINT}\`.`,
          );
        }
        const contexts = ensureOmaSerenaContexts();
        if (contexts.changed.length > 0) {
          p.log.success(
            pc.green("Serena code-intelligence context configured"),
          );
        }
        if (contexts.failed.length > 0) {
          p.log.warn(
            `Could not install Serena's OMA context: ${contexts.failed.join(", ")}`,
          );
        }
      }

      // Recommended global git settings (opt-in; skipped in CI / --yes).
      await maybeApplyRecommendedGitConfig({ nonInteractive });

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
