import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExecutionStoppedError,
  SessionExecution,
} from "./session-execution.js";

describe("persistent session execution budget", () => {
  let root: string;
  const active: SessionExecution[] = [];
  const create = (options = {}, env: NodeJS.ProcessEnv = {}) => {
    const execution = new SessionExecution("s1", root, options, env);
    active.push(execution);
    return execution;
  };
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-execution-"));
    fs.mkdirSync(path.join(root, ".agents"));
    fs.writeFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "language: en\nmodel_preset: auto\n",
    );
  });
  afterEach(() => {
    for (const execution of active.splice(0)) execution.dispose();
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([0, -1, "", "NaN", Infinity])(
    "rejects invalid duration %s",
    (timeoutSeconds) => {
      expect(() => create({ timeoutSeconds })).toThrow("positive finite");
    },
  );
  it("rejects contradictory options and invalid timestamps", () => {
    expect(() =>
      create({ timeoutSeconds: 5, deadline: "2099-01-01T00:00:00Z" }),
    ).toThrow("not both");
    expect(() => create({ deadline: "2099-01-01" })).toThrow("ISO timestamp");
    fs.appendFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "session:\n  execution: {}\n",
    );
    expect(() => create()).toThrow("requires");
  });
  it("uses the first persisted start for duration across retry and inheritance", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const first = create({ timeoutSeconds: 20 });
    clock.mockReturnValue(now + 10_000);
    const retry = create({ timeoutSeconds: 20 });
    const extended = create({ timeoutSeconds: 200 });
    expect(retry.deadline).toBe(now + 20_000);
    expect(extended.deadline).toBe(first.deadline);
    const child = new SessionExecution(
      "child",
      root,
      { timeoutSeconds: 300 },
      first.childEnv({}),
    );
    active.push(child);
    expect(child.deadline).toBe(first.deadline);
    expect(child.childEnv({}).OMA_EXECUTION_DEADLINE).toBe(
      new Date(now + 20_000).toISOString(),
    );
  });
  it("keeps the earliest concurrent constraint and blocks expired admission", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    create({ timeoutSeconds: 30 });
    const shorter = create({ timeoutSeconds: 2 });
    expect(shorter.deadline).toBe(now + 2000);
    clock.mockReturnValue(now + 2001);
    expect(() => create({ timeoutSeconds: 500 })).toThrow(
      ExecutionStoppedError,
    );
    expect(() => create()).toThrow("timed_out");
  });
  it("persists cancellation and blocks a retry even without a configured deadline", async () => {
    const first = create();
    const sibling = create();
    const stopped = new Promise<ExecutionStoppedError>((resolve) =>
      sibling.onStop(resolve),
    );
    first.stop("cancelled", 143);
    expect((await stopped).exitCode).toBe(143);
    expect(() => create({ timeoutSeconds: 5 })).toThrow("cancelled");
    expect(() => first.childEnv({})).toThrow("cancelled");
  });
  it("interrupts setup waiting at the absolute deadline", async () => {
    const execution = create({ timeoutSeconds: 0.025 });
    await expect(execution.wait(new Promise(() => {}))).rejects.toMatchObject({
      reason: "timed_out",
      exitCode: 124,
    });
    expect(fs.readFileSync(execution.stateFile, "utf8")).toContain(
      '"reason":"timed_out"',
    );
  });

  it("clamps distant deadlines and retains the earliest timer when another dispatch tightens it", () => {
    const timer = vi.spyOn(globalThis, "setTimeout");
    const first = create({ deadline: "2099-01-01T00:00:00Z" });
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 2_147_483_647);
    const shorter = create({ timeoutSeconds: 60 });
    expect(first.deadline).toBe(shorter.deadline);
    expect(
      timer.mock.calls.every((call) => Number(call[1]) <= 2_147_483_647),
    ).toBe(true);
  });

  it("rejects unrelated inherited files and foreign ledger identities before writing local state", () => {
    const unrelated = path.join(root, "notes.jsonl");
    fs.writeFileSync(unrelated, "user notes\n");
    expect(() =>
      create(
        {},
        { OMA_EXECUTION_STATE: unrelated, OMA_EXECUTION_ID: "foreign" },
      ),
    ).toThrow("ledger");
    expect(fs.readFileSync(unrelated, "utf8")).toBe("user notes\n");
    expect(
      fs.existsSync(path.join(root, ".agents/state/executions/s1.jsonl")),
    ).toBe(false);
    const parent = new SessionExecution(
      "parent",
      root,
      { timeoutSeconds: 30 },
      {},
    );
    active.push(parent);
    expect(() =>
      create({}, { ...parent.childEnv({}), OMA_EXECUTION_ID: "wrong" }),
    ).toThrow("foreign execution identity");
    expect(() => create({}, { OMA_EXECUTION_STATE: parent.stateFile })).toThrow(
      "requires OMA_EXECUTION_ID",
    );
    expect(
      fs.existsSync(path.join(root, ".agents/state/executions/s1.jsonl")),
    ).toBe(false);
  });

  it("keeps configured limits when CLI settings request more time", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    fs.appendFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "session:\n  execution:\n    timeout_seconds: 60\n",
    );
    const execution = create({ timeoutSeconds: 300 });
    expect(execution.deadline).toBe(now + 60_000);
    const shorter = create({ timeoutSeconds: 5 });
    expect(shorter.deadline).toBe(now + 5_000);
  });

  it("keeps the same inherited ledger through a workspace path alias", () => {
    const first = create({ timeoutSeconds: 30 });
    const alias = path.join(root, "workspace-alias");
    fs.symlinkSync(
      root,
      alias,
      process.platform === "win32" ? "junction" : "dir",
    );
    const child = new SessionExecution("s1", alias, {}, first.childEnv({}));
    active.push(child);
    expect(child.stateFile).toBe(first.stateFile);
    expect(child.deadline).toBe(first.deadline);
  });
});
