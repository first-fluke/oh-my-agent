import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

// Helper to check if process with PID is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

type UserPreferences = {
  default_cli?: string;
  agent_cli_mapping?: Record<string, string>;
};

type VendorConfig = {
  command?: string;
  subcommand?: string;
  prompt_flag?: string;
  auto_approve_flag?: string;
  output_format_flag?: string;
  output_format?: string;
  model_flag?: string;
  default_model?: string;
  isolation_env?: string;
  isolation_flags?: string;
};

type CliConfig = {
  active_vendor?: string;
  vendors: Record<string, VendorConfig>;
};

function splitArgs(value: string): string[] {
  const args: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null = regex.exec(value);
  while (match !== null) {
    if (match[1] !== undefined) args.push(match[1]);
    else if (match[2] !== undefined) args.push(match[2]);
    else if (match[0]) args.push(match[0]);
    match = regex.exec(value);
  }
  return args;
}

const UserPreferencesSchema = z
  .object({
    default_cli: z.string().optional(),
    agent_cli_mapping: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .transform((value) => ({
    default_cli: value.default_cli,
    agent_cli_mapping: value.agent_cli_mapping ?? {},
  }));

const VendorConfigSchema = z
  .object({
    command: z.string().optional(),
    subcommand: z.string().optional(),
    prompt_flag: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        const normalized = value.trim().toLowerCase();
        if (
          normalized === "" ||
          normalized === "none" ||
          normalized === "null"
        ) {
          return null;
        }
        return value;
      }),
    auto_approve_flag: z.string().optional(),
    output_format_flag: z.string().optional(),
    output_format: z.string().optional(),
    model_flag: z.string().optional(),
    default_model: z.string().optional(),
    isolation_env: z.string().optional(),
    isolation_flags: z.string().optional(),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    prompt_flag: value.prompt_flag ?? undefined,
  }));

const CliConfigSchema = z
  .object({
    active_vendor: z.string().optional(),
    vendors: z.record(z.string(), VendorConfigSchema).optional(),
  })
  .passthrough()
  .transform((value) => ({
    active_vendor: value.active_vendor,
    vendors: value.vendors ?? {},
  }));

function parseYamlValue(content: string): unknown {
  try {
    return parseYaml(content);
  } catch {
    return null;
  }
}

function parseUserPreferences(content: string): UserPreferences {
  const parsed = parseYamlValue(content);
  const result = UserPreferencesSchema.safeParse(parsed);
  if (!result.success) return {};
  return result.data;
}

function parseCliConfig(content: string): CliConfig {
  const parsed = parseYamlValue(content);
  const result = CliConfigSchema.safeParse(parsed);
  if (!result.success) return { vendors: {} };

  return {
    active_vendor: result.data.active_vendor,
    vendors: result.data.vendors as Record<string, VendorConfig>,
  };
}

function findConfigFileUp(
  startDir: string,
  relativePath: string,
): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const configPath = path.join(current, relativePath);
    if (fs.existsSync(configPath)) return configPath;
    current = path.dirname(current);
  }
  return null;
}

function readUserPreferences(cwd: string): UserPreferences | null {
  const configPath = findConfigFileUp(
    cwd,
    path.join(".agents", "config", "user-preferences.yaml"),
  );
  if (!configPath) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseUserPreferences(content);
  } catch {
    return null;
  }
}

function readCliConfig(cwd: string): CliConfig | null {
  const configPath = findConfigFileUp(
    cwd,
    path.join(".agents", "skills", "oma-orchestrator", "config", "cli-config.yaml"),
  );
  if (!configPath) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseCliConfig(content);
  } catch {
    return null;
  }
}

function resolveVendor(
  agentId: string,
  vendorOverride?: string,
): { vendor: string; config: CliConfig | null } {
  const cwd = process.cwd();
  const userPrefs = readUserPreferences(cwd);
  const cliConfig = readCliConfig(cwd);

  const normalizedAgentId = agentId.replace(/-agent$/i, "");
  const mappedVendor =
    userPrefs?.agent_cli_mapping?.[agentId] ||
    userPrefs?.agent_cli_mapping?.[normalizedAgentId];
  const vendor =
    vendorOverride ||
    mappedVendor ||
    userPrefs?.default_cli ||
    cliConfig?.active_vendor ||
    "gemini";

  return { vendor: vendor.toLowerCase(), config: cliConfig };
}

