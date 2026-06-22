/**
 * Lockstep guard (T1-a) — each handler module exports `run` and the standalone
 * main delegates to it (no duplicated logic).
 *
 * Checks:
 *  1. Each handler exports `run` as a function.
 *  2. The `run` signature accepts (HookInput, HandlerCtx) and returns a Promise.
 *  3. `run` is callable in-process and returns HandlerResult | null
 *     (lightweight smoke; full behaviour is covered by the per-handler test suites).
 */

import * as fs from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => "{}"),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(() => []),
}));

// Import all six handlers — each must export `run`.
const [kd, si, sp, sb, tf, pm] = await Promise.all([
  import("../../.agents/hooks/core/keyword-detector.ts"),
  import("../../.agents/hooks/core/skill-injector.ts"),
  import("../../.agents/hooks/core/serena-primer.ts"),
  import("../../.agents/hooks/core/state-boundary.ts"),
  import("../../.agents/hooks/core/test-filter.ts"),
  import("../../.agents/hooks/core/persistent-mode.ts"),
]);

const handlers = [
  { name: "keyword-detector", mod: kd },
  { name: "skill-injector", mod: si },
  { name: "serena-primer", mod: sp },
  { name: "state-boundary", mod: sb },
  { name: "test-filter", mod: tf },
  { name: "persistent-mode", mod: pm },
] as const;

describe("handler run() exports — lockstep guard (T1-a)", () => {
  for (const { name, mod } of handlers) {
    it(`${name} exports run as a function`, () => {
      expect(typeof (mod as Record<string, unknown>).run).toBe("function");
    });

    it(`${name} run() returns a Promise`, () => {
      const run = (mod as Record<string, unknown>).run as (
        input: unknown,
        ctx: unknown,
      ) => unknown;
      // Provide a non-matching input so early-exit is taken (no side effects).
      // For prompt-kind handlers, passing kind="stop" returns null quickly.
      // For pre_tool handler (test-filter), passing kind="prompt" returns null.
      // For stop handler (persistent-mode), passing kind="prompt" returns null.
      const result = run(
        { kind: "stop", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "test" },
      );
      expect(result).toBeInstanceOf(Promise);
      // Resolve to null — non-matching input, no active state on disk.
      return expect(result).resolves.toBeNull();
    });
  }

  describe("keyword-detector run()", () => {
    it("returns null for non-prompt kind", async () => {
      const result = await kd.run(
        { kind: "stop", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "test" },
      );
      expect(result).toBeNull();
    });

    it("returns null for empty prompt", async () => {
      // readFileSync mocked to return "{}" so loadConfig/detectLanguage are safe.
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({
          workflows: {},
          informationalPatterns: {},
          excludedWorkflows: [],
          cjkScripts: [],
        }),
      );
      const result = await kd.run(
        { kind: "prompt", prompt: "", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "test" },
      );
      expect(result).toBeNull();
    });
  });

  describe("test-filter run()", () => {
    it("returns null for non-pre_tool kind", async () => {
      const result = await tf.run(
        { kind: "prompt", prompt: "hello", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp" },
      );
      expect(result).toBeNull();
    });

    it("returns null when filter script does not exist", async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const result = await tf.run(
        {
          kind: "pre_tool",
          toolName: "Bash",
          toolInput: { command: "bun run test" },
          cwd: "/tmp",
        },
        { vendor: "claude", cwd: "/tmp" },
      );
      expect(result).toBeNull();
    });

    it("returns mutate result with filtered command when filter script exists", async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const result = await tf.run(
        {
          kind: "pre_tool",
          toolName: "Bash",
          toolInput: { command: "bun run test" },
          cwd: "/tmp",
        },
        { vendor: "claude", cwd: "/tmp" },
      );
      expect(result).not.toBeNull();
      expect(result?.type).toBe("mutate");
      if (result?.type === "mutate") {
        expect(typeof result.updatedInput.command).toBe("string");
        expect(result.updatedInput.command as string).toContain(
          "filter-test-output.sh",
        );
      }
    });
  });

  describe("persistent-mode run()", () => {
    it("returns null for non-stop kind", async () => {
      const result = await pm.run(
        { kind: "prompt", prompt: "hello", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "test" },
      );
      expect(result).toBeNull();
    });

    it("returns null when no persistent state files exist", async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({
          workflows: {
            orchestrate: { persistent: true },
            work: { persistent: true },
            ultrawork: { persistent: true },
          },
        }),
      );
      const result = await pm.run(
        { kind: "stop", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "test-session" },
      );
      expect(result).toBeNull();
    });

    // Regression: a stop whose session id resolves to the "unknown" fallback
    // must never block (it cannot be isolated per session) and must sweep any
    // orphan `-state-unknown.json` files without touching real sessions' state.
    it("never blocks on the unknown-session fallback and sweeps its orphans", async () => {
      vi.clearAllMocks();
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-unknown.json",
        "work-state-real-session.json",
      ]);
      const result = await pm.run(
        { kind: "stop", cwd: "/tmp" },
        { vendor: "claude", cwd: "/tmp", sid: "unknown" },
      );
      expect(result).toBeNull();
      // Only the orphan keyed to the fallback id is removed.
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join("/tmp", ".agents", "state", "orchestrate-state-unknown.json"),
      );
    });
  });
});
