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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  activateWorkflowSession,
  emitEvent,
  eventsPath,
  metaPath,
  readIndex,
  sessionArchiveRoot,
  sessionDir,
  sessionsDir,
  setActiveSession,
} from "../../state/events.js";
import {
  activateStateSession,
  archiveStateSessions,
  collectArchivedState,
  collectState,
  isValidSid,
  listInjectLogs,
  parseOlderThan,
  purgeStateSessions,
  renderArchivedStateList,
  renderArchiveResult,
  renderInjectLogView,
  renderPurgeResult,
  renderRepairResult,
  renderSessionView,
  renderStateList,
  repairStateSessions,
  viewInjectLog,
  viewSession,
} from "./command.js";

describe("state command helpers", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-state-command-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("collects sessions with active markers", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-main",
      workflow: "work",
      vendor: "codex",
      vendorSid: "codex-1",
    });
    emitEvent(projectDir, "oma-main", {
      eventId: "phase-1",
      ts: "2026-05-25T00:00:01.000Z",
      kind: "workflow.phase",
      payload: { phase: "implement" },
    });
    activateStateSession("oma-main", "qa", projectDir);

    const state = collectState(projectDir);
    expect(state.index.active).toMatchObject({
      main: "oma-main",
      qa: "oma-main",
    });
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]).toMatchObject({
      sid: "oma-main",
      workflow: "work",
      currentPhase: "implement",
    });
  });

  it("renders list and session views without requiring color-aware assertions", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-view",
      workflow: "debug",
    });

    const list = renderStateList(collectState(projectDir));
    expect(list).toContain("OMA state sessions");
    expect(list).toContain("oma-view");
    expect(list).toContain("debug");

    const session = viewSession("oma-view", projectDir);
    const detail = renderSessionView("oma-view", session.meta, session.events);
    expect(detail).toContain("OMA session oma-view");
    expect(detail).toContain("workflow: debug");
    expect(detail).toContain("session.created");
  });

  it("renders decisions and missing decisions in session detail", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-decisions",
      workflow: "work",
    });
    emitEvent(projectDir, "oma-decisions", {
      kind: "decision.made",
      payload: {
        subject: "work.remediation-choice",
        decision: "Fix the critical issue.",
        rationale: "QA confirmed it blocks completion.",
      },
    });
    emitEvent(projectDir, "oma-decisions", {
      kind: "decision.missing",
      payload: {
        workflow: "work",
        checkpoint: "remediation-choice",
      },
    });

    const session = viewSession("oma-decisions", projectDir);
    const detail = renderSessionView(
      "oma-decisions",
      session.meta,
      session.events,
    );
    expect(detail).toContain("Decisions");
    expect(detail).toContain("work.remediation-choice");
    expect(detail).toContain("Missing Decisions");
    expect(detail).toContain("work/remediation-choice");
  });

  it("purges inactive sessions older than the explicit threshold", () => {
    emitEvent(projectDir, "oma-old", {
      eventId: "old-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });
    activateWorkflowSession({
      projectDir,
      sid: "oma-active-old",
      workflow: "debug",
    });
    emitEvent(projectDir, "oma-active-old", {
      eventId: "active-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "debug", category: "main" },
    });
    emitEvent(projectDir, "oma-recent", {
      eventId: "recent-created",
      ts: "2026-05-20T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "review", category: "main" },
    });

    const result = purgeStateSessions({
      projectDir,
      olderThan: "90d",
      now: new Date("2026-05-26T00:00:00.000Z"),
    });

    expect(result.purged).toEqual(["oma-old"]);
    expect(result.skippedActive).toContain("oma-active-old");
    expect(result.skippedRecent).toContain("oma-recent");
    expect(existsSync(sessionDir(projectDir, "oma-old"))).toBe(false);
    expect(existsSync(sessionDir(projectDir, "oma-active-old"))).toBe(true);
    expect(readIndex(projectDir).active.main).toBe("oma-active-old");
  });

  it("supports purge dry-run and duration parsing", () => {
    emitEvent(projectDir, "oma-old", {
      eventId: "old-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });

    const result = purgeStateSessions({
      projectDir,
      olderThan: "24h",
      dryRun: true,
      now: new Date("2026-01-03T00:00:00.000Z"),
    });

    expect(parseOlderThan("30m")).toBe(30 * 60 * 1000);
    expect(result.purged).toEqual(["oma-old"]);
    expect(existsSync(sessionDir(projectDir, "oma-old"))).toBe(true);
    expect(renderPurgeResult(result)).toContain("purge preview");
  });

  it("archives inactive terminal sessions into monthly buckets", () => {
    emitEvent(projectDir, "oma-old-done", {
      eventId: "old-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-old-done", {
      eventId: "old-ended",
      ts: "2026-01-02T00:00:00.000Z",
      kind: "session.ended",
      payload: { status: "completed" },
    });
    emitEvent(projectDir, "oma-old-open", {
      eventId: "open-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "debug", category: "main" },
    });
    activateWorkflowSession({
      projectDir,
      sid: "oma-active-done",
      workflow: "review",
    });
    emitEvent(projectDir, "oma-active-done", {
      eventId: "active-ended",
      ts: "2026-01-02T00:00:00.000Z",
      kind: "session.ended",
      payload: { status: "completed" },
    });
    // Seed a stale pointer to verify that archiving still protects it.
    setActiveSession(projectDir, "main", "oma-active-done");

    const result = archiveStateSessions({
      projectDir,
      olderThan: "90d",
      now: new Date("2026-05-26T00:00:00.000Z"),
    });

    expect(result.archived.map((entry) => entry.sid)).toEqual(["oma-old-done"]);
    expect(result.skippedOpen).toContain("oma-old-open");
    expect(result.skippedActive).toContain("oma-active-done");
    expect(existsSync(sessionDir(projectDir, "oma-old-done"))).toBe(false);
    expect(
      existsSync(
        join(sessionArchiveRoot(projectDir), "2026-01", "oma-old-done"),
      ),
    ).toBe(true);
    expect(renderArchiveResult(result)).toContain("OMA state archive");
  });

  it("lists and views archived sessions", () => {
    emitEvent(projectDir, "oma-archived", {
      eventId: "created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-archived", {
      eventId: "ended",
      ts: "2026-01-02T00:00:00.000Z",
      kind: "session.ended",
      payload: { status: "completed" },
    });
    archiveStateSessions({
      projectDir,
      olderThan: "90d",
      now: new Date("2026-05-26T00:00:00.000Z"),
    });

    const archived = collectArchivedState(projectDir);
    expect(archived.sessions).toHaveLength(1);
    expect(archived.sessions[0]).toMatchObject({
      bucket: "2026-01",
      sid: "oma-archived",
      meta: { workflow: "work", status: "completed" },
    });

    const list = renderArchivedStateList(archived);
    expect(list).toContain("OMA archived state sessions");
    expect(list).toContain("oma-archived");

    const session = viewSession("oma-archived", projectDir);
    expect(session.archived).toBe(true);
    expect(session.archivePath).toContain("2026-01");
    const detail = renderSessionView(
      "oma-archived",
      session.meta,
      session.events,
      {
        archived: session.archived,
        archivePath: session.archivePath,
      },
    );
    expect(detail).toContain("archived: yes");
    expect(detail).toContain("archivePath:");
  });

  it("prefers a live session when the same sid exists in archive", () => {
    emitEvent(projectDir, "oma-dup", {
      eventId: "archived-created",
      ts: "2026-01-01T00:00:00.000Z",
      kind: "session.created",
      payload: { workflow: "work", category: "main" },
    });
    emitEvent(projectDir, "oma-dup", {
      eventId: "archived-ended",
      ts: "2026-01-02T00:00:00.000Z",
      kind: "session.ended",
      payload: { status: "completed" },
    });
    archiveStateSessions({
      projectDir,
      olderThan: "90d",
      now: new Date("2026-05-26T00:00:00.000Z"),
    });
    activateWorkflowSession({
      projectDir,
      sid: "oma-dup",
      workflow: "debug",
    });

    const session = viewSession("oma-dup", projectDir);
    expect(session.archived).toBe(false);
    expect(session.meta.workflow).toBe("debug");
  });

  it("repairs corrupt meta and quarantines invalid event lines", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-repair",
      workflow: "debug",
    });
    writeFileSync(metaPath(projectDir, "oma-repair"), "{bad json", "utf-8");
    writeFileSync(
      eventsPath(projectDir, "oma-repair"),
      [
        JSON.stringify({
          sid: "oma-repair",
          kind: "session.created",
          eventId: "evt-valid",
          ts: "2026-06-01T00:00:00.000Z",
          writerPid: 1,
          payload: { workflow: "debug", category: "main" },
        }),
        "{bad json",
      ].join("\n"),
      "utf-8",
    );

    const result = repairStateSessions({ projectDir });

    expect(result.repairedMeta).toEqual(["oma-repair"]);
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({ sid: "oma-repair", invalidLines: 1 }),
    ]);
    expect(
      JSON.parse(readFileSync(metaPath(projectDir, "oma-repair"), "utf-8")),
    ).toMatchObject({
      sid: "oma-repair",
      workflow: "debug",
    });
    expect(
      readFileSync(eventsPath(projectDir, "oma-repair"), "utf-8"),
    ).toContain("evt-valid");
    expect(
      readFileSync(eventsPath(projectDir, "oma-repair"), "utf-8"),
    ).not.toContain("{bad json");
    expect(
      readFileSync(
        join(sessionDir(projectDir, "oma-repair"), "events.bad.jsonl"),
        "utf-8",
      ),
    ).toContain("{bad json");
    expect(renderRepairResult(result)).toContain("OMA state repair");
  });

  it("supports repair dry-run without modifying state files", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-dry-run",
      workflow: "work",
    });
    writeFileSync(metaPath(projectDir, "oma-dry-run"), "{bad json", "utf-8");
    const before = readFileSync(metaPath(projectDir, "oma-dry-run"), "utf-8");

    const result = repairStateSessions({ projectDir, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.repairedMeta).toEqual(["oma-dry-run"]);
    expect(readFileSync(metaPath(projectDir, "oma-dry-run"), "utf-8")).toBe(
      before,
    );
    expect(renderRepairResult(result)).toContain("repair preview");
  });

  it("removes stale active pointers and reassigns stale main to the newest session", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-live",
      workflow: "work",
    });
    activateStateSession("missing-main", "main", projectDir);
    activateStateSession("missing-tool", "tool.debug", projectDir);

    const result = repairStateSessions({ projectDir });

    expect(result.removedActive).toEqual([
      { category: "main", sid: "missing-main" },
      { category: "tool.debug", sid: "missing-tool" },
    ]);
    expect(result.reassignedActive).toEqual([
      { category: "main", from: "missing-main", to: "oma-live" },
    ]);
    expect(readIndex(projectDir).active).toEqual({ main: "oma-live" });
  });

  it("reports no-op repair on healthy state", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-healthy",
      workflow: "review",
    });

    const result = repairStateSessions({ projectDir });

    expect(result.unchanged).toBe(true);
    expect(renderRepairResult(result)).toContain("no repairs needed");
  });

  it("lists and views per-boundary inject logs", () => {
    const sid = "oma-inject";
    activateWorkflowSession({ projectDir, sid, workflow: "ultrawork" });
    const dir = join(sessionDir(projectDir, sid), "inject-log");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "2026-06-02T20-00-00-000Z.md"),
      "# inject one\nrendered body",
      "utf-8",
    );
    writeFileSync(
      join(dir, "2026-06-02T21-00-00-000Z.md"),
      "# inject two",
      "utf-8",
    );

    const entries = listInjectLogs(sid, projectDir);
    expect(entries.map((entry) => entry.file)).toEqual([
      "2026-06-02T20-00-00-000Z.md",
      "2026-06-02T21-00-00-000Z.md",
    ]);

    const list = viewInjectLog(sid, { projectDir });
    expect(renderInjectLogView(list)).toContain("2026-06-02T20-00-00-000Z.md");

    const single = viewInjectLog(sid, {
      projectDir,
      entry: "2026-06-02T20-00-00-000Z",
    });
    expect(single.content).toContain("rendered body");
    expect(renderInjectLogView(single)).toBe("# inject one\nrendered body");
  });

  it("returns an empty inject-log view for sessions without logs", () => {
    activateWorkflowSession({ projectDir, sid: "oma-nolog", workflow: "work" });
    expect(listInjectLogs("oma-nolog", projectDir)).toEqual([]);
    expect(
      renderInjectLogView(viewInjectLog("oma-nolog", { projectDir })),
    ).toContain("(none)");
  });
});

