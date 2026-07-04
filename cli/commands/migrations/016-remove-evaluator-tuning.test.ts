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
import { migrateRemoveEvaluatorTuning } from "./016-remove-evaluator-tuning.js";

describe("migrateRemoveEvaluatorTuning (016)", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("removes the orphan evaluator-tuning.md", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-016-"));
    tempRoots.push(root);

    const coreDir = join(root, ".agents", "skills", "_shared", "core");
    mkdirSync(coreDir, { recursive: true });
    const target = join(coreDir, "evaluator-tuning.md");
    writeFileSync(target, "# Evaluator Tuning Protocol\n", "utf-8");

    const actions = migrateRemoveEvaluatorTuning.up(root);

    expect(actions).toContain(
      "skills/_shared/core/evaluator-tuning.md (removed retired resource)",
    );
    expect(existsSync(target)).toBe(false);
  });

  it("is a no-op when the file is already gone", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-016-"));
    tempRoots.push(root);

    const actions = migrateRemoveEvaluatorTuning.up(root);

    expect(actions).toEqual([]);
  });
});
