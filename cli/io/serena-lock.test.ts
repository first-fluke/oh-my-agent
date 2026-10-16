import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSerenaLockActive } from "./serena-lock.js";

let directory: string;
let lock: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "oma-serena-lock-"));
  lock = join(directory, "serena-daemons.lock");
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

describe("isSerenaLockActive", () => {
  it("returns false for an absent lock", () => {
    expect(isSerenaLockActive(lock)).toBe(false);
  });

  it.each(["", " \n"])(
    "removes a stale empty lock containing %j",
    (content) => {
      writeFileSync(lock, content);
      utimesSync(lock, new Date(0), new Date(0));

      expect(isSerenaLockActive(lock)).toBe(false);
      expect(existsSync(lock)).toBe(false);
    },
  );

  it("preserves a fresh empty lock while its PID is being written", () => {
    writeFileSync(lock, "");

    expect(isSerenaLockActive(lock)).toBe(true);
    expect(readFileSync(lock, "utf8")).toBe("");
  });

  it("preserves a stale lock with a live owner", () => {
    writeFileSync(lock, String(process.pid));
    utimesSync(lock, new Date(0), new Date(0));

    expect(isSerenaLockActive(lock)).toBe(true);
    expect(readFileSync(lock, "utf8")).toBe(String(process.pid));
  });

  it("keeps an owner held when process inspection is denied", () => {
    writeFileSync(lock, "12345");
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("denied"), { code: "EPERM" });
    });

    expect(isSerenaLockActive(lock)).toBe(true);
    expect(readFileSync(lock, "utf8")).toBe("12345");
  });

  it("reports a dead owner without deleting its lock during inspection", () => {
    writeFileSync(lock, "12345");
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("gone"), { code: "ESRCH" });
    });

    expect(isSerenaLockActive(lock)).toBe(false);
    expect(readFileSync(lock, "utf8")).toBe("12345");
  });

  it("still reports invalid nonempty lock contents", () => {
    writeFileSync(lock, "broken");
    utimesSync(lock, new Date(0), new Date(0));

    expect(() => isSerenaLockActive(lock)).toThrow("Invalid process ID");
    expect(readFileSync(lock, "utf8")).toBe("broken");
  });

  it("preserves a lock that receives its PID during the stale check", () => {
    writeFileSync(lock, "");
    utimesSync(lock, new Date(0), new Date(0));
    const now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => {
      writeFileSync(lock, String(process.pid));
      return now;
    });

    expect(isSerenaLockActive(lock)).toBe(true);
    expect(readFileSync(lock, "utf8")).toBe(String(process.pid));
  });

  it("does not follow or delete a symlink lock", () => {
    const target = join(directory, "target");
    writeFileSync(target, "");
    symlinkSync(target, lock);

    expect(() => isSerenaLockActive(lock)).toThrow("Invalid Serena lock file");
    expect(lstatSync(lock).isSymbolicLink()).toBe(true);
    expect(existsSync(target)).toBe(true);
  });
});
