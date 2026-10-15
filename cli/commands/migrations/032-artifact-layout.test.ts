import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { migrateStateMemories } from "./017-state-memories.js";
import { migrateArtifactLayoutPaths } from "./032-artifact-layout.js";
import { runMigrationsWithStatus } from "./index.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it("runs as an idempotent artifact-only migration without reconciliation", () => {
  const root = mkdtempSync(join(tmpdir(), "oma-migration-032-"));
  roots.push(root);
  mkdirSync(join(root, "docs/design-docs"), { recursive: true });
  writeFileSync(join(root, "docs/design-docs/a.md"), "# A\n");

  const result = runMigrationsWithStatus(root, undefined, [
    migrateArtifactLayoutPaths,
  ]);

  expect(result.actions).toContain(
    "moved docs/design-docs/a.md → docs/decisions/a.md",
  );
  expect(result.requiresReconcile).toBe(false);
  expect(result.failures).toEqual([]);
  expect(migrateArtifactLayoutPaths.up(root)).toEqual([]);
});

it("lets 032 handle Serena result links and bound paths after 017", () => {
  const root = mkdtempSync(join(tmpdir(), "oma-migration-017-032-"));
  roots.push(root);
  mkdirSync(join(root, ".serena/memories"), { recursive: true });
  mkdirSync(join(root, ".agents/state/agent-runs"), { recursive: true });
  writeFileSync(join(root, ".serena/memories/result-qa.md"), "QA\n");
  writeFileSync(join(root, ".serena/memories/result-bound.md"), "Evidence\n");
  const receipt = JSON.stringify({
    artifactRoot: root,
    artifacts: { ".serena/memories/result-bound.md": "a".repeat(64) },
  });
  writeFileSync(join(root, ".agents/state/agent-runs/run.json"), receipt);
  writeFileSync(
    join(root, "README.md"),
    "[QA](.serena/memories/result-qa.md)\n[bound](.serena/memories/result-bound.md)\n",
  );

  const report = runMigrationsWithStatus(root, undefined, [
    migrateStateMemories,
    migrateArtifactLayoutPaths,
  ]);

  expect(report.failures).toEqual([]);
  expect(readFileSync(join(root, "README.md"), "utf8")).toBe(
    "[QA](.agents/results/result-qa.md)\n[bound](.serena/memories/result-bound.md)\n",
  );
  expect(existsSync(join(root, ".serena/memories/result-bound.md"))).toBe(true);
  expect(existsSync(join(root, ".agents/results/result-bound.md"))).toBe(false);
  expect(
    readFileSync(join(root, ".agents/state/agent-runs/run.json"), "utf8"),
  ).toBe(receipt);
});
