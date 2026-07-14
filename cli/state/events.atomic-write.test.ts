import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openFlags: Array<{ path: string; flag: unknown }> = [];

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    openSync: (path: string, flags: unknown, ...rest: unknown[]) => {
      openFlags.push({ path: String(path), flag: flags });
      // biome-ignore lint/suspicious/noExplicitAny: test shim delegates verbatim
      return (actual.openSync as any)(path, flags, ...rest);
    },
  };
});

import { atomicWriteJson } from "./events.js";

describe("atomicWriteJson temp-file fsync handle", () => {
  let dir: string;

  beforeEach(() => {
    openFlags.length = 0;
    dir = mkdtempSync(join(tmpdir(), "oma-atomic-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("opens the temp file with a writable handle before fsync (issue #613)", () => {
    atomicWriteJson(join(dir, "meta.json"), { sid: "oma-win" });

    const tmpOpen = openFlags.find((call) => call.path.endsWith(".tmp"));
    expect(tmpOpen).toBeDefined();
    // A read-only ("r") handle makes fsyncSync fail with EPERM on Windows.
    expect(tmpOpen?.flag).toBe("r+");
  });
});
