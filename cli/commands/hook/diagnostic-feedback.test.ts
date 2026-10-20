import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DiagnosticProvider,
  FileDiagnostic,
} from "../../io/serena-diagnostics.js";
import {
  addedDiagnostics,
  diagnosticFeedbackOptions,
  runDiagnosticFeedback,
} from "./diagnostic-feedback.js";
import { resolveHookConfig } from "./hook-config.js";
import type { HandlerCtx, HookInput } from "./types.js";

const old: FileDiagnostic = {
  severity: "Error",
  message: "Existing error",
  line: 1,
  column: 1,
};
const added: FileDiagnostic = {
  severity: "Warning",
  message: "New warning",
  line: 8,
  column: 2,
  code: "W1",
};

describe("after-edit diagnostic feedback", () => {
  let root: string;
  let ctx: HandlerCtx;
  let provider: DiagnosticProvider;
  let read: ReturnType<typeof vi.fn<DiagnosticProvider["read"]>>;
  const toolInput = {
    file_path: "sample.ts",
    old_string: "before",
    new_string: "after",
  };
  function input(kind: "pre_tool" | "post_tool", args = toolInput): HookInput {
    return { kind, toolName: "Edit", toolInput: args, cwd: root };
  }
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-diagnostic-feedback-"));
    mkdirSync(join(root, ".agents"));
    writeFileSync(join(root, "sample.ts"), "before\n");
    ctx = {
      vendor: "codex",
      cwd: root,
      sid: "session",
      config: { providers: { code_intelligence: "serena" } },
    };
    read = vi.fn<DiagnosticProvider["read"]>().mockResolvedValue([old]);
    provider = { identity: "provider-1", read };
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    rmSync(root, { recursive: true, force: true });
  });

  it("reports only the added diagnostics and consumes the paired baseline once", async () => {
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "after\n");
    read.mockResolvedValue([{ ...old, line: 7 }, added]);
    const result = await runDiagnosticFeedback(
      input("post_tool"),
      ctx,
      () => provider,
    );
    expect(result?.type === "context" && result.additionalContext).toContain(
      "sample.ts:8:2: Warning W1: New warning",
    );
    expect(
      result?.type === "context" && result.additionalContext,
    ).not.toContain("Existing error");
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not call first-seen or unchanged diagnostics new", async () => {
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    expect(read).not.toHaveBeenCalled();
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("keeps sessions and tool operations separate", async () => {
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "after\n");
    expect(
      await runDiagnosticFeedback(
        input("post_tool"),
        { ...ctx, sid: "other" },
        () => provider,
      ),
    ).toBeNull();
    expect(
      await runDiagnosticFeedback(
        input("post_tool", { ...toolInput, new_string: "different" }),
        ctx,
        () => provider,
      ),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("rejects stale baselines and a restarted provider", async () => {
    vi.useFakeTimers();
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "after\n");
    vi.setSystemTime(Date.now() + 121_000);
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "third\n");
    provider.identity = "restarted";
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("cools down failures and never treats a failed baseline as clean", async () => {
    read.mockRejectedValueOnce(new Error("unsupported language"));
    expect(
      await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider),
    ).toBeNull();
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "after\n");
    await runDiagnosticFeedback(input("post_tool"), ctx, () => provider);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("cancels a slow provider within the configured total budget", async () => {
    ctx.config = { ...ctx.config, diagnostic_feedback: { timeout_ms: 100 } };
    read.mockImplementation(
      (_path: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("timed out")),
            { once: true },
          );
        }),
    );
    const started = Date.now();
    expect(
      await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider),
    ).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("skips files that change during analysis", async () => {
    read.mockImplementation(async () => {
      writeFileSync(join(root, "sample.ts"), "concurrent edit");
      return [];
    });
    await runDiagnosticFeedback(input("pre_tool"), ctx, () => provider);
    writeFileSync(join(root, "sample.ts"), "after\n");
    expect(
      await runDiagnosticFeedback(input("post_tool"), ctx, () => provider),
    ).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("handles a new file from a known empty pre-edit baseline", async () => {
    const args = { ...toolInput, file_path: "new.ts" };
    await runDiagnosticFeedback(input("pre_tool", args), ctx, () => provider);
    expect(read).not.toHaveBeenCalled();
    writeFileSync(join(root, "new.ts"), "new file");
    read.mockResolvedValue([added]);
    const result = await runDiagnosticFeedback(
      input("post_tool", args),
      ctx,
      () => provider,
    );
    expect(result?.type === "context" && result.additionalContext).toContain(
      "new.ts:8:2",
    );
  });

  it("rejects paths outside the project including symlinks", async () => {
    symlinkSync(tmpdir(), join(root, "outside"));
    for (const path of [
      "../outside.ts",
      "outside/no-such-file.ts",
      "node_modules/example.ts",
      "notes.md",
    ]) {
      await runDiagnosticFeedback(
        input("pre_tool", { ...toolInput, file_path: path }),
        ctx,
        () => provider,
      );
    }
    expect(read).not.toHaveBeenCalled();
  });

  it("skips host diagnostics, disabled config, other providers and Serena's own edits", async () => {
    for (const config of [
      {
        providers: { code_intelligence: "serena" },
        diagnostic_feedback: { enabled: false },
      },
      {
        providers: { code_intelligence: "serena" },
        diagnostic_feedback: { host_diagnostics: true },
      },
      { providers: { code_intelligence: "gortex" } },
    ])
      await runDiagnosticFeedback(
        input("pre_tool"),
        { ...ctx, config },
        () => provider,
      );
    await runDiagnosticFeedback(
      input("pre_tool"),
      { ...ctx, vendor: "cursor" },
      () => provider,
    );
    await runDiagnosticFeedback(
      {
        ...input("pre_tool"),
        toolName: "mcp__serena__replace_symbol_body",
      } as HookInput,
      ctx,
      () => provider,
    );
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { diagnostic_feedback: { enabled: true } },
    { providers: { web: "native" } },
    { providers: { semantic_memory: "none" } },
  ])("uses the effective default Serena provider for %j", async (config) => {
    await runDiagnosticFeedback(
      input("pre_tool"),
      { ...ctx, config },
      () => provider,
    );
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([
    { code_intelligence: "gortex" },
    { code_intelligence: "none" },
    { code_intelligence: "typo" },
    { code_intelligence: null },
    null,
    "serena",
  ])(
    "does not enable an explicit unsupported or invalid provider %j",
    async (providers) => {
      await runDiagnosticFeedback(
        input("pre_tool"),
        {
          ...ctx,
          config: { providers, diagnostic_feedback: { enabled: true } },
        },
        () => provider,
      );
      expect(read).not.toHaveBeenCalled();
    },
  );

  it("respects local config overrides and environment limits", () => {
    vi.stubEnv("OMA_HOME", join(root, "empty-global"));
    writeFileSync(
      join(root, ".agents/oma-config.yaml"),
      "providers:\n  code_intelligence: serena\ndiagnostic_feedback:\n  enabled: true\n",
    );
    writeFileSync(
      join(root, ".agents/oma-config.local.yaml"),
      "diagnostic_feedback:\n  enabled: false\n  timeout_ms: 500\n",
    );
    const local = { ...ctx, config: resolveHookConfig(root).config };
    expect(diagnosticFeedbackOptions(local)).toEqual({
      enabled: false,
      timeoutMs: 500,
    });
    expect(
      diagnosticFeedbackOptions(local, {
        OMA_DIAGNOSTIC_FEEDBACK: "true",
        OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS: "99999",
      }),
    ).toEqual({ enabled: true, timeoutMs: 10_000 });
  });

  it("counts extra occurrences but ignores line shifts", () => {
    expect(
      addedDiagnostics(
        [old],
        [
          { ...old, line: 9 },
          { ...old, line: 10 },
        ],
      ),
    ).toEqual([{ ...old, line: 10 }]);
  });

  it("bounds multi-file edits and truncates diagnostic output", async () => {
    const paths = ["one.ts", "two.ts", "three.ts", "four.ts"];
    for (const path of paths) writeFileSync(join(root, path), "before");
    const patch = paths
      .map((path) => `*** Update File: ${path}\n@@\n-before\n+after`)
      .join("\n");
    const edit = (kind: "pre_tool" | "post_tool"): HookInput => ({
      kind,
      toolName: "apply_patch",
      toolInput: { patch },
      cwd: root,
    });
    read.mockResolvedValue([]);
    await runDiagnosticFeedback(edit("pre_tool"), ctx, () => provider);
    expect(read.mock.calls.map(([path]) => path)).toEqual(paths.slice(0, 3));
    for (const path of paths) writeFileSync(join(root, path), "after");
    read.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        ...added,
        message: `Warning ${index}`,
      })),
    );
    const result = await runDiagnosticFeedback(
      edit("post_tool"),
      ctx,
      () => provider,
    );
    expect(read).toHaveBeenCalledTimes(6);
    if (result?.type !== "context")
      throw new Error("Expected diagnostic feedback");
    expect(result.additionalContext.match(/: Warning W1:/g)).toHaveLength(8);
    expect(result.additionalContext).toContain("28 more diagnostic(s) omitted");
  });
});
