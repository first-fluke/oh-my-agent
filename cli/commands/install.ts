import { execSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { promptUninstallCompetitors } from "../lib/competitors.js";
import {
  isAlreadyStarred,
  isGhAuthenticated,
  isGhInstalled,
} from "../lib/github.js";
import { migrateSharedLayout, migrateToAgents } from "../lib/migrate.js";
import {
  type CliTool,
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
} from "../lib/skills.js";
import { downloadAndExtract } from "../lib/tarball.js";

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
      if (match) codes.push(match[1]);
    }
  }

  return codes.map((code) => ({
    value: code,
    label: LANGUAGE_NAMES[code] ?? code,
  }));
}

export async function install(): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-agent ")));

  // Auto-migrate from legacy .agent/ to .agents/
  const migrations = migrateToAgents(process.cwd());
  if (migrations.length > 0) {
    p.note(
      migrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
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
  const language = await p.select({
    message: "Response language?",
    options: languages,
    initialValue: "en",
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

  const selectedClis: CliTool[] = ["claude"];
  const hasGithubDir = existsSync(join(cwd, ".github"));
  if (hasGithubDir) {
    selectedClis.push("copilot");
  } else {
    const copilotSelection = await p.confirm({
      message: "Also create symlinks for GitHub Copilot? (.github/skills/)",
      initialValue: false,
    });

    if (!p.isCancel(copilotSelection) && copilotSelection) {
      selectedClis.push("copilot");
    }
  }
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
      installVendorAdaptations(repoDir, cwd, [
        "claude",
        "codex",
        "gemini",
        "qwen",
      ]);
      spinner.stop("Vendor adaptations installed!");

      // Patch user-preferences.yaml with selected language
      const userPrefsPath = join(cwd, ".agents", "config", "user-preferences.yaml");
      if (existsSync(userPrefsPath)) {
        const prefs = readFileSync(userPrefsPath, "utf-8");
        writeFileSync(
          userPrefsPath,
          prefs.replace(/^language:\s*.+$/m, `language: ${language as string}`),
        );
      }

      const sharedLayoutMigrations = migrateSharedLayout(cwd);
      if (sharedLayoutMigrations.length > 0) {
        p.note(
          sharedLayoutMigrations.map((m) => `${pc.green("✓")} ${m}`).join("\n"),
          "Shared layout migration",
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

    // --- Git rerere Setup ---
    try {
      const rerereEnabled = execSync("git config --get rerere.enabled", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

      if (rerereEnabled === "true") {
        p.log.success(pc.green("git rerere is already enabled."));
      }
    } catch {
      const shouldEnable = await p.confirm({
        message:
          "Enable git rerere? (Recommended for multi-agent merge conflict reuse)",
        initialValue: true,
      });

      if (!p.isCancel(shouldEnable) && shouldEnable) {
        try {
          execSync("git config --global rerere.enabled true");
          p.log.success(pc.green("git rerere enabled globally!"));
        } catch (err) {
          p.log.error(`Failed to enable git rerere: ${err}`);
        }
      }
    }

    // --- MCP Configuration Setup ---
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";

    // --- Claude Code recommended settings ---
    let hasClaude = false;
    try {
      execSync("claude --version", { stdio: "ignore" });
      hasClaude = true;
    } catch {}

    const claudeSettingsPath = join(homeDir, ".claude", "settings.json");
    if (hasClaude)
      try {
        // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
        let claudeSettings: any = {};
        if (existsSync(claudeSettingsPath)) {
          claudeSettings = JSON.parse(
            readFileSync(claudeSettingsPath, "utf-8"),
          );
        }

        const needsClaudeSettings =
          (claudeSettings.env?.cleanupPeriodDays ?? 0) < 180 ||
          (claudeSettings.env?.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS ?? 0) <
            100000 ||
          (claudeSettings.env?.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE ?? 0) < 80 ||
          !claudeSettings.attribution?.commit ||
          !claudeSettings.attribution?.pr ||
          claudeSettings.env?.DISABLE_TELEMETRY !== "1" ||
          claudeSettings.env?.DISABLE_ERROR_REPORTING !== "1" ||
          claudeSettings.env?.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY !== "1";

        if (needsClaudeSettings) {
          const shouldApply = await p.confirm({
            message: "Apply recommended Claude Code settings?",
            initialValue: true,
          });

          if (!p.isCancel(shouldApply) && shouldApply) {
            claudeSettings.env = {
              ...(claudeSettings.env || {}),
              cleanupPeriodDays: 180,
              CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: 100000,
              CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 80,
              DISABLE_TELEMETRY: "1",
              DISABLE_ERROR_REPORTING: "1",
              CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
            };
            claudeSettings.attribution = {
              commit:
                "Generated with oh-my-agent\n\nCo-Authored-By: First Fluke <our.first.fluke@gmail.com>",
              pr: "Generated with [oh-my-agent](https://github.com/first-fluke/oh-my-agent)",
            };
            writeFileSync(
              claudeSettingsPath,
              `${JSON.stringify(claudeSettings, null, 2)}\n`,
            );
            p.log.success(
              pc.green("Claude Code recommended settings applied!"),
            );
          }
        }
      } catch (err) {
        p.log.warn(`Could not configure Claude Code settings: ${err}`);
      }

    // --- Codex Plugin for Claude Code ---
    if (hasClaude) {
      let hasCodex = false;
      try {
        execSync("codex --version", { stdio: "ignore" });
        hasCodex = true;
      } catch {}

      if (hasCodex) {
        let codexPluginInstalled = false;
        try {
          const pluginList = execSync("claude plugin list", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
          });
          codexPluginInstalled = pluginList.includes("codex@openai-codex");
        } catch {}

        if (!codexPluginInstalled) {
          try {
            execSync("claude plugin marketplace add openai/codex-plugin-cc", {
              stdio: "ignore",
            });
            execSync("claude plugin install codex@openai-codex", {
              stdio: "ignore",
            });
            p.log.success(pc.green("Codex plugin installed for Claude Code!"));
          } catch (err) {
            p.log.warn(`Could not install Codex plugin: ${err}`);
          }
        }
      }
    }

    const mcpConfigPath = join(
      homeDir,
      ".gemini",
      "antigravity",
      "mcp_config.json",
    );

    // biome-ignore lint/suspicious/noExplicitAny: Config file is unstructured
    let mcpConfig: any = null;
    let configExists = false;

    try {
      if (existsSync(mcpConfigPath)) {
        const content = readFileSync(mcpConfigPath, "utf-8");
        mcpConfig = JSON.parse(content);
        configExists = true;
      }
    } catch (_e) {
      // Ignore errors, just assume config doesn't exist or is invalid
    }

    if (configExists && mcpConfig && mcpConfig.mcpServers) {
      const serenaConfig = mcpConfig.mcpServers.serena;
      const bridgeCommand = "oh-my-agent@latest";

      const isBridgeConfigured =
        serenaConfig &&
        serenaConfig.command === "npx" &&
        Array.isArray(serenaConfig.args) &&
        serenaConfig.args.includes(bridgeCommand) &&
        serenaConfig.args.includes("bridge");

      if (!isBridgeConfigured) {
        const shouldConfigure = await p.confirm({
          message:
            "Configure Serena MCP with bridge? (Required for full functionality)",
          initialValue: true,
        });

        if (p.isCancel(shouldConfigure)) {
          // User cancelled, do nothing
        } else if (shouldConfigure) {
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

          try {
            writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
            p.log.success(pc.green("Serena MCP configured successfully!"));
          } catch (err) {
            p.log.error(`Failed to update MCP config: ${err}`);
          }
        }
      }
    }

    // --- Gemini CLI Configuration Setup ---
    const geminiConfigPath = join(homeDir, ".gemini", "settings.json");
    // biome-ignore lint/suspicious/noExplicitAny: Config file is unstructured
    let geminiConfig: any = null;
    let geminiConfigExists = false;

    try {
      if (existsSync(geminiConfigPath)) {
        const content = readFileSync(geminiConfigPath, "utf-8");
        geminiConfig = JSON.parse(content);
        geminiConfigExists = true;
      }
    } catch (_e) {
      // Ignore
    }

    if (geminiConfigExists && geminiConfig && geminiConfig.mcpServers) {
      const serenaConfig = geminiConfig.mcpServers.serena;
      const isSerenaConfigured =
        serenaConfig && serenaConfig.url === "http://localhost:12341/mcp";

      if (!isSerenaConfigured) {
        const shouldConfigureGemini = await p.confirm({
          message: "Configure Serena for Gemini CLI? (HTTP Mode)",
          initialValue: true,
        });

        if (p.isCancel(shouldConfigureGemini)) {
          // User cancelled
        } else if (shouldConfigureGemini) {
          geminiConfig.mcpServers.serena = {
            url: "http://localhost:12341/mcp",
          };

          try {
            writeFileSync(
              geminiConfigPath,
              JSON.stringify(geminiConfig, null, 2),
            );
            p.log.success(pc.green("Gemini CLI configured successfully!"));
          } catch (err) {
            p.log.error(`Failed to update Gemini config: ${err}`);
          }
        }
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
