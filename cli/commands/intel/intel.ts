import fs from "node:fs";
import path from "node:path";
import { collectGitHubSignals } from "./intel/collect-github.js";
import {
  collectLocalSignals,
  collectMarketSignals,
  loadFixture,
} from "./intel/collect-local.js";
import { resolveIntelConfig } from "./intel/config.js";
import { createGitHubIssue } from "./intel/github-issue.js";
import { renderGapReport, renderPrd, reportDate } from "./intel/render.js";
import { reviewCandidates, scoreCandidates } from "./intel/scoring.js";
import type {
  IntelRunOptions,
  IntelRunResult,
  RenderInput,
} from "./intel/types.js";

export { resolveIntelConfig } from "./intel/config.js";
export { reviewCandidates, scoreCandidates } from "./intel/scoring.js";
export type {
  CandidateGap,
  IntelConfig,
  IntelRunOptions,
  IntelRunResult,
  IntelSignal,
  IntelSourceKind,
  IssueResult,
  ReviewFinding,
  ReviewLens,
} from "./intel/types.js";

export async function runIntelSuggest(
  options: IntelRunOptions,
): Promise<IntelRunResult> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const config = resolveIntelConfig(options);

  const local = collectLocalSignals(config, cwd, now);
  const market = collectMarketSignals(config, now);
  const github = options.fixture
    ? loadFixture(path.resolve(cwd, options.fixture))
    : await collectGitHubSignals(config, now);

  const signals = [...local.signals, ...market.signals, ...github.signals];
  const coverage = [...local.coverage, ...market.coverage, ...github.coverage];
  const candidates = reviewCandidates(scoreCandidates(signals), config);
  const renderInput: RenderInput = { config, signals, candidates, coverage };
  const prd = renderPrd(renderInput);
  const gapReport = renderGapReport(renderInput);

  const result: IntelRunResult = {
    ...renderInput,
    prd,
    gapReport,
    outputPaths: {},
  };

  if (options.createIssue) {
    result.issue = await createGitHubIssue(renderInput, options);
  }

  if (!options.dryRun) {
    const outDir = path.resolve(cwd, config.output.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const stem = `${reportDate(now)}-intel`;
    if (config.output.formats.includes("md")) {
      const prdPath = path.join(outDir, `${reportDate(now)}-prd.md`);
      const gapPath = path.join(outDir, `${reportDate(now)}-gap-report.md`);
      fs.writeFileSync(prdPath, prd, "utf-8");
      fs.writeFileSync(gapPath, gapReport, "utf-8");
      result.outputPaths.prd = prdPath;
      result.outputPaths.gapReport = gapPath;
    }
    if (config.output.formats.includes("json")) {
      const jsonPath = path.join(outDir, `${stem}.json`);
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            config,
            signals,
            candidates,
            coverage,
            issue: result.issue,
            outputPaths: result.outputPaths,
          },
          null,
          2,
        ),
        "utf-8",
      );
      result.outputPaths.json = jsonPath;
    }
  }

  return result;
}
