import { asString, isRecord } from "./coerce.js";
import { signalFromText } from "./signals.js";
import type { CoverageNote, IntelConfig, IntelSignal } from "./types.js";

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

function githubSinceDate(config: IntelConfig, now: Date): Date | undefined {
  if (!config.window.since) return undefined;
  return parseDurationToSinceDate(config.window.since, now) ?? undefined;
}

function isAfterSince(observedAt: string | undefined, since?: Date): boolean {
  if (!since) return true;
  if (!observedAt) return true;
  const observed = new Date(observedAt);
  return (
    Number.isNaN(observed.getTime()) || observed.getTime() >= since.getTime()
  );
}

async function collectRepoMeta(
  repo: string,
  retrievedAt: string,
): Promise<IntelSignal> {
  const repoMeta = (await fetchJson(
    `https://api.github.com/repos/${repo}`,
  )) as Record<string, unknown>;
  const description = asString(repoMeta.description) ?? "";
  return signalFromText({
    repo,
    source: "local",
    observedAt: asString(repoMeta.updated_at) ?? retrievedAt,
    retrievedAt,
    title: `${repo} repository surface`,
    summary: description || "Repository metadata observed.",
    url: asString(repoMeta.html_url),
    trust: "medium",
  });
}

async function collectRepoCommits(
  repo: string,
  config: IntelConfig,
  now: Date,
  retrievedAt: string,
): Promise<IntelSignal[]> {
  const params = new URLSearchParams({
    per_page: String(commitLimit(config)),
  });
  const since = githubSinceDate(config, now);
  if (since) params.set("since", since.toISOString());
  const commits = (await fetchJson(
    `https://api.github.com/repos/${repo}/commits?${params}`,
  )) as Array<Record<string, unknown>>;
  return commits.slice(0, commitLimit(config)).map((commit) => {
    const sha = asString(commit.sha);
    const commitObj = isRecord(commit.commit) ? commit.commit : {};
    const message = asString(commitObj.message) ?? "";
    const author = isRecord(commitObj.author) ? commitObj.author : {};
    const firstLine = message.split("\n")[0]?.trim() || "Commit";
    return signalFromText({
      repo,
      source: "commit",
      observedAt: asString(author.date) ?? retrievedAt,
      retrievedAt,
      title: firstLine,
      summary: message,
      url: asString(commit.html_url),
      ref: sha?.slice(0, 12),
      trust: "high",
    });
  });
}

async function collectRepoReadme(
  repo: string,
  retrievedAt: string,
): Promise<IntelSignal> {
  const readme = (await fetchJson(
    `https://api.github.com/repos/${repo}/readme`,
  )) as Record<string, unknown>;
  const encoded = asString(readme.content) ?? "";
  const decoded = encoded
    ? Buffer.from(encoded, "base64").toString("utf-8").slice(0, 4000)
    : "";
  return signalFromText({
    repo,
    source: "readme",
    observedAt: retrievedAt,
    retrievedAt,
    title: `${repo} README surface`,
    summary: decoded || "README present but empty.",
    url: asString(readme.html_url),
    trust: "medium",
  });
}

async function collectRepoReleases(
  repo: string,
  since: Date | undefined,
  retrievedAt: string,
): Promise<IntelSignal[]> {
  const releases = (await fetchJson(
    `https://api.github.com/repos/${repo}/releases?per_page=10`,
  )) as Array<Record<string, unknown>>;
  return releases
    .filter((release) => isAfterSince(asString(release.published_at), since))
    .slice(0, 10)
    .map((release) => {
      const name =
        asString(release.name) ?? asString(release.tag_name) ?? "Release";
      const body = asString(release.body) ?? "";
      return signalFromText({
        repo,
        source: "release",
        observedAt: asString(release.published_at) ?? retrievedAt,
        retrievedAt,
        title: `Release ${name}`,
        summary: body || name,
        url: asString(release.html_url),
        ref: asString(release.tag_name),
        trust: "medium",
      });
    });
}

async function collectRepoIssues(
  repo: string,
  since: Date | undefined,
  retrievedAt: string,
): Promise<IntelSignal[]> {
  const params = new URLSearchParams({
    state: "all",
    sort: "updated",
    per_page: "15",
  });
  if (since) params.set("since", since.toISOString());
  const issues = (await fetchJson(
    `https://api.github.com/repos/${repo}/issues?${params}`,
  )) as Array<Record<string, unknown>>;
  return issues
    .filter((issue) => !isRecord(issue.pull_request))
    .slice(0, 10)
    .map((issue) => {
      const title = asString(issue.title) ?? "Issue";
      const body = asString(issue.body) ?? "";
      const number =
        typeof issue.number === "number" ? issue.number : undefined;
      const labels = Array.isArray(issue.labels)
        ? issue.labels
            .map((label) =>
              isRecord(label) ? asString(label.name) : undefined,
            )
            .filter((name): name is string => !!name)
        : [];
      const labelSuffix = labels.length > 0 ? ` [${labels.join(", ")}]` : "";
      return signalFromText({
        repo,
        source: "issue",
        observedAt:
          asString(issue.updated_at) ??
          asString(issue.created_at) ??
          retrievedAt,
        retrievedAt,
        title: `${title}${labelSuffix}`,
        summary: body || title,
        url: asString(issue.html_url),
        ref: number ? `#${number}` : undefined,
        trust: "medium",
      });
    });
}

export async function collectGitHubSignals(
  config: IntelConfig,
  now: Date,
): Promise<{ signals: IntelSignal[]; coverage: CoverageNote[] }> {
  const repos = config.sources.github?.repos ?? [];
  const signals: IntelSignal[] = [];
  const coverage: CoverageNote[] = [];
  const retrievedAt = now.toISOString();
  const since = githubSinceDate(config, now);

  for (const repo of repos) {
    const collected: string[] = [];
    const degraded: string[] = [];
    try {
      signals.push(await collectRepoMeta(repo, retrievedAt));
      const commits = await collectRepoCommits(repo, config, now, retrievedAt);
      signals.push(...commits);
      collected.push(`metadata`, `${commits.length} commits`);
    } catch (error) {
      coverage.push({
        source: `github:${repo}`,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const [label, collector] of [
      ["readme", () => collectRepoReadme(repo, retrievedAt).then((s) => [s])],
      ["releases", () => collectRepoReleases(repo, since, retrievedAt)],
      ["issues", () => collectRepoIssues(repo, since, retrievedAt)],
    ] as Array<[string, () => Promise<IntelSignal[]>]>) {
      try {
        const collectedSignals = await collector();
        signals.push(...collectedSignals);
        collected.push(`${collectedSignals.length} ${label}`);
      } catch (error) {
        degraded.push(
          `${label} (${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }

    coverage.push({
      source: `github:${repo}`,
      status: degraded.length > 0 ? "partial" : "ok",
      detail:
        `Collected ${collected.join(", ")}.` +
        (degraded.length > 0 ? ` Skipped ${degraded.join("; ")}.` : ""),
    });
  }

  return { signals, coverage };
}
