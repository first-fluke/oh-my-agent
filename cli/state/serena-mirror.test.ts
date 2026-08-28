import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCoordinationStorePath } from "../io/memory.js";
import { activateWorkflowSession, emitEvent, readEvents } from "./events.js";
import { mirrorSessionToSerena } from "./serena-mirror.js";
import {
  buildSessionSummary,
  exportSessionSummary,
  sessionSummaryName,
} from "./session-summary.js";

function seedSession(projectDir: string, sid: string): void {
  activateWorkflowSession({
    projectDir,
    workflow: "ultrawork",
    sid,
    vendor: "claude-code",
    vendorSid: "vendor-1",
  });
  emitEvent(projectDir, sid, {
    kind: "decision.made",
    payload: {
      subject: "JWT expiry",
      decision: "24h",
      rationale: "mobile-first",
    },
  });
  emitEvent(projectDir, sid, {
    kind: "gate.passed",
    payload: { gate: "phase-1-design", by: "architecture-reviewer-01" },
  });
  emitEvent(projectDir, sid, {
    kind: "session.ended",
    payload: { status: "completed" },
  });
}

describe("session-summary", () => {
  let projectDir: string;
  const sid = "01HXZKTESTSID";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-session-summary-"));
    seedSession(projectDir, sid);
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  describe("sessionSummaryName", () => {
    it("builds a sanitized session summary name", () => {
      expect(sessionSummaryName("ultrawork", sid)).toBe(
        `session-ultrawork-${sid.toLowerCase()}`,
      );
      expect(sessionSummaryName("Deep Sec!", "AB/CD")).toBe(
        "session-deep-sec-ab-cd",
      );
    });
  });

  describe("buildSessionSummary", () => {
    it("includes decisions, gates, and recent events", () => {
      const events = readEvents(projectDir, sid);
      const content = buildSessionSummary(
        sid,
        {
          sid,
          schemaVersion: 1,
          workflow: "ultrawork",
          category: "main",
          status: "completed",
          gatesPassedBy: [],
          pendingPeerReviews: [],
        },
        events,
      );
      expect(content).toContain(`# OMA Session Summary: ultrawork ${sid}`);
      expect(content).toContain("**JWT expiry** → 24h");
      expect(content).toContain("mobile-first");
      expect(content).toContain("phase-1-design by architecture-reviewer-01");
      expect(content).toContain("`session.ended`");
    });
  });

  describe("exportSessionSummary", () => {
    it("writes a direct-fs summary when no external writer is supplied", async () => {
      const result = await exportSessionSummary({ projectDir, sid });
      expect(result).toMatchObject({
        sid,
        workflow: "ultrawork",
        method: "direct-fs",
        written: true,
      });
      const expectedPath = join(
        getCoordinationStorePath(projectDir),
        `${sessionSummaryName("ultrawork", sid)}.md`,
      );
      expect(result.path).toBe(expectedPath);
      expect(existsSync(expectedPath)).toBe(true);
      expect(readFileSync(expectedPath, "utf-8")).toContain("**JWT expiry**");
    });

    it("prefers an explicitly supplied external writer when it succeeds", async () => {
      const calls: Array<{ name: string; content: string }> = [];
      const result = await exportSessionSummary({
        projectDir,
        sid,
        writer: {
          write(name, content) {
            calls.push({ name, content });
            return true;
          },
        },
      });
      expect(result.method).toBe("external-writer");
      expect(result.written).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.name).toBe(sessionSummaryName("ultrawork", sid));
      // The external writer succeeded, so no direct-fs file is written.
      expect(existsSync(result.path)).toBe(false);
    });

    it("falls back to direct-fs when the external writer returns false", async () => {
      const result = await exportSessionSummary({
        projectDir,
        sid,
        writer: {
          write() {
            return false;
          },
        },
      });
      expect(result.method).toBe("direct-fs");
      expect(result.written).toBe(true);
      expect(existsSync(result.path)).toBe(true);
    });

    it("falls back to direct-fs when the external writer throws", async () => {
      const result = await exportSessionSummary({
        projectDir,
        sid,
        writer: {
          write() {
            throw new Error("mcp unavailable");
          },
        },
      });
      expect(result.method).toBe("direct-fs");
      expect(result.written).toBe(true);
    });

    it("emits a warning event and never throws when both paths fail", async () => {
      // Route the mirror at the legacy store (the resolver picks it when the
      // canonical dir is absent), then make it read-only so the write fails.
      const memoriesDir = join(projectDir, ".serena", "memories");
      mkdirSync(memoriesDir, { recursive: true });
      chmodSync(memoriesDir, 0o400);

      let result: Awaited<ReturnType<typeof exportSessionSummary>>;
      try {
        result = await exportSessionSummary({ projectDir, sid });
      } finally {
        chmodSync(memoriesDir, 0o700);
      }

      expect(result.written).toBe(false);
      expect(result.method).toBe("none");
      expect(result.warning).toBeTruthy();

      const warnings = readEvents(projectDir, sid).filter(
        (event) => event.kind === "mirror.warning",
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.payload?.summaryName).toBe(
        sessionSummaryName("ultrawork", sid),
      );
    });
  });

  it("keeps the deprecated Serena facade compatible", async () => {
    const result = await mirrorSessionToSerena({ projectDir, sid });
    expect(result.memoryName).toBe(sessionSummaryName("ultrawork", sid));
    expect(result.method).toBe("direct-fs");
  });
});
