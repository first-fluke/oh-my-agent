import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import { runAction } from "./cli-framework.js";

describe("runAction execution stop exit codes", () => {
  it.each([124, 130, 143, 0, -1, 256, "143", 1.5])(
    "preserves only valid failure code %s",
    async (exitCode) => {
      const previous = process.exitCode;
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await runAction(() => {
          throw Object.assign(new Error("stopped"), { exitCode });
        })();
        expect(process.exitCode).toBe(
          typeof exitCode === "number" && [124, 130, 143].includes(exitCode)
            ? exitCode
            : 1,
        );
      } finally {
        process.exitCode = previous;
        log.mockRestore();
      }
    },
  );
});

/**
 * Regression test for the bug where `--yes` (and other flags registered on the
 * root program) were captured into the parent command's `_optionValues` instead
 * of the subcommand's, causing `command.opts()` — and therefore `args[0]` inside
 * every `runAction` handler — to be missing those values.
 *
 * Root cause: `cli.ts:67` calls `registerDefaultInstallAction(program)` which
 * registers `-y/--yes` on the root `program` object
 * (`cli/commands/install/command.ts:30`). When commander sees `skills eval --yes`
 * it matches the program-level flag first and stores `yes: true` in the root
 * program's `_optionValues`, not the subcommand's. `command.opts()` only returns
 * the subcommand's own `_optionValues`, so `args[0]` was `{}` — `yes` was
 * silently undefined, and the confirmation gate always triggered even with `--yes`.
 *
 * Fix: `runAction` (`cli-framework.ts`) now replaces `args[0]` with
 * `command.optsWithGlobals()` before invoking the handler, merging parent/global
 * option values into every handler's options object.
 */
describe("runAction — optsWithGlobals regression (global --yes shadowing subcommand --yes)", () => {
  /**
   * Builds a minimal commander tree that reproduces the original bug:
   *   - Root program has `-y/--yes` (like registerDefaultInstallAction does)
   *   - A subcommand also declares `--yes` (like `skills eval` does)
   * Returns the captured options that the handler received.
   */
  async function parseAndCapture(
    argv: string[],
  ): Promise<Record<string, unknown>> {
    let captured: Record<string, unknown> = {};

    const program = new Command();
    program.exitOverride(); // prevent process.exit in tests

    // Reproduce the program-level --yes registered by registerDefaultInstallAction
    program.option("-y, --yes", "Skip prompts (program-level)");

    const sub = program
      .command("sub")
      .option("--yes", "Skip confirmation (subcommand-level)")
      .option("--flag", "An unrelated subcommand flag");

    sub.action(
      runAction((opts: Record<string, unknown>) => {
        captured = { ...opts };
      }),
    );

    await program.parseAsync(argv, { from: "user" });
    return captured;
  }

  it("handler receives yes:true when --yes is passed to the subcommand (was broken: opts() missed parent-captured flag)", async () => {
    const opts = await parseAndCapture(["sub", "--yes"]);
    // Before the fix, opts.yes was undefined because commander stored the value
    // in the root program's _optionValues (via the program-level --yes match).
    expect(opts.yes).toBe(true);
  });

  it("handler receives yes:undefined when --yes is NOT passed", async () => {
    const opts = await parseAndCapture(["sub"]);
    expect(opts.yes).toBeUndefined();
  });

  it("handler receives yes:true when --yes is passed at the program level (oma --yes sub)", async () => {
    // Also ensures that a program-level --yes (before the subcommand) still
    // surfaces in the handler via optsWithGlobals().
    const opts = await parseAndCapture(["--yes", "sub"]);
    expect(opts.yes).toBe(true);
  });

  it("handler still receives unrelated subcommand flags correctly", async () => {
    const opts = await parseAndCapture(["sub", "--flag"]);
    expect(opts.flag).toBe(true);
    expect(opts.yes).toBeUndefined();
  });

  it("handler receives both --yes and --flag when both are passed", async () => {
    const opts = await parseAndCapture(["sub", "--yes", "--flag"]);
    expect(opts.yes).toBe(true);
    expect(opts.flag).toBe(true);
  });
});

/**
 * Regression test for the bug where `runAction` overwrote `args[0]` with the
 * merged options object. Commander invokes the action as
 * `(...operands, options, command)`, so for a command that declares positional
 * operands (e.g. `state:emit <kind> [payload]`) `args[0]` is the first operand,
 * not the options. Overwriting args[0] clobbered the operand — `oma state:emit
 * decision.made '{...}'` recorded `kind` as the options object
 * (`{category:"main",mirror:true}`) instead of the string `"decision.made"`.
 *
 * Fix: replace the options slot by position (`args.length - 2`) so positional
 * operands survive while options still get globals merged in.
 */
describe("runAction — positional operands survive options merge", () => {
  async function parseOperandCommand(argv: string[]): Promise<{
    operands: unknown[];
    opts: Record<string, unknown>;
  }> {
    let operands: unknown[] = [];
    let opts: Record<string, unknown> = {};

    const program = new Command();
    program.exitOverride();
    program.option("-y, --yes", "Skip prompts (program-level)");

    program
      .command("emit <kind> [payload]")
      .option("--category <category>", "category", "main")
      .action(
        runAction(
          (
            kind: string,
            payload: string | undefined,
            options: Record<string, unknown>,
          ) => {
            operands = [kind, payload];
            opts = { ...options };
          },
        ),
      );

    await program.parseAsync(argv, { from: "user" });
    return { operands, opts };
  }

  it("passes the first operand through untouched (was overwritten by options)", async () => {
    const { operands } = await parseOperandCommand([
      "emit",
      "decision.made",
      '{"a":1}',
    ]);
    expect(operands[0]).toBe("decision.made");
    expect(operands[1]).toBe('{"a":1}');
  });

  it("still merges global options into the handler's options arg", async () => {
    const { operands, opts } = await parseOperandCommand([
      "--yes",
      "emit",
      "session.ended",
    ]);
    expect(operands[0]).toBe("session.ended");
    expect(operands[1]).toBeUndefined();
    expect(opts.yes).toBe(true);
    expect(opts.category).toBe("main");
  });
});
