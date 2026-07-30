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

import type { SerenaLanguageAdvisory } from "../../io/serena.js";
import type { SerenaReaperConfig } from "../../io/serena-reaper.js";
import type { HookWrapperCheck } from "./hook-wrapper-check.js";
import type { SerenaDaemonDoctorCheck } from "./serena-daemons.js";
import type { SerenaRootSummary } from "./serena-reap.js";

export interface SerenaReapDoctorCheck {
  /** All discovered Serena root processes with per-root diagnostics. */
  roots: SerenaRootSummary[];
  /** Total LSP RSS across all roots (MB). */
  totalLspRssMb: number;
  /** Projected RSS that would be freed under current config (MB). */
  reapableRssMb: number;
  /** Number of roots that are reap targets under current config. */
  reapTargetCount: number;
  /** The reaper config in effect (from oma-config.yaml or defaults). */
  config: SerenaReaperConfig;
  /** Track-A advisories: heavy/unmapped languages in .serena/project.yml (T2-2). */
  languageAdvisories: SerenaLanguageAdvisory[];
  /** Summarised issues for the doctor issue counter. */
  issues: string[];
}

/** Recommended global git settings checked by doctor (rerere, defaultBranch). */
export interface GitRecommendedDoctorCheck {
  available: boolean;
  allOk: boolean;
  issueCount: number;
  items: Array<{
    key: string;
    desired: string;
    current: string | null;
    ok: boolean;
    fixHint: string;
  }>;
}

export interface DoctorReport {
  /**
   * Root the install-scoped checks ran against — `~/.agents/`'s parent under
   * `--global`, otherwise the project dir. Also the root `oma doctor`'s repair
   * prompt installs missing skills into.
   */
  installRoot: string;
  clis: CLICheck[];
  mcpChecks: McpCheck[];
  skillChecks: SkillCheck[];
  missingCLIs: CLICheck[];
  missingSkills: SkillCheck[];
  vendorDocs: VendorDocCheck[];
  hasSerena: boolean;
  serenaFileCount: number;
  /** Whether the `serena` binary (the MCP transport command) is on PATH. */
  serenaBinary: CLICheck;
  agentMemory: AgentMemoryDoctorCheck;
  serenaReap: SerenaReapDoctorCheck;
  /** Shared per-project serena daemons started by `oma bridge`. */
  serenaDaemons: SerenaDaemonDoctorCheck;
  /** Recommended global git config (rerere.enabled, init.defaultBranch). */
  gitRecommended: GitRecommendedDoctorCheck;
  totalIssues: number;
  skillAudit: SkillAuditReport;
  skillEval: SkillEvalCoverage;
  dualInstall: DualInstallReport;
  state: StateDoctorCheck;
  selfHealing?: SelfHealingGateResult;
  hookWrappers: HookWrapperCheck[];
}
