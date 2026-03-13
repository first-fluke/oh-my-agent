import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkStarred } from "../lib/github.js";
import { migrateToAgents } from "../lib/migrate.js";
import {
  type CliTool,
  createCliSymlinks,
  getAllSkills,
  INSTALLED_SKILLS_DIR,
  installConfigs,
  installGlobalWorkflows,
  installShared,
  installSkill,
  installWorkflows,
  PRESETS,
} from "../lib/skills.js";

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
      { value: "backend", label: "⚙️ Backend", hint: "FastAPI/Python" },
      { value: "mobile", label: "📱 Mobile", hint: "Flutter/Dart" },
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

  const cliSelection = await p.multiselect({
    message: "Also create symlinks for other CLI tools?",
    options: [
      {
        value: "claude",
        label: "Claude Code",
        hint: ".claude/skills/",
      },
      {
        value: "copilot",
        label: "GitHub Copilot",
        hint: ".github/skills/",
      },
    ],
    required: false,
  });

  const selectedClis: CliTool[] = p.isCancel(cliSelection)
    ? []
    : (cliSelection as CliTool[]);

  const cwd = process.cwd();
  const spinner = p.spinner();
  spinner.start("Installing skills...");

  try {
    await installShared(cwd);
    await installWorkflows(cwd);
    await installConfigs(cwd);
    await installGlobalWorkflows();

    for (const skillName of selectedSkills) {
      spinner.message(`Installing ${pc.cyan(skillName)}...`);
      await installSkill(skillName, cwd);
    }

    spinner.stop("Skills installed!");

    const cliSymlinks =
      selectedClis.length > 0
        ? createCliSymlinks(cwd, selectedClis, selectedSkills)
        : { created: [], skipped: [] };

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

    if (checkStarred()) {
      p.note(
        `${pc.green("⭐")} Thank you for starring oh-my-agent!\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
        "Support",
      );
    } else {
      p.note(
        `${pc.yellow("❤️")} Enjoying oh-my-agent? Give it a star or sponsor!\n${pc.dim("gh api --method PUT /user/starred/first-fluke/oh-my-agent")}\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
        "Support",
      );
    }
  } catch (error) {
    spinner.stop("Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
