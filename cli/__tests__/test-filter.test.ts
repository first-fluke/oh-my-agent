import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../../.agents/hooks/core/test-filter.ts";

const HOOK_PATH = join(__dirname, "../../.agents/hooks/core/test-filter.ts");

// Build an isolated project dir containing the filter scripts the hook
// expects per vendor. This avoids depending on the developer-only `.claude/`
// directory (git-ignored) and works on fresh CI checkouts.
function makeProjectDir(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-test-filter-proj-"));
  for (const vendor of [".claude", ".codex", ".qwen"]) {
    const hooksDir = join(root, vendor, "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, "filter-test-output.sh"), "#!/bin/sh\ncat\n", {
      mode: 0o755,
    });
  }
  return root;
}

function runHook(
  input: Record<string, unknown>,
  env: NodeJS.ProcessEnv = {},
): string {
  // Stdin via spawnSync.input is unreliable when this process itself runs
  // under bun (observed under vitest worker pools). Materialize input to a
  // temp file and pass its path via OMA_HOOK_INPUT_FILE so the hook reads it
  // synchronously from the file system instead of stdin.
  const tmp = mkdtempSync(join(tmpdir(), "oma-test-filter-"));
  const inputFile = join(tmp, "input.json");
  // Inject our scratch projectDir as input.cwd for codex/cursor vendors that
  // resolve projectDir from the input rather than env vars.
  const projectDir = makeProjectDir();
  const inputWithCwd = { cwd: projectDir, ...input };
  writeFileSync(inputFile, JSON.stringify(inputWithCwd), "utf-8");
  try {
    const result = spawnSync("bun", [HOOK_PATH], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Point every vendor's project-dir env at the same scratch dir so
        // the hook finds the stub filter-test-output.sh regardless of which
        // vendor it detects from the input.
        CLAUDE_PROJECT_DIR: projectDir,
        QWEN_PROJECT_DIR: env.QWEN_PROJECT_DIR ? projectDir : "",
        OMA_HOOK_INPUT_FILE: inputFile,
        ...env,
        ...(env.QWEN_PROJECT_DIR ? { QWEN_PROJECT_DIR: projectDir } : {}),
      },
    });
    if (result.status !== 0) {
      process.stderr.write(
        `runHook failed (status=${result.status}): ${result.stderr ?? ""}\n`,
      );
    }
    return (result.stdout ?? "").trim();
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
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

  describe('"Shell" tool name (Cursor terminal tool)', () => {
    // Verifies the toolName gate accepts "Shell". Vendor detection in the
    // standalone path is orthogonal (real cursor dispatch passes --vendor
    // cursor); a claude-detecting event keeps this focused on the gate.
    it("should rewrite a test command run via a Shell tool", () => {
      const result = runHook({
        tool_name: "Shell",
        tool_input: { command: "vitest --run" },
        hook_event_name: "PreToolUse",
        sessionId: "s1",
      });
      expect(result).toContain("filter-test-output.sh");
    });
  });

  describe('"execute_bash" tool name (Kiro shell tool)', () => {
    // Verifies the toolName gate accepts Kiro's canonical execute_bash. As
    // with the Shell case above, vendor detection is orthogonal — a
    // claude-detecting event keeps this focused on the gate.
    it("should rewrite a test command run via an execute_bash tool", () => {
      const result = runHook({
        tool_name: "execute_bash",
        tool_input: { command: "vitest --run" },
        hook_event_name: "PreToolUse",
        sessionId: "s1",
      });
      expect(result).toContain("filter-test-output.sh");
    });
  });

  describe("filter script fallback resolution", () => {
    it("prefers the owned vendor namespace over a legacy filter script", async () => {
      const root = makeProjectDir();
      const ownedDir = join(root, ".codex", "hooks", "oma");
      mkdirSync(ownedDir, { recursive: true });
      writeFileSync(
        join(ownedDir, "filter-test-output.sh"),
        "#!/bin/sh\ncat\n",
      );
      try {
        const result = await run(
          {
            kind: "pre_tool",
            toolName: "Bash",
            toolInput: { command: "vitest --run" },
            cwd: root,
          },
          { vendor: "codex", cwd: root },
        );
        expect(result?.type).toBe("mutate");
        if (result?.type !== "mutate")
          throw new Error("Expected rewritten command");
        expect(result.updatedInput.command).toContain(
          join(ownedDir, "filter-test-output.sh"),
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    // opencode has no core Vendor identity: its bridge subprocess payload
    // detects as claude, whose hook dir does not exist in an opencode-only
    // install. The hook must fall back to the bridge dir, then the SSOT core
    // dir, instead of silently no-opping.
    function runHookInBareProject(scriptDir: string): string {
      const root = mkdtempSync(join(tmpdir(), "oma-test-filter-bare-"));
      const dir = join(root, scriptDir);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "filter-test-output.sh"), "#!/bin/sh\ncat\n", {
        mode: 0o755,
      });
      const tmp = mkdtempSync(join(tmpdir(), "oma-test-filter-"));
      const inputFile = join(tmp, "input.json");
      writeFileSync(
        inputFile,
        JSON.stringify({
          cwd: root,
          tool_name: "Bash",
          tool_input: { command: "vitest --run" },
          hook_event_name: "PreToolUse",
          sessionId: "s1",
        }),
        "utf-8",
      );
      try {
        const result = spawnSync("bun", [HOOK_PATH], {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            CLAUDE_PROJECT_DIR: root,
            QWEN_PROJECT_DIR: "",
            OMA_HOOK_INPUT_FILE: inputFile,
          },
        });
        return (result.stdout ?? "").trim();
      } finally {
        rmSync(tmp, { recursive: true, force: true });
        rmSync(root, { recursive: true, force: true });
      }
    }

    it("falls back to the opencode bridge dir when the vendor dir is absent", () => {
      const result = runHookInBareProject(join(".opencode", "plugins", "oma"));
      const normalized = result.replace(/\\\\/g, "/").replace(/\\/g, "/");
      expect(normalized).toContain(
        ".opencode/plugins/oma/filter-test-output.sh",
      );
    });

    it("falls back to the SSOT core dir as the last resort", () => {
      const result = runHookInBareProject(join(".agents", "hooks", "core"));
      const normalized = result.replace(/\\\\/g, "/").replace(/\\/g, "/");
      expect(normalized).toContain(".agents/hooks/core/filter-test-output.sh");
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
      });
      const normalized = result.replace(/\\\\/g, "/").replace(/\\/g, "/");

      expect(normalized).toContain(".codex/hooks/filter-test-output.sh");
      expect(normalized).not.toContain(".claude/hooks/filter-test-output.sh");
    });

    it("should use the Qwen hook directory for Qwen sessions", () => {
      const result = runHook(
        {
          tool_name: "Bash",
          tool_input: { command: "vitest --run" },
          hook_event_name: "PreToolUse",
          sessionId: "s1",
        },
        { QWEN_PROJECT_DIR: "set" },
      );
      const normalized = result.replace(/\\\\/g, "/").replace(/\\/g, "/");

      expect(normalized).toContain(".qwen/hooks/filter-test-output.sh");
      expect(normalized).not.toContain(".claude/hooks/filter-test-output.sh");
    });
  });
});
