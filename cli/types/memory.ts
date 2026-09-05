export interface MemoryObservePayload {
  sessionId: string;
  content: string;
  source: string;
}

export interface MemoryRememberPayload {
  sessionId: string;
  /** Human-readable narrative the provider can enrich into a recallable fact. */
  content: string;
  /** Optional 1-10 salience hint; higher survives consolidation/eviction longer. */
  importance?: number;
}

export interface MemoryRecallPayload {
  query: string;
  /** Maximum enriched facts to return. */
  limit?: number;
}

export interface MemoryRecallResult {
  text: string;
  score: number;
  source?: string;
}

export interface MemoryProviderStatus {
  provider: "agentmemory" | "none";
  reachable: boolean;
  endpoint?: string;
  version?: string;
  reason?: string;
}

export interface MemoryProvider {
  name: "agentmemory" | "none";
  status(): Promise<MemoryProviderStatus>;
  observe(payload: MemoryObservePayload): Promise<boolean>;
  /**
   * Store a durable, enrichable fact (vs `observe`'s raw event envelope). Optional
   * so existing provider stubs/mocks remain valid; callers must feature-detect.
   */
  remember?(payload: MemoryRememberPayload): Promise<boolean>;
  /**
   * Recall enriched facts. Optional so providers that only mirror L1 events
   * remain valid and callers can deterministically fall back to local history.
   */
  recall?(payload: MemoryRecallPayload): Promise<MemoryRecallResult[]>;
}

export interface MemoryCommandStatus {
  status: number | null;
  error?: string;
}

export type AgentMemoryInstaller = () => Promise<MemoryCommandStatus>;

export interface AgentMemoryProviderOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  healthTimeoutMs?: number;
  observeTimeoutMs?: number;
  rememberTimeoutMs?: number;
  recallTimeoutMs?: number;
}

export interface AgentMemoryEndpointConfig {
  port?: number;
  url?: string;
  socket?: string;
  source?: "oma" | "agentmemory" | "user";
  updatedAt?: string;
}

export interface MemoryServiceCommand {
  bin: string;
  args: string[];
  optional?: boolean;
}

export type MemoryServiceCommandRunner = (
  command: MemoryServiceCommand,
) => MemoryCommandStatus;

export type MemoryServiceAction = "install" | "uninstall";

export interface MemoryServiceCommandPlanOptions {
  action: MemoryServiceAction;
  platform: NodeJS.Platform;
  servicePath: string;
}

export interface MemoryServiceCommandRunOptions {
  commands: MemoryServiceCommand[];
  runner: MemoryServiceCommandRunner;
}

export interface MemoryServiceCommandResult {
  activated: boolean;
  commandExitCode?: number | null;
  commandError?: string;
}

export interface MemorySetupOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  endpoint?: string;
  port?: number | string;
  dryRun?: boolean;
  install?: boolean;
  start?: boolean;
  platform?: NodeJS.Platform;
  installer?: AgentMemoryInstaller;
  serviceRunner?: MemoryServiceCommandRunner;
}

export interface MemoryServiceOptions {
  homeDir?: string;
  platform?: NodeJS.Platform;
  dryRun?: boolean;
  port?: number | string;
  runner?: MemoryServiceCommandRunner;
}

export type MemoryServiceUninstallOptions = Omit<MemoryServiceOptions, "port">;

export type MemoryMaintainAction = "backup" | "prune" | "vacuum";

export interface MemoryMaintainOptions {
  action: MemoryMaintainAction;
  homeDir?: string;
  dryRun?: boolean;
  keep?: number | string;
  runner?: MemoryServiceCommandRunner;
}

export interface MemoryMaintainCommandResult {
  command: string;
  status: number | null;
  error?: string;
}

export interface MemoryMaintainResult {
  action: MemoryMaintainAction;
  homeDir: string;
  configDir: string;
  backupDir: string;
  backupPath?: string;
  copiedFiles: number;
  prunedBackups: string[];
  vacuumTargets: string[];
  vacuumResults: MemoryMaintainCommandResult[];
  keep: number;
  dryRun: boolean;
  message: string;
}

export interface MemoryUpgradeOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  bin?: string;
  port?: number | string;
  dryRun?: boolean;
  runner?: MemoryServiceCommandRunner;
}

/** Which project-local stores `oma memory gc` sweeps. */
export type MemoryGcScope = "all" | "sessions" | "serena";

/** `memory.gc` defaults resolved from oma-config.yaml (normalized keys). */
export interface MemoryGcConfig {
  keep?: number;
  maxAgeDays?: number;
}

