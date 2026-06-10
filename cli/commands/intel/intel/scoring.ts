import type {
  CandidateGap,
  IntelConfig,
  IntelSignal,
  ReviewFinding,
} from "./types.js";

// Flag genuinely unsafe intent (action verb + sensitive target), not mere
// mentions of "API key" or "credentials" that appear in normal docs/release
// notes. Keeping this tight avoids false-positive rejections (quality: no
// false positives).
const UNSAFE_EVIDENCE = new RegExp(
  [
    // verb + sensitive noun within a short window
    "(?:scrap(?:e|ing)|exfiltrat\\w*|steal(?:ing)?|harvest(?:ing)?|capture|dump|leak|sniff)\\s+(?:\\w+\\s+){0,3}(?:credential|password|secret|token|api[ _-]?key|cookie|session)",
    // noun + theft/harvest phrasing
    "(?:credential|token|password|secret)\\s+(?:theft|harvest\\w*|exfiltrat\\w*)",
    // auth/permission bypass
    "bypass(?:ing)?\\s+(?:auth\\w*|login|permission|sandbox|2fa|mfa)",
  ].join("|"),
  "i",
);

function evidenceWeight(signal: IntelSignal): number {
  const trust = signal.trust === "high" ? 3 : signal.trust === "medium" ? 2 : 1;
  const source =
    signal.source === "commit" || signal.source === "issue" ? 2 : 1;
  return trust + source;
}

export function scoreCandidates(signals: IntelSignal[]): CandidateGap[] {
  const externalSignals = signals.filter((signal) => signal.source !== "local");
  const byCapability = new Map<string, IntelSignal[]>();
  for (const signal of externalSignals) {
    for (const tag of signal.capabilityTags) {
      const bucket = byCapability.get(tag) ?? [];
      bucket.push(signal);
      byCapability.set(tag, bucket);
    }
  }

  return [...byCapability.entries()]
    .map(([capability, evidence], index): CandidateGap => {
      const evidenceScore = evidence.reduce(
        (sum, signal) => sum + evidenceWeight(signal),
        0,
      );
      const repoDiversity = new Set(evidence.map((signal) => signal.repo)).size;
      const fitScore = Math.min(10, 3 + repoDiversity + evidence.length);
      const differentiationScore = Math.min(
        10,
        2 + Math.ceil(evidenceScore / 3),
      );
      const valueScore = Math.min(
        100,
        Math.round(fitScore * 5 + differentiationScore * 4 + repoDiversity * 5),
      );
      const decision =
        evidence.length >= 2 && valueScore >= 55
          ? "accept"
          : evidence.length >= 1
            ? "defer"
            : "reject";
      return {
        id: `INTEL-${String(index + 1).padStart(3, "0")}`,
        title: `Investigate ${capability} opportunity`,
        capability,
        evidence: evidence.slice(0, 5),
        fitScore,
        differentiationScore,
        valueScore,
        maintenanceRisk: evidence.length > 6 ? "medium" : "low",
        decision,
        rationale:
          decision === "accept"
            ? "Multiple signals suggest this capability may improve the target product."
            : "Evidence is currently too thin for implementation; keep as watch item.",
      };
    })
    .sort((a, b) => b.valueScore - a.valueScore);
}

/**
 * Apply blind/adversarial review lenses over scored candidates. External
 * evidence is treated as untrusted data, not instructions. A failing lens can
 * downgrade an accepted candidate; flags are recorded but do not block on their
 * own. The transform is deterministic so fixture replay stays stable.
 */
export function reviewCandidates(
  candidates: CandidateGap[],
  config: IntelConfig,
): CandidateGap[] {
  return candidates.map((candidate) => {
    const repos = new Set(candidate.evidence.map((signal) => signal.repo));
    const hasStrongCode = candidate.evidence.some(
      (signal) => signal.source === "commit" && signal.trust === "high",
    );
    const unsafe = candidate.evidence.some((signal) =>
      UNSAFE_EVIDENCE.test(`${signal.title}\n${signal.summary}`),
    );

    const review: ReviewFinding[] = [];

    // Evidence gate: two independent signals, or one strong code signal.
    const evidencePass =
      (candidate.evidence.length >= 2 && repos.size >= 2) || hasStrongCode;
    review.push({
      lens: "evidence",
      verdict: evidencePass ? "pass" : "fail",
      note: evidencePass
        ? `${candidate.evidence.length} signals across ${repos.size} repo(s).`
        : "Fewer than two independent signals and no strong code signal.",
    });

    // Fit gate: capability must map to the OMA taxonomy.
    const fitPass = candidate.capability !== "general";
    review.push({
      lens: "fit",
      verdict: fitPass ? "pass" : "flag",
      note: fitPass
        ? `Maps to OMA capability "${candidate.capability}" for ${config.target}.`
        : "Untagged capability; cannot confirm architectural fit.",
    });

    // Differentiation gate: avoid shallow copycat work.
    const diffPass = candidate.differentiationScore >= 4;
    review.push({
      lens: "differentiation",
      verdict: diffPass ? "pass" : "flag",
      note: diffPass
        ? `Differentiation score ${candidate.differentiationScore}/10.`
        : "Low differentiation; risk of shallow clone.",
    });

    // Scope gate: bounded v1 maintainability.
    const scopePass = candidate.maintenanceRisk !== "high";
    review.push({
      lens: "scope",
      verdict: scopePass ? "pass" : "flag",
      note: scopePass
        ? `Maintenance risk ${candidate.maintenanceRisk}.`
        : "High maintenance risk; scope may exceed a bounded v1.",
    });

    // Risk gate: no unsafe scraping or credential capture in evidence.
    review.push({
      lens: "risk",
      verdict: unsafe ? "fail" : "pass",
      note: unsafe
        ? "Evidence references unsafe scraping/credential patterns."
        : "No unsafe scraping or credential patterns detected.",
    });

    const hasFail = review.some((finding) => finding.verdict === "fail");
    const blockingFlag = review.some(
      (finding) =>
        finding.verdict === "flag" &&
        (finding.lens === "differentiation" || finding.lens === "fit"),
    );

    let decision = candidate.decision;
    let rationale = candidate.rationale;
    if (hasFail) {
      decision = "reject";
      rationale =
        "Adversarial review rejected this candidate: " +
        review
          .filter((finding) => finding.verdict === "fail")
          .map((finding) => finding.note)
          .join(" ");
    } else if (candidate.decision === "accept" && blockingFlag) {
      decision = "defer";
      rationale =
        "Adversarial review downgraded to watch item: " +
        review
          .filter((finding) => finding.verdict === "flag")
          .map((finding) => finding.note)
          .join(" ");
    }

    return { ...candidate, decision, rationale, review };
  });
}
