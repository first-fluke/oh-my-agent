/** Targets the `oma emit` command can produce. */
export const EMIT_TARGETS = [
  "agent-skills",
  "agent-plugin",
  "claude-plugin",
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

export interface ClaudePluginEmitReport {
  target: "claude-plugin";
  outPath: string;
}

export interface AgentPluginMcpSkip {
  server: string;
  reason: string;
}

export interface AgentPluginEmitReport {
  target: "agent-plugin";
  outDir: string;
  manifestPath: string;
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

export type EmitReport =
  | AgentSkillsEmitReport
  | AgentPluginEmitReport
  | ClaudePluginEmitReport
  | AgentsMdEmitReport
  | CliDocsEmitReport;
