import { NEG_TRANSFER_FAIL, type SkillUtilityReport } from "../eval.js";
import type { SkillProposalGateRecord } from "./types.js";

export function evaluationBlocker(
  report: SkillUtilityReport,
  mode: "mock" | "live",
  requireNegativeTransfer = false,
): SkillProposalGateRecord["reason"] | undefined {
  if (report.coverage !== "ok" || !Number.isFinite(report.utilityLift))
    return "insufficient-coverage";
  if (mode === "live" && report.isolation !== "enforced")
    return "unverified-isolation";
  if (!requireNegativeTransfer) return undefined;
  const coverage = report.negativeTransferCoverage;
  if (
    coverage?.status !== "measured" ||
    coverage.expected <= 0 ||
    coverage.scored !== coverage.expected ||
    report.negativeTransfer.length !== coverage.scored ||
    report.negativeTransfer.some((entry) => !Number.isFinite(entry.delta))
  ) {
    return "negative-transfer-unmeasured";
  }
  // A single-trial regression is taken at face value (mock replays cannot
  // re-measure); a re-measured one rejects only when the repeat agreed.
  return report.negativeTransfer.some(
    (entry) => entry.delta <= NEG_TRANSFER_FAIL && entry.confirmed !== false,
  )
    ? "negative-transfer"
    : undefined;
}
