import { execFile } from "node:child_process";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { garbageCollectLocalState } from "../commands/memory/gc.js";
import { migrateProfileSessions } from "../commands/migrations/028-profile-sessions.js";
import { registerState } from "../commands/state/command.js";
import {
  collectArchivedState,
  collectState,
  viewSession,
} from "../commands/state/sessions.js";
import { createCommandSurface } from "../utils/command-surface.js";
import {
  emitEvent,
  indexPath,
  legacySessionsDir,
  profileDir,
  projectIdentity,
  readEvents,
  readIndex,
  sessionArchiveRoot,
  sessionDir,
  sessionsDir,
  setActiveSession,
} from "./events.js";
import { migrateLegacySessions } from "./session-migration.js";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
}));

describe("legacy session migration", () => {
  let project: string;
  beforeEach(() => {
    project = fs.mkdtempSync(join(tmpdir(), "oma-migration-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(project, { recursive: true, force: true });
  });

  function legacy(sid = "oma-old") {
    const dir = join(legacySessionsDir(project), sid);
    fs.mkdirSync(join(dir, "inject-log"), { recursive: true });
    emitEvent(project, sid, {
      kind: "session.created",
      ts: "2026-01-01T00:00:00Z",
      payload: { workflow: "review" },
    });
    fs.writeFileSync(
      join(dir, "inject-log", "boundary.md"),
      "original injection\n",
    );
    return dir;
  }

  it("previews source and destination without filesystem writes", () => {
    const source = legacy();
    // Event writes need a lock, but the migration preview must add nothing.
    fs.rmSync(profileDir(), { recursive: true, force: true });
    const before = fs.readFileSync(join(source, "events.jsonl"));
    const result = migrateLegacySessions({ projectDir: project, dryRun: true });
    expect(result.migrated).toHaveLength(1);
    expect(result.migrated[0]).toMatchObject({
      source,
      destination: join(sessionsDir(), "oma-old"),
    });
    expect(fs.existsSync(profileDir())).toBe(false);
    expect(fs.readFileSync(join(source, "events.jsonl"))).toEqual(before);
    expect(fs.existsSync(join(project, ".agents/state/session-backups"))).toBe(
      false,
    );
  });

  it("verifies every file, removes originals without backups and resumes at home", () => {
    const source = legacy();
    const original = fs.readFileSync(join(source, "events.jsonl"));
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed).toEqual([]);
    expect(result.migrated).toHaveLength(1);
    const entry = result.migrated[0];
    if (!entry) throw new Error("Expected a migrated session");
    expect(fs.existsSync(source)).toBe(false);
    expect(sessionDir(project, entry.sid)).toBe(entry.destination);
    expect(fs.existsSync(entry.cleanup)).toBe(false);
    expect(fs.readFileSync(join(entry.destination, "events.jsonl"))).toEqual(
      original,
    );
    expect(
      fs.readFileSync(
        join(entry.destination, "inject-log/boundary.md"),
        "utf8",
      ),
    ).toBe("original injection\n");
    expect(
      JSON.parse(
        fs.readFileSync(join(entry.destination, "context.json"), "utf8"),
      ),
    ).toEqual(projectIdentity(project));
    emitEvent(project, entry.sid, {
      kind: "workflow.phase",
      payload: { phase: "resumed" },
    });
    expect(readEvents(project, entry.sid)).toHaveLength(2);
    expect(fs.existsSync(join(project, ".agents/state/session-backups"))).toBe(
      false,
    );
    expect(collectState(project).sessions).toHaveLength(1);
    expect(migrateLegacySessions({ projectDir: project }).migrated).toEqual([]);
    garbageCollectLocalState({ baseDir: project, scope: "sessions", keep: 0 });
    expect(collectState(project).sessions).toEqual([]);
    expect(fs.existsSync(source)).toBe(false);
  });

  it("defers active sessions and adopts the legacy index without losing runtime pointers", () => {
    const source = legacy();
    legacy("oma-active");
    const original = {
      schemaVersion: 1,
      active: { main: "oma-active" },
      lastSession: {
        vendor: "codex",
        vendorSid: "runtime-1",
        ts: "2026-01-01",
      },
    };
    fs.writeFileSync(
      join(legacySessionsDir(project), "_index.json"),
      JSON.stringify(original),
    );
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.skipped.map((entry) => entry.sid)).toEqual(["oma-active"]);
    expect(result.migrated.map((entry) => entry.source)).toEqual([source]);
    expect(readIndex(project)).toEqual(original);
    expect(fs.existsSync(join(legacySessionsDir(project), "oma-active"))).toBe(
      true,
    );
    expect(fs.existsSync(join(project, ".agents/state/session-backups"))).toBe(
      false,
    );
    setActiveSession(project, "main", "new-home-session");
    expect(
      migrateLegacySessions({ projectDir: project }).migrated.map(
        (entry) => entry.sid,
      ),
    ).toEqual(["oma-active"]);
    expect(readIndex(project).active.main).toBe("new-home-session");
    expect(fs.existsSync(join(legacySessionsDir(project), "_index.json"))).toBe(
      false,
    );
  });

  it("moves legacy archives while preserving monthly buckets and inject logs", () => {
    const source = legacy();
    const archive = join(project, ".agents/state/archive/2026-01/oma-old");
    fs.mkdirSync(resolve(archive, ".."), { recursive: true });
    fs.renameSync(source, archive);
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed).toEqual([]);
    expect(result.migrated[0]?.destination).toBe(
      join(sessionArchiveRoot(project), "2026-01/oma-old"),
    );
    expect(collectArchivedState(project).sessions).toHaveLength(1);
    expect(viewSession("oma-old", project).archived).toBe(true);
    expect(migrateLegacySessions({ projectDir: project }).migrated).toEqual([]);
  });

  it("never overwrites another project's same-named session", () => {
    const source = legacy();
    const other = join(project, "other");
    fs.mkdirSync(other);
    emitEvent(other, "oma-old", { kind: "session.created" });
    const before = fs.readFileSync(join(sessionsDir(), "oma-old/events.jsonl"));
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed[0]?.reason).toContain("another project");
    expect(fs.existsSync(source)).toBe(true);
    expect(
      fs.readFileSync(join(sessionsDir(), "oma-old/events.jsonl")),
    ).toEqual(before);
  });

  it("keeps legacy live after a failed switch and finishes an identical published copy on retry", () => {
    const source = legacy();
    const rename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(from) === source)
        throw new Error("simulated interrupted switch");
      return rename(from, to);
    });
    expect(
      migrateLegacySessions({ projectDir: project }).failed[0]?.reason,
    ).toContain("interrupted switch");
    expect(sessionDir(project, "oma-old")).toBe(source);
    expect(fs.existsSync(join(sessionsDir(), "oma-old"))).toBe(true);
    vi.restoreAllMocks();
    expect(
      migrateLegacySessions({ projectDir: project }).migrated,
    ).toHaveLength(1);
    expect(sessionDir(project, "oma-old")).toBe(join(sessionsDir(), "oma-old"));
  });

  it("keeps source intact when the copied bytes fail verification", () => {
    const source = legacy();
    const copy = fs.cpSync;
    vi.spyOn(fs, "cpSync").mockImplementation((from, to, options) => {
      copy(from, to, options);
      if (String(from) === source)
        fs.appendFileSync(join(String(to), "events.jsonl"), "corrupted\n");
    });
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed[0]?.reason).toContain("verification failed");
    expect(fs.existsSync(source)).toBe(true);
    expect(fs.existsSync(join(sessionsDir(), "oma-old"))).toBe(false);
    expect(readEvents(project, "oma-old")).toHaveLength(1);
  });

  it("detects a source change during copying and does not switch paths", () => {
    const source = legacy();
    const copy = fs.cpSync;
    vi.spyOn(fs, "cpSync").mockImplementation((from, to, options) => {
      copy(from, to, options);
      if (String(from) === source)
        fs.appendFileSync(
          join(source, "inject-log/boundary.md"),
          "late write\n",
        );
    });
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed[0]?.reason).toContain("changed during copy");
    expect(sessionDir(project, "oma-old")).toBe(source);
  });

  it("refuses divergent destinations and nested symlinks", () => {
    const source = legacy();
    const destination = join(sessionsDir(), "oma-old");
    fs.cpSync(source, destination, { recursive: true });
    fs.writeFileSync(
      join(destination, "context.json"),
      JSON.stringify(projectIdentity(project)),
    );
    fs.appendFileSync(
      join(destination, "events.jsonl"),
      "newer target content\n",
    );
    expect(
      migrateLegacySessions({ projectDir: project }).failed[0]?.reason,
    ).toContain("differs");
    fs.rmSync(destination, { recursive: true });
    // File symlinks need elevated privileges on Windows; a junction is a link too.
    if (process.platform === "win32")
      fs.symlinkSync(
        join(source, "inject-log"),
        join(source, "link"),
        "junction",
      );
    else fs.symlinkSync(join(source, "events.jsonl"), join(source, "link"));
    expect(
      migrateLegacySessions({ projectDir: project }).failed[0]?.reason,
    ).toContain("links or special files");
    expect(fs.existsSync(source)).toBe(true);
  });

  it("fails closed on a corrupt index and cannot import into another profile", () => {
    const source = legacy();
    fs.writeFileSync(
      join(legacySessionsDir(project), "_index.json"),
      "{broken",
    );
    expect(() => migrateLegacySessions({ projectDir: project })).toThrow();
    expect(migrateProfileSessions.up(project)[0]).toContain("deferred");
    expect(fs.existsSync(source)).toBe(true);
    vi.stubEnv("OMA_PROFILE", "1");
    expect(() => migrateLegacySessions({ projectDir: project })).toThrow(
      "profile 0",
    );
    expect(migrateProfileSessions.up(project)).toEqual([]);
  });

  it("registers an idempotent install/update migration", () => {
    legacy();
    expect(migrateProfileSessions.up(project)[0]).toContain("migrated");
    expect(migrateProfileSessions.up(project)).toEqual([]);
    expect(fs.existsSync(indexPath(project))).toBe(true);
  });

  it("includes active sessions when requested while preserving active pointers", () => {
    const source = legacy("oma-active");
    const index = { schemaVersion: 1, active: { main: "oma-active" } };
    fs.writeFileSync(
      join(legacySessionsDir(project), "_index.json"),
      JSON.stringify(index),
    );
    const result = migrateLegacySessions({
      projectDir: project,
      includeActive: true,
    });
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.migrated).toHaveLength(1);
    expect(result.indexRemoved).toBe(true);
    expect(readIndex(project)).toEqual(index);
    expect(fs.existsSync(source)).toBe(false);
    emitEvent(project, "oma-active", { kind: "boundary" });
    expect(readEvents(project, "oma-active")).toHaveLength(2);
    expect(fs.existsSync(legacySessionsDir(project))).toBe(false);
  });

  it("retries partial source cleanup without retaining a permanent backup", () => {
    const source = legacy();
    const cleanup = join(
      project,
      ".agents/state/.session-migration-cleanup/sessions/oma-old",
    );
    const remove = fs.rmSync;
    vi.spyOn(fs, "rmSync").mockImplementation((path, options) => {
      if (String(path) === cleanup) {
        remove(join(cleanup, "events.jsonl"));
        throw new Error("interrupted cleanup");
      }
      remove(path, options);
    });
    const first = migrateLegacySessions({ projectDir: project });
    expect(first.failed[0]?.reason).toContain("interrupted cleanup");
    expect(fs.existsSync(source)).toBe(false);
    expect(fs.existsSync(cleanup)).toBe(true);
    expect(readEvents(project, "oma-old")).toHaveLength(1);
    vi.restoreAllMocks();
    const retry = migrateLegacySessions({ projectDir: project });
    expect(retry.failed).toEqual([]);
    expect(retry.migrated).toHaveLength(1);
    expect(fs.existsSync(cleanup)).toBe(false);
    expect(migrateLegacySessions({ projectDir: project }).migrated).toEqual([]);
  });

  it("preserves a pending original when the home copy no longer matches", () => {
    const source = legacy();
    const cleanup = join(
      project,
      ".agents/state/.session-migration-cleanup/sessions/oma-old",
    );
    const remove = fs.rmSync;
    vi.spyOn(fs, "rmSync").mockImplementation((path, options) => {
      if (String(path) === cleanup) throw new Error("interrupted cleanup");
      remove(path, options);
    });
    expect(migrateLegacySessions({ projectDir: project }).failed).toHaveLength(
      1,
    );
    vi.restoreAllMocks();
    fs.writeFileSync(
      join(sessionsDir(), "oma-old/events.jsonl"),
      "different\n",
    );
    expect(
      migrateLegacySessions({ projectDir: project }).failed[0]?.reason,
    ).toContain("differs");
    expect(fs.existsSync(cleanup)).toBe(true);
    expect(fs.existsSync(source)).toBe(false);
  });

  it("exposes preview and execution through oma state migrate --json", async () => {
    const source = legacy();
    setActiveSession(project, "main", "oma-old");
    const cwd = process.cwd();
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    async function run(args: string[]) {
      const program = new Command().exitOverride();
      registerState(program);
      const surface = createCommandSurface(program);
      await program.parseAsync(surface.normalize(args), { from: "user" });
      return JSON.parse(String(output.mock.calls.at(-1)?.[0]));
    }
    try {
      process.chdir(project);
      expect(
        (
          await run([
            "state",
            "migrate",
            "--dry-run",
            "--include-active",
            "--json",
          ])
        ).dryRun,
      ).toBe(true);
      expect(fs.existsSync(source)).toBe(true);
      expect(
        (await run(["state", "migrate", "--include-active", "--json"]))
          .migrated,
      ).toHaveLength(1);
      expect(fs.existsSync(source)).toBe(false);
    } finally {
      process.chdir(cwd);
    }
  });

  it("retains the original if flushing the destination fails", () => {
    const source = legacy();
    vi.spyOn(fs, "fsyncSync").mockImplementation(() => {
      throw new Error("disk sync failed");
    });
    const result = migrateLegacySessions({ projectDir: project });
    expect(result.failed[0]?.reason).toContain("disk sync failed");
    expect(fs.existsSync(source)).toBe(true);
    expect(readEvents(project, "oma-old")).toHaveLength(1);
  });

  it("serializes simultaneous migrations without duplicate copies", async () => {
    legacy();
    const module = resolve(import.meta.dirname, "session-migration.ts");
    const script = `import { migrateLegacySessions } from ${JSON.stringify(module)}; process.stdout.write(JSON.stringify(migrateLegacySessions({projectDir: ${JSON.stringify(project)}})));`;
    const results = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const { stdout } = await promisify(execFile)("bun", ["-e", script], {
          timeout: 10000,
        });
        return JSON.parse(stdout);
      }),
    );
    expect(results.flatMap((result) => result.failed)).toEqual([]);
    expect(results.flatMap((result) => result.migrated)).toHaveLength(1);
    expect(readEvents(project, "oma-old")).toHaveLength(1);
  });

  it("routes a concurrent event writer to home after the migration switch", async () => {
    const source = legacy();
    const marker = join(project, "writer-started");
    const module = resolve(import.meta.dirname, "events.ts");
    const script = `import { emitEvent } from ${JSON.stringify(module)}; import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "ready"); emitEvent(${JSON.stringify(project)}, "oma-old", {kind: "boundary"});`;
    const launch = promisify(execFile);
    let writer: ReturnType<typeof launch> | undefined;
    const rename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(from) === source) {
        writer = launch("bun", ["-e", script], { timeout: 10000 });
        const deadline = Date.now() + 5000;
        while (!fs.existsSync(marker)) {
          if (Date.now() > deadline) throw new Error("Writer failed to start");
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }
      }
      return rename(from, to);
    });
    const result = migrateLegacySessions({ projectDir: project });
    await writer;
    expect(result.failed).toEqual([]);
    expect(readEvents(project, "oma-old")).toHaveLength(2);
    expect(fs.existsSync(source)).toBe(false);
    expect(
      fs.existsSync(join(project, ".agents/state/.session-migration-cleanup")),
    ).toBe(false);
  });
});
