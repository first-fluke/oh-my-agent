import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireHarnessEvolutionLock,
  readHarnessEvolutionState,
  writeHarnessEvolutionConfig,
} from "../../state/harness-evolution.js";

const feedbackMock = vi.hoisted(() => vi.fn());
const scanMock = vi.hoisted(() => vi.fn());

vi.mock("./feedback.js", () => ({ runHarnessFeedback: feedbackMock }));
vi.mock("./incident-scan.js", () => ({ scanHarnessIncidents: scanMock }));

import { runHarnessEvolutionTick } from "./evolution.js";

let root: string;

function writePromotion(incidentId: string, skill = "oma-test"): void {
  const dir = join(root, ".agents", "results", "incidents", incidentId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "promotion.json"),
    JSON.stringify({ incidentId, skill }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-evolution-"));
  writeHarnessEvolutionConfig(root, {
    schemaVersion: 1,
    enabled: true,
    cron: "0 3 * * *",
    mode: "apply",
    maxDispatches: 3,
    updatedAt: new Date().toISOString(),
  });
  scanMock.mockReturnValue({ candidates: [] });
  feedbackMock.mockResolvedValue({
    ts: new Date().toISOString(),
    captured: [],
    uncapturable: [],
    promoted: [],
    skipped: [],
    skills: [{ skill: "oma-test", incidents: [], status: "optimized" }],
    reportPath: ".agents/results/feedback/test.json",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("scheduled harness evolution", () => {
  it("allows one SQLite tick lock and releases it for the next tick", () => {
    const first = acquireHarnessEvolutionLock(root);
    expect(first).toBeDefined();
    expect(acquireHarnessEvolutionLock(root)).toBeUndefined();
    first?.release();
    const next = acquireHarnessEvolutionLock(root);
    expect(next).toBeDefined();
    next?.release();
  });

  it("records a completed optimization by the current incident set and does not re-dispatch it", async () => {
    writePromotion("inc-1");
    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "completed",
    });
    expect(feedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ retrySkills: ["oma-test"] }),
    );
    expect(readHarnessEvolutionState(root).retries).toContainEqual(
      expect.objectContaining({
        kind: "optimize",
        completedAt: expect.any(String),
      }),
    );

    await runHarnessEvolutionTick(root);
    expect(feedbackMock).toHaveBeenCalledTimes(1);
  });

  it("reopens a skill only when its promoted incident set changes", async () => {
    writePromotion("inc-1");
    await runHarnessEvolutionTick(root);
    writePromotion("inc-2");
    await runHarnessEvolutionTick(root);
    expect(feedbackMock).toHaveBeenCalledTimes(2);
    expect(feedbackMock.mock.calls[1]?.[0]).toMatchObject({
      retrySkills: ["oma-test"],
    });
  });

  it("persists model failures for backoff rather than marking them complete", async () => {
    writePromotion("inc-1");
    feedbackMock.mockResolvedValueOnce({
      ts: new Date().toISOString(),
      captured: [],
      uncapturable: [],
      promoted: [],
      skipped: [],
      skills: [
        {
          skill: "oma-test",
          incidents: [],
          status: "failed",
          error: "model timeout",
        },
      ],
    });
    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "partial",
    });
    expect(readHarnessEvolutionState(root).retries).toContainEqual(
      expect.objectContaining({
        kind: "optimize",
        attemptCount: 1,
        lastError: "model timeout",
      }),
    );
  });

  it("retries a capture dispatch failure but completes a structurally uncapturable run", async () => {
    scanMock.mockReturnValue({
      candidates: [{ runId: "run-retry" }, { runId: "run-terminal" }],
    });
    feedbackMock.mockResolvedValueOnce({
      ts: new Date().toISOString(),
      captured: [],
      promoted: [],
      skipped: [],
      skills: [],
      uncapturable: [
        { runId: "run-retry", reason: "Evolution dispatch budget exhausted" },
        { runId: "run-terminal", reason: "no output preserved" },
      ],
    });
    await runHarnessEvolutionTick(root);
    const retries = readHarnessEvolutionState(root).retries;
    expect(
      retries.find((retry) => retry.key === "capture:run-retry"),
    ).toMatchObject({
      attemptCount: 1,
      lastError: "Evolution dispatch budget exhausted",
    });
    expect(
      retries.find((retry) => retry.key === "capture:run-retry")?.completedAt,
    ).toBeUndefined();
    expect(retries).toContainEqual(
      expect.objectContaining({
        key: "capture:run-terminal",
        completedAt: expect.any(String),
      }),
    );
  });

  it("leaves incident filtering open while it captures a new due run", async () => {
    scanMock.mockReturnValue({ candidates: [{ runId: "run-new" }] });
    feedbackMock.mockResolvedValueOnce({
      ts: new Date().toISOString(),
      captured: [{ runId: "run-new", incidentId: "inc-new", rubric: "assert" }],
      uncapturable: [],
      promoted: [],
      skipped: [],
      skills: [],
    });
    await runHarnessEvolutionTick(root);
    expect(feedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ runIds: ["run-new"], incidentIds: undefined }),
    );
  });
});
