import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { CLI_SKILLS_DIR } from "../../constants/index.js";
import { resolveVendor } from "../../platform/agent-config.js";
import { emitEvent } from "../../state/events.js";
import { buildHarnessDispatch } from "./dispatch.js";
import {
  type CliVersionProbe,
  type HarnessExecutionManifest,
  harnessManifestDifferences,
  probeCliVersion,
  resolveHarnessExecutionManifest,
} from "./execution.js";
import { validateCandidateOverlay } from "./overlay.js";
import { assertExistingPathInside, isPathInside } from "./paths.js";
import {
  computeBaselineHash,
  computeEvaluatorHash,
  computeSuiteHash,
} from "./provenance.js";
import {
  inspectHarnessRecord,
  loadHarnessRecord,
  writeHarnessRecord,
} from "./records.js";
import {
  fixtureReplayHarnessRecord,
  type HarnessFixtureTranscript,
  initialSnapshotsFromHarnessRecord,
  loadHarnessFixtureTranscripts,
  rescoreHarnessRecord,
  scoreHarnessReplay,
} from "./replay.js";
import {
  renderHarnessEvaluation,
  serializeHarnessEvaluation,
} from "./report.js";
import { harnessEvaluationTrust, runHarnessLive } from "./runner.js";
import { scoreHarnessRuns } from "./scoring.js";
import { loadHarnessSuite, selectHarnessTasks } from "./suite.js";
import { snapshotTrustedCheckers } from "./trusted-checks.js";
import type {
  HarnessDispatchFn,
  HarnessEvaluation,
  HarnessPartition,
  HarnessReplayAction,
} from "./types.js";

export interface HarnessEvalOptions {
  suite: string;
  candidate: string;
  partition?: HarnessPartition;
  live?: boolean;
  action?: HarnessReplayAction;
  transcriptFile?: string;
  mock?: boolean;
  record?: boolean;
  recordFile?: string;
  yes?: boolean;
  requireCoverage?: boolean;
  timeoutMinutes?: number;
  _projectRoot?: string;
  _dispatch?: HarnessDispatchFn;
  _vendor?: string;
  _materializeVendor?: (workspace: string, vendor: string) => void;
  _confirm?: () => Promise<boolean>;
  _sourceLimitations?: string[];
  /** Replace or disable the `<cli> --version` probe (tests, offline use). */
  _probeVersion?: CliVersionProbe | false;
}

function applyConditionDifferences(
  evaluation: HarnessEvaluation,
  recorded: HarnessExecutionManifest | undefined,
  current: HarnessExecutionManifest,
): void {
  const differences = harnessManifestDifferences(recorded, current);
  if (differences.length === 0) return;
  const limitation = recorded
    ? `Recorded conditions differ from current: ${differences.join("; ")}`
    : (differences[0] ?? "");
  evaluation.replayLimitations = [
    ...(evaluation.replayLimitations ?? []),
    limitation,
  ];
  evaluation.promotionBlockers = [...evaluation.promotionBlockers, limitation];
}

function confirmRun(): Promise<boolean> {
  return new Promise((resolveConfirmation) => {
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    input.question("Proceed? [y/N] ", (answer) => {
      input.close();
      resolveConfirmation(answer.trim().toLowerCase() === "y");
    });
  });
}

function recordPath(
  suitePath: string,
  suiteId: string,
  baselineHash: string,
  candidateHash: string,
  partition: string,
): string {
  return join(
    dirname(suitePath),
    "_runs",
    `${suiteId}-${partition}-${baselineHash.slice(0, 12)}-${candidateHash.slice(0, 12)}.json`,
  );
}

function assertRecordPath(path: string, projectRoot: string): void {
  if (!isPathInside(projectRoot, path)) {
    throw new Error("Harness record file must be inside the project root");
  }
}

