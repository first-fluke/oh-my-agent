/** Targets the `oma emit` command can produce. */
export const EMIT_TARGETS = [
  "agent-skills",
  "claude-plugin",
  "agents-md",
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

export interface AgentsMdEmitReport {
  target: "agents-md";
  outPath: string;
  existingPath: string;
  existingExists: boolean;
  existingDiffers: boolean;
}

export type EmitReport =
  | AgentSkillsEmitReport
  | ClaudePluginEmitReport
  | AgentsMdEmitReport;
