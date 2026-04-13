import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs modules before importing parsers
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockCreateReadStream = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockReaddirSync = vi.hoisted(() => vi.fn());

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: mockExistsSync,
    createReadStream: mockCreateReadStream,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
  };
});

// Mock readline to simulate JSONL streaming
vi.mock("node:readline", () => ({
  createInterface: vi.fn(({ input }: { input: { lines: string[] } }) => {
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const line of input.lines || []) {
          yield line;
        }
      },
    };
  }),
}));

// Mock better-sqlite3 (cursor parser)
vi.mock("better-sqlite3", () => {
  return { default: null };
});

import { collectRecap } from "../lib/recap/index.js";

describe("collectRecap", () => {
  const NOW = 1776000000000; // fixed timestamp

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty result when no history files exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await collectRecap({ window: "1d" });

    expect(result.stats.totalPrompts).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it("parses claude history entries within window", async () => {
    const start = NOW - 86_400_000;
    const ts1 = start + 1000;
    const ts2 = start + 2000;
    const tsOutOfRange = NOW - 86_400_000 * 5; // 5 days ago

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes(".claude");
    });

    mockCreateReadStream.mockReturnValue({
      lines: [
        JSON.stringify({
          display: "hello",
          timestamp: ts1,
          project: "/home/user/myproject",
          sessionId: "s1",
        }),
        JSON.stringify({
          display: "world",
          timestamp: ts2,
          project: "/home/user/myproject",
          sessionId: "s1",
        }),
        JSON.stringify({
          display: "old",
          timestamp: tsOutOfRange,
          project: "/home/user/old",
          sessionId: "s2",
        }),
        "", // empty line
        "invalid json",
      ],
    });

    const result = await collectRecap({ window: "1d" });

    expect(result.stats.totalPrompts).toBe(2);
    expect(result.entries[0].tool).toBe("claude");
    expect(result.entries[0].prompt).toBe("hello");
    expect(result.entries[0].project).toBe("myproject");
    expect(result.stats.byTool.claude).toBe(2);
  });

  it("parses codex history with Unix sec to ms conversion", async () => {
    const start = NOW - 86_400_000;
    const tsSec = Math.floor((start + 5000) / 1000);

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes(".codex");
    });

    mockCreateReadStream.mockReturnValue({
      lines: [
        JSON.stringify({
          text: "codex prompt",
          ts: tsSec,
          session_id: "cs1",
        }),
      ],
    });

    const result = await collectRecap({ window: "1d", tool: "codex" });

    expect(result.stats.totalPrompts).toBe(1);
    expect(result.entries[0].tool).toBe("codex");
    expect(result.entries[0].prompt).toBe("codex prompt");
    expect(result.entries[0].timestamp).toBe(tsSec * 1000);
  });

  it("filters by tool", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await collectRecap({
      window: "1d",
      tool: "gemini,qwen",
    });

    expect(result.stats.totalPrompts).toBe(0);
  });

  it("sorts entries by timestamp", async () => {
    const start = NOW - 86_400_000;

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes(".claude");
    });

    mockCreateReadStream.mockReturnValue({
      lines: [
        JSON.stringify({
          display: "second",
          timestamp: start + 2000,
          project: "/p",
        }),
        JSON.stringify({
          display: "first",
          timestamp: start + 1000,
          project: "/p",
        }),
      ],
    });

    const result = await collectRecap({ window: "1d", tool: "claude" });

    expect(result.entries[0].prompt).toBe("first");
    expect(result.entries[1].prompt).toBe("second");
  });

  it("computes top projects with limit", async () => {
    const start = NOW - 86_400_000;

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes(".claude");
    });

    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push(
        JSON.stringify({
          display: `p1-${i}`,
          timestamp: start + i * 1000,
          project: "/proj/alpha",
        }),
      );
    }
    for (let i = 0; i < 5; i++) {
      lines.push(
        JSON.stringify({
          display: `p2-${i}`,
          timestamp: start + (10 + i) * 1000,
          project: "/proj/beta",
        }),
      );
    }

    mockCreateReadStream.mockReturnValue({ lines });

    const result = await collectRecap({
      window: "1d",
      tool: "claude",
      top: 1,
    });

    expect(result.stats.topProjects).toHaveLength(1);
    expect(result.stats.topProjects[0].name).toBe("alpha");
    expect(result.stats.topProjects[0].count).toBe(10);
  });

  it("supports duration sort", async () => {
    const start = NOW - 86_400_000;

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes(".claude");
    });

    // alpha: 2 prompts, 1s apart
    // beta: 2 prompts, 1h apart
    mockCreateReadStream.mockReturnValue({
      lines: [
        JSON.stringify({
          display: "a1",
          timestamp: start + 1000,
          project: "/proj/alpha",
        }),
        JSON.stringify({
          display: "a2",
          timestamp: start + 2000,
          project: "/proj/alpha",
        }),
        JSON.stringify({
          display: "b1",
          timestamp: start + 1000,
          project: "/proj/beta",
        }),
        JSON.stringify({
          display: "b2",
          timestamp: start + 3_601_000,
          project: "/proj/beta",
        }),
      ],
    });

    const result = await collectRecap({
      window: "1d",
      tool: "claude",
      sort: "duration",
    });

    expect(result.stats.topProjects[0].name).toBe("beta");
  });

  it("includes window bounds and timezone", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await collectRecap({ window: "1d" });

    expect(result.window.end).toBe(NOW);
    expect(result.window.end - result.window.start).toBe(86_400_000);
    expect(result.timezone).toBeTruthy();
  });
});
