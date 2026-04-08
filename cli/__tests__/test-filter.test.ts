import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const HOOK_PATH = join(__dirname, "../../.agents/hooks/core/test-filter.ts");

function runHook(input: Record<string, unknown>): string {
  try {
    return execSync(`echo '${JSON.stringify(input)}' | bun "${HOOK_PATH}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_PROJECT_DIR: join(__dirname, "../..") },
    }).trim();
  } catch {
    return "";
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
});
