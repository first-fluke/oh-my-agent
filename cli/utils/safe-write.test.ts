import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  atomicWriteFileSync,
  FORBIDDEN_VENDOR_FILES,
  listBackups,
  safeWriteJson,
} from "./safe-write.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-write-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** Read mtime entries for a list of backup paths as { filePath, mtime } structs. */
function backupMtimes(
  backupPaths: string[],
): { filePath: string; mtime: number }[] {
  return backupPaths.map((filePath) => ({
    filePath,
    mtime: fs.statSync(filePath).mtimeMs,
  }));
}

describe("safeWriteJson", () => {
  it("T1: writes a fresh file when no prior target exists", () => {
    const target = path.join(tmpDir, "fresh.json");
    safeWriteJson(target, { hello: "world" });

    expect(fs.existsSync(target)).toBe(true);
    const content = fs.readFileSync(target, "utf-8");
    expect(JSON.parse(content)).toEqual({ hello: "world" });
  });

  it("T2: backs up existing file before overwriting; backup matches previous content", () => {
    const target = path.join(tmpDir, "target.json");
    const original = { version: 1 };
    const updated = { version: 2 };

    // Write initial version via native fs (not safeWriteJson) so no backup is created yet
    fs.writeFileSync(target, JSON.stringify(original), "utf-8");

    safeWriteJson(target, updated);

    // New content matches updated value
    const newContent = JSON.parse(fs.readFileSync(target, "utf-8"));
    expect(newContent).toEqual(updated);

    // Exactly one backup exists with original content
    const backups = listBackups(target);
    expect(backups).toHaveLength(1);
    const entries = backupMtimes(backups);
    const firstEntry = entries.find(() => true);
    if (!firstEntry) throw new Error("Expected at least one backup entry");
    const backupContent = JSON.parse(
      fs.readFileSync(firstEntry.filePath, "utf-8"),
    );
    expect(backupContent).toEqual(original);
  });

  it("T3: keeps exactly 3 backups after 5 writes", async () => {
    const target = path.join(tmpDir, "rotating.json");

    for (let i = 0; i < 5; i++) {
      // Small delay to ensure distinct timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      safeWriteJson(target, { i });
    }

    const backups = listBackups(target);
    expect(backups).toHaveLength(3);

    // Sorted newest-first: mtime of each pair should be non-increasing
    const entries = backupMtimes(backups);
    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const next = entries[i + 1];
      if (!current || !next) break;
      expect(current.mtime).toBeGreaterThanOrEqual(next.mtime);
    }
  });

  it("T5: produces pretty-printed JSON with 2-space indent and trailing newline", () => {
    const target = path.join(tmpDir, "pretty.json");
    safeWriteJson(target, { a: 1, b: [1, 2] });

    const raw = fs.readFileSync(target, "utf-8");
    expect(raw).toBe(`${JSON.stringify({ a: 1, b: [1, 2] }, null, 2)}\n`);
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain("  "); // 2-space indent present
  });

  it("T6: auto-creates parent directories that do not exist", () => {
    const target = path.join(tmpDir, "sub", "deep", "file.json");
    expect(fs.existsSync(path.dirname(target))).toBe(false);

    safeWriteJson(target, { nested: true });

    expect(fs.existsSync(target)).toBe(true);
    expect(JSON.parse(fs.readFileSync(target, "utf-8"))).toEqual({
      nested: true,
    });
  });
});

