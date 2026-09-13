import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planDispatch } from "../../../io/runtime-dispatch.js";
import {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  EvalDispatchError,
} from "./dispatch.js";
import { resolveDispatchResult } from "./envelope.js";

const { cleanupProtectedWorkspace } = vi.hoisted(() => ({
  cleanupProtectedWorkspace: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("../../../io/protected-text.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../io/protected-text.js")>()),
  prepareProtectedTextWorkspace: vi.fn((invocation) => ({
    invocation,
    cleanup: cleanupProtectedWorkspace,
  })),
}));
vi.mock("../../../platform/agent-config.js", () => ({
  resolveVendor: vi.fn(() => ({ vendor: "codex", config: {} })),
  resolvePromptFlag: vi.fn(() => null),
}));
vi.mock("../../../io/runtime-dispatch/resolve-plan.js", () => ({
  resolveAgentPlan: vi.fn(() => ({
    cli: "codex",
    cliModel: "configured-model",
    effort: "high",
  })),
}));
vi.mock("../../../io/runtime-dispatch.js", () => ({
  planDispatch: vi.fn(() => ({
    invocation: {
      command: "codex",
      args: ["exec", "-m", "configured-model", "@eval-agent"],
      env: { CODEX_HOME: "/existing-login" },
    },
  })),
}));

describe("Codex protected evaluation dispatch", () => {
  afterEach(() => vi.clearAllMocks());

  it("routes both live arms and judges through native protected text with the same model", () => {
    vi.mocked(execFileSync).mockReturnValue("completed answer");
    const live = buildLiveDispatchFn("/project");
    expect(
      resolveDispatchResult(live("baseline", "baseline prompt", "/project"))
        .output,
    ).toBe("completed answer");
    expect(
      resolveDispatchResult(live("treatment", "treatment prompt", "/project"))
        .output,
    ).toBe("completed answer");
    expect(
      resolveDispatchResult(buildJudgeDispatchFn()("grading prompt")).output,
    ).toBe("completed answer");
    expect(planDispatch).toHaveBeenCalledTimes(3);
    const requests = vi
      .mocked(execFileSync)
      .mock.calls.map(([command, args, options]) => {
        expect(command).toBe(process.execPath);
        expect(args?.[0]).toBe("--eval");
        expect(options?.env?.CODEX_HOME).toBe("/existing-login");
        return JSON.parse(String(options?.input));
      });
    expect(requests.map((r) => r.prompt)).toEqual([
      "baseline prompt",
      "treatment prompt",
      "grading prompt",
    ]);
    for (const request of requests)
      expect(request).toMatchObject({
        command: "codex",
        model: "configured-model",
        effort: "high",
      });
  });

  it("preserves domain JSON after the transport has validated successful completion", () => {
    const output = '{"is_error":true,"result":"domain data"}';
    vi.mocked(execFileSync).mockReturnValue(output);
    expect(
      resolveDispatchResult(
        buildLiveDispatchFn("/project")("baseline", "prompt", "/project"),
      ).output,
    ).toBe(output);
  });

  it("rejects failed protected calls even when stdout claims success", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw Object.assign(new Error("failed"), {
        status: 1,
        stdout: "perfect answer",
      });
    });
    expect(() =>
      buildLiveDispatchFn("/project")("baseline", "prompt", "/project"),
    ).toThrow(EvalDispatchError);
    expect(() => buildJudgeDispatchFn()("prompt")).toThrow(EvalDispatchError);
    expect(cleanupProtectedWorkspace).toHaveBeenCalledTimes(2);
  });
});
