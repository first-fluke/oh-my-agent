import { accessSync, constants } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Invocation } from "./types.js";

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

/** Mirror of the helper's PATH probe so positive tests skip when `script` is absent. */
function scriptOnPath(): boolean {
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  return dirs.some((dir) => {
    try {
      accessSync(path.join(dir, "script"), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

const hasScript = scriptOnPath();

// Each subtest re-imports so the module-level `scriptOnPath` cache is fresh.
async function freshWrap() {
  vi.resetModules();
  return import("./pty-wrap.js");
}

const baseInvocation: Invocation = {
  command: "agy",
  args: ["--dangerously-skip-permissions", "-p", "hello 'world'"],
  env: { FOO: "bar" } as NodeJS.ProcessEnv,
};

afterEach(() => {
  setPlatform(originalPlatform);
});

describe("targetVendorNeedsPty", () => {
  it("is true for antigravity (agy non-TTY stdout drop, antigravity-cli#76)", async () => {
    const { targetVendorNeedsPty } = await freshWrap();
    expect(targetVendorNeedsPty("antigravity")).toBe(true);
  });

  it("is false for vendors that emit headless stdout normally", async () => {
    const { targetVendorNeedsPty } = await freshWrap();
    for (const v of [
      "claude",
      "codex",
      "gemini",
      "cursor",
      "qwen",
      "grok",
      "kiro",
    ]) {
      expect(targetVendorNeedsPty(v)).toBe(false);
    }
  });
});

describe("wrapInvocationWithPty", () => {
  it("does not wrap on win32 and reports a ConPTY/upstream reason", async () => {
    setPlatform("win32");
    const { wrapInvocationWithPty } = await freshWrap();
    const result = wrapInvocationWithPty(baseInvocation);
    expect(result.wrapped).toBe(false);
    expect(result.invocation).toEqual(baseInvocation);
    expect(result.unsupportedReason).toMatch(/ConPTY|antigravity-cli#187/);
  });

  it.skipIf(!hasScript)(
    "wraps with BSD script argv passthrough on darwin",
    async () => {
      setPlatform("darwin");
      const { wrapInvocationWithPty } = await freshWrap();
      const result = wrapInvocationWithPty(baseInvocation);
      expect(result.wrapped).toBe(true);
      expect(result.invocation.command).toBe("script");
      expect(result.invocation.args).toEqual([
        "-q",
        "/dev/null",
        "agy",
        "--dangerously-skip-permissions",
        "-p",
        "hello 'world'",
      ]);
      // env is forwarded untouched so creds/PATH reach the child.
      expect(result.invocation.env).toBe(baseInvocation.env);
    },
  );

  it.skipIf(!hasScript)(
    "wraps with util-linux `script -c` + shell escaping on linux",
    async () => {
      setPlatform("linux");
      const { wrapInvocationWithPty } = await freshWrap();
      const result = wrapInvocationWithPty(baseInvocation);
      expect(result.wrapped).toBe(true);
      const { command, args } = result.invocation;
      expect(command).toBe("script");
      expect(args[0]).toBe("-q");
      expect(args).toContain("-e");
      expect(args).toContain("-c");
      expect(args[args.length - 1]).toBe("/dev/null");
      // The embedded shell string single-quotes every argv token; the
      // embedded apostrophe in "hello 'world'" is escaped as '\''.
      const shellString = args[args.indexOf("-c") + 1];
      expect(shellString).toBe(
        "'agy' '--dangerously-skip-permissions' '-p' 'hello '\\''world'\\'''",
      );
    },
  );
});
