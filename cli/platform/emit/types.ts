/** Targets the `oma emit` command can produce. */
export const EMIT_TARGETS = [
  "agent-skills",
  "agent-plugin",
  "claude-plugin",
  "pi-package",
  "antigravity-plugin",
  "grok-plugin",
  "zcode-plugin",
  "kimi-plugin",
  "opencode-package",
  "commandcode-mod",
  "agents-md",
  "cli-docs",
] as const;

export type EmitTarget = (typeof EMIT_TARGETS)[number];

export interface SkillValidationIssue {
  field: string;
  message: string;
}

export interface SkillValidationResult {
  /** Skill directory name under `.agents/skills/`. */
  skill: string;
  valid: boolean;
  errors: SkillValidationIssue[];
  warnings: SkillValidationIssue[];
}

export interface SkillEmitResult {
  skill: string;
  outDir: string;
  validation: SkillValidationResult;
  /** true when the body exceeded the 500-line recommendation and was split. */
  overflowed: boolean;
}

export interface AgentSkillsEmitReport {
  target: "agent-skills";
  outDir: string;
  skills: SkillEmitResult[];
  passCount: number;
  failCount: number;
}

export interface PiPackageEmitReport {
  target: "pi-package";
  outDir: string;
  manifestPath: string;
  skills: SkillEmitResult[];
  passCount: number;
  failCount: number;
}

export interface OpencodePackageEmitReport {
  target: "opencode-package";
  outDir: string;
  manifestPath: string;
  /** Package-relative files written (bridge, handler entries, filter script, README). */
  files: string[];
}

export interface CommandcodeModEmitReport {
  target: "commandcode-mod";
  outDir: string;
  manifestPath: string;
  /** Emitted mod entry (`mods/oma.ts`). */
  modPath: string;
  skills: SkillEmitResult[];
  passCount: number;
  failCount: number;
}

export interface ClaudePluginEmitReport {
  target: "claude-plugin";
  outPath: string;
  codexMarketplacePath?: string;
}

export interface AgentPluginMcpSkip {
  server: string;
  reason: string;
}

/** Contents of the `com.github.copilot/` client-extension directory. */
export interface CopilotExtensionEmitReport {
  dir: string;
  /** `NAME.agent.md` files generated from `.agents/agents/`. */
  agents: string[];
  /** `NAME.md` slash commands generated from available workflows. */
  commands: string[];
  /** `NAME.instructions.md` files generated from file-scoped/always-on rules. */
  rules: string[];
  /** true when `hooks/hooks.json` and its scripts were emitted. */
  hooks: boolean;
}

export interface AgentPluginEmitReport {
  target: "agent-plugin";
  outDir: string;
  manifestPath: string;
  /** Clean Codex-installable package emitted under `codex-plugin/`. */
  codexPluginPath?: string;
  /** GitHub Copilot CLI components shipped beside the portable core. */
  copilot: CopilotExtensionEmitReport;
  skills: SkillEmitResult[];
  passCount: number;
  failCount: number;
  /** Portable mcp.json conversion outcome; `emitted` is false when the SSOT has no mcp.json. */
  mcp: {
    emitted: boolean;
    servers: string[];
    skipped: AgentPluginMcpSkip[];
  };
  /** Repo-relative SSOT entries copied into the client-extension namespace dir. */
  extensionEntries: string[];
}

export interface AgentsMdEmitReport {
  target: "agents-md";
  outPath: string;
  existingPath: string;
  existingExists: boolean;
  existingDiffers: boolean;
}

export interface CliDocEmitResult {
  vendor: string;
  outPath: string;
  /** true when the emitted content differs from the committed file. */
  changed: boolean;
}

export interface CliDocsEmitReport {
  target: "cli-docs";
  outDir: string;
  files: CliDocEmitResult[];
}

/** Outcome of converting the SSOT mcp.json into a host's `mcpServers` shape. */
export interface NativeMcpReport {
  emitted: boolean;
  servers: string[];
  skipped: AgentPluginMcpSkip[];
}

export interface AntigravityEmitReport {
  target: "antigravity-plugin";
  outDir: string;
  manifestPath: string;
  skills: SkillEmitResult[];
  passCount: number;
  failCount: number;
  agents: string[];
  rules: string[];
  mcp: NativeMcpReport;
}

export interface GrokPluginEmitReport {
  target: "grok-plugin";
  outDir: string;
  manifestPath: string;
  marketplacePath: string;
  agents: string[];
}

export interface ZcodePluginEmitReport {
  target: "zcode-plugin";
  outDir: string;
  manifestPath: string;
  marketplacePath: string;
  agents: string[];
  mcp: NativeMcpReport;
}

export interface KimiPluginEmitReport {
  target: "kimi-plugin";
  outDir: string;
  manifestPath: string;
  agents: string[];
  mcp: NativeMcpReport;
}

export type EmitReport =
  | AgentSkillsEmitReport
  | PiPackageEmitReport
  | OpencodePackageEmitReport
  | CommandcodeModEmitReport
  | AgentPluginEmitReport
  | ClaudePluginEmitReport
  | AgentsMdEmitReport
  | CliDocsEmitReport
  | AntigravityEmitReport
  | GrokPluginEmitReport
  | ZcodePluginEmitReport
  | KimiPluginEmitReport;
