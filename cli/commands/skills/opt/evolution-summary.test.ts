import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectEvolutionSummary,
  renderEvolutionLines,
} from "./evolution-summary.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("evolution summary", () => {
  it("reports the feedback backlog only when the caller supplies it", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-evolution-summary-"));
    roots.push(root);
    const skillsOnly = collectEvolutionSummary(root);
    expect(skillsOnly.backlog).toBeUndefined();
    expect(skillsOnly.appliedEdits).toBe(0);
    expect(renderEvolutionLines(skillsOnly).join("\n")).not.toContain(
      "Waiting for feedback",
    );
    const withBacklog = collectEvolutionSummary(root, {
      pendingIncidents: 1,
      uncapturedFailedRuns: 2,
    });
    const lines = renderEvolutionLines(withBacklog).join("\n");
    expect(lines).toContain(
      "Waiting for feedback: 1 captured incident without a fixture, 2 failed runs not yet captured",
    );
    expect(lines).toContain("oma harness feedback --scan-runs --live");
  });
});
