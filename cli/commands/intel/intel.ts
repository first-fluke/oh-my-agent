import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

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
    githubIssue: { enabled: boolean; requireConfirm: boolean };
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
  now?: Date;
};

type CoverageNote = {
  source: string;
  status: "ok" | "partial" | "failed" | "skipped";
  detail: string;
};

export type IntelRunResult = {
  config: IntelConfig;
  signals: IntelSignal[];
  candidates: CandidateGap[];
  coverage: CoverageNote[];
  markdown: string;
  outputPaths: { markdown?: string; json?: string };
};

type RawConfig = {
  version?: number;
  base_repo?: unknown;
  target?: unknown;
  topic?: unknown;
  competitors?: unknown;
  sources?: unknown;
  window?: unknown;
  output?: unknown;
  remote?: unknown;
};

const DEFAULT_OUTPUT_DIR = "docs/intel";
const DEFAULT_FORMATS: Array<"md" | "json"> = ["md", "json"];

const CAPABILITY_KEYWORDS: Array<[string, RegExp]> = [
  ["scaffolding", /scaffold|template|starter|bootstrap|setup|install/i],
  ["workflow-loop", /workflow|loop|autopilot|ralph|ultra|orchestrat|team/i],
  ["agent-dispatch", /agent|dispatch|worker|subagent|tmux|parallel/i],
  ["memory-state", /memory|state|ledger|context|continuation|session/i],
  ["verification", /verify|test|qa|eval|review|gate|confidence/i],
  ["security", /security|redact|secret|permission|sandbox|cve|owasp/i],
  ["research", /market|research|search|trend|competitor|intelligence/i],
  ["docs", /docs|readme|reference|guide|documentation/i],
  ["release", /release|ship|deploy|version|changelog/i],
  ["cross-runtime", /codex|claude|gemini|opencode|cursor|kiro|grok|runtime/i],
  ["platform", /windows|linux|macos|shell|path|hook|manifest/i],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseRepoList(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
}

function normalizeRepo(repo: string): string {
  const trimmed = repo.trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    throw new Error(`Invalid GitHub repo "${repo}". Expected owner/name.`);
  }
  return trimmed;
}

function normalizeFormats(value: unknown): Array<"md" | "json"> {
  if (!Array.isArray(value)) return DEFAULT_FORMATS;
  const formats = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(
      (entry): entry is "md" | "json" => entry === "md" || entry === "json",
    );
  return formats.length > 0 ? [...new Set(formats)] : DEFAULT_FORMATS;
}

function parseLastCommits(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function parseDurationToSinceDate(value: string, now: Date): Date | null {
  const match = value.trim().match(/^(\d+)(h|d|w|m)$/i);
  if (!match) return null;
  const amount = Number.parseInt(match[1] ?? "", 10);
  const unit = (match[2] ?? "").toLowerCase();
  const msByUnit: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
  };
  const ms = msByUnit[unit];
  if (!ms || !Number.isFinite(amount)) return null;
  return new Date(now.getTime() - amount * ms);
}

