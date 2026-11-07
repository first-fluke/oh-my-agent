import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeInput } from "./adapters.js";
import { renderCopilotHookResult } from "./copilot.js";
import { runHookDispatch } from "./dispatch.js";

const roots: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const path of roots.splice(0))
    rmSync(path, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-copilot-dispatch-"));
  roots.push(root);
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, ".agents"));
  mkdirSync(join(root, ".serena"));
  writeFileSync(
    join(root, ".serena/project.yml"),
    "project_name: copilot-test\n",
  );
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    "providers:\n  code_intelligence: serena\n  semantic_memory: none\n",
  );
  return root;
}

describe("Copilot hook compatibility", () => {
  it("uses the invoked global Copilot wrapper directory for filter mutations", () => {
    vi.stubEnv(
      "OMA_HOOK_WRAPPER",
      "/home/test user/.copilot/hooks/oma-hook.sh",
    );
    const result = JSON.parse(
      renderCopilotHookResult(
        {
          type: "mutate",
          updatedInput: {
            command:
              'set -o pipefail; (\nvitest\n) 2>&1 | bash "/home/test user/.claude/hooks/oma/filter-test-output.sh"',
          },
        },
        "pre_tool",
        "PreToolUse",
      ),
    );
    // The wrapper directory is resolved, which adds a drive letter on Windows.
    const hookDir = resolve("/home/test user/.copilot/hooks");
    expect(result.modifiedArgs.command).toBe(
      `set -o pipefail; (\nvitest\n) 2>&1 | bash '${hookDir}/oma/filter-test-output.sh'`,
    );
    expect(result.modifiedArgs.command).not.toContain(".github");
    expect(result.modifiedArgs.command).not.toContain(".claude");
  });

  it("dispatches installed core handlers and renders Copilot session context", async () => {
    const root = project();
    const response = await runHookDispatch({
      vendor: "copilot",
      nativeEvent: "SessionStart",
      cwd: root,
      sid: "copilot-test",
      rawStdin: JSON.stringify({
        cwd: root,
        session_id: "copilot-test",
        source: "startup",
      }),
    });
    expect(JSON.parse(response.output)).toEqual({
      additionalContext: expect.stringContaining("[OMA SERENA PRIMER]"),
    });
  });

  it("dispatches a provider guard denial in Copilot's permission dialect", async () => {
    const root = project();
    const response = await runHookDispatch({
      vendor: "copilot",
      nativeEvent: "PreToolUse",
      cwd: root,
      sid: "copilot-test",
      rawStdin: JSON.stringify({
        cwd: root,
        tool_name: "Grep",
        tool_input: { pattern: "secret", path: root },
      }),
    });
    expect(JSON.parse(response.output)).toEqual({
      permissionDecision: "deny",
      permissionDecisionReason: expect.stringContaining("Serena"),
    });
  });

  it("normalizes both native toolArgs JSON and PascalCase compatibility payloads", () => {
    const native = normalizeInput(
      "copilot",
      "preToolUse",
      JSON.stringify({
        cwd: "/workspace",
        toolName: "bash",
        toolArgs: JSON.stringify({ command: "git status" }),
      }),
    );
    const compatible = normalizeInput(
      "copilot",
      "PreToolUse",
      JSON.stringify({
        cwd: "/workspace",
        tool_name: "Bash",
        tool_input: { command: "git status" },
      }),
    );
    expect(native).toEqual(compatible);
    expect(native).toEqual({
      kind: "pre_tool",
      cwd: "/workspace",
      toolName: "Bash",
      toolInput: { command: "git status" },
    });
  });

  it("normalizes file paths and rejects malformed tool arguments", () => {
    expect(
      normalizeInput(
        "copilot",
        "postToolUse",
        JSON.stringify({ toolName: "edit", toolArgs: { path: "src/a.ts" } }),
      ),
    ).toMatchObject({
      kind: "post_tool",
      toolName: "Edit",
      toolInput: { file_path: "src/a.ts", path: "src/a.ts" },
    });
    expect(
      normalizeInput(
        "copilot",
        "preToolUse",
        JSON.stringify({ toolName: "bash", toolArgs: "{" }),
      ),
    ).toMatchObject({ toolInput: {} });
  });

  it("emits top-level permission and mutation fields without Claude envelopes", () => {
    expect(
      JSON.parse(
        renderCopilotHookResult(
          { type: "block", reason: "protected command" },
          "pre_tool",
          "PreToolUse",
        ),
      ),
    ).toEqual({
      permissionDecision: "deny",
      permissionDecisionReason: "protected command",
    });
    expect(
      JSON.parse(
        renderCopilotHookResult(
          {
            type: "mutate",
            updatedInput: {
              command: "sh .claude/hooks/oma/filter-test-output.sh test",
            },
          },
          "pre_tool",
          "PreToolUse",
        ),
      ),
    ).toEqual({
      modifiedArgs: {
        command: "sh .github/hooks/oma/filter-test-output.sh test",
      },
    });
  });

  it("injects session and post-tool context and keeps prompt-submit output empty", () => {
    const context = {
      type: "context",
      additionalContext: "project context",
    } as const;
    expect(
      JSON.parse(renderCopilotHookResult(context, "prompt", "SessionStart")),
    ).toEqual({ additionalContext: "project context" });
    expect(
      JSON.parse(renderCopilotHookResult(context, "post_tool", "PostToolUse")),
    ).toEqual({ additionalContext: "project context" });
    expect(renderCopilotHookResult(context, "prompt", "UserPromptSubmit")).toBe(
      "",
    );
    expect(
      JSON.parse(
        renderCopilotHookResult(
          { type: "block", reason: "work remains" },
          "stop",
          "Stop",
        ),
      ),
    ).toEqual({ decision: "block", reason: "work remains" });
  });
});
