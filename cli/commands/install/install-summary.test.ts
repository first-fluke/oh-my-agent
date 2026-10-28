import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PRESETS } from "../../constants/index.js";
import {
  inspectInstallManifests,
  renderInstallManifestSummary,
} from "./install-summary.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(copyDefinitions = false) {
  const root = mkdtempSync(join(tmpdir(), "oma-install-summary-"));
  roots.push(root);
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  mkdirSync(join(root, ".agents", "skills"), { recursive: true });
  mkdirSync(join(root, ".agents", "workflows"), { recursive: true });
  if (copyDefinitions) {
    for (const directory of ["workflows", "agents"]) {
      cpSync(
        join(repository, ".agents", directory),
        join(root, ".agents", directory),
        { recursive: true },
      );
    }
  }
  const skill = (name: string) =>
    write(
      `.agents/skills/${name}/SKILL.md`,
      `---\nname: ${name}\ndescription: Fixture skill\n---\n`,
    );
  const workflows = () =>
    readdirSync(join(root, ".agents", "workflows"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3));
  return { root, write, skill, workflows };
}

describe("install manifest summary", () => {
  it("reports the real frontend selection's missing workflow and agent skill references", () => {
    const f = fixture(true);
    const selected = PRESETS.frontend ?? [];
    for (const name of selected) f.skill(name);

    const summary = inspectInstallManifests(f.root, selected, f.workflows());

    expect(summary.selectedSkills).toHaveLength(8);
    expect(summary.installedSkills).toHaveLength(8);
    expect(summary.unavailableSelectedSkills).toEqual([]);
    expect(
      summary.workflows.find((item) => item.name === "work")?.missingSkills,
    ).toContain("oma-coordination");
    expect(
      summary.workflows.find((item) => item.name === "docs")?.missingSkills,
    ).toContain("oma-docs");
    expect(
      summary.workflows.find((item) => item.name === "ultrawork")
        ?.missingSkills,
    ).toContain("oma-refactor");
    const lines = renderInstallManifestSummary(summary);
    expect(lines).toContain(
      "Installed skill manifests: 8 (selected and retained)",
    );
    expect(lines.some((line) => line.startsWith("/work: missing "))).toBe(true);
    expect(
      lines.filter((line) => line.startsWith("Run oma doctor")),
    ).toHaveLength(1);
    expect(lines.join("\n")).toContain("conditional branches");
    expect(
      summary.workflows.find((item) => item.name === "work")?.availability,
    ).toMatchObject({
      available: false,
      missingRequired: expect.arrayContaining(["oma-coordination"]),
    });
    expect(lines.join("\n")).toContain(
      "/work disabled: install or repair required skills oma-coordination",
    );
    expect(lines.join("\n")).toContain(
      "conditional skills (add when using that branch)",
    );
  });

  it("counts retained skill manifests and clears their gaps without expanding the selection", () => {
    const f = fixture(true);
    const selected = PRESETS.frontend ?? [];
    for (const name of [
      ...selected,
      "oma-coordination",
      "oma-docs",
      "oma-refactor",
    ])
      f.skill(name);

    const summary = inspectInstallManifests(f.root, selected, f.workflows());

    expect(summary.selectedSkills).toHaveLength(8);
    expect(summary.installedSkills).toHaveLength(11);
    expect(
      summary.workflows.find((item) => item.name === "work")?.missingSkills,
    ).not.toContain("oma-coordination");
    expect(
      summary.workflows.find((item) => item.name === "docs")?.missingSkills,
    ).toEqual([]);
    expect(
      summary.workflows.find((item) => item.name === "ultrawork")
        ?.missingSkills,
    ).not.toContain("oma-refactor");
  });

  it("covers the shipped workflow references when all skill manifests are present", () => {
    const f = fixture(true);
    const selected = PRESETS.all ?? [];
    for (const name of selected) f.skill(name);

    const summary = inspectInstallManifests(f.root, selected, f.workflows());

    expect(
      summary.workflows.filter((item) => item.missingSkills.length),
    ).toEqual([]);
    expect(
      summary.workflows.filter((item) => item.unreadableFiles.length),
    ).toEqual([]);
    expect(
      summary.workflows.filter((item) => !item.availability.available),
    ).toEqual([]);
  });

  it("follows nested workflow guides and agent frontmatter through cycles, excluding free mentions", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "Read [details](./guides/nested.md).\nMention oma-backend as an example only.\n",
    );
    f.write(
      ".agents/workflows/guides/nested.md",
      'Read `.agents/skills/oma-frontend/SKILL.md`.\nAgent(subagent_type="refactor-engineer")\nRead `.agents/workflows/entry.md`.\n',
    );
    f.write(
      ".agents/agents/refactor-engineer.md",
      "---\nname: refactor-engineer\nskills:\n  - oma-refactor\n---\n",
    );
    f.skill("oma-frontend");

    const [coverage] = inspectInstallManifests(
      f.root,
      ["oma-frontend"],
      ["entry"],
    ).workflows;

    expect(coverage?.referencedSkills).toEqual([
      "oma-frontend",
      "oma-refactor",
    ]);
    expect(coverage?.missingSkills).toEqual(["oma-refactor"]);
    expect(coverage?.unreadableFiles).toEqual([]);
  });

  it("resolves CLI role aliases to the installed owning agent definition", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "oma agent spawn qa-agent review session\n",
    );
    f.write(
      ".agents/agents/qa-reviewer.md",
      "---\nname: qa-reviewer\nskills: [oma-qa]\n---\n",
    );

    expect(
      inspectInstallManifests(f.root, [], ["entry"]).workflows[0]
        ?.missingSkills,
    ).toEqual(["oma-qa"]);
  });

  it("does not treat generated Markdown links or placeholder filenames as workflow guides", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "```markdown\n[Output](docs/README.md)\n```\nRead `./result-{sessionId}.md` after execution.\n",
    );

    const summary = inspectInstallManifests(f.root, [], ["entry"]);

    expect(summary.workflows[0]?.unreadableFiles).toEqual([]);
  });

  it("counts explicit resource owners while excluding generated fenced examples", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "If redesigning, read `.agents/skills/oma-design/resources/redesign-protocol.md`.\nMention oma-backend only in prose.\n```markdown\nRead .agents/skills/oma-video/SKILL.md in this generated example.\n```\n",
    );

    const coverage = inspectInstallManifests(f.root, [], ["entry"])
      .workflows[0];

    expect(coverage?.referencedSkills).toEqual(["oma-design"]);
    expect(coverage?.missingSkills).toEqual(["oma-design"]);
  });

  it("keeps the repair command in global scope for a global installation", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "Read `.agents/skills/oma-qa/SKILL.md`.\n",
    );
    const summary = inspectInstallManifests(f.root, [], ["entry"]);

    expect(
      renderInstallManifestSummary(summary, { global: true }).join("\n"),
    ).toContain("Run oma doctor --global");
  });

  it("does not call missing or unreadable workflow documents complete", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "Read [missing guide](./missing.md).\n",
    );
    mkdirSync(join(f.root, ".agents", "workflows", "unreadable.md"));

    const summary = inspectInstallManifests(
      f.root,
      [],
      ["entry", "unreadable"],
    );
    const lines = renderInstallManifestSummary(summary);

    expect(summary.workflows[0]?.unreadableFiles).toEqual([
      ".agents/workflows/missing.md",
    ]);
    expect(summary.workflows[1]?.unreadableFiles).toEqual([
      ".agents/workflows/unreadable.md",
    ]);
    expect(lines).toContain(
      "Workflow referenced skill manifests: 0/2 complete",
    );
    expect(lines.join("\n")).toContain("not assessed:");
  });

  it("reports unreadable skill manifests and malformed owning agent frontmatter", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      'Read `.agents/skills/oma-frontend/SKILL.md`.\nAgent(subagent_type="refactor-engineer")\n',
    );
    f.write(
      ".agents/agents/refactor-engineer.md",
      "---\nskills: [invalid\n---\n",
    );
    mkdirSync(join(f.root, ".agents", "skills", "oma-frontend", "SKILL.md"), {
      recursive: true,
    });

    const summary = inspectInstallManifests(
      f.root,
      ["oma-frontend"],
      ["entry"],
    );

    expect(summary.installedSkills).toEqual([]);
    expect(summary.unavailableSelectedSkills).toEqual(["oma-frontend"]);
    expect(summary.workflows[0]?.unreadableFiles).toEqual([
      ".agents/agents/refactor-engineer.md (invalid agent frontmatter)",
      ".agents/skills/oma-frontend/SKILL.md",
    ]);
    expect(renderInstallManifestSummary(summary)).toContain(
      "Workflow referenced skill manifests: 0/1 complete",
    );
  });

  it("collapses complete reference coverage without claiming runtime readiness", () => {
    const f = fixture();
    f.write(
      ".agents/workflows/entry.md",
      "Read `.agents/skills/oma-frontend/SKILL.md`.\n",
    );
    f.skill("oma-frontend");

    const lines = renderInstallManifestSummary(
      inspectInstallManifests(f.root, ["oma-frontend"], ["entry"]),
    );

    expect(lines).toContain(
      "Workflow referenced skill manifests: 1/1 complete",
    );
    expect(lines.some((line) => line.startsWith("/entry:"))).toBe(false);
    expect(lines.some((line) => line.startsWith("Run oma doctor"))).toBe(false);
    expect(lines.join("\n")).toContain("execution are not verified");
  });
});
