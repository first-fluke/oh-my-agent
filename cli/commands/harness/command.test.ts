import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerHarnessCommand } from "./command.js";

describe("registerHarnessCommand", () => {
  it("registers harness eval with explicit suite, candidate, and execution modes", () => {
    const program = new Command();
    registerHarnessCommand(program);

    const harness = program.commands.find(
      (command) => command.name() === "harness",
    );
    const evaluate = harness?.commands.find(
      (command) => command.name() === "eval",
    );
    const flags = evaluate?.options.map((option) => option.long);

    expect(evaluate).toBeDefined();
    expect(flags).toContain("--suite");
    expect(flags).toContain("--candidate");
    expect(flags).toContain("--live");
    expect(flags).toContain("--mock");
    expect(flags).toContain("--record");
    expect(flags).toContain("--require-coverage");
    expect(flags).toContain("--json");
  });
});
