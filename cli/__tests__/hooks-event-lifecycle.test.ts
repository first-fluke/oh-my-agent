import { EventEmitter } from "node:events";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../.agents/hooks/core/persistent-mode.ts";
import {
  activateWorkflowSession,
  deriveMeta,
  emitEvent,
  metaPath,
  readEvents,
  readIndex,
  setActiveSession,
} from "../../.agents/hooks/core/state-core.ts";
import type { ModeState } from "../../.agents/hooks/core/types.ts";
import { installHooks } from "../platform/skills-installer/ssot-install.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn(), spawnSync: vi.fn() };
});
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn(actual.appendFileSync) };
});
const { execFileSync, spawn } = await import("node:child_process");

/** A stop-gate child that prints `stdout` and exits with `code`. */
function gateChild(code: number, stdout = "") {
  const child = Object.assign(new EventEmitter(), {
    pid: undefined,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });
  setImmediate(() => {
    if (stdout) child.stdout.emit("data", Buffer.from(stdout));
    child.emit("exit", code, null);
    child.emit("close", code, null);
  });
  return child as unknown as ReturnType<typeof spawn>;
}

describe("persistent stop event lifecycle", () => {
  let projectDir: string;
  const vendorSid = "vendor-current";
  const omaSid = "oma-current";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-event-lifecycle-"));
    mkdirSync(join(projectDir, ".agents", "state"), { recursive: true });
    writeFileSync(
      join(projectDir, "package.json"),
      JSON.stringify({ scripts: { test: "vitest" } }),
    );
    vi.mocked(spawn).mockImplementation(() => gateChild(0));
    activateWorkflowSession({ projectDir, sid: omaSid, workflow: "ultrawork" });
    setActiveSession(projectDir, "also-current", omaSid);
    setActiveSession(projectDir, "other", "oma-other");
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  function mode(overrides: Partial<ModeState> = {}): string {
    const state: ModeState = {
      workflow: "ultrawork",
      sessionId: vendorSid,
      omaSid,
      activatedAt: new Date().toISOString(),
      reinforcementCount: 0,
      goal: { completion: { gate: "test" } },
      ...overrides,
    };
    const path = join(
      projectDir,
      ".agents",
      "state",
      `${state.workflow}-state-${vendorSid}.json`,
    );
    writeFileSync(path, JSON.stringify(state));
    return path;
  }

  const context = () => ({
    vendor: "claude" as const,
    cwd: projectDir,
    sid: vendorSid,
  });

  it("ends a successful gate stop and clears only this session's active pointers", async () => {
    mode();
    expect(await run({ kind: "stop", cwd: projectDir }, context())).toBeNull();
    expect(readEvents(projectDir, omaSid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "gate.passed",
          payload: expect.objectContaining({ gate: "test" }),
        }),
        expect.objectContaining({
          kind: "session.ended",
          payload: expect.objectContaining({
            status: "completed",
            reason: "completion_gate_passed",
          }),
        }),
      ]),
    );
    expect(readIndex(projectDir).active).toEqual({ other: "oma-other" });
    expect(
      JSON.parse(readFileSync(metaPath(projectDir, omaSid), "utf-8")),
    ).toMatchObject({
      status: "completed",
      gatesPassedBy: [expect.objectContaining({ gate: "test" })],
    });
  });

  it("records explicit workflow completion before deleting all matching mode files", async () => {
    const stateFile = mode();
    expect(
      await run(
        { kind: "stop", cwd: projectDir, responseText: "workflow done" },
        context(),
      ),
    ).toBeNull();
    expect(existsSync(stateFile)).toBe(false);
    expect(readEvents(projectDir, omaSid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "session.ended",
          payload: expect.objectContaining({
            status: "completed",
            reason: "workflow_done",
          }),
        }),
      ]),
    );
    expect(readIndex(projectDir).active).toEqual({ other: "oma-other" });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("uses the same lifecycle when workflow done arrives through standalone stdin", () => {
    mode();
    installHooks(resolve(import.meta.dirname, "../.."), projectDir);
    execFileSync(
      "bun",
      [join(projectDir, ".agents", "hooks", "core", "persistent-mode.ts")],
      {
        input: JSON.stringify({
          sessionId: vendorSid,
          prompt_response: "workflow done",
        }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
        cwd: projectDir,
        timeout: 10_000,
      },
    );
    expect(
      readEvents(projectDir, omaSid).find(
        (event) => event.kind === "session.ended",
      )?.payload,
    ).toMatchObject({ status: "completed", reason: "workflow_done" });
    expect(readIndex(projectDir).active).toEqual({ other: "oma-other" });
    expect(existsSync(join(projectDir, "cli"))).toBe(false);
    const summary = join(
      projectDir,
      ".agents",
      "state",
      "memories",
      "session-ultrawork-oma-current.md",
    );
    expect(existsSync(summary)).toBe(true);
    expect(readFileSync(summary, "utf-8")).toContain("workflow_done");
  });

  it("keeps terminal completion recoverable when the terminal append fails", async () => {
    const stateFile = mode({ goal: undefined });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.mocked(appendFileSync).mockImplementationOnce(() => {
      throw new Error("terminal append unavailable");
    });
    expect(
      await run(
        { kind: "stop", cwd: projectDir, responseText: "workflow done" },
        context(),
      ),
    ).toBeNull();
    expect(existsSync(stateFile)).toBe(true);
    expect(readIndex(projectDir).active.main).toBe(omaSid);
    expect(await run({ kind: "stop", cwd: projectDir }, context())).toBeNull();
    expect(existsSync(stateFile)).toBe(false);
    expect(
      readEvents(projectDir, omaSid).find(
        (event) => event.kind === "session.ended",
      )?.payload,
    ).toMatchObject({ status: "completed", reason: "workflow_done" });
    expect(spawn).not.toHaveBeenCalled();
    stderr.mockRestore();
  });

  it("records budget exhaustion as failed with a reason and never executes a gate", async () => {
    mode({
      activatedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      goal: { budget: { wallClockMinutes: 10 }, completion: { gate: "test" } },
    });
    expect(await run({ kind: "stop", cwd: projectDir }, context())).toBeNull();
    expect(readEvents(projectDir, omaSid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "session.ended",
          payload: expect.objectContaining({
            status: "failed",
            reason: "budget_exhausted",
          }),
        }),
      ]),
    );
    expect(readIndex(projectDir).active).toEqual({ other: "oma-other" });
    expect(spawn).not.toHaveBeenCalled();
    const summary = readFileSync(
      join(
        projectDir,
        ".agents",
        "state",
        "memories",
        "session-ultrawork-oma-current.md",
      ),
      "utf-8",
    );
    expect(summary).toContain("status: failed");
    expect(summary).toContain("budget_exhausted");
    expect(summary).toContain("## Gates");
  });

  it("keeps terminal persistence intact when optional summary export fails", async () => {
    mode();
    writeFileSync(
      join(projectDir, ".agents", "state", "memories"),
      "blocked summary directory",
    );
    expect(await run({ kind: "stop", cwd: projectDir }, context())).toBeNull();
    expect(readIndex(projectDir).active).toEqual({ other: "oma-other" });
    const events = readEvents(projectDir, omaSid);
    expect(
      events.find((event) => event.kind === "session.ended")?.payload?.status,
    ).toBe("completed");
    expect(events.some((event) => event.kind === "mirror.warning")).toBe(true);
  });

  it("keeps a retrying gate active without a session.ended event", async () => {
    mode();
    vi.mocked(spawn).mockImplementation(() => gateChild(1, "failure"));
    expect(
      (await run({ kind: "stop", cwd: projectDir }, context()))?.type,
    ).toBe("block");
    expect(readEvents(projectDir, omaSid).map((event) => event.kind)).toEqual([
      "session.created",
      "gate.failed",
    ]);
    expect(readIndex(projectDir).active.main).toBe(omaSid);
  });

  it.each([
    [
      { activatedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() },
      "stale_state",
    ],
    [{ reinforcementCount: 5 }, "reinforcement_exhausted"],
  ] as const)(
    "records a failed end when persistent state reaches its backstop: %s",
    async (overrides, reason) => {
      mode(overrides);
      expect(
        await run({ kind: "stop", cwd: projectDir }, context()),
      ).toBeNull();
      expect(
        readEvents(projectDir, omaSid).find(
          (event) => event.kind === "session.ended",
        )?.payload,
      ).toMatchObject({ status: "failed", reason });
      expect(spawn).not.toHaveBeenCalled();
    },
  );

  it("does not end a shared session while another workflow still needs a retry", async () => {
    mode();
    mode({ workflow: "work", goal: undefined });
    expect(
      (await run({ kind: "stop", cwd: projectDir }, context()))?.type,
    ).toBe("block");
    expect(
      readEvents(projectDir, omaSid).some(
        (event) => event.kind === "session.ended",
      ),
    ).toBe(false);
    expect(readIndex(projectDir).active.main).toBe(omaSid);
  });

  it("preserves a budget failure when a shared sibling completes on a later stop", async () => {
    mode({
      activatedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      goal: { budget: { wallClockMinutes: 10 } },
    });
    mode({ workflow: "work", goal: undefined });
    expect(
      (await run({ kind: "stop", cwd: projectDir }, context()))?.type,
    ).toBe("block");
    mode({ workflow: "work" });
    expect(await run({ kind: "stop", cwd: projectDir }, context())).toBeNull();
    expect(
      readEvents(projectDir, omaSid).find(
        (event) => event.kind === "session.ended",
      )?.payload,
    ).toMatchObject({ status: "failed", reason: "budget_exhausted" });
  });
});