function resolvePromptFlag(
  vendor: string,
  promptFlag?: string | null,
): string | null {
  if (promptFlag !== undefined) {
    return promptFlag;
  }

  const defaults: Record<string, string | null> = {
    gemini: "-p",
    claude: "-p",
    qwen: "-p",
    codex: null,
  };

  return defaults[vendor] ?? "-p";
}

// ============================================================================
// Monorepo Workspace Detection
// ============================================================================

/**
 * Keywords to match workspace directories to agent types.
 * Order matters - first match wins.
 */
const AGENT_WORKSPACE_KEYWORDS: Record<string, string[]> = {
  frontend: [
    "web",
    "frontend",
    "client",
    "ui",
    "app",
    "dashboard",
    "admin",
    "portal",
  ],
  backend: ["api", "backend", "server", "service", "gateway", "core"],
  mobile: ["mobile", "ios", "android", "native", "rn", "expo"],
};

/**
 * Fallback candidates when no monorepo config is found.
 */
const WORKSPACE_CANDIDATES: Record<string, string[]> = {
  frontend: [
    "apps/web",
    "apps/frontend",
    "apps/client",
    "packages/web",
    "packages/frontend",
    "frontend",
    "web",
    "client",
  ],
  backend: [
    "apps/api",
    "apps/backend",
    "apps/server",
    "packages/api",
    "packages/backend",
    "backend",
    "api",
    "server",
  ],
  mobile: ["apps/mobile", "apps/app", "packages/mobile", "mobile", "app"],
};

/**
 * Expand simple glob patterns like "apps/*" or "packages/*".
 * Supports patterns ending with /* or /** (treated the same for top-level).
 */
function expandGlobPattern(pattern: string, cwd: string): string[] {
  // Handle negation patterns (skip them)
  if (pattern.startsWith("!")) {
    return [];
  }

  // Clean up pattern
  const cleanPattern = pattern.replace(/\/\*\*?$/, "").replace(/\/$/, "");

  // If no wildcard, it's a direct path
  if (!pattern.includes("*")) {
    const fullPath = path.join(cwd, cleanPattern);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return [cleanPattern];
    }
    return [];
  }

  // Handle patterns like "apps/*" or "packages/*"
  const parentDir = path.join(cwd, cleanPattern);
  if (!fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    return [];
  }

  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => path.join(cleanPattern, entry.name));
  } catch {
    return [];
  }
}

/**
 * Parse pnpm-workspace.yaml to get workspace patterns.
 */
function parsePnpmWorkspace(cwd: string): string[] {
  const configPath = path.join(cwd, "pnpm-workspace.yaml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = parseYaml(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

/**
 * Parse package.json workspaces field.
 * Supports both array format and object format with packages field.
 */
function parsePackageJsonWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "package.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as {
      workspaces?: string[] | { packages?: string[] };
    };

    if (Array.isArray(parsed?.workspaces)) {
      return parsed.workspaces;
    }
    if (parsed?.workspaces && typeof parsed.workspaces === "object") {
      return parsed.workspaces.packages ?? [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Parse lerna.json packages field.
 */
function parseLernaConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "lerna.json");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { packages?: string[] };
    return parsed?.packages ?? [];
  } catch {
    return [];
  }
}

/**
 * Check if Nx monorepo (nx.json exists) - use standard Nx conventions.
 */
function detectNxWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "nx.json");
  if (!fs.existsSync(configPath)) return [];

  // Nx typically uses apps/* and libs/*
  const patterns = ["apps/*", "libs/*", "packages/*"];
  return patterns.flatMap((p) => expandGlobPattern(p, cwd));
}

/**
 * Check Turbo monorepo via turbo.json - use package.json workspaces.
 */
