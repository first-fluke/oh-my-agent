import {
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectLinkedTo } from "../test/link-assertions.js";
import {
  WORKFLOW_LINK_LEDGER_PATH,
  WorkflowLinkLedger,
} from "./skills-installer/workflow-link-ledger.js";
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
    const skillDir = join(root, ".agents", "skills", "oma-docs");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: oma-docs\ndescription: Docs fixture\n---\n",
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const skillFile = (vendor: string) =>
    join(root, `.${vendor}`, "skills", WF, "SKILL.md");
  const workflowFile = () => resolve(root, ".agents", "workflows", `${WF}.md`);

  it("links <vendor>/skills/<wf>/SKILL.md directly at the workflow file", () => {
    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);

    const file = skillFile("claude");
    // Symlink on POSIX; hardlink fallback on unprivileged Windows.
    expectLinkedTo(file, workflowFile());
    expect(readFileSync(file, "utf-8")).toBe(WF_BODY);
  });

  it("is idempotent (second run reports already linked)", () => {
    createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toHaveLength(0);
    expect(res.skipped).toContain(`.claude/skills/${WF} (already linked)`);
  });

  it("replaces a legacy directory-symlink pointing at .agents/skills/<wf>", () => {
    // Simulate the old wrapper + dir-symlink layout ("junction" needs no
    // privilege on Windows and is ignored on POSIX).
    const wrapper = join(root, ".agents", "skills", WF);
    mkdirSync(wrapper, { recursive: true });
    writeFileSync(join(wrapper, "SKILL.md"), "<!-- oma:generated -->\n");
    const vendorSkills = join(root, ".claude", "skills");
    mkdirSync(vendorSkills, { recursive: true });
    symlinkSync(resolve(wrapper), join(vendorSkills, WF), "junction");

    const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);
    expect(res.created).toContain(`.claude/skills/${WF}`);
    expectLinkedTo(skillFile("claude"), workflowFile());
    // The legacy wrapper the junction pointed at is not touched.
    expect(existsSync(join(wrapper, "SKILL.md"))).toBe(true);
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
    expectLinkedTo(skillFile("claude"), workflowFile());
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
    expectLinkedTo(skillFile("codex"), workflowFile());
  });

  // Windows without symlink privilege links workflow files as hardlinks (or
  // copies across volumes). These cases seed that layout directly so they run
  // on every platform.
  describe("hardlink/copy fallback ownership", () => {
    const seedHardlink = () => {
      mkdirSync(join(root, ".claude", "skills", WF), { recursive: true });
      linkSync(workflowFile(), skillFile("claude"));
    };
    const ledgerFile = () => join(root, WORKFLOW_LINK_LEDGER_PATH);

    it("treats a live hardlink of the workflow as already linked and records it", () => {
      seedHardlink();

      const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);

      expect(res.created).toHaveLength(0);
      expect(res.skipped).toContain(`.claude/skills/${WF} (already linked)`);
      expect(new WorkflowLinkLedger(root).owns(skillFile("claude"))).toBe(true);
    });

    it("relinks a recorded hardlink orphaned by a rewritten workflow file", () => {
      seedHardlink();
      createVendorWorkflowSymlinks(root, ["claude"], [WF]);
      // Atomic rewrite: new inode, the old hardlink keeps the old content.
      const next = `${WF_BODY}\nupdated\n`;
      const tmp = `${workflowFile()}.tmp`;
      writeFileSync(tmp, next);
      renameSync(tmp, workflowFile());

      const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);

      expect(res.created).toContain(`.claude/skills/${WF}`);
      expectLinkedTo(skillFile("claude"), workflowFile());
      expect(readFileSync(skillFile("claude"), "utf-8")).toBe(next);
    });

    it("prunes a recorded fallback link once its workflow is gone", () => {
      seedHardlink();
      createVendorWorkflowSymlinks(root, ["claude"], [WF]);
      rmSync(workflowFile());

      createVendorWorkflowSymlinks(root, ["claude"], []);

      expect(existsSync(join(root, ".claude", "skills", WF))).toBe(false);
      expect(
        new WorkflowLinkLedger(root).owns(skillFile("claude"), workflowFile()),
      ).toBe(false);
    });

    it("keeps a recorded copy the user edited", () => {
      mkdirSync(join(root, ".claude", "skills", WF), { recursive: true });
      copyFileSync(workflowFile(), skillFile("claude"));
      const ledger = new WorkflowLinkLedger(root);
      ledger.record(skillFile("claude"), workflowFile(), "copy");
      ledger.save();
      writeFileSync(skillFile("claude"), "my edits\n");
      rmSync(workflowFile());

      createVendorWorkflowSymlinks(root, ["claude"], []);

      expect(readFileSync(skillFile("claude"), "utf-8")).toBe("my edits\n");
    });

    it("does not adopt a user file whose content merely matches", () => {
      mkdirSync(join(root, ".claude", "skills", WF), { recursive: true });
      copyFileSync(workflowFile(), skillFile("claude"));

      const res = createVendorWorkflowSymlinks(root, ["claude"], [WF]);

      expect(res.skipped).toContain(`.claude/skills/${WF} (real file exists)`);
      expect(existsSync(ledgerFile())).toBe(false);
    });

    it("writes no ledger when every link is a symlink", () => {
      createVendorWorkflowSymlinks(root, ["claude"], [WF]);
      if (lstatSync(skillFile("claude")).isSymbolicLink()) {
        expect(existsSync(ledgerFile())).toBe(false);
      } else {
        expect(new WorkflowLinkLedger(root).owns(skillFile("claude"))).toBe(
          true,
        );
      }
    });
  });
});
