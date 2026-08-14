import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { CLI_SKILLS_DIR } from "../../constants/index.js";
import { resolveVendor } from "../../platform/agent-config.js";
import { buildHarnessDispatch } from "./dispatch.js";
import { validateCandidateOverlay } from "./overlay.js";
import { isPathInside } from "./paths.js";
import { computeBaselineHash, computeSuiteHash } from "./provenance.js";
import { loadHarnessRecord, writeHarnessRecord } from "./records.js";
import {
  renderHarnessEvaluation,
  serializeHarnessEvaluation,
} from "./report.js";
import { runHarnessLive } from "./runner.js";
import { scoreHarnessRuns } from "./scoring.js";
import { loadHarnessSuite } from "./suite.js";
import type { HarnessDispatchFn, HarnessEvaluation } from "./types.js";

export interface HarnessEvalOptions {
  suite: string;
  candidate: string;
  live?: boolean;
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
): string {
  return join(
    dirname(suitePath),
    "_runs",
    `${suiteId}-${baselineHash.slice(0, 12)}-${candidateHash.slice(0, 12)}.json`,
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
  if (options.record && !options.live)
    throw new Error("--record requires --live");
  const projectRoot = resolve(options._projectRoot ?? process.cwd());
  const suite = loadHarnessSuite(options.suite, projectRoot);
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
  const resolvedRecordPath = resolve(
    projectRoot,
    options.recordFile ??
      recordPath(suite.sourcePath, suite.id, baselineHash, candidate.hash),
  );
  assertRecordPath(resolvedRecordPath, projectRoot);

  let evaluation: HarnessEvaluation;
  if (!options.live) {
    if (!existsSync(resolvedRecordPath)) {
      throw new Error(
        `No matching harness recording found: ${resolvedRecordPath}. Run --live --record first.`,
      );
    }
    const runs = loadHarnessRecord(resolvedRecordPath, {
      suiteHash,
      baselineHash,
      candidateHash: candidate.hash,
    });
    evaluation = {
      suiteId: suite.id,
      suiteHash,
      baselineHash,
      candidateHash: candidate.hash,
      vendor: "recorded",
      runs,
      score: scoreHarnessRuns(suite.tasks, runs),
    };
  } else {
    const resolved = resolveVendor(suite.agent);
    const vendor = options._vendor ?? resolved.vendor;
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
    info("\nHarness eval live run preview:");
    info(`  suite: ${suite.id}`);
    info(`  candidate: ${candidate.root}`);
    info(
      `  tasks: ${suite.tasks.length}  dispatches: ${suite.tasks.length * 2}`,
    );
    info(`  vendor/model route: ${vendor} / ${suite.agent}`);
    info(`  workspace: fresh temporary checkout per arm`);
    info(`  timeout: ${timeoutMinutes} minutes per arm\n`);
    if (!options.yes && !(await (options._confirm ?? confirmRun)())) {
      info("Aborted by user. No dispatches issued.");
      return undefined;
    }
    const vendorConfig = resolved.config?.vendors?.[vendor] ?? {};
    const dispatch =
      options._dispatch ??
      buildHarnessDispatch(
        suite.agent,
        vendor,
        vendorConfig,
        timeoutMinutes * 60_000,
      );
    evaluation = runHarnessLive({
      projectRoot,
      suite,
      candidate,
      vendor,
      dispatch,
      materializeVendor: options._materializeVendor,
    });
    if (options.record) {
      writeHarnessRecord(resolvedRecordPath, evaluation);
      info(`Harness recording written: ${resolvedRecordPath}`);
    }
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
