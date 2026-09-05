import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import {
  type AgentRun,
  listAgentRuns,
  resultEvidenceValid,
} from "./agent-results.js";
import { atomicWriteJson } from "./events.js";
import { loadTaskContract, sessionPlanPath } from "./task-contract.js";

export interface ResumeTask {
  taskId: string;
  agentId: string;
  workspace: string;
  vendor?: string;
  prompt?: string;
  readOnly?: boolean;
  previousRunId?: string;
  dependsOn: string[];
  status: "reused" | "ready" | "running" | "blocked" | "completed" | "failed";
  reason: string;
}
export interface ResumeReport {
  sessionId: string;
  tasks: ResumeTask[];
  ok: boolean;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
function attempts(run: AgentRun, runs: AgentRun[]): number {
  let count = 1;
  const seen = new Set([run.runId]);
  let parent = run.resumedFrom;
  while (parent) {
    if (seen.has(parent)) throw new Error("Cycle in resume ancestry");
    seen.add(parent);
    const previous = runs.find((candidate) => candidate.runId === parent);
    if (!previous) break;
    count++;
    parent = previous.resumedFrom;
  }
  return count;
}

/** Pure scheduling decision: no subprocesses, record writes, or hidden retries. */
export function planSessionResume(
  root: string,
  sessionId: string,
  maxAttempts = 3,
): ResumeReport {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1)
    throw new Error("max-attempts must be a positive integer");
  const runs = listAgentRuns(root).filter((run) => run.sessionId === sessionId);
  const latest = new Map(runs.map((run) => [run.taskId, run]));
  const path = sessionPlanPath(root, sessionId);
  if (!existsSync(path))
    throw new Error("Resume requires a session plan with task contracts");
  const plan = JSON.parse(readFileSync(path, "utf8")) as {
    tasks?: Array<{
      id: string;
      agent?: string;
      task?: string;
      description?: string;
      workspace?: string;
    }>;
  };
  if (!Array.isArray(plan.tasks) || !plan.tasks.length)
    throw new Error("Resume requires a nonempty task plan");
  const tasks = new Map<string, ResumeTask>();
  for (const definition of plan.tasks) {
    const contract = loadTaskContract(root, sessionId, definition.id);
    const previous = latest.get(definition.id);
    const task: ResumeTask = {
      taskId: definition.id,
      agentId: previous?.agentId ?? definition.agent ?? "",
      workspace:
        previous?.workspace ?? resolve(root, definition.workspace ?? "."),
      vendor: previous?.vendor === "native" ? undefined : previous?.vendor,
      prompt:
        definition.task ?? previous?.dispatch?.prompt ?? definition.description,
      readOnly: previous?.dispatch?.readOnly,
      previousRunId: previous?.runId,
      dependsOn: contract?.dependencies ?? [],
      status: "ready",
      reason: previous
        ? "Previous evidence is missing, stale, or incomplete"
        : "Task has not run",
    };
    if (
      previous?.status === "running" &&
      (!previous.runnerPid || alive(previous.runnerPid))
    ) {
      task.status = "running";
      task.reason =
        "An attempt is still active or has no process liveness evidence";
    } else if (previous && resultEvidenceValid(previous)) {
      task.status = "reused";
      task.reason = "Acceptance evidence and declared inputs remain current";
    } else if (contract?.retry_policy !== "safe") {
      task.status = "blocked";
      task.reason =
        "A current contract with retry_policy=safe is required for automatic execution";
    } else if (!task.prompt || !task.agentId) {
      task.status = "blocked";
      task.reason = "No replayable prompt/agent is recorded in the run or plan";
    } else if (previous && attempts(previous, runs) >= maxAttempts) {
      task.status = "blocked";
      task.reason = "Attempt limit reached";
    }
    tasks.set(task.taskId, task);
  }
  const ordered: ResumeTask[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error("Cycle in task dependencies");
    const task = tasks.get(id);
    if (!task) throw new Error(`Unknown dependency: ${id}`);
    visiting.add(id);
    for (const dependency of task.dependsOn) visit(dependency);
    if (
      task.status === "reused" &&
      task.dependsOn.some((id) => tasks.get(id)?.status !== "reused")
    ) {
      const contract = loadTaskContract(root, sessionId, id);
      const previous = latest.get(id);
      task.status =
        contract?.retry_policy === "safe" &&
        task.prompt &&
        task.agentId &&
        (!previous || attempts(previous, runs) < maxAttempts)
          ? "ready"
          : "blocked";
      task.reason =
        "Dependency evidence changed; dependent work must be verified again";
    }
    if (
      task.status === "ready" &&
      task.dependsOn.some((id) =>
        ["blocked", "running"].includes(tasks.get(id)?.status ?? "blocked"),
      )
    ) {
      task.status = "blocked";
      task.reason = "A dependency is blocked or still running";
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(task);
  };
  for (const id of tasks.keys()) visit(id);
  return {
    sessionId,
    tasks: ordered,
    ok: ordered.every((task) => task.status === "reused"),
  };
}

function acquireResumeLease(root: string, sessionId: string): () => void {
  const file = join(
    root,
    ".agents/state/agent-resume",
    `${sessionId}.lease.json`,
  );
  const token = randomUUID();
  withStateIndexLock(root, () => {
    if (existsSync(file)) {
      const previous = JSON.parse(readFileSync(file, "utf8")) as {
        pid: number;
        host: string;
      };
      if (
        previous.host !== hostname() ||
        !Number.isSafeInteger(previous.pid) ||
        previous.pid <= 0 ||
        alive(previous.pid)
      )
        throw new Error("A resume coordinator already owns this session");
    }
    atomicWriteJson(file, { pid: process.pid, host: hostname(), token });
  });
  return () =>
    withStateIndexLock(root, () => {
      if (
        existsSync(file) &&
        JSON.parse(readFileSync(file, "utf8")).token === token
      )
        unlinkSync(file);
    });
}

export async function resumeSession(args: {
  root: string;
  sessionId: string;
  maxAttempts?: number;
  dispatch: (task: ResumeTask) => Promise<number | null>;
}): Promise<ResumeReport> {
  // Validate identity before constructing lease/checkpoint paths.
  sessionPlanPath(args.root, args.sessionId);
  const release = acquireResumeLease(args.root, args.sessionId);
  try {
    const report = planSessionResume(
      args.root,
      args.sessionId,
      args.maxAttempts,
    );
    const planFile = sessionPlanPath(args.root, args.sessionId);
    const pinnedPlan = readFileSync(planFile, "utf8");
    const checkpoint = join(
      args.root,
      ".agents/state/agent-resume",
      `${args.sessionId}.json`,
    );
    atomicWriteJson(checkpoint, report);
    for (const task of report.tasks) {
      if (task.status !== "ready") continue;
      if (readFileSync(planFile, "utf8") !== pinnedPlan) {
        task.status = "blocked";
        task.reason =
          "Plan changed during resume; review the new plan before retrying";
        atomicWriteJson(checkpoint, report);
        continue;
      }
      if (
        task.dependsOn.some(
          (id) =>
            !["reused", "completed"].includes(
              report.tasks.find((candidate) => candidate.taskId === id)
                ?.status ?? "",
            ),
        )
      ) {
        task.status = "blocked";
        task.reason = "A dependency is incomplete";
      } else {
        const code = await args.dispatch(task);
        const latest = listAgentRuns(args.root)
          .filter(
            (run) =>
              run.sessionId === args.sessionId && run.taskId === task.taskId,
          )
          .at(-1);
        if (
          code === 0 &&
          latest &&
          latest.runId !== task.previousRunId &&
          resultEvidenceValid(latest)
        ) {
          task.status = "completed";
          task.reason = "New acceptance evidence recorded";
        } else {
          task.status = "failed";
          task.reason = "Retry did not produce new valid acceptance evidence";
        }
      }
      atomicWriteJson(checkpoint, report);
    }
    // A later task can change an earlier task's inputs. Never report a reused
    // receipt as current merely because it was valid before the retry loop.
    const finalRuns = new Map(
      listAgentRuns(args.root)
        .filter((run) => run.sessionId === args.sessionId)
        .map((run) => [run.taskId, run]),
    );
    const planChanged = readFileSync(planFile, "utf8") !== pinnedPlan;
    for (const task of report.tasks) {
      if (!["reused", "completed"].includes(task.status)) continue;
      const run = finalRuns.get(task.taskId);
      if (
        planChanged ||
        !run ||
        !resultEvidenceValid(run) ||
        task.dependsOn.some(
          (id) =>
            !["reused", "completed"].includes(
              report.tasks.find((candidate) => candidate.taskId === id)
                ?.status ?? "",
            ),
        )
      ) {
        task.status = "blocked";
        task.reason =
          "Evidence or dependencies changed during resume; new verification is required";
      }
    }
    report.ok = report.tasks.every((task) =>
      ["reused", "completed"].includes(task.status),
    );
    atomicWriteJson(checkpoint, report);
    return report;
  } finally {
    release();
  }
}
