import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function validateSerenaConfigs(): void {
  const globalConfigPath = join(homedir(), ".serena", "serena_config.yml");

  if (!existsSync(globalConfigPath)) {
    return;
  }

  try {
    const globalContent = readFileSync(globalConfigPath, "utf8");

    const projectsMatch = globalContent.match(
      /^projects:\s*\n((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) {
      return;
    }

    const projectLines =
      (projectsMatch[1] ?? "").match(/^\s*-\s*(.+)$/gm) || [];
    const projects = projectLines.map((line) =>
      line.replace(/^\s*-\s*/, "").trim(),
    );

    for (const rawProjectPath of projects) {
      const projectPath = resolve(rawProjectPath);

      if (!existsSync(projectPath)) {
        console.error(
          `[Bridge] Skipping non-existent project path: ${projectPath}`,
        );
        continue;
      }

      const projectConfigPath = join(projectPath, ".serena", "project.yml");

      if (!existsSync(projectConfigPath)) {
        continue;
      }

      const content = readFileSync(projectConfigPath, "utf8");

      if (!/^languages:/m.test(content)) {
        console.error(
          `[Bridge] Missing 'languages' key in ${projectConfigPath}, adding default...`,
        );

        const insertIndex = content.search(/\n(?=\w)/);
        if (insertIndex !== -1) {
          const newContent = `${content.slice(0, insertIndex)}\n\nlanguages:\n  - python\n  - typescript\n  - dart\n  - terraform${content.slice(insertIndex)}`;
          writeFileSync(projectConfigPath, newContent);
          console.error(`[Bridge] Fixed ${projectConfigPath}`);
        }
      }
    }
  } catch (err) {
    console.error(
      `[Bridge] Warning: Failed to validate Serena configs: ${err instanceof Error ? err.message : err}`,
    );
  }
}
