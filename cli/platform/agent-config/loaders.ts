import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { normalizeAgentId } from "./agent-ids.js";
import { findConfigFileUp } from "./config-io.js";

export function resolvePromptContent(prompt: string): string {
  const resolved = path.resolve(prompt);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return fs.readFileSync(resolved, "utf-8");
  }
  return prompt;
}

export function loadExecutionProtocol(vendor: string, cwd: string): string {
  const protocolPath = findConfigFileUp(
    cwd,
    path.join(
      ".agents",
      "skills",
      "_shared",
      "runtime",
      "execution-protocols",
      `${vendor}.md`,
    ),
  );
  if (!protocolPath) return "";
  try {
    return fs.readFileSync(protocolPath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Load an agent's system-prompt body (its persona) from the SSOT source
 * `.agents/agents/<file>.md`, with the YAML frontmatter stripped.
 *
 * Native dispatch vendors get the persona from a vendor-side agent file
 * referenced by `@<agentId>` mention. External dispatch to a runtime with no
 * agent-file system (pi) has no such reference, so the persona must be inlined
 * into the prompt. Returns "" when the source cannot be located, so callers
 * degrade to a persona-less run rather than failing.
 */
export function loadAgentPersona(agentId: string, cwd: string): string {
  // Locate the .agents/ root via the always-present oma-config.yaml, then the
  // agents source dir beside it.
  const configPath = findConfigFileUp(
    cwd,
    path.join(".agents", "oma-config.yaml"),
  );
  if (!configPath) return "";
  const agentsDir = path.join(path.dirname(configPath), "agents");
  if (!fs.existsSync(agentsDir)) return "";

  const wanted = normalizeAgentId(agentId) ?? agentId;
  let file: string | undefined;
  try {
    file = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .find((f) => {
        const key = f.replace(/\.md$/, "");
        return key === agentId || normalizeAgentId(key) === wanted;
      });
  } catch {
    return "";
  }
  if (!file) return "";

  try {
    const { body } = parseFrontmatter(
      fs.readFileSync(path.join(agentsDir, file), "utf-8"),
    );
    return body.trim();
  } catch {
    return "";
  }
}
