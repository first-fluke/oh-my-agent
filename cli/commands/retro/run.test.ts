import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prompts = vi.hoisted(() => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));
vi.mock("@clack/prompts", () => prompts);

const metrics = vi.hoisted(() => ({ commits: 0 }));
vi.mock("./types.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./types.js")>();
  const snapshot = () => ({ window: "7d", metrics: { ...metrics } });
  return {
    ...actual,
    fetchOrigin: vi.fn(),
    getGitUserName: vi.fn(() => "dev"),
    analyze: vi.fn(snapshot),
    getDisplayData: vi.fn(() => ({ sessions: [], hourly: [] })),
    collectHarnessSignals: vi.fn(() => []),
    saveSnapshot: vi.fn(() => "snapshot.json"),
    loadPreviousSnapshot: vi.fn(() => null),
  };
});

import { retro } from "./run.js";

describe("retro --json", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let clear: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    clear = vi.spyOn(console, "clear").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function onlyJsonDocument(): unknown {
    expect(clear).not.toHaveBeenCalled();
    expect(prompts.intro).not.toHaveBeenCalled();
    expect(prompts.spinner).not.toHaveBeenCalled();
    expect(prompts.note).not.toHaveBeenCalled();
    expect(prompts.outro).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    return JSON.parse(log.mock.calls[0]?.[0] as string);
  }

  it("prints a single JSON document even when the window has no commits", async () => {
    metrics.commits = 0;
    await retro("7d", { json: true });
    expect(onlyJsonDocument()).toMatchObject({
      metrics: { commits: 0 },
      harnessSignals: [],
    });
  });

  it("prints a single JSON document in compare mode", async () => {
    metrics.commits = 3;
    await retro("7d", { json: true, compare: true });
    expect(onlyJsonDocument()).toMatchObject({
      current: { metrics: { commits: 3 } },
      previous: { metrics: { commits: 3 } },
    });
  });

  it("throws an invalid window instead of printing usage notes", async () => {
    await expect(retro("not-a-window", { json: true })).rejects.toThrow();
    expect(prompts.note).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
