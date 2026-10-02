import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryObservePath } from "../../state/events.js";
import {
  acknowledgeMemoryRetryLine,
  readMemoryRetryQueue,
} from "../../state/memory-retry-queue.js";
import { collectAgentMemoryCheck } from "./agent-memory.js";

vi.mock("../memory/command.js", () => ({
  controlAgentMemoryDaemon: async () => ({
    status: { provider: "agentmemory", reachable: false },
  }),
  getAgentMemoryServicePresence: () => ({ supported: false, installed: false }),
}));

describe("AgentMemory retry queue diagnostics", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-retry-doctor-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("counts pending rows and excludes successfully acknowledged observations", async () => {
    const retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    writeFileSync(
      retryPath,
      [
        JSON.stringify({
          sid: "oma-test",
          kind: "decision.made",
          eventId: "success",
          ts: "2026-05-29T00:00:00.000Z",
        }),
        "invalid-row",
        "",
      ].join("\n"),
    );
    const first = readMemoryRetryQueue(projectDir)[0];
    if (!first) throw new Error("Expected the seeded retry entry");
    acknowledgeMemoryRetryLine(projectDir, first);

    const check = await collectAgentMemoryCheck(projectDir);
    expect(check.retryQueue).toEqual({ path: retryPath, total: 1, invalid: 1 });
    expect(check.issues).toContain("1 queued AgentMemory observe retries");
    expect(check.issues).toContain("1 invalid AgentMemory retry rows");
  });
});
