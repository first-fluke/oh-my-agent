/**
 * Migration 034: Remove the retired `/tools` workflow.
 *
 * The workflow edited `available_tools` in `.agents/mcp.json`, a declaration
 * no host enforces and vendor MCP configs never carry, so it changed nothing a
 * session could observe. `oma update` overwrites shipped workflows but never
 * prunes one that stopped shipping, so the file is removed here; the vendor
 * commands linked to it are pruned by the link step once the source is gone.
 *
 * Only the shipped file is removed. A project's own `tools.md` workflow is
 * recognized by not carrying the shipped name and subject, and is left alone.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

const SHIPPED_NAME = /^name:\s*tools\s*$/m;
const SHIPPED_SUBJECT = "available_tools";

export const migrateRemoveToolsWorkflow: Migration = {
  name: "034-remove-tools-workflow",
  up(cwd: string): string[] {
    const workflowPath = join(cwd, ".agents", "workflows", "tools.md");
    if (!existsSync(workflowPath)) return [];

    try {
      const body = readFileSync(workflowPath, "utf-8");
      if (!SHIPPED_NAME.test(body) || !body.includes(SHIPPED_SUBJECT)) {
        return [];
      }
      rmSync(workflowPath, { force: true });
      return ["workflows/tools.md (removed retired workflow)"];
    } catch {
      // Best-effort: leave an unreadable or protected file untouched.
      return [];
    }
  },
};
