import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planDispatch } from "../../../io/runtime-dispatch.js";
import {
  buildJudgeDispatchFn,
  buildLiveDispatchFn,
  EvalDispatchError,
} from "./dispatch.js";
import { awaitDispatchResult } from "./envelope.js";

const { cleanupProtectedWorkspace } = vi.hoisted(() => ({
  cleanupProtectedWorkspace: vi.fn(),
}));

vi.mock("node:child_process", () => {
  const execFileSync = vi.fn();
  // The async runner streams the prompt over stdin; replay it through the
  // synchronous mock so existing assertions on `options.input` still hold.
  const execFile = vi.fn(
    (
      command: string,
      args: string[],
      options: Record<string, unknown>,
      callback: (error: unknown, stdout: string, stderr: string) => void,
    ) => ({
      stdin: {
        end(data?: string) {
          try {
            const stdout = execFileSync(command, args, {
              ...options,
              input: data,
            });
            queueMicrotask(() => callback(null, String(stdout ?? ""), ""));
          } catch (error) {
            const failure = error as { stdout?: string; stderr?: string };
            queueMicrotask(() =>
              callback(error, failure.stdout ?? "", failure.stderr ?? ""),
            );
          }
        },
      },
    }),
  );
  return { execFileSync, execFile };
});
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

  it("routes both live arms and judges through native protected text with the same model", async () => {
    vi.mocked(execFileSync).mockReturnValue("completed answer");
    const live = buildLiveDispatchFn("/project");
    expect(
      (
        await awaitDispatchResult(
          live("baseline", "baseline prompt", "/project"),
        )
      ).output,
    ).toBe("completed answer");
    expect(
      (
        await awaitDispatchResult(
          live("treatment", "treatment prompt", "/project"),
        )
      ).output,
    ).toBe("completed answer");
    expect(
      (await awaitDispatchResult(buildJudgeDispatchFn()("grading prompt")))
        .output,
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

  it("preserves domain JSON after the transport has validated successful completion", async () => {
    const output = '{"is_error":true,"result":"domain data"}';
    vi.mocked(execFileSync).mockReturnValue(output);
    expect(
      (
        await awaitDispatchResult(
          buildLiveDispatchFn("/project")("baseline", "prompt", "/project"),
        )
      ).output,
    ).toBe(output);
  });

  it("rejects failed protected calls even when stdout claims success", async () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw Object.assign(new Error("failed"), {
        status: 1,
        stdout: "perfect answer",
      });
    });
    await expect(
      buildLiveDispatchFn("/project")("baseline", "prompt", "/project"),
    ).rejects.toThrow(EvalDispatchError);
    await expect(buildJudgeDispatchFn()("prompt")).rejects.toThrow(
      EvalDispatchError,
    );
    expect(cleanupProtectedWorkspace).toHaveBeenCalledTimes(2);
  });
});
