import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  injectLogDir,
  injectLogFilename,
  redactSecrets,
  writeInjectLog,
} from "../../.agents/hooks/core/inject-log.ts";
import { activateWorkflowSession, emitEvent } from "../state/events.js";
import { exportSessionSummary } from "../state/session-summary.js";

const isPosix = process.platform !== "win32";

function baseEntry(overrides = {}) {
  return {
    boundaryAt: "2026-06-02T20:00:00.000Z",
    fromVendor: "claude",
    fromVendorSid: "old-sid",
    toVendor: "codex",
    toVendorSid: "new-sid",
    recallQuery: null,
    facts: [],
    rendered: "[OMA STATE SNAPSHOT]\nsid: oma-1",
    ...overrides,
  };
}

describe("inject-log privacy (D52/D57)", () => {
  let projectDir: string;
  const sid = "01HXZKINJECT";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-ilog-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  describe("redactSecrets", () => {
    it("redacts common token shapes", () => {
      expect(redactSecrets("key sk-abcdefABCDEF0123456789")).toContain(
        "[REDACTED]",
      );
      expect(redactSecrets("key sk-abcdefABCDEF0123456789")).not.toContain(
        "abcdefABCDEF0123456789",
      );
      expect(redactSecrets("aws AKIAIOSFODNN7EXAMPLE here")).toContain(
        "[REDACTED]",
      );
      expect(
        redactSecrets("Authorization: Bearer abcdef0123456789xyz"),
      ).toContain("[REDACTED]");
    });

    it("keeps the key name but hides the value for keyed secrets", () => {
      const out = redactSecrets("api_key=ABCDEFGH12345678");
      expect(out).toContain("api_key=");
      expect(out).toContain("[REDACTED]");
      expect(out).not.toContain("ABCDEFGH12345678");
    });

    it("supports extra patterns via OMA_REDACT_PATTERNS", () => {
      const prev = process.env.OMA_REDACT_PATTERNS;
      process.env.OMA_REDACT_PATTERNS = "INTERNAL-[0-9]+";
      try {
        expect(redactSecrets("token INTERNAL-99887766")).not.toContain(
          "INTERNAL-99887766",
        );
      } finally {
        if (prev === undefined) delete process.env.OMA_REDACT_PATTERNS;
        else process.env.OMA_REDACT_PATTERNS = prev;
      }
    });

    it("leaves plain text untouched", () => {
      expect(redactSecrets("just a normal sentence")).toBe(
        "just a normal sentence",
      );
    });
  });

  describe("writeInjectLog", () => {
    it("writes a redacted log under .agents/state (gitignored)", () => {
      const path = writeInjectLog(
        projectDir,
        sid,
        baseEntry({
          recallQuery: "resume work for sk-SECRETSECRET0123456789",
          facts: [
            { text: "decided api_key=TOPSECRET99 earlier", source: "L3" },
          ],
          rendered: "snapshot with token AKIAIOSFODNN7EXAMPLE",
        }),
      );
      expect(path).not.toBeNull();
      expect(path).toContain(join(".agents", "state", "sessions"));
      expect(path).toContain(join(sid, "inject-log"));

      const content = readFileSync(path as string, "utf-8");
      expect(content).toContain("[REDACTED]");
      expect(content).not.toContain("SECRETSECRET0123456789");
      expect(content).not.toContain("TOPSECRET99");
      expect(content).not.toContain("AKIAIOSFODNN7EXAMPLE");
      // The key label survives so the log stays useful.
      expect(content).toContain("api_key=");
    });

    it("sanitizes the ISO timestamp into a safe filename", () => {
      expect(injectLogFilename("2026-06-02T20:00:00.000Z")).toBe(
        "2026-06-02T20-00-00-000Z.md",
      );
      const path = writeInjectLog(projectDir, sid, baseEntry());
      expect(path?.endsWith("2026-06-02T20-00-00-000Z.md")).toBe(true);
    });

    it.runIf(isPosix)("creates user-only files and dirs", () => {
      const path = writeInjectLog(projectDir, sid, baseEntry()) as string;
      expect(statSync(path).mode & 0o077).toBe(0);
      expect(statSync(injectLogDir(projectDir, sid)).mode & 0o077).toBe(0);
    });

    it.runIf(isPosix)(
      "returns null without throwing when the location is unwritable",
      () => {
        const sessionRoot = join(
          projectDir,
          ".agents",
          "state",
          "sessions",
          sid,
        );
        mkdirSync(sessionRoot, { recursive: true });
        chmodSync(sessionRoot, 0o400);
        try {
          expect(writeInjectLog(projectDir, sid, baseEntry())).toBeNull();
        } finally {
          chmodSync(sessionRoot, 0o700);
        }
      },
    );
  });

  describe("session summary never includes inject logs (D57)", () => {
    it("excludes inject-log content from the summary", async () => {
      activateWorkflowSession({ projectDir, sid, workflow: "ultrawork" });
      emitEvent(projectDir, sid, {
        kind: "session.ended",
        payload: { status: "completed" },
      });

      const marker = "INJECT-LOG-ONLY-MARKER-12345";
      writeInjectLog(
        projectDir,
        sid,
        baseEntry({ rendered: `snapshot ${marker}` }),
      );

      const result = await exportSessionSummary({ projectDir, sid });
      expect(result.written).toBe(true);
      const summary = readFileSync(result.path, "utf-8");
      expect(summary).not.toContain(marker);

      // Sanity: the inject log itself does contain the marker.
      const logs = readdirSync(injectLogDir(projectDir, sid));
      expect(logs.length).toBeGreaterThan(0);
      const logContent = readFileSync(
        join(injectLogDir(projectDir, sid), logs[0] as string),
        "utf-8",
      );
      expect(logContent).toContain(marker);
      // Summary lives in the coordination store, outside the inject-log tree.
      expect(existsSync(result.path)).toBe(true);
      expect(result.path).toContain(join(".agents", "state", "memories"));
      expect(result.path.startsWith(injectLogDir(projectDir, sid))).toBe(false);
    });
  });
});
