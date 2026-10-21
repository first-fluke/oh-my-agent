import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.ts";
import { emitEvent, readEvents } from "./events.js";

describe.each(["gate.passed", "gate.failed"])(
  "%s event fingerprints",
  (kind) => {
    let projectDir: string;
    const sid = "oma-gate-contract";

    beforeEach(() => {
      projectDir = mkdtempSync(join(tmpdir(), "oma-gate-contract-"));
    });

    afterEach(() => {
      rmSync(projectDir, { recursive: true, force: true });
    });

    it.each([
      { head: "commit-1", dirty: false, treeHash: "tree-1" },
      { head: "commit-1", dirty: true, treeHash: "tree-2" },
      { head: null, dirty: false, treeHash: null },
    ])("persists a complete fingerprint: %j", (fingerprint) => {
      const payload = { gate: "TEST_GATE", ...fingerprint };
      const event = emitEvent(projectDir, sid, { kind, payload });

      expect(validateEventEnvelope(event)).toEqual([]);
      expect(readEvents(projectDir, sid)).toEqual([event]);
      expect(event.payload).toEqual(payload);
    });

    it.each([
      { head: "commit-1" },
      { dirty: false },
      { treeHash: "tree-1" },
      { head: "commit-1", dirty: false },
      { head: "commit-1", treeHash: "tree-1" },
      { dirty: false, treeHash: "tree-1" },
      { head: undefined, dirty: false, treeHash: "tree-1" },
      { head: "commit-1", dirty: undefined, treeHash: "tree-1" },
      { head: "commit-1", dirty: false, treeHash: undefined },
      { head: 123, dirty: false, treeHash: "tree-1" },
      { head: "commit-1", dirty: "false", treeHash: "tree-1" },
      { head: "commit-1", dirty: null, treeHash: "tree-1" },
      { head: "commit-1", dirty: false, treeHash: {} },
    ])(
      "rejects an invalid fingerprint before persisting: %j",
      (fingerprint) => {
        expect(() =>
          emitEvent(projectDir, sid, {
            kind,
            payload: { gate: "TEST_GATE", ...fingerprint },
          }),
        ).toThrow(`Invalid ${kind} event payload: payload.`);

        expect(readEvents(projectDir, sid)).toEqual([]);
      },
    );

    it("keeps historical gate events without fingerprints readable and valid", () => {
      const event = emitEvent(projectDir, sid, {
        kind,
        payload: { gate: "TEST_GATE" },
      });

      expect(validateEventEnvelope(event)).toEqual([]);
      expect(readEvents(projectDir, sid)).toEqual([event]);
    });
  },
);
