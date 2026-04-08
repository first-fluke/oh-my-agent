export interface ManifestFile {
  path: string;
  sha256: string;
  size: number;
}

export interface Manifest {
  name: string;
  version: string;
  releaseDate: string;
  repository: string;
  files: ManifestFile[];
  checksums?: {
    algorithm: string;
  };
  metadata?: {
    skillCount: number;
    workflowCount: number;
    totalFiles: number;
  };
}

export interface CLICheck {
  name: string;
  installed: boolean;
  version?: string;
  installCmd: string;
}

export interface SkillCheck {
  name: string;
  installed: boolean;
  hasSkillMd: boolean;
}

export interface Metrics {
  sessions: number;
  skillsUsed: Record<string, number>;
  tasksCompleted: number;
  totalSessionTime: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  lastUpdated: string;
  startDate: string;
  lastSessionId?: string;
  lastSessionStatus?: string;
  lastSessionStarted?: string;
  lastSessionDuration?: number;
}

export interface Retrospective {
  id: string;
  date: string;
  summary: string;
  keyLearnings: string[];
  filesChanged: string[];
  nextSteps: string[];
}

export interface CleanupResult {
  cleaned: number;
  skipped: number;
  details: string[];
}

export interface SkillInfo {
  name: string;
  desc: string;
}

export interface SkillsRegistry {
  domain: SkillInfo[];
  design: SkillInfo[];
  coordination: SkillInfo[];
  utility: SkillInfo[];
  infrastructure: SkillInfo[];
}

export type VendorType = "claude" | "codex" | "gemini" | "qwen";

/** All CLI tools including non-hook vendors. */
export type CliVendor = VendorType | "copilot";

export interface AgentAbstract {
  name: string;
  description: string;
  skills?: string[];
  body: string;
}

export interface VendorAgentConfig {
  claude?: { tools?: string; model?: string; maxTurns?: number };
  codex?: { sandbox_mode?: string };
  gemini?: { model?: string; tools?: string[] };
}

export interface VerifyCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  message?: string;
}

export interface VerifyResult {
  ok: boolean;
  agent: string;
  workspace: string;
  checks: VerifyCheck[];
  summary: {
    passed: number;
    failed: number;
    warned: number;
  };
}
