import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { normalizeAgentId } from "../../platform/agent-config/agent-ids.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { findFileUpwards } from "../../utils/fs-utils.js";
import type { DispatchPlan, Invocation } from "./types.js";

interface AgentDefinition {
  prompt: string;
  description?: string;
  model?: string;
  tools?: string[];
  disallowedTools?: string[];
  effort?: string;
}

function stringList(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tool) => tool.trim())
      .filter(Boolean);
  }
  return Array.isArray(value) && value.every((tool) => typeof tool === "string")
    ? value
    : undefined;
}

function findDefinitionFile(
  agentId: string,
  directory: string,
  extension: string,
  roots: string[],
): string | undefined {
  const wanted = normalizeAgentId(agentId) ?? agentId;
  for (const root of roots) {
    const dir = findFileUpwards(root, directory);
    if (!dir) continue;
    const files = readdirSync(dir).filter((file) => file.endsWith(extension));
    const file =
      files.find((name) => name === `${agentId}${extension}`) ??
      files.find((name) => {
        const id = name.slice(0, -extension.length);
        return (normalizeAgentId(id) ?? id) === wanted;
      });
    if (file) return join(dir, file);
  }
  return undefined;
}

function loadDefinition(
  agentId: string,
  vendor: string,
  roots: string[],
): AgentDefinition | undefined {
  const nativeFile = findDefinitionFile(
    agentId,
    `.${vendor}/agents`,
    vendor === "codex" ? ".toml" : ".md",
    roots,
  );
  if (nativeFile && vendor === "codex") {
    const definition = parseToml(readFileSync(nativeFile, "utf8"));
    if (typeof definition.developer_instructions !== "string") return undefined;
    return {
      prompt: definition.developer_instructions,
      model:
        typeof definition.model === "string" ? definition.model : undefined,
      effort:
        typeof definition.model_reasoning_effort === "string"
          ? definition.model_reasoning_effort
          : undefined,
    };
  }
  const markdownFile =
    nativeFile ?? findDefinitionFile(agentId, ".agents/agents", ".md", roots);
  if (!markdownFile) return undefined;
  const { frontmatter, body } = parseFrontmatter(
    readFileSync(markdownFile, "utf8"),
  );
  if (!body.trim()) return undefined;
  return {
    prompt: body.trim(),
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : undefined,
    // Source definitions use OMA model selection; only a vendor projection's
    // model is a CLI model identifier.
    model:
      nativeFile && typeof frontmatter.model === "string"
        ? frontmatter.model
        : undefined,
    tools: stringList(frontmatter.tools),
    disallowedTools: stringList(frontmatter.disallowedTools),
  };
}

function hasCodexConfig(invocation: Invocation, key: string): boolean {
  return invocation.args.some((arg, index, args) => {
    const value =
      arg === "-c" || arg === "--config"
        ? args[index + 1]
        : arg.startsWith("--config=")
          ? arg.slice("--config=".length)
          : arg.startsWith("-c")
            ? arg.slice(2)
            : undefined;
    return value !== undefined && new RegExp(`^${key}\\s*=`).test(value);
  });
}

/** Apply role definitions to the CLI session itself, including cross-vendor launches. */
export function applyAgentDefinition(
  dispatch: DispatchPlan,
  agentId: string,
  workspace: string,
  sourceCwd: string = process.cwd(),
): void {
  const vendor = dispatch.targetVendor;
  if (vendor !== "claude" && vendor !== "codex") return;
  const definition = loadDefinition(agentId, vendor, [workspace, sourceCwd]);
  if (!definition) return;
  const invocation = dispatch.invocation;
  const hasModel = invocation.args.some(
    (arg) => arg === "-m" || arg === "--model" || arg.startsWith("--model="),
  );
  if (vendor === "claude") {
    const role = {
      description: definition.description ?? agentId,
      prompt: definition.prompt,
      ...(definition.tools !== undefined ? { tools: definition.tools } : {}),
      ...(definition.disallowedTools !== undefined
        ? { disallowedTools: definition.disallowedTools }
        : {}),
      ...(!hasModel && definition.model ? { model: definition.model } : {}),
    };
    const agentsIndex = invocation.args.indexOf("--agents");
    if (agentsIndex === -1) {
      invocation.args.unshift("--agents", JSON.stringify({ [agentId]: role }));
    } else {
      const raw = invocation.args[agentsIndex + 1] ?? "";
      const definitions = JSON.parse(
        raw.trim().startsWith("{")
          ? raw
          : readFileSync(resolve(workspace, raw), "utf8"),
      );
      // Explicit invocation definitions take precedence over generated roles.
      invocation.args[agentsIndex + 1] = JSON.stringify({
        [agentId]: role,
        ...definitions,
      });
    }
    if (!invocation.args.includes("--agent")) {
      invocation.args.unshift("--agent", agentId);
    }
    return;
  }
  // `codex exec` does not select a custom agent with an @mention. Deliver its
  // instructions via the supported per-invocation config override instead.
  const config: Record<string, string> = {};
  if (!hasCodexConfig(invocation, "developer_instructions")) {
    config.developer_instructions = definition.prompt;
  }
  if (!hasModel && !hasCodexConfig(invocation, "model") && definition.model) {
    config.model = definition.model;
  }
  if (
    !hasCodexConfig(invocation, "model_reasoning_effort") &&
    definition.effort
  ) {
    config.model_reasoning_effort = definition.effort;
  }
  for (const [key, value] of Object.entries(config)) {
    invocation.args.unshift("-c", stringifyToml({ [key]: value }).trim());
  }
}
