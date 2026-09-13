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

  it("returns stdout for a successful process", () => {
    expect(
      runHarnessInvocation(
        nodeInvocation('process.stdout.write("done")'),
        workspace(),
        "prompt",
        null,
        10_000,
      ),
    ).toBe("done");
  });
});
