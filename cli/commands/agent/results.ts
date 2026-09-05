import { readFileSync } from "node:fs";
import {
  beginAgentRun,
  claimPath,
  finishAgentRun,
  readAgentRun,
  verifyAgentRun,
  verifyRequiredChecks,
} from "../../state/agent-results.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { buildGraph, selectGraph } from "../../utils/graph.js";

export function beginResult(
  agentId: string,
  taskId: string,
  sessionId: string,
  options: { root?: string; workspace?: string },
): void {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const run = beginAgentRun({
    root,
    workspace: options.workspace ?? root,
    agentId,
    taskId,
    sessionId,
    vendor: "native",
  });
  console.log(
    JSON.stringify({ ...run, claimPath: claimPath(root, run.runId) }, null, 2),
  );
}
export function verifyResult(
  runId: string,
  command: string[],
  options: { root?: string; required?: boolean; affected?: string[] },
): void {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  if (
    [
      Boolean(command.length),
      Boolean(options.required),
      Boolean(options.affected),
    ].filter(Boolean).length !== 1
  )
    throw new Error("Choose a command, --required, or --affected");
  const selected = options.affected
    ? selectGraph(buildGraph(root), options.affected, "dependents")
    : null;
  if (selected && (selected.unmatched.length || !selected.checks.length))
    throw new Error(
      `No complete test selection for affected paths: ${selected.unmatched.join(", ") || "no declared test references"}`,
    );
  const receipts = options.required
    ? verifyRequiredChecks(root, runId)
    : selected
      ? selected.checks.map((argv) => verifyAgentRun(root, runId, argv, root))
      : [verifyAgentRun(root, runId, command)];
  console.log(
    JSON.stringify(
      options.required || selected ? receipts : receipts[0],
      null,
      2,
    ),
  );
  if (
    receipts.some(
      (receipt) => receipt.exitCode !== 0 || receipt.before !== receipt.after,
    )
  )
    process.exitCode = 1;
}
export function finishResult(
  runId: string,
  resultFile: string,
  options: { root?: string },
): void {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  if (readAgentRun(root, runId).runnerPid)
    throw new Error(
      "The spawning parent finalizes managed runs; write the claim file instead",
    );
  const run = finishAgentRun(
    root,
    runId,
    0,
    JSON.parse(readFileSync(resultFile, "utf8")),
  );
  console.log(JSON.stringify(run, null, 2));
  if (run.status !== "completed") process.exitCode = 1;
}
