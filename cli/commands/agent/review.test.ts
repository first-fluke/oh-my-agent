import * as child_process from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reviewAgent } from "./review.js";

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  openSync: vi.fn(),
}));

const mockMemoryFunctions = vi.hoisted(() => ({
  getSessionMeta: vi.fn(),
  formatSessionId: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("../../lib/memory.js", () => mockMemoryFunctions);

describe("agent/review.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemoryFunctions.getSessionMeta.mockReturnValue({});
    mockMemoryFunctions.formatSessionId.mockReturnValue(
      "session-20260327-120000",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns codex review with --uncommitted by default", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 44444, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({ model: "codex", workspace: "/tmp" });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "codex",
      ["review", "--uncommitted"],
      expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
    );
  });

  it("spawns codex review without --uncommitted when disabled", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 44445, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({
      model: "codex",
      workspace: "/tmp",
      uncommitted: false,
    });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "codex",
      ["review"],
      expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
    );
  });

  it("spawns claude review with prompt flag and output format", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 44446, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({ model: "claude", workspace: "/tmp" });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining([
        "-p",
        expect.stringContaining("Review the uncommitted changes"),
        "--output-format",
        "text",
      ]),
      expect.objectContaining({ cwd: expect.stringContaining("/tmp") }),
    );
  });

  it("spawns qwen review with prompt flag", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 44447, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({ model: "qwen", workspace: "/tmp" });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "qwen",
      expect.arrayContaining([
        "-p",
        expect.stringContaining("Review the uncommitted changes"),
      ]),
      expect.anything(),
    );
    const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
      | string[]
      | undefined;
    expect(args).not.toContain("--output-format");
  });

  it("uses custom prompt for gemini review", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    const mockChild = { pid: 44448, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({
      model: "gemini",
      workspace: "/tmp",
      prompt: "Check auth logic only",
    });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "gemini",
      expect.arrayContaining([
        "-p",
        expect.stringContaining("Check auth logic only"),
      ]),
      expect.anything(),
    );
    const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
      | string[]
      | undefined;
    expect(args).not.toContain("--output-format");
  });

  it("inlines git diff for committed-only claude review", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.openSync.mockReturnValue(123);

    vi.mocked(child_process.execSync).mockReturnValue(
      "diff --git a/file.ts\n+added line\n",
    );

    const mockChild = { pid: 44449, on: vi.fn(), unref: vi.fn() };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({
      model: "claude",
      workspace: "/tmp",
      uncommitted: false,
    });

    expect(child_process.execSync).toHaveBeenCalledWith(
      "git diff HEAD~1",
      expect.objectContaining({ encoding: "utf-8" }),
    );

    const args = vi.mocked(child_process.spawn).mock.calls[0]?.[1] as
      | string[]
      | undefined;
    const prompt = args?.find((arg) => arg.includes("committed diff"));
    expect(prompt).toContain("```diff");
    expect(prompt).toContain("+added line");
  });

  it("prints review output on exit", async () => {
    mockFsFunctions.existsSync.mockReturnValue(true);
    mockFsFunctions.openSync.mockReturnValue(123);
    mockFsFunctions.readFileSync.mockReturnValue(
      "Found 2 issues:\n- P1: SQL injection\n- P2: Missing auth",
    );

    let exitHandler: ((code: number | null) => void) | undefined;
    const mockChild = {
      pid: 44450,
      on: vi.fn((event: string, handler: (code: number | null) => void) => {
        if (event === "exit") exitHandler = handler;
      }),
      unref: vi.fn(),
    };
    vi.mocked(child_process.spawn).mockReturnValue(
      mockChild as unknown as child_process.ChildProcess,
    );

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error("exit");
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await reviewAgent({ model: "codex", workspace: "/tmp" });

    expect(exitHandler).toBeDefined();
    expect(() => exitHandler?.(0)).toThrow("exit");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("SQL injection"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
