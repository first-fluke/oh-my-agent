import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import { atomicWriteJson } from "./events.js";
import {
  contractStillCurrent,
  loadTaskContract,
  type TaskContract,
  TaskContractSchema,
} from "./task-contract.js";

export const AgentClaimSchema = z.object({
  status: z.enum(["completed", "partial", "blocked", "failed"]),
  changedFiles: z.array(z.string()),
  unresolved: z.array(z.string()),
  artifacts: z.array(z.string()),
  verificationSkipped: z.string().trim().min(10).optional(),
});
export type AgentClaim = z.infer<typeof AgentClaimSchema>;
export interface VerificationReceipt {
  command: string[];
  cwd?: string;
  checkId?: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  before: string;
  after: string;
}
export interface AgentRun {
  schemaVersion: 1;
  runId: string;
  sequence: number;
  taskId: string;
  sessionId: string;
  agentId: string;
  vendor: string;
  runnerPid?: number;
  workspace: string;
  artifactRoot: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | AgentClaim["status"];
  exitCode?: number | null;
  before: string;
  after?: string;
  checks: VerificationReceipt[];
  changedFiles: string[];
  unresolved: string[];
  artifacts: Record<string, string>;
  verificationSkipped?: string;
  contract?: TaskContract;
  dispatch?: { prompt: string; readOnly?: boolean };
  resumedFrom?: string;
}

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const RunSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().uuid(),
  sequence: z.number().int().positive(),
  taskId: z.string().min(1),
  sessionId: z.string().min(1),
  agentId: z.string().min(1),
  vendor: z.string().min(1),
  runnerPid: z.number().int().positive().optional(),
  workspace: z.string().min(1),
  artifactRoot: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  status: z.enum(["running", "completed", "partial", "blocked", "failed"]),
  exitCode: z.number().int().nullable().optional(),
  before: hashSchema,
  after: hashSchema.optional(),
  checks: z.array(
    z.object({
      command: z.array(z.string()).min(1),
      cwd: z.string().optional(),
      checkId: z.string().optional(),
      startedAt: z.string().datetime(),
      finishedAt: z.string().datetime(),
      exitCode: z.number().int().nullable(),
      before: hashSchema,
      after: hashSchema,
    }),
  ),
  changedFiles: z.array(z.string()),
  unresolved: z.array(z.string()),
  artifacts: z.record(z.string(), hashSchema),
  verificationSkipped: z.string().optional(),
  contract: TaskContractSchema.optional(),
  dispatch: z
    .object({ prompt: z.string(), readOnly: z.boolean().optional() })
    .optional(),
  resumedFrom: z.string().uuid().optional(),
});

const generated =
  /^(?:\.agents\/(?:state|results)(?:\/|$)|\.serena\/memories(?:\/|$)|\.opencode\/agents\/oma-spawn-[^/]+\.md$)/;
