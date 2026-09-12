import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureGortexProject,
  ensureGortexRepoExcludes,
  ensureGortexTracked,
  findGortexRepo,
  isForbiddenGortexProjectRoot,
  isGortexTracked,
  listGortexTrackedRepos,
  OMA_GORTEX_EXCLUDES,
  parseGortexRepoExcludes,
} from "./gortex.js";

const PROJECT = resolve("/my/project");
const OTHER = resolve("/other/project");
/** Matches the mocked node:os homedir() below. */
const HOME_DIR = resolve("/mock/home");

const mockExecFileSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ execFileSync: mockExecFileSync }));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => "/mock/home" };
});

type Handlers = {
  version?: () => string;
  repos?: () => string;
  track?: (root: string) => string;
  list?: () => string;
  add?: (repo: string, pattern: string) => string;
};

/** Route mocked `gortex` invocations by subcommand. */
function stubGortex(handlers: Handlers) {
  mockExecFileSync.mockImplementation((cmd: string, args: string[]) => {
    expect(cmd).toBe("gortex");
    const [head, ...rest] = args;
    if (head === "version") return handlers.version?.() ?? "gortex v0.64.1";
    if (head === "repos") return must(handlers.repos, args)();
    if (head === "track") return must(handlers.track, args)(rest[0] as string);
    if (head === "config" && rest[0] === "exclude" && rest[1] === "list")
      return must(handlers.list, args)();
    if (head === "config" && rest[0] === "exclude" && rest[1] === "add")
      return must(handlers.add, args)(rest[3] as string, rest[4] as string);
    throw new Error(`unexpected gortex ${args.join(" ")}`);
  });
}

function must<T>(handler: T | undefined, args: string[]): T {
  if (!handler) throw new Error(`unexpected gortex ${args.join(" ")}`);
  return handler;
}

function timeoutError(): Error {
  return Object.assign(new Error("spawnSync gortex ETIMEDOUT"), {
    killed: true,
    signal: "SIGTERM",
    code: "ETIMEDOUT",
  });
}

function reposJson(paths: string[]): string {
  return JSON.stringify(
    paths.map((path) => ({ name: path.split("/").pop(), path, stale: false })),
  );
}

function listing(repo: string, patterns: string[]): string {
  return [
    "[builtin] node_modules/",
    "[global          ] .ruff_cache/",
    ...patterns.map((p) => `[repo:${repo}] ${p}`),
    "[repo:someone-else] .agents/state/",
    "",
  ].join("\n");
}

function calls(): string[][] {
  return mockExecFileSync.mock.calls.map((c) => c[1] as string[]);
}

function addCalls(): string[] {
  return calls()
    .filter((a) => a[0] === "config" && a[2] === "add")
    .map((a) => a[5] as string);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tracked set", () => {
  it("parses `gortex repos --json` into name + resolved path", () => {
    stubGortex({ repos: () => reposJson([OTHER, PROJECT]) });
    expect(listGortexTrackedRepos()).toEqual([
      { name: "project", path: OTHER },
      { name: "project", path: PROJECT },
    ]);
    expect(findGortexRepo(PROJECT)).toEqual({ name: "project", path: PROJECT });
    expect(findGortexRepo(resolve("/nope"))).toBeUndefined();
    expect(isGortexTracked(PROJECT)).toBe(true);
    expect(isGortexTracked(resolve("/nope"))).toBe(false);
  });

  it("reports unknown (null) when the tracked set cannot be read", () => {
    stubGortex({
      repos: () => {
        throw new Error("daemon unresponsive");
      },
    });
    expect(listGortexTrackedRepos()).toBeNull();
    expect(findGortexRepo(PROJECT)).toBeNull();
    expect(isGortexTracked(PROJECT)).toBeNull();
  });

  it("tolerates malformed JSON entries and falls back to path as name", () => {
    stubGortex({
      repos: () => JSON.stringify([{ name: "x" }, null, 3, { path: OTHER }]),
    });
    expect(listGortexTrackedRepos()).toEqual([{ name: OTHER, path: OTHER }]);
  });
});

