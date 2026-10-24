import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";
import {
  ownedProcessSpawnOptions,
  stopOwnedProcess,
  stopUnidentifiedOwnedChild,
} from "../../io/owned-process.js";
import type {
  ExecutionOptions,
  SessionExecution,
} from "../../io/session-execution.js";
import {
  forgetSubagentProcess,
  recordSubagentProcess,
  type SubagentProcessRecord,
} from "../../io/subagent-process.js";
import {
  planSessionResume,
  type ResumeTask,
  resumeSession,
} from "../../state/agent-resume.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { beginSessionExecution } from "./common.js";

function dispatchResume(
  task: ResumeTask,
  sessionId: string,
  root: string,
  execution: SessionExecution,
): Promise<number | null> {
  execution.assertActive();
  const entry = process.argv[1];
  if (!entry || !task.prompt)
    throw new Error("Cannot locate the CLI entry or replay prompt");
  const args = [
    resolve(entry),
    "agent",
    "spawn",
    task.agentId,
    task.prompt,
    sessionId,
    "--workspace",
    task.workspace,
    "--task-id",
    task.taskId,
  ];
  if (task.vendor) args.push("--vendor", task.vendor);
  if (task.readOnly) args.push("--read-only");
  if (task.previousRunId) args.push("--resumed-from", task.previousRunId);
  return new Promise((resolve, reject) => {
    execution.assertActive();
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "inherit", "inherit"],
      shell: false,
      ...ownedProcessSpawnOptions(),
      env: execution.childEnv(),
    });
    child.once("error", () => {});
    const pidFile = `${execution.stateFile}.resume-${randomUUID()}.pid`;
    let record: SubagentProcessRecord | undefined;
    try {
      if (child.pid) fs.writeFileSync(pidFile, String(child.pid));
      record = child.pid
        ? recordSubagentProcess(pidFile, child.pid, root, {
            sessionId,
            isolatedProcessGroup: process.platform !== "win32",
          })
        : undefined;
    } catch (error) {
      const stopped = record
        ? stopOwnedProcess(record)
        : stopUnidentifiedOwnedChild(child);
      void stopped.then(() => reject(error), reject);
      return;
    }
    let stopping: Promise<boolean> | undefined;
    const stop = () =>
      (stopping ??= record
        ? stopOwnedProcess(record, { graceMs: 5000 }).then(
            (result) => result.stopped,
          )
        : stopUnidentifiedOwnedChild(child, { graceMs: 5000 }).then(() => {
            console.warn(
              `[resume] Process tree cleanup unverified; retained ${pidFile}`,
            );
            return false;
          }));
    const unregister = execution.onStop(() => {
      void stop();
    });
    let settled = false;
    const finish = async (code: number | null) => {
      if (settled) return;
      settled = true;
      if (await stop()) {
        fs.rmSync(pidFile, { force: true });
        forgetSubagentProcess(pidFile);
      }
      unregister();
      resolve(code);
    };
    child.once("error", () => {
      void finish(null);
    });
    child.once("exit", (code) => {
      void finish(code);
    });
  });
}
export async function resumeAgents(
  sessionId: string,
  options: ExecutionOptions & {
    root?: string;
    dryRun?: boolean;
    maxAttempts?: string;
  },
): Promise<void> {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const maxAttempts = Number(options.maxAttempts ?? 3);
  const execution = options.dryRun
    ? undefined
    : beginSessionExecution(sessionId, root, options);
  try {
    const report = options.dryRun
      ? planSessionResume(root, sessionId, maxAttempts)
      : await resumeSession({
          root,
          sessionId,
          maxAttempts,
          dispatch: (task) => {
            if (!execution) throw new Error("Missing execution budget");
            return dispatchResume(task, sessionId, root, execution);
          },
        });
    console.log(JSON.stringify(report, null, 2));
    if (!options.dryRun && !report.ok) process.exitCode = 1;
    execution?.assertActive();
  } finally {
    execution?.dispose();
  }
}
