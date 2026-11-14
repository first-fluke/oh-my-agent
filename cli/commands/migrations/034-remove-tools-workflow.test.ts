import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateRemoveToolsWorkflow } from "./034-remove-tools-workflow.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

function projectWithWorkflow(body: string): { root: string; path: string } {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-034-"));
  tempRoots.push(root);
  const dir = join(root, ".agents", "workflows");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "tools.md");
  writeFileSync(path, body);
  return { root, path };
}

const SHIPPED =
  "---\nname: tools\ndescription: Manage MCP tools\n---\n\nSet only that group's tools in `available_tools`.\n";

describe("migrateRemoveToolsWorkflow (034)", () => {
  it("removes the shipped workflow and is then a no-op", () => {
    const { root, path } = projectWithWorkflow(SHIPPED);

    expect(migrateRemoveToolsWorkflow.up(root)).toEqual([
      "workflows/tools.md (removed retired workflow)",
    ]);
    expect(existsSync(path)).toBe(false);
    expect(migrateRemoveToolsWorkflow.up(root)).toEqual([]);
  });

  it.each([
    [
      "a project workflow that reuses the file name",
      "---\nname: tools\n---\n\nList the build tools this project needs.\n",
    ],
    [
      "a workflow with another name",
      "---\nname: toolbox\n---\n\nEdits `available_tools`.\n",
    ],
  ])("leaves %s in place", (_label, body) => {
    const { root, path } = projectWithWorkflow(body);

    expect(migrateRemoveToolsWorkflow.up(root)).toEqual([]);
    expect(existsSync(path)).toBe(true);
  });

  it("does nothing when the workflow is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-034-"));
    tempRoots.push(root);

    expect(migrateRemoveToolsWorkflow.up(root)).toEqual([]);
  });
});
