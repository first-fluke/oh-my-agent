import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Migration, runMigrationsWithStatus } from "./index.js";

describe("runMigrationsWithStatus — isolation", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "oma-migrations-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(cwd, { recursive: true, force: true });
  });

  it("runs the remaining migrations after one throws and reports the failure", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const seen: string[] = [];
    const registry: Migration[] = [
      {
        name: "100-throws",
        up() {
          seen.push("100");
          throw new Error("cannot parse settings");
        },
      },
      {
        name: "101-ok",
        up() {
          seen.push("101");
          return ["did 101"];
        },
      },
    ];

    const status = runMigrationsWithStatus(cwd, undefined, registry);

    expect(seen).toEqual(["100", "101"]);
    expect(status.actions).toEqual(["did 101"]);
    expect(status.failures).toEqual([
      { name: "100-throws", error: "cannot parse settings" },
    ]);
    // A failed migration may have written part of its change.
    expect(status.requiresReconcile).toBe(true);
    expect(String(warn.mock.calls[0]?.[0])).toContain("100-throws");
  });

  it("keeps requiresReconcile false for a failing state-only migration", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const status = runMigrationsWithStatus(cwd, undefined, [
      {
        name: "102-state-only",
        requiresReconcile: false,
        up() {
          throw new Error("boom");
        },
      },
    ]);
    expect(status.requiresReconcile).toBe(false);
    expect(status.failures).toHaveLength(1);
  });
});
