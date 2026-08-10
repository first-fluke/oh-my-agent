/**
 * Migration 021: Remove eval artifacts shipped by affected releases.
 *
 * Eval fixtures are release-development inputs, not project runtime assets.
 * A stale CLI process could copy `.agents/eval/` while updating itself in the
 * background. This migration clears that unintended directory before update's
 * version early-return, so already-current projects are repaired as well.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

export const migrateRemoveEvalArtifacts: Migration = {
  name: "021-remove-eval-artifacts",
  up(cwd: string): string[] {
    const evalDir = join(cwd, ".agents", "eval");
    if (!existsSync(evalDir)) return [];

    try {
      rmSync(evalDir, { recursive: true, force: true });
      return ["removed unintended .agents/eval artifacts"];
    } catch {
      // Best-effort: leave unreadable or protected project data untouched.
      return [];
    }
  },
};
