import type { SelfHealingGateResult } from "../../state/self-healing.js";
import type { CLICheck, SkillCheck } from "../../types/index.js";
import type {
  MemoryDaemonResult,
  MemoryProviderStatus,
  MemoryServicePresence,
} from "../../types/memory.js";
import type { SkillAuditReport } from "../skills/audit.js";
import type { DualInstallReport } from "./dual-install.js";

/** Eval fixture coverage summary — computed cheaply from filesystem scan. */
export interface SkillEvalCoverage {
  /** Number of skills that have >= MIN_TASKS task fixture YAML files under .agents/eval/<skill>/. */
  skillsWithEval: number;
  /** Total number of installed skills. */
  totalSkills: number;
}

export interface DoctorOptions {
  healCheckAgent?: string;
}

export interface McpCheck extends CLICheck {
  mcp: { configured: boolean; path?: string };
}

export interface VendorDocCheck {
  fileName: string;
  required: boolean;
  hasOmaBlock: boolean;
}

export interface AgentMemoryRetryQueueCheck {
  path: string;
  total: number;
  invalid: number;
}

export interface AgentMemoryDaemonCheck
  extends Pick<
    MemoryDaemonResult,
    "pidPath" | "ownedPid" | "ownedProcessRunning" | "endpoint"
  > {}

export interface AgentMemoryBinaryCheck {
  command: string;
  available: boolean;
  path?: string;
}

export interface AgentMemoryDoctorCheck {
  status: MemoryProviderStatus;
  binary: AgentMemoryBinaryCheck;
  retryQueue: AgentMemoryRetryQueueCheck;
  service: MemoryServicePresence;
  daemon: AgentMemoryDaemonCheck;
  issues: string[];
}

export interface StateIndexDoctorCheck {
  path: string;
  exists: boolean;
  parseOk: boolean;
  active: Record<string, string>;
  missingActive: Array<{ category: string; sid: string }>;
  error?: string;
}

export interface StateSessionDoctorCheck {
  sid: string;
  metaOk: boolean;
  invalidEventLines: number;
}

export interface HookOrderDoctorCheck {
  vendor: string;
  settingsPath: string;
  configured: boolean;
  parseOk: boolean;
  promptEvent?: string;
  order: string[];
  ok: boolean;
  agentMemory: "absent" | "after-skill-injector" | "before-skill-injector";
  error?: string;
}

export interface StateDoctorCheck {
  rootPath: string;
  rootExists: boolean;
  gitignored: boolean;
  gitignoreSkipped: boolean;
  index: StateIndexDoctorCheck;
  sessions: StateSessionDoctorCheck[];
  archiveSessions: number;
  issues: string[];
  hookOrder: HookOrderDoctorCheck[];
}

export interface DoctorReport {
  cwd: string;
  clis: CLICheck[];
  mcpChecks: McpCheck[];
  skillChecks: SkillCheck[];
  missingCLIs: CLICheck[];
  missingSkills: SkillCheck[];
  vendorDocs: VendorDocCheck[];
  hasSerena: boolean;
  serenaFileCount: number;
  agentMemory: AgentMemoryDoctorCheck;
  totalIssues: number;
  skillAudit: SkillAuditReport;
  skillEval: SkillEvalCoverage;
  dualInstall: DualInstallReport;
  state: StateDoctorCheck;
  selfHealing?: SelfHealingGateResult;
}
