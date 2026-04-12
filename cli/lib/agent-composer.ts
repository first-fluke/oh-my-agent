import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

// =============================================================================
// Agent Tool Mapping (Abstract -> Vendor-specific)
// =============================================================================

export const TOOL_MAPPING: Record<string, Record<string, string>> = {
  gemini: {
    read: "read_file",
    write: "write_file",
    edit: "replace",
    bash: "run_shell_command",
    grep: "grep_search",
    glob: "glob",
    ask: "ask_user",
    memory: "save_memory",
  },
  claude: {
    read: "Read",
    write: "Write",
    edit: "Edit",
    bash: "Bash",
    grep: "Grep",
    glob: "Glob",
  },
  cursor: {
    read: "read_file",
    write: "write_file",
    edit: "replace",
    bash: "run_shell_command",
    grep: "grep_search",
    glob: "glob",
  },
};

export interface AgentConfig {
  description?: string;
  tools?: string[] | string;
  model?: string;
  maxTurns?: number;
  effort?: string;
  kind?: string;
  temperature?: number;
  timeoutMins?: number;
  mcpServers?: Record<string, unknown>;
  // biome-ignore lint/suspicious/noExplicitAny: Custom vendor-specific fields
  extra?: Record<string, any>;
}

export interface AgentVariant {
  vendor: string;
  destDir: string;
  modelDefault: string;
  maxTurnsDefault?: number;
  toolsDefault: string[] | string;
  protocolPath: string;
  agents: Record<string, AgentConfig>;
}

function getMaxTurnsField(vendor: string): string {
  return vendor === "gemini" ? "max_turns" : "maxTurns";
}

function getTimeoutField(vendor: string): string {
  return vendor === "gemini" ? "timeout_mins" : "timeoutMins";
}

function supportsSkillsFrontmatter(vendor: string): boolean {
  return vendor !== "gemini";
}

function buildGeminiSkillReferences(skills: unknown): string {
  if (!Array.isArray(skills) || skills.length === 0) return "";

  const skillPaths = skills
    .map((skill) => String(skill).trim())
    .filter(Boolean)
    .map((skill) => `- \`.agents/skills/${skill}/SKILL.md\``);

  if (skillPaths.length === 0) return "";

  return [
    "",
    "## Skill References",
    "",
    "When relevant, use these project resources as the authoritative implementation guide:",
    ...skillPaths,
    "",
  ].join("\n");
}

function sanitizeFrontmatterForVendor(
  vendor: string,
  frontmatter: Record<string, unknown>,
): Record<string, unknown> {
  if (vendor !== "gemini") return frontmatter;

  const allowedKeys = new Set([
    "name",
    "description",
    "kind",
    "tools",
    "mcpServers",
    "model",
    "temperature",
    "max_turns",
    "timeout_mins",
  ]);

  return Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => allowedKeys.has(key)),
  );
}

/**
 * Generate vendor-specific agent files from core definitions and variant config.
 */
export function installVendorAgents(
  sourceDir: string,
  targetDir: string,
  vendor: string,
): void {
  const agentsSrcDir = join(sourceDir, ".agents", "agents");
  const variantPath = join(agentsSrcDir, "variants", `${vendor}.json`);

  if (!existsSync(agentsSrcDir) || !existsSync(variantPath)) return;

  const variant: AgentVariant = JSON.parse(readFileSync(variantPath, "utf-8"));
  if (!variant || !variant.destDir) return;

  const destDir = join(targetDir, variant.destDir);
  mkdirSync(destDir, { recursive: true });

  const mapping = TOOL_MAPPING[vendor] || {};

  for (const dirEntry of readdirSync(agentsSrcDir, { withFileTypes: true })) {
    if (!dirEntry.isFile() || !dirEntry.name.endsWith(".md")) continue;
    const entry = dirEntry.name;
    const agentKey = entry.replace(".md", "");

    const content = readFileSync(join(agentsSrcDir, entry), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const config = variant.agents[agentKey] || {};

    // 1. Resolve tools (Variant Config > Core Frontmatter > Variant Default)
    const rawTools: string | string[] =
      (config.tools as string | string[]) ||
      (frontmatter.tools as string | string[]) ||
      variant.toolsDefault;
    const toolsList = Array.isArray(rawTools)
      ? rawTools
      : String(rawTools || "")
          .split(",")
          .map((t: string) => t.trim());

    const resolvedTools = toolsList.map(
      (t: string) => mapping[t.toLowerCase()] || t,
    );
    const finalTools = Array.isArray(variant.toolsDefault)
      ? resolvedTools
      : resolvedTools.join(", ");

    // 2. Build frontmatter
    const fm: Record<string, unknown> = {
      name: (frontmatter.name as string) || agentKey,
      description: config.description || frontmatter.description,
      tools: finalTools,
      model: config.model || frontmatter.model || variant.modelDefault,
    };

    if (variant.maxTurnsDefault || config.maxTurns || frontmatter.maxTurns) {
      fm[getMaxTurnsField(vendor)] =
        config.maxTurns || frontmatter.maxTurns || variant.maxTurnsDefault;
    }
    if (config.effort) fm.effort = config.effort;
    if (config.kind) fm.kind = config.kind;
    if (config.temperature !== undefined) fm.temperature = config.temperature;
    if (config.timeoutMins !== undefined) {
      fm[getTimeoutField(vendor)] = config.timeoutMins;
    }
    if (config.mcpServers) fm.mcpServers = config.mcpServers;
    if (frontmatter.skills && supportsSkillsFrontmatter(vendor)) {
      fm.skills = frontmatter.skills;
    }

    // Merge extra fields from variant config
    if (config.extra) {
      Object.assign(fm, config.extra);
    }

    // 3. Process body (inject protocol)
    const finalBodyRaw = body.replace(
      "Follow the vendor-specific execution protocol:",
      `Follow \`${variant.protocolPath}\`:`,
    );
    const geminiSkillReferences =
      vendor === "gemini" ? buildGeminiSkillReferences(frontmatter.skills) : "";
    const finalBody = `<!-- Generated by oh-my-agent CLI. Source: .agents/agents/${entry} -->\n${geminiSkillReferences}${finalBodyRaw}`;

    const vendorFrontmatter = sanitizeFrontmatterForVendor(vendor, fm);
    writeFileSync(
      join(destDir, entry),
      serializeFrontmatter(vendorFrontmatter, finalBody),
    );
  }
}
