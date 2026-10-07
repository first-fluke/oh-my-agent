import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readManagedSkills,
  recordUpdatedSkills,
  SKILL_OWNERSHIP_PATH,
} from "./managed-skill-ownership.js";
import {
  installShared,
  installSkill,
} from "./skills-installer/ssot-install.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function temp() {
  const root = mkdtempSync(join(tmpdir(), "oma-skill-ownership-"));
  roots.push(root);
  return root;
}

describe("managed skill ownership", () => {
  it("records installed skills and shared assets while excluding unrelated and pruned skills", () => {
    const source = temp();
    const root = temp();
    for (const name of ["oma-test", "oma-pruned", "_shared"])
      mkdirSync(join(source, ".agents/skills", name), { recursive: true });
    mkdirSync(join(root, ".agents/skills/third-party"), { recursive: true });
    expect(installSkill(source, "oma-test", root)).toBe(true);
    installShared(source, root);
    recordUpdatedSkills(source, root);
    expect([...readManagedSkills(root)].sort()).toEqual([
      "_shared",
      "oma-test",
    ]);
  });

  it("does not grant ownership from invalid or traversing manifest entries", () => {
    const root = temp();
    mkdirSync(join(root, ".agents/state"), { recursive: true });
    writeFileSync(
      join(root, SKILL_OWNERSHIP_PATH),
      JSON.stringify({
        schemaVersion: 1,
        skills: ["../outside", "/absolute", "", 5, "oma-test"],
      }),
    );
    expect([...readManagedSkills(root)]).toEqual(["oma-test"]);
    writeFileSync(join(root, SKILL_OWNERSHIP_PATH), "{broken");
    expect(readManagedSkills(root).size).toBe(0);
  });
});