function digest(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Hash actual contents, including staged/unstaged and untracked files. Runtime
 * evidence is excluded so writing a receipt cannot invalidate itself. */
export function workspaceFingerprint(
  workspace: string,
  inputs?: string[],
): string {
  if (inputs) {
    const root = resolve(workspace);
    const hash = createHash("sha256");
    const visit = (name: string) => {
      if (generated.test(name) || name === ".git" || name.startsWith(".git/"))
        return;
      const file = resolve(root, name);
      hash.update(`${name}\0`);
      try {
        const stat = lstatSync(file);
        hash.update(`${stat.mode}\0`);
        if (stat.isSymbolicLink())
          throw new Error(`Scoped inputs cannot follow symlinks: ${name}`);
        if (stat.isDirectory()) {
          for (const entry of readdirSync(file).sort())
            visit(name ? `${name}/${entry}` : entry);
        } else if (stat.isFile()) hash.update(digest(readFileSync(file)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        hash.update("missing");
      }
      hash.update("\0");
    };
    for (const name of [
      ...new Set(
        inputs.map((input) =>
          relative(root, resolve(root, input)).replaceAll("\\", "/"),
        ),
      ),
    ].sort()) {
      // lstat on the final file alone would miss a symlink in its parents.
      let prefix = root;
      for (const component of name.split("/").filter(Boolean)) {
        prefix = join(prefix, component);
        try {
          if (lstatSync(prefix).isSymbolicLink())
            throw new Error(`Scoped inputs cannot follow symlinks: ${name}`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          break;
        }
      }
      visit(name);
    }
    return hash.digest("hex");
  }
  let root = resolve(workspace);
  let head = "unversioned";
  let files: string[];
  try {
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    files = execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    )
      .split("\0")
      .filter(Boolean);
    try {
      head = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      head = "unborn";
    }
  } catch {
    files = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), {
        withFileTypes: true,
      })) {
        if ([".git", "node_modules"].includes(entry.name)) continue;
        const name = dir ? `${dir}/${entry.name}` : entry.name;
        if (generated.test(name)) continue;
        if (entry.isDirectory()) walk(name);
        else files.push(name);
      }
    };
    walk("");
  }
  const hash = createHash("sha256").update(`${head}\0`);
  for (const name of [...new Set(files)]
    .filter((name) => !generated.test(name))
    .sort()) {
    hash.update(`${name}\0`);
    try {
      const file = join(root, name);
      const stat = lstatSync(file);
      hash.update(`${stat.mode}\0`);
      if (stat.isSymbolicLink()) hash.update(readlinkSync(file));
      else if (stat.isFile()) hash.update(digest(readFileSync(file)));
      else hash.update("directory");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      hash.update("deleted");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

function runPath(root: string, runId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Invalid agent run ID");
  return join(root, ".agents/state/agent-runs", `${runId}.json`);
}
export function claimPath(root: string, runId: string): string {
  return runPath(root, runId).replace(/\.json$/, ".claim.json");
}
export function readAgentRun(root: string, runId: string): AgentRun {
  const run = RunSchema.parse(
    JSON.parse(readFileSync(runPath(root, runId), "utf8")),
  );
  if (run.runId !== runId) throw new Error("Invalid agent run record");
  return run;
}
export function beginAgentRun(args: {
  root: string;
  workspace: string;
  agentId: string;
  sessionId: string;
  taskId: string;
  vendor: string;
  managed?: boolean;
  dispatch?: AgentRun["dispatch"];
  resumedFrom?: string;
}): AgentRun {
  const contract =
    loadTaskContract(args.root, args.sessionId, args.taskId) ?? undefined;
  if (args.resumedFrom) {
    const previous = readAgentRun(args.root, args.resumedFrom);
    if (
      previous.sessionId !== args.sessionId ||
      previous.taskId !== args.taskId
    )
      throw new Error("A retry must belong to the same session and task");
  }
  const run: AgentRun = {
    schemaVersion: 1,
    runId: randomUUID(),
    sequence: 0,
    taskId: args.taskId,
    sessionId: args.sessionId,
    agentId: args.agentId,
    vendor: args.vendor,
    runnerPid: args.managed ? process.pid : undefined,
    workspace: resolve(args.workspace),
    artifactRoot: resolve(args.root),
    startedAt: new Date().toISOString(),
    status: "running",
    before: workspaceFingerprint(
      contract?.inputs ? args.root : args.workspace,
      contract?.inputs,
    ),
    contract,
    dispatch: args.dispatch,
    resumedFrom: args.resumedFrom,
    checks: [],
    changedFiles: [],
    unresolved: [],
    artifacts: {},
  };
  return withStateIndexLock(args.root, () => {
    const counter = join(args.root, ".agents/state/agent-runs/_sequence.json");
    const previous: unknown = existsSync(counter)
      ? JSON.parse(readFileSync(counter, "utf8"))
      : 0;
    if (
      typeof previous !== "number" ||
      !Number.isSafeInteger(previous) ||
      previous < 0
    )
      throw new Error("Invalid agent run sequence");
    run.sequence = previous + 1;
    atomicWriteJson(counter, run.sequence);
    atomicWriteJson(runPath(args.root, run.runId), run);
    return run;
  });
}
export function agentResultInstructions(
  root: string,
  run: AgentRun,
  readOnly = false,
): string {
  if (readOnly)
    return `## Read-only result contract\nRun ${run.runId}, task ${run.taskId}, session ${run.sessionId}. Do not write coordination or result files. Return one final line: OMA_RESULT_JSON: {"status":"completed|partial|blocked|failed","changedFiles":[],"unresolved":[],"artifacts":[],"verificationSkipped":"specific explanation of the read-only inspection performed"}. The parent records this inspection; it does not count as executable verification.\n`;
  return (
    `## Execution result contract\nRun: ${run.runId}\nTask: ${run.taskId}\nSession: ${run.sessionId}\n` +
    `Execute the pinned required checks with: oma agent:verify ${run.runId} --required (from ${JSON.stringify(root)}).\nRequired checks: ${JSON.stringify(run.contract?.required_checks ?? [])}. A missing contract cannot prove acceptance criteria; define it in the session plan before starting a new run.\n` +
    `Write ${claimPath(root, run.runId)} as JSON: {"status":"completed|partial|blocked|failed","changedFiles":[],"unresolved":[],"artifacts":[]}.
Paths are relative to ${run.artifactRoot}. Include the report and relevant plan/phase artifacts. A completed result requires no unresolved items and successful current verification receipts, or an explicit verificationSkipped reason for work that needs no executable check. Do not invent checks. Never run a build unless the user explicitly requested it.\n`
  );
}

export function verifyAgentRun(
  root: string,
  runId: string,
  command: string[],
  cwd?: string,
): VerificationReceipt {
  if (!command[0]) throw new Error("A verification executable is required");
  const run = readAgentRun(root, runId);
  if (run.status !== "running")
    throw new Error("Cannot verify a finished run; start a new run");
  if (!contractStillCurrent(root, run.sessionId, run.taskId, run.contract))
    throw new Error("Task verification contract changed; start a new run");
  const directory = resolve(cwd ?? run.workspace);
  const declared = run.contract?.required_checks.find(
    (check) =>
      JSON.stringify(check.command) === JSON.stringify(command) &&
      resolve(run.artifactRoot, check.cwd) === directory,
  );
  const startedAt = new Date().toISOString();
  const before = runFingerprint(run);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: directory,
    stdio: "inherit",
    shell: false,
  });
  const receipt: VerificationReceipt = {
    command,
    cwd: directory,
    checkId: declared?.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    before,
    after: runFingerprint(run),
  };
  // Re-read to preserve prior receipts; verification commands run serially per run.
  withStateIndexLock(root, () => {
    const latest = readAgentRun(root, runId);
    if (latest.status !== "running")
      throw new Error("Run finished before verification was recorded");
    latest.checks.push(receipt);
    atomicWriteJson(runPath(root, runId), latest);
  });
  return receipt;
}