function detectTurboWorkspaces(cwd: string): string[] {
  const configPath = path.join(cwd, "turbo.json");
  if (!fs.existsSync(configPath)) return [];

  // Turbo uses package.json workspaces
  return parsePackageJsonWorkspaces(cwd);
}

/**
 * Parse mise.toml for project-specific workspace hints.
 */
function parseMiseConfig(cwd: string): string[] {
  const configPath = path.join(cwd, "mise.toml");
  if (!fs.existsSync(configPath)) return [];

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    // Look for [env] section with WORKSPACE patterns or custom keys
    // mise.toml is TOML, but we can do simple regex for common patterns
    const patterns: string[] = [];

    // Match lines like: workspaces = ["apps/*", "packages/*"]
    const workspacesMatch = content.match(/workspaces\s*=\s*\[([^\]]+)\]/);
    if (workspacesMatch?.[1]) {
      const items = workspacesMatch[1].match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        patterns.push(...items.map((s) => s.replace(/["']/g, "")));
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Get all workspace directories from monorepo configuration files.
 * Checks: pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml
 */
function getMonorepoWorkspaces(cwd: string): string[] {
  const patterns = new Set<string>();

  // Priority order: pnpm > package.json > lerna > nx > turbo > mise
  const sources = [
    parsePnpmWorkspace(cwd),
    parsePackageJsonWorkspaces(cwd),
    parseLernaConfig(cwd),
    detectNxWorkspaces(cwd),
    detectTurboWorkspaces(cwd),
    parseMiseConfig(cwd),
  ];

  for (const source of sources) {
    for (const pattern of source) {
      patterns.add(pattern);
    }
  }

  // Expand all patterns to actual directories
  const workspaces = new Set<string>();
  for (const pattern of patterns) {
    for (const dir of expandGlobPattern(pattern, cwd)) {
      workspaces.add(dir);
    }
  }

  return [...workspaces];
}

/**
 * Match a workspace directory to an agent type based on keywords.
 * Returns a score (higher = better match).
 */
function scoreWorkspaceMatch(workspace: string, agentId: string): number {
  const keywords = AGENT_WORKSPACE_KEYWORDS[agentId];
  if (!keywords) return 0;

  const dirName = path.basename(workspace).toLowerCase();
  const fullPath = workspace.toLowerCase();

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (!keyword) continue;
    // Exact match on directory name gets highest score
    if (dirName === keyword) {
      return 100 - i;
    }
    // Directory name contains keyword
    if (dirName.includes(keyword)) {
      return 50 - i;
    }
    // Full path contains keyword (e.g., apps/web-admin)
    if (fullPath.includes(keyword)) {
      return 25 - i;
    }
  }

  return 0;
}

/**
 * Detect the best workspace for an agent type.
 * 1. First, try to detect from monorepo config files
 * 2. Fall back to hardcoded candidates
 */
function detectWorkspace(agentId: string): string {
  const cwd = process.cwd();

  // Try monorepo detection first
  const workspaces = getMonorepoWorkspaces(cwd);

  if (workspaces.length > 0) {
    // Score each workspace for this agent type
    const scored = workspaces
      .map((ws) => ({ workspace: ws, score: scoreWorkspaceMatch(ws, agentId) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0]) {
      return scored[0].workspace;
    }
  }

  // Fall back to hardcoded candidates
  const candidates = WORKSPACE_CANDIDATES[agentId];
  if (candidates) {
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return candidate;
      }
    }
  }

  return ".";
}

function resolvePromptContent(prompt: string): string {
  const resolved = path.resolve(prompt);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return fs.readFileSync(resolved, "utf-8");
  }
  return prompt;
}

function loadExecutionProtocol(vendor: string, cwd: string): string {
  const protocolPath = findConfigFileUp(
    cwd,
    path.join(
      ".agents",
      "skills",
      "_shared",
      "runtime",
      "execution-protocols",
      `${vendor}.md`,
    ),
  );
  if (!protocolPath) return "";
  try {
    return fs.readFileSync(protocolPath, "utf-8");
  } catch {
    return "";
  }
}

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
) {
  const effectiveWorkspace =
    workspace === "." ? detectWorkspace(agentId) : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const tmpDir = tmpdir();
  const logFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.pid`);

  const rawPromptContent = resolvePromptContent(prompt);
  const { vendor, config } = resolveVendor(agentId, vendorOverride);

  // Inject vendor-specific execution protocol
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  const promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  const vendorConfig = config?.vendors?.[vendor] || {};
  const command = vendorConfig.command || vendor;
  const subcommand = vendorConfig.subcommand;

  // Prepare log stream
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  const optionArgs: string[] = [];
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    optionArgs.push(
      vendorConfig.output_format_flag,
      vendorConfig.output_format,
    );
  } else if (vendorConfig.output_format_flag) {
    optionArgs.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.isolation_flags) {
    optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
  }

  if (vendorConfig.auto_approve_flag) {
    optionArgs.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
      codex: "--full-auto",
      qwen: "--yolo",
    };
    const fallbackFlag = defaultAutoApprove[vendor];
    if (fallbackFlag) {
      optionArgs.push(fallbackFlag);
    }
  }

  if (promptFlag) {
    optionArgs.push(promptFlag, promptContent);
  }

  const args: string[] = [];
  if (subcommand) args.push(subcommand);
  args.push(...optionArgs);
  if (!promptFlag) {
    args.push(promptContent);
  }

  const env = { ...process.env };
  if (vendorConfig.isolation_env) {
    const [key, ...rest] = vendorConfig.isolation_env.split("=");
    const rawValue = rest.join("=");
    if (key && rawValue) {
      env[key] = rawValue.replace("$$", String(process.pid));
    }
  }

  // Spawn selected CLI
  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream], // Redirect stdout/stderr to log file
    detached: false, // We want to wait for it, behaving like the script
    env,
  });

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  // Write PID
  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_e) {
      // ignore
    }
  };

  // Handle signals to kill child
  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    cleanup();
    process.exit();
  };

  process.on("SIGINT", cleanAndExit);
  process.on("SIGTERM", cleanAndExit);

  (child as unknown as NodeJS.EventEmitter).on(
    "exit",
    (code: number | null) => {
      console.log(color.blue(`[${agentId}] Exited with code ${code}`));
      cleanup();
      process.exit(code ?? 0);
    },
  );
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = path.join(
      rootPath,
      ".serena",
      "memories",
      `result-${agent}.md`,
    );
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      // grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}'
      const match = content.match(/^## Status:\s*(\S+)/m);
      if (match?.[1]) {
        // Use the status from the file to be more precise if possible
        // But script logic was:
        // STATUS=$(grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}')
        // echo "${agent}:${STATUS}"
        results[agent] = match[1];
      } else {
        results[agent] = `completed`; // Fallback if status header missing but file exists
      }
    } else if (fs.existsSync(pidFile)) {
      // Logic for checking PID
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = parseInt(pidContent, 10);
      if (!Number.isNaN(pid) && isProcessRunning(pid)) {
        results[agent] = "running";
      } else {
        results[agent] = "crashed";
      }
    } else {
      results[agent] = "crashed"; // or "not_started" but script says "crashed"
    }
  }

  // Output in format comparable to script: "agent:status"
  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}

type TaskDefinition = {
  agent: string;
  task: string;
  workspace?: string;
};

const TaskDefinitionSchema = z.object({
  agent: z.string(),
  task: z.string(),
  workspace: z.string().optional(),
});

const TasksFileSchema = z.object({
  tasks: z.array(TaskDefinitionSchema),
});

function parseTasksFile(filePath: string): TaskDefinition[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tasks file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseYaml(content);
  const result = TasksFileSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid tasks file format: ${result.error.message}`);
  }

  return result.data.tasks;
}

