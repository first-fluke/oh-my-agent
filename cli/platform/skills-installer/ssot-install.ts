import * as fs from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { INSTALLED_SKILLS_DIR } from "../../constants/index.js";
import { clearNonDirectory } from "../../utils/fs-utils.js";

export function installSkill(
  sourceDir: string,
  skillName: string,
  installRoot: string,
  variant?: string,
): boolean {
  const src = join(sourceDir, ".agents", "skills", skillName);
  if (!fs.existsSync(src)) return false;

  const dest = join(installRoot, INSTALLED_SKILLS_DIR, skillName);
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });

  const variantSrcDir = join(src, "variants");
  const stackDir = join(dest, "stack");

  if (variant && fs.existsSync(join(variantSrcDir, variant))) {
    fs.mkdirSync(stackDir, { recursive: true });
    fs.cpSync(join(variantSrcDir, variant), stackDir, {
      recursive: true,
      force: true,
    });
    fs.writeFileSync(
      join(stackDir, "stack.yaml"),
      `language: ${variant}\nsource: preset\n`,
    );
  }

  const destVariantsDir = join(dest, "variants");
  if (fs.existsSync(destVariantsDir)) {
    fs.rmSync(destVariantsDir, { recursive: true, force: true });
  }

  return true;
}

export function installShared(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "skills", "_shared");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, INSTALLED_SKILLS_DIR, "_shared");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installWorkflows(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "workflows");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Copy the SSOT hook runtime (`.agents/hooks/` — core scripts, vendor
 * variants, pi bridge) into the install root. `link()` reads
 * `.agents/hooks/variants/<vendor>.json` from the PROJECT (not the extracted
 * repo), so without this copy a fresh `oma install` silently skips hook and
 * HUD (statusLine) installation for every vendor.
 */
export function installHooks(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "hooks");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "hooks");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Copy the abstract agent definitions (`.agents/agents/*.md`) into the
 * install root. Same project-read contract as {@link installHooks}:
 * `link()`'s `installVendorAgents` reads these from the PROJECT, so a fresh
 * `oma install` without this copy generates no vendor subagents.
 */
export function installAgents(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "agents");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "agents");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installRules(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "rules");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "rules");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installConfigs(
  sourceDir: string,
  installRoot: string,
  force = false,
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  if (fs.existsSync(configSrc)) {
    const configDest = join(installRoot, ".agents", "config");
    fs.mkdirSync(configDest, { recursive: true });

    if (force) {
      fs.cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      for (const entry of fs.readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        const srcPath = join(configSrc, entry.name);

        // User-editable config files are never overwritten; the user owns them.
        if (!fs.existsSync(destPath)) {
          fs.cpSync(
            srcPath,
            destPath,
            entry.isDirectory() ? { recursive: true } : {},
          );
        }
      }
    }
  }

  const mcpSrc = join(sourceDir, ".agents", "mcp.json");
  if (fs.existsSync(mcpSrc)) {
    const agentDir = join(installRoot, ".agents");
    fs.mkdirSync(agentDir, { recursive: true });
    const mcpDest = join(agentDir, "mcp.json");
    if (force || !fs.existsSync(mcpDest)) {
      fs.cpSync(mcpSrc, mcpDest);
    }
  }

  // Bootstrap oma-config.yaml on fresh installs so language/model_preset/
  // vendors patches downstream have a file to operate on. User edits are
  // preserved unless `force` is true.
  const omaConfigSrc = join(sourceDir, ".agents", "oma-config.yaml");
  if (fs.existsSync(omaConfigSrc)) {
    const agentDir = join(installRoot, ".agents");
    fs.mkdirSync(agentDir, { recursive: true });
    const omaConfigDest = join(agentDir, "oma-config.yaml");
    if (force || !fs.existsSync(omaConfigDest)) {
      fs.cpSync(omaConfigSrc, omaConfigDest);
    }
  }
}

export function installGlobalWorkflows(sourceDir: string): void {
  const homeDir = homedir();
  const dest = join(homeDir, ".gemini", "antigravity", "global_workflows");
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Deprecated compatibility wrapper. Prefer installVendorAdaptations().
 */
export function installClaudeSkills(
  sourceDir: string,
  installRoot: string,
): void {
  const srcSkills = join(sourceDir, ".claude", "skills");
  const srcAgents = join(sourceDir, ".claude", "agents");
  const destSkills = join(installRoot, ".claude", "skills");
  const destAgents = join(installRoot, ".claude", "agents");

  if (fs.existsSync(srcSkills)) {
    clearNonDirectory(destSkills);
    fs.mkdirSync(destSkills, { recursive: true });
    fs.cpSync(srcSkills, destSkills, { recursive: true, force: true });
  }

  if (fs.existsSync(srcAgents)) {
    clearNonDirectory(destAgents);
    fs.mkdirSync(destAgents, { recursive: true });
    fs.cpSync(srcAgents, destAgents, { recursive: true, force: true });
  }
}
