import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isOpencodeFamily,
  OPENCODE_FAMILY_HOSTS,
} from "../constants/opencode-family.js";
import { getVendorCapabilities } from "../constants/vendor-capabilities.js";
import { loadUserConfig } from "../io/runtime-dispatch/config-loader.js";
import { resolveAgentPlanFromConfig } from "../io/runtime-dispatch/resolve-plan.js";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.js";
import { atomicWriteFileSync } from "../utils/safe-write.js";
import { normalizeAgentId, type OmaConfig } from "./agent-config.js";
import type { Difficulty } from "./context-loader.js";
import { bindDefinitionPaths } from "./definition-paths.js";
import { safeGetInstallMode } from "./install-context.js";
import { assertContainedRelPath } from "./path-containment.js";
import { safeLoadVariant } from "./variant-loader.js";

// =============================================================================
// Agent Tool Mapping (Abstract -> Vendor-specific)
// =============================================================================

export const TOOL_MAPPING: Record<string, Record<string, string>> = {
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
  grok: {
    read: "read_file",
    write: "write_file",
    edit: "search_replace",
    bash: "run_terminal_cmd",
    grep: "grep",
    glob: "list_dir",
    ask: "ask_user",
  },
  qwen: {
    read: "read_file",
    write: "write_file",
    edit: "edit",
    bash: "run_shell_command",
    grep: "grep_search",
    glob: "glob",
  },
  copilot: {
    read: "read",
    write: "edit",
    edit: "edit",
    bash: "execute",
    grep: "search",
    glob: "search",
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
  effortDefault?: string;
  maxTurnsDefault?: number;
  toolsDefault: string[] | string;
  protocolPath: string;
  agents: Record<string, AgentConfig>;
}

// Qwen Code discovers project subagents from `.qwen/agents/*.md`. Keep this
// fallback in source code because `.agents/` is generated installation output,
// not an editable CLI source of truth. Omitting both model and tools lets Qwen
// inherit the parent session's model and full tool/MCP set.
const QWEN_NATIVE_AGENT_VARIANT: AgentVariant = {
  vendor: "qwen",
  destDir: ".qwen/agents",
  modelDefault: "inherit",
  toolsDefault: [],
  protocolPath: ".agents/skills/_shared/runtime/execution-protocols/qwen.md",
  agents: {},
};

const COPILOT_NATIVE_AGENT_VARIANT: AgentVariant = {
  vendor: "copilot",
  destDir: ".github/agents",
  modelDefault: "inherit",
  toolsDefault: [],
  protocolPath: ".agents/skills/_shared/runtime/execution-protocols/copilot.md",
  agents: {},
};

interface AbstractAgentDefinition {
  agentKey: string;
  entry: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

function getMaxTurnsField(_vendor: string): string {
  return "maxTurns";
}

function getTimeoutField(_vendor: string): string {
  return "timeoutMins";
}

function supportsSkillsFrontmatter(vendor: string): boolean {
  // Qwen Code and the opencode family (OpenCode, Kilo) have no `skills`
  // frontmatter key. Qwen skills are discovered from the parent session;
  // opencode-family skills are project-level. Copilot discovers
  // `.github/skills` natively and its custom-agent schema does not define a
  // `skills` field.
  return !isOpencodeFamily(vendor) && !["qwen", "copilot"].includes(vendor);
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

// =============================================================================
// CHARTER_CHECK stripping
// =============================================================================

const CHARTER_CHECK_BEGIN = "<!-- CHARTER_CHECK_BEGIN -->";
const CHARTER_CHECK_END = "<!-- CHARTER_CHECK_END -->";

/**
 * Remove the CHARTER_CHECK block (and its sentinel markers) from an agent body.
 *
 * The block is delimited by HTML comment markers inserted surgically in
 * `.agents/agents/*.md` source files.  When the agent is Simple, the ~90-token
 * Charter Preflight scaffold is unnecessary and can be stripped to save tokens.
 *
 * If either marker is absent the body is returned unchanged (graceful fallback).
 * The function is pure — it does not mutate the input string.
 */
export function stripCharterCheck(body: string): string {
  const beginIdx = body.indexOf(CHARTER_CHECK_BEGIN);
  const endIdx = body.indexOf(CHARTER_CHECK_END);

  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    // Markers not found or malformed — return unchanged (safe fallback)
    return body;
  }

  const afterEnd = endIdx + CHARTER_CHECK_END.length;
  // Trim a single trailing newline left by the removed block so the surrounding
  // sections remain cleanly separated.
  const tail = body.slice(afterEnd).replace(/^\n/, "");
  return body.slice(0, beginIdx) + tail;
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
  difficulty?: Difficulty,
  definitionsRoot = ".agents",
): { fileName: string; content: string } {
  const { agentKey, entry, frontmatter, body } = definition;
  const mapping = TOOL_MAPPING[vendor] || {};
  const rawTools: string | string[] =
    (config.tools as string | string[]) ||
    (vendor === "copilot" ? variant.toolsDefault : undefined) ||
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

  // Only emit `tools` when at least one tool resolved. opencode's agent schema
  // types `tools` as an object map (`{name: boolean}`), so an empty array
  // (`tools: []`) is the wrong shape and triggers ConfigInvalidError at
  // bootstrap. Omitting it when empty keeps the frontmatter schema-valid for
  // every vendor (an empty tool list carries no meaning anyway).
  const hasTools =
    (vendor === "copilot" && config.tools !== undefined) ||
    (Array.isArray(finalTools)
      ? finalTools.length > 0
      : finalTools.trim().length > 0);
  // opencode's model catalog is login/subscription-gated and varies per install,
  // so oma must not pin a hardcoded opencode slug (see
  // web/docs/guide/per-agent-models.md — "oma does not hardcode opencode model
  // slugs"). The "inherit" sentinel (also used by cursor/kiro/commandcode) means
  // "don't pin a model": for opencode we omit the `model` field so it falls back
  // to the user's configured default. An explicit per-agent override (config.model
  // or a frontmatter model) still wins.
  const resolvedModel =
    config.model || frontmatter.model || variant.modelDefault;
  const fm: Record<string, unknown> = {
    name: (frontmatter.name as string) || agentKey,
    description: config.description || frontmatter.description,
    tools: hasTools ? finalTools : undefined,
    model:
      (isOpencodeFamily(vendor) || ["qwen", "copilot"].includes(vendor)) &&
      resolvedModel === "inherit"
        ? undefined
        : resolvedModel,
  };

  if (variant.maxTurnsDefault || config.maxTurns || frontmatter.maxTurns) {
    fm[getMaxTurnsField(vendor)] =
      config.maxTurns || frontmatter.maxTurns || variant.maxTurnsDefault;
  }
  if (config.effort) {
    // The opencode family expresses reasoning depth as a model `variant`, not
    // `effort` (#583-2); other markdown vendors keep the abstract `effort` key.
    if (isOpencodeFamily(vendor)) fm.variant = config.effort;
    else fm.effort = config.effort;
  }
  if (config.kind) fm.kind = config.kind;
  if (config.temperature !== undefined) fm.temperature = config.temperature;
  if (config.timeoutMins !== undefined) {
    fm[getTimeoutField(vendor)] = config.timeoutMins;
  }
  if (config.mcpServers) {
    fm[vendor === "copilot" ? "mcp-servers" : "mcpServers"] = config.mcpServers;
  }
  if (frontmatter.skills && supportsSkillsFrontmatter(vendor)) {
    fm.skills = frontmatter.skills;
  }
  if (config.extra) {
    Object.assign(fm, config.extra);
  }
  if (vendor === "copilot") {
    fm["include-custom-instructions"] ??= true;
  }
  if (isOpencodeFamily(vendor)) {
    fm.mode = "subagent";
  }

  // T16: strip CHARTER_CHECK block for Simple tasks to save ~200 tokens per spawn.
  // Default (difficulty undefined or Medium/Complex) preserves the block.
  const effectiveBody = bindDefinitionPaths(
    difficulty === "Simple" ? stripCharterCheck(body) : body,
    definitionsRoot,
  );
  const protocolPath = variant.protocolPath?.replace(
    /^\.agents\//,
    `${definitionsRoot}/`,
  );
  const finalBody = `<!-- Generated by oh-my-agent CLI. Source: ${definitionsRoot}/agents/${entry} -->\n${formatAgentBody(effectiveBody, protocolPath)}`;
  const vendorFrontmatter = sanitizeFrontmatterForVendor(fm, vendor);

  return {
    fileName: entry,
    content: serializeFrontmatter(vendorFrontmatter, finalBody),
  };
}

function buildCodexAgentFile(
  definition: AbstractAgentDefinition,
  variant: AgentVariant,
  config: AgentConfig,
  definitionsRoot = ".agents",
): { fileName: string; content: string } {
  const { agentKey, entry, frontmatter, body } = definition;
  const name = (frontmatter.name as string) || agentKey;
  const description = String(
    config.description || frontmatter.description || name,
  );
  // "inherit" omits `model`: Codex then runs the agent on the parent
  // session's model, so no release has to bump a pinned slug.
  const model = String(
    config.model || frontmatter.model || variant.modelDefault,
  );
  const reasoningEffort = config.effort || variant.effortDefault || "medium";
  const sandboxMode =
    typeof config.extra?.sandbox_mode === "string"
      ? config.extra.sandbox_mode
      : "workspace-write";
  const finalBody = formatAgentBody(
    bindDefinitionPaths(body, definitionsRoot),
    variant.protocolPath?.replace(/^\.agents\//, `${definitionsRoot}/`),
  );
  const skills = Array.isArray(frontmatter.skills)
    ? frontmatter.skills.map((skill) => String(skill)).filter(Boolean)
    : [];

  const lines = [
    `# Generated by oh-my-agent CLI. Source: ${definitionsRoot}/agents/${entry}`,
    `name = ${serializeTomlString(name)}`,
    `description = ${serializeTomlString(description)}`,
    ...(model === "inherit" ? [] : [`model = ${serializeTomlString(model)}`]),
    `model_reasoning_effort = ${serializeTomlString(reasoningEffort)}`,
    `sandbox_mode = ${serializeTomlString(sandboxMode)}`,
    `developer_instructions = ${serializeTomlMultiline(finalBody)}`,
  ];

  for (const skill of skills) {
    lines.push("");
    lines.push("[[skills.config]]");
    lines.push(
      `path = ${serializeTomlString(`${definitionsRoot}/skills/${skill}/SKILL.md`)}`,
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

// =============================================================================
// Per-vendor frontmatter allow-lists (R14)
// Fields not listed here will be dropped with a console.warn before write.
// =============================================================================

const OPENCODE_AGENT_FIELDS = [
  "name",
  "description",
  "mode",
  "model",
  "variant",
  "temperature",
  "tools",
  "permission",
] as const;

const ALLOWED_FIELDS: Record<string, readonly string[]> = {
  claude: [
    "name",
    "description",
    "tools",
    "model",
    "maxTurns",
    "skills",
    "memory",
    "permissionMode",
  ],
  codex: [
    "name",
    "description",
    "model",
    "model_reasoning_effort",
    "sandbox_mode",
  ],
  antigravity: ["name", "description", "model"],
  qwen: ["name", "description", "model", "tools", "approvalMode", "maxTurns"],
  copilot: [
    "name",
    "description",
    "tools",
    "model",
    "user-invocable",
    "include-custom-instructions",
    "disable-model-invocation",
    "mcp-servers",
    "metadata",
    "target",
  ],
  opencode: OPENCODE_AGENT_FIELDS,
  // Kilo keeps opencode's agent frontmatter schema.
  kilo: OPENCODE_AGENT_FIELDS,
};

/**
 * Return a copy of `frontmatter` with only the fields allowed for `vendor`.
 * Dropped fields are reported via console.warn.
 *
 * R14: When the `claude` vendor drops the `effort` field, the warning message
 * explicitly references R14 so engineers can trace the decision.
 *
 * Pure function — the input object is never mutated.
 */
export function sanitizeFrontmatterForVendor(
  frontmatter: Record<string, unknown>,
  vendor: string,
): Record<string, unknown> {
  const allowedKeys = ALLOWED_FIELDS[vendor];

  // Unknown vendor: pass through unchanged (no allow-list defined).
  if (!allowedKeys) return { ...frontmatter };

  const allowed = new Set(allowedKeys);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (allowed.has(key)) {
      result[key] = value;
    } else {
      if (vendor === "claude" && key === "effort") {
        console.warn(
          `[agent-composer] Dropped 'effort' from claude variant (R14: Claude subagent frontmatter does not support effort — use CLI session --effort instead)`,
        );
      } else {
        console.warn(
          `[agent-composer] Dropped '${key}' from ${vendor} variant (not supported by this runtime)`,
        );
      }
    }
  }

  return result;
}

/**
 * Resolve the OpenCode model slug + variant (effort) for an agent from
 * oma-config (#583-2).
 *
 * OpenCode subagents inherit the invoking primary agent's model when their own
 * frontmatter pins none. That silently discards OMA's per-agent routing during
 * native `task` dispatch. So when oma-config routes this agent to OpenCode, we
 * pin the resolved catalog slug (`cli_model`) and map `effort` → `variant`.
 *
 * This is NOT a hardcoded default: it only pins a model the user explicitly
 * routed to OpenCode. Agents routed elsewhere (or an unreadable/missing config)
 * return `{}`, leaving the generator's "inherit" sentinel intact (#580).
 */
function resolveOpencodeAgentModel(
  sourceDir: string,
  agentKey: string,
  host: string = "opencode",
): { model?: string; effort?: string } {
  try {
    const config = loadUserConfig(sourceDir);
    const plan = resolveAgentPlanFromConfig(agentKey, config);
    if (plan.cli !== host) return {};
    return { model: plan.cliModel, effort: plan.effort };
  } catch {
    // Missing/invalid config or unknown slug → fall back to inherit.
    return {};
  }
}

/** Inherit-by-default vendors whose native files still pin a fixed preset. */
const PRESET_PINNED_INHERIT_VENDORS = new Set(["codex", "qwen"]);

export interface RenderedAgentFile {
  agentKey: string;
  fileName: string;
  content: string;
}

/**
 * Render every `.agents/agents/*.md` definition as `vendor`'s native agent
 * file without touching an install root. Unlike `installVendorAgents`, this
 * ignores the installed project's model preset and overrides: it is the pure
 * SSOT projection that `oma emit` ships inside distributable packages, so the
 * output is identical on every machine. The variant JSON (when present) still
 * supplies per-agent overrides; vendors with a built-in native variant (Qwen,
 * Copilot) render without one.
 */
export function renderVendorAgentFiles(
  sourceDir: string,
  vendor: string,
  definitionsRoot = ".agents",
): RenderedAgentFile[] {
  const variantPath = join(
    sourceDir,
    ".agents",
    "agents",
    "variants",
    `${vendor}.json`,
  );
  const nativeVariant =
    vendor === "qwen"
      ? QWEN_NATIVE_AGENT_VARIANT
      : vendor === "copilot"
        ? COPILOT_NATIVE_AGENT_VARIANT
        : undefined;
  let variant: AgentVariant | undefined = nativeVariant;
  if (existsSync(variantPath)) {
    try {
      variant = JSON.parse(readFileSync(variantPath, "utf-8")) as AgentVariant;
    } catch {
      variant = nativeVariant;
    }
  }
  if (!variant) return [];
  const resolved: AgentVariant = { ...variant, agents: variant.agents ?? {} };
  return readAbstractAgentDefinitions(sourceDir).map((definition) => {
    const config: AgentConfig = {
      ...(resolved.agents[definition.agentKey] || {}),
    };
    const output =
      vendor === "codex"
        ? buildCodexAgentFile(definition, resolved, config, definitionsRoot)
        : buildMarkdownAgentFile(
            definition,
            resolved,
            config,
            vendor,
            undefined,
            definitionsRoot,
          );
    return { agentKey: definition.agentKey, ...output };
  });
}

/**
 * Generate vendor-specific agent files from core definitions and variant config.
 *
 * @returns how many agent files were written. Zero means nothing was generated
 * (no `.agents/agents/` under `sourceDir`, no variant for `vendor`, or no
 * abstract definitions) — callers that print a success line should gate on this
 * so a wrong source dir can't be reported as a successful link.
 */
export function installVendorAgents(
  sourceDir: string,
  targetDir: string,
  vendor: string,
): number {
  const agentsSrcDir = join(sourceDir, ".agents", "agents");
  const variantPath = join(agentsSrcDir, "variants", `${vendor}.json`);
  const nativeVariant =
    vendor === "qwen"
      ? QWEN_NATIVE_AGENT_VARIANT
      : vendor === "copilot"
        ? {
            ...COPILOT_NATIVE_AGENT_VARIANT,
            destDir:
              getVendorCapabilities(vendor)?.agents.dir ??
              COPILOT_NATIVE_AGENT_VARIANT.destDir,
          }
        : undefined;

  if (!existsSync(agentsSrcDir) || (!existsSync(variantPath) && !nativeVariant))
    return 0;

  // Variant JSON comes from the (untrusted) working project. safeLoadVariant
  // guards the parse so a malformed file doesn't abort install mid-loop, and
  // destDir is validated so a traversing value (e.g. "../../../tmp/evil")
  // can't escape the install root.
  const variant = existsSync(variantPath)
    ? safeLoadVariant<AgentVariant>({
        variantPath,
        kind: "agent",
        validate: (v) => {
          if (!v?.destDir) return; // missing destDir is a silent skip below
          assertContainedRelPath(targetDir, v.destDir, "agent dest dir");
          // protocolPath is embedded verbatim into every generated agent file the
          // AI runtime loads. Require a contained relative path with no markdown/
          // newline breakout characters so a hostile variant can't smuggle
          // instructions.
          if (v.protocolPath) {
            if (/[`\r\n]/.test(v.protocolPath)) {
              throw new Error(
                `protocol path "${v.protocolPath}" contains forbidden characters.`,
              );
            }
            assertContainedRelPath(targetDir, v.protocolPath, "protocol path");
          }
        },
      })
    : nativeVariant;
  if (!variant?.destDir) return 0;

  const vendorDestDir =
    safeGetInstallMode() === "global" &&
    vendor === "copilot" &&
    variant.destDir === ".github/agents"
      ? ".copilot/agents"
      : variant.destDir;
  const destDir =
    safeGetInstallMode() === "global" && isOpencodeFamily(vendor)
      ? join(
          targetDir,
          ".config",
          OPENCODE_FAMILY_HOSTS[vendor].configDirName,
          "agents",
        )
      : join(targetDir, vendorDestDir);
  mkdirSync(destDir, { recursive: true });

  // Installed project preferences take precedence over the distribution's
  // template. Keep variant defaults unless auto has an explicit agent override.
  let userConfig: Partial<OmaConfig> = {};
  try {
    userConfig = loadUserConfig(
      safeGetInstallMode() === "global" ? sourceDir : targetDir,
    );
    if (!userConfig.model_preset) userConfig = loadUserConfig(sourceDir);
  } catch {
    // Invalid config is reported by dispatch/doctor; retain native defaults here.
  }

  let written = 0;
  for (const definition of readAbstractAgentDefinitions(sourceDir)) {
    const config: AgentConfig = {
      ...(variant.agents[definition.agentKey] || {}),
    };

    const agentId = normalizeAgentId(definition.agentKey);
    if (agentId) {
      const hasAutoAgentOverride =
        userConfig.model_preset === "auto" && !!userConfig.agents?.[agentId];
      // A pinned preset routes each role to a model; native files must pin
      // the routed one, or subagents ignore the preset and `agents:`
      // overrides. Codex and Qwen inherit by default but still honor a pinned
      // preset; other inherit-only variants keep inheriting.
      const hasPinnedPreset =
        !!userConfig.model_preset &&
        userConfig.model_preset !== "free" &&
        userConfig.model_preset !== "auto" &&
        (PRESET_PINNED_INHERIT_VENDORS.has(vendor) ||
          variant.modelDefault !== "inherit");
      if (hasAutoAgentOverride || hasPinnedPreset) {
        let plan: ReturnType<typeof resolveAgentPlanFromConfig> | undefined;
        try {
          plan = resolveAgentPlanFromConfig(agentId, userConfig, undefined, {});
        } catch {
          // Invalid config is reported by dispatch/doctor; keep the variant.
        }
        if (plan?.cli === vendor && plan.cliModel) {
          config.model = plan.cliModel;
          if (plan.effort) config.effort = plan.effort;
        }
      }
    }

    // #583-2: pin the OpenCode-routed model/variant so native task-dispatched
    // subagents stop inheriting the primary agent's model. An explicit variant
    // override (config.model / config.effort) still wins.
    if (isOpencodeFamily(vendor) && userConfig.model_preset !== "auto") {
      const resolved = resolveOpencodeAgentModel(
        sourceDir,
        definition.agentKey,
        vendor,
      );
      if (resolved.model && !config.model) config.model = resolved.model;
      if (resolved.effort && !config.effort) config.effort = resolved.effort;
    }

    const definitionsRoot =
      safeGetInstallMode() === "global"
        ? join(sourceDir, ".agents")
        : ".agents";
    const output =
      vendor === "codex"
        ? buildCodexAgentFile(definition, variant, config, definitionsRoot)
        : buildMarkdownAgentFile(
            definition,
            variant,
            config,
            vendor,
            undefined,
            definitionsRoot,
          );

    atomicWriteFileSync(join(destDir, output.fileName), output.content);
    written += 1;
  }
  return written;
}
