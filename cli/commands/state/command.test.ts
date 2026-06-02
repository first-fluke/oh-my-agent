import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerState } from "./command.js";
import { registerEmit } from "./emit.js";

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerEmit(program);
  registerState(program);
  return program;
}

describe("state command registration", () => {
  it("registers state:repair with dry-run support", () => {
    const program = buildProgram();
    const command = program.commands.find(
      (cmd) => cmd.name() === "state:repair",
    );

    expect(command).toBeDefined();
    expect(command?.options.some((option) => option.long === "--dry-run")).toBe(
      true,
    );
  });

  it("keeps the state command repair alias reachable through [sid]", () => {
    const program = buildProgram();
    const command = program.commands.find((cmd) => cmd.name() === "state");

    expect(command).toBeDefined();
    expect(command?.registeredArguments[0]?.name()).toBe("sid");
    expect(command?.options.some((option) => option.long === "--dry-run")).toBe(
      true,
    );
  });

  it("registers the compact state:verify command only", () => {
    const program = buildProgram();
    const verify = program.commands.find(
      (cmd) => cmd.name() === "state:verify",
    );
    const stateCommandNames = program.commands
      .map((cmd) => cmd.name())
      .filter((name) => name.startsWith("state:"));

    expect(verify).toBeDefined();
    expect(verify?.options.some((option) => option.long === "--workflow")).toBe(
      true,
    );
    expect(
      verify?.options.some((option) => option.long === "--checkpoint"),
    ).toBe(true);
    expect(stateCommandNames).toEqual(
      expect.arrayContaining([
        "state:emit",
        "state:repair",
        "state:verify",
        "state:required-decisions",
        "state:heal-check",
      ]),
    );
  });

  it("registers state:emit under the state namespace only", () => {
    const program = buildProgram();
    const stateEmit = program.commands.find(
      (cmd) => cmd.name() === "state:emit",
    );
    const rootEmit = program.commands.find((cmd) => cmd.name() === "emit");

    expect(stateEmit).toBeDefined();
    expect(rootEmit).toBeUndefined();
  });
});
