import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { asBoolean, asString, isRecord } from "./coerce.js";
import type { IntelConfig, IntelRunOptions } from "./types.js";

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
        repo: asString(githubIssue.repo),
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
  if (options.baseRepo?.trim()) {
    config.remote.githubIssue.repo = normalizeRepo(options.baseRepo);
  }

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
