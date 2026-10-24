import { readFileSync } from "node:fs";
import {
  type ExecutionOptions,
  ExecutionStoppedError,
} from "../../io/session-execution.js";
import {
  beginAgentRun,
  claimPath,
  finishAgentRun,
  readAgentRun,
  verifyAgentRunAsync,
  verifyRequiredChecksAsync,
} from "../../state/agent-results.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { buildGraph, selectGraph } from "../../utils/graph.js";
import { beginSessionExecution } from "./common.js";

export function beginResult(
  agentId: string,
  taskId: string,
  sessionId: string,
  options: ExecutionOptions & { root?: string; workspace?: string },
): void {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const execution = beginSessionExecution(sessionId, root, options);
  try {
    execution.assertActive();
    const run = beginAgentRun({
      root,
      workspace: options.workspace ?? root,
      agentId,
      taskId,
      sessionId,
      vendor: "native",
    });
    console.log(
      JSON.stringify(
        { ...run, claimPath: claimPath(root, run.runId) },
        null,
        2,
      ),
    );
  } finally {
    execution.dispose();
  }
}
export async function verifyResult(
  runId: string,
  command: string[],
  options: ExecutionOptions & {
    root?: string;
    required?: boolean;
    affected?: string[];
  },
): Promise<void> {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const execution = beginSessionExecution(
    readAgentRun(root, runId).sessionId,
    root,
    options,
  );
  try {
    execution.assertActive();
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
      ? await verifyRequiredChecksAsync(root, runId, execution)
      : selected
        ? await (async () => {
            const receipts = [];
            for (const argv of selected.checks)
              receipts.push(
                await verifyAgentRunAsync(root, runId, argv, root, execution),
              );
            return receipts;
          })()
        : [
            await verifyAgentRunAsync(
              root,
              runId,
              command,
              undefined,
              execution,
            ),
          ];
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
  } catch (error) {
    if (error instanceof ExecutionStoppedError)
      finishAgentRun(root, runId, error.exitCode, undefined, {
        stopReason: error.reason,
      });
    throw error;
  } finally {
    execution.dispose();
  }
}
export function finishResult(
  runId: string,
  resultFile: string,
  options: { root?: string },
): void {
  const root = options.root ?? resolveProjectRoot(process.cwd());
  const execution = beginSessionExecution(
    readAgentRun(root, runId).sessionId,
    root,
  );
  try {
    execution.assertActive();
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
  } finally {
    execution.dispose();
  }
}
