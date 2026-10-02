import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { garbageCollectLocalState } from "../commands/memory/gc.js";
import {
  archiveStateSessions,
  purgeStateSessions,
  repairStateSessions,
} from "../commands/state/maintenance.js";
import { collectState, viewSession } from "../commands/state/sessions.js";
import {
  activateWorkflowSession,
  createSessionId,
  emitEvent,
  ensureProfile,
  eventsPath,
  indexPath,
  legacySessionsDir,
  listSessionIds,
  metaPath,
  profileDir,
  projectIdentity,
  readEvents,
  readIndex,
  sessionDir,
  sessionsDir,
  setActiveSession,
  updateIndex,
} from "./events.js";

describe("profile session storage", () => {
  let workspace: string;
  let project: string;
  let other: string;
  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-storage-"));
    project = join(workspace, "no-git-project");
    other = join(workspace, "other-worktree");
    mkdirSync(project);
    mkdirSync(other);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(workspace, { recursive: true, force: true });
  });

  function create(dir: string, sid = createSessionId()) {
    activateWorkflowSession({ projectDir: dir, workflow: "review", sid });
    return sid;
  }

  it("creates a dated home session and a stable anonymous profile without Git", () => {
    const sid = create(project);
    expect(sid).toMatch(/^\d{4}-\d{2}-\d{2}_[A-Za-z0-9_-]{16}$/);
    expect(eventsPath(project, sid)).toBe(
      join(
        process.env.OMA_STATE_HOME ?? "",
        "u/0/sessions",
        sid,
        "events.jsonl",
      ),
    );
    expect(existsSync(legacySessionsDir(project))).toBe(false);
    const profile = ensureProfile();
    expect(profile).toMatchObject({ slot: "0", account: null });
    expect(ensureProfile().profileId).toBe(profile.profileId);
    expect(
      JSON.parse(readFileSync(metaPath(project, sid), "utf-8")),
    ).toMatchObject(projectIdentity(project));
    rmSync(project, { recursive: true });
    expect(readEvents(project, sid)).toHaveLength(1);
    expect(readIndex(project).active.main).toBe(sid);
  });

  it("keeps the path unchanged when resuming on a later day", () => {
    const sid = createSessionId(new Date("2026-09-06T23:59:59Z"));
    create(project, sid);
    emitEvent(project, sid, {
      kind: "workflow.phase",
      ts: "2026-09-07T00:01:00Z",
      payload: { phase: "verify" },
    });
    expect(sessionDir(project, sid)).toBe(join(sessionsDir(), sid));
    expect(readEvents(project, sid)).toHaveLength(2);
  });

  it("initializes one persistent profile across concurrent CLI and hook processes", async () => {
    const modulePath = resolve(
      import.meta.dirname,
      "../../.agents/hooks/core/session-storage.ts",
    );
    const script = `import { ensureProfile } from ${JSON.stringify(modulePath)}; process.stdout.write(JSON.stringify(ensureProfile()));`;
    const profiles = await Promise.all(
      Array.from({ length: 6 }, async () => {
        const { stdout } = await promisify(execFile)("bun", ["-e", script], {
          timeout: 10_000,
        });
        return JSON.parse(stdout).profileId;
      }),
    );
    expect(new Set(profiles)).toEqual(new Set([ensureProfile().profileId]));
  });

  it("preserves a linked account and session paths on subsequent writes", () => {
    const sid = create(project);
    const path = sessionDir(project, sid);
    const profile = {
      ...ensureProfile(),
      account: { issuer: "https://accounts.example", subject: "user-123" },
    };
    writeFileSync(join(profileDir(), "profile.json"), JSON.stringify(profile));
    emitEvent(project, sid, { kind: "boundary" });
    expect(ensureProfile()).toEqual(profile);
    expect(sessionDir(project, sid)).toBe(path);
  });

  it("isolates active pointers, reads, and maintenance across projects", () => {
    const a = create(project);
    const b = create(other);
    expect(readIndex(project).active.main).toBe(a);
    expect(collectState(project).sessions.map((s) => s.sid)).toEqual([a]);
    expect(() => readEvents(project, b)).toThrow("another project");
    expect(() => emitEvent(project, b, { kind: "boundary" })).toThrow(
      "another project",
    );
    updateIndex(project, (index) => {
      index.active = {};
    });
    const gc = garbageCollectLocalState({
      baseDir: project,
      scope: "sessions",
      keep: 0,
    });
    expect(gc.prunedSessions).toEqual([sessionDir(project, a)]);
    expect(readEvents(other, b)).toHaveLength(1);
    expect(repairStateSessions({ projectDir: project }).unchanged).toBe(true);
    expect(listSessionIds(project)).toEqual([]);
    expect(readIndex(other).active.main).toBe(b);
  });

  it("separates profiles and does not expose legacy sessions to another account", () => {
    const a = create(project, "same-sid");
    const firstProfile = ensureProfile();
    const legacy = join(legacySessionsDir(project), "legacy");
    mkdirSync(legacy, { recursive: true });
    vi.stubEnv("OMA_PROFILE", "1");
    expect(readIndex(project).active).toEqual({});
    expect(listSessionIds(project)).toEqual([]);
    create(project, a);
    expect(ensureProfile().profileId).not.toBe(firstProfile.profileId);
    expect(profileDir()).toContain(join("u", "1"));
    expect(listSessionIds(project)).toEqual([a]);
    vi.stubEnv("OMA_PROFILE", "0");
    expect(ensureProfile()).toEqual(firstProfile);
    expect(listSessionIds(project).sort()).toEqual(["legacy", a].sort());
  });

  it("resumes existing project sessions and copies the old active index on first update", () => {
    const sid = "oma-legacy";
    const legacy = join(legacySessionsDir(project), sid);
    mkdirSync(legacy, { recursive: true });
    writeFileSync(
      join(legacy, "events.jsonl"),
      `${JSON.stringify({
        sid,
        eventId: "old",
        kind: "session.created",
        ts: "2026-01-01T00:00:00Z",
        payload: { workflow: "review" },
      })}\n`,
    );
    const oldIndex = join(legacySessionsDir(project), "_index.json");
    const original = JSON.stringify({
      schemaVersion: 1,
      active: { main: sid },
    });
    writeFileSync(oldIndex, original);
    expect(readIndex(project).active.main).toBe(sid);
    emitEvent(project, sid, {
      kind: "workflow.phase",
      payload: { phase: "verify" },
    });
    expect(readEvents(project, sid)).toHaveLength(2);
    expect(sessionDir(project, sid)).toBe(legacy);
    setActiveSession(project, "side", "new-sid");
    expect(readIndex(project).active).toEqual({ main: sid, side: "new-sid" });
    expect(existsSync(indexPath(project))).toBe(true);
    expect(readFileSync(oldIndex, "utf-8")).toBe(original);
    expect(collectState(project).sessions.map((s) => s.sid)).toEqual([sid]);
  });

  it("archives and purges only the current project's sessions", () => {
    const a = create(project);
    const b = create(other);
    emitEvent(project, a, {
      kind: "session.ended",
      payload: { status: "completed" },
    });
    updateIndex(project, (index) => {
      index.active = {};
    });
    const args = {
      projectDir: project,
      olderThan: "0d",
      now: new Date("2099-01-01"),
    };
    expect(
      archiveStateSessions({ ...args, dryRun: true }).archived.map(
        (s) => s.sid,
      ),
    ).toEqual([a]);
    expect(existsSync(sessionDir(project, a))).toBe(true);
    archiveStateSessions(args);
    expect(viewSession(a, project).archived).toBe(true);
    expect(purgeStateSessions(args).purged).toEqual([]);
    expect(readEvents(other, b)).toHaveLength(1);
  });

  it("uses the same project identity through a filesystem alias", () => {
    const alias = join(workspace, "alias");
    symlinkSync(project, alias, "junction");
    const sid = create(project);
    expect(readIndex(alias).active.main).toBe(sid);
    expect(listSessionIds(alias)).toEqual([sid]);
  });

  it("rejects invalid profile and session paths", () => {
    for (const sid of ["../escape", "/absolute", "a/b", "..evil", ""]) {
      expect(() => emitEvent(project, sid, { kind: "boundary" })).toThrow(
        "Invalid session id",
      );
    }
    vi.stubEnv("OMA_PROFILE", "../escape");
    expect(() => sessionsDir()).toThrow("OMA_PROFILE");
    vi.stubEnv("OMA_PROFILE", "0");
    vi.stubEnv("OMA_STATE_HOME", "relative");
    expect(() => sessionsDir()).toThrow("OMA_STATE_HOME");
  });
});