function artifactPath(workspace: string, name: string): string {
  const target = resolve(workspace, name);
  const rel = relative(workspace, target);
  if (isAbsolute(name) || rel === ".." || rel.startsWith(`..${sep}`))
    throw new Error(`Artifact must be workspace-relative: ${name}`);
  if (!lstatSync(target).isFile())
    throw new Error(`Artifact must be a regular file: ${name}`);
  return target;
}

export function readOnlyClaim(log: string): unknown {
  const line = log
    .split(/\r?\n/)
    .filter((line) => line.startsWith("OMA_RESULT_JSON: "))
    .at(-1);
  if (!line) return undefined;
  try {
    return JSON.parse(line.slice("OMA_RESULT_JSON: ".length));
  } catch {
    return undefined;
  }
}

export function finishAgentRun(
  root: string,
  runId: string,
  exitCode: number | null,
  claim?: unknown,
): AgentRun {
  const after = runFingerprint(readAgentRun(root, runId));
  return withStateIndexLock(root, () => {
    const run = readAgentRun(root, runId);
    if (run.status !== "running") return run;
    run.exitCode = exitCode;
    run.finishedAt = new Date().toISOString();
    run.after = after;
    try {
      const parsed = AgentClaimSchema.parse(
        claim ?? JSON.parse(readFileSync(claimPath(root, runId), "utf8")),
      );
      run.status = parsed.status;
      run.changedFiles = parsed.changedFiles;
      run.unresolved = parsed.unresolved;
      run.verificationSkipped = parsed.verificationSkipped;
      for (const name of parsed.artifacts)
        run.artifacts[name.replaceAll("\\", "/")] = digest(
          readFileSync(artifactPath(run.artifactRoot, name)),
        );
      if (run.status === "completed") {
        if (
          !contractStillCurrent(root, run.sessionId, run.taskId, run.contract)
        ) {
          run.status = "failed";
          run.unresolved.push(
            "Task acceptance contract changed during execution",
          );
        } else if (run.checks.length > 0 && !hasCurrentChecks(run)) {
          run.status = "failed";
          run.unresolved.push("Verification failed or evidence became stale");
        } else if (run.unresolved.length > 0) {
          run.status = "partial";
        } else if (
          !hasCurrentChecks(run) &&
          (!run.verificationSkipped || run.contract)
        ) {
          run.status = "partial";
          run.unresolved.push(
            "Missing declared checks: create acceptance_criteria and required_checks in the session plan, then verify a new run",
          );
        }
      }
    } catch (error) {
      run.status = "partial";
      run.unresolved.push(
        `Missing or invalid structured result: ${(error as Error).message}`,
      );
    }
    if (exitCode !== 0) run.status = "failed";
    atomicWriteJson(runPath(root, runId), run);
    return run;
  });
}

