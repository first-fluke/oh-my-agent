import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { incidentSpecSkeleton, scanHarnessIncidents } from "./incident-scan.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function run(
  root: string,
  runId: string,
  status: string,
  extra: Record<string, unknown> = {},
): void {
  const dir = join(root, ".agents", "state", "agent-runs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${runId}.json`),
    JSON.stringify({
      schemaVersion: 1,
      runId,
      sequence: 1,
      taskId: "task-a",
      sessionId: "s1",
      agentId: "backend",
      vendor: "codex",
      runnerPid: 1,
      workspace: root,
      artifactRoot: root,
      startedAt: "2026-09-13T00:00:00.000Z",
      finishedAt: "2026-09-13T00:01:00.000Z",
      status,
      before: "a".repeat(64),
      checks: [],
      changedFiles: [],
      unresolved: [],
      artifacts: {},
      ...extra,
    }),
  );
}

describe("incident scan", () => {
  it("lists uncaptured failed runs newest first and skips captured or successful ones", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-incident-scan-"));
    roots.push(root);
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    const c = "33333333-3333-4333-8333-333333333333";
    const d = "44444444-4444-4444-8444-444444444444";
    run(root, a, "failed", {
      exitCode: 1,
      unresolved: ["Missing structured result"],
      dispatch: { prompt: "do the thing" },
      finishedAt: "2026-09-13T00:05:00.000Z",
    });
    run(root, b, "completed");
    run(root, c, "blocked", { finishedAt: "2026-09-13T00:02:00.000Z" });
    run(root, d, "failed");
    const incidentDir = join(root, ".agents", "results", "incidents", "x");
    mkdirSync(incidentDir, { recursive: true });
    writeFileSync(
      join(incidentDir, "incident.json"),
      JSON.stringify({ source: { runId: d } }),
    );

    const result = scanHarnessIncidents(root);
    expect(result.scannedRuns).toBe(4);
    expect(result.alreadyCaptured).toBe(1);
    expect(result.candidates.map((item) => [item.runId, item.status])).toEqual([
      [a, "failed"],
      [c, "blocked"],
    ]);
    expect(result.candidates[0]).toMatchObject({
      hasPrompt: true,
      exitCode: 1,
      unresolved: ["Missing structured result"],
    });
    expect(scanHarnessIncidents(root, { limit: 1 }).candidates).toHaveLength(1);
    expect(
      scanHarnessIncidents(root, { statuses: ["blocked"] }).candidates.map(
        (item) => item.runId,
      ),
    ).toEqual([c]);
  });

  it("builds a specification skeleton that leaves the expected checks to a human", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-incident-scan-"));
    roots.push(root);
    const a = "11111111-1111-4111-8111-111111111111";
    run(root, a, "failed", { exitCode: 2, unresolved: ["boom"] });
    const candidate = scanHarnessIncidents(root).candidates[0];
    if (!candidate) throw new Error("expected one candidate");
    const skeleton = incidentSpecSkeleton(candidate);
    expect(skeleton).toMatchObject({
      schema_version: 1,
      id: "task-a-11111111",
      agent: "backend",
      source: { run_id: a },
      observed: { failure: "boom", exit_code: 2 },
    });
    expect(JSON.stringify(skeleton.expected_checks)).toContain("TODO");
  });
});
