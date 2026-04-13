import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import {
  applyRecommendedGeminiSettings,
  needsGeminiSettingsUpdate,
} from "../lib/gemini/settings.js";
import { generateCursorRules, mergeRulesIndexForVendor } from "../lib/rules.js";
import {
  createCliSymlinks,
  detectExistingCliSymlinkDirs,
  ensureCursorMcpSymlink,
  getInstalledSkillNames,
  installVendorAdaptations,
  readVendorsFromConfig,
} from "../lib/skills.js";
import type { CliVendor, VendorType } from "../types/index.js";

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
