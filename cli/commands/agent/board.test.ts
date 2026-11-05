import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildQwenBoardArgs,
  runQwenBoard,
  supportsQwenBoard,
} from "./board.js";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

describe("Qwen board adapter", () => {
  afterEach(() => vi.resetAllMocks());

  it("requires an advertised command rather than accepting root-help fallback", () => {
    expect(
      supportsQwenBoard(
        "Commands:\n  qwen [query..]  Launch CLI\n  qwen mcp  Manage MCP\n",
      ),
    ).toBe(false);
    expect(
      supportsQwenBoard(
        "Commands:\n  qwen board <command>  Manage agent boards\n",
      ),
    ).toBe(true);
    expect(supportsQwenBoard("A future release could add qwen board.")).toBe(
      false,
    );
  });

  it("builds documented task and question commands with explicit actors", () => {
    expect(
      buildQwenBoardArgs("task", ["Check API response"], {
        board: "orders",
        actor: "api",
        owner: "web",
      }),
    ).toEqual([
      "board",
      "task",
      "Check API response",
      "--board",
      "orders",
      "--as",
      "api",
      "--owner",
      "web",
    ]);
    expect(
      buildQwenBoardArgs("ask", ["web", "Is status text?"], {
        board: "orders",
        actor: "api",
        json: true,
      }),
    ).toEqual([
      "board",
      "ask",
      "web",
      "Is status text?",
      "--board",
      "orders",
      "--as",
      "api",
      "--json",
    ]);
    expect(
      buildQwenBoardArgs("show", [], { board: "orders", json: true }),
    ).toEqual(["board", "show", "--board", "orders", "--json"]);
  });

  it("rejects missing actors and unsupported lifecycle commands before probing Qwen", () => {
    expect(() => runQwenBoard("task", ["Work"], { board: "orders" })).toThrow(
      /--actor/,
    );
    expect(() =>
      runQwenBoard("join", ["orders"], { board: "orders", actor: "api" }),
    ).toThrow(/expects/);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("does not send a board operation to an installed CLI without board support", () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: "Commands:\n  qwen mcp  Manage MCP",
      stderr: "",
    } as ReturnType<typeof spawnSync>);
    expect(() => runQwenBoard("show", [], { board: "orders" })).toThrow(
      /does not advertise/,
    );
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      "qwen",
      ["--help"],
      expect.objectContaining({ timeout: 3000 }),
    );
  });

  it("dispatches one explicit local operation after a successful capability probe", () => {
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        status: 0,
        stdout: "  qwen board <command>  Agent boards",
        stderr: "",
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as ReturnType<
        typeof spawnSync
      >);
    runQwenBoard("done", ["task-1"], {
      board: "orders",
      actor: "api",
      note: "Verified numeric status",
    });
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "qwen",
      [
        "board",
        "done",
        "task-1",
        "--board",
        "orders",
        "--as",
        "api",
        "--note",
        "Verified numeric status",
      ],
      expect.objectContaining({ timeout: 10000 }),
    );
  });

  it("reports failures without retrying a possibly completed mutation", () => {
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        status: 0,
        stdout: "  qwen board <command>  Agent boards",
        stderr: "",
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "" } as ReturnType<
        typeof spawnSync
      >);
    expect(() =>
      runQwenBoard("task", ["Work"], { board: "orders", actor: "api" }),
    ).toThrow(/exited with 1/);
    expect(spawnSync).toHaveBeenCalledTimes(2);
  });

  it("does not retry an operation after its timeout", () => {
    const timeout = Object.assign(new Error("spawnSync qwen ETIMEDOUT"), {
      code: "ETIMEDOUT",
    });
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        status: 0,
        stdout: "  qwen board <command>  Agent boards",
        stderr: "",
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({
        pid: 1234,
        status: null,
        signal: "SIGTERM",
        output: [null, "", ""],
        error: timeout,
        stdout: "",
        stderr: "",
      });
    expect(() =>
      runQwenBoard("claim", ["task-1"], { board: "orders", actor: "api" }),
    ).toThrow(timeout);
    expect(spawnSync).toHaveBeenCalledTimes(2);
  });
});
