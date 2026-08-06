import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectHarnessSignals, fmtHarnessSignals } from "./harness-signals.js";

describe("collectHarnessSignals", () => {
  const workspaces: string[] = [];
  const makeWorkspace = () => {
    const ws = mkdtempSync(join(tmpdir(), "oma-harness-signals-"));
    workspaces.push(ws);
    return ws;
  };

  const writeEvents = (ws: string, sid: string, lines: string[]) => {
    const dir = join(ws, ".agents", "state", "sessions", sid);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "events.jsonl"), `${lines.join("\n")}\n`);
  };

  const event = (
    kind: string,
    payload: Record<string, unknown>,
    tsOffsetMs = 0,
    sid = "oma-sig1",
  ) =>
    JSON.stringify({
      eventId: "e1",
      ts: new Date(Date.now() - tsOffsetMs).toISOString(),
      sid,
      kind,
      writerPid: 1,
      payload,
    });

  afterEach(() => {
    for (const ws of workspaces.splice(0)) {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it("returns [] when no sessions dir exists", () => {
    const ws = makeWorkspace();
    expect(collectHarnessSignals(ws, 7)).toEqual([]);
  });

  it("groups repeated gate failures by gate keyword with counts", () => {
    const ws = makeWorkspace();
    writeEvents(ws, "oma-sig1", [
      event("gate.failed", {
        gate: "typecheck",
        workflow: "ultrawork",
        summary: "stop gate 'typecheck' failed for /ultrawork",
      }),
      event("gate.failed", { gate: "typecheck", workflow: "ultrawork" }),
      event("workflow.phase", { workflow: "ultrawork" }),
    ]);

    const signals = collectHarnessSignals(ws, 7);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      kind: "gate.failed",
      key: "typecheck",
      count: 2,
      workflows: ["ultrawork"],
    });
    expect(signals[0]?.suggestedTarget).toContain("lessons-learned.md");
  });

  it("maps spawn.no-workspace-artifact blockers to a dispatch-config proposal", () => {
    const ws = makeWorkspace();
    writeEvents(ws, "oma-sig2", [
      event("blocker.raised", {
        code: "spawn.no-workspace-artifact",
        summary: "agent backend exited 0 but wrote no artifact",
        vendor: "antigravity",
      }),
    ]);

    const signals = collectHarnessSignals(ws, 7);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.key).toBe("spawn.no-workspace-artifact");
    expect(signals[0]?.suggestedTarget).toContain("oma-config.yaml");
    expect(signals[0]?.latestSummary).toContain("no artifact");
  });

  it("excludes events older than the window and skips malformed lines", () => {
    const ws = makeWorkspace();
    writeEvents(ws, "oma-sig3", [
      event(
        "gate.failed",
        { gate: "budget", workflow: "work" },
        10 * 86_400_000,
      ),
      "not-json{{{",
      event("decision.missing", { workflow: "orchestrate" }),
    ]);

    const signals = collectHarnessSignals(ws, 7);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe("decision.missing");
    expect(signals[0]?.key).toBe("orchestrate");
  });

  it("renders proposals with an eval reminder", () => {
    const ws = makeWorkspace();
    writeEvents(ws, "oma-sig4", [
      event("gate.failed", { gate: "budget", workflow: "ultrawork" }),
    ]);
    const out = fmtHarnessSignals(collectHarnessSignals(ws, 7));
    expect(out).toContain("budget");
    expect(out).toContain("propose:");
    expect(out).toContain("oma skills eval");
  });
});
