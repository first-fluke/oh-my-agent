import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  applyRecommendedSettings,
  needsSettingsUpdate,
} from "../lib/claude-settings.js";
import { promptUninstallCompetitors } from "../lib/competitors.js";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../lib/github.js";
import { getLocalVersion, saveLocalVersion } from "../lib/manifest.js";
import { generateCursorRules, mergeRulesIndexForVendor } from "../lib/rules.js";
import { ensureSerenaProject, resolveSerenaLanguages } from "../lib/serena.js";
import {
  createCliSymlinks,
  getAllSkills,
  INSTALLED_SKILLS_DIR,
  installConfigs,
  installGlobalWorkflows,
  installRules,
  installShared,
  installSkill,
  installVendorAdaptations,
  installWorkflows,
  PRESETS,
  REPO,
  writeVendorsToConfig,
} from "../lib/skills.js";
import { downloadAndExtract } from "../lib/tarball.js";
import type { CliTool, CliVendor, VendorType } from "../types/index.js";
import { runMigrations } from "./migrations/index.js";

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

export async function install(): Promise<void> {
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

  // CLI tools selection — default All, opt-out pattern
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
    { value: "qwen", label: "Qwen Code", hint: "hooks + settings" },
  ];

  const selectedVendors = await p.multiselect({
    message: "CLI tools to configure:",
    options: vendorOptions,
    initialValues: vendorOptions.map((v) => v.value),
    required: true,
  });

  if (p.isCancel(selectedVendors)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const vendors = selectedVendors as CliVendor[];
  const hookVendors = vendors.filter((v): v is VendorType => v !== "copilot");
  const selectedClis: CliTool[] = [];
  if (vendors.includes("claude")) selectedClis.push("claude");
  if (vendors.includes("copilot")) selectedClis.push("copilot");

  spinner.start("Installing skills...");

  try {
    try {
      installShared(repoDir, cwd);
      installWorkflows(repoDir, cwd);
      installRules(repoDir, cwd);
      installConfigs(repoDir, cwd);
      installGlobalWorkflows(repoDir);

      for (const skillName of selectedSkills) {
        spinner.message(`Installing ${pc.cyan(skillName)}...`);
        installSkill(repoDir, skillName, cwd, variantSelections[skillName]);
      }

      spinner.stop("Skills installed!");

      // Install vendor-specific adaptations (agents, routers, hooks, CLAUDE.md)
      spinner.start("Installing vendor adaptations...");
      installVendorAdaptations(repoDir, cwd, hookVendors);
      spinner.stop("Vendor adaptations installed!");

      // Patch oma-config.yaml with selected language and vendors
      const userPrefsPath = join(cwd, ".agents", "oma-config.yaml");
      if (existsSync(userPrefsPath)) {
        const prefs = readFileSync(userPrefsPath, "utf-8");
        writeFileSync(
          userPrefsPath,
          prefs.replace(/^language:\s*.+$/m, `language: ${language as string}`),
        );
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

    // --- Git rerere Setup (auto-enable if not set) ---
    try {
      execSync("git config --get rerere.enabled", {
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch {
      try {
        execSync("git config --global rerere.enabled true");
        p.log.success(pc.green("git rerere enabled globally!"));
      } catch {
        // Not a git repo or git not available — skip
      }
    }

    // --- Auto-configure selected vendors (no individual prompts) ---
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";

    // Claude Code: apply recommended settings
    if (vendors.includes("claude")) {
      try {
        execSync("claude --version", { stdio: "ignore" });
        const claudeSettingsPath = join(homeDir, ".claude", "settings.json");
        // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
        let claudeSettings: any = {};
        if (existsSync(claudeSettingsPath)) {
          claudeSettings = JSON.parse(
            readFileSync(claudeSettingsPath, "utf-8"),
          );
        }
        if (needsSettingsUpdate(claudeSettings)) {
          applyRecommendedSettings(claudeSettings);
          writeFileSync(
            claudeSettingsPath,
            `${JSON.stringify(claudeSettings, null, 2)}\n`,
          );
          p.log.success(pc.green("Claude Code recommended settings applied!"));
        }
      } catch {
        // Claude Code not installed — skip
      }
    }

    // Codex: install plugin for Claude Code
    if (vendors.includes("codex")) {
      try {
        execSync("claude --version", { stdio: "ignore" });
        execSync("codex --version", { stdio: "ignore" });
        const pluginList = execSync("claude plugin list", {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        });
        if (!pluginList.includes("codex@openai-codex")) {
          execSync("claude plugin marketplace add openai/codex-plugin-cc", {
            stdio: "ignore",
          });
          execSync("claude plugin install codex@openai-codex", {
            stdio: "ignore",
          });
          p.log.success(pc.green("Codex plugin installed for Claude Code!"));
        }
      } catch {
        // CLI not available — skip
      }
    }

    // Gemini: configure Serena MCP bridge
    if (vendors.includes("gemini")) {
      // Antigravity bridge
      const mcpConfigPath = join(
        homeDir,
        ".gemini",
        "antigravity",
        "mcp_config.json",
      );
      try {
        if (existsSync(mcpConfigPath)) {
          // biome-ignore lint/suspicious/noExplicitAny: Config file is unstructured
          const mcpConfig: any = JSON.parse(
            readFileSync(mcpConfigPath, "utf-8"),
          );
          if (mcpConfig?.mcpServers) {
            const serena = mcpConfig.mcpServers.serena;
            const bridgeCmd = "oh-my-agent@latest";
            const configured =
              serena?.command === "npx" &&
              Array.isArray(serena?.args) &&
              serena.args.includes(bridgeCmd);
            if (!configured) {
              mcpConfig.mcpServers.serena = {
                command: "npx",
                args: [
                  "-y",
                  "oh-my-agent@latest",
                  "bridge",
                  "http://localhost:12341/mcp",
                ],
                disabled: false,
              };
              writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
              p.log.success(pc.green("Serena MCP bridge configured!"));
            }
          }
        }
      } catch {
        // Config not available — skip
      }

      // Gemini CLI Serena (HTTP mode)
      const geminiConfigPath = join(homeDir, ".gemini", "settings.json");
      try {
        if (existsSync(geminiConfigPath)) {
          // biome-ignore lint/suspicious/noExplicitAny: Config file is unstructured
          const geminiConfig: any = JSON.parse(
            readFileSync(geminiConfigPath, "utf-8"),
          );
          if (
            geminiConfig?.mcpServers &&
            geminiConfig.mcpServers.serena?.url !== "http://localhost:12341/mcp"
          ) {
            geminiConfig.mcpServers.serena = {
              url: "http://localhost:12341/mcp",
            };
            writeFileSync(
              geminiConfigPath,
              JSON.stringify(geminiConfig, null, 2),
            );
            p.log.success(pc.green("Gemini CLI Serena configured!"));
          }
        }
      } catch {
        // Config not available — skip
      }
    }

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
