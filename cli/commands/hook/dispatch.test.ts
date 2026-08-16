/**
 * Tests for hook router + chain merge — design 019, Task 3.
 *
 * Uses fake in-memory handlers (not real handler side effects) to isolate
 * the router's merge-rule and timeout/isolation logic.
 */

import { describe, expect, it, vi } from "vitest";
import { nativeEventToKind } from "./adapters.js";
import type { HandlerCtx, HandlerResult, HookInput } from "./types.js";

// ---------------------------------------------------------------------------
// Test helpers — fake handler builders
// ---------------------------------------------------------------------------

type RunFn = (
  input: HookInput,
  ctx: HandlerCtx,
) => Promise<HandlerResult | null>;

function makeContextHandler(text: string, delayMs = 0): RunFn {
  return async (_input, _ctx) => {
    if (delayMs > 0) await sleep(delayMs);
    return { type: "context", additionalContext: text };
  };
}

function makeMutateHandler(
  updatedInput: Record<string, unknown>,
  delayMs = 0,
): RunFn {
  return async (_input, _ctx) => {
    if (delayMs > 0) await sleep(delayMs);
    return { type: "mutate", updatedInput };
  };
}

function makeBlockHandler(reason: string, delayMs = 0): RunFn {
  return async (_input, _ctx) => {
    if (delayMs > 0) await sleep(delayMs);
    return { type: "block", reason };
  };
}

function makeNullHandler(delayMs = 0): RunFn {
  return async (_input, _ctx) => {
    if (delayMs > 0) await sleep(delayMs);
    return null;
  };
}