function resolveConfigPath(cwd: string, explicit?: string): string | undefined {
  const candidates = explicit
    ? [path.resolve(cwd, explicit)]
    : [path.join(cwd, "oma-intel.yaml"), path.join(cwd, ".oma", "intel.yaml")];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function readYamlConfig(cwd: string, explicit?: string): RawConfig | undefined {
  const configPath = resolveConfigPath(cwd, explicit);
  if (!configPath) {
    if (explicit) throw new Error(`Config file not found: ${explicit}`);
    return undefined;
  }
  const parsed = YAML.parse(fs.readFileSync(configPath, "utf-8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`Config must be a YAML object: ${configPath}`);
  }
  return parsed as RawConfig;
}

function inferGitHubTarget(cwd: string): string | undefined {
  try {
    const remote = execFileSync(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        cwd,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function parseRawConfig(raw: RawConfig | undefined, cwd: string): IntelConfig {
  const sources = isRecord(raw?.sources) ? raw.sources : {};
  const github = isRecord(sources.github) ? sources.github : undefined;
  const market = isRecord(sources.market) ? sources.market : undefined;
  const local = isRecord(sources.local) ? sources.local : undefined;
  const window = isRecord(raw?.window) ? raw.window : {};
  const output = isRecord(raw?.output) ? raw.output : {};
  const remote = isRecord(raw?.remote) ? raw.remote : {};
  const githubIssue = isRecord(remote.github_issue) ? remote.github_issue : {};

  const competitorRepos = Array.isArray(raw?.competitors)
    ? raw.competitors
        .map((entry) =>
          isRecord(entry) ? asString(entry.repo) : asString(entry),
        )
        .filter((repo): repo is string => !!repo)
    : [];
  const githubRepos = Array.isArray(github?.repos)
    ? github.repos
        .map((entry) => asString(entry))
        .filter((repo): repo is string => !!repo)
    : [];

  return {
    version: 1,
    target:
      asString(raw?.target) ??
      asString(raw?.base_repo) ??
      inferGitHubTarget(cwd) ??
      path.basename(cwd),
    topic: asString(raw?.topic),
    sources: {
      github: {
        repos: [...githubRepos, ...competitorRepos].map(normalizeRepo),
      },
      market: { enabled: asBoolean(market?.enabled) ?? !!asString(raw?.topic) },
      local: { path: asString(local?.path) },
    },
    window: {
      since: asString(window.since) ?? "30d",
      lastCommits: parseLastCommits(window.last_commits),
    },
    output: {
      dir: asString(output.dir) ?? DEFAULT_OUTPUT_DIR,
      formats: normalizeFormats(output.formats),
    },
    remote: {
      githubIssue: {
        enabled: asBoolean(githubIssue.enabled) ?? false,
        requireConfirm: asBoolean(githubIssue.require_confirm) ?? true,
      },
    },
  };
}

export function resolveIntelConfig(options: IntelRunOptions): IntelConfig {
  const cwd = options.cwd ?? process.cwd();
  const raw = readYamlConfig(cwd, options.config);
  const config = parseRawConfig(raw, cwd);
  const reposOverride = parseRepoList(options.repos).map(normalizeRepo);

  if (options.target?.trim()) config.target = options.target.trim();
  if (options.topic?.trim()) {
    config.topic = options.topic.trim();
    config.sources.market = { enabled: true };
  }
  if (reposOverride.length > 0)
    config.sources.github = { repos: reposOverride };
  if (options.outputDir?.trim()) config.output.dir = options.outputDir.trim();

  const optionLastCommits = parseLastCommits(options.lastCommits);
  if (options.since && optionLastCommits) {
    throw new Error("Use only one window selector: --since or --last-commits.");
  }
  if (options.since) {
    config.window = { since: options.since };
  } else if (optionLastCommits) {
    config.window = { lastCommits: optionLastCommits };
  } else if (config.window.since && config.window.lastCommits) {
    throw new Error("Config must use only one window: since or last_commits.");
  }

  const githubRepos = config.sources.github?.repos ?? [];
  const marketEnabled = config.sources.market?.enabled ?? false;
  if (githubRepos.length === 0 && !marketEnabled && !config.topic) {
    throw new Error(
      "No intelligence sources configured. Add sources.github.repos, enable market with a topic, or pass --repos.",
    );
  }

  return config;
}

function tagText(text: string): string[] {
  const tags = CAPABILITY_KEYWORDS.filter(([, pattern]) =>
    pattern.test(text),
  ).map(([tag]) => tag);
  return tags.length > 0 ? [...new Set(tags)] : ["general"];
}

function signalFromText(
  input: Omit<IntelSignal, "capabilityTags" | "trust"> & {
    trust?: IntelSignal["trust"];
  },
): IntelSignal {
  const text = `${input.title}\n${input.summary}`;
  return {
    ...input,
    capabilityTags: tagText(text),
    trust: input.trust ?? "medium",
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oh-my-agent-intel",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const rateHint = remaining === "0" ? " (GitHub rate limit exhausted)" : "";
    throw new Error(`${response.status} ${response.statusText}${rateHint}`);
  }
  return response.json();
}

function commitLimit(config: IntelConfig): number {
  return Math.min(Math.max(config.window.lastCommits ?? 30, 1), 100);
}

function githubSinceParam(config: IntelConfig, now: Date): string | undefined {
  if (!config.window.since) return undefined;
  const parsed = parseDurationToSinceDate(config.window.since, now);
  return parsed?.toISOString();
}

async function collectGitHubSignals(
  config: IntelConfig,
  now: Date,
): Promise<{ signals: IntelSignal[]; coverage: CoverageNote[] }> {
  const repos = config.sources.github?.repos ?? [];
  const signals: IntelSignal[] = [];
  const coverage: CoverageNote[] = [];
  const retrievedAt = now.toISOString();

  for (const repo of repos) {
    try {
      const repoMeta = (await fetchJson(
        `https://api.github.com/repos/${repo}`,
      )) as Record<string, unknown>;
      const description = asString(repoMeta.description) ?? "";
      signals.push(
        signalFromText({
          repo,
          source: "local",
          observedAt: asString(repoMeta.updated_at) ?? retrievedAt,
          retrievedAt,
          title: `${repo} repository surface`,
          summary: description || "Repository metadata observed.",
          url: asString(repoMeta.html_url),
          trust: "medium",
        }),
      );

      const params = new URLSearchParams({
        per_page: String(commitLimit(config)),
      });
      const since = githubSinceParam(config, now);
      if (since) params.set("since", since);
      const commits = (await fetchJson(
        `https://api.github.com/repos/${repo}/commits?${params}`,
      )) as Array<Record<string, unknown>>;
      for (const commit of commits.slice(0, commitLimit(config))) {
        const sha = asString(commit.sha);
        const commitObj = isRecord(commit.commit) ? commit.commit : {};
        const message = asString(commitObj.message) ?? "";
        const author = isRecord(commitObj.author) ? commitObj.author : {};
        const firstLine = message.split("\n")[0]?.trim() || "Commit";
        signals.push(
          signalFromText({
            repo,
            source: "commit",
            observedAt: asString(author.date) ?? retrievedAt,
            retrievedAt,
            title: firstLine,
            summary: message,
            url: asString(commit.html_url),
            ref: sha?.slice(0, 12),
            trust: "high",
          }),
        );
      }
      coverage.push({
        source: `github:${repo}`,
        status: "ok",
        detail: `Collected repository metadata and ${Math.min(commits.length, commitLimit(config))} commits.`,
      });
    } catch (error) {
      coverage.push({
        source: `github:${repo}`,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { signals, coverage };
}

function collectLocalSignals(
  config: IntelConfig,
  cwd: string,
  now: Date,
): { signals: IntelSignal[]; coverage: CoverageNote[] } {
  const root = path.resolve(cwd, config.sources.local?.path ?? ".");
  const files = ["README.md", "package.json", "cli/cli.ts"];
  const signals: IntelSignal[] = [];
  const retrievedAt = now.toISOString();

  for (const file of files) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8").slice(0, 4000);
    signals.push(
      signalFromText({
        repo: config.target,
        source: "local",
        observedAt: retrievedAt,
        retrievedAt,
        title: `Target local context: ${file}`,
        summary: content,
        trust: "high",
      }),
    );
  }

  return {
    signals,
    coverage: [
      {
        source: "local",
        status: signals.length > 0 ? "ok" : "skipped",
        detail:
          signals.length > 0
            ? `Collected ${signals.length} local context files.`
            : "No local context files found.",
      },
    ],
  };
}

function collectMarketSignals(
  config: IntelConfig,
  now: Date,
): { signals: IntelSignal[]; coverage: CoverageNote[] } {
  if (!config.sources.market?.enabled) {
    return {
      signals: [],
      coverage: [{ source: "market", status: "skipped", detail: "Disabled." }],
    };
  }
  if (!config.topic) {
    return {
      signals: [],
      coverage: [
        { source: "market", status: "skipped", detail: "No topic configured." },
      ],
    };
  }
  const retrievedAt = now.toISOString();
  return {
    signals: [
      signalFromText({
        repo: config.target,
        source: "market",
        observedAt: retrievedAt,
        retrievedAt,
        title: `Market research topic: ${config.topic}`,
        summary:
          "Market source is enabled. Use this topic to collect community and trend signals through oma market during full research runs.",
        trust: "low",
      }),
    ],
    coverage: [
      {
        source: "market",
        status: "partial",
        detail:
          "Topic captured for market research; full community harvest is delegated to oma market.",
      },
    ],
  };
}

function loadFixture(fixturePath: string): {
  signals: IntelSignal[];
  coverage: CoverageNote[];
} {
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;
  if (Array.isArray(raw)) {
    return { signals: raw as IntelSignal[], coverage: [] };
  }
  if (isRecord(raw)) {
    return {
      signals: Array.isArray(raw.signals) ? (raw.signals as IntelSignal[]) : [],
      coverage: Array.isArray(raw.coverage)
        ? (raw.coverage as CoverageNote[])
        : [],
    };
  }
  throw new Error("Fixture must be an array or object with signals.");
}

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

function renderMarkdown(result: Omit<IntelRunResult, "markdown">): string {
  const accepted = result.candidates.filter(
    (candidate) => candidate.decision === "accept",
  );
  const deferred = result.candidates.filter(
    (candidate) => candidate.decision !== "accept",
  );
  const lines = [
    "# Intelligence Suggestions",
    "",
    `Target: ${result.config.target}`,
    result.config.topic ? `Topic: ${result.config.topic}` : undefined,
    `Window: ${result.config.window.lastCommits ? `${result.config.window.lastCommits} commits` : result.config.window.since}`,
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
    "## Evidence",
    "",
    ...result.candidates.flatMap((candidate) => [
      `### ${candidate.id}: ${candidate.title}`,
      "",
      `Decision: ${candidate.decision}`,
      `Rationale: ${candidate.rationale}`,
      "",
      ...candidate.evidence.map((signal) => {
        const ref = signal.ref ? ` ${signal.ref}` : "";
        const url = signal.url ? ` ${signal.url}` : "";
        return `- [${signal.source}] ${signal.repo}${ref}: ${signal.title}${url}`;
      }),
      "",
    ]),
    "## Coverage",
    "",
    ...result.coverage.map(
      (note) => `- ${note.source}: ${note.status} - ${note.detail}`,
    ),
    "",
    "## Remote Actions",
    "",
    result.config.remote.githubIssue.enabled
      ? "GitHub issue creation is configured but still requires explicit confirmation."
      : "No remote actions were performed. GitHub issue creation is disabled.",
    "",
  ].filter((line): line is string => line !== undefined);
  return lines.join("\n");
}

function reportDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

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
  const candidates = scoreCandidates(signals);
  const resultBase = {
    config,
    signals,
    candidates,
    coverage,
    outputPaths: {},
  };
  const markdown = renderMarkdown(resultBase);
  const result: IntelRunResult = { ...resultBase, markdown };

  if (!options.dryRun) {
    const outDir = path.resolve(cwd, config.output.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const stem = `${reportDate(now)}-intel`;
    if (config.output.formats.includes("md")) {
      const mdPath = path.join(outDir, `${stem}.md`);
      fs.writeFileSync(mdPath, markdown, "utf-8");
      result.outputPaths.markdown = mdPath;
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