describe("isValidSid", () => {
  it("accepts typical oma session ids", () => {
    expect(isValidSid("oma-main")).toBe(true);
    expect(isValidSid("oma-view")).toBe(true);
    expect(isValidSid("sid-1")).toBe(true);
    expect(isValidSid("oma-active-old")).toBe(true);
    expect(isValidSid("Session123")).toBe(true);
    expect(isValidSid("a")).toBe(true);
    expect(isValidSid("a.b-c_d")).toBe(true);
  });

  it("rejects names containing path traversal (..) sequences", () => {
    expect(isValidSid("..")).toBe(false);
    expect(isValidSid("../etc")).toBe(false);
    expect(isValidSid("foo/../bar")).toBe(false);
    expect(isValidSid("oma-..main")).toBe(false);
  });

  it("rejects names with disallowed characters", () => {
    expect(isValidSid("foo/bar")).toBe(false);
    expect(isValidSid("foo\\bar")).toBe(false);
    expect(isValidSid("foo bar")).toBe(false);
    expect(isValidSid("foo;bar")).toBe(false);
    expect(isValidSid("")).toBe(false);
  });

  it("rejects names longer than 128 characters", () => {
    const long = "a".repeat(129);
    expect(isValidSid(long)).toBe(false);
    const exact = "a".repeat(128);
    expect(isValidSid(exact)).toBe(true);
  });
});

describe("collectState / repairStateSessions sid filtering", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-sid-filter-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("collectState ignores directories with path-traversal names", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-safe",
      workflow: "work",
    });

    // Manually create a directory with a dangerous name inside the sessions dir
    const dangerous = join(sessionsDir(projectDir), "..evil");
    mkdirSync(dangerous, { recursive: true });

    const state = collectState(projectDir);
    const sids = state.sessions.map((s) => s.sid);
    expect(sids).toContain("oma-safe");
    expect(sids).not.toContain("..evil");
  });

  it("repairStateSessions ignores directories with path-traversal names", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-repair",
      workflow: "work",
    });

    // Create a dir whose name starts with ".." — isValidSid rejects it
    const sessDir = sessionsDir(projectDir);
    const dangerous = join(sessDir, "..escape");
    mkdirSync(dangerous, { recursive: true });

    const result = repairStateSessions({ projectDir, dryRun: true });
    // Only oma-repair should appear; the traversal name must never be processed
    const allSids = [
      ...result.repairedMeta,
      ...result.quarantinedEvents.map((q) => q.sid),
    ];
    expect(allSids.some((s) => s.includes("..") || s === "escape")).toBe(false);
  });
});
