/**
 * Unit tests for collectHookWrapperChecks (hook-wrapper-check.ts).
 *
 * Covers:
 *   1. Wrapper exists + oma on PATH → "pass"
 *   2. Wrapper exists + oma NOT on PATH + recorded path gone → "warning" with remediation
 *   3. Wrapper exists + oma NOT on PATH + recorded abs path is executable → "pass"
 *   4. No wrapper installed for a vendor → "skip" (no crash)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock state so it is available before imports.
// ---------------------------------------------------------------------------
const fsState = vi.hoisted(() => ({
  existsSyncFn: vi.fn((_p: unknown) => false),
  accessSyncFn: vi.fn((_p: unknown, _mode?: unknown): void => undefined),
  readFileSyncFn: vi.fn((_p: unknown) => ""),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: fsState.existsSyncFn,
    accessSync: fsState.accessSyncFn,
    readFileSync: fsState.readFileSyncFn,
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

/** A minimal fake wrapper content that embeds a recorded oma path. */
function wrapperWithPath(omaPath: string): string {
  return `#!/usr/bin/env bash\nif command -v oma > /dev/null 2>&1; then\n  oma "$@"\nelif [ -x "${omaPath}" ]; then\n  "${omaPath}" "$@"\nfi\n`;
}

function makeEnv(pathDirs: string[] = []): NodeJS.ProcessEnv {
  return { PATH: pathDirs.join(":") };
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
    // Only the claude wrapper exists; oma binary is on PATH at /usr/local/bin/oma
    fsState.existsSyncFn.mockImplementation((p: unknown) => {
      const path = String(p);
      return (
        path.endsWith(".claude/hooks/oma-hook.sh") ||
        path === "/usr/local/bin/oma"
      );
    });
    fsState.accessSyncFn.mockImplementation((_p: unknown, _mode: unknown) => {
      // All executable checks succeed
    });

    const env = makeEnv(["/usr/local/bin"]);
    const checks = collectHookWrapperChecks("/project", env);

    const claude = checks.find((c) => c.vendor === "claude");
    expect(claude).toBeDefined();
    expect(claude?.status).toBe("pass");
  });

  it("returns 'warning' with remediation when wrapper exists but oma is not resolvable", () => {
    // The claude wrapper exists but oma is not on PATH and the recorded path is gone
    fsState.existsSyncFn.mockImplementation((p: unknown) => {
      const path = String(p);
      if (path.endsWith(".claude/hooks/oma-hook.sh")) return true;
      // The recorded path inside the wrapper does not exist
      if (path === "/old/absolute/path/oma") return false;
      return false;
    });
    fsState.readFileSyncFn.mockImplementation((p: unknown) => {
      if (String(p).endsWith(".claude/hooks/oma-hook.sh")) {
        return wrapperWithPath("/old/absolute/path/oma");
      }
      return "";
    });

    // Empty PATH → oma not on path
    const env = makeEnv([]);
    const checks = collectHookWrapperChecks("/project", env);

    const claude = checks.find((c) => c.vendor === "claude");
    expect(claude).toBeDefined();
    expect(claude?.status).toBe("warning");
    expect(claude?.remediation).toMatch(/oma link/i);
  });

  it("returns 'pass' when wrapper exists, oma NOT on PATH, but recorded abs path is executable", () => {
    const recordedOmaPath = "/home/testuser/.bun/bin/oma";

    fsState.existsSyncFn.mockImplementation((p: unknown) => {
      const path = String(p);
      if (path.endsWith(".qwen/hooks/oma-hook.sh")) return true;
      if (path === recordedOmaPath) return true;
      return false;
    });
    fsState.accessSyncFn.mockImplementation((_p: unknown, _mode: unknown) => {
      // accessSync does not throw → file is executable
    });
    fsState.readFileSyncFn.mockImplementation((p: unknown) => {
      if (String(p).endsWith(".qwen/hooks/oma-hook.sh")) {
        return wrapperWithPath(recordedOmaPath);
      }
      return "";
    });

    // Empty PATH → oma not on path via PATH lookup
    const env = makeEnv([]);
    const checks = collectHookWrapperChecks("/project", env);

    const qwen = checks.find((c) => c.vendor === "qwen");
    expect(qwen).toBeDefined();
    expect(qwen?.status).toBe("pass");
  });

  it("excludes the antigravity vendor (no oma-hook.sh — .agents/hooks.json runs handlers directly)", () => {
    fsState.existsSyncFn.mockReturnValue(false);
    const checks = collectHookWrapperChecks("/project", makeEnv());
    const agy = checks.find((c) => c.vendor === "antigravity");
    expect(agy).toBeUndefined();
  });
});
