import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Resolve whether to auto-update the CLI binary.
 *
 * Precedence (highest first):
 *   1. Project-level: <cwd>/.agents/oma-config.yaml
 *   2. Global-level:  <HOME>/.agents/oma-config.yaml
 *   3. Default: true (opt-out model)
 *
 * When both installs are present, project config beats global.
 * TODO: see docs/oma-config-semantics.md (Task 53)
 */
export function resolveAutoUpdateCli(cwd: string): boolean {
  // 1. Project-level config
  const projectConfigPath = join(cwd, ".agents", "oma-config.yaml");
  if (existsSync(projectConfigPath)) {
    try {
      const content = readFileSync(projectConfigPath, "utf-8");
      const match = content.match(/^auto_update_cli:\s*(true|false)/m);
      if (match) {
        return match[1] === "true";
      }
    } catch {
      // fall through
    }
  }

  // 2. Global-level config
  const globalConfigPath = join(homedir(), ".agents", "oma-config.yaml");
  if (existsSync(globalConfigPath)) {
    try {
      const content = readFileSync(globalConfigPath, "utf-8");
      const match = content.match(/^auto_update_cli:\s*(true|false)/m);
      if (match) {
        return match[1] === "true";
      }
    } catch {
      // fall through
    }
  }

  // 3. Default: opt-out (enabled unless explicitly set to false)
  return true;
}
