import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WORKFLOW_DEPENDENCIES } from "./skills-installer/workflow-dependencies.js";
import { installZcodeWorkflowCommands } from "./skills-installer.js";

function setupWorkflows(root: string, workflows: Record<string, string>): void {
  const dir = join(root, ".agents", "workflows");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(workflows)) {
    writeFileSync(join(dir, `${name}.md`), content);
    for (const skill of WORKFLOW_DEPENDENCIES[name]?.required ?? []) {
      const skillDir = join(root, ".agents", "skills", skill);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        `---\nname: ${skill}\ndescription: Fixture skill\n---\n`,
      );
    }
  }
}

const commandPath = (root: string, name: string) =>
  join(root, ".zcode", "commands", `${name}.md`);

describe("installZcodeWorkflowCommands", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  function mkTemp(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempRoots.push(dir);
    return dir;
  }

  it("symlinks each top-level workflow at .zcode/commands/<name>.md", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, {
      ralph: "---\ndescription: Ralph loop\n---\n\n# body",
      debug: "---\ndescription: Bug diagnosis\n---\n\n# body",
    });

    const { created } = installZcodeWorkflowCommands(root);

    // Flat command files — NOT the <name>/SKILL.md skill layout.
    for (const name of ["ralph", "debug"]) {
      const file = commandPath(root, name);
      expect(lstatSync(file).isSymbolicLink()).toBe(true);
      expect(realpathSync(file)).toBe(
        realpathSync(join(root, ".agents", "workflows", `${name}.md`)),
      );
    }
    expect(created).toContain(".zcode/commands/ralph");
    expect(created).toContain(".zcode/commands/debug");
  });

  it("skips subdirectories under workflows/", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, { ralph: "---\ndescription: Ralph\n---\n" });
    mkdirSync(join(root, ".agents", "workflows", "ralph", "resources"), {
      recursive: true,
    });

    installZcodeWorkflowCommands(root);

    expect(existsSync(commandPath(root, "resources"))).toBe(false);
  });

  it("prunes stale oma-owned command links whose workflow was removed", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, { debug: "---\ndescription: Bug\n---\n" });
    // Seed a stale link pointing at a now-removed workflow.
    const commandsDir = join(root, ".zcode", "commands");
    mkdirSync(commandsDir, { recursive: true });
    const workflowsDir = resolve(root, ".agents", "workflows");
    const staleLink = join(commandsDir, "ralph.md");
    symlinkSync(join(workflowsDir, "ralph.md"), staleLink);

    installZcodeWorkflowCommands(root);

    expect(existsSync(staleLink)).toBe(false); // pruned (target gone)
    expect(lstatSync(commandPath(root, "debug")).isSymbolicLink()).toBe(true);
  });

  it("does not touch user-authored real command files", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, { debug: "---\ndescription: Bug\n---\n" });
    const commandsDir = join(root, ".zcode", "commands");
    mkdirSync(commandsDir, { recursive: true });
    const userFile = join(commandsDir, "my-custom.md");
    const userBody = "My own ZCode command.\n";
    writeFileSync(userFile, userBody);

    installZcodeWorkflowCommands(root);

    // Real file preserved (not a symlink, content untouched).
    expect(lstatSync(userFile).isSymbolicLink()).toBe(false);
    expect(readFileSync(userFile, "utf-8")).toBe(userBody);
  });

  it("leaves a real file at a workflow name untouched", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, { debug: "---\ndescription: Bug\n---\n" });
    const commandsDir = join(root, ".zcode", "commands");
    mkdirSync(commandsDir, { recursive: true });
    const realDebug = join(commandsDir, "debug.md");
    writeFileSync(realDebug, "user override\n");

    const { skipped } = installZcodeWorkflowCommands(root);

    expect(lstatSync(realDebug).isSymbolicLink()).toBe(false);
    expect(readFileSync(realDebug, "utf-8")).toBe("user override\n");
    expect(skipped).toContain(".zcode/commands/debug (real file exists)");
  });

  it("is idempotent on repeated calls", () => {
    const root = mkTemp("oma-zcode-");
    setupWorkflows(root, { ralph: "---\ndescription: Ralph\n---\n" });

    installZcodeWorkflowCommands(root);
    const first = readlinkSync(commandPath(root, "ralph"));
    const { created, skipped } = installZcodeWorkflowCommands(root);

    expect(readlinkSync(commandPath(root, "ralph"))).toBe(first);
    expect(created).toHaveLength(0);
    expect(skipped).toContain(".zcode/commands/ralph (already linked)");
  });

  it("does nothing when the workflows source does not exist", () => {
    const root = mkTemp("oma-zcode-");

    installZcodeWorkflowCommands(root);

    expect(existsSync(join(root, ".zcode"))).toBe(false);
  });
});
