export type IntelSourceKind =
  | "commit"
  | "readme"
  | "release"
  | "issue"
  | "market"
  | "local";

export type IntelSignal = {
  repo: string;
  source: IntelSourceKind;
  observedAt: string;
  retrievedAt: string;
  title: string;
  summary: string;
  url?: string;
  ref?: string;
  capabilityTags: string[];
  trust: "low" | "medium" | "high";
};

export type ReviewLens =
  | "evidence"
  | "fit"
  | "differentiation"
  | "scope"
  | "risk";

export type ReviewFinding = {
  lens: ReviewLens;
  verdict: "pass" | "flag" | "fail";
  note: string;
};

export type CandidateGap = {
  id: string;
  title: string;
  capability: string;
  evidence: IntelSignal[];
  fitScore: number;
  differentiationScore: number;
  valueScore: number;
  maintenanceRisk: "low" | "medium" | "high";
  decision: "accept" | "defer" | "reject";
  rationale: string;
  review?: ReviewFinding[];
};

export type IntelConfig = {
  version: 1;
  target: string;
  topic?: string;
  sources: {
    github?: { repos: string[] };
    market?: { enabled: boolean };
    local?: { path?: string };
  };
  window: { since?: string; lastCommits?: number };
  output: {
    dir: string;
    formats: Array<"md" | "json">;
  };
  remote: {
    githubIssue: { enabled: boolean; requireConfirm: boolean; repo?: string };
  };
};

export type IntelRunOptions = {
  cwd?: string;
  config?: string;
  target?: string;
  topic?: string;
  repos?: string;
  since?: string;
  lastCommits?: number;
  outputDir?: string;
  dryRun?: boolean;
  fixture?: string;
  createIssue?: boolean;
  baseRepo?: string;
  assumeYes?: boolean;
  now?: Date;
};

export type CoverageNote = {
  source: string;
  status: "ok" | "partial" | "failed" | "skipped";
  detail: string;
};

export type IssueResult = {
  status: "created" | "dry-run" | "skipped" | "duplicate" | "refused";
  detail: string;
  title: string;
  fingerprint: string;
  url?: string;
  body?: string;
};

export type IntelRunResult = {
  config: IntelConfig;
  signals: IntelSignal[];
  candidates: CandidateGap[];
  coverage: CoverageNote[];
  prd: string;
  gapReport: string;
  outputPaths: { prd?: string; gapReport?: string; json?: string };
  issue?: IssueResult;
};

export type RenderInput = Omit<
  IntelRunResult,
  "prd" | "gapReport" | "outputPaths" | "issue"
>;
