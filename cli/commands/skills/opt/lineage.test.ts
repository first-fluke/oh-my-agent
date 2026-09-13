import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readSkillPromotions,
  recordSkillPromotion,
  rollbackSkillPromotion,
} from "./lineage.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function setup(): {
  workspace: string;
  skillMdPath: string;
  backupPath: string;
} {
  const workspace = mkdtempSync(join(tmpdir(), "oma-lineage-"));
  roots.push(workspace);
  const skillDir = join(workspace, ".agents", "skills", "demo");
  mkdirSync(skillDir, { recursive: true });
  const skillMdPath = join(skillDir, "SKILL.md");
  writeFileSync(skillMdPath, "# demo\n\n- improved\n");
  const backupPath = join(workspace, ".agents", "backup", "demo.bak");
  mkdirSync(join(workspace, ".agents", "backup"), { recursive: true });
  writeFileSync(backupPath, "# demo\n");
  return { workspace, skillMdPath, backupPath };
}

const evidence = {
  baselineLift: 0.1,
  finalLift: 0.4,
  finalTest: { baselineLift: 0, candidateLift: 0.5, passed: true },
  promotionEligible: true,
  suiteHash: "abcd",
  protocolRevision: "2",
  sourceRuntime: "claude",
  targetRuntime: "claude",
};

describe("skill promotion lineage", () => {
  it("records an apply with hashes, a patch, and project-relative paths", () => {
    const { workspace, skillMdPath, backupPath } = setup();
    const { record, patchPath } = recordSkillPromotion({
      workspace,
      skillId: "demo",
      omaOwned: false,
      skillMdPath,
      backupPath,
      originalBody: "# demo\n",
      finalBody: "# demo\n\n- improved\n",
      evidence,
    });
    expect(record).toMatchObject({
      schemaVersion: 1,
      action: "apply",
      skillId: "demo",
      skillMdPath: ".agents/skills/demo/SKILL.md",
      backupPath: ".agents/backup/demo.bak",
      evidence,
    });
    expect(record.parentHash).not.toBe(record.candidateHash);
    expect(readFileSync(patchPath, "utf-8")).toContain("+- improved");
    expect(record.patchPath).toBe(
      `.agents/results/skill-evolution/demo/promotions/${record.candidateHash.slice(0, 16)}.patch`,
    );
    expect(readSkillPromotions(workspace, "demo")).toEqual([record]);
    expect(readSkillPromotions(workspace, "other")).toEqual([]);
  });

  it("rolls back to the recorded parent and refuses a second rollback", () => {
    const { workspace, skillMdPath, backupPath } = setup();
    recordSkillPromotion({
      workspace,
      skillId: "demo",
      omaOwned: true,
      skillMdPath,
      backupPath,
      originalBody: "# demo\n",
      finalBody: "# demo\n\n- improved\n",
      evidence,
    });
    const result = rollbackSkillPromotion(workspace, "demo");
    expect(readFileSync(skillMdPath, "utf-8")).toBe("# demo\n");
    expect(result.record).toMatchObject({
      action: "rollback",
      omaOwned: true,
      backupPath: null,
      patchPath: null,
    });
    expect(result.record.reverses).toBe(
      readSkillPromotions(workspace, "demo")[0]?.ts,
    );
    expect(readSkillPromotions(workspace, "demo")).toHaveLength(2);
    expect(() => rollbackSkillPromotion(workspace, "demo")).toThrow(
      /already rolled back/,
    );
  });

  it("refuses to discard edits that are not the promoted candidate", () => {
    const { workspace, skillMdPath, backupPath } = setup();
    recordSkillPromotion({
      workspace,
      skillId: "demo",
      omaOwned: false,
      skillMdPath,
      backupPath,
      originalBody: "# demo\n",
      finalBody: "# demo\n\n- improved\n",
      evidence,
    });
    writeFileSync(skillMdPath, "# demo\n\n- improved\n- hand edit\n");
    expect(() => rollbackSkillPromotion(workspace, "demo")).toThrow(
      /differs from the promoted candidate/,
    );
    expect(existsSync(skillMdPath)).toBe(true);
    expect(() => rollbackSkillPromotion(workspace, "nothing")).toThrow(
      /no recorded promotion/,
    );
  });

  it("refuses a backup that does not match the recorded parent", () => {
    const { workspace, skillMdPath, backupPath } = setup();
    recordSkillPromotion({
      workspace,
      skillId: "demo",
      omaOwned: false,
      skillMdPath,
      backupPath,
      originalBody: "# demo\n",
      finalBody: "# demo\n\n- improved\n",
      evidence,
    });
    writeFileSync(backupPath, "tampered");
    expect(() => rollbackSkillPromotion(workspace, "demo")).toThrow(
      /does not match the recorded parent/,
    );
    expect(readFileSync(skillMdPath, "utf-8")).toBe("# demo\n\n- improved\n");
  });
});