function parseInlineTasks(taskSpecs: string[]): TaskDefinition[] {
  return taskSpecs.map((spec) => {
    const parts = spec.split(":");
    if (parts.length < 2 || !parts[0]) {
      throw new Error(
        `Invalid task format: "${spec}". Expected "agent:task" or "agent:task:workspace"`,
      );
    }

    const agent = parts[0];
    const rest = parts.slice(1);
    let task: string;
    let workspace: string | undefined;

    if (rest.length >= 2) {
      const lastPart = rest[rest.length - 1] ?? "";
      if (
        lastPart.startsWith("./") ||
        lastPart.startsWith("/") ||
        lastPart === "."
      ) {
        workspace = lastPart;
        task = rest.slice(0, -1).join(":");
      } else {
        task = rest.join(":");
      }
    } else {
      task = rest.join(":");
    }

    return { agent, task, workspace };
  });
}

export async function parallelRun(
  tasksOrFile: string[],
  options: {
    vendor?: string;
    inline?: boolean;
    noWait?: boolean;
  } = {},
) {
  const cwd = process.cwd();
  const resultsDir = path.join(cwd, ".agents", "results");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(resultsDir, `parallel-${timestamp}`);

  fs.mkdirSync(runDir, { recursive: true });

  const pidListFile = path.join(runDir, "pids.txt");

  let tasks: TaskDefinition[];
  try {
    if (options.inline) {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks specified"));
        console.log(
          'Usage: oh-my-ag agent:parallel --inline "agent:task" "agent:task" ...',
        );
        process.exit(1);
      }
      tasks = parseInlineTasks(tasksOrFile);
    } else {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks file specified"));
        console.log("Usage: oh-my-ag agent:parallel <tasks-file.yaml>");
        process.exit(1);
      }
      const tasksFile = tasksOrFile[0];
      if (!tasksFile) {
        console.error(color.red("Error: No tasks file specified"));
        process.exit(1);
      }
      tasks = parseTasksFile(tasksFile);
    }
  } catch (error) {
    console.error(color.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }

  console.log(color.cyan("======================================"));
  console.log(color.cyan("  Parallel SubAgent Execution"));
  console.log(color.cyan("======================================"));
  console.log("");
  console.log(color.blue("Starting parallel execution..."));
  console.log("");

  const childProcesses: Array<{
    pid: number;
    agent: string;
    idx: number;
    promise: Promise<number | null>;
  }> = [];

  for (let idx = 0; idx < tasks.length; idx++) {
    const taskDef = tasks[idx];
    if (!taskDef) continue;
    const { agent, task, workspace = "." } = taskDef;
    const effectiveWorkspace =
      workspace === "." ? detectWorkspace(agent) : workspace;
    const resolvedWorkspace = path.resolve(effectiveWorkspace);
    const logFile = path.join(runDir, `${agent}-${idx}.log`);

    console.log(
      `${color.blue(`[${idx}]`)} Spawning ${color.yellow(agent)} agent...`,
    );
    console.log(
      `    Task: ${task.slice(0, 60)}${task.length > 60 ? "..." : ""}`,
    );
    console.log(`    Workspace: ${effectiveWorkspace}`);

    if (!fs.existsSync(resolvedWorkspace)) {
      fs.mkdirSync(resolvedWorkspace, { recursive: true });
    }

    const { vendor, config } = resolveVendor(agent, options.vendor);
    const vendorConfig = config?.vendors?.[vendor] || {};
    const command = vendorConfig.command || vendor;
    const subcommand = vendorConfig.subcommand;

    const optionArgs: string[] = [];
    const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
    const rawPromptContent = resolvePromptContent(task);

    // Inject vendor-specific execution protocol
    const executionProtocol = loadExecutionProtocol(vendor, cwd);
    const promptContent = executionProtocol
      ? `${rawPromptContent}\n\n${executionProtocol}`
      : rawPromptContent;

    if (vendorConfig.output_format_flag && vendorConfig.output_format) {
      optionArgs.push(
        vendorConfig.output_format_flag,
        vendorConfig.output_format,
      );
    } else if (vendorConfig.output_format_flag) {
      optionArgs.push(vendorConfig.output_format_flag);
    }

    if (vendorConfig.model_flag && vendorConfig.default_model) {
      optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
    }

    if (vendorConfig.isolation_flags) {
      optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
    }

    if (vendorConfig.auto_approve_flag) {
      optionArgs.push(vendorConfig.auto_approve_flag);
    } else {
      const defaultAutoApprove: Record<string, string> = {
        gemini: "--approval-mode=yolo",
        codex: "--full-auto",
        qwen: "--yolo",
      };
      const fallbackFlag = defaultAutoApprove[vendor];
      if (fallbackFlag) {
        optionArgs.push(fallbackFlag);
      }
    }

    if (promptFlag) {
      optionArgs.push(promptFlag, promptContent);
    }

    const args: string[] = [];
    if (subcommand) args.push(subcommand);
    args.push(...optionArgs);
    if (!promptFlag) {
      args.push(promptContent);
    }

    const env = { ...process.env };
    if (vendorConfig.isolation_env) {
      const [key, ...rest] = vendorConfig.isolation_env.split("=");
      const rawValue = rest.join("=");
      if (key && rawValue) {
        env[key] = rawValue.replace("$$", String(process.pid));
      }
    }

    const logStream = fs.openSync(logFile, "w");

    const child = spawnProcess(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, logStream],
      detached: false,
      env,
    });

    if (!child.pid) {
      console.error(color.red(`[${idx}] Failed to spawn ${agent} process`));
      continue;
    }

    fs.appendFileSync(pidListFile, `${child.pid}:${agent}\n`);

    const exitPromise = new Promise<number | null>((resolve) => {
      (child as unknown as NodeJS.EventEmitter).on(
        "exit",
        (code: number | null) => {
          fs.closeSync(logStream);
          resolve(code);
        },
      );
      (child as unknown as NodeJS.EventEmitter).on("error", () => {
        fs.closeSync(logStream);
        resolve(null);
      });
    });

    childProcesses.push({
      pid: child.pid,
      agent,
      idx,
      promise: exitPromise,
    });
  }

  console.log("");
  console.log(
    color.blue("[Parallel]") +
      ` Started ${color.yellow(String(childProcesses.length))} agents`,
  );

  if (options.noWait) {
    console.log(`${color.blue("[Parallel]")} Running in background mode`);
    console.log(`${color.blue("[Parallel]")} Results will be in: ${runDir}`);
    console.log(`${color.blue("[Parallel]")} PID list: ${pidListFile}`);
    return;
  }

  console.log(`${color.blue("[Parallel]")} Waiting for completion...`);
  console.log("");

  const cleanup = () => {
    console.log("");
    console.log(`${color.yellow("[Parallel]")} Cleaning up child processes...`);
    for (const { pid, agent } of childProcesses) {
      if (isProcessRunning(pid)) {
        try {
          process.kill(pid);
          console.log(
            `${color.yellow("[Parallel]")} Killed PID ${pid} (${agent})`,
          );
        } catch {
          // empty
        }
      }
    }
    try {
      if (fs.existsSync(pidListFile)) {
        fs.unlinkSync(pidListFile);
      }
    } catch {
      // empty
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  let completed = 0;
  let failed = 0;

  for (const { agent, idx, promise } of childProcesses) {
    const exitCode = await promise;
    if (exitCode === 0) {
      console.log(`${color.green("[DONE]")} ${agent} agent (${idx}) completed`);
      completed++;
    } else {
      console.log(
        color.red("[FAIL]") +
          ` ${agent} agent (${idx}) failed (exit code: ${exitCode})`,
      );
      failed++;
    }
  }

  try {
    if (fs.existsSync(pidListFile)) {
      fs.unlinkSync(pidListFile);
    }
  } catch {
    // empty
  }

  console.log("");
  console.log(color.cyan("======================================"));
  console.log(color.cyan("  Execution Summary"));
  console.log(color.cyan("======================================"));
  console.log(`Total:     ${childProcesses.length}`);
  console.log(`Completed: ${color.green(String(completed))}`);
  console.log(`Failed:    ${color.red(String(failed))}`);
  console.log(`Results:   ${runDir}`);
  console.log(color.cyan("======================================"));

  console.log("");
  console.log(color.blue("Result files:"));
  const logFiles = fs.readdirSync(runDir).filter((f) => f.endsWith(".log"));
  for (const f of logFiles) {
    console.log(`  - ${path.join(runDir, f)}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}
