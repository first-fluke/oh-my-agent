import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  parseProjectYmlLanguages,
  reconcileSerenaLanguages,
} from "../../io/serena.js";

/**
 * Repair one project.yml so every installed serena version can read it.
 *
 * serena 1.6.2 renamed `languages` to `language_servers` and rewrites the file
 * under the new name; 1.6.1 requires the old one and dies with
 * `KeyError: 'languages'` before its server ever starts. Mirroring the list
 * under both names is a shape all of them accept.
 *
 * The repair reuses the file's OWN list rather than installing a default set.
 * An earlier version injected python + typescript + dart + terraform into every
 * registered project, which starts four language servers per session in repos
 * that use one.
 *
 * @returns true when the file was repaired.
 */
function repairProjectConfig(projectPath: string): boolean {
  const projectConfigPath = join(projectPath, ".serena", "project.yml");
  if (!existsSync(projectConfigPath)) return false;

  const content = readFileSync(projectConfigPath, "utf8");
  const current = parseProjectYmlLanguages(content);
  if (current.length === 0) return false;

  const repaired = reconcileSerenaLanguages(content, current);
  if (repaired === null) return false;

  writeFileSync(projectConfigPath, repaired);
  console.error(
    `[Bridge] Restored 'languages' key in ${projectConfigPath} (required by serena 1.6.1)`,
  );
  return true;
}

/**
 * Ensure serena project configs are readable by the installed serena.
 *
 * With `projectRoot` given, only that project is checked — the normal path, and
 * the quiet one. Without it, every project registered in
 * `~/.serena/serena_config.yml` is swept; that registry accumulates stale
 * entries (deleted checkouts, test temp dirs), so missing paths are skipped
 * silently rather than reported as warnings the user cannot act on.
 */
export function validateSerenaConfigs(projectRoot?: string): void {
  try {
    if (projectRoot) {
      repairProjectConfig(resolve(projectRoot));
      return;
    }

    const globalConfigPath = join(homedir(), ".serena", "serena_config.yml");
    if (!existsSync(globalConfigPath)) return;

    const globalContent = readFileSync(globalConfigPath, "utf8");
    const projectsMatch = globalContent.match(
      /^projects:\s*\n((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) return;

    const projectLines =
      (projectsMatch[1] ?? "").match(/^\s*-\s*(.+)$/gm) || [];

    for (const line of projectLines) {
      const projectPath = resolve(line.replace(/^\s*-\s*/, "").trim());
      if (!existsSync(projectPath)) continue;
      repairProjectConfig(projectPath);
    }
  } catch (err) {
    console.error(
      `[Bridge] Warning: Failed to validate Serena configs: ${err instanceof Error ? err.message : err}`,
    );
  }
}