export interface MemoryGcOptions {
  /** Project root to sweep. Defaults to `process.cwd()`. */
  baseDir?: string;
  /** L1: number of most-recent session dirs to retain (LRU by mtime). */
  keep?: number | string;
  /** Serena: prune aged run artifacts older than this many days (0 disables). */
  maxAgeDays?: number | string;
  scope?: MemoryGcScope;
  dryRun?: boolean;
  /** Injectable clock for deterministic tests. */
  nowMs?: number;
}

export interface MemoryGcResult {
  baseDir: string;
  scope: MemoryGcScope;
  keep: number;
  maxAgeDays: number;
  dryRun: boolean;
  /** Absolute paths of pruned L1 session directories. */
  prunedSessions: string[];
  /** L1 session dirs retained (incl. active + within keep window). */
  keptSessions: number;
  /** Absolute paths of pruned Serena ephemeral memory files. */
  prunedSerena: string[];
  /** Serena ephemeral files retained (matched a prunable pattern but kept). */
  keptSerena: number;
  message: string;
}

export interface MemoryUpgradeResult {
  homeDir: string;
  dryRun: boolean;
  stop: MemoryDaemonResult;
  backup: MemoryMaintainResult;
  upgradeCommand: string;
  upgradeExitCode?: number | null;
  upgradeError?: string;
  start?: MemoryDaemonResult;
  status: MemoryProviderStatus;
  message: string;
}

export interface MemorySetupResult {
  homeDir: string;
  configDir: string;
  endpointPath: string;
  endpoint: string | null;
  endpointConfigured: boolean;
  wroteEndpoint: boolean;
  dryRun: boolean;
  installRequested: boolean;
  installExitCode?: number | null;
  installSkipped?: boolean;
  installError?: string;
  service?: MemoryServiceResult;
  startRequested: boolean;
  daemon?: MemoryDaemonResult;
  installCommand: string;
  startCommand: string;
  status: MemoryProviderStatus;
}

export interface MemoryDaemonResult {
  action: "status" | "start" | "stop" | "restart";
  homeDir: string;
  pidPath: string;
  ownedPid?: number;
  ownedProcessRunning: boolean;
  endpoint: string | null;
  startedPid?: number;
  stoppedPid?: number;
  attemptedFallbackStop?: boolean;
  fallbackStopCode?: number | null;
  status: MemoryProviderStatus;
  dryRun: boolean;
  message?: string;
}

export interface MemoryRetryDrainResult {
  retryPath: string;
  total: number;
  drained: number;
  retained: number;
  invalid: number;
  dryRun: boolean;
}

export type MemoryImportSource =
  | "all"
  | "claude"
  | "codex"
  | "cursor"
  | "gemini"
  | "qwen"
  | "retry";

export type MemoryRawTurnRole = "user" | "assistant";

export interface MemoryRawTurn {
  vendor: Exclude<MemoryImportSource, "all" | "retry">;
  role: MemoryRawTurnRole;
  text: string;
  timestamp: number;
  sourcePath?: string;
  vendorSessionId?: string;
  idempotencyKey: string;
  project?: string;
}

export type MemoryRawTurnLoader = (
  options: MemoryImportLoadOptions,
) => Promise<MemoryRawTurn[] | MemoryRawTurnLoadResult>;

export interface MemoryImportLoadOptions {
  sources: Array<Exclude<MemoryImportSource, "all" | "retry">>;
  start: number;
  end: number;
}

export interface MemoryRawTurnLoadResult {
  turns: MemoryRawTurn[];
  warnings: string[];
}

export interface MemoryImportOptions {
  source?: string;
  since?: string;
  dryRun?: boolean;
  forcePartial?: boolean;
  projectDir?: string;
  provider?: MemoryProvider;
  rawTurnLoader?: MemoryRawTurnLoader;
}

export interface MemoryImportResult {
  source: string;
  start: number;
  end: number;
  total: number;
  imported: number;
  failed: number;
  dryRun: boolean;
  partial: boolean;
  warnings: string[];
  retry?: MemoryRetryDrainResult;
}

export interface MemoryServiceResult {
  action: MemoryServiceAction;
  platform: NodeJS.Platform;
  supported: boolean;
  dryRun: boolean;
  servicePath?: string;
  wroteFile: boolean;
  removedFile: boolean;
  activated: boolean;
  commands: string[];
  commandExitCode?: number | null;
  commandError?: string;
  content?: string;
  message: string;
}

export interface MemoryServicePresence {
  platform: NodeJS.Platform;
  supported: boolean;
  servicePath?: string;
  installed: boolean;
}
