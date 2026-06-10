/**
 * Golden test suite for oma hook — Task 9 of plan 014.
 *
 * 1. Per-vendor x event dialect golden (unit-level, fast):
 *    For each of the 8 hook-model vendors, assert the dialect render of each
 *    HandlerResult variant matches the vendor's expected envelope shape.
 *    Uses hook-output.ts as the oracle.
 *
 * 2. Task-3b regression (deterministic strong-positive e2e):
 *    Copies .agents/hooks into a fresh temp dir (so keyword-detector has clean
 *    state) and asserts that running the bundled cli.js with
 *    prompt:"orchestrate this" produces [OMA WORKFLOW: ORCHESTRATE] in a valid
 *    Claude dialect envelope — proving bundled triggers.json resolves via
 *    projectDir (the Task-3b fix).
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  makeBlockOutput,
  makePreToolOutput,
  makePromptOutput,
} from "../../.agents/hooks/core/hook-output.ts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const REPO_ROOT = join(__dirname, "..", "..");
const CLI_BIN = join(REPO_ROOT, "cli", "bin", "cli.js");
const NODE = process.execPath;

// ---------------------------------------------------------------------------
// Part 1 — Per-vendor dialect golden (unit-level)
// ---------------------------------------------------------------------------

describe("hook-output golden — makePromptOutput (context/prompt)", () => {
  const ctx = "workflow context text";

  it("claude -> {additionalContext, hookSpecificOutput.additionalContext}", () => {
    // Official Claude Code contract is hookSpecificOutput.additionalContext
    // (code.claude.com/docs/en/hooks); the top-level field is kept for
    // back-compat with older builds.
    const out = JSON.parse(makePromptOutput("claude", ctx)) as Record<
      string,
      unknown
    >;
    expect(out.additionalContext).toBe(ctx);
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("UserPromptSubmit");
    expect(hso.additionalContext).toBe(ctx);
  });

  it("codex -> {hookSpecificOutput:{hookEventName,additionalContext}}", () => {
    const out = JSON.parse(makePromptOutput("codex", ctx)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("UserPromptSubmit");
    expect(hso.additionalContext).toBe(ctx);
    // codex must NOT expose additionalContext at root level
    expect(out.additionalContext).toBeUndefined();
  });

  it("gemini -> {hookSpecificOutput:{hookEventName:'BeforeAgent',additionalContext}}", () => {
    const out = JSON.parse(makePromptOutput("gemini", ctx)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("BeforeAgent");
    expect(hso.additionalContext).toBe(ctx);
  });

  it("qwen -> {hookSpecificOutput:{hookEventName:'UserPromptSubmit',additionalContext}}", () => {
    const out = JSON.parse(makePromptOutput("qwen", ctx)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("UserPromptSubmit");
    expect(hso.additionalContext).toBe(ctx);
  });

  it("cursor -> {additionalContext, additional_context, hookSpecificOutput}", () => {
    const out = JSON.parse(makePromptOutput("cursor", ctx)) as Record<
      string,
      unknown
    >;
    expect(out.additionalContext).toBe(ctx);
    expect(out.additional_context).toBe(ctx);
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("UserPromptSubmit");
    expect(hso.additionalContext).toBe(ctx);
  });

  it("grok -> {additionalContext}", () => {
    const out = JSON.parse(makePromptOutput("grok", ctx)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ additionalContext: ctx });
  });

  it("kiro -> plain string (not a JSON object envelope)", () => {
    const out = makePromptOutput("kiro", ctx);
    // kiro receives raw plain-text stdout — must equal the context string exactly
    expect(out).toBe(ctx);
  });

  it("antigravity -> {injectSteps:[{ephemeralMessage}]}", () => {
    const out = JSON.parse(makePromptOutput("antigravity", ctx)) as Record<
      string,
      unknown
    >;
    const steps = out.injectSteps as Array<Record<string, unknown>>;
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]?.ephemeralMessage).toBe(ctx);
  });
});

describe("hook-output golden — makeBlockOutput (stop/block)", () => {
  const reason = "persistent mode active";

  it("claude -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("claude", reason)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ decision: "block", reason });
  });

  it("codex -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("codex", reason)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ decision: "block", reason });
  });

  it("gemini -> {decision:'deny',reason}", () => {
    const out = JSON.parse(makeBlockOutput("gemini", reason)) as Record<
      string,
      unknown
    >;
    expect(out.decision).toBe("deny");
    expect(out.reason).toBe(reason);
  });

  it("qwen -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("qwen", reason)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ decision: "block", reason });
  });

  it("cursor -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("cursor", reason)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ decision: "block", reason });
  });

  it("grok -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("grok", reason)) as Record<
      string,
      unknown
    >;
    expect(out.decision).toBe("block");
    expect(out.reason).toBe(reason);
  });

  it("kiro -> {decision:'block',reason}", () => {
    const out = JSON.parse(makeBlockOutput("kiro", reason)) as Record<
      string,
      unknown
    >;
    expect(out).toStrictEqual({ decision: "block", reason });
  });

  it("antigravity -> {decision:'continue',reason} (re-enter loop = block the stop)", () => {
    const out = JSON.parse(makeBlockOutput("antigravity", reason)) as Record<
      string,
      unknown
    >;
    expect(out.decision).toBe("continue");
    expect(out.reason).toBe(reason);
  });
});

describe("hook-output golden — makePreToolOutput (pre_tool/mutate)", () => {
  const updatedInput = { command: "echo safe", timeout: 30 };

  it("claude -> {hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput}}", () => {
    const out = JSON.parse(makePreToolOutput("claude", updatedInput)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("PreToolUse");
    expect(hso.updatedInput).toStrictEqual(updatedInput);
  });

  it("codex -> {hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput}}", () => {
    const out = JSON.parse(makePreToolOutput("codex", updatedInput)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("PreToolUse");
    expect(hso.updatedInput).toStrictEqual(updatedInput);
  });

  it("gemini -> {hookSpecificOutput:{hookEventName:'BeforeTool',tool_input}}", () => {
    // Official BeforeTool rewrite contract: hookSpecificOutput.tool_input
    // merges with and overrides the model's arguments; there is no
    // "rewrite" decision value (geminicli.com/docs/hooks/reference).
    const out = JSON.parse(makePreToolOutput("gemini", updatedInput)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("BeforeTool");
    expect(hso.tool_input).toStrictEqual(updatedInput);
    expect(out.decision).toBeUndefined();
  });

  it("qwen -> {hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput}}", () => {
    const out = JSON.parse(makePreToolOutput("qwen", updatedInput)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("PreToolUse");
    expect(hso.updatedInput).toStrictEqual(updatedInput);
  });

  it("cursor -> {updated_input, hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput}}", () => {
    const out = JSON.parse(makePreToolOutput("cursor", updatedInput)) as Record<
      string,
      unknown
    >;
    expect(out.updated_input).toStrictEqual(updatedInput);
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("PreToolUse");
    expect(hso.updatedInput).toStrictEqual(updatedInput);
  });

  it("grok -> {decision:'allow',toolInput}", () => {
    const out = JSON.parse(makePreToolOutput("grok", updatedInput)) as Record<
      string,
      unknown
    >;
    expect(out.decision).toBe("allow");
    expect(out.toolInput).toStrictEqual(updatedInput);
  });

  it("kiro -> {hookSpecificOutput:{hookEventName:'PreToolUse',updatedInput}}", () => {
    const out = JSON.parse(makePreToolOutput("kiro", updatedInput)) as Record<
      string,
      unknown
    >;
    const hso = out.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe("PreToolUse");
    expect(hso.updatedInput).toStrictEqual(updatedInput);
  });

  it("antigravity -> {decision:'allow'} (gate-only; updatedInput must not appear)", () => {
    const out = JSON.parse(
      makePreToolOutput("antigravity", updatedInput),
    ) as Record<string, unknown>;
    expect(out.decision).toBe("allow");
    // antigravity cannot rewrite tool input
    expect(out.tool_input).toBeUndefined();
    expect(out.updatedInput).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Part 2 — Task-3b regression (deterministic strong-positive e2e)
//
// Copies .agents/hooks into a fresh temp dir so keyword-detector starts with
// clean state (no reinforcement suppression) and reliably fires for the
// "orchestrate" keyword. The bundled cli.js resolves triggers.json via
// ctx.cwd (projectDir) because inside the bundle import.meta.dirname points
// to cli/bin/, not .agents/hooks/core/ — that is the Task-3b fix being
// verified here.
// ---------------------------------------------------------------------------

describe("Task-3b regression — bundled triggers.json resolves via projectDir (e2e)", () => {
  let tmpRoot: string;

  beforeAll(() => {
    // 1. Create an isolated temp project root
    tmpRoot = mkdtempSync(join(tmpdir(), "oma-hook-golden-3b-"));

    // 2. Git marker so resolveGitRoot pins here (not the real repo root)
    mkdirSync(join(tmpRoot, ".git"), { recursive: true });

    // 3. Copy .agents/hooks (variant JSONs + core with triggers.json) into tmpRoot
    const srcHooks = join(REPO_ROOT, ".agents", "hooks");
    const dstHooks = join(tmpRoot, ".agents", "hooks");
    mkdirSync(join(tmpRoot, ".agents"), { recursive: true });
    cpSync(srcHooks, dstHooks, { recursive: true });

    // 4. Ensure the CLI bundle exists; build once if missing
    if (!existsSync(CLI_BIN)) {
      const buildResult = spawnSync("bun", ["run", "build"], {
        cwd: join(REPO_ROOT, "cli"),
        encoding: "utf-8",
        timeout: 120_000,
      });
      if (buildResult.status !== 0) {
        throw new Error(
          `bun run build failed:\nstdout: ${buildResult.stdout}\nstderr: ${buildResult.stderr}`,
        );
      }
    }
  });

  afterAll(() => {
    if (tmpRoot) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("orchestrate keyword -> [OMA WORKFLOW: ORCHESTRATE] in Claude dialect (bundled triggers.json via projectDir)", () => {
    const payload = JSON.stringify({
      prompt: "orchestrate this",
      cwd: tmpRoot,
    });

    const result = spawnSync(
      NODE,
      [CLI_BIN, "hook", "--vendor", "claude", "--event", "UserPromptSubmit"],
      {
        input: payload,
        encoding: "utf-8",
        cwd: tmpRoot,
        timeout: 20_000,
      },
    );

    // fail-open guarantee
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);

    // stdout must be non-empty — fresh state guarantees keyword fires
    const out = result.stdout.trim();
    expect(
      out.length,
      `stdout was empty. triggers.json was NOT resolved via projectDir. stderr: ${result.stderr}`,
    ).toBeGreaterThan(0);

    // must be valid JSON (Claude dialect)
    let parsed: Record<string, unknown> = {};
    expect(
      () => {
        parsed = JSON.parse(out) as Record<string, unknown>;
      },
      `stdout must be valid JSON; got: ${out.slice(0, 300)}`,
    ).not.toThrow();

    // Claude dialect: top-level {additionalContext: string}
    expect(
      typeof parsed.additionalContext,
      "expected Claude dialect {additionalContext: string}",
    ).toBe("string");

    // Task-3b core assertion: bundled triggers.json resolved correctly
    const context = parsed.additionalContext as string;
    expect(
      context,
      `expected [OMA WORKFLOW: ORCHESTRATE] in context. triggers.json NOT resolved via projectDir. Got: ${context.slice(0, 400)}`,
    ).toContain("[OMA WORKFLOW: ORCHESTRATE]");
  }, 20_000);
});
