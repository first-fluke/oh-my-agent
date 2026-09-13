import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  HARNESS_STDERR_LIMIT,
  HarnessDispatchError,
  runHarnessInvocation,
} from "./dispatch.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-harness-dispatch-"));
  roots.push(root);
  return root;
}

function nodeInvocation(script: string) {
  return {
    command: process.execPath,
    args: ["-e", script],
    env: { PATH: process.env.PATH ?? "" },
  };
}

describe("runHarnessInvocation", () => {
  it("preserves partial stdout, bounded stderr, and the exit code of a failed process", () => {
    const noise = "x".repeat(HARNESS_STDERR_LIMIT + 50);
    const script = `process.stdout.write("partial answer");process.stderr.write(${JSON.stringify(noise)} + "TAIL");process.exit(3)`;
    let caught: unknown;
    try {
      runHarnessInvocation(
        nodeInvocation(script),
        workspace(),
        "prompt",
        null,
        10_000,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(HarnessDispatchError);
    const failure = caught as HarnessDispatchError;
    expect(failure.output).toBe("partial answer");
    expect(failure.exitCode).toBe(3);
    expect(failure.timedOut).toBe(false);
    expect(failure.stderr.endsWith("TAIL")).toBe(true);
    expect(failure.stderr).toHaveLength(HARNESS_STDERR_LIMIT);
    expect(failure.stderrTruncated).toBe(true);
    expect(failure.message).toContain("exit 3");
  });

  it("marks a wall-clock timeout instead of reporting a plain exit failure", () => {
    let caught: unknown;
    try {
      runHarnessInvocation(
        nodeInvocation("setTimeout(() => {}, 30000)"),
        workspace(),
        "prompt",
        null,
        300,
      );
    } catch (error) {
      caught = error;
    }
    const failure = caught as HarnessDispatchError;
    expect(failure).toBeInstanceOf(HarnessDispatchError);
    expect(failure.timedOut).toBe(true);
    expect(failure.exitCode).toBeNull();
    expect(failure.message).toContain("timed out");
  });

  it("treats a vendor error envelope as a failure that keeps the raw text", () => {
    const envelope = JSON.stringify({ is_error: true, result: "quota" });
    const script = `process.stdout.write(${JSON.stringify(envelope)})`;
    expect(() =>
      runHarnessInvocation(
        nodeInvocation(script),
        workspace(),
        "prompt",
        null,
        10_000,
      ),
    ).toThrow(HarnessDispatchError);
    try {
      runHarnessInvocation(
        nodeInvocation(script),
        workspace(),
        "prompt",
        null,
        10_000,
      );
    } catch (error) {
      const failure = error as HarnessDispatchError;
      expect(failure.message).toBe("quota");
      expect(failure.exitCode).toBe(0);
      expect(failure.output).toBe(envelope);
    }
  });

  it("returns stdout for a successful process with unknown usage", () => {
    expect(
      runHarnessInvocation(
        nodeInvocation('process.stdout.write("done")'),
        workspace(),
        "prompt",
        null,
        10_000,
      ),
    ).toEqual({
      output: "done",
      usage: {
        status: "unknown",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: null,
        durationMs: null,
        model: null,
      },
    });
  });

  it("unwraps a vendor result envelope and keeps its usage", () => {
    const envelope = JSON.stringify({
      type: "result",
      is_error: false,
      subagent_stats: { failed: 0 },
      result: "the edit is done",
      total_cost_usd: 0.0421,
      duration_ms: 1234,
      usage: {
        input_tokens: 10,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 300,
        output_tokens: 45,
      },
      modelUsage: {
        "claude-haiku-4-5": { outputTokens: 3 },
        "claude-sonnet-4-6": { outputTokens: 42 },
      },
    });
    const script = `process.stdout.write(${JSON.stringify(envelope)})`;
    expect(
      runHarnessInvocation(
        nodeInvocation(script),
        workspace(),
        "prompt",
        null,
        10_000,
      ),
    ).toEqual({
      output: "the edit is done",
      usage: {
        status: "actual",
        inputTokens: 510,
        outputTokens: 45,
        costUsd: 0.0421,
        durationMs: 1234,
        model: "claude-sonnet-4-6",
      },
    });
  });
});
