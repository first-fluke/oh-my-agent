import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listBackups, safeWriteJson } from "../utils/safe-write.js";
import {
  AGENTS_BACKUP_DIR,
  backupPathFromRoot,
  backupRoot,
  findProjectRoot,
  pruneBackupRoot,
  resolveSafeWriteBackup,
} from "./backup.js";

describe("backup retention", () => {
  let repo: string;
  const DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "oma-backup-retention-"));
    mkdirSync(join(repo, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("ages out snapshots but never the safe-write trail", () => {
    const now = Date.now();
    const old = backupPathFromRoot(repo, "008-model-preset");
    const fresh = backupPathFromRoot(repo, "028-profile-sessions");
    const safeWrite = backupPathFromRoot(repo, "safe-write");
    for (const dir of [old, fresh, safeWrite])
      mkdirSync(dir, { recursive: true });
    const stale = (now - 40 * DAY_MS) / 1000;
    utimesSync(old, stale, stale);
    utimesSync(safeWrite, stale, stale);

    const removed = pruneBackupRoot(repo, { nowMs: now });

    expect(removed).toEqual([old]);
    expect(existsSync(fresh)).toBe(true);
    expect(existsSync(safeWrite)).toBe(true);
  });

  it("keeps the first-seen original out of the rotation", () => {
    const target = join(repo, ".claude", "settings.json");
    mkdirSync(join(repo, ".claude"), { recursive: true });
    writeFileSync(target, '{"user":"original"}');

    for (let i = 0; i < 6; i++) safeWriteJson(target, { pass: i });

    const { original } = resolveSafeWriteBackup(target);
    expect(readFileSync(original, "utf-8")).toBe('{"user":"original"}');
    // Rotation still caps the timestamped copies.
    expect(listBackups(target)).toHaveLength(3);
  });
});

describe("backup paths", () => {
  it("AGENTS_BACKUP_DIR is the canonical gitignored root", () => {
    expect(AGENTS_BACKUP_DIR).toBe(".agents/backup");
  });

  it("backupRoot / backupPathFromRoot resolve under <cwd>/.agents/backup", () => {
    expect(backupRoot("/repo")).toBe(join("/repo", ".agents", "backup"));
    expect(
      backupPathFromRoot("/repo", "010-rename-preset", "oma-config.yaml"),
    ).toBe(
      join(
        "/repo",
        ".agents",
        "backup",
        "010-rename-preset",
        "oma-config.yaml",
      ),
    );
  });
});

describe("findProjectRoot / resolveSafeWriteBackup", () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "oma-backup-test-"));
    mkdirSync(join(repo, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("finds the project root from a nested target", () => {
    const target = join(repo, ".claude", "settings.json");
    expect(findProjectRoot(target)).toBe(repo);
  });

  it("centralizes backups under .agents/backup/safe-write for in-project targets", () => {
    const target = join(repo, ".claude", "settings.json");
    const { dir, prefix } = resolveSafeWriteBackup(target);
    expect(dir).toBe(join(repo, ".agents", "backup", "safe-write"));
    // relative path flattened with __ so distinct targets never collide
    expect(prefix).toBe(`.claude__settings.json.backup-`);
  });

  it("disambiguates same-basename targets by their relative path", () => {
    const a = resolveSafeWriteBackup(join(repo, ".claude", "settings.json"));
    const b = resolveSafeWriteBackup(join(repo, ".gemini", "settings.json"));
    expect(a.dir).toBe(b.dir);
    expect(a.prefix).not.toBe(b.prefix);
  });

  it("falls back to a sibling dotfile when no project root exists", () => {
    const lone = mkdtempSync(join(tmpdir(), "oma-noproject-"));
    try {
      const target = join(lone, "settings.json");
      writeFileSync(target, "{}");
      const { dir, prefix } = resolveSafeWriteBackup(target);
      expect(dir).toBe(lone);
      expect(prefix).toBe(".settings.json.backup-");
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });
});
