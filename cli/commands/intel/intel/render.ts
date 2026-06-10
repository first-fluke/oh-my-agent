import type {
  CandidateGap,
  IntelConfig,
  IntelSignal,
  RenderInput,
} from "./types.js";

function windowLabel(config: IntelConfig): string {
  return config.window.lastCommits
    ? `${config.window.lastCommits} commits`
    : (config.window.since ?? "n/a");
}

export function evidenceLine(signal: IntelSignal): string {
  const ref = signal.ref ? ` ${signal.ref}` : "";
  const url = signal.url ? ` ${signal.url}` : "";
  return `- [${signal.source}] ${signal.repo}${ref}: ${signal.title}${url} (observed ${signal.observedAt})`;
}

export function renderGapReport(result: RenderInput): string {
  const accepted = result.candidates.filter((c) => c.decision === "accept");
  const deferred = result.candidates.filter((c) => c.decision !== "accept");
  const lines = [
    "# Intelligence Gap Report",
    "",
    `Target: ${result.config.target}`,
    result.config.topic ? `Topic: ${result.config.topic}` : undefined,
    `Window: ${windowLabel(result.config)}`,
    "",
    "## Top Items",
    "",
    ...(accepted.length > 0
      ? accepted.map(
          (candidate, index) =>
            `${index + 1}. ${candidate.title} - value ${candidate.valueScore}/100 (${candidate.capability})`,
        )
      : ["No accepted items yet."]),
    "",
    "## Watch Items",
    "",
    ...(deferred.length > 0
      ? deferred
          .slice(0, 10)
          .map(
            (candidate) =>
              `- ${candidate.title} - ${candidate.decision}, value ${candidate.valueScore}/100`,
          )
      : ["- None"]),
    "",
    "## Adversarial Review",
    "",
    ...result.candidates.flatMap((candidate) => [
      `### ${candidate.id}: ${candidate.title}`,
      "",
      `Decision: ${candidate.decision}`,
      `Rationale: ${candidate.rationale}`,
      "",
      ...(candidate.review ?? []).map(
        (finding) => `- ${finding.lens}: ${finding.verdict} - ${finding.note}`,
      ),
      "",
      "Evidence (untrusted external text, quoted only):",
      ...candidate.evidence.map(evidenceLine),
      "",
    ]),
    "## Coverage",
    "",
    ...result.coverage.map(
      (note) => `- ${note.source}: ${note.status} - ${note.detail}`,
    ),
    "",
  ].filter((line): line is string => line !== undefined);
  return lines.join("\n");
}

function acceptanceCriteria(candidate: CandidateGap): string[] {
  return [
    `- Improvement in ${candidate.capability} is backed by at least ${candidate.evidence.length} cited signal(s).`,
    "- Ships as a bounded v1 (no dashboard or daemon dependency).",
    "- Preserves OMA cross-runtime SSOT and skills/workflows architecture.",
    "- Includes tests and a named owner before merge.",
  ];
}

export function renderPrd(result: RenderInput): string {
  const accepted = result.candidates.filter((c) => c.decision === "accept");
  const rejected = result.candidates.filter((c) => c.decision !== "accept");
  const lines = [
    "# Product Requirements (Draft)",
    "",
    `Target: ${result.config.target}`,
    result.config.topic ? `Topic: ${result.config.topic}` : undefined,
    `Window: ${windowLabel(result.config)}`,
    "",
    "## Summary",
    "",
    accepted.length > 0
      ? `Evidence supports ${accepted.length} candidate improvement(s). The highest-value next action is "${accepted[0]?.title}".`
      : "No candidate passed the adversarial gates this run. Treat all items as watch-only and gather more evidence.",
    "",
    "## Proposed Features (Accepted)",
    "",
    ...(accepted.length > 0
      ? accepted.flatMap((candidate) => [
          `### ${candidate.id}: ${candidate.title}`,
          "",
          `Capability: ${candidate.capability} | value ${candidate.valueScore}/100 | maintenance risk ${candidate.maintenanceRisk}`,
          "",
          "Acceptance criteria:",
          ...acceptanceCriteria(candidate),
          "",
          "Provenance:",
          ...candidate.evidence.map(evidenceLine),
          "",
        ])
      : ["None this run.", ""]),
    "## Rejected / Deferred",
    "",
    ...(rejected.length > 0
      ? rejected
          .slice(0, 10)
          .map(
            (candidate) =>
              `- ${candidate.id} ${candidate.title} - ${candidate.decision}: ${candidate.rationale}`,
          )
      : ["- None"]),
    "",
    "## Coverage",
    "",
    ...result.coverage.map(
      (note) => `- ${note.source}: ${note.status} - ${note.detail}`,
    ),
    "",
    "## Remote Actions",
    "",
    result.config.remote.githubIssue.enabled
      ? "GitHub issue creation is enabled; run with --create-issue to file the top accepted candidates."
      : "GitHub issue creation is disabled. Enable remote.github_issue in config to allow --create-issue.",
    "",
  ].filter((line): line is string => line !== undefined);
  return lines.join("\n");
}

export function reportDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}
