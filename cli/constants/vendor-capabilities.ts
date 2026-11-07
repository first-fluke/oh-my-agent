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
    plugins: { manifest: null },
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
    plugins: { manifest: null },
  },
  copilot: {
    skills: skills("copilot"),
    agents: { dir: ".github/agents" },
    hooks: settings("copilot"),
    plugins: { manifest: null },
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
    plugins: { manifest: null },
  },
  hermes: {
    skills: skills("hermes"),
    agents: { dir: null },
    hooks: { kind: "none", variant: null },
    plugins: { manifest: null },
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
    plugins: { manifest: null },
  },
  kimi: {
    // Project SSOT scanning does not establish global discovery; retain the
    // existing HOME skill projection and its install-mode handling.
    skills: skills("kimi"),
    agents: { dir: null },
    hooks: settings("kimi"),
    plugins: { manifest: null },
  },
  kiro: {
    skills: skills("kiro"),
    agents: { dir: ".kiro/agents" },
    hooks: settings("kiro"),
    plugins: { manifest: null },
  },
  opencode: {
    skills: {
      native: false,
      projectDir: CLI_SKILLS_DIR.opencode.projectPath,
      globalDir: CLI_SKILLS_DIR.opencode.homePath,
    },
    agents: { dir: ".opencode/agents" },
    hooks: { kind: "extension", variant: null },
    plugins: { manifest: null },
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
    plugins: { manifest: null },
  },
  zcode: {
    skills: { native: false, projectDir: null, globalDir: null },
    agents: { dir: null },
    hooks: { kind: "none", variant: null },
    plugins: { manifest: null },
  },
};

export function getVendorCapabilities(
  vendor: string,
): VendorCapabilities | undefined {
  return Object.hasOwn(VENDOR_CAPABILITIES, vendor)
    ? VENDOR_CAPABILITIES[vendor as CliVendor]
    : undefined;
}
