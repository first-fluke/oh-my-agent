/**
 * Migration 016: Remove the retired evaluator-tuning shared resource.
 * The protocol it described (EA aggregation via `oma retro`) was never
 * implemented; the file was dropped from `_shared/core/`. `oma update`
 * overlays `.agents/` without deleting, so clean up the orphan here.
 * - Safe to run repeatedly.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./index.js";

export const migrateRemoveEvaluatorTuning: Migration = {
  name: "016-remove-evaluator-tuning",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const target = join(
      cwd,
      ".agents",
      "skills",
      "_shared",
      "core",
      "evaluator-tuning.md",
    );

    if (existsSync(target)) {
      rmSync(target, { force: true });
      actions.push(
        "skills/_shared/core/evaluator-tuning.md (removed retired resource)",
      );
    }

    return actions;
  },
};
