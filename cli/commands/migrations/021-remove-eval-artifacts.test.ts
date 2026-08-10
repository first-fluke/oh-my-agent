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
import { migrateRemoveEvalArtifacts } from "./021-remove-eval-artifacts.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-021-"));
  tempRoots.push(root);
  return root;
}

describe("migrateRemoveEvalArtifacts (021)", () => {
  it("removes eval artifacts installed by affected releases", () => {
    const root = makeRoot();
    const fixture = join(root, ".agents", "eval", "oma-docs", "fixture.yaml");
    mkdirSync(join(fixture, ".."), { recursive: true });
    writeFileSync(fixture, "id: fixture\n");

    expect(migrateRemoveEvalArtifacts.up(root)).toEqual([
      "removed unintended .agents/eval artifacts",
    ]);
    expect(existsSync(join(root, ".agents", "eval"))).toBe(false);
  });

  it("is a no-op when eval artifacts are absent or already removed", () => {
    const root = makeRoot();

    expect(migrateRemoveEvalArtifacts.up(root)).toEqual([]);
    mkdirSync(join(root, ".agents", "eval"), { recursive: true });
    expect(migrateRemoveEvalArtifacts.up(root)).toEqual([
      "removed unintended .agents/eval artifacts",
    ]);
    expect(migrateRemoveEvalArtifacts.up(root)).toEqual([]);
  });
});
