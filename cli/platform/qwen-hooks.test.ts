import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";
import { type HookVariant, installHooksFromVariant } from "./hooks-composer.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-qwen-hooks-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it("registers the shared primer lifecycle while preserving user hooks", () => {
  const variant = JSON.parse(
    readFileSync(join(repoRoot, ".agents/hooks/variants/qwen.json"), "utf8"),
  ) as HookVariant;
  mkdirSync(join(root, ".qwen"));
  const userHook = { hooks: [{ type: "command", command: "echo user-hook" }] };
  writeFileSync(
    join(root, ".qwen/settings.json"),
    JSON.stringify({ hooks: { SessionStart: [userHook] } }),
  );
  installHooksFromVariant(repoRoot, root, variant);
  installHooksFromVariant(repoRoot, root, variant);
  const settings = JSON.parse(
    readFileSync(join(root, ".qwen/settings.json"), "utf8"),
  );
  expect(settings.hooks.SessionStart).toContainEqual(userHook);
  expect(settings.hooks.SessionStart).toHaveLength(2);
  expect(settings.hooks.SubagentStart).toBeUndefined();
  expect(settings.hooks.PostToolUseFailure).toBeUndefined();
  const pre = new RegExp(settings.hooks.PreToolUse[0].matcher);
  const post = new RegExp(settings.hooks.PostToolUse[0].matcher);
  expect(pre.test("run_shell_command")).toBe(true);
  for (const name of ["grep_search", "glob"])
    expect(pre.test(name)).toBe(false);
  for (const name of ["edit", "write_file", "replace"])
    expect(post.test(name)).toBe(true);
  expect(post.test("mcp__serena__initial_instructions")).toBe(false);
});

it("does not drop rapid Qwen tool events in the shell wrapper", () => {
  const variant = JSON.parse(
    readFileSync(join(repoRoot, ".agents/hooks/variants/qwen.json"), "utf8"),
  ) as HookVariant;
  installHooksFromVariant(repoRoot, root, variant);
  const fakeOma = join(root, "fake-oma");
  writeFileSync(fakeOma, '#!/bin/sh\ncat >> "$QWEN_PROJECT_DIR/received"\n', {
    mode: 0o755,
  });
  const wrapper = join(root, ".qwen/hooks/oma-hook.sh");
  for (const agent_id of ["first", "second"]) {
    const result = spawnSync(
      "bash",
      [wrapper, "--vendor", "qwen", "--event", "PostToolUse"],
      {
        env: {
          ...process.env,
          OMA_BIN: fakeOma,
          QWEN_PROJECT_DIR: root,
          OMA_SESSION_ID: root.split("/").pop(),
        },
        input: `${JSON.stringify({
          agent_id,
          tool_name: "edit",
        })}\n`,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
  }
  expect(
    readFileSync(join(root, "received"), "utf8").trim().split("\n"),
  ).toHaveLength(2);
});

it("removes retired Qwen registrations while preserving user event hooks", () => {
  const variant = JSON.parse(
    readFileSync(join(repoRoot, ".agents/hooks/variants/qwen.json"), "utf8"),
  ) as HookVariant;
  const userHook = { hooks: [{ type: "command", command: "echo user-hook" }] };
  const retiredHook = {
    hooks: [
      {
        type: "command",
        command: '"$QWEN_PROJECT_DIR/.qwen/hooks/oma-hook.sh" --vendor qwen',
      },
    ],
  };
  mkdirSync(join(root, ".qwen"));
  writeFileSync(
    join(root, ".qwen/settings.json"),
    JSON.stringify({
      hooks: {
        SubagentStart: [retiredHook, userHook],
        PostToolUseFailure: [retiredHook],
      },
    }),
  );
  installHooksFromVariant(repoRoot, root, variant);
  const settings = JSON.parse(
    readFileSync(join(root, ".qwen/settings.json"), "utf8"),
  );
  expect(settings.hooks.SubagentStart).toEqual([userHook]);
  expect(settings.hooks.PostToolUseFailure).toBeUndefined();
});

it("executes generated Qwen hooks through the source CLI without a build", () => {
  const variant = JSON.parse(
    readFileSync(join(repoRoot, ".agents/hooks/variants/qwen.json"), "utf8"),
  ) as HookVariant;
  installHooksFromVariant(repoRoot, root, variant);
  mkdirSync(join(root, ".agents"));
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    "language: en\nmodel_preset: auto\nproviders:\n  code_intelligence: serena\n  semantic_memory: none\n",
  );
  const sourceOma = join(root, "source-oma");
  writeFileSync(
    sourceOma,
    '#!/bin/sh\nexec bun "$OMA_QWEN_SOURCE_CLI" "$@"\n',
    { mode: 0o755 },
  );
  const invoke = (event: string, payload: Record<string, unknown>) => {
    const result = spawnSync(
      "bash",
      [
        join(root, ".qwen/hooks/oma-hook.sh"),
        "--vendor",
        "qwen",
        "--event",
        event,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          OMA_BIN: sourceOma,
          OMA_QWEN_SOURCE_CLI: join(repoRoot, "cli/cli.ts"),
          QWEN_PROJECT_DIR: root,
          OMA_NO_AGENTMEMORY: "1",
          OMA_SKIP_VERSION_CHECK: "1",
        },
        input: JSON.stringify({
          cwd: root,
          session_id: "source-smoke",
          ...payload,
        }),
        encoding: "utf8",
        timeout: 15000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("dispatch error");
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  };
  expect(
    invoke("SessionStart", { source: "startup" }).hookSpecificOutput
      .additionalContext,
  ).toContain("[OMA SERENA PRIMER]");
  expect(
    invoke("UserPromptSubmit", { prompt: "Inspect the code" })
      .hookSpecificOutput?.additionalContext ?? "",
  ).not.toContain("[OMA SERENA PRIMER]");
  expect(
    invoke("SessionStart", { source: "compact" }).hookSpecificOutput
      .additionalContext,
  ).toContain("[OMA SERENA PRIMER]");
  expect(
    invoke("PreToolUse", {
      tool_name: "grep_search",
      tool_input: { pattern: "AuthService" },
    }),
  ).toEqual({});
});