describe("atomicWriteFileSync", () => {
  it("A1: writes a fresh file and creates missing parent directories", () => {
    const target = path.join(tmpDir, "sub", "deep", "generated.md");
    atomicWriteFileSync(target, "hello\n");

    expect(fs.readFileSync(target, "utf-8")).toBe("hello\n");
  });

  it("A2: overwrites without creating any backup", () => {
    fs.mkdirSync(path.join(tmpDir, ".agents"), { recursive: true });
    const target = path.join(tmpDir, ".claude", "agents", "oma-qa.md");

    atomicWriteFileSync(target, "v1");
    atomicWriteFileSync(target, "v2");

    expect(fs.readFileSync(target, "utf-8")).toBe("v2");
    expect(listBackups(target)).toEqual([]);
    expect(
      fs.existsSync(path.join(tmpDir, ".agents", "backup", "safe-write")),
    ).toBe(false);
  });

  it("A3: leaves no temp files behind next to the target", () => {
    const target = path.join(tmpDir, "clean.md");
    atomicWriteFileSync(target, "a");
    atomicWriteFileSync(target, "b");

    expect(fs.readdirSync(tmpDir)).toEqual(["clean.md"]);
  });

  it("A4: applies the requested mode (executable hook wrappers)", () => {
    const target = path.join(tmpDir, "oma-hook.sh");
    atomicWriteFileSync(target, "#!/bin/sh\n", { mode: 0o755 });

    expect(fs.statSync(target).mode & 0o777).toBe(0o755);
  });

  it("A5: writes through a symlink instead of replacing it", () => {
    const real = path.join(tmpDir, "CLAUDE.md");
    const link = path.join(tmpDir, "AGENTS.md");
    fs.writeFileSync(real, "old", "utf-8");
    fs.symlinkSync(real, link);

    atomicWriteFileSync(link, "new");

    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(real, "utf-8")).toBe("new");
  });
});

describe("FORBIDDEN_VENDOR_FILES allowlist", () => {
  it("FORBIDDEN_VENDOR_FILES set is non-empty and contains .claude.json", () => {
    expect(FORBIDDEN_VENDOR_FILES.size).toBeGreaterThan(0);
    expect(FORBIDDEN_VENDOR_FILES.has(".claude.json")).toBe(true);
  });

  it("refuses to write .claude.json", () => {
    const target = "/tmp/.claude.json";
    expect(() => safeWriteJson(target, {})).toThrow(
      /\.claude\.json.*FORBIDDEN_VENDOR_FILES|FORBIDDEN_VENDOR_FILES.*\.claude\.json/,
    );
  });

  it("refuses regardless of path depth", () => {
    const target = "/some/nested/dir/.claude.json";
    expect(() => safeWriteJson(target, {})).toThrow(/FORBIDDEN_VENDOR_FILES/);
  });

  it("allows similar but non-forbidden names", () => {
    const targetNoDot = path.join(tmpDir, "claude.json");
    const targetOther = path.join(tmpDir, ".claude-other.json");

    expect(() => safeWriteJson(targetNoDot, { ok: true })).not.toThrow();
    expect(() => safeWriteJson(targetOther, { ok: true })).not.toThrow();
  });
});

describe("listBackups", () => {
  it("T7a: returns empty array when no backups exist", () => {
    const target = path.join(tmpDir, "no-backups.json");
    expect(listBackups(target)).toEqual([]);
  });

  it("T7b: returns backups sorted newest-first", async () => {
    const target = path.join(tmpDir, "sorted.json");

    // Write 3 versions to produce 2 backups (first write creates none)
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      safeWriteJson(target, { i });
    }

    const backups = listBackups(target);
    expect(backups.length).toBeGreaterThanOrEqual(2);

    // Verify newest-first ordering using { filePath, mtime } structs
    const entries = backupMtimes(backups);
    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const next = entries[i + 1];
      if (!current || !next) break;
      expect(current.mtime).toBeGreaterThanOrEqual(next.mtime);
    }
  });
});

describe("safeWriteJson — canonical backup routing", () => {
  it("T8: in-project targets back up under .agents/backup/safe-write, not as a sibling", () => {
    // tmpDir is a project (has .agents/), so backups centralize.
    fs.mkdirSync(path.join(tmpDir, ".agents"), { recursive: true });
    const target = path.join(tmpDir, ".claude", "settings.json");

    safeWriteJson(target, { v: 1 });
    safeWriteJson(target, { v: 2 }); // second write produces one backup

    const backupDir = path.join(tmpDir, ".agents", "backup", "safe-write");
    expect(fs.existsSync(backupDir)).toBe(true);

    const backups = listBackups(target);
    expect(backups).toHaveLength(1);
    expect(backups[0]?.startsWith(backupDir)).toBe(true);
    // no sibling dotfile next to the target
    const siblings = fs
      .readdirSync(path.dirname(target))
      .filter((n) => n.includes(".backup-"));
    expect(siblings).toEqual([]);
    // backup holds the pre-overwrite content
    expect(JSON.parse(fs.readFileSync(backups[0] as string, "utf-8"))).toEqual({
      v: 1,
    });
  });
});
