import { execSync } from "node:child_process";
import {
  type Dirent,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../../io/github.js";
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
  CLI_SKILLS_DIR,
  createVendorSymlinks,
  getAllSkills,
  getVendorDisplayPath,
  INSTALLED_SKILLS_DIR,
  installConfigs,
  installRules,
  installShared,
  installSkill,
  installWorkflows,
  PRESETS,
  REPO,
  type SkillTargetSpec,
  vendorRequiresHomeConsent,
  writeVendorsToConfig,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import { promptUninstallCompetitors } from "../../utils/competitors.js";
import { isTelemetryEnabled } from "../../utils/config.js";
import {
  acquireLock,
  bindInstallLockRelease,
} from "../../utils/install-lock.js";
import { link } from "../link/link.js";
import { runMigrations } from "../migrations/index.js";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  zh: "中文",
  vi: "Tiếng Việt",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ru: "Русский",
};

export function scanLanguages(
  repoDir: string,
): { value: string; label: string }[] {
  const docsDir = join(repoDir, "docs");
  const codes: string[] = ["en"];

  if (existsSync(docsDir)) {
    for (const file of readdirSync(docsDir)) {
      const match = file.match(/^README\.(.+)\.md$/);
      if (match?.[1]) codes.push(match[1]);
    }
  }

  return codes.map((code) => ({
    value: code,
    label: LANGUAGE_NAMES[code] ?? code,
  }));
}

export function getExistingLanguage(targetDir: string): string | null {
  const prefsPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!existsSync(prefsPath)) return null;

  try {
    const prefs = readFileSync(prefsPath, "utf-8");
    const match = prefs.match(/^language:\s*([A-Za-z-]+)/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Scan a directory for dangling symlinks (symlinks whose target does not
 * exist) and remove them. Uses lstat so cyclic or broken links are handled
 * safely without following the symlink. No-ops silently when the directory
 * does not exist.
 *
 * @param dir - Absolute path to the directory to scan.
 */
export function cleanDanglingSymlinks(dir: string): void {
  if (!existsSync(dir)) return;

  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, encoding: "utf-8" });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;

    const linkPath = join(dir, entry.name);

    let target: string;
    try {
      target = readlinkSync(linkPath);
    } catch {
      continue;
    }

    // Resolve relative targets against the containing directory
    const resolvedTarget = resolve(dir, target);

    let targetExists: boolean;
    try {
      lstatSync(resolvedTarget);
      targetExists = true;
    } catch {
      targetExists = false;
    }

    if (!targetExists) {
      try {
        unlinkSync(linkPath);
        console.log(`cleaned broken symlink: ${linkPath}`);
      } catch {
        // best-effort; skip if we cannot remove
      }
    }
  }
}

export type InstallOptions = {
  /**
   * Non-interactive mode. Skips every prompt and falls back to safe
   * defaults (language=existing|en, model_preset=existing|claude,
   * project_type=all, vendors=all non-HOME-base). HOME-base vendor consent
   * stays opt-in (skipped), competitor uninstall is skipped, GitHub star
   * prompt is skipped.
   *
   * Also activated by `OMA_YES=1` or `CI=true` env vars.
   */
  yes?: boolean;
};

/**
 * True when the user explicitly opted into "yes to everything" via the
 * `--yes` flag or `OMA_YES` env. Distinct from CI auto-detection because
 * explicit opt-in also enables affirmative side-effects (e.g. GitHub star).
 */
export function isExplicitYes(options: InstallOptions = {}): boolean {
  if (options.yes) return true;
  if (process.env.OMA_YES === "1" || process.env.OMA_YES === "true")
    return true;
  return false;
}

export function isNonInteractive(options: InstallOptions = {}): boolean {
  if (isExplicitYes(options)) return true;
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  return false;
}

