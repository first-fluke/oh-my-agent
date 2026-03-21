import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateSharedLayout } from "../lib/migrate.js";

describe("migrateSharedLayout", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("removes legacy files when the new location already exists", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "context-loading.md",
    );
    const newPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "core",
      "context-loading.md",
    );

    mkdirSync(join(root, ".agents", "skills", "_shared", "core"), {
      recursive: true,
    });
    writeFileSync(oldPath, "same content\n", "utf-8");
    writeFileSync(newPath, "same content\n", "utf-8");

    const actions = migrateSharedLayout(root);

    expect(actions).toContain(
      ".agents/skills/_shared/context-loading.md (removed legacy path)",
    );
    expect(existsSync(oldPath)).toBe(false);
    expect(readFileSync(newPath, "utf-8")).toBe("same content\n");
  });

  it("backs up customized legacy files before removing them", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-"));
    tempRoots.push(root);

    const oldPath = join(
      root,
      ".agents",
      "skills",
      "_shared",
      "phase-gates.md",
    );
    const newPath = join(
      root,
      ".agents",
      "workflows",
      "ultrawork",
      "resources",
      "phase-gates.md",
    );
    const backupPath = join(
      root,
      ".agents",
      ".migration-backup",
      "shared-layout-v2",
      "skills",
      "_shared",
      "phase-gates.md",
    );

    mkdirSync(join(root, ".agents", "skills", "_shared"), { recursive: true });
    mkdirSync(join(root, ".agents", "workflows", "ultrawork", "resources"), {
      recursive: true,
    });

    writeFileSync(oldPath, "custom legacy content\n", "utf-8");
    writeFileSync(newPath, "new canonical content\n", "utf-8");

    const actions = migrateSharedLayout(root);

    expect(actions).toContain(
      ".agents/skills/_shared/phase-gates.md → .agents/.migration-backup/shared-layout-v2/skills/_shared/phase-gates.md (backup)",
    );
    expect(existsSync(oldPath)).toBe(false);
    expect(readFileSync(newPath, "utf-8")).toBe("new canonical content\n");
    expect(readFileSync(backupPath, "utf-8")).toBe("custom legacy content\n");
  });
});
