import { describe, expect, it } from "vitest";
import { isolateEvalMemory, isolateEvalRuntime } from "./dispatch.js";

describe("evaluation memory isolation", () => {
  it("disables AgentMemory without mutating the original invocation", () => {
    const invocation = {
      command: "agent-cli",
      args: ["--prompt", "task"],
      env: { KEEP: "1", OMA_NO_AGENTMEMORY: "0" },
    };
    const isolated = isolateEvalMemory(invocation);

    expect(isolated.env).toMatchObject({
      KEEP: "1",
      OMA_NO_AGENTMEMORY: "1",
    });
    expect(invocation.env.OMA_NO_AGENTMEMORY).toBe("0");
    expect(isolated.args).toBe(invocation.args);
  });

  it("confines Claude eval arms and disables ambient tools and skills", () => {
    const invocation = {
      command: "claude",
      args: ["-p", "task"],
      env: { KEEP: "1" },
    };
    const isolated = isolateEvalRuntime(invocation, "claude");

    expect(isolated.args).toEqual([
      "-p",
      "task",
      "--restricted",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--tools",
      "",
    ]);
    expect(isolated.env.OMA_NO_AGENTMEMORY).toBe("1");
    expect(invocation.args).toEqual(["-p", "task"]);
  });

  it("only applies memory isolation to vendors without a proven sandbox", () => {
    const invocation = {
      command: "other-cli",
      args: ["task"],
      env: {},
    };
    const isolated = isolateEvalRuntime(invocation, "qwen");

    expect(isolated.args).toEqual(["task"]);
    expect(isolated.env.OMA_NO_AGENTMEMORY).toBe("1");
  });
});