describe("ensureGortexTracked", () => {
  it("never re-tracks an already tracked root", () => {
    stubGortex({ repos: () => reposJson([PROJECT]) });
    expect(ensureGortexTracked(PROJECT)).toBe("already");
    expect(calls().some((a) => a[0] === "track")).toBe(false);
  });

  it("tracks an untracked root", () => {
    stubGortex({ repos: () => reposJson([OTHER]), track: () => "" });
    expect(ensureGortexTracked(PROJECT)).toBe("tracked");
    expect(calls()).toContainEqual(["track", PROJECT]);
  });

  it("confirms registration via the tracked set when `track` outlives its budget", () => {
    let reposCalls = 0;
    stubGortex({
      repos: () => reposJson(reposCalls++ === 0 ? [OTHER] : [OTHER, PROJECT]),
      track: () => {
        throw timeoutError();
      },
    });
    expect(ensureGortexTracked(PROJECT)).toBe("tracked");
  });

  it("reports started when a timed-out `track` cannot be confirmed yet", () => {
    stubGortex({
      repos: () => reposJson([OTHER]),
      track: () => {
        throw timeoutError();
      },
    });
    expect(ensureGortexTracked(PROJECT)).toBe("started");
  });

  it("reports failed on a non-timeout track error", () => {
    stubGortex({
      repos: () => reposJson([OTHER]),
      track: () => {
        throw new Error("exit 1");
      },
    });
    expect(ensureGortexTracked(PROJECT)).toBe("failed");
  });

  it("does nothing when the tracked set is unknown", () => {
    stubGortex({
      repos: () => {
        throw new Error("no daemon");
      },
    });
    expect(ensureGortexTracked(PROJECT)).toBe("unknown");
    expect(calls().some((a) => a[0] === "track")).toBe(false);
  });

  it("refuses $HOME", () => {
    expect(isForbiddenGortexProjectRoot(HOME_DIR)).toBe(true);
    stubGortex({ repos: () => reposJson([]) });
    expect(ensureGortexTracked(HOME_DIR)).toBe("skipped");
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});

describe("parseGortexRepoExcludes", () => {
  it("returns only the named repo's patterns", () => {
    const text = listing("project", [".agents/results/", "foo/"]);
    expect(parseGortexRepoExcludes(text, "project")).toEqual([
      ".agents/results/",
      "foo/",
    ]);
    expect(parseGortexRepoExcludes(text, "someone-else")).toEqual([
      ".agents/state/",
    ]);
    expect(parseGortexRepoExcludes(text, "absent")).toEqual([]);
  });

  it("tolerates padded markers and trailing whitespace", () => {
    const text = "[repo:project      ]   .turbo/   \n[global   ] x/\n";
    expect(parseGortexRepoExcludes(text, "project")).toEqual([".turbo/"]);
  });
});

describe("ensureGortexRepoExcludes", () => {
  it("adds only the missing patterns through the per-repo CLI layer", () => {
    stubGortex({
      list: () => listing("project", [".ruff_cache/", "user-pattern/"]),
      add: () => "[gortex] added",
    });
    const outcome = ensureGortexRepoExcludes("project");
    expect(outcome.status).toBe("reconciled");
    expect(outcome.added).not.toContain(".ruff_cache/");
    expect(outcome.added).toContain(".agents/results/");
    expect(addCalls()).toEqual(outcome.added);
    // Every add targets the repo entry, never the global or workspace layer.
    for (const args of calls().filter((a) => a[2] === "add")) {
      expect(args.slice(0, 5)).toEqual([
        "config",
        "exclude",
        "add",
        "--repo",
        "project",
      ]);
    }
  });

  it("is a no-op when every pattern is present", () => {
    stubGortex({ list: () => listing("project", [...OMA_GORTEX_EXCLUDES]) });
    expect(ensureGortexRepoExcludes("project")).toEqual({
      status: "unchanged",
      added: [],
    });
    expect(addCalls()).toEqual([]);
  });

  it("writes nothing when the current list cannot be read", () => {
    stubGortex({
      list: () => {
        throw new Error("daemon unresponsive");
      },
    });
    expect(ensureGortexRepoExcludes("project")).toEqual({
      status: "unknown",
      added: [],
    });
    expect(addCalls()).toEqual([]);
  });

  it("stops at the first failing add and reports what landed", () => {
    let adds = 0;
    stubGortex({
      list: () => listing("project", []),
      add: () => {
        if (adds++ === 2) throw new Error("daemon busy");
        return "[gortex] added";
      },
    });
    const outcome = ensureGortexRepoExcludes("project");
    expect(outcome.status).toBe("reconciled");
    expect(outcome.added).toEqual(OMA_GORTEX_EXCLUDES.slice(0, 2));
  });
});

describe("ensureGortexProject", () => {
  it("tracks a fresh root, then attaches excludes to its new entry", () => {
    let reposCalls = 0;
    stubGortex({
      repos: () => reposJson(reposCalls++ === 0 ? [OTHER] : [OTHER, PROJECT]),
      track: () => "",
      list: () => listing("project", []),
      add: () => "[gortex] added",
    });
    expect(ensureGortexProject(PROJECT)).toEqual({
      binaryAvailable: true,
      tracked: "tracked",
      excludes: { status: "reconciled", added: [...OMA_GORTEX_EXCLUDES] },
    });
  });

  it("reconciles excludes for an already tracked root", () => {
    stubGortex({
      repos: () => reposJson([PROJECT]),
      list: () => listing("project", [".agents/results/"]),
      add: () => "[gortex] added",
    });
    const outcome = ensureGortexProject(PROJECT);
    expect(outcome.tracked).toBe("already");
    expect(outcome.excludes.status).toBe("reconciled");
    expect(outcome.excludes.added).not.toContain(".agents/results/");
  });

  it("is a complete no-op on a converged project", () => {
    stubGortex({
      repos: () => reposJson([PROJECT]),
      list: () => listing("project", [...OMA_GORTEX_EXCLUDES]),
    });
    expect(ensureGortexProject(PROJECT)).toEqual({
      binaryAvailable: true,
      tracked: "already",
      excludes: { status: "unchanged", added: [] },
    });
    expect(calls().some((a) => a[0] === "track" || a[2] === "add")).toBe(false);
  });

  it("skips excludes when tracking could not be confirmed", () => {
    stubGortex({
      repos: () => reposJson([OTHER]),
      track: () => {
        throw timeoutError();
      },
    });
    expect(ensureGortexProject(PROJECT)).toEqual({
      binaryAvailable: true,
      tracked: "started",
      excludes: { status: "skipped", added: [] },
    });
  });

  it("does nothing when the binary is missing", () => {
    stubGortex({
      version: () => {
        throw new Error("ENOENT");
      },
    });
    expect(ensureGortexProject(PROJECT)).toEqual({
      binaryAvailable: false,
      tracked: "skipped",
      excludes: { status: "skipped", added: [] },
    });
    expect(calls().map((a) => a[0])).toEqual(["version"]);
  });

  it("does nothing at all for $HOME", () => {
    expect(ensureGortexProject(HOME_DIR)).toEqual({
      binaryAvailable: false,
      tracked: "skipped",
      excludes: { status: "skipped", added: [] },
    });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
