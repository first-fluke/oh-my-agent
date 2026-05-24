import assert from "node:assert/strict";
import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyWin32LongPathPrefix,
  createLink,
  resetLinkWarnings,
} from "./fs-link.js";

vi.mock("node:fs", () => ({
  symlinkSync: vi.fn(),
  linkSync: vi.fn(),
  copyFileSync: vi.fn(),
  realpathSync: vi.fn(),
}));

const symlinkSync = fs.symlinkSync as unknown as ReturnType<typeof vi.fn>;
const linkSync = fs.linkSync as unknown as ReturnType<typeof vi.fn>;
const copyFileSync = fs.copyFileSync as unknown as ReturnType<typeof vi.fn>;
const realpathSync = fs.realpathSync as unknown as ReturnType<typeof vi.fn>;

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

function makeError(code: string): NodeJS.ErrnoException {
  const err = new Error(code) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

describe("applyWin32LongPathPrefix", () => {
  const originalPlatform = process.platform;

  function setPlatformLocal(platform: NodeJS.Platform) {
    Object.defineProperty(process, "platform", {
      value: platform,
      configurable: true,
    });
  }

  afterEach(() => {
    setPlatformLocal(originalPlatform);
  });

  it("is no-op on non-windows even for long paths", () => {
    setPlatformLocal("linux");
    const longPath = `/${"a".repeat(300)}`;
    expect(applyWin32LongPathPrefix(longPath)).toBe(longPath);
  });

  it("applies prefix on win32 when path exceeds MAX_PATH (260)", () => {
    setPlatformLocal("win32");
    const longPath = `C:\\${"a".repeat(300)}`;
    const result = applyWin32LongPathPrefix(longPath);
    expect(result).toBe(`\\\\?\\${longPath}`);
  });

  it("skips prefix when path is short enough on win32", () => {
    setPlatformLocal("win32");
    const shortPath = `C:\\${"a".repeat(100)}`;
    expect(applyWin32LongPathPrefix(shortPath)).toBe(shortPath);
  });

  it("is idempotent when path already has the prefix on win32", () => {
    setPlatformLocal("win32");
    const prefixedPath = `\\\\?\\C:\\${"a".repeat(300)}`;
    expect(applyWin32LongPathPrefix(prefixedPath)).toBe(prefixedPath);
  });
});

describe("createLink", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetLinkWarnings();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    setPlatform(originalPlatform);
  });

  describe("on POSIX", () => {
    beforeEach(() => setPlatform("linux"));

    it("returns 'symlink' and never falls back", () => {
      const result = createLink("../target", "/proj/.cursor/mcp.json", "file");

      expect(result).toBe("symlink");
      expect(symlinkSync).toHaveBeenCalledWith(
        "../target",
        "/proj/.cursor/mcp.json",
        "file",
      );
      expect(linkSync).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("propagates errors instead of falling back", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("EPERM");
      });

      expect(() => createLink("x", "/y", "dir")).toThrow("EPERM");
      expect(linkSync).not.toHaveBeenCalled();
    });
  });

  describe("on Windows", () => {
    beforeEach(() => setPlatform("win32"));

    it("returns 'symlink' when native symlink succeeds (no warning)", () => {
      const result = createLink("..\\target", "C:\\proj\\link", "dir");

      expect(result).toBe("symlink");
      expect(symlinkSync).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("falls back to junction with warning on EPERM (dir)", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("EPERM");
      });

      const result = createLink("..\\target", "C:\\proj\\sub\\link", "dir");

      expect(result).toBe("junction");
      expect(symlinkSync).toHaveBeenCalledTimes(2);
      const second = symlinkSync.mock.calls[1];
      assert(second, "expected a second symlinkSync call");
      expect(second[1]).toBe("C:\\proj\\sub\\link");
      expect(second[2]).toBe("junction");
      expect(second[0]).not.toBe("..\\target"); // resolved to absolute
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/junction/i);
    });

    it("falls back to hardlink with warning on EPERM (file)", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("EPERM");
      });

      const result = createLink(
        "..\\target.json",
        "C:\\proj\\sub\\link.json",
        "file",
      );

      expect(result).toBe("hardlink");
      expect(linkSync).toHaveBeenCalledTimes(1);
      expect(copyFileSync).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/hardlink/i);
    });

    it("falls back to copy with warning when hardlink also fails", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("EPERM");
      });
      linkSync.mockImplementationOnce(() => {
        throw makeError("EXDEV");
      });

      const result = createLink(
        "D:\\target.json",
        "C:\\proj\\link.json",
        "file",
      );

      expect(result).toBe("copy");
      expect(copyFileSync).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/copy/i);
    });

    it("re-throws non-permission errors without falling back", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("ENOENT");
      });

      expect(() => createLink("x", "C:\\y", "file")).toThrow("ENOENT");
      expect(linkSync).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("treats EACCES the same as EPERM", () => {
      symlinkSync.mockImplementationOnce(() => {
        throw makeError("EACCES");
      });

      const result = createLink("..\\t", "C:\\proj\\link", "dir");

      expect(result).toBe("junction");
      expect(symlinkSync).toHaveBeenCalledTimes(2);
    });

    it("warns only once per mechanism per process", () => {
      // Throw EPERM only for the initial symlink attempt; let junction succeed.
      symlinkSync.mockImplementation(
        (_t: string, _p: string, type?: string) => {
          if (type === "junction") return;
          throw makeError("EPERM");
        },
      );

      createLink("..\\a", "C:\\proj\\a", "dir");
      createLink("..\\b", "C:\\proj\\b", "dir");
      createLink("..\\c", "C:\\proj\\c", "dir");

      expect(warnSpy).toHaveBeenCalledOnce();
    });
  });

  describe("ssotBase validation", () => {
    beforeEach(() => {
      vi.resetAllMocks();
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      setPlatform("linux");
    });

    it("allows target whose realpath is inside ssotBase", () => {
      realpathSync.mockImplementation((p: string) => {
        if (p === "/proj/.agents/skills/foo") return "/proj/.agents/skills/foo";
        if (p === "/proj/.agents/skills") return "/proj/.agents/skills";
        return p;
      });

      expect(() =>
        createLink(
          "/proj/.agents/skills/foo",
          "/proj/.claude/skills/foo",
          "dir",
          "/proj/.agents/skills",
        ),
      ).not.toThrow();
      expect(symlinkSync).toHaveBeenCalledOnce();
    });

    it("throws when target realpath escapes ssotBase", () => {
      realpathSync.mockImplementation((p: string) => {
        if (p === "/tmp/evil") return "/tmp/evil";
        if (p === "/proj/.agents/skills") return "/proj/.agents/skills";
        return p;
      });

      expect(() =>
        createLink(
          "/tmp/evil",
          "/proj/.claude/skills/foo",
          "dir",
          "/proj/.agents/skills",
        ),
      ).toThrow(
        "createLink: target /tmp/evil escapes SSOT base /proj/.agents/skills",
      );
      expect(symlinkSync).not.toHaveBeenCalled();
    });

    it("allows target whose realpath equals ssotBase exactly (boundary case)", () => {
      realpathSync.mockImplementation((p: string) => {
        if (p === "/proj/.agents/skills") return "/proj/.agents/skills";
        return p;
      });

      expect(() =>
        createLink(
          "/proj/.agents/skills",
          "/proj/.claude/skills/root",
          "dir",
          "/proj/.agents/skills",
        ),
      ).not.toThrow();
      expect(symlinkSync).toHaveBeenCalledOnce();
    });

    it("skips validation and succeeds when ssotBase is omitted", () => {
      // realpathSync should not be called when ssotBase is undefined
      expect(() =>
        createLink("../target", "/proj/.claude/skills/foo", "dir"),
      ).not.toThrow();
      expect(realpathSync).not.toHaveBeenCalled();
      expect(symlinkSync).toHaveBeenCalledOnce();
    });
  });
});
