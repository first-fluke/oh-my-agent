import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  planSessionResume,
  type ResumeTask,
  resumeSession,
} from "../../state/agent-resume.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

function dispatchResume(
  task: ResumeTask,
  sessionId: string,
  root: string,
): Promise<number | null> {
  const entry = process.argv[1];
  if (!entry || !task.prompt)
    throw new Error("Cannot locate the CLI entry or replay prompt");
  const args = [
    resolve(entry),
    "agent:spawn",
    task.agentId,
    task.prompt,
    sessionId,
    "--workspace",
    task.workspace,
    "--task-id",
    task.taskId,
  ];
  if (task.vendor) args.push("--model", task.vendor);
  if (task.readOnly) args.push("--read-only");
  if (task.previousRunId) args.push("--resumed-from", task.previousRunId);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "inherit", "inherit"],
      shell: false,
    });
    child.once("error", () => resolve(null));
    child.once("exit", (code) => resolve(code));
  });
}
export async function resumeAgents(
  sessionId: string,
  options: { root?: string; dryRun?: boolean; maxAttempts?: string },
): Promise<void> {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const maxAttempts = Number(options.maxAttempts ?? 3);
  const report = options.dryRun
    ? planSessionResume(root, sessionId, maxAttempts)
    : await resumeSession({
        root,
        sessionId,
        maxAttempts,
        dispatch: (task) => dispatchResume(task, sessionId, root),
      });
  console.log(JSON.stringify(report, null, 2));
  if (!options.dryRun && !report.ok) process.exitCode = 1;
}
