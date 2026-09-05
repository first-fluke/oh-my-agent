import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as events from "../../state/events.js";
import {
  archiveStateSessions,
  purgeStateSessions,
  repairStateSessions,
} from "./maintenance.js";
import * as sessions from "./sessions.js";

describe("maintenance preserves newer index writes", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-maintenance-race-"));
    events.emitEvent(root, "oma-old", {
      kind: "session.created",
      ts: "2025-01-01T00:00:00.000Z",
    });
    events.emitEvent(root, "oma-old", {
      kind: "session.ended",
      ts: "2025-01-02T00:00:00.000Z",
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function concurrentUpdate() {
    events.setActiveSession(root, "research", "oma-new");
    events.setLastSession(root, "codex", "new-vendor-session");
  }

  for (const [name, run] of [
    ["purge", purgeStateSessions],
    ["archive", archiveStateSessions],
  ] as const) {
    it(`${name} does not rewrite its old index snapshot`, () => {
      const collect = sessions.collectState;
      vi.spyOn(sessions, "collectState").mockImplementationOnce((...args) => {
        const snapshot = collect(...args);
        concurrentUpdate();
        return snapshot;
      });
      run({
        projectDir: root,
        olderThan: "90d",
        now: new Date("2026-09-05T00:00:00.000Z"),
      });
      expect(events.readIndex(root)).toMatchObject({
        active: { research: "oma-new" },
        lastSession: { vendorSid: "new-vendor-session" },
      });
    });
  }

  it("repair only replaces pointers that still match the inspected value", () => {
    events.setActiveSession(root, "main", "oma-missing");
    const read = events.readIndex;
    vi.spyOn(events, "readIndex").mockImplementationOnce((project) => {
      const snapshot = read(project);
      concurrentUpdate();
      events.setActiveSession(root, "main", "oma-old");
      return snapshot;
    });
    repairStateSessions({ projectDir: root });
    expect(events.readIndex(root)).toMatchObject({
      active: { main: "oma-old", research: "oma-new" },
      lastSession: { vendorSid: "new-vendor-session" },
    });
  });
});
