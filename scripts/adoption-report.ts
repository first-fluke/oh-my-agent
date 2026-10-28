import { execFile } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const TIMEOUT_MS = 10_000;
export const DEFAULT_REPO = "first-fluke/oh-my-agent";
export const DEFAULT_PACKAGE = "oh-my-agent";

export interface Options {
  repo: string;
  package: string;
  out?: string;
}

export interface Adapters {
  github: (endpoint: string) => Promise<unknown>;
  npm: (endpoint: string) => Promise<unknown>;
  now: () => Date;
}

interface Period {
  kind: "point_in_time" | "github_last_14_days" | "npm_returned_range";
  start: string | null;
  end: string | null;
}

export interface Source {
  status: "ok" | "unavailable" | "error";
  endpoint: string;
  period: Period;
  metrics: Record<string, unknown> | null;
  error: string | null;
}

export interface Snapshot {
  schema_version: 1;
  collected_at: string;
  repo: string;
  package: string;
  status: "complete" | "partial";
  sources: Record<string, Source>;
}

export class SourceUnavailable extends Error {}
class InvalidPayload extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidPayload("Expected a JSON object.");
  }
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidPayload("Expected a nonnegative integer count.");
  }
  return value;
}

function date(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  ) {
    throw new InvalidPayload("Expected a calendar date (YYYY-MM-DD).");
  }
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new InvalidPayload("Expected a JSON array.");
  return value;
}

export function validateOptions(options: Options): void {
  if (!/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/i.test(options.repo)) {
    throw new Error("--repo must be owner/name.");
  }
  if (
    options.package.length > 214 ||
    !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(options.package)
  ) {
    throw new Error(
      "--package must be an npm package name (optionally @scope/name).",
    );
  }
  if (options.out !== undefined && !options.out.trim()) {
    throw new Error("--out must be a nonempty file path.");
  }
}

