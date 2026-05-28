export interface MemoryObservePayload {
  sessionId: string;
  content: string;
  source: string;
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
