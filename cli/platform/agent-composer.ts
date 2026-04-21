import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../cli-kit/frontmatter.js";

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

interface AbstractAgentDefinition {
  agentKey: string;
  entry: string;
  frontmatter: Record<string, unknown>;
  body: string;
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

function serializeTomlString(value: string): string {
  return JSON.stringify(value);
}

function serializeTomlMultiline(value: string): string {
  const escaped = value.replaceAll('"""', '\\"\\"\\"');
  return `"""\n${escaped.trim()}\n"""`;
}

function _serializeTomlArray(values: string[]): string {
  return `[${values.map((value) => serializeTomlString(value)).join(", ")}]`;
}

function formatAgentBody(body: string, protocolPath: string): string {
  return body.replace(
    "Follow the vendor-specific execution protocol:",
    `Follow \`${protocolPath}\`:`,
  );
}

function readAbstractAgentDefinitions(
  sourceDir: string,
): AbstractAgentDefinition[] {
  const agentsSrcDir = join(sourceDir, ".agents", "agents");
  if (!existsSync(agentsSrcDir)) return [];

  return readdirSync(agentsSrcDir, { withFileTypes: true })
    .filter((dirEntry) => dirEntry.isFile() && dirEntry.name.endsWith(".md"))
    .map((dirEntry) => {
      const entry = dirEntry.name;
      const agentKey = entry.replace(".md", "");
      const content = readFileSync(join(agentsSrcDir, entry), "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);
      return { agentKey, entry, frontmatter, body };
    });
}

function buildMarkdownAgentFile(
  definition: AbstractAgentDefinition,
  variant: AgentVariant,
  config: AgentConfig,
  vendor: string,
): { fileName: string; content: string } {
  const { agentKey, entry, frontmatter, body } = definition;
  const mapping = TOOL_MAPPING[vendor] || {};
  const rawTools: string | string[] =
    (config.tools as string | string[]) ||
    (frontmatter.tools as string | string[]) ||
    variant.toolsDefault;
  const toolsList = Array.isArray(rawTools)
    ? rawTools
    : String(rawTools || "")
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean);

  const resolvedTools = toolsList.map(
    (tool: string) => mapping[tool.toLowerCase()] || tool,
  );
  const finalTools = Array.isArray(variant.toolsDefault)
    ? resolvedTools
    : resolvedTools.join(", ");

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
  if (config.extra) {
    Object.assign(fm, config.extra);
  }

  const geminiSkillReferences =
    vendor === "gemini" ? buildGeminiSkillReferences(frontmatter.skills) : "";
  const finalBody = `<!-- Generated by oh-my-agent CLI. Source: .agents/agents/${entry} -->\n${geminiSkillReferences}${formatAgentBody(body, variant.protocolPath)}`;
  const vendorFrontmatter = sanitizeFrontmatterForVendor(vendor, fm);

  return {
    fileName: entry,
    content: serializeFrontmatter(vendorFrontmatter, finalBody),
  };
}

function buildCodexAgentFile(
  definition: AbstractAgentDefinition,
  variant: AgentVariant,
  config: AgentConfig,
): { fileName: string; content: string } {
  const { agentKey, entry, frontmatter, body } = definition;
  const name = (frontmatter.name as string) || agentKey;
  const description = String(
    config.description || frontmatter.description || name,
  );
  const model = String(
    config.model || frontmatter.model || variant.modelDefault,
  );
  const reasoningEffort = config.effort || "medium";
  const sandboxMode =
    typeof config.extra?.sandbox_mode === "string"
      ? config.extra.sandbox_mode
      : "workspace-write";
  const finalBody = formatAgentBody(body, variant.protocolPath);
  const skills = Array.isArray(frontmatter.skills)
    ? frontmatter.skills.map((skill) => String(skill)).filter(Boolean)
    : [];

  const lines = [
    `# Generated by oh-my-agent CLI. Source: .agents/agents/${entry}`,
    `name = ${serializeTomlString(name)}`,
    `description = ${serializeTomlString(description)}`,
    `model = ${serializeTomlString(model)}`,
    `model_reasoning_effort = ${serializeTomlString(reasoningEffort)}`,
    `sandbox_mode = ${serializeTomlString(sandboxMode)}`,
    `developer_instructions = ${serializeTomlMultiline(finalBody)}`,
  ];

  for (const skill of skills) {
    lines.push("");
    lines.push("[[skills.config]]");
    lines.push(
      `path = ${serializeTomlString(`.agents/skills/${skill}/SKILL.md`)}`,
    );
    lines.push("enabled = true");
  }

  if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
    lines.push("");
    lines.push("[mcp_servers]");
    for (const [server, enabled] of Object.entries(config.mcpServers)) {
      lines.push(`${server} = ${serializeTomlString(String(enabled))}`);
    }
  }

  return {
    fileName: `${agentKey}.toml`,
    content: `${lines.join("\n")}\n`,
  };
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
  if (!variant?.destDir) return;

  const destDir = join(targetDir, variant.destDir);
  mkdirSync(destDir, { recursive: true });

  for (const definition of readAbstractAgentDefinitions(sourceDir)) {
    const config = variant.agents[definition.agentKey] || {};
    const output =
      vendor === "codex"
        ? buildCodexAgentFile(definition, variant, config)
        : buildMarkdownAgentFile(definition, variant, config, vendor);

    writeFileSync(join(destDir, output.fileName), output.content);
  }
}
