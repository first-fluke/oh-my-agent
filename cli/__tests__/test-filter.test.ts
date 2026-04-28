import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOOK_PATH = join(__dirname, "../../.agents/hooks/core/test-filter.ts");
const PROJECT_DIR = join(__dirname, "../..");

function runHook(
  input: Record<string, unknown>,
  env: NodeJS.ProcessEnv = {},
): string {
  // Stdin via spawnSync.input is unreliable when this process itself runs
  // under bun (observed under vitest worker pools): the child sees an empty
  // stdin and exits 0 with no output. Materialize input to a temp file and
  // redirect via shell so the child reliably reads it.
  const tmp = mkdtempSync(join(tmpdir(), "oma-test-filter-"));
  const inputFile = join(tmp, "input.json");
  writeFileSync(inputFile, JSON.stringify(input), "utf-8");
  try {
    const result = spawnSync("bun", [HOOK_PATH], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: PROJECT_DIR,
        OMA_HOOK_INPUT_FILE: inputFile,
        OMA_HOOK_DEBUG: "1",
        ...env,
      },
    });
    if (result.status !== 0 || !result.stdout?.trim()) {
      process.stderr.write(
        `runHook diag: status=${result.status} stderr=${result.stderr ?? ""} stdout=${result.stdout ?? ""}\n` +
          `  HOOK_PATH=${HOOK_PATH}\n  inputFile=${inputFile}\n`,
      );
    }
    return (result.stdout ?? "").trim();
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

describe("test-filter hook", () => {
  describe("test runner detection", () => {
    const testCommands = [
      "vitest --run",
      "jest",
      "bun test",
      "bun run test",
      "npm test",
      "npm run test",
      "yarn test",
      "pnpm test",
      "pytest",
      "uv run pytest",
      "python -m unittest",
      "go test ./...",
      "cargo test",
      "flutter test",
      "dart test",
      "swift test",
      "dotnet test",
      "./gradlew test",
      "mvn test",
      "rspec",
      "mix test",
      "phpunit",
    ];

    for (const cmd of testCommands) {
      it(`should detect: ${cmd}`, () => {
        const result = runHook({
          tool_name: "Bash",
          tool_input: { command: cmd },
          hook_event_name: "PreToolUse",
          sessionId: "s1",
        });
        expect(result).toContain("filter-test-output.sh");
      });
    }
  });

  describe("exclusion patterns", () => {
    const excludedCommands = [
      "npm install vitest",
      "bun add jest",
      "pip install pytest",
    ];

    for (const cmd of excludedCommands) {
      it(`should NOT trigger for: ${cmd}`, () => {
        const result = runHook({
          tool_name: "Bash",
          tool_input: { command: cmd },
          hook_event_name: "PreToolUse",
          sessionId: "s1",
        });
        expect(result).toBe("");
      });
    }
  });

  describe("non-Bash tools", () => {
    it("should ignore Read tool", () => {
      const result = runHook({
        tool_name: "Read",
        tool_input: { file_path: "/foo/test.ts" },
      });
      expect(result).toBe("");
    });

    it("should ignore Bash without test command", () => {
      const result = runHook({
        tool_name: "Bash",
        tool_input: { command: "ls -la" },
      });
      expect(result).toBe("");
    });
  });

  describe("vendor output format", () => {
    it("should output hookSpecificOutput for Claude", () => {
      const result = runHook({
        tool_name: "Bash",
        tool_input: { command: "vitest" },
        hook_event_name: "PreToolUse",
        sessionId: "s1",
      });
      const parsed = JSON.parse(result);
      expect(parsed.hookSpecificOutput.hookEventName).toBe("PreToolUse");
      expect(parsed.hookSpecificOutput.updatedInput.command).toContain(
        "vitest",
      );
    });

    it("should output rewrite decision for Gemini", () => {
      const result = runHook({
        tool_name: "Bash",
        tool_input: { command: "vitest" },
        hook_event_name: "BeforeTool",
      });
      const parsed = JSON.parse(result);
      expect(parsed.decision).toBe("rewrite");
      expect(parsed.tool_input.command).toContain("vitest");
    });

    it("should preserve original tool_input fields", () => {
      const result = runHook({
        tool_name: "Bash",
        tool_input: { command: "vitest", timeout: 60000, description: "tests" },
        hook_event_name: "PreToolUse",
        sessionId: "s1",
      });
      const parsed = JSON.parse(result);
      const updated = parsed.hookSpecificOutput.updatedInput;
      expect(updated.timeout).toBe(60000);
      expect(updated.description).toBe("tests");
    });
  });

  describe("vendor hook paths", () => {
    it("should use the Codex hook directory for Codex sessions", () => {
      const result = runHook({
        tool_name: "Bash",
        tool_input: { command: "vitest --run" },
        hook_event_name: "PreToolUse",
        session_id: "s1",
        cwd: PROJECT_DIR,
      });

      expect(result).toContain(".codex/hooks/filter-test-output.sh");
      expect(result).not.toContain(".claude/hooks/filter-test-output.sh");
    });

    it("should use the Gemini hook directory for Gemini sessions", () => {
      const result = runHook(
        {
          tool_name: "Bash",
          tool_input: { command: "vitest --run" },
          hook_event_name: "BeforeTool",
        },
        { GEMINI_PROJECT_DIR: PROJECT_DIR },
      );

      expect(result).toContain(".gemini/hooks/filter-test-output.sh");
      expect(result).not.toContain(".claude/hooks/filter-test-output.sh");
    });

    it("should use the Qwen hook directory for Qwen sessions", () => {
      const result = runHook(
        {
          tool_name: "Bash",
          tool_input: { command: "vitest --run" },
          hook_event_name: "PreToolUse",
          sessionId: "s1",
        },
        { QWEN_PROJECT_DIR: PROJECT_DIR },
      );

      expect(result).toContain(".qwen/hooks/filter-test-output.sh");
      expect(result).not.toContain(".claude/hooks/filter-test-output.sh");
    });
  });
});
