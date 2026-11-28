/**
 * Migration 038: Remove the legacy `.agents/workflows/ralph/resources/judge-protocol.md` copy.
 *
 * The independent judge moved from `/ralph` into `/oma-mode`
 * (`.agents/workflows/oma-mode/resources/judge-protocol.md`) when `/ralph`
 * became a deprecated alias of `/oma-mode`. `oma update` overwrites shipped
 * workflow files but never prunes a resource directory that stopped shipping,
 * so the old copy is removed here along with any now-empty parent directories.
 *
 * Only the shipped file is removed. A project file that does not carry the
 * shipped judge protocol heading is left alone.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

const SHIPPED_HEADING = /^#\s+JUDGE Protocol:\s+Independent Verifier\b/m;

function removeDirIfEmpty(dir: string): void {
  try {
    if (existsSync(dir) && readdirSync(dir).length === 0) {
      rmdirSync(dir);
    }
  } catch {
    // Best-effort cleanup of empty directories.
  }
}

export const migrateRemoveRalphJudgeProtocol: Migration = {
  name: "038-remove-ralph-judge-protocol",
  requiresReconcile: false,
  up(cwd: string): string[] {
    const ralphDir = join(cwd, ".agents", "workflows", "ralph");
    const resourcesDir = join(ralphDir, "resources");
    const protocolPath = join(resourcesDir, "judge-protocol.md");
    if (!existsSync(protocolPath)) return [];

    try {
      const body = readFileSync(protocolPath, "utf-8");
      if (!SHIPPED_HEADING.test(body)) return [];
      rmSync(protocolPath, { force: true });
      removeDirIfEmpty(resourcesDir);
      removeDirIfEmpty(ralphDir);
      return [
        "workflows/ralph/resources/judge-protocol.md (moved to workflows/oma-mode/resources/judge-protocol.md)",
      ];
    } catch {
      // Best-effort: leave an unreadable or protected file untouched.
      return [];
    }
  },
};
