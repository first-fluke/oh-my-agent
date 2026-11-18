import { describe, expect, it } from "vitest";
import { planDispatch } from "../runtime-dispatch.js";
import { resolveEditOnlyArgs, resolveRestrictionArgs } from "./edit-only.js";
import { buildExternalInvocation } from "./invocations/external.js";
import {
  buildAntigravityNativeInvocation,
  buildClaudeNativeInvocation,
  buildCodexNativeInvocation,
  buildCursorAgentPrintInvocation,
  buildKiroNativeInvocation,
} from "./invocations/native.js";

const prompt = "Translate the file in place.";
const editOnly = { editOnly: true };

/** Flags that approve every tool call; none may appear on an edit-only launch. */
const BLANKET = [
  "--yolo",
  "--force",
  "--auto",
  "--trust-all-tools",
  "--dangerously-skip-permissions",
  "--dangerously-bypass-approvals-and-sandbox",
];

describe("edit-only restriction", () => {
  it.each([
    [
      "claude",
      ["--disallowedTools", "Bash", "--permission-mode", "acceptEdits"],
    ],
    ["codex", ["--sandbox", "workspace-write"]],
    [
      "grok",
      [
        "--permission-mode",
        "acceptEdits",
        "--allow",
        "Edit",
        "--allow",
        "Write",
      ],
    ],
    ["antigravity", ["--mode", "accept-edits"]],
    ["qwen", ["--approval-mode", "auto-edit"]],
    ["kiro", ["--trust-tools=fs_read,fs_write"]],
    ["pi", ["--exclude-tools", "bash,powershell"]],
  ])("resolves the built-in mode for %s", (vendor, expected) => {
    expect(resolveEditOnlyArgs(vendor, {})).toEqual(expected);
  });

  // Regression: omitting cursor's `--force` left its shell tool approved, so
  // "no auto-approve flag" was never a restriction. A vendor without a
  // verified edit-only mode must refuse instead of launching unrestricted.
  it.each(["cursor", "opencode", "kilo", "kimi", "custom-cli"])(
    "refuses %s, which has no edit-only mode",
    (vendor) => {
      expect(() =>
        buildExternalInvocation(vendor, {}, null, prompt, undefined, editOnly),
      ).toThrow(/edit-only/i);
    },
  );

  it("uses a configured edit_only_flag for a vendor without a built-in mode", () => {
    const invocation = buildExternalInvocation(
      "cursor",
      { edit_only_flag: "--wrapper-edit-only" },
      null,
      prompt,
      undefined,
      editOnly,
    );
    expect(invocation.args).toContain("--wrapper-edit-only");
    expect(invocation.args).not.toContain("--yolo");
  });

  it.each(["", "   ", "''"])(
    "refuses an explicitly empty edit_only_flag: %j",
    (edit_only_flag) => {
      expect(() => resolveEditOnlyArgs("claude", { edit_only_flag })).toThrow(
        /edit-only/i,
      );
    },
  );

  it.each([
    "--yolo",
    "--dangerously-skip-permissions",
    "--permission-mode bypassPermissions",
    "--approval-mode=yolo",
    "--mode auto",
    "--sandbox danger-full-access",
    '-c sandbox_mode="danger-full-access"',
  ])("refuses a configured flag that approves every tool: %s", (flag) => {
    expect(() =>
      resolveEditOnlyArgs("claude", { edit_only_flag: flag }),
    ).toThrow(/edit-only/i);
  });

  it("refuses isolation flags that undo the restriction", () => {
    expect(() =>
      resolveEditOnlyArgs("claude", { isolation_flags: "--yolo" }),
    ).toThrow(/edit-only/i);
  });

  it("refuses read-only and edit-only together", () => {
    expect(() =>
      resolveRestrictionArgs("claude", {}, { readOnly: true, editOnly: true }),
    ).toThrow(/mutually exclusive/i);
  });

  it("returns null for an unrestricted launch", () => {
    expect(resolveRestrictionArgs("claude", {}, {})).toBeNull();
  });
});

