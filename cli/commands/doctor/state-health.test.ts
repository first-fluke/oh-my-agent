import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateWorkflowSession, eventsPath } from "../../state/events.js";
import { collectStateDoctorCheck } from "./state-health.js";

describe("state event diagnostics", () => {
  let projectDir: string;
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-event-doctor-"));
    activateWorkflowSession({
      projectDir,
      sid: "oma-health",
      workflow: "review",
    });
  });
  afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

  it("flags corrupt decision and terminal payloads without rejecting extension events", () => {
    const envelope = {
      eventId: "legacy-event",
      ts: "2026-10-02T00:00:00.000Z",
      sid: "oma-health",
      writerPid: 1,
    };
    const records = [
      {
        ...envelope,
        kind: "decision.made",
        payload: { subject: "review.severity-classification" },
      },
      { ...envelope, kind: "session.ended", payload: { status: "cancelled" } },
      { ...envelope, kind: "blocker.raised", payload: { summary: "  " } },
      { ...envelope, kind: "custom.extension", payload: {} },
    ];
    appendFileSync(
      eventsPath(projectDir, "oma-health"),
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    );
    const check = collectStateDoctorCheck(projectDir);
    expect(check.sessions).toContainEqual({
      sid: "oma-health",
      metaOk: true,
      invalidEventLines: 3,
    });
    expect(check.issues).toContain(
      "state events contain 3 invalid line(s): oma-health",
    );
  });
});
