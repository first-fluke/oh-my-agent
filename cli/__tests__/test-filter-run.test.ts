/**
 * Pure in-process tests for the test-filter handler's `run()` — no subprocess
 * spawn, so this file is safe to run in the Windows CI step (the full vitest
 * suite is skipped there; see .github/workflows/test.yml).
 *
 * Regression coverage for #618 (Windows/OpenCode Bash-only wrapper):
 *  - win32 hosts never get the `set -o pipefail` Bash wrapper
 *  - an already filtered command is not wrapped again (idempotency)
 *  - Unix hosts keep the existing failure-filter behavior
 *  - arguments and quoted values are preserved verbatim inside the wrapper
 */

import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => "{}"),
}));

const tf = await import("../../.agents/hooks/core/test-filter.ts");

const REAL_PLATFORM = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

function runWith(command: string) {
  return tf.run(
    {
      kind: "pre_tool",
      toolName: "Bash",
      toolInput: { command },
      cwd: "/tmp/project",
    },
    { vendor: "claude", cwd: "/tmp/project" },
  );
}

afterEach(() => {
  setPlatform(REAL_PLATFORM);
});

describe("test-filter run() — platform and idempotency guards (#618)", () => {
  describe("on win32", () => {
    it("does not wrap `npm test` (command reaches the host shell untouched)", async () => {
      setPlatform("win32");
      const result = await runWith("npm test");
      expect(result).toBeNull();
    });

    it("never emits `set -o pipefail` for any test runner command", async () => {
      setPlatform("win32");
      for (const cmd of ["npm test", "vitest --run", "bun run test"]) {
        const result = await runWith(cmd);
        expect(result).toBeNull();
      }
    });
  });

  describe("on unix", () => {
    it("keeps the existing failure-filter wrapper", async () => {
      setPlatform("linux");
      const result = await runWith("npm test");
      expect(result?.type).toBe("mutate");
      if (result?.type === "mutate") {
        const cmd = result.updatedInput.command as string;
        expect(cmd).toContain("set -o pipefail");
        expect(cmd).toContain("filter-test-output.sh");
      }
    });

    it("does not wrap an already filtered command again", async () => {
      setPlatform("linux");
      const first = await runWith("npm test");
      expect(first?.type).toBe("mutate");
      if (first?.type !== "mutate") return;
      const wrapped = first.updatedInput.command as string;

      const second = await runWith(wrapped);
      expect(second).toBeNull();
    });

    it("preserves arguments and quoted values verbatim", async () => {
      setPlatform("linux");
      const original = 'npm test -- --grep "foo bar" --reporter=dot';
      const result = await runWith(original);
      expect(result?.type).toBe("mutate");
      if (result?.type === "mutate") {
        expect(result.updatedInput.command as string).toContain(
          `(\n${original}\n)`,
        );
      }
    });

    it("keeps the original command on its own lines inside the subshell", async () => {
      setPlatform("linux");
      for (const original of [
        "npm test # full suite",
        "python3 - <<'EOF'\nimport pytest\nEOF",
      ]) {
        const result = await runWith(original);
        expect(result?.type).toBe("mutate");
        if (result?.type === "mutate") {
          expect(result.updatedInput.command as string).toMatch(
            /^set -o pipefail; \(\n[\s\S]*\n\) 2>&1 \| bash "/,
          );
        }
      }
    });

    it("resolves the filter script from the project root, not the session cwd", async () => {
      setPlatform("linux");
      const result = await tf.run(
        {
          kind: "pre_tool",
          toolName: "Bash",
          toolInput: { command: "npm test" },
          cwd: "/tmp/project/packages/api",
        },
        { vendor: "claude", cwd: "/tmp/project" },
      );
      expect(result?.type).toBe("mutate");
      if (result?.type === "mutate") {
        expect(result.updatedInput.command as string).toContain(
          `bash "${join("/tmp/project", ".claude", "hooks", "filter-test-output.sh")}"`,
        );
      }
    });
  });
});