export function hasCurrentChecks(run: AgentRun): boolean {
  // Re-running a failed command successfully replaces its previous outcome.
  const latest = new Map(
    run.checks.map((check) => [
      JSON.stringify([check.command, resolve(check.cwd ?? run.workspace)]),
      check,
    ]),
  );
  const declared = run.contract?.required_checks;
  if (
    !declared?.length ||
    !contractStillCurrent(
      run.artifactRoot,
      run.sessionId,
      run.taskId,
      run.contract,
    )
  )
    return false;
  return (
    declared.every((check) =>
      run.checks.some(
        (receipt) =>
          receipt.checkId === check.id &&
          JSON.stringify(receipt.command) === JSON.stringify(check.command) &&
          resolve(receipt.cwd ?? run.workspace) ===
            resolve(run.artifactRoot, check.cwd),
      ),
    ) &&
    latest.size > 0 &&
    [...latest.values()].every(
      (check) =>
        check.exitCode === 0 &&
        check.before === run.after &&
        check.after === run.after,
    )
  );
}

export function listAgentRuns(root: string): AgentRun[] {
  const dir = join(root, ".agents/state/agent-runs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (file) =>
        file.endsWith(".json") &&
        !file.endsWith(".claim.json") &&
        file !== "_sequence.json",
    )
    .map((file) => {
      try {
        return readAgentRun(root, file.slice(0, -5));
      } catch {
        // A broken latest record must not expose an older success as current.
        throw new Error(`Invalid agent run record: ${join(dir, file)}`);
      }
    })
    .sort((a, b) => a.sequence - b.sequence);
}

export function resultEvidenceValid(
  run: AgentRun,
  requireChecks = true,
): boolean {
  try {
    return (
      run.status === "completed" &&
      run.exitCode === 0 &&
      run.unresolved.length === 0 &&
      run.after === runFingerprint(run) &&
      contractStillCurrent(
        run.artifactRoot,
        run.sessionId,
        run.taskId,
        run.contract,
      ) &&
      (!requireChecks || hasCurrentChecks(run)) &&
      Object.entries(run.artifacts).every(
        ([name, hash]) =>
          digest(readFileSync(artifactPath(run.artifactRoot, name))) === hash,
      )
    );
  } catch {
    return false;
  }
}

export function runFingerprint(run: AgentRun): string {
  return workspaceFingerprint(
    run.contract?.inputs ? run.artifactRoot : run.workspace,
    run.contract?.inputs,
  );
}

export function verifyRequiredChecks(
  root: string,
  runId: string,
): VerificationReceipt[] {
  const run = readAgentRun(root, runId);
  if (!run.contract)
    throw new Error(
      "No task verification contract; declare acceptance_criteria and required_checks in the session plan",
    );
  return run.contract.required_checks.map((check) =>
    verifyAgentRun(
      root,
      runId,
      check.command,
      resolve(run.artifactRoot, check.cwd),
    ),
  );
}
