/**
 * Unit tests for collectHookWrapperChecks (hook-wrapper-check.ts).
 *
 * Covers:
 *   1. Wrapper exists + oma on PATH → "pass"
 *   2. Wrapper exists + oma nowhere the wrapper looks → "warning" with remediation
 *   3. Wrapper exists + oma only in a well-known install dir → "pass"
 *   4. Wrapper exists + oma only via $OMA_BIN → "pass"
 *   5. No wrapper installed for a vendor → "skip" (no crash)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock state so it is available before imports.
// ---------------------------------------------------------------------------
const fsState = vi.hoisted(() => ({
  existsSyncFn: vi.fn((_p: unknown) => false),
  accessSyncFn: vi.fn((_p: unknown, _mode?: unknown): void => undefined),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: fsState.existsSyncFn,
    accessSync: fsState.accessSyncFn,
  };
});

// homedir is called at module import time in the hook-wrapper-check source;
// stub it to a fixed value so paths are predictable in tests.
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, homedir: () => "/home/testuser" };
});

import { collectHookWrapperChecks } from "./hook-wrapper-check.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv(pathDirs: string[] = []): NodeJS.ProcessEnv {
  return { PATH: pathDirs.join(":") };
}

/**
 * Only the given absolute paths exist (plus the vendor's wrapper), and anything
 * that exists is executable.
 */
function onlyTheseExist(wrapperSuffix: string, paths: string[]): void {
  fsState.existsSyncFn.mockImplementation((p: unknown) => {
    const path = String(p);
    return path.endsWith(wrapperSuffix) || paths.includes(path);
  });
  fsState.accessSyncFn.mockImplementation(() => {
    // accessSync does not throw → executable
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("collectHookWrapperChecks", () => {
  it("returns 'skip' when the oma-hook.sh wrapper is not installed for a vendor", () => {
    // existsSync always returns false → no wrapper found anywhere
    fsState.existsSyncFn.mockReturnValue(false);

    const checks = collectHookWrapperChecks("/project", makeEnv());

    // All vendors should be "skip" — no crash
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check.status).toBe("skip");
    }
  });

  it("returns 'pass' when wrapper exists and oma is on PATH", () => {
    onlyTheseExist(".claude/hooks/oma-hook.sh", ["/usr/local/bin/oma"]);

    const checks = collectHookWrapperChecks(
      "/project",
      makeEnv(["/usr/local/bin"]),
    );

    expect(checks.find((c) => c.vendor === "claude")?.status).toBe("pass");
  });

  it("returns 'warning' with remediation when oma is nowhere the wrapper looks", () => {
    onlyTheseExist(".claude/hooks/oma-hook.sh", []);

    // Empty PATH and no oma in any well-known install dir
    const checks = collectHookWrapperChecks("/project", makeEnv([]));

    const claude = checks.find((c) => c.vendor === "claude");
    expect(claude?.status).toBe("warning");
    expect(claude?.remediation).toMatch(/OMA_BIN/);
  });

  it("returns 'pass' when oma is only in a well-known install dir, not on PATH", () => {
    // Mirrors a GUI-launched agent: minimal PATH, oma installed by mise.
    onlyTheseExist(".qwen/hooks/oma-hook.sh", [
      "/home/testuser/.local/share/mise/shims/oma",
    ]);

    const checks = collectHookWrapperChecks("/project", makeEnv([]));

    expect(checks.find((c) => c.vendor === "qwen")?.status).toBe("pass");
  });

  it("returns 'pass' when only $OMA_BIN points at an executable oma", () => {
    onlyTheseExist(".claude/hooks/oma-hook.sh", ["/opt/custom/oma"]);

    const checks = collectHookWrapperChecks("/project", {
      ...makeEnv([]),
      OMA_BIN: "/opt/custom/oma",
    });

    expect(checks.find((c) => c.vendor === "claude")?.status).toBe("pass");
  });

  it("excludes the antigravity vendor (no oma-hook.sh — .agents/hooks.json runs handlers directly)", () => {
    fsState.existsSyncFn.mockReturnValue(false);
    const checks = collectHookWrapperChecks("/project", makeEnv());
    const agy = checks.find((c) => c.vendor === "antigravity");
    expect(agy).toBeUndefined();
  });
});