export async function runHarnessEval(
  jsonMode: boolean,
  options: HarnessEvalOptions,
): Promise<HarnessEvaluation | undefined> {
  const info = (message: string): void => {
    if (jsonMode) console.error(message);
    else console.log(message);
  };
  if (options.live && options.mock)
    throw new Error("Choose either --live or --mock");
  if (
    options.action !== undefined &&
    !["inspect", "rescore", "fixture-replay", "rerun"].includes(options.action)
  )
    throw new Error(
      "Unknown harness action; choose inspect, rescore, fixture-replay, or rerun",
    );
  const action = options.action ?? (options.live ? "live" : "inspect");
  const live = action === "live" || action === "rerun";
  if (options.live && !live)
    throw new Error("--live conflicts with a recorded-evidence action");
  if (options.mock && action !== "inspect")
    throw new Error("--mock is an alias for --action inspect");
  if (options.record && !live)
    throw new Error("--record requires --live or --action rerun");
  if (options.transcriptFile && action !== "fixture-replay")
    throw new Error("--transcript requires --action fixture-replay");
  if (action === "fixture-replay" && !options.transcriptFile)
    throw new Error("--action fixture-replay requires --transcript");
  const projectRoot = resolve(options._projectRoot ?? process.cwd());
  const suite = loadHarnessSuite(options.suite, projectRoot);
  const tasks = selectHarnessTasks(suite, options.partition);
  const candidate = validateCandidateOverlay(options.candidate, projectRoot);
  if (
    candidate.root === projectRoot ||
    isPathInside(join(projectRoot, ".agents"), candidate.root)
  ) {
    throw new Error(
      "Candidate overlay must be stored separately from the baseline .agents tree",
    );
  }
  for (const task of suite.tasks) {
    if (
      isPathInside(task.workspace, candidate.root) ||
      isPathInside(candidate.root, task.workspace)
    ) {
      throw new Error(
        `Candidate overlay must be separate from fixture workspace ${task.id}`,
      );
    }
  }
  const baselineHash = computeBaselineHash(projectRoot);
  const suiteHash = computeSuiteHash(suite);
  const checkers = snapshotTrustedCheckers(suite, projectRoot, candidate);
  const evaluatorHash = computeEvaluatorHash(suite, checkers);
  const trust = harnessEvaluationTrust(suite, options.partition, evaluatorHash);
  const resolvedRecordPath = resolve(
    projectRoot,
    options.recordFile ??
      recordPath(
        suite.sourcePath,
        suite.id,
        baselineHash,
        candidate.hash,
        trust.partition,
      ),
  );
  assertRecordPath(resolvedRecordPath, projectRoot);
  assertExistingPathInside(
    projectRoot,
    resolvedRecordPath,
    "Harness record path",
  );
  const recordExclusions = [
    candidate.root,
    ...suite.tasks.map((task) => task.workspace),
    ...["agents", "config", "rules", "skills", "workflows"].map((name) =>
      join(projectRoot, ".agents", name),
    ),
    join(projectRoot, ".agents", "oma-config.yaml"),
    suite.sourcePath,
    ...[...checkers.values()].map((checker) => checker.sourcePath),
  ];
  if (recordExclusions.some((path) => isPathInside(path, resolvedRecordPath))) {
    throw new Error(
      "Harness recording must be separate from candidate, fixture, and evaluator inputs",
    );
  }

  const resolvedVendor = options._vendor ? null : resolveVendor(suite.agent);
  const vendor = options._vendor ?? resolvedVendor?.vendor ?? "";
  const vendorConfig = resolvedVendor?.config?.vendors?.[vendor] ?? {};

  let evaluation: HarnessEvaluation;
  const record =
    action === "live"
      ? undefined
      : (() => {
          if (!existsSync(resolvedRecordPath))
            throw new Error(
              `No matching harness recording found: ${resolvedRecordPath}. Run --live --record first.`,
            );
          return inspectHarnessRecord(resolvedRecordPath);
        })();
  const initialSnapshots =
    action === "rerun"
      ? initialSnapshotsFromHarnessRecord(
          record ?? resolvedRecordPath,
          tasks,
          suite.id,
        )
      : undefined;
  if (!live) {
    if (!record) throw new Error("Harness recording is missing");
    if (action === "inspect") {
      const runs = loadHarnessRecord(resolvedRecordPath, {
        suiteHash,
        baselineHash,
        candidateHash: candidate.hash,
        partition: trust.partition,
        evaluatorHash,
      });
      evaluation = {
        suiteId: suite.id,
        suiteHash,
        baselineHash,
        candidateHash: candidate.hash,
        vendor: "recorded",
        executionMode: "inspect",
        evidenceStatus:
          record.schemaVersion === 1
            ? "legacy"
            : runs.length === tasks.length * 2 &&
                runs.every(
                  (run) =>
                    !run.dispatchError &&
                    run.evidence?.initialWorkspace.complete &&
                    run.evidence.artifacts.complete,
                )
              ? "complete"
              : "insufficient",
        sourceRecordHash: record.recordHash,
        replayLimitations: [
          "Recorded verdicts are inspected and aggregated; no checks or agents were rerun",
        ],
        runs,
        score: scoreHarnessRuns(tasks, runs),
        ...trust,
        promotionBlockers: [
          ...trust.promotionBlockers,
          "Inspection is not a new evaluation of agent behavior",
        ],
      };
      evaluation.manifest = record.manifest;
      evaluation.conditions = record.manifest ? "recorded" : "unavailable";
      applyConditionDifferences(
        evaluation,
        record.manifest,
        resolveHarnessExecutionManifest({
          agent: suite.agent,
          vendor,
          vendorConfig,
          injected:
            Boolean(options._dispatch) ||
            record.manifest?.dispatchMode === "injected",
          probeVersion:
            options._probeVersion ??
            (record.manifest?.cliVersionStatus === "probed"
              ? probeCliVersion
              : false),
        }),
      );
    } else {
      if (
        record.baselineHash !== baselineHash ||
        record.candidateHash !== candidate.hash ||
        record.partition !== trust.partition
      )
        throw new Error(
          "Recorded evidence belongs to a different baseline, candidate, or partition",
        );
      let transcripts: HarnessFixtureTranscript[] = [];
      if (action === "fixture-replay") {
        if (!options.transcriptFile)
          throw new Error("Fixture transcript is missing");
        const transcriptPath = resolve(projectRoot, options.transcriptFile);
        assertRecordPath(transcriptPath, projectRoot);
        assertExistingPathInside(
          projectRoot,
          transcriptPath,
          "Harness transcript path",
        );
        transcripts = loadHarnessFixtureTranscripts(transcriptPath);
      }
      const result =
        action === "rescore"
          ? rescoreHarnessRecord(record, {
              suite,
              partition: options.partition,
            })
          : fixtureReplayHarnessRecord(record, {
              suite,
              partition: options.partition,
              transcripts,
            });
      evaluation = {
        suiteId: suite.id,
        suiteHash,
        baselineHash,
        candidateHash: candidate.hash,
        vendor: action === "rescore" ? "recorded-output" : "tool-fixture",
        executionMode: action,
        evidenceStatus: result.evidenceStatus,
        sourceRecordHash: result.sourceRecordHash,
        replayLimitations: result.limitations,
        runs: result.runs,
        score: scoreHarnessReplay(tasks, result),
        ...trust,
        promotionBlockers: [...trust.promotionBlockers, ...result.limitations],
      };
      evaluation.manifest = record.manifest;
      evaluation.conditions = record.manifest ? "recorded" : "unavailable";
      applyConditionDifferences(
        evaluation,
        record.manifest,
        resolveHarnessExecutionManifest({
          agent: suite.agent,
          vendor,
          vendorConfig,
          injected:
            Boolean(options._dispatch) ||
            record.manifest?.dispatchMode === "injected",
          probeVersion:
            options._probeVersion ??
            (record.manifest?.cliVersionStatus === "probed"
              ? probeCliVersion
              : false),
        }),
      );
    }
  } else {
    const destinationRecordPath =
      action === "rerun"
        ? resolvedRecordPath.replace(/\.json$/, "") +
          `-rerun-${Date.now()}.json`
        : resolvedRecordPath;
    if (options.record && existsSync(destinationRecordPath))
      throw new Error(
        "Harness recording is immutable; choose a new --record-file before dispatch",
      );
    const spec = CLI_SKILLS_DIR[vendor as keyof typeof CLI_SKILLS_DIR];
    if (!options._materializeVendor && (!spec || spec.requiresHomeConsent)) {
      throw new Error(
        `Vendor ${vendor} cannot provide project-local isolated harness discovery`,
      );
    }
    const timeoutMinutes = options.timeoutMinutes ?? 15;
    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
      throw new Error("--timeout-minutes must be a positive number");
    }
    const manifest = resolveHarnessExecutionManifest({
      agent: suite.agent,
      vendor,
      vendorConfig,
      injected: Boolean(options._dispatch),
      probeVersion:
        options._probeVersion ?? (options._dispatch ? false : probeCliVersion),
    });
    info(`\nHarness eval ${action} run preview:`);
    info(`  suite: ${suite.id}  partition: ${trust.partition}`);
    info(`  candidate: ${candidate.root}`);
    info(`  tasks: ${tasks.length}  dispatches: ${tasks.length * 2}`);
    info(`  vendor/model route: ${vendor} / ${suite.agent}`);
    info(
      `  conditions: ${manifest.dispatchMode} model=${manifest.model ?? "vendor-session"}` +
        ` cli=${manifest.cliVersion ?? manifest.cliVersionStatus} oma=${manifest.omaVersion}`,
    );
    info(
      `  environment: allowlist passed=${manifest.environmentPolicy.passed.length}` +
        ` dropped=${manifest.environmentPolicy.dropped} memory=disabled`,
    );
    info(
      `  workspace: fresh temporary checkout per arm${initialSnapshots ? " from recorded initial snapshot" : ""}`,
    );
    info(`  timeout: ${timeoutMinutes} minutes per arm\n`);
    if (!options.yes && !(await (options._confirm ?? confirmRun)())) {
      info("Aborted by user. No dispatches issued.");
      return undefined;
    }
    const dispatch =
      options._dispatch ??
      buildHarnessDispatch(
        suite.agent,
        vendor,
        vendorConfig,
        timeoutMinutes * 60_000,
      );
    // Trace events: one session per suite, one causality key per evaluation.
    // A trace that cannot be written is a recorded limitation, not a silent gap.
    const traceSession = `oma-harness-${suite.id}`;
    const causalityKey = `harness:${suiteHash.slice(0, 12)}:${candidate.hash.slice(0, 12)}:${Date.now().toString(36)}`;
    const traceLimitations: string[] = [];
    let parentEventId: string | undefined;
    const trace = (
      kind: string,
      payload: Record<string, unknown>,
    ): string | undefined => {
      try {
        return emitEvent(projectRoot, traceSession, {
          kind,
          payload,
          parentEventId,
          causalityKey,
        }).eventId;
      } catch (error) {
        traceLimitations.push(
          `Trace event ${kind} was not recorded: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      }
    };
    parentEventId = trace("harness.eval.started", {
      action,
      suiteId: suite.id,
      suiteHash,
      baselineHash,
      candidateHash: candidate.hash,
      partition: trust.partition,
      evaluatorHash,
      manifestHash: manifest.manifestHash,
      vendor: manifest.vendor,
      dispatchMode: manifest.dispatchMode,
      model: manifest.model,
      cliVersion: manifest.cliVersion,
      tasks: tasks.length,
    });
    evaluation = runHarnessLive({
      projectRoot,
      suite,
      candidate,
      vendor,
      dispatch,
      materializeVendor: options._materializeVendor,
      partition: options.partition,
      initialSnapshots,
      causalityKey,
      observer: ({ run }) => {
        trace("harness.arm.completed", {
          taskId: run.taskId,
          arm: run.arm,
          passed: run.passed,
          durationMs: run.durationMs,
          outputHash: run.evidence?.outputHash,
          dispatchError: run.dispatchError,
          exitCode: run.diagnostics?.exitCode ?? null,
          timedOut: run.diagnostics?.timedOut ?? false,
          trace: run.trace
            ? {
                output: run.trace.output,
                stderr: run.trace.stderr,
                artifacts: run.trace.artifacts,
                toolCalls: run.trace.toolCalls,
                changedPaths: run.trace.changedPaths,
                changedPathsTruncated: run.trace.changedPathsTruncated,
              }
            : undefined,
        });
      },
    });
    evaluation.manifest = manifest;
    evaluation.conditions = "current";
    evaluation.traceSession = traceSession;
    if (record) evaluation.sourceRecordHash = record.recordHash;
    let recordHash: string | undefined;
    if (options.record) {
      writeHarnessRecord(destinationRecordPath, evaluation);
      recordHash = inspectHarnessRecord(destinationRecordPath).recordHash;
      info(`Harness recording written: ${destinationRecordPath}`);
    }
    trace("harness.eval.completed", {
      decision: evaluation.score.decision,
      lift: evaluation.score.lift,
      evidenceStatus: evaluation.evidenceStatus,
      recordPath: options.record
        ? relative(projectRoot, destinationRecordPath)
        : undefined,
      recordHash,
    });
    if (traceLimitations.length) {
      evaluation.replayLimitations = [
        ...(evaluation.replayLimitations ?? []),
        ...traceLimitations,
      ];
    }
  }

  if (options._sourceLimitations?.length) {
    evaluation.replayLimitations = [
      ...new Set([
        ...(evaluation.replayLimitations ?? []),
        ...options._sourceLimitations,
      ]),
    ];
    evaluation.promotionBlockers = [
      ...new Set([
        ...evaluation.promotionBlockers,
        ...options._sourceLimitations,
      ]),
    ];
  }
  if (jsonMode) console.log(serializeHarnessEvaluation(evaluation));
  else renderHarnessEvaluation(evaluation);
  if (
    evaluation.score.decision === "fail" ||
    (options.requireCoverage && evaluation.score.coverage === "insufficient")
  ) {
    process.exitCode = 1;
  }
  return evaluation;
}
