import { type ChildProcess, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import { readIndex, updateIndex } from "./events.js";

const cliModule = resolve(import.meta.dirname, "events.ts");
const hookModule = resolve(
  import.meta.dirname,
  "../../.agents/hooks/core/state-marker.ts",
);

describe("state index concurrent writers", () => {
  let root: string;
  const children: ChildProcess[] = [];
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-index-race-"));
  });
  afterEach(async () => {
    await Promise.all(
      children.splice(0).map(
        (child) =>
          new Promise<void>((done) => {
            if (child.exitCode !== null || child.signalCode !== null)
              return done();
            child.once("exit", () => done());
            child.kill("SIGKILL");
          }),
      ),
    );
    rmSync(root, { recursive: true, force: true });
  });

  function launch(module: string, key: string, hold = false) {
    const child = spawn(
      "bun",
      [
        "-e",
        `
      import { updateIndex } from ${JSON.stringify(module)};
      import { existsSync, writeFileSync } from "node:fs";
      const root = ${JSON.stringify(root)};
      writeFileSync(root + "/${key}.started", "");
      updateIndex(root, index => {
        writeFileSync(root + "/${key}.entered", "");
        if (${hold}) {
          const deadline = Date.now() + 10000;
          while (!existsSync(root + "/release")) {
            if (Date.now() > deadline) throw new Error("barrier timeout");
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
          }
        }
        index.active[${JSON.stringify(key)}] = "sid-${key}";
      });
    `,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    const done = new Promise<void>((accept, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) =>
        code === 0
          ? accept()
          : reject(new Error(`${code ?? signal}: ${stderr}`)),
      );
    });
    // Failure is asserted by the caller, including intentionally killed writers.
    void done.catch(() => {});
    return { child, done };
  }

  async function waitFor(name: string, timeout = 10000) {
    await expect
      .poll(() => existsSync(join(root, name)), { timeout })
      .toBe(true);
  }

  for (const [name, firstModule, secondModule] of [
    ["CLI / CLI", cliModule, cliModule],
    ["CLI / hook", cliModule, hookModule],
    ["hook / CLI", hookModule, cliModule],
    ["hook / hook", hookModule, hookModule],
  ] as const) {
    it(`preserves both updates across ${name}`, async () => {
      const first = launch(firstModule, "first", true);
      await waitFor("first.entered");
      const second = launch(secondModule, "second");
      await waitFor("second.started");
      // The contender must not enter the mutation while the first owns it.
      await new Promise((accept) => setTimeout(accept, 150));
      const enteredBeforeRelease = existsSync(join(root, "second.entered"));
      writeFileSync(join(root, "release"), "");
      await Promise.all([first.done, second.done]);
      expect(enteredBeforeRelease).toBe(false);
      expect(readIndex(root).active).toEqual({
        first: "sid-first",
        second: "sid-second",
      });
    });
  }

  it("releases the lock when a mutation throws", () => {
    expect(() =>
      updateIndex(root, () => {
        throw new Error("mutation failed");
      }),
    ).toThrow("mutation failed");
    updateIndex(root, (index) => {
      index.active.main = "recovered";
    });
    expect(readIndex(root).active.main).toBe("recovered");
  });

  it("recovers the lock after the writer process dies", async () => {
    const first = launch(cliModule, "first", true);
    await waitFor("first.entered");
    first.child.kill("SIGKILL");
    await expect(first.done).rejects.toThrow();
    const next = launch(hookModule, "second");
    await next.done;
    expect(readIndex(root).active).toEqual({ second: "sid-second" });
  });

  it("times out without stealing a live lock and removes its candidate", () => {
    withStateIndexLock(root, () => {
      expect(() =>
        withStateIndexLock(
          root,
          () => {
            throw new Error("must not enter");
          },
          20,
        ),
      ).toThrow("Timed out waiting for state index lock");
      expect(readdirSync(join(root, ".agents/state/locks"))).toEqual([
        "session-index",
      ]);
    });
    expect(readdirSync(join(root, ".agents/state/locks"))).toEqual([]);
  });

  it("recovers an empty directory left by interrupted lock release", () => {
    mkdirSync(join(root, ".agents/state/locks/session-index"), {
      recursive: true,
    });
    updateIndex(root, (index) => {
      index.active.main = "recovered";
    });
    expect(readIndex(root).active.main).toBe("recovered");
  });
});
