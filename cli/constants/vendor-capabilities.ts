import type { CliTool, CliVendor } from "../types/vendors.js";
import { CLI_SKILLS_DIR } from "./vendors.js";

export interface VendorCapabilities {
  skills: {
    /** The host reads OMA's shared skills directly in project and global mode. */
    native: boolean;
    projectDir: string | null;
    globalDir: string | null;
  };
  agents: { dir: string | null };
  hooks: {
    kind: "settings" | "extension" | "none";
    variant: string | null;
  };
  plugins: { manifest: string | null };
}

function skills(cli: CliTool, native = false): VendorCapabilities["skills"] {
  const spec = CLI_SKILLS_DIR[cli];
  return {
    native,
    projectDir: spec.projectPath,
    globalDir: spec.homePath,
  };
}

function settings(vendor: string): VendorCapabilities["hooks"] {
  return {
    kind: "settings",
    variant: `.agents/hooks/variants/${vendor}.json`,
  };
}

/**
 * Host discovery and OMA projection capabilities. Native discovery means a
 * vendor-specific skill link is unnecessary in both install modes; it does
 * not imply native subagents or a subprocess runtime adapter.
 */
export const VENDOR_CAPABILITIES: Record<CliVendor, VendorCapabilities> = {
  antigravity: {
    skills: skills("antigravity"),
    agents: { dir: null },
    hooks: settings("antigravity"),
    // Install: `agy plugin install ./antigravity-plugin` from a clone
    // (self-contained tree; `agy plugin validate --strict` passes).
    plugins: { manifest: "antigravity-plugin/plugin.json" },
  },
  claude: {
    skills: skills("claude"),
    agents: { dir: ".claude/agents" },
    hooks: settings("claude"),
    plugins: { manifest: ".claude-plugin/plugin.json" },
  },
  codex: {
    skills: skills("codex"),
    agents: { dir: ".codex/agents" },
    hooks: settings("codex"),
    plugins: { manifest: "codex-plugin/plugin.json" },
  },
  commandcode: {
    skills: skills("commandcode"),
    agents: { dir: ".commandcode/agents" },
    hooks: settings("commandcode"),
    // Mod package (`oma emit --target commandcode-mod`): install with
    // `cmd mods add oh-my-agent-commandcode` or `cmd mods add ./commandcode-mod`.
    plugins: { manifest: "commandcode-mod/package.json" },
  },
  copilot: {
    skills: skills("copilot"),
    agents: { dir: ".github/agents" },
    hooks: settings("copilot"),
    // Agent Plugins 1.0 root package; Copilot reads its agents, commands,
    // rules and hooks from `com.github.copilot/`. Install with
    // `copilot plugin install first-fluke/oh-my-agent:codex-plugin`
    // (the clean tree) or `copilot plugin install <local path>`.
    plugins: { manifest: "plugin.json" },
  },
  cursor: {
    skills: skills("cursor"),
    agents: { dir: ".cursor/agents" },
    hooks: settings("cursor"),
    plugins: { manifest: ".cursor-plugin/plugin.json" },
  },
  grok: {
    skills: { native: false, projectDir: null, globalDir: null },
    agents: { dir: ".grok/agents" },
    hooks: settings("grok"),
    // Install: `grok plugin marketplace add first-fluke/oh-my-agent`, then
    // `grok plugin install oma` (catalog at .grok-plugin/marketplace.json).
    plugins: { manifest: ".grok-plugin/plugin.json" },
  },
  hermes: {
    skills: skills("hermes"),
    agents: { dir: null },
    hooks: { kind: "none", variant: null },
    // Portable Agent Plugins v1 package (root plugin.json + skills/ +
    // mcp.json). Install with `hermes plugins install first-fluke/oh-my-agent`
    // then `hermes plugins enable oma`; skills load as `oma:<skill>`.
    plugins: { manifest: "plugin.json" },
  },
  kilo: {
    // Kilo natively discovers `.agents/skills/*/SKILL.md`, so no skill
    // projection is needed (same as pi).
    skills: {
      native: true,
      projectDir: ".agents/skills",
      globalDir: ".agents/skills",
    },
    agents: { dir: ".kilo/agents" },
    hooks: { kind: "extension", variant: null },
    // Shared opencode-family npm plugin (`oma emit --target opencode-package`):
    // install with `"plugin": ["oh-my-agent-opencode"]` in `.kilo/kilo.json`.
    plugins: { manifest: "opencode-package/package.json" },
  },
  kimi: {
    // Project SSOT scanning does not establish global discovery; retain the
    // existing HOME skill projection and its install-mode handling.
    skills: skills("kimi"),
    agents: { dir: null },
    hooks: settings("kimi"),
    // Install: `/plugins install <clone path | github url>` inside Kimi Code
    // (manifest at .kimi-plugin/plugin.json; stored per user).
    plugins: { manifest: ".kimi-plugin/plugin.json" },
  },
  kiro: {
    skills: skills("kiro"),
    agents: { dir: ".kiro/agents" },
    hooks: settings("kiro"),
    // A Kiro Power is an Agent Plugins package; the manifest `keywords` are
    // its activation vocabulary. Install with
    // `kiro-cli powers install <local path>` (CLI 2.25+) or import the folder
    // / GitHub repository from the Powers panel.
    plugins: { manifest: "plugin.json" },
  },
  opencode: {
    skills: {
      native: false,
      projectDir: CLI_SKILLS_DIR.opencode.projectPath,
      globalDir: CLI_SKILLS_DIR.opencode.homePath,
    },
    agents: { dir: ".opencode/agents" },
    hooks: { kind: "extension", variant: null },
    // npm plugin (`oma emit --target opencode-package`): install with
    // `"plugin": ["oh-my-agent-opencode"]` in `.opencode/opencode.json`.
    plugins: { manifest: "opencode-package/package.json" },
  },
  pi: {
    skills: {
      native: true,
      projectDir: ".agents/skills",
      globalDir: ".agents/skills",
    },
    agents: { dir: null },
    hooks: { kind: "extension", variant: null },
    plugins: { manifest: "pi-package/package.json" },
  },
  qwen: {
    skills: skills("qwen", true),
    agents: { dir: ".qwen/agents" },
    hooks: settings("qwen"),
    // Qwen Code installs an Agent Plugins v1 package as an extension
    // (skills + mcp.json; no native qwen-extension.json is needed). Install
    // with `qwen extensions install <local path | git URL>` or
    // `qwen extensions link <local path>`.
    plugins: { manifest: "plugin.json" },
  },
  zcode: {
    skills: { native: false, projectDir: null, globalDir: null },
    agents: { dir: null },
    hooks: { kind: "none", variant: null },
    // Install: Settings -> Plugins -> Create -> Add marketplace (GitHub
    // `first-fluke/oh-my-agent` or a clone path), then Install `oma`.
    plugins: { manifest: ".zcode-plugin/plugin.json" },
  },
};

export function getVendorCapabilities(
  vendor: string,
): VendorCapabilities | undefined {
  return Object.hasOwn(VENDOR_CAPABILITIES, vendor)
    ? VENDOR_CAPABILITIES[vendor as CliVendor]
    : undefined;
}
