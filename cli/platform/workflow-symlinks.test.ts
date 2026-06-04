import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createVendorWorkflowSymlinks,
  getInstalledWorkflowNames,
} from "./skills-installer.js";

const WF = "docs";
const WF_BODY =
  "---\nname: docs\ndescription: Docs drift\ndisable-model-invocation: true\n---\n\n# /docs\n";

function writeWorkflow(root: string, name: string, body: string): void {
  const dir = join(root, ".agents", "workflows");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.md`), body);
}

describe("getInstalledWorkflowNames", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-wf-names-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("lists *.md workflow basenames", () => {
    writeWorkflow(root, "docs", WF_BODY);
    writeWorkflow(root, "scm", "---\nname: scm\ndescription: scm\n---\n");
    expect(getInstalledWorkflowNames(root).sort()).toEqual(["docs", "scm"]);
  });

  it("returns empty when no workflows dir", () => {
    expect(getInstalledWorkflowNames(root)).toEqual([]);
  });
});

describe("createVendorWorkflowSymlinks", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-wf-symlink-"));
    writeWorkflow(root, WF, WF_BODY);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const skillFile = (vendor: string) =>
    join(root, `.${vendor}`, "skills", WF, "SKILL.md");
  const workflowFile = () => resolve(root, ".agents", "workflows", `${WF}.md`);

  it("symlinks <vendor>/skills/<wf>/SKILL.md directly at the workflow file", () => {
    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);

    const file = skillFile("claude");
    expect(lstatSync(file).isSymbolicLink()).toBe(true);
    // The symlink resolves to the workflow file and reads its content.
    expect(resolve(join(file, ".."), readlinkSync(file))).toBe(workflowFile());
    expect(readFileSync(file, "utf-8")).toBe(WF_BODY);
  });

  it("is idempotent (second run reports already linked)", () => {
    createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toHaveLength(0);
    expect(res.skipped).toContain(`.claude/skills/${WF} (already linked)`);
  });

  it("replaces a legacy directory-symlink pointing at .agents/skills/<wf>", () => {
    // Simulate the old wrapper + dir-symlink layout.
    const wrapper = join(root, ".agents", "skills", WF);
    mkdirSync(wrapper, { recursive: true });
    writeFileSync(join(wrapper, "SKILL.md"), "<!-- oma:generated -->\n");
    const vendorSkills = join(root, ".claude", "skills");
    mkdirSync(vendorSkills, { recursive: true });
    symlinkSync(resolve(wrapper), join(vendorSkills, WF), "dir");

    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);

    const file = skillFile("claude");
    expect(lstatSync(file).isSymbolicLink()).toBe(true);
    expect(resolve(join(file, ".."), readlinkSync(file))).toBe(workflowFile());
  });

  it("replaces a stale generated SKILL.md copy", () => {
    const dir = join(root, ".claude", "skills", WF);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: docs\n---\n<!-- oma:generated -->\n",
    );

    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);
    expect(lstatSync(skillFile("claude")).isSymbolicLink()).toBe(true);
  });

  it("never touches a user-authored real SKILL.md", () => {
    const dir = join(root, ".claude", "skills", WF);
    mkdirSync(dir, { recursive: true });
    const userBody = "---\nname: docs\n---\nmy own skill\n";
    writeFileSync(join(dir, "SKILL.md"), userBody);

    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.skipped).toContain(`.claude/skills/${WF} (real file exists)`);
    expect(lstatSync(skillFile("claude")).isSymbolicLink()).toBe(false);
    expect(readFileSync(skillFile("claude"), "utf-8")).toBe(userBody);
  });

  it("skips workflows whose file is missing", () => {
    const res = createVendorWorkflowSymlinks(root, ["claude"], ["nonexistent"]);
    expect(res.created).toHaveLength(0);
    expect(res.skipped).toContain(
      ".claude/skills/nonexistent (workflow missing)",
    );
  });

  it("handles multiple vendors", () => {
    const res = createVendorWorkflowSymlinks(root, ["claude", "codex"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);
    expect(res.created).toContain(`.codex/skills/${WF}`);
    expect(lstatSync(skillFile("codex")).isSymbolicLink()).toBe(true);
  });
});
