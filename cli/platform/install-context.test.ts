import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetInstallContext,
  getInstallContext,
  getInstallMode,
  getInstallRoot,
  isProjectModeInHome,
  resolveInstallContext,
  setInstallContext,
  validateOmaHome,
} from "./install-context.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "oma-test-"));
  tmpDirs.push(d);
  return d;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("install-context", () => {
  beforeEach(() => {
    _resetInstallContext();
  });

  afterEach(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  // ── setInstallContext / getInstallContext ──────────────────────────────────

  describe("setInstallContext / getInstallContext", () => {
    it("sets once and reads back", () => {
      const ctx = { installRoot: "/tmp/project", mode: "project" } as const;
      setInstallContext(ctx);
      expect(getInstallContext()).toEqual(ctx);
    });

    it("throws when called twice (already set)", () => {
      setInstallContext({ installRoot: "/tmp/a", mode: "project" });
      expect(() =>
        setInstallContext({ installRoot: "/tmp/b", mode: "global" }),
      ).toThrow(/already set/);
    });

    it("throws when get called before set (context not set)", () => {
      expect(() => getInstallContext()).toThrow(/not set/);
    });
  });

  // ── getInstallRoot / getInstallMode ───────────────────────────────────────

  describe("getInstallRoot / getInstallMode", () => {
    it("returns installRoot from context", () => {
      setInstallContext({ installRoot: "/home/user/proj", mode: "project" });
      expect(getInstallRoot()).toBe("/home/user/proj");
    });

    it("returns mode from context", () => {
      setInstallContext({ installRoot: "/home/user", mode: "global" });
      expect(getInstallMode()).toBe("global");
    });

    it("getInstallRoot throws when context not set", () => {
      expect(() => getInstallRoot()).toThrow(/not set/);
    });

    it("getInstallMode throws when context not set", () => {
      expect(() => getInstallMode()).toThrow(/not set/);
    });
  });

  // ── _resetInstallContext ──────────────────────────────────────────────────

  describe("_resetInstallContext", () => {
    it("resets to null state (get throws after reset)", () => {
      setInstallContext({ installRoot: "/tmp/x", mode: "project" });
      _resetInstallContext();
      expect(() => getInstallContext()).toThrow(/not set/);
    });

    it("allows re-setting after reset", () => {
      setInstallContext({ installRoot: "/tmp/x", mode: "project" });
      _resetInstallContext();
      const ctx2 = { installRoot: "/tmp/y", mode: "global" } as const;
      setInstallContext(ctx2);
      expect(getInstallContext()).toEqual(ctx2);
    });
  });

  // ── resolveInstallContext ─────────────────────────────────────────────────

  describe("resolveInstallContext", () => {
    let savedOmaHome: string | undefined;
    let savedOmaInstallGlobal: string | undefined;

    beforeEach(() => {
      savedOmaHome = process.env.OMA_HOME;
      savedOmaInstallGlobal = process.env.OMA_INSTALL_GLOBAL;
      delete process.env.OMA_HOME;
      delete process.env.OMA_INSTALL_GLOBAL;
    });

    afterEach(() => {
      if (savedOmaHome === undefined) {
        delete process.env.OMA_HOME;
      } else {
        process.env.OMA_HOME = savedOmaHome;
      }
      if (savedOmaInstallGlobal === undefined) {
        delete process.env.OMA_INSTALL_GLOBAL;
      } else {
        process.env.OMA_INSTALL_GLOBAL = savedOmaInstallGlobal;
      }
    });

    it("default (no env, no global flag) → project mode + cwd", () => {
      const result = resolveInstallContext({});
      expect(result.mode).toBe("project");
      expect(result.installRoot).toBe(process.cwd());
    });

    it("--global flag set → global mode + homedir()", () => {
      const result = resolveInstallContext({ global: true });
      expect(result.mode).toBe("global");
      expect(result.installRoot).toBe(os.homedir());
    });

    it("OMA_INSTALL_GLOBAL=1 env → global mode + homedir()", () => {
      process.env.OMA_INSTALL_GLOBAL = "1";
      const result = resolveInstallContext({});
      expect(result.mode).toBe("global");
      expect(result.installRoot).toBe(os.homedir());
    });

    it("OMA_HOME set + neither flag → installRoot = OMA_HOME, mode = project", () => {
      const dir = makeTmpDir();
      process.env.OMA_HOME = dir;
      const result = resolveInstallContext({});
      expect(result.installRoot).toBe(dir);
      expect(result.mode).toBe("project");
    });

    it("OMA_HOME set + --global → installRoot = OMA_HOME, mode = global", () => {
      const dir = makeTmpDir();
      process.env.OMA_HOME = dir;
      const result = resolveInstallContext({ global: true });
      expect(result.installRoot).toBe(dir);
      expect(result.mode).toBe("global");
    });

    it("OMA_HOME set + OMA_INSTALL_GLOBAL=1 → installRoot = OMA_HOME, mode = global", () => {
      const dir = makeTmpDir();
      process.env.OMA_HOME = dir;
      process.env.OMA_INSTALL_GLOBAL = "1";
      const result = resolveInstallContext({});
      expect(result.installRoot).toBe(dir);
      expect(result.mode).toBe("global");
    });

    it("OMA_HOME priority beats --global for root (OMA_HOME wins)", () => {
      const dir = makeTmpDir();
      process.env.OMA_HOME = dir;
      const result = resolveInstallContext({ global: true });
      // installRoot must be OMA_HOME, NOT homedir()
      expect(result.installRoot).toBe(dir);
      expect(result.installRoot).not.toBe(os.homedir());
    });
  });

  // ── validateOmaHome ───────────────────────────────────────────────────────

  describe("validateOmaHome", () => {
    it("accepts a valid writable absolute path", () => {
      const dir = makeTmpDir();
      expect(() => validateOmaHome(dir)).not.toThrow();
    });

    it("rejects relative path with 'must be absolute'", () => {
      expect(() => validateOmaHome("relative/path")).toThrow(
        /must be absolute/,
      );
    });

    it("rejects /etc with 'forbidden'", () => {
      // Pre-realpath deny-list check fires on the literal `/etc` regardless
      // of platform (macOS resolves /etc → /private/etc, but the pre-check
      // runs first and matches `/etc` against the deny-list).
      expect(() => validateOmaHome("/etc")).toThrow(/forbidden/);
    });

    it("rejects /usr with 'forbidden'", () => {
      expect(() => validateOmaHome("/usr")).toThrow(/forbidden/);
    });

    it("rejects /bin with 'forbidden'", () => {
      expect(() => validateOmaHome("/bin")).toThrow(/forbidden/);
    });

    it("rejects /boot with 'forbidden'", () => {
      // Pre-realpath deny-list fires before realpath, so non-existent
      // system paths are still rejected with the deny-list message.
      expect(() => validateOmaHome("/boot")).toThrow(/forbidden/);
    });

    it("rejects /sys with 'forbidden'", () => {
      expect(() => validateOmaHome("/sys")).toThrow(/forbidden/);
    });

    it("rejects /proc with 'forbidden'", () => {
      expect(() => validateOmaHome("/proc")).toThrow(/forbidden/);
    });

    it("rejects /etc/foo (subpath) with 'forbidden'", () => {
      // Defense-in-depth: subpaths of forbidden prefixes also rejected
      // pre-realpath, regardless of whether the path exists.
      expect(() => validateOmaHome("/etc/foo")).toThrow(/forbidden/);
    });

    it("rejects subpaths like /usr/local with 'forbidden'", () => {
      // /usr/local resolves to itself on both macOS and Linux — deny-list fires
      expect(() => validateOmaHome("/usr/local")).toThrow(/forbidden/);
    });

    it("rejects non-existent path — error mentions the path", () => {
      const nonExistent = "/tmp/oma-definitely-does-not-exist-xyzzy";
      expect(() => validateOmaHome(nonExistent)).toThrow(
        new RegExp(nonExistent.replace(/\//g, "\\/").replace(/-/g, "\\-")),
      );
    });

    it("rejects readonly path with 'not writable' (skip on Windows)", () => {
      if (process.platform === "win32") return;
      const dir = makeTmpDir();
      fs.chmodSync(dir, 0o444);
      try {
        expect(() => validateOmaHome(dir)).toThrow(/not writable/);
      } finally {
        // Restore permissions so cleanup can delete it
        fs.chmodSync(dir, 0o755);
      }
    });
  });
});

describe("isProjectModeInHome (#788)", () => {
  it("is true only for project mode whose root resolves to HOME", () => {
    const home = makeTmpDir();
    expect(isProjectModeInHome(home, "project", home)).toBe(true);
    expect(isProjectModeInHome(`${home}${path.sep}.`, "project", home)).toBe(
      true,
    );
    expect(isProjectModeInHome(home, "global", home)).toBe(false);
    expect(isProjectModeInHome(path.join(home, "proj"), "project", home)).toBe(
      false,
    );
  });
});
