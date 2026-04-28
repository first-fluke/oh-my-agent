import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLink, resetLinkWarnings } from "./fs-link.js";

vi.mock("node:fs", () => ({
  symlinkSync: vi.fn(),
  linkSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

const symlinkSync = fs.symlinkSync as unknown as ReturnType<typeof vi.fn>;
const linkSync = fs.linkSync as unknown as ReturnType<typeof vi.fn>;
const copyFileSync = fs.copyFileSync as unknown as ReturnType<typeof vi.fn>;

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
});
