import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256Hex } from "../../utils/hash.js";
import {
  resolveDispatchResult,
  sumUsage,
  UNKNOWN_USAGE,
} from "../skills/eval/envelope.js";
import { evaluateChecks } from "./checks.js";
import { HARNESS_STDERR_LIMIT } from "./dispatch.js";
import {
  captureHarnessSnapshot,
  type HarnessWorkspaceSnapshot,
  harnessTaskInputHash,
  materializeHarnessSnapshot,
} from "./evidence.js";
import { applyCandidateOverlay } from "./overlay.js";
import {
  computeBaselineHash,
  computeEvaluatorHash,
  computeSuiteHash,
} from "./provenance.js";
import { scoreHarnessRuns } from "./scoring.js";
import { selectHarnessTasks } from "./suite.js";
import {
  assertTrustedCheckerIntegrity,
  snapshotTrustedCheckers,
  type TrustedCheckers,
} from "./trusted-checks.js";
import type {
  CandidateOverlayManifest,
  HarnessArmDiagnostics,
  HarnessArmRun,
  HarnessArmTrace,
  HarnessCheckResult,
  HarnessDispatchFn,
  HarnessEvaluation,
  HarnessPartition,
  HarnessSuite,
  HarnessTask,
  HarnessTraceObserver,
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
  partition?: HarnessPartition;
  materializeVendor?: (workspace: string, vendor: string) => void;
  initialSnapshots?: ReadonlyMap<string, HarnessWorkspaceSnapshot>;
  /** Links every arm trace to one evaluation; defaults to the input hashes. */
  causalityKey?: string;
  observer?: HarnessTraceObserver;
}

const CHANGED_PATH_LIMIT = 200;

function diagnosticOutput(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 3; depth++) {
    if (!current || typeof current !== "object") return "";
    const failure = current as {
      stdout?: unknown;
      output?: unknown;
      cause?: unknown;
    };
    if (typeof failure.output === "string") return failure.output;
    if (typeof failure.stdout === "string") return failure.stdout;
    if (Buffer.isBuffer(failure.stdout))
      return failure.stdout.toString("utf-8");
    current = failure.cause;
  }
  return "";
}