export function parseOptions(args: string[]): Options {
  const { values } = parseArgs({
    args,
    options: {
      repo: { type: "string", default: DEFAULT_REPO },
      package: { type: "string", default: DEFAULT_PACKAGE },
      out: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  const options = {
    repo: values.repo,
    package: values.package,
    out: values.out,
  };
  validateOptions(options);
  return options;
}

function traffic(payload: unknown, key: "views" | "clones") {
  const data = record(payload);
  const seen = new Set<string>();
  return {
    count: count(data.count),
    uniques: count(data.uniques),
    daily: array(data[key]).map((value) => {
      const row = record(value);
      const timestamp = row.timestamp;
      if (
        typeof timestamp !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(timestamp)
      )
        throw new InvalidPayload("Expected a UTC daily bucket timestamp.");
      date(timestamp.slice(0, 10));
      if (seen.has(timestamp))
        throw new InvalidPayload("Duplicate daily bucket.");
      seen.add(timestamp);
      return {
        timestamp,
        count: count(row.count),
        uniques: count(row.uniques),
      };
    }),
  };
}

async function source(
  endpoint: string,
  period: Period,
  read: () => Promise<unknown>,
  parse: (payload: unknown) => Record<string, unknown>,
): Promise<Source> {
  try {
    return {
      status: "ok",
      endpoint,
      period,
      metrics: parse(await read()),
      error: null,
    };
  } catch (error) {
    return {
      status: error instanceof SourceUnavailable ? "unavailable" : "error",
      endpoint,
      period,
      metrics: null,
      error:
        error instanceof InvalidPayload || error instanceof SourceUnavailable
          ? error.message
          : "Source request failed; no metrics were recorded.",
    };
  }
}

export async function collectSnapshot(
  options: Options,
  adapters: Adapters = defaultAdapters,
): Promise<Snapshot> {
  validateOptions(options);
  const collectedAt = adapters.now().toISOString();
  const githubRoot = `repos/${options.repo}`;
  const githubPeriod: Period = {
    kind: "github_last_14_days",
    start: null,
    end: null,
  };
  const npmPeriod: Period = {
    kind: "npm_returned_range",
    start: null,
    end: null,
  };
  const npmEndpoint = `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(options.package)}`;
  const githubSource = (
    suffix: string,
    period: Period,
    parse: Parameters<typeof source>[3],
  ) => {
    const endpoint = `${githubRoot}${suffix}`;
    return source(
      `https://api.github.com/${endpoint}`,
      period,
      () => adapters.github(endpoint),
      parse,
    );
  };
  const [repository, views, clones, referrers, downloads] = await Promise.all([
    githubSource(
      "",
      { kind: "point_in_time", start: collectedAt, end: collectedAt },
      (payload) => ({ stars: count(record(payload).stargazers_count) }),
    ),
    githubSource("/traffic/views?per=day", { ...githubPeriod }, (payload) =>
      traffic(payload, "views"),
    ),
    githubSource("/traffic/clones?per=day", { ...githubPeriod }, (payload) =>
      traffic(payload, "clones"),
    ),
    githubSource(
      "/traffic/popular/referrers",
      { ...githubPeriod },
      (payload) => ({
        referrers: array(payload).map((value) => {
          const row = record(value);
          if (typeof row.referrer !== "string" || !row.referrer) {
            throw new InvalidPayload("Expected a referrer name.");
          }
          return {
            referrer: row.referrer,
            count: count(row.count),
            uniques: count(row.uniques),
          };
        }),
      }),
    ),
    source(
      npmEndpoint,
      npmPeriod,
      () => adapters.npm(npmEndpoint),
      (payload) => {
        const data = record(payload);
        const start = date(data.start);
        const end = date(data.end);
        if (start > end || data.package !== options.package) {
          throw new InvalidPayload("Unexpected npm package or date range.");
        }
        const seen = new Set<string>();
        const daily = array(data.downloads).map((value) => {
          const row = record(value);
          const day = date(row.day);
          if (day < start || day > end || seen.has(day)) {
            throw new InvalidPayload("Invalid or duplicate npm daily bucket.");
          }
          seen.add(day);
          return { day, downloads: count(row.downloads) };
        });
        const total = daily.reduce((sum, row) => sum + row.downloads, 0);
        const expectedDays =
          (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
        if (daily.length !== expectedDays) {
          throw new InvalidPayload("npm returned incomplete daily buckets.");
        }
        count(total);
        npmPeriod.start = start;
        npmPeriod.end = end;
        return { total_downloads: total, daily };
      },
    ),
  ]);
  const sources = {
    github_repository: repository,
    github_views: views,
    github_clones: clones,
    github_referrers: referrers,
    npm_downloads: downloads,
  };
  return {
    schema_version: 1,
    collected_at: collectedAt,
    repo: options.repo,
    package: options.package,
    status: Object.values(sources).every((entry) => entry.status === "ok")
      ? "complete"
      : "partial",
    sources,
  };
}

const defaultAdapters: Adapters = {
  now: () => new Date(),
  github: (endpoint) =>
    new Promise((resolveRequest, reject) => {
      execFile(
        "gh",
        [
          "api",
          "--hostname",
          "github.com",
          "--method",
          "GET",
          "-H",
          "Accept: application/vnd.github+json",
          "-H",
          "X-GitHub-Api-Version: 2026-03-10",
          endpoint,
        ],
        { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(
              new SourceUnavailable(
                "GitHub unavailable; check gh auth status and repository traffic permissions.",
              ),
            );
            return;
          }
          try {
            resolveRequest(JSON.parse(stdout));
          } catch {
            reject(new InvalidPayload("GitHub returned invalid JSON."));
          }
        },
      );
    }),
  npm: async (endpoint) => {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new SourceUnavailable(
        "npm request timed out or could not connect.",
      );
    }
    if (!response.ok)
      throw new SourceUnavailable(`npm returned HTTP ${response.status}.`);
    try {
      return await response.json();
    } catch {
      throw new InvalidPayload("npm returned invalid JSON.");
    }
  },
};

export function writeSnapshot(snapshot: Snapshot, out?: string): string {
  const path = resolve(
    out ??
      join(
        ".agents/results/adoption",
        snapshot.collected_at.slice(0, 10),
        "snapshot.json",
      ),
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
  return path;
}

if (import.meta.main) {
  try {
    const options = parseOptions(process.argv.slice(2));
    const snapshot = await collectSnapshot(options);
    const path = writeSnapshot(snapshot, options.out);
    const summary = Object.entries(snapshot.sources)
      .map(([name, entry]) => `${name}=${entry.status}`)
      .join(", ");
    console.log(`${snapshot.status}: ${summary}\nSnapshot: ${path}`);
    process.exitCode = snapshot.status === "complete" ? 0 : 1;
  } catch {
    console.error(
      "Could not collect adoption metrics. Check --repo owner/name, --package name and --out file.json; verify the output directory is writable.",
    );
    process.exitCode = 2;
  }
}
