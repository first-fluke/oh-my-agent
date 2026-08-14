import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateChecks } from "./checks.js";
import { applyCandidateOverlay } from "./overlay.js";
import { computeBaselineHash, computeSuiteHash } from "./provenance.js";
import { scoreHarnessRuns } from "./scoring.js";
import type {
  CandidateOverlayManifest,
  HarnessArmRun,
  HarnessDispatchFn,
  HarnessEvaluation,
  HarnessSuite,
  HarnessTask,
} from "./types.js";
import {
  materializeVendorHarness,
  seedEvaluationWorkspace,
} from "./workspace.js";

export interface RunHarnessLiveOptions {
  projectRoot: string;
  suite: HarnessSuite;
  candidate: CandidateOverlayManifest;
  vendor: string;
  dispatch: HarnessDispatchFn;
  materializeVendor?: (workspace: string, vendor: string) => void;
}

function runArm(
  options: RunHarnessLiveOptions,
  task: HarnessTask,
  arm: "baseline" | "candidate",
): HarnessArmRun {
  const workspace = mkdtempSync(join(tmpdir(), `oma-harness-${arm}-`));
  try {
    seedEvaluationWorkspace(options.projectRoot, task.workspace, workspace);
    if (arm === "candidate") {
      applyCandidateOverlay(options.candidate, workspace);
    }
    (options.materializeVendor ?? materializeVendorHarness)(
      workspace,
      options.vendor,
    );
    const protectedHarnessHash = computeBaselineHash(workspace);
    const started = performance.now();
    let output = "";
    let dispatchError: string | undefined;
    try {
      output = options.dispatch({
        agent: options.suite.agent,
        arm,
        prompt: task.prompt,
        workspace,
      });
    } catch (error) {
      dispatchError = error instanceof Error ? error.message : String(error);
    }
    const durationMs = Math.round(performance.now() - started);
    if (computeBaselineHash(workspace) !== protectedHarnessHash) {
      const mutationError = "Agent modified protected harness definitions";
      dispatchError = dispatchError
        ? `${dispatchError}; ${mutationError}`
        : mutationError;
    }
    const checks = evaluateChecks(workspace, output, task.checks);
    return {
      taskId: task.id,
      arm,
      passed:
        dispatchError === undefined && checks.every((check) => check.passed),
      durationMs,
      output,
      checks,
      dispatchError,
    };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

export function runHarnessLive(
  options: RunHarnessLiveOptions,
): HarnessEvaluation {
  const runs = options.suite.tasks.flatMap((task) => [
    runArm(options, task, "baseline"),
    runArm(options, task, "candidate"),
  ]);
  return {
    suiteId: options.suite.id,
    suiteHash: computeSuiteHash(options.suite),
    baselineHash: computeBaselineHash(options.projectRoot),
    candidateHash: options.candidate.hash,
    vendor: options.vendor,
    runs,
    score: scoreHarnessRuns(options.suite.tasks, runs),
  };
}
