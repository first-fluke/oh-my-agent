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

function detectCompetitors(cwd: string): Competitor[] {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const competitors: Competitor[] = [];

  // --- omc (oh-my-claudecode) ---
  const omcProjectDir = join(cwd, ".omc");
  const claudeMdPath = join(homeDir, ".claude", "CLAUDE.md");
  let omcDetected = existsSync(omcProjectDir);
  if (!omcDetected && existsSync(claudeMdPath)) {
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
        execSync(
          "curl -fsSL https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/scripts/uninstall.sh | bash",
          { stdio: "pipe", timeout: 60_000 },
        );
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
  const omxProjectDir = join(cwd, ".omx");
  if (existsSync(omxProjectDir)) {
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
