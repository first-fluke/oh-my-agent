import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadExecutionProtocol } from "./agent-config.js";

const root = join(import.meta.dirname, "../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("agent-owned governance policy", () => {
  it("ships identical source and installed governance definitions", () => {
    expect(read("skills/oma-governance/SKILL.md")).toBe(
      read(".agents/skills/oma-governance/SKILL.md"),
    );
    expect(read("com.firstfluke.oma/agents/governance-steward.md")).toBe(
      read(".agents/agents/governance-steward.md"),
    );
  });

  it("injects the governance path into the standard execution protocol", () => {
    const prompt = loadExecutionProtocol("codex", root);
    expect(prompt).toContain("## Organizational governance");
    expect(prompt).toContain(".agents/state/governance/active-policy.md");
    expect(prompt).toContain("oma agent spawn governance-steward");
    expect(prompt).toMatch(/Subsequent OMA work MUST consume/i);
  });

  it("assigns substantive policy judgment to an agent and closes the feedback loop", () => {
    const skill = read("skills/oma-governance/SKILL.md");
    const steward = read("com.firstfluke.oma/agents/governance-steward.md");

    expect(skill).toContain(
      "The substantive judgment belongs to the governance-steward agent",
    );
    expect(skill).toContain(
      "operating evidence or policy conflict -> governance-steward judgment -> active policy -> subsequent OMA behavior -> later evidence/conflict",
    );
    expect(skill).toContain("writes `.agents/state/governance/active-policy.md`");
    expect(skill).toMatch(/MUST change subsequent planning\/dispatch\/recovery\/verification behavior/i);
    expect(skill).toContain("any superseded policy is no longer treated as active");

    expect(steward).toContain("you own the internal policy judgment");
    expect(steward).toContain("Compare at least two materially different policy options");
    expect(steward).toContain("later sessions");
  });

  it("keeps governance separate from routine control and external authorization", () => {
    const policy = read("skills/_shared/core/execution-policy.md");
    const skill = read("skills/oma-governance/SKILL.md");

    expect(policy).toContain(
      "This path is distinct from routine planning, coordination, current-work control, QA, and user authorization.",
    );
    expect(skill).toContain(
      "Do **not** invoke governance merely because a task is hard",
    );
    expect(policy).toContain(
      "The governance actor cannot manufacture external authority.",
    );
    expect(skill).toContain("return `BLOCKED`");
  });
});