/** Process remains found on the error or its causes; absence is explicit. */
function diagnosticsFromError(error: unknown): HarnessArmDiagnostics {
  let stderr: string | undefined;
  let stderrTruncated = false;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let timedOut = false;
  let current = error;
  for (
    let depth = 0;
    depth < 3 && current && typeof current === "object";
    depth++
  ) {
    const failure = current as {
      stderr?: unknown;
      stderrTruncated?: unknown;
      exitCode?: unknown;
      status?: unknown;
      signal?: unknown;
      timedOut?: unknown;
      killed?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    if (stderr === undefined) {
      if (typeof failure.stderr === "string") stderr = failure.stderr;
      else if (Buffer.isBuffer(failure.stderr))
        stderr = failure.stderr.toString("utf-8");
      if (stderr !== undefined && failure.stderrTruncated === true)
        stderrTruncated = true;
    }
    if (exitCode === null) {
      if (typeof failure.exitCode === "number") exitCode = failure.exitCode;
      else if (typeof failure.status === "number") exitCode = failure.status;
    }
    if (signal === null && typeof failure.signal === "string")
      signal = failure.signal;
    if (
      failure.timedOut === true ||
      failure.killed === true ||
      failure.code === "ETIMEDOUT"
    )
      timedOut = true;
    current = failure.cause;
  }
  if (stderr !== undefined && stderr.length > HARNESS_STDERR_LIMIT) {
    stderr = stderr.slice(-HARNESS_STDERR_LIMIT);
    stderrTruncated = true;
  }
  return {
    exitCode,
    signal,
    timedOut,
    stderr: stderr ?? "",
    stderrStatus:
      stderr === undefined
        ? "unavailable"
        : stderrTruncated
          ? "truncated"
          : "captured",
  };
}

function changedPaths(
  initial: HarnessWorkspaceSnapshot,
  final: HarnessWorkspaceSnapshot,
): { paths: string[]; truncated: boolean } {
  const excluded = (path: string): boolean =>
    final.excludedPaths.some(
      (control) => path === control || path.startsWith(`${control}/`),
    );
  const digest = (snapshot: HarnessWorkspaceSnapshot): Map<string, string> =>
    new Map(
      snapshot.entries
        .filter((entry) => entry.kind === "file" && !excluded(entry.path))
        .map((entry) => [
          entry.path,
          entry.sha256 ?? entry.contentBase64 ?? "",
        ]),
    );
  const before = digest(initial);
  const after = digest(final);
  const changed = new Set<string>();
  for (const [path, hash] of after)
    if (before.get(path) !== hash) changed.add(path);
  for (const path of before.keys()) if (!after.has(path)) changed.add(path);
  const paths = [...changed].sort();
  return {
    paths: paths.slice(0, CHANGED_PATH_LIMIT),
    truncated: paths.length > CHANGED_PATH_LIMIT,
  };
}

function runArm(
  options: RunHarnessLiveOptions,
  task: HarnessTask,
  arm: "baseline" | "candidate",
  checkers: TrustedCheckers,
  suiteSourceHash: string,
  initialWorkspace: HarnessWorkspaceSnapshot,
  causalityKey: string,
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
    let diagnostics: HarnessArmDiagnostics = {
      exitCode: null,
      signal: null,
      timedOut: false,
      stderr: "",
      stderrStatus: "unavailable",
    };
    let outputStatus: HarnessArmTrace["output"] = "complete";
    let usage = UNKNOWN_USAGE;
    try {
      const result = resolveDispatchResult(
        options.dispatch({
          agent: options.suite.agent,
          arm,
          prompt: task.prompt,
          workspace,
        }),
      );
      output = result.output;
      usage = result.usage;
    } catch (error) {
      dispatchError = error instanceof Error ? error.message : String(error);
      output = diagnosticOutput(error);
      diagnostics = diagnosticsFromError(error);
      outputStatus = output ? "partial" : "unavailable";
    }
    const durationMs = Math.round(performance.now() - started);
    try {
      if (computeBaselineHash(workspace) !== protectedHarnessHash)
        throw new Error("Agent modified protected harness definitions");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatchError = dispatchError ? `${dispatchError}; ${message}` : message;
    }
    try {
      assertTrustedCheckerIntegrity(checkers);
      if (
        sha256Hex(readFileSync(options.suite.sourcePath)) !== suiteSourceHash
      ) {
        throw new Error("Trusted evaluator suite changed during evaluation");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatchError = dispatchError ? `${dispatchError}; ${message}` : message;
    }
    // Preserve final task artifacts before any checker or workspace cleanup.
    const artifacts = captureHarnessSnapshot(workspace);
    let checks: HarnessCheckResult[] = [];
    try {
      checks = evaluateChecks(workspace, output, task.checks, checkers);
    } catch (error) {
      const message = `Current checks could not complete: ${error instanceof Error ? error.message : String(error)}`;
      dispatchError = dispatchError ? `${dispatchError}; ${message}` : message;
    }
    const changes = changedPaths(initialWorkspace, artifacts);
    const run: HarnessArmRun = {
      taskId: task.id,
      incident: task.incident,
      evidence: {
        schemaVersion: 1,
        taskPromptHash: harnessTaskInputHash(task),
        outputHash: sha256Hex(output),
        initialWorkspace,
        artifacts,
        checkerReferences: task.checks.map((check) => {
          const checker = checkers.get(JSON.stringify(check));
          return {
            check,
            ...(checker
              ? {
                  checkerHash: checker.hash,
                  executableHash: checker.executableHash,
                }
              : {}),
          };
        }),
      },
      arm,
      passed:
        dispatchError === undefined && checks.every((check) => check.passed),
      durationMs,
      output,
      checks,
      dispatchError,
      diagnostics,
      ...(usage.status === "actual" ? { usage } : {}),
      trace: {
        schemaVersion: 1,
        causalityKey,
        output: outputStatus,
        stderr: diagnostics.stderrStatus,
        artifacts: artifacts.complete ? "complete" : "insufficient",
        toolCalls: "unsupported",
        changedPaths: changes.paths,
        changedPathsTruncated: changes.truncated,
      },
    };
    options.observer?.({ kind: "arm.completed", run });
    return run;
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

export function runHarnessLive(
  options: RunHarnessLiveOptions,
): HarnessEvaluation {
  const pinnedDirectories: string[] = [];
  try {
    const suite = structuredClone(options.suite);
    const initialSnapshots = new Map<string, HarnessWorkspaceSnapshot>();
    for (const task of selectHarnessTasks(suite, options.partition)) {
      const snapshot =
        options.initialSnapshots?.get(task.id) ??
        captureHarnessSnapshot(task.workspace, {
          excludeHarnessControls: false,
        });
      if (options.initialSnapshots && !options.initialSnapshots.has(task.id))
        throw new Error(`Pinned initial workspace missing for ${task.id}`);
      initialSnapshots.set(task.id, snapshot);
      if (!snapshot.complete && !options.initialSnapshots) continue;
      const directory = mkdtempSync(join(tmpdir(), "oma-harness-initial-"));
      pinnedDirectories.push(directory);
      materializeHarnessSnapshot(snapshot, directory);
      task.workspace = directory;
    }
    const result = executeHarnessLive({ ...options, suite, initialSnapshots });
    result.executionMode = options.initialSnapshots ? "rerun" : "live";
    return result;
  } finally {
    for (const directory of pinnedDirectories)
      rmSync(directory, { recursive: true, force: true });
  }
}

function executeHarnessLive(options: RunHarnessLiveOptions): HarnessEvaluation {
  // Dispatch receives only task prompt/workspace. Definitions and trusted bytes
  // stay in the runner; cloning prevents caller-owned objects changing a judge.
  const frozenSuite = structuredClone(options.suite);
  const freeze = (value: object): void => {
    for (const child of Object.values(value))
      if (child && typeof child === "object") freeze(child);
    Object.freeze(value);
  };
  freeze(frozenSuite);
  const execution = { ...options, suite: frozenSuite };
  const tasks = selectHarnessTasks(frozenSuite, options.partition);
  const checkers = snapshotTrustedCheckers(
    frozenSuite,
    options.projectRoot,
    options.candidate,
  );
  const suiteHash = computeSuiteHash(frozenSuite);
  const baselineHash = computeBaselineHash(options.projectRoot);
  const evaluatorHash = computeEvaluatorHash(frozenSuite, checkers);
  const suiteSourceHash = sha256Hex(readFileSync(frozenSuite.sourcePath));
  const initialSnapshots = new Map(
    tasks.map((task) => [
      task.id,
      options.initialSnapshots?.get(task.id) ??
        captureHarnessSnapshot(task.workspace, {
          excludeHarnessControls: false,
        }),
    ]),
  );
  const causalityKey =
    options.causalityKey ??
    `harness:${suiteHash.slice(0, 12)}:${options.candidate.hash.slice(0, 12)}`;
  const runs = tasks.flatMap((task) => {
    const snapshot = initialSnapshots.get(task.id);
    if (!snapshot)
      throw new Error(`Initial workspace evidence missing for ${task.id}`);
    return (["baseline", "candidate"] as const).map((arm) =>
      runArm(
        execution,
        task,
        arm,
        checkers,
        suiteSourceHash,
        snapshot,
        `${causalityKey}:${task.id}:${arm}`,
      ),
    );
  });
  return {
    suiteId: frozenSuite.id,
    suiteHash,
    baselineHash,
    candidateHash: options.candidate.hash,
    vendor: options.vendor,
    executionMode: options.initialSnapshots ? "rerun" : "live",
    evidenceStatus: runs.every(
      (run) =>
        !run.dispatchError &&
        run.evidence?.initialWorkspace.complete &&
        run.evidence.artifacts.complete,
    )
      ? "complete"
      : "insufficient",
    replayLimitations: [
      "Live dispatch does not capture external service state or guarantee deterministic agent behavior",
    ],
    runs,
    score: scoreHarnessRuns(tasks, runs),
    usage: sumUsage(runs.map((run) => run.usage ?? UNKNOWN_USAGE)),
    ...harnessEvaluationTrust(frozenSuite, options.partition, evaluatorHash),
  };
}

export function harnessEvaluationTrust(
  suite: HarnessSuite,
  partition: HarnessPartition = "validation",
  evaluatorHash: string,
) {
  return {
    partition: suite.schemaVersion === 1 ? ("exploratory" as const) : partition,
    evaluatorHash,
    promotionReady: false as const,
    promotionBlockers: [
      ...(suite.schemaVersion === 1
        ? ["Legacy suite has no held-out final-test partition"]
        : partition === "validation"
          ? [
              "Validation results are for candidate selection; run final-test separately",
            ]
          : []),
      "Dispatch does not attest filesystem access confinement; protected final evaluation is not established",
    ],
  };
}
