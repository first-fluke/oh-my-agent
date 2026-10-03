/**
 * Executes the command test-filter rewrites, through real bash and the real
 * filter-test-output.sh. The in-process run() tests only inspect the string;
 * these catch rewrites that are syntactically broken shell — a trailing
 * `# comment` swallowing the subshell's closing paren, a heredoc terminator
 * turned into `EOF)` — which turned a passing test command into exit 2.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const tf = await import("../../.agents/hooks/core/test-filter.ts");

const FILTER_SOURCE = join(
  __dirname,
  "../../.agents/hooks/core/filter-test-output.sh",
);

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-test-filter-exec-"));
  const hooksDir = join(projectDir, ".claude", "hooks");
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(FILTER_SOURCE, join(hooksDir, "filter-test-output.sh"));
});

afterAll(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

async function rewrite(command: string): Promise<string> {
  const result = await tf.run(
    {
      kind: "pre_tool",
      toolName: "Bash",
      toolInput: { command },
      cwd: projectDir,
    },
    { vendor: "claude", cwd: projectDir },
  );
  expect(result?.type).toBe("mutate");
  if (result?.type !== "mutate") throw new Error("command was not rewritten");
  return result.updatedInput.command as string;
}

function execBash(command: string) {
  return spawnSync("bash", ["-c", command], {
    cwd: projectDir,
    encoding: "utf-8",
    timeout: 10_000,
  });
}

// The rewrite is Bash-only and never applied on win32 (#618).
describe.skipIf(process.platform === "win32")(
  "test-filter rewrite executes under bash",
  () => {
    it("keeps working when the command ends with a # comment", async () => {
      const result = execBash(
        await rewrite("echo vitest-output # run the vitest suite"),
      );
      expect(result.stderr).not.toContain("syntax error");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("vitest-output");
    });

    it("keeps working when the command ends with a heredoc", async () => {
      const result = execBash(
        await rewrite("cat <<'EOF'\nvitest heredoc body\nEOF"),
      );
      expect(result.stderr).not.toContain("syntax error");
      expect(result.stderr).not.toContain("here-document");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("vitest heredoc body");
    });

    it("propagates the test command's own exit code through the filter", async () => {
      const result = execBash(await rewrite('echo "vitest: 1 failed"; exit 7'));
      expect(result.status).toBe(7);
      expect(result.stdout).toContain("1 failed");
    });

    it("still filters passing lines and keeps failures", async () => {
      const result = execBash(
        await rewrite(
          "printf '%s\\n' ' ✓ passes quietly' 'FAIL src/a.test.ts' # vitest",
        ),
      );
      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain("passes quietly");
      expect(result.stdout).toContain("FAIL src/a.test.ts");
    });
  },
);
