import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runHookDispatch } from "./dispatch.js";

describe("Qwen code intelligence lifecycle", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-qwen-primer-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: auto\nproviders:\n  code_intelligence: serena\n  semantic_memory: none\n",
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  async function fire(
    event: string,
    payload: Record<string, unknown> = {},
    sid = "qwen-session",
  ) {
    const result = await runHookDispatch({
      vendor: "qwen",
      nativeEvent: event,
      cwd: root,
      sid,
      rawStdin: JSON.stringify({ cwd: root, session_id: sid, ...payload }),
    });
    return result.output ? JSON.parse(result.output) : {};
  }
  const search = {
    tool_name: "grep_search",
    tool_input: { pattern: "AuthService", include: "**/*.ts" },
  };

  it.each(["startup", "resume", "clear", "compact"])(
    "injects context on SessionStart %s even after prompt priming",
    async (source) => {
      await fire("UserPromptSubmit", { prompt: "Inspect the code" });
      const output = await fire("SessionStart", { source });
      expect(output.hookSpecificOutput).toMatchObject({
        hookEventName: "SessionStart",
      });
      expect(output.hookSpecificOutput.additionalContext).toContain(
        "initial_instructions",
      );
      expect(output.hookSpecificOutput.additionalContext).toContain(
        "tool_search",
      );
    },
  );

  it("primes each child independently of the parent and siblings", async () => {
    await fire("UserPromptSubmit", { prompt: "Inspect the code" });
    for (const agent_id of ["child-a", "child-b"]) {
      const output = await fire("SubagentStart", {
        agent_id,
        agent_type: "backend-engineer",
      });
      expect(output.hookSpecificOutput.hookEventName).toBe("SubagentStart");
      expect(output.hookSpecificOutput.additionalContext).toContain("Serena");
    }
  });

  it("redirects the first native code search once without asking for approval", async () => {
    const output = await fire("PreToolUse", search);
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
      "initial_instructions",
    );
    expect(await fire("PreToolUse", search)).toEqual({});
  });

  it("does not redirect ordinary commands, documentation reads or documentation searches", async () => {
    for (const payload of [
      {
        tool_name: "run_shell_command",
        tool_input: { command: "git status --short" },
      },
      { tool_name: "read_file", tool_input: { path: "AGENTS.md" } },
      {
        tool_name: "grep_search",
        tool_input: { pattern: "Qwen", include: "**/*.md" },
      },
    ])
      expect(await fire("PreToolUse", payload)).toEqual({});
  });

  it("recognizes shell code search but does not auto-approve shell commands", async () => {
    const payload = {
      tool_name: "run_shell_command",
      tool_input: { command: "rg AuthService src" },
    };
    expect(
      (await fire("PreToolUse", payload)).hookSpecificOutput.permissionDecision,
    ).toBe("deny");
    expect(await fire("PreToolUse", payload)).toEqual({});
  });

  it("stops redirecting after a successful Serena call and isolates child state", async () => {
    await fire("PostToolUse", {
      tool_name: "mcp__serena__initial_instructions",
      tool_response: { content: [] },
    });
    expect(await fire("PreToolUse", search)).toEqual({});
    expect(
      (await fire("PreToolUse", { ...search, agent_id: "child" }))
        .hookSpecificOutput.permissionDecision,
    ).toBe("deny");
  });

  it.each(["PostToolUseFailure", "PostToolUse"])(
    "permits fallback after Serena failure via %s",
    async (event) => {
      const output = await fire(event, {
        tool_name: "mcp__serena__find_symbol",
        error: "request timed out",
        tool_response: { isError: true, content: [] },
      });
      expect(output.hookSpecificOutput.additionalContext).toContain(
        "Do not retry",
      );
      await fire("SessionStart", { source: "compact" });
      expect(await fire("PreToolUse", search)).toEqual({});
    },
  );

  it("does not let another MCP server satisfy Serena initialization", async () => {
    await fire("PostToolUse", {
      tool_name: "mcp__other__initial_instructions",
      tool_response: {},
    });
    expect(
      (await fire("PreToolUse", search)).hookSpecificOutput.permissionDecision,
    ).toBe("deny");
  });

  it("does not impose Serena on a different selected provider", async () => {
    const path = join(root, ".agents", "oma-config.yaml");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        "code_intelligence: serena",
        "code_intelligence: gortex",
      ),
    );
    expect(await fire("PreToolUse", search)).toEqual({});
    expect(
      (await fire("SessionStart", { source: "startup" })).hookSpecificOutput
        .additionalContext,
    ).toContain("Gortex");
  });

  it("never blocks repeatedly when no session identity is available", async () => {
    expect(await fire("PreToolUse", search, "")).toEqual({});
    expect(await fire("PreToolUse", search, "")).toEqual({});
  });

  it("fails open when its state cannot be persisted", async () => {
    mkdirSync(join(root, ".agents/state"));
    writeFileSync(
      join(root, ".agents/state/qwen-code-intelligence"),
      "not a directory",
    );
    expect(await fire("PreToolUse", search)).toEqual({});
  });
});
