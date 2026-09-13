import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recordSkillPromotion, rollbackSkillPromotion } from "./lineage.js";
import { computeEvolutionStats, evolutionArtifactsDir } from "./stats.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function writeRun(
  dir: string,
  name: string,
  lines: Array<Record<string, unknown>>,
): void {
  writeFileSync(
    join(dir, `${name}.jsonl`),
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
  );
}

describe("evolution stats", () => {
  it("reports zero runs for an unknown skill", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-stats-"));
    roots.push(root);
    expect(computeEvolutionStats(root, "nothing")).toMatchObject({
      runs: 0,
      acceptanceRate: null,
      verifiedImprovements: 0,
      meanFinalLift: null,
    });
  });

  it("aggregates proposals, verified improvements, memory modes, procedures, and rollbacks", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-stats-"));
    roots.push(root);
    const dir = evolutionArtifactsDir(root, "demo");
    mkdirSync(dir, { recursive: true });
    writeRun(dir, "run-a", [
      { type: "training-evidence", epoch: 0 },
      { type: "proposal-gate", outcome: "accepted", reason: "validation" },
      { type: "proposal-gate", outcome: "rejected", reason: "validation" },
      {
        type: "run-summary",
        ts: "2026-09-13T00:00:00Z",
        status: "completed",
        memory: "recall",
        procedureHash: "p1",
        baselineLift: 0.1,
        finalLift: 0.5,
        finalTestPassed: true,
        promotionEligible: true,
        applied: true,
        budget: { limit: null, used: 120 },
      },
    ]);
    writeRun(dir, "run-b", [
      { type: "proposal-gate", outcome: "inconclusive", reason: "validation" },
      {
        type: "run-summary",
        ts: "2026-09-13T01:00:00Z",
        status: "completed",
        memory: "none",
        procedureHash: "p1",
        baselineLift: 0.1,
        finalLift: 0.1,
        finalTestPassed: false,
        promotionEligible: false,
        applied: false,
        budget: { limit: 200, used: 80 },
      },
    ]);
    writeRun(dir, "run-c", [
      {
        type: "run-summary",
        status: "failed",
        memory: "recall",
        procedureHash: "p2",
      },
      "not json" as unknown as Record<string, unknown>,
    ]);
    writeRun(dir, "run-d", [{ type: "training-evidence", epoch: 0 }]);

    const skillDir = join(root, ".agents", "skills", "demo");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "new");
    const backup = join(root, "backup.bak");
    writeFileSync(backup, "old");
    recordSkillPromotion({
      workspace: root,
      skillId: "demo",
      omaOwned: false,
      skillMdPath: join(skillDir, "SKILL.md"),
      backupPath: backup,
      originalBody: "old",
      finalBody: "new",
      evidence: {
        baselineLift: 0.1,
        finalLift: 0.5,
        promotionEligible: true,
        protocolRevision: "2",
      },
    });
    rollbackSkillPromotion(root, "demo");

    const stats = computeEvolutionStats(root, "demo");
    expect(stats).toMatchObject({
      runs: 4,
      completed: 2,
      failed: 1,
      proposals: { proposed: 3, accepted: 1, rejected: 1, inconclusive: 1 },
      acceptanceRate: 0.5,
      verifiedImprovements: 1,
      applied: 1,
      rollbacks: 1,
      callsUsed: 200,
      runsWithUsage: 2,
      callsPerVerifiedImprovement: 200,
      byProcedure: {
        p1: { runs: 2, verifiedImprovements: 1, callsUsed: 200 },
        p2: { runs: 1, verifiedImprovements: 0, callsUsed: 0 },
        unknown: { runs: 1, verifiedImprovements: 0, callsUsed: 0 },
      },
    });
    expect(stats.meanFinalLift).toBeCloseTo(0.3);
    expect(stats.byMemory.recall).toMatchObject({
      runs: 2,
      verifiedImprovements: 1,
      meanFinalLift: 0.5,
      callsUsed: 120,
    });
    expect(stats.byMemory.none).toMatchObject({
      runs: 1,
      verifiedImprovements: 0,
      meanFinalLift: 0.1,
    });
    expect(
      stats.runsDetail.find((run) => run.session === "run-d")?.status,
    ).toBe("incomplete");
  });
});
