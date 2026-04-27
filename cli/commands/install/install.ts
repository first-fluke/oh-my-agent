import { execSync } from "node:child_process";
import {
  type Dirent,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promptUninstallCompetitors } from "../../cli-kit/competitors.js";
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
import { getLocalVersion, saveLocalVersion } from "../../platform/manifest.js";
import {
  generateCursorRules,
  mergeRulesIndexForVendor,
} from "../../platform/rules.js";
import {
  CLI_SKILLS_DIR,
  createCliSymlinks,
  ensureCursorMcpSymlink,
  getAllSkills,
  getVendorDisplayPath,
  INSTALLED_SKILLS_DIR,
  installCodexWorkflowSkills,
  installConfigs,
  installRules,
  installShared,
  installSkill,
  installVendorAdaptations,
  installWorkflows,
  isHookVendor,
  PRESETS,
  REPO,
  type SkillTargetSpec,
  vendorRequiresHomeConsent,
  writeVendorsToConfig,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import {
  applyRecommendedSettings,
  needsSettingsUpdate,
} from "../../vendors/claude/settings.js";
import {
  applyRecommendedCodexSettings,
  needsCodexSettingsUpdate,
  parseCodexConfig,
  serializeCodexConfig,
} from "../../vendors/codex/settings.js";
import {
  applyRecommendedGeminiSettings,
  needsGeminiSettingsUpdate,
} from "../../vendors/gemini/settings.js";
import {
  applyRecommendedQwenSettings,
  needsQwenSettingsUpdate,
} from "../../vendors/qwen/settings.js";
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

export type InstallOptions = Record<string, never>;

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

export async function install(_options: InstallOptions = {}): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent ")));

  // Run all migrations (legacy dirs, shared layout, config rename)
  const migrationActions = runMigrations(process.cwd());
  if (migrationActions.length > 0) {
    p.note(
      migrationActions.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
      "Migration",
    );
  }

  // Detect and offer to remove competing tools
  await promptUninstallCompetitors(process.cwd());

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
  const existingLanguage = getExistingLanguage(process.cwd());
  const initialLanguage = languages.some(
    (option) => option.value === existingLanguage,
  )
    ? (existingLanguage as string)
    : "en";
  const language = await p.select({
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
      value: "claude-only",
      label: "Claude Code only",
      hint: "Claude Max subscription holders",
    },
    {
      value: "codex-only",
      label: "Codex CLI only",
      hint: "ChatGPT Plus/Pro subscription holders",
    },
    {
      value: "gemini-only",
      label: "Gemini CLI only",
      hint: "Google AI Pro subscription holders",
    },
    {
      value: "qwen-only",
      label: "Qwen Code only",
      hint: "Qwen Code subscription holders",
    },
    {
      value: "antigravity",
      label: "Antigravity IDE",
      hint: "Claude orchestrator + cross-vendor subagents",
    },
  ];

  const existingPreset = getExistingPreset(process.cwd());
  const initialPreset = BUILT_IN_PRESET_OPTIONS.some(
    (o) => o.value === existingPreset,
  )
    ? (existingPreset as string)
    : "claude-only";

  const modelPreset = await p.select({
    message: "Model preset?",
    options: BUILT_IN_PRESET_OPTIONS,
    initialValue: initialPreset,
  });

  if (p.isCancel(modelPreset)) {
    cleanup();
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const projectType = await p.select({
    message: "What type of project?",
    options: [
      { value: "all", label: "✨ All", hint: "Install everything" },
      {
        value: "fullstack",
        label: "🌐 Fullstack",
        hint: "Frontend + Backend + PM + QA",
      },
      { value: "frontend", label: "🎨 Frontend", hint: "React/Next.js" },
      {
        value: "backend",
        label: "⚙️ Backend",
        hint: "Python, Node.js, Rust, ...",
      },
      { value: "mobile", label: "📱 Mobile", hint: "Flutter/Dart" },
      {
        value: "devops",
        label: "🚀 DevOps",
        hint: "Terraform + CI/CD + Workflows",
      },
      { value: "custom", label: "🔧 Custom", hint: "Choose skills" },
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

  const cwd = process.cwd();

  // Ask for language variant when backend skill is selected
  const variantSelections: Record<string, string> = {};
  if (selectedSkills.includes("oma-backend")) {
    const backendLang = await p.select({
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
  const allowHomeWriteVendors = process.platform !== "win32" && !process.env.CI;

  const vendorOptions: { value: CliVendor; label: string; hint: string }[] = [
    {
      value: "claude",
      label: "Claude Code",
      hint: "hooks + settings + CLAUDE.md",
    },
    { value: "codex", label: "Codex CLI", hint: "hooks + plugin" },
    { value: "copilot", label: "GitHub Copilot", hint: "skill symlinks" },
    {
      value: "cursor",
      label: "Cursor",
      hint: ".cursor/rules/ export + prompt hooks",
    },
    { value: "gemini", label: "Gemini CLI", hint: "hooks + Serena MCP" },
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

  const selectedVendors = await p.multiselect({
    message: "CLI tools to configure:",
    options: vendorOptions,
    // HOME-write vendors (hermes) are opt-in only — default off.
    initialValues: vendorOptions
      .filter((opt) => {
        const spec = (CLI_SKILLS_DIR as Record<string, SkillTargetSpec>)[
          opt.value
        ];
        return !spec || spec.base !== "home";
      })
      .map((v) => v.value),
    required: true,
  });

  if (p.isCancel(selectedVendors)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const vendors = selectedVendors as CliVendor[];
  const hookVendors = vendors.filter(isHookVendor);

  // Build selectedClis from CLI_SKILLS_DIR (data-driven). Vendors with
  // base: "home" require explicit consent; other vendors are added directly.
  const cliToolKeys = Object.keys(CLI_SKILLS_DIR) as CliTool[];
  const requestedClis = vendors.filter((v): v is CliTool =>
    (cliToolKeys as string[]).includes(v),
  );

  const selectedClis: CliTool[] = [];
  for (const cli of requestedClis) {
    if (vendorRequiresHomeConsent(cli)) {
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

  try {
    try {
      // Clean up dangling symlinks in vendor skill directories before
      // re-creating the skill set (R15: broken symlink pollutes .claude/skills/)
      const vendorSkillDirs = [
        ".claude/skills",
        ".codex/skills",
        ".gemini/skills",
        ".github/skills",
      ];
      for (const relDir of vendorSkillDirs) {
        cleanDanglingSymlinks(join(cwd, relDir));
      }

      installShared(repoDir, cwd);
      installWorkflows(repoDir, cwd);
      if (vendors.includes("codex")) {
        installCodexWorkflowSkills(repoDir, cwd);
      }
      installRules(repoDir, cwd);
      installConfigs(repoDir, cwd, false);

      for (const skillName of selectedSkills) {
        spinner.message(`Installing ${pc.cyan(skillName)}...`);
        installSkill(repoDir, skillName, cwd, variantSelections[skillName]);
      }

      spinner.stop("Skills installed!");

      // Install vendor-specific adaptations (agents, routers, hooks, CLAUDE.md)
      spinner.start("Installing vendor adaptations...");
      installVendorAdaptations(repoDir, cwd, hookVendors);
      if (vendors.includes("claude")) {
        const claudeSettingsPath = join(cwd, ".claude", "settings.json");
        let claudeSettings: unknown = {};
        if (existsSync(claudeSettingsPath)) {
          try {
            claudeSettings = JSON.parse(
              readFileSync(claudeSettingsPath, "utf-8"),
            );
          } catch {
            claudeSettings = {};
          }
        }
        if (needsSettingsUpdate(claudeSettings)) {
          applyRecommendedSettings(claudeSettings);
          writeFileSync(
            claudeSettingsPath,
            `${JSON.stringify(claudeSettings, null, 2)}\n`,
          );
        }
      }
      if (vendors.includes("gemini")) {
        const geminiSettingsPath = join(cwd, ".gemini", "settings.json");
        let geminiSettings: unknown = {};
        if (existsSync(geminiSettingsPath)) {
          try {
            geminiSettings = JSON.parse(
              readFileSync(geminiSettingsPath, "utf-8"),
            );
          } catch {
            geminiSettings = {};
          }
        }
        if (needsGeminiSettingsUpdate(geminiSettings)) {
          applyRecommendedGeminiSettings(geminiSettings);
          writeFileSync(
            geminiSettingsPath,
            `${JSON.stringify(geminiSettings, null, 2)}\n`,
          );
        }
      }
      if (vendors.includes("qwen")) {
        const qwenSettingsPath = join(cwd, ".qwen", "settings.json");
        let qwenSettings: unknown = {};
        if (existsSync(qwenSettingsPath)) {
          try {
            qwenSettings = JSON.parse(readFileSync(qwenSettingsPath, "utf-8"));
          } catch {
            qwenSettings = {};
          }
        }
        if (needsQwenSettingsUpdate(qwenSettings)) {
          const next = applyRecommendedQwenSettings(qwenSettings);
          mkdirSync(dirname(qwenSettingsPath), { recursive: true });
          writeFileSync(qwenSettingsPath, `${JSON.stringify(next, null, 2)}\n`);
        }
      }
      if (vendors.includes("codex")) {
        const codexConfigPath = join(cwd, ".codex", "config.toml");
        const rawToml = existsSync(codexConfigPath)
          ? readFileSync(codexConfigPath, "utf-8")
          : "";
        const codexSettings = parseCodexConfig(rawToml);
        if (needsCodexSettingsUpdate(codexSettings)) {
          const next = applyRecommendedCodexSettings(codexSettings);
          mkdirSync(dirname(codexConfigPath), { recursive: true });
          writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
        }
      }
      spinner.stop("Vendor adaptations installed!");

      // Patch oma-config.yaml with selected language, model_preset, and vendors.
      // Uses regex-level replacement to preserve user-edited fields (timezone, etc.).
      const userPrefsPath = join(cwd, ".agents", "oma-config.yaml");
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
        writeVendorsToConfig(cwd, vendors);
      }

      const bundledVersion = await getLocalVersion(repoDir);
      if (bundledVersion) {
        await saveLocalVersion(cwd, bundledVersion);
      }

      const postInstallMigrations = runMigrations(cwd);
      if (postInstallMigrations.length > 0) {
        p.note(
          postInstallMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
          "Migration",
        );
      }
    } finally {
      cleanup();
    }

    const cliSymlinks = createCliSymlinks(cwd, selectedClis, selectedSkills);

    p.note(
      [
        ...selectedSkills.map((s) => `${pc.green("✓")} ${s}`),
        "",
        pc.dim(`Location: ${join(cwd, INSTALLED_SKILLS_DIR)}`),
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

    // --- Vendor-specific rules export ---
    if (vendors.includes("cursor")) {
      ensureCursorMcpSymlink(cwd);
      const cursorExported = generateCursorRules(cwd);
      if (cursorExported.length > 0) {
        p.log.success(
          pc.green(
            `Cursor rules exported (${cursorExported.length} rules → .cursor/rules/)`,
          ),
        );
      }
    }

    // Merge usage guide + rules index into single-file vendor docs
    const mergedFiles = new Set<string>();
    for (const v of ["claude", "gemini", "codex", "cursor", "qwen"] as const) {
      if (!vendors.includes(v)) continue;
      const target =
        v === "claude"
          ? "CLAUDE.md"
          : v === "gemini"
            ? "GEMINI.md"
            : "AGENTS.md";
      if (mergedFiles.has(target)) continue;
      if (mergeRulesIndexForVendor(cwd, v)) {
        mergedFiles.add(target);
        p.log.success(pc.green(`oma guide merged into ${target}`));
      }
    }

    // --- Serena Project Setup ---
    {
      const serenaLangs = resolveSerenaLanguages(
        selectedSkills,
        variantSelections["oma-backend"],
      );
      const { configured, registered } = ensureSerenaProject(cwd, serenaLangs);
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

    p.outro(pc.green("Done! Open your project in your IDE to use the skills."));

    if (isGhInstalled() && isGhAuthenticated() && !isAlreadyStarred()) {
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
  } catch (error) {
    spinner.stop("Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
