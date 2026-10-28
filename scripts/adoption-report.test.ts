import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Adapters,
  collectSnapshot,
  DEFAULT_PACKAGE,
  DEFAULT_REPO,
  parseOptions,
  SourceUnavailable,
  writeSnapshot,
} from "./adoption-report.js";

const options = { repo: DEFAULT_REPO, package: DEFAULT_PACKAGE };
const timestamp = "2026-10-27T00:00:00Z";
const roots: string[] = [];

function fixture() {
  const github: Record<string, unknown> = {
    [`repos/${DEFAULT_REPO}`]: {
      stargazers_count: 1371,
      owner: { login: "do-not-retain" },
    },
    [`repos/${DEFAULT_REPO}/traffic/views?per=day`]: {
      count: 40,
      uniques: 23,
      views: [{ timestamp, count: 40, uniques: 23 }],
    },
    [`repos/${DEFAULT_REPO}/traffic/clones?per=day`]: {
      count: 10,
      uniques: 6,
      clones: [{ timestamp, count: 10, uniques: 6 }],
    },
    [`repos/${DEFAULT_REPO}/traffic/popular/referrers`]: [
      { referrer: "news.hada.io", count: 8, uniques: 5 },
    ],
  };
  const npm = {
    package: DEFAULT_PACKAGE,
    start: "2026-09-28",
    end: "2026-10-27",
    downloads: Array.from({ length: 30 }, (_, index) => ({
      day: new Date(Date.UTC(2026, 8, 28 + index)).toISOString().slice(0, 10),
      downloads: index === 29 ? 41 : 0,
    })),
  };
  const adapters: Adapters = {
    github: vi.fn(async (endpoint) => structuredClone(github[endpoint])),
    npm: vi.fn(async () => structuredClone(npm)),
    now: () => new Date("2026-10-28T02:00:00Z"),
  };
  return { github, npm, adapters };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("adoption snapshot", () => {
  it("retains source counts and exact returned npm dates without combining counters", async () => {
    const f = fixture();
    const result = await collectSnapshot(options, f.adapters);
    expect(result.status).toBe("complete");
    expect(result.collected_at).toBe("2026-10-28T02:00:00.000Z");
    expect(result.sources.github_repository.metrics).toEqual({ stars: 1371 });
    expect(JSON.stringify(result)).not.toContain("do-not-retain");
    expect(result.sources.github_views.metrics).toEqual({
      count: 40,
      uniques: 23,
      daily: [{ timestamp, count: 40, uniques: 23 }],
    });
    expect(result.sources.github_clones.metrics?.count).toBe(10);
    expect(result.sources.github_referrers.metrics).toEqual({
      referrers: [{ referrer: "news.hada.io", count: 8, uniques: 5 }],
    });
    expect(result.sources.github_referrers.period).toEqual({
      kind: "github_last_14_days",
      start: null,
      end: null,
    });
    expect(result.sources.npm_downloads.period).toEqual({
      kind: "npm_returned_range",
      start: "2026-09-28",
      end: "2026-10-27",
    });
    expect(result.sources.npm_downloads.metrics).toEqual({
      total_downloads: 41,
      daily: f.npm.downloads,
    });
    expect(result.sources.npm_downloads.endpoint).toBe(
      "https://api.npmjs.org/downloads/range/last-month/oh-my-agent",
    );
    expect(f.adapters.github).toHaveBeenCalledTimes(4);
    expect(f.adapters.npm).toHaveBeenCalledTimes(1);
  });

  it("distinguishes unavailable traffic from a measured zero", async () => {
    const f = fixture();
    f.github[`repos/${DEFAULT_REPO}`] = { stargazers_count: 0 };
    f.adapters.github = async (endpoint) => {
      if (endpoint.includes("/traffic/views"))
        throw new SourceUnavailable("Owner traffic access unavailable.");
      return f.github[endpoint];
    };
    const result = await collectSnapshot(options, f.adapters);
    expect(result.status).toBe("partial");
    expect(result.sources.github_views).toMatchObject({
      status: "unavailable",
      metrics: null,
      error: "Owner traffic access unavailable.",
    });
    expect(result.sources.github_repository).toMatchObject({
      status: "ok",
      metrics: { stars: 0 },
    });
    expect(result.sources.npm_downloads.status).toBe("ok");
  });

  it.each([
    ["github_repository", "", { stargazers_count: "1371" }],
    [
      "github_views",
      "/traffic/views?per=day",
      {
        count: 1,
        uniques: 1,
        views: [{ timestamp: "2026-02-30T00:00:00Z", count: 1, uniques: 1 }],
      },
    ],
    [
      "github_clones",
      "/traffic/clones?per=day",
      { count: -1, uniques: 0, clones: [] },
    ],
    ["github_referrers", "/traffic/popular/referrers", { referrer: "Google" }],
  ])("marks malformed %s metrics as errors", async (name, suffix, payload) => {
    const f = fixture();
    f.github[`repos/${DEFAULT_REPO}${suffix}`] = payload;
    const result = await collectSnapshot(options, f.adapters);
    expect(result.status).toBe("partial");
    expect(result.sources[name as string]).toMatchObject({
      status: "error",
      metrics: null,
    });
  });

  it.each([
    "package",
    "duplicate day",
    "outside range",
    "invalid range",
    "missing day",
  ])(
    "rejects malformed npm %s without inventing a period or zero",
    async (problem) => {
      const f = fixture();
      if (problem === "package") f.npm.package = "another-package";
      if (problem === "duplicate day") f.npm.downloads.push(f.npm.downloads[0]);
      if (problem === "outside range") f.npm.downloads[0].day = "2026-09-27";
      if (problem === "invalid range") f.npm.start = "2026-10-28";
      if (problem === "missing day") f.npm.downloads.splice(0, 1);
      const result = await collectSnapshot(options, f.adapters);
      expect(result.sources.npm_downloads).toMatchObject({
        status: "error",
        metrics: null,
        period: { start: null, end: null },
      });
    },
  );

  it("does not persist arbitrary adapter error contents", async () => {
    const f = fixture();
    f.adapters.github = async () => {
      throw new Error("secret-token-should-not-be-saved");
    };
    const result = await collectSnapshot(options, f.adapters);
    expect(result.status).toBe("partial");
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(result.sources.github_repository.metrics).toBeNull();
  });

  it("supports scoped npm package names", async () => {
    const f = fixture();
    f.npm.package = "@example/package";
    const result = await collectSnapshot(
      { ...options, package: f.npm.package },
      f.adapters,
    );
    expect(result.sources.npm_downloads.status).toBe("ok");
    expect(f.adapters.npm).toHaveBeenCalledWith(
      "https://api.npmjs.org/downloads/range/last-month/%40example%2Fpackage",
    );
  });

  it("writes a private local snapshot including partial-source status", async () => {
    const f = fixture();
    f.adapters.npm = async () => {
      throw new SourceUnavailable("npm unavailable.");
    };
    const snapshot = await collectSnapshot(options, f.adapters);
    const root = mkdtempSync(join(tmpdir(), "oma-adoption-"));
    roots.push(root);
    const file = writeSnapshot(snapshot, join(root, "nested/snapshot.json"));
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(snapshot);
    if (process.platform !== "win32")
      expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("keeps a replaced snapshot private", async () => {
    const f = fixture();
    const root = mkdtempSync(join(tmpdir(), "oma-adoption-replace-"));
    roots.push(root);
    const path = join(root, "snapshot.json");
    writeFileSync(path, "old snapshot", { mode: 0o644 });
    writeSnapshot(await collectSnapshot(options, f.adapters), path);
    if (process.platform !== "win32")
      expect(statSync(path).mode & 0o777).toBe(0o600);
  });
});

describe("adoption options", () => {
  it("uses the documented defaults", () => {
    expect(parseOptions([])).toEqual({ ...options, out: undefined });
  });

  it.each([
    ["--repo", "missing-owner"],
    ["--repo", "owner/name?token=secret"],
    ["--package", "../package"],
    ["--package", "bad;command"],
    ["--out", ""],
    ["--unknown"],
    ["--repo"],
    ["unexpected-positional"],
  ])("rejects invalid arguments %j before any requests", async (...args) => {
    expect(() => parseOptions(args)).toThrow();
  });

  it("validates direct collector inputs before requesting sources", async () => {
    const f = fixture();
    await expect(
      collectSnapshot({ ...options, repo: "invalid" }, f.adapters),
    ).rejects.toThrow();
    expect(f.adapters.github).not.toHaveBeenCalled();
    expect(f.adapters.npm).not.toHaveBeenCalled();
  });
});
