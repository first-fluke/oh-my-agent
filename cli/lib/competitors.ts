import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

interface Competitor {
  name: string;
  displayName: string;
  uninstall: () => void;
}

export function cleanLeftoverDirs(cwd: string): void {
  for (const dir of [".omc", ".omx"]) {
    const target = join(cwd, dir);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
}

function detectCompetitors(cwd: string): Competitor[] {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const competitors: Competitor[] = [];

  // --- omc (oh-my-claudecode) ---
  // Only detect if global config is active (OMC:START in CLAUDE.md).
  // Project-level .omc dirs are leftover artifacts — cleaned silently by cleanLeftoverDirs.
  const claudeMdPath = join(homeDir, ".claude", "CLAUDE.md");
  let omcDetected = false;
  if (existsSync(claudeMdPath)) {
    try {
      const content = readFileSync(claudeMdPath, "utf-8");
      omcDetected = content.includes("OMC:START");
    } catch {
      // ignore
    }
  }
  if (omcDetected) {
    competitors.push({
      name: "omc",
      displayName: "oh-my-claudecode",
      uninstall: () => {
        const claudeDir = join(homeDir, ".claude");

        // Remove agents
        for (const agent of [
          "architect",
          "document-specialist",
          "explore",
          "designer",
          "writer",
          "vision",
          "critic",
          "analyst",
          "executor",
          "planner",
        ]) {
          const agentPath = join(claudeDir, "agents", `${agent}.md`);
          if (existsSync(agentPath)) rmSync(agentPath, { force: true });
        }

        // Remove commands
        for (const cmd of [
          "coordinator",
          "omc",
          "ultrawork",
          "deepsearch",
          "analyze",
          "plan",
          "review",
          "planner",
          "orchestrator",
          "update",
        ]) {
          const cmdPath = join(claudeDir, "commands", `${cmd}.md`);
          if (existsSync(cmdPath)) rmSync(cmdPath, { force: true });
        }

        // Remove omc-only skills (skip directories that contain oma's SKILL.md router)
        for (const skill of ["ultrawork", "git-master", "frontend-ui-ux"]) {
          const skillPath = join(claudeDir, "skills", skill);
          if (!existsSync(skillPath)) continue;

          const skillMd = join(skillPath, "SKILL.md");
          if (existsSync(skillMd)) {
            try {
              const content = readFileSync(skillMd, "utf-8");
              if (content.includes(".agents/workflows/")) continue;
            } catch {
              // can't read — skip to be safe
              continue;
            }
          }
          rmSync(skillPath, { recursive: true, force: true });
        }

        // Remove hooks
        for (const hook of [
          "keyword-detector.sh",
          "silent-auto-update.sh",
          "stop-continuation.sh",
        ]) {
          const hookPath = join(claudeDir, "hooks", hook);
          if (existsSync(hookPath)) rmSync(hookPath, { force: true });
        }

        // Remove state/version files
        for (const file of [
          ".omc-version.json",
          ".omc-silent-update.json",
          ".omc-update.log",
          ".omc-config.json",
        ]) {
          const filePath = join(claudeDir, file);
          if (existsSync(filePath)) rmSync(filePath, { force: true });
        }

        // Remove project-level .omc directory
        const omcProjectDir = join(cwd, ".omc");
        if (existsSync(omcProjectDir))
          rmSync(omcProjectDir, { recursive: true, force: true });

        // Clean OMC hooks from settings.json
        const settingsPath = join(claudeDir, "settings.json");
        if (existsSync(settingsPath)) {
          try {
            const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
            if (settings.hooks) {
              for (const event of Object.keys(settings.hooks)) {
                if (!Array.isArray(settings.hooks[event])) continue;
                settings.hooks[event] = settings.hooks[event]
                  .map((entry: { hooks?: { command?: string }[] }) => {
                    if (Array.isArray(entry.hooks)) {
                      entry.hooks = entry.hooks.filter(
                        (h: { command?: string }) =>
                          !h.command ||
                          !(
                            h.command.includes("keyword-detector.sh") ||
                            h.command.includes("silent-auto-update.sh") ||
                            h.command.includes("stop-continuation.sh")
                          ),
                      );
                    }
                    return entry;
                  })
                  .filter(
                    (entry: { hooks?: unknown[] }) =>
                      !entry.hooks || entry.hooks.length > 0,
                  );
                if (settings.hooks[event].length === 0)
                  delete settings.hooks[event];
              }
              if (Object.keys(settings.hooks).length === 0)
                delete settings.hooks;
              writeFileSync(
                settingsPath,
                `${JSON.stringify(settings, null, 2)}\n`,
              );
            }
          } catch {
            // settings.json parse failed, skip hook cleanup
          }
        }

        // Clean OMC block from CLAUDE.md
        const globalClaudeMd = join(claudeDir, "CLAUDE.md");
        if (existsSync(globalClaudeMd)) {
          try {
            const content = readFileSync(globalClaudeMd, "utf-8");
            if (content.includes("OMC:START")) {
              const cleaned = content.replace(
                /<!-- OMC:START[\s\S]*?OMC:END -->\n?/g,
                "",
              );
              writeFileSync(globalClaudeMd, cleaned);
            }
          } catch {
            // ignore
          }
        }
      },
    });
  }

  // --- omo (oh-my-opencode) ---
  for (const name of ["opencode.json", "opencode.jsonc"]) {
    const configPath = join(homeDir, ".config", "opencode", name);
    if (!existsSync(configPath)) continue;

    try {
      const raw = readFileSync(configPath, "utf-8");
      const clean = raw
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/,\s*([\]}])/g, "$1");
      const config = JSON.parse(clean);

      if (
        Array.isArray(config.plugin) &&
        config.plugin.includes("oh-my-opencode")
      ) {
        competitors.push({
          name: "omo",
          displayName: "oh-my-opencode",
          uninstall: () => {
            const freshRaw = readFileSync(configPath, "utf-8");
            const freshClean = freshRaw
              .replace(/\/\/.*$/gm, "")
              .replace(/\/\*[\s\S]*?\*\//g, "")
              .replace(/,\s*([\]}])/g, "$1");
            const freshConfig = JSON.parse(freshClean);
            freshConfig.plugin = (freshConfig.plugin as string[]).filter(
              (pl: string) => pl !== "oh-my-opencode",
            );
            writeFileSync(configPath, JSON.stringify(freshConfig, null, 2));
          },
        });
        break;
      }
    } catch {
      // ignore
    }
  }

  // --- superpowers ---
  const spSkillDir = join(homeDir, ".agents", "skills", "superpowers");
  const spCloneDir = join(homeDir, ".codex", "superpowers");
  if (existsSync(spSkillDir) || existsSync(spCloneDir)) {
    competitors.push({
      name: "superpowers",
      displayName: "superpowers",
      uninstall: () => {
        for (const dir of [spSkillDir, spCloneDir]) {
          if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
        }
      },
    });
  }

  // --- omx (oh-my-codex) ---
  // Only detect if the global CLI package is installed.
  // Project-level .omx dirs are leftover artifacts — cleaned silently by cleanLeftoverDirs.
  try {
    execSync("npm ls -g oh-my-codex", { stdio: "pipe", timeout: 10_000 });
    competitors.push({
      name: "omx",
      displayName: "oh-my-codex",
      uninstall: () => {
        execSync("npx -y oh-my-codex@latest uninstall --yes", {
          stdio: "pipe",
          timeout: 60_000,
        });
      },
    });
  } catch {
    // not installed globally
  }

  return competitors;
}

/**
 * Detect competing oh-my-* tools and prompt the user to remove them.
 * Returns list of actions taken.
 */
export async function promptUninstallCompetitors(
  cwd: string,
): Promise<string[]> {
  // Silently remove leftover project-level dirs (.omc, .omx) — these are artifacts, not active installs.
  cleanLeftoverDirs(cwd);

  const competitors = detectCompetitors(cwd);
  if (competitors.length === 0) return [];

  const names = competitors.map((c) => c.name);
  const shouldRemove = await p.confirm({
    message: `${pc.yellow(names.join(", "))} detected. Remove all?`,
    initialValue: true,
  });

  if (p.isCancel(shouldRemove) || !shouldRemove) return [];

  const actions: string[] = [];
  const spinner = p.spinner();
  spinner.start("Removing competing tools...");

  for (const c of competitors) {
    try {
      c.uninstall();
      actions.push(`${c.displayName} removed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      actions.push(`${c.displayName} removal failed: ${msg}`);
    }
  }

  spinner.stop(
    actions
      .map((a) =>
        a.includes("failed") ? `${pc.red("✗")} ${a}` : `${pc.green("✓")} ${a}`,
      )
      .join("\n"),
  );

  return actions;
}
