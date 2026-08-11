/**
 * Rename-failure tests for the safe-write helpers (EXDEV fallback, torn-write
 * protection).
 *
 * Kept in a separate file because vi.mock("node:fs") is hoisted to the top of
 * the module and replaces all fs calls — which would break the other tests in
 * safe-write.test.ts that rely on real filesystem I/O.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoist: replace node:fs with real implementations so we can control renameSync
vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  return { ...real };
});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-write-exdev-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("safeWriteJson EXDEV fallback", () => {
  it("T4: uses copyFileSync+unlinkSync when renameSync throws EXDEV", async () => {
    // Import after vi.mock is hoisted so the module under test gets the mocked fs
    const { safeWriteJson } = await import("./safe-write.js");

    const target = path.join(tmpDir, "exdev.json");
    const value = { exdev: true };

    const exdevError = Object.assign(new Error("EXDEV"), {
      code: "EXDEV",
    }) as NodeJS.ErrnoException;

    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw exdevError;
    });
    const copySpy = vi.spyOn(fs, "copyFileSync");
    const unlinkSpy = vi.spyOn(fs, "unlinkSync");

    safeWriteJson(target, value);

    // renameSync was attempted exactly once
    expect(renameSpy).toHaveBeenCalledOnce();

    // copyFileSync fallback: called with (tmp, target)
    const fallbackCopy = copySpy.mock.calls.find(([, dest]) => dest === target);
    expect(fallbackCopy).toBeDefined();

    // unlinkSync: called to remove the tmp file
    expect(unlinkSpy).toHaveBeenCalled();

    // Target ends up with the correct content
    expect(fs.existsSync(target)).toBe(true);
    const written = JSON.parse(fs.readFileSync(target, "utf-8"));
    expect(written).toEqual(value);
  });
});

describe("atomicWriteFileSync", () => {
  it("falls back to copyFileSync+unlinkSync when renameSync throws EXDEV", async () => {
    const { atomicWriteFileSync } = await import("./safe-write.js");

    const target = path.join(tmpDir, "exdev.md");
    const exdevError = Object.assign(new Error("EXDEV"), {
      code: "EXDEV",
    }) as NodeJS.ErrnoException;

    vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw exdevError;
    });

    atomicWriteFileSync(target, "across devices");

    expect(fs.readFileSync(target, "utf-8")).toBe("across devices");
    expect(fs.readdirSync(tmpDir)).toEqual(["exdev.md"]);
  });

  it("a failed swap leaves the previous content intact, never a partial file", async () => {
    const { atomicWriteFileSync } = await import("./safe-write.js");

    const target = path.join(tmpDir, "atomic.md");
    atomicWriteFileSync(target, "original");

    vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw new Error("simulated swap failure");
    });

    expect(() => atomicWriteFileSync(target, "replacement")).toThrow(
      /simulated swap failure/,
    );

    // Old content survives whole, and the temp file is cleaned up.
    expect(fs.readFileSync(target, "utf-8")).toBe("original");
    expect(fs.readdirSync(tmpDir)).toEqual(["atomic.md"]);
  });
});