describe("edit-only invocations", () => {
  it.each([
    ["claude", buildClaudeNativeInvocation],
    ["codex", buildCodexNativeInvocation],
    ["antigravity", buildAntigravityNativeInvocation],
    ["kiro", buildKiroNativeInvocation],
  ] as const)(
    "native %s carries the restriction and no blanket approval",
    (vendor, build) => {
      const { args } = build(
        "backend-engineer",
        prompt,
        // A configured auto-approve flag must not survive the restriction.
        { auto_approve_flag: "--dangerously-skip-permissions" },
        editOnly,
      );
      for (const arg of resolveEditOnlyArgs(vendor, {})) {
        expect(args).toContain(arg);
      }
      for (const flag of BLANKET) expect(args).not.toContain(flag);
    },
  );

  it("refuses native cursor instead of dropping --yolo silently", () => {
    expect(() =>
      buildCursorAgentPrintInvocation("backend-engineer", prompt, {}, editOnly),
    ).toThrow(/edit-only/i);
  });

  it.each(["claude", "codex", "grok", "antigravity", "qwen", "kiro", "pi"])(
    "external %s carries the restriction and no blanket approval",
    (vendor) => {
      const { args } = buildExternalInvocation(
        vendor,
        { auto_approve_flag: "--yolo" },
        vendor === "claude" ? "-p" : null,
        prompt,
        undefined,
        editOnly,
      );
      for (const arg of resolveEditOnlyArgs(vendor, {})) {
        expect(args).toContain(arg);
      }
      for (const flag of BLANKET) expect(args).not.toContain(flag);
    },
  );

  it("keeps a flag between claude's variadic deny rule and the prompt", () => {
    const { args } = buildExternalInvocation(
      "claude",
      {},
      null,
      prompt,
      undefined,
      editOnly,
    );
    expect(args[args.indexOf("--disallowedTools") + 2]).toMatch(/^--/);
    expect(args.at(-1)).toBe(prompt);
  });

  it("does not widen the codex sandbox with network or extra roots", () => {
    const { args } = buildCodexNativeInvocation(
      "backend-engineer",
      prompt,
      {},
      { editOnly: true, workspace: process.cwd() },
    );
    expect(args).not.toContain("--add-dir");
    expect(args.join(" ")).not.toContain("network_access");
  });
});

describe("planDispatch with an explicit model", () => {
  const env = { OMA_RUNTIME_VENDOR: "none" } as NodeJS.ProcessEnv;

  it.each([
    ["claude", "--model"],
    ["codex", "-m"],
    ["grok", "-m"],
    ["qwen", "-m"],
    ["kiro", "--model"],
    ["cursor", "--model"],
    ["opencode", "-m"],
    ["antigravity", "--model"],
  ])("passes the model verbatim to %s", (vendor, flag) => {
    const { invocation } = planDispatch(
      "backend-engineer",
      vendor,
      {},
      null,
      prompt,
      env,
      { model: "vendor-model-x" },
    );
    const index = invocation.args.indexOf(flag);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(invocation.args[index + 1]).toBe("vendor-model-x");
    expect(
      invocation.args.filter((arg) => arg === "vendor-model-x"),
    ).toHaveLength(1);
  });

  it("replaces a configured default model instead of adding a second flag", () => {
    const { invocation } = planDispatch(
      "backend-engineer",
      "grok",
      { model_flag: "--model", default_model: "configured" },
      null,
      prompt,
      env,
      { model: "requested" },
    );
    expect(invocation.args).toContain("requested");
    expect(invocation.args).not.toContain("configured");
  });

  it("refuses a blank model and an unknown vendor without a model flag", () => {
    expect(() =>
      planDispatch("backend-engineer", "grok", {}, null, prompt, env, {
        model: "  ",
      }),
    ).toThrow(/empty/i);
    expect(() =>
      planDispatch("backend-engineer", "custom-cli", {}, null, prompt, env, {
        model: "requested",
      }),
    ).toThrow(/model flag/i);
  });

  it("combines edit-only with an explicit model", () => {
    const { invocation } = planDispatch(
      "backend-engineer",
      "grok",
      {},
      null,
      prompt,
      env,
      { editOnly: true, model: "requested" },
    );
    expect(invocation.args).toEqual(
      expect.arrayContaining(["acceptEdits", "-m", "requested"]),
    );
    expect(invocation.args).not.toContain("--yolo");
  });
});
