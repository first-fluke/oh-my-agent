import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import {
  classifyRunFailure,
  evidenceFailureHandoff,
  goalRuns,
  listAgentRuns,
  resultEvidenceValid,
} from "./agent-results.js";
import { atomicWriteJson } from "./events.js";
import { runtimeStateDir } from "./project-runtime.js";
import {
  loadSessionPlanSnapshot,
  type SessionPlanSnapshot,
  sessionPlanPath,
} from "./task-contract.js";

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
/** Derived from plans and run evidence; persisted reports are never recovery input. */
export interface ResumeProgressReport {
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
/** Pure scheduling decision: no subprocesses, record writes, or hidden retries. */
export function planSessionResume(
  root: string,
  sessionId: string,
  maxAttempts = 3,
): ResumeProgressReport {
  const snapshot = loadSessionPlanSnapshot(root, sessionId);
  if (!snapshot)
    throw new Error("Resume requires a session plan with task contracts");
  return scheduleSessionResume(root, sessionId, maxAttempts, snapshot);
}

function scheduleSessionResume(
  root: string,
  sessionId: string,
  maxAttempts: number,
  snapshot: SessionPlanSnapshot,
): ResumeProgressReport {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1)
    throw new Error("max-attempts must be a positive integer");
  const runs = listAgentRuns(root);
  const latest = new Map(
    runs
      .filter((run) => run.sessionId === sessionId)
      .map((run) => [run.taskId, run]),
  );
  const plan = snapshot.plan;
  const lineageId = plan.lineage_id ?? sessionId;
  maxAttempts = Math.min(maxAttempts, plan.max_attempts);
  if (!plan.tasks.length)
    throw new Error("Resume requires a nonempty task plan");
  const tasks = new Map<string, ResumeTask>();
  for (const definition of plan.tasks) {
    const contract = snapshot.taskContract(definition.id);
    const previous = latest.get(definition.id);
    const history = goalRuns(
      runs,
      lineageId,
      contract?.goal_id ?? definition.id,
    );
    const lastGoalRun = history.at(-1);
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
    } else if (
      lastGoalRun &&
      classifyRunFailure(lastGoalRun) === "WORKFLOW_EVIDENCE_FAILURE"
    ) {
      task.status = "blocked";
      task.reason = evidenceFailureHandoff(lastGoalRun);
    } else if (contract?.retry_policy !== "safe") {
      task.status = "blocked";
      task.reason =
        "A current contract with retry_policy=safe is required for automatic execution";
    } else if (!task.prompt || !task.agentId) {
      task.status = "blocked";
      task.reason = "No replayable prompt/agent is recorded in the run or plan";
    } else if (history.length >= maxAttempts) {
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
      const contract = snapshot.taskContract(id);
      task.status =
        contract?.retry_policy === "safe" &&
        task.prompt &&
        task.agentId &&
        goalRuns(runs, lineageId, contract?.goal_id ?? id).length < maxAttempts
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
    runtimeStateDir(root, "agent-resume"),
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
    mkdirSync(runtimeStateDir(root, "agent-resume"), {
      recursive: true,
      mode: 0o700,
    });
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
}): Promise<ResumeProgressReport> {
  // Validate identity before constructing lease/progress report paths.
  sessionPlanPath(args.root, args.sessionId);
  const release = acquireResumeLease(args.root, args.sessionId);
  try {
    const snapshot = loadSessionPlanSnapshot(args.root, args.sessionId);
    if (!snapshot)
      throw new Error("Resume requires a session plan with task contracts");
    const report = scheduleSessionResume(
      args.root,
      args.sessionId,
      args.maxAttempts ?? 3,
      snapshot,
    );
    const plan = snapshot.plan;
    // This file reports progress for inspection. Each invocation recomputes
    // scheduling from the validated plan and run evidence instead of reading it.
    const progressReportPath = join(
      runtimeStateDir(args.root, "agent-resume"),
      `${args.sessionId}.json`,
    );
    atomicWriteJson(progressReportPath, report);
    for (const task of report.tasks) {
      if (task.status !== "ready") continue;
      if (!snapshot.isCurrent()) {
        task.status = "blocked";
        task.reason =
          "Plan changed during resume; review the new plan before retrying";
        atomicWriteJson(progressReportPath, report);
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
        // A prior dispatch can consume the shared goal budget of a different
        // task ID. Recheck before every dispatch, not just when scheduling.
        const goalId =
          plan.tasks.find((definition) => definition.id === task.taskId)
            ?.goal_id ?? task.taskId;
        const history = goalRuns(
          listAgentRuns(args.root),
          plan.lineage_id ?? args.sessionId,
          goalId,
        );
        const previous = history.at(-1);
        const evidenceFailure =
          previous &&
          classifyRunFailure(previous) === "WORKFLOW_EVIDENCE_FAILURE";
        if (
          history.length >=
            Math.min(args.maxAttempts ?? 3, plan.max_attempts) ||
          evidenceFailure
        ) {
          task.status = "blocked";
          task.reason = evidenceFailure
            ? evidenceFailureHandoff(previous)
            : "Attempt limit reached";
          atomicWriteJson(progressReportPath, report);
          continue;
        }
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
      atomicWriteJson(progressReportPath, report);
    }
    // A later task can change an earlier task's inputs. Never report a reused
    // receipt as current merely because it was valid before the retry loop.
    const finalRuns = new Map(
      listAgentRuns(args.root)
        .filter((run) => run.sessionId === args.sessionId)
        .map((run) => [run.taskId, run]),
    );
    const planChanged = !snapshot.isCurrent();
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
    atomicWriteJson(progressReportPath, report);
    return report;
  } finally {
    release();
  }
}
