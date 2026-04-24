import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import {
  generateCursorRules,
  mergeRulesIndexForVendor,
} from "../../platform/rules.js";
import {
  createCliSymlinks,
  detectExistingCliSymlinkDirs,
  ensureCursorMcpSymlink,
  getInstalledSkillNames,
  installCodexWorkflowSkills,
  installVendorAdaptations,
  readVendorsFromConfig,
} from "../../platform/skills-installer.js";
import type { CliVendor, VendorType } from "../../types/index.js";
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

/**
 * Regenerate all vendor-specific files (.claude/, .cursor/, .gemini/, etc.)
 * from the SSOT in .agents/ without a full install or update.
 *
 * Useful during development of hooks, agents, or rules.
 */
export function link(vendorFilter?: string[]): void {
  const cwd = process.cwd();

  if (!existsSync(join(cwd, ".agents"))) {
    console.error(
      `${pc.red("✗")} No .agents/ directory found. Run ${pc.cyan("oma install")} first.`,
    );
    process.exitCode = 1;
    return;
  }

  // Determine vendors to regenerate
  let configuredVendors: CliVendor[];
  if (vendorFilter && vendorFilter.length > 0) {
    configuredVendors = vendorFilter as CliVendor[];
  } else {
    configuredVendors = readVendorsFromConfig(cwd);
  }

  const hookVendors = configuredVendors.filter(
    (v): v is VendorType => v !== "copilot",
  );

  if (hookVendors.length === 0) {
    console.log(`${pc.yellow("⚠")} No vendors to link.`);
    return;
  }

  console.log(
    `${pc.blue("●")} Linking vendors: ${hookVendors.map((v) => pc.cyan(v)).join(", ")}`,
  );

  // 1. Install vendor-specific adaptations (agents, hooks, settings)
  installVendorAdaptations(cwd, cwd, hookVendors);

  // 2. Gemini-specific settings
  if (configuredVendors.includes("gemini")) {
    const geminiSettingsPath = join(cwd, ".gemini", "settings.json");
    let geminiSettings: unknown = {};
    if (existsSync(geminiSettingsPath)) {
      try {
        geminiSettings = JSON.parse(readFileSync(geminiSettingsPath, "utf-8"));
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

  // 2b. Qwen-specific settings
  if (configuredVendors.includes("qwen")) {
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

  // 2c. Codex-specific settings
  if (configuredVendors.includes("codex")) {
    installCodexWorkflowSkills(cwd, cwd);
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

  // 3. Cursor-specific: MCP symlink + rules
  if (configuredVendors.includes("cursor")) {
    ensureCursorMcpSymlink(cwd);
    generateCursorRules(cwd);
  }

  // 4. Merge vendor documentation (CLAUDE.md, GEMINI.md, AGENTS.md)
  const mergedFiles = new Set<string>();
  for (const v of ["claude", "gemini", "codex", "cursor", "qwen"] as const) {
    if (!configuredVendors.includes(v)) continue;
    const target =
      v === "claude" ? "CLAUDE.md" : v === "gemini" ? "GEMINI.md" : "AGENTS.md";
    if (mergedFiles.has(target)) continue;
    if (mergeRulesIndexForVendor(cwd, v)) {
      mergedFiles.add(target);
    }
  }

  // 5. Refresh CLI skill symlinks
  const cliTools = detectExistingCliSymlinkDirs(cwd);
  if (cliTools.length > 0) {
    const skillNames = getInstalledSkillNames(cwd);
    createCliSymlinks(cwd, cliTools, skillNames);
  }

  // Summary
  const parts: string[] = [];
  for (const v of hookVendors) {
    parts.push(`${pc.green("✓")} ${v}`);
  }
  if (mergedFiles.size > 0) {
    parts.push(`${pc.green("✓")} docs: ${[...mergedFiles].join(", ")}`);
  }

  console.log(parts.join("\n"));
  console.log(`\n${pc.green("✓")} Linked ${hookVendors.length} vendor(s).`);
}
