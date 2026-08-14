import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadHarnessRecord, writeHarnessRecord } from "./records.js";
import type { HarnessArmRun } from "./types.js";

const roots: string[] = [];

function makePath(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-harness-record-"));
  roots.push(root);
  return join(root, "record.json");
}

function makeRun(
  taskId: string,
  arm: "baseline" | "candidate",
  passed: boolean,
): HarnessArmRun {
  return {
    taskId,
    arm,
    passed,
    durationMs: 10,
    output: "",
    checks: [],
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

describe("harness records", () => {
  it("replays only a recording whose provenance hashes match", () => {
    const path = makePath();
    const runs = [
      makeRun("a", "baseline", false),
      makeRun("a", "candidate", true),
    ];
    writeHarnessRecord(path, {
      suiteHash: "suite",
      baselineHash: "baseline",
      candidateHash: "candidate",
      runs,
    });

    expect(
      loadHarnessRecord(path, {
        suiteHash: "suite",
        baselineHash: "baseline",
        candidateHash: "candidate",
      }),
    ).toEqual(runs);
    expect(() =>
      loadHarnessRecord(path, {
        suiteHash: "suite",
        baselineHash: "baseline",
        candidateHash: "changed",
      }),
    ).toThrow(/stale/i);
  });

  it("rejects malformed recorded runs instead of treating them as measurements", () => {
    const path = makePath();
    writeFileSync(
      path,
      JSON.stringify({
        schemaVersion: 1,
        suiteHash: "suite",
        baselineHash: "baseline",
        candidateHash: "candidate",
        runs: [{}],
      }),
      "utf-8",
    );

    expect(() =>
      loadHarnessRecord(path, {
        suiteHash: "suite",
        baselineHash: "baseline",
        candidateHash: "candidate",
      }),
    ).toThrow();
  });
});
