import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CliVendor } from "../types/index.js";

export type BrowserMcpOptions = {
  global?: boolean;
  dryRun?: boolean;
  home?: string;
};
export type BrowserMcpTarget = {
  path: string;
  keys: string[];
  format: "json" | "jsonc" | "toml" | "yaml";
  entry?: "opencode" | "copilot" | "stdio";
  removeOnly?: boolean;
};

export function piAgentDir(home: string): string {
  return process.env.PI_CODING_AGENT_DIR?.trim() || join(home, ".pi", "agent");
}

/** Native load paths; references and scope semantics are recorded in docs/browser-mcp.md. */
export function browserMcpTargets(
  root: string,
  vendors: readonly string[],
  options: BrowserMcpOptions,
): BrowserMcpTarget[] {
  const home = options.home ?? homedir();
  const project = (path: string) => join(root, path);
  const scoped = (local: string, global: string) =>
    options.global ? join(home, global) : project(local);
  const json = (path: string, keys = ["mcpServers"]): BrowserMcpTarget[] => [
    { path, keys, format: "json" },
  ];
  const toml = (path: string): BrowserMcpTarget[] => [
    { path, keys: ["mcp_servers"], format: "toml" },
  ];
  const opencode = (): BrowserMcpTarget[] => {
    const base = options.global
      ? join(
          process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config"),
          "opencode",
        )
      : root;
    const candidates = [
      join(base, "opencode.json"),
      join(base, "opencode.jsonc"),
    ];
    if (!options.global)
      candidates.push(
        project(".opencode/opencode.json"),
        project(".opencode/opencode.jsonc"),
      );
    const existing = candidates.filter(existsSync);
    return (existing.length ? existing : [join(base, "opencode.jsonc")]).map(
      (path) => ({ path, keys: ["mcp"], format: "jsonc", entry: "opencode" }),
    );
  };
  // Exhaustive by design: a new OMA vendor must declare its MCP path here.
  const targets: Record<CliVendor, () => BrowserMcpTarget[]> = {
    claude: () => json(scoped(".mcp.json", ".claude.json")),
    cursor: () =>
      json(scoped(".cursor/mcp.json", ".cursor/mcp.json")).map((target) => ({
        ...target,
        entry: "stdio",
      })),
    codex: () =>
      toml(
        options.global
          ? join(
              process.env.CODEX_HOME?.trim() || join(home, ".codex"),
              "config.toml",
            )
          : project(".codex/config.toml"),
      ),
    qwen: () => json(scoped(".qwen/settings.json", ".qwen/settings.json")),
    grok: () => toml(scoped(".grok/config.toml", ".grok/config.toml")),
    kiro: () => {
      const native = json(
        scoped(".kiro/settings/mcp.json", ".kiro/settings/mcp.json"),
      );
      const legacy = scoped(
        ".kiro/settings/cli.json",
        ".kiro/settings/cli.json",
      );
      if (existsSync(legacy))
        native.push(
          ...json(legacy).map((target) => ({ ...target, removeOnly: true })),
        );
      return native;
    },
    kimi: () =>
      json(
        options.global
          ? join(
              process.env.KIMI_CODE_HOME?.trim() || join(home, ".kimi-code"),
              "mcp.json",
            )
          : project(".kimi-code/mcp.json"),
      ),
    antigravity: () =>
      json(
        scoped(
          ".agents/mcp_config.json",
          ".gemini/antigravity-cli/mcp_config.json",
        ),
      ),
    commandcode: () => json(scoped(".mcp.json", ".commandcode/mcp.json")),
    copilot: () =>
      json(scoped(".github/mcp.json", ".copilot/mcp-config.json")).map(
        (target) => ({ ...target, entry: "copilot" }),
      ),
    opencode,
    pi: () =>
      json(
        options.global
          ? join(piAgentDir(home), "mcp.json")
          : project(".pi/mcp.json"),
      ),
    hermes: () => [
      {
        path: join(
          process.env.HERMES_HOME?.trim() || join(home, ".hermes"),
          "config.yaml",
        ),
        keys: ["mcp_servers"],
        format: "yaml",
      },
    ],
    zcode: () =>
      json(scoped(".zcode/config.json", ".zcode/cli/config.json"), [
        "mcp",
        "servers",
      ]),
  };
  const result = json(project(".agents/mcp.json"));
  for (const vendor of new Set(vendors)) {
    if (!Object.hasOwn(targets, vendor))
      throw new Error(`Unsupported browser MCP vendor: ${vendor}`);
    result.push(...targets[vendor as CliVendor]());
  }
  return [...new Map(result.map((target) => [target.path, target])).values()];
}
