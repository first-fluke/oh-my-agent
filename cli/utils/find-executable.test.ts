import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executableSearchDirs, findExecutable } from "./find-executable.js";

describe("findExecutable", () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    for (const fn of cleanup.splice(0)) fn();
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "oma-find-exe-"));
    cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
  }

  it("splits a Windows PATH on ';' without breaking drive letters", () => {
    expect(
      executableSearchDirs({
        platform: "win32",
        env: { Path: 'C:\\a;"C:\\b c";;C:\\a' },
      }),
    ).toEqual(["C:\\a", "C:\\b c"]);
  });

  it("splits a POSIX PATH on ':' and appends extra dirs after PATH", () => {
    expect(
      executableSearchDirs({
        platform: "linux",
        env: { PATH: "/x:/y" },
        extraDirs: ["/z", "/x"],
      }),
    ).toEqual(["/x", "/y", "/z"]);
  });

  it("resolves PATHEXT launchers on Windows (agentmemory.cmd, oma.exe)", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "agentmemory.cmd"), "@echo off\n");
    writeFileSync(join(dir, "oma.exe"), "");
    const env = { PATH: `C:\\nope;${dir}`, PATHEXT: ".EXE;.CMD" };
    expect(findExecutable("agentmemory", { env, platform: "win32" })).toBe(
      join(dir, "agentmemory.cmd"),
    );
    expect(findExecutable("oma", { env, platform: "win32" })).toBe(
      join(dir, "oma.exe"),
    );
    expect(findExecutable(join(dir, "oma"), { env, platform: "win32" })).toBe(
      `${join(dir, "oma")}.exe`,
    );
  });

  it("searches extra dirs when PATH is minimal", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "oma.exe"), "");
    expect(
      findExecutable("oma", {
        env: {},
        platform: "win32",
        extraDirs: [dir],
      }),
    ).toBe(join(dir, "oma.exe"));
  });

  it.skipIf(process.platform === "win32")(
    "requires the execute bit on POSIX",
    () => {
      const dir = tempDir();
      const bin = join(dir, "agentmemory");
      writeFileSync(bin, "#!/bin/sh\n");
      chmodSync(bin, 0o644);
      const env = { PATH: dir };
      expect(findExecutable("agentmemory", { env, platform: "linux" })).toBe(
        undefined,
      );
      chmodSync(bin, 0o755);
      expect(findExecutable("agentmemory", { env, platform: "linux" })).toBe(
        bin,
      );
    },
  );
});