function makeThrowingHandler(message: string): RunFn {
  return async (_input, _ctx) => {
    throw new Error(message);
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Import runChain from dispatch (the unit under test)
// ---------------------------------------------------------------------------

// We import runChain directly so we can feed it fake handlers without
// depending on variant JSON files or real handler side effects.
const { runChain } = await import("./dispatch.js");

// Minimal ctx used across all tests
const ctx: HandlerCtx = { vendor: "claude", cwd: "/tmp/test", sid: "test-sid" };

// ---------------------------------------------------------------------------
// Shared ResolvedHandler adapter — wraps a RunFn into the internal shape
// runChain expects. Since ResolvedHandler is not exported we replicate the
// inline shape (id, run, timeoutMs) which matches the internal interface.
// ---------------------------------------------------------------------------

function h(
  id: string,
  run: RunFn,
  timeoutMs = 5_000,
): { id: string; run: RunFn; timeoutMs: number } {
  return { id, run, timeoutMs };
}

// ---------------------------------------------------------------------------
// prompt merge — concat order
// ---------------------------------------------------------------------------

describe("runChain — prompt: concat additionalContext in order", () => {
  const input: HookInput = { kind: "prompt", prompt: "hello", cwd: "/tmp" };

  it("returns null when no handlers produce context", async () => {
    const result = await runChain([h("a", makeNullHandler())], input, ctx);
    expect(result).toBeNull();
  });

  it("returns single context as-is", async () => {
    const result = await runChain(
      [h("a", makeContextHandler("first"))],
      input,
      ctx,
    );
    expect(result?.type).toBe("context");
    if (result?.type === "context")
      expect(result.additionalContext).toBe("first");
  });

  it("concatenates multiple context results in order with \\n\\n", async () => {
    const result = await runChain(
      [
        h("a", makeContextHandler("first")),
        h("b", makeContextHandler("second")),
        h("c", makeContextHandler("third")),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("context");
    if (result?.type === "context")
      expect(result.additionalContext).toBe("first\n\nsecond\n\nthird");
  });

  it("skips null results and concatenates only non-null context", async () => {
    const result = await runChain(
      [
        h("a", makeContextHandler("alpha")),
        h("b", makeNullHandler()),
        h("c", makeContextHandler("gamma")),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("context");
    if (result?.type === "context")
      expect(result.additionalContext).toBe("alpha\n\ngamma");
  });
});

// ---------------------------------------------------------------------------
// pre_tool merge — block short-circuit
// ---------------------------------------------------------------------------

describe("runChain — pre_tool: block short-circuits the chain", () => {
  const input: HookInput = {
    kind: "pre_tool",
    toolName: "Bash",
    toolInput: { command: "echo hi" },
    cwd: "/tmp",
  };

  it("returns block immediately when first handler blocks", async () => {
    const laterMutate = vi.fn(makeMutateHandler({ command: "mutated" }));
    const result = await runChain(
      [h("a", makeBlockHandler("no way")), h("b", laterMutate)],
      input,
      ctx,
    );
    expect(result?.type).toBe("block");
    if (result?.type === "block") expect(result.reason).toBe("no way");
    // The second handler must NOT have been called.
    expect(laterMutate).not.toHaveBeenCalled();
  });

  it("returns block when block is in the middle of the chain", async () => {
    const afterBlock = vi.fn(makeMutateHandler({ command: "after" }));
    const result = await runChain(
      [
        h("a", makeMutateHandler({ command: "first" })),
        h("b", makeBlockHandler("blocked mid-chain")),
        h("c", afterBlock),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("block");
    if (result?.type === "block")
      expect(result.reason).toBe("blocked mid-chain");
    expect(afterBlock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pre_tool merge — mutate last-wins
// ---------------------------------------------------------------------------

describe("runChain — pre_tool: mutate last-wins", () => {
  const input: HookInput = {
    kind: "pre_tool",
    toolName: "Bash",
    toolInput: { command: "echo hi" },
    cwd: "/tmp",
  };

  it("returns null when no handlers return mutate", async () => {
    const result = await runChain([h("a", makeNullHandler())], input, ctx);
    expect(result).toBeNull();
  });

  it("returns the only mutate result", async () => {
    const result = await runChain(
      [h("a", makeMutateHandler({ command: "mutated-only" }))],
      input,
      ctx,
    );
    expect(result?.type).toBe("mutate");
    if (result?.type === "mutate")
      expect(result.updatedInput.command).toBe("mutated-only");
  });

  it("last mutate wins when multiple handlers mutate", async () => {
    const result = await runChain(
      [
        h("a", makeMutateHandler({ command: "first-mutate" })),
        h("b", makeNullHandler()),
        h("c", makeMutateHandler({ command: "last-mutate" })),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("mutate");
    if (result?.type === "mutate")
      expect(result.updatedInput.command).toBe("last-mutate");
  });
});

// ---------------------------------------------------------------------------
// stop merge — block
// ---------------------------------------------------------------------------

describe("runChain — post_tool: block short-circuits, contexts concat", () => {
  const input: HookInput = {
    kind: "post_tool",
    toolName: "Edit",
    toolInput: { file_path: "/tmp/big.ts" },
    cwd: "/tmp",
  };

  it("returns null when no handler produces a result", async () => {
    const result = await runChain([h("a", makeNullHandler())], input, ctx);
    expect(result).toBeNull();
  });

  it("returns block immediately and skips later handlers", async () => {
    const later = vi.fn(makeContextHandler("late"));
    const result = await runChain(
      [h("a", makeBlockHandler("too long")), h("b", later)],
      input,
      ctx,
    );
    expect(result).toEqual({ type: "block", reason: "too long" });
    expect(later).not.toHaveBeenCalled();
  });

  it("concatenates context results with \\n\\n when nothing blocks", async () => {
    const result = await runChain(
      [
        h("a", makeContextHandler("first")),
        h("b", makeNullHandler()),
        h("c", makeContextHandler("second")),
      ],
      input,
      ctx,
    );
    expect(result).toEqual({
      type: "context",
      additionalContext: "first\n\nsecond",
    });
  });
});

describe("runChain — stop: any block returns block", () => {
  const input: HookInput = { kind: "stop", cwd: "/tmp" };

  it("returns null when no handler blocks", async () => {
    const result = await runChain(
      [h("a", makeNullHandler()), h("b", makeNullHandler())],
      input,
      ctx,
    );
    expect(result).toBeNull();
  });

  it("returns block when any handler blocks", async () => {
    const result = await runChain(
      [
        h("a", makeNullHandler()),
        h("b", makeBlockHandler("persistent active")),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("block");
    if (result?.type === "block")
      expect(result.reason).toBe("persistent active");
  });
});

// ---------------------------------------------------------------------------
// per-handler timeout — slow handler is skipped, chain continues (fail-open)
// ---------------------------------------------------------------------------

describe("runChain — per-handler timeout: slow handler is skipped", () => {
  it("skips a handler that exceeds its timeout and continues the chain", async () => {
    // slow handler: 200ms, but timeout is 50ms → should be skipped
    const input: HookInput = { kind: "prompt", prompt: "hi", cwd: "/tmp" };
    const result = await runChain(
      [
        h("slow", makeContextHandler("slow-result", 200), 50),
        h("fast", makeContextHandler("fast-result"), 5_000),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("context");
    if (result?.type === "context") {
      expect(result.additionalContext).not.toContain("slow-result");
      expect(result.additionalContext).toContain("fast-result");
    }
  }, 2_000);

  it("returns null when only handler times out", async () => {
    const input: HookInput = { kind: "prompt", prompt: "hi", cwd: "/tmp" };
    const result = await runChain(
      [h("slow", makeContextHandler("late", 300), 50)],
      input,
      ctx,
    );
    expect(result).toBeNull();
  }, 2_000);
});

// ---------------------------------------------------------------------------
// timer cleanup regression — a fast handler must clear its timeout timer so
// the dangling setTimeout does not keep the event loop alive (~5s exit delay).
// ---------------------------------------------------------------------------

describe("runChain — clears per-handler timeout timer (latency regression)", () => {
  it("calls clearTimeout for each handler so no timer lingers after a fast result", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const before = clearSpy.mock.calls.length;
    const input: HookInput = { kind: "prompt", prompt: "hi", cwd: "/tmp" };
    await runChain(
      [
        h("a", makeContextHandler("x"), 5_000),
        h("b", makeContextHandler("y"), 5_000),
      ],
      input,
      ctx,
    );
    // One clearTimeout per handler — the dangling-timer leak (5s exit delay)
    // regresses if these are not cleared.
    expect(clearSpy.mock.calls.length - before).toBeGreaterThanOrEqual(2);
    clearSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// handler throw isolation — throwing handler skipped, chain continues
// ---------------------------------------------------------------------------

describe("runChain — handler throw isolation: throwing handler is skipped", () => {
  it("skips a throwing handler in a prompt chain and continues", async () => {
    const input: HookInput = { kind: "prompt", prompt: "hello", cwd: "/tmp" };
    const result = await runChain(
      [
        h("thrower", makeThrowingHandler("boom")),
        h("ok", makeContextHandler("ok-result")),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("context");
    if (result?.type === "context")
      expect(result.additionalContext).toBe("ok-result");
  });

  it("skips a throwing handler in a pre_tool chain", async () => {
    const input: HookInput = {
      kind: "pre_tool",
      toolName: "Bash",
      toolInput: { command: "echo" },
      cwd: "/tmp",
    };
    const result = await runChain(
      [
        h("thrower", makeThrowingHandler("crash")),
        h("ok", makeMutateHandler({ command: "safe" })),
      ],
      input,
      ctx,
    );
    expect(result?.type).toBe("mutate");
    if (result?.type === "mutate")
      expect(result.updatedInput.command).toBe("safe");
  });

  it("skips a throwing handler in a stop chain and returns null", async () => {
    const input: HookInput = { kind: "stop", cwd: "/tmp" };
    const result = await runChain(
      [h("thrower", makeThrowingHandler("stop-crash"))],
      input,
      ctx,
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// nativeEventToKind table
// ---------------------------------------------------------------------------

describe("nativeEventToKind", () => {
  const cases: [string, HookInput["kind"] | null][] = [
    ["UserPromptSubmit", "prompt"],
    ["BeforeAgent", "prompt"],
    ["beforeSubmitPrompt", "prompt"],
    ["PreInvocation", "prompt"],
    ["userPromptSubmit", "prompt"],
    ["PreToolUse", "pre_tool"],
    ["BeforeTool", "pre_tool"],
    ["preToolUse", "pre_tool"],
    ["PostToolUse", "post_tool"],
    ["Stop", "stop"],
    ["AfterAgent", "stop"],
    ["AfterTool", null],
    ["SessionStart", "prompt"],
    ["unknown", null],
  ];

  for (const [event, expected] of cases) {
    it(`maps "${event}" → ${expected === null ? "null" : `"${expected}"`}`, () => {
      expect(nativeEventToKind("claude", event)).toBe(expected);
    });
  }

  // Session-start injection is vendor-scoped: commandcode/cursor/claude route
  // it through the prompt pipeline; HUD-only SessionStart (e.g. gemini) → null.
  it("maps commandcode SessionStart → prompt", () => {
    expect(nativeEventToKind("commandcode", "SessionStart")).toBe("prompt");
  });

  it("maps cursor sessionStart → prompt", () => {
    expect(nativeEventToKind("cursor", "sessionStart")).toBe("prompt");
  });

  it("keeps SessionStart null for vendors that do not wire it", () => {
    expect(nativeEventToKind("codex", "SessionStart")).toBeNull();
  });
});