describe("event projection lifecycle", () => {
  let projectDir: string;
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-event-meta-"));
  });
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("ignores malformed legacy terminal statuses when deriving completion", () => {
    const event = {
      eventId: "legacy",
      ts: "2026-10-02T00:00:00Z",
      sid: "oma-legacy",
      kind: "session.ended",
      writerPid: 1,
      payload: { status: "cancelled" },
    };
    expect(deriveMeta("oma-legacy", [event]).status).toBe("active");
    expect(
      deriveMeta("oma-legacy", [
        {
          ...event,
          eventId: "failed",
          ts: "2026-10-01T00:00:00Z",
          payload: { status: "failed" },
        },
        event,
      ]).status,
    ).toBe("failed");
  });

  it("refreshes the metadata cache immediately after gate events", () => {
    const sid = "oma-gate-cache";
    activateWorkflowSession({ projectDir, sid, workflow: "work" });
    emitEvent(projectDir, sid, {
      kind: "gate.passed",
      payload: { gate: "test", summary: "tests passed" },
    });
    emitEvent(projectDir, sid, {
      kind: "gate.failed",
      payload: { gate: "lint", summary: "lint failed" },
    });
    expect(
      JSON.parse(readFileSync(metaPath(projectDir, sid), "utf-8"))
        .gatesPassedBy,
    ).toEqual([expect.objectContaining({ gate: "test" })]);
  });

  it("clears only matching active markers for an emitted terminal event", () => {
    activateWorkflowSession({ projectDir, sid: "oma-ended", workflow: "work" });
    setActiveSession(projectDir, "tool", "oma-ended");
    setActiveSession(projectDir, "sibling", "oma-sibling");
    emitEvent(projectDir, "oma-ended", {
      kind: "session.ended",
      payload: { status: "completed", reason: "workflow_done" },
    });
    expect(readIndex(projectDir).active).toEqual({ sibling: "oma-sibling" });
  });

  it("rejects malformed terminal payloads before appending or clearing active markers", () => {
    const sid = "oma-invalid-terminal";
    activateWorkflowSession({ projectDir, sid, workflow: "work" });
    expect(() =>
      emitEvent(projectDir, sid, {
        kind: "session.ended",
        payload: { status: "active" },
      }),
    ).toThrow("Invalid session.ended event payload");
    expect(readEvents(projectDir, sid).map((event) => event.kind)).toEqual([
      "session.created",
    ]);
    expect(readIndex(projectDir).active.main).toBe(sid);
  });
});
