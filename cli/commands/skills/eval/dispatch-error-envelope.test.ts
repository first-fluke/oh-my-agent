import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runEvalDispatch,
  runEvalDispatchDetailed,
  warnOnErrorEnvelope,
} from "./dispatch.js";
import { collectLiveRollouts } from "./rollouts.js";
import { scoreSkillBody } from "./score-skill-body.js";
import type { LiveDispatchFn, TaskFixture } from "./types.js";

describe("warnOnErrorEnvelope", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns on a claude error envelope that exited 0 (session limit 429)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const envelope = JSON.stringify({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your session limit · resets 6:40pm",
      type: "result",
    });

    expect(warnOnErrorEnvelope(envelope)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("HTTP 429"));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("session limit"),
    );
  });

  it("stays silent for a successful envelope", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const envelope = JSON.stringify({
      is_error: false,
      result: "the answer",
      type: "result",
    });

    expect(warnOnErrorEnvelope(envelope)).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("stays silent for plain-text and malformed output", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(warnOnErrorEnvelope("plain text answer")).toBe(false);
    expect(warnOnErrorEnvelope("{not json")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns the answer text from a successful vendor envelope", () => {
    const output = runEvalDispatch(
      {
        command: process.execPath,
        args: [
          "-e",
          "process.stdout.write(JSON.stringify({type:'result',is_error:false,subagent_stats:{failed:0},result:'the answer'}))",
        ],
        env: process.env,
        outputKind: "vendor-envelope",
      },
      tmpdir(),
      "prompt",
      null,
    );
    expect(output).toBe("the answer");
    const detailed = runEvalDispatchDetailed(
      {
        command: process.execPath,
        args: [
          "-e",
          "process.stdout.write(JSON.stringify({type:'result',is_error:false,result:'the answer',total_cost_usd:0.02,usage:{input_tokens:5,output_tokens:6}}))",
        ],
        env: process.env,
        outputKind: "vendor-envelope",
      },
      tmpdir(),
      "prompt",
      null,
    );
    expect(detailed).toEqual({
      output: "the answer",
      usage: {
        status: "actual",
        inputTokens: 5,
        outputTokens: 6,
        costUsd: 0.02,
        durationMs: null,
        model: null,
      },
    });
  });

  it("rejects an API error envelope even when the process exits successfully", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      runEvalDispatch(
        {
          command: process.execPath,
          args: [
            "-e",
            "process.stdout.write(JSON.stringify({is_error:true,result:'EXPECTED partial output',api_error_status:429}))",
          ],
          env: process.env,
        },
        tmpdir(),
        "prompt",
        null,
      ),
    ).toThrow("API error envelope");
  });

  it("excludes both arms when an answer or judge dispatch fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const task: TaskFixture = {
      id: "dispatch-error",
      skill: "skill-x",
      domain: "test",
      prompt: "Return EXPECTED",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
      weight: 1,
    };
    const dispatch: LiveDispatchFn = (arm) => {
      if (arm === "treatment") throw new Error("runtime unavailable");
      return "EXPECTED";
    };
    const collected = collectLiveRollouts([task], "body", dispatch, tmpdir());
    try {
      expect(collected.rollouts).toEqual([]);
    } finally {
      collected.cleanupTmp();
    }
    const report = await scoreSkillBody({
      skill: "skill-x",
      body: "body",
      tasks: [task],
      mode: "live",
      minimumCoverage: 1,
      dispatchFn: dispatch,
    });
    expect(report.coverage).toBe("insufficient");
    expect(report.findings).toEqual([]);
    const judged = collectLiveRollouts(
      [{ ...task, checker: { type: "judge" } }],
      "body",
      () => "EXPECTED",
      tmpdir(),
      () => {
        throw new Error("judge unavailable");
      },
    );
    try {
      expect(judged.rollouts).toEqual([]);
    } finally {
      judged.cleanupTmp();
    }
  });
});