export function getExistingPreset(targetDir: string): string | null {
  const prefsPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!existsSync(prefsPath)) return null;

  try {
    const prefs = readFileSync(prefsPath, "utf-8");
    const match = prefs.match(/^model_preset:\s*([A-Za-z0-9_-]+)/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Detects if the current process is running inside Windows Subsystem for Linux
 * by checking the Microsoft/WSL signature in /proc/version.
 */
export function detectWsl(
  readProcVersion: () => string = () => readFileSync("/proc/version", "utf-8"),
): boolean {
  if (process.platform !== "linux") return false;
  try {
    return /microsoft|wsl/i.test(readProcVersion());
  } catch {
    return false;
  }
}

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
      `Another oma install/update is running (pid=${lockResult.held.pid}). Try again in a moment.`,
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

    const languages = scanLanguages(repoDir);
    const existingLanguage = getExistingLanguage(installRoot);
    const initialLanguage = languages.some(
      (option) => option.value === existingLanguage,
    )
      ? (existingLanguage as string)
      : "en";
    const language = nonInteractive
      ? initialLanguage
      : await p.select({
          message: "Response language?",
          options: languages,
          initialValue: initialLanguage,
        });

    if (p.isCancel(language)) {
      cleanup();
      p.cancel("Cancelled.");
      process.exit(0);
    }

    const BUILT_IN_PRESET_OPTIONS: {
      value: string;
      label: string;
      hint: string;
    }[] = [
      {
        value: "claude",
        label: "Claude Code only",
        hint: "Claude Max subscription holders",
      },
      {
        value: "codex",
        label: "Codex CLI only",
        hint: "ChatGPT Plus/Pro subscription holders",
      },
      {
        value: "gemini",
        label: "Gemini CLI only",
        hint: "Google AI Pro subscription holders",
      },
      {
        value: "qwen",
        label: "Qwen Code only",
        hint: "Qwen Code subscription holders",
      },
      {
        value: "antigravity",
        label: "Antigravity CLI (agy)",
        hint: "Gemini 3.1 Pro impl + Gemini 3.5 Flash orchestration",
      },
      {
        value: "mixed",
        label: "Mixed (cross-vendor)",
        hint: "Claude orchestrator + cross-vendor subagents",
      },
    ];

    const existingPreset = getExistingPreset(installRoot);
    const initialPreset = BUILT_IN_PRESET_OPTIONS.some(
      (o) => o.value === existingPreset,
    )
      ? (existingPreset as string)
      : "claude";

    const modelPreset = nonInteractive
      ? initialPreset
      : await p.select({
          message: "Model preset?",
          options: BUILT_IN_PRESET_OPTIONS,
          initialValue: initialPreset,
        });

    if (p.isCancel(modelPreset)) {
      cleanup();
      p.cancel("Cancelled.");
      process.exit(0);
    }

    const projectType = nonInteractive
      ? "all"
      : await p.select({
          message: "What type of project?",
          options: [
            { value: "all", label: "All", hint: "Install everything" },
            {
              value: "fullstack",
              label: "Fullstack",
              hint: "Web + Mobile + Infra (kitchen sink)",
            },
            {
              value: "fullstack-web",
              label: "Fullstack Web",
              hint: "Frontend + Backend + DB (no mobile/infra)",
            },
            {
              value: "fullstack-mobile",
              label: "Fullstack Mobile",
              hint: "Mobile + Backend + DB",
            },
            { value: "frontend", label: "Frontend", hint: "React/Next.js" },
            {
              value: "backend",
              label: "Backend",
              hint: "Python, Node.js, Rust, ...",
            },
            { value: "mobile", label: "Mobile", hint: "Flutter/Dart" },
            {
              value: "devops",
              label: "DevOps",
              hint: "Terraform + CI/CD + Observability",
            },
            {
              value: "research",
              label: "Research",
              hint: "Scholar + Market + PDF/HWP + Writer",
            },
            {
              value: "content",
              label: "Content",
              hint: "Image + Voice + Design + Writer",
            },
            { value: "custom", label: "Custom", hint: "Choose skills" },
          ],
        });

    if (p.isCancel(projectType)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    let selectedSkills: string[];

    if (projectType === "custom") {
      const allSkills = getAllSkills();
      const selected = await p.multiselect({
        message: "Select skills:",
        options: allSkills.map((s) => ({
          value: s.name,
          label: s.name,
          hint: s.desc,
        })),
        required: true,
      });

      if (p.isCancel(selected)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
      selectedSkills = selected as string[];
    } else {
      selectedSkills = PRESETS[projectType as string] ?? [];
    }

    // Ask for language variant when backend skill is selected
    const variantSelections: Record<string, string> = {};
    if (selectedSkills.includes("oma-backend")) {
      const backendLang = nonInteractive
        ? "python"
        : await p.select({
            message: "Backend language?",
            options: [
              {
                value: "python",
                label: "🐍 Python",
                hint: "FastAPI/SQLAlchemy (default)",
              },
              {
                value: "node",
                label: "🟢 Node.js",
                hint: "NestJS/Hono + Prisma/Drizzle",
              },
              { value: "rust", label: "🦀 Rust", hint: "Axum/Actix-web" },
              {
                value: "other",
                label: "🔧 Other / Auto-detect",
                hint: "Configure later with /stack-set",
              },
            ],
            initialValue: "python",
          });

      if (p.isCancel(backendLang)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
      if (backendLang !== "other") {
        variantSelections["oma-backend"] = backendLang as string;
      }
    }

    // CLI tools selection — default All for project-base vendors,
    // opt-in only for HOME-base vendors (e.g., hermes).
    // Auto-exclude HOME-write vendors on Windows / CI where symlink and
    // HOME semantics are unreliable.
    const allowHomeWriteVendors =
      process.platform !== "win32" && !process.env.CI;

    const vendorOptions: { value: CliVendor; label: string; hint: string }[] = [
      {
        value: "claude",
        label: "Claude Code",
        hint: "hooks + settings + CLAUDE.md",
      },
      { value: "codex", label: "Codex CLI", hint: "hooks + plugin" },
      {
        value: "copilot",
        label: "GitHub Copilot",
        hint: "skill symlinks + .github/prompts/ wrappers",
      },
      {
        value: "cursor",
        label: "Cursor",
        hint: ".cursor/rules/ export + prompt hooks",
      },
      { value: "gemini", label: "Gemini CLI", hint: "hooks + Serena MCP" },
      {
        value: "grok",
        label: "Grok",
        hint: "hooks + project MCP + .grok/agents/",
      },
      ...(allowHomeWriteVendors
        ? [
            {
              value: "hermes" as const,
              label: "Hermes Agent",
              hint: "skills only — workflows N/A, HOME-shared (no per-project isolation)",
            },
          ]
        : []),
      { value: "qwen", label: "Qwen Code", hint: "hooks + settings" },
    ];

    const defaultVendorValues = vendorOptions
      .filter((opt) => {
        const spec = (CLI_SKILLS_DIR as Record<string, SkillTargetSpec>)[
          opt.value
        ];
        return !spec?.requiresHomeConsent;
      })
      .map((v) => v.value);

    const selectedVendors = nonInteractive
      ? defaultVendorValues
      : await p.multiselect({
          message: "CLI tools to configure:",
          options: vendorOptions,
          // HOME-write vendors (hermes) are opt-in only — default off.
          initialValues: defaultVendorValues,
          required: true,
        });

    if (p.isCancel(selectedVendors)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    const vendors = selectedVendors as CliVendor[];

    // Build selectedClis from CLI_SKILLS_DIR (data-driven). Vendors with
    // requiresHomeConsent require explicit consent; other vendors are added directly.
    const cliToolKeys = Object.keys(CLI_SKILLS_DIR) as CliTool[];
    const requestedClis = vendors.filter((v): v is CliTool =>
      (cliToolKeys as string[]).includes(v),
    );

    const selectedClis: CliTool[] = [];
    for (const cli of requestedClis) {
      if (vendorRequiresHomeConsent(cli)) {
        // HOME-base vendors require explicit consent. In non-interactive mode
        // we never auto-approve writes to the user's HOME directory.
        if (nonInteractive) {
          p.log.info(
            pc.dim(`Skipped ${cli} export (HOME write requires -y opt-in).`),
          );
          continue;
        }
        const consent = await p.confirm({
          message: `${cli} export writes to HOME (${pc.cyan(getVendorDisplayPath(cli))}). Proceed?`,
          initialValue: false,
        });
        if (p.isCancel(consent)) {
          cleanup();
          p.cancel("Cancelled.");
          process.exit(0);
        }
        if (!consent) {
          p.log.info(pc.dim(`Skipped ${cli} export.`));
          continue;
        }
      }
      selectedClis.push(cli);
    }

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
        const userPrefsPath = join(installRoot, ".agents", "oma-config.yaml");
        if (existsSync(userPrefsPath)) {
          let prefs = readFileSync(userPrefsPath, "utf-8");

          // Update language field
          prefs = prefs.replace(
            /^language:\s*.+$/m,
            `language: ${language as string}`,
          );

          // Update or insert model_preset field
          if (/^model_preset:/m.test(prefs)) {
            prefs = prefs.replace(
              /^model_preset:\s*.+$/m,
              `model_preset: ${modelPreset as string}`,
            );
          } else {
            // Insert model_preset after language line (preserve user fields)
            prefs = prefs.replace(
              /^(language:\s*.+)$/m,
              `$1\nmodel_preset: ${modelPreset as string}`,
            );
          }

          writeFileSync(userPrefsPath, prefs);
          writeVendorsToConfig(installRoot, vendors);
        }

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
      if (getInstallMode() === "global" && explicitYes) {
        p.log.info(pc.dim("Skipped GitHub star prompt (--global + --yes)."));
      } else if (
        isGhInstalled() &&
        isGhAuthenticated() &&
        !isAlreadyStarred()
      ) {
        // Auto-star on explicit `--yes` / OMA_YES (user opted in to "yes
        // everything"). Stay silent on auto-detected CI to avoid drive-by
        // stars from build runners that happen to have gh auth.
        let shouldStar: boolean | symbol;
        if (explicitYes) {
          shouldStar = true;
        } else if (nonInteractive) {
          shouldStar = false;
        } else {
          shouldStar = await p.confirm({
            message: `${pc.yellow("⭐")} Star ${pc.cyan(REPO)} on GitHub? It helps a lot!`,
          });
        }

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
    } catch (error) {
      spinner.stop("Installation failed");
      p.log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  } finally {
    releaseLock();
  }
}
