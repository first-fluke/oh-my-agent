import { type ChildProcess, spawn } from "node:child_process";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emitEvent,
  readEvents,
  readIndex,
  setActiveSession,
} from "./events.js";

vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
}));

describe("session end lock order", () => {
  let root: string;
  let contender: ChildProcess | undefined;
  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), "oma-session-lock-order-"));
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    if (
      contender &&
      contender.exitCode === null &&
      contender.signalCode === null
    ) {
      await new Promise<void>((done) => {
        contender?.once("exit", () => done());
        contender?.kill("SIGKILL");
      });
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("releases the session before waiting for an index-to-session writer", async () => {
    const sid = "ending";
    emitEvent(root, sid, { kind: "session.created" });
    setActiveSession(root, "main", sid);
    const lockModule = resolve(
      import.meta.dirname,
      "../../.agents/hooks/core/state-index-lock.ts",
    );
    const indexHeld = join(root, "index-held");
    const sessionHeld = join(root, "session-held");
    const sessionAcquired = join(root, "session-acquired");
    contender = spawn(
      "bun",
      [
        "-e",
        `
      import { withStateIndexLock, withSessionWriteLock } from ${JSON.stringify(lockModule)};
      import { existsSync, writeFileSync } from "node:fs";
      withStateIndexLock(${JSON.stringify(root)}, () => {
        writeFileSync(${JSON.stringify(indexHeld)}, "");
        const deadline = Date.now() + 10000;
        while (!existsSync(${JSON.stringify(sessionHeld)})) {
          if (Date.now() > deadline) throw new Error("session writer did not start");
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
        }
        withSessionWriteLock(${JSON.stringify(root)}, ${JSON.stringify(sid)}, () => {
          writeFileSync(${JSON.stringify(sessionAcquired)}, "");
        });
      });
    `,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    contender.stderr?.on("data", (data) => {
      stderr += data;
    });
    const finished = new Promise<void>((accept, reject) => {
      contender?.once("error", reject);
      contender?.once("exit", (code) =>
        code === 0 ? accept() : reject(new Error(stderr)),
      );
    });
    void finished.catch(() => {});
    await expect
      .poll(() => fs.existsSync(indexHeld), { timeout: 10000 })
      .toBe(true);
    const rename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(to).replaceAll("\\", "/").endsWith("/meta.json"))
        fs.writeFileSync(sessionHeld, "");
      rename(from, to);
    });

    expect(() =>
      emitEvent(root, sid, {
        kind: "session.ended",
        payload: { status: "completed" },
      }),
    ).not.toThrow();
    await finished;
    expect(fs.existsSync(sessionAcquired)).toBe(true);
    expect(readIndex(root).active).toEqual({});
    expect(
      readEvents(root, sid).filter((event) => event.kind === "session.ended"),
    ).toHaveLength(1);
  });
});
