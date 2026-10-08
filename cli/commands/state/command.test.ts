import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerState } from "./command.js";
import { registerEmit } from "./emit.js";

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerEmit(program);
  registerState(program);
  return program;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("state command registration", () => {
  it("lists agent decision subjects without changing workflow checkpoint output", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await buildProgram().parseAsync([
      "node",
      "oma",
      "state:required-decisions",
      "--agent",
      "db-engineer",
      "--json",
    ]);
    const agents = JSON.parse(String(log.mock.calls.at(-1)?.[0]));
    expect(Object.keys(agents)).toEqual(["db-engineer"]);
    expect(agents["db-engineer"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: "db.migration-strategy" }),
      ]),
    );

    await buildProgram().parseAsync([
      "node",
      "oma",
      "state:required-decisions",
      "debug",
      "--json",
    ]);
    expect(JSON.parse(String(log.mock.calls.at(-1)?.[0]))).toEqual({
      debug: {
        "root-cause": [
          expect.objectContaining({ subject: "debug.root-cause" }),
        ],
      },
    });
  });

  it("rejects an agent catalog request combined with a workflow", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await buildProgram().parseAsync([
      "node",
      "oma",
      "state:required-decisions",
      "debug",
      "--agent",
      "db-engineer",
    ]);
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Choose either a workflow or --agent"),
    );
  });

  it("rejects aggregate mode with mutations and requires it for aggregate filters", async () => {
    const cases = [
      ["state", "--all-projects", "--activate", "oma-a"],
      ["state", "--all-projects", "--archive"],
      ["state", "--all-projects", "--purge"],
      ["state", "--project", "/tmp/project"],
      ["state", "--search", "migration"],
    ];
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    for (const args of cases) {
      const program = buildProgram();
      await program.parseAsync(["node", "oma", ...args]);
      expect(process.exitCode).toBe(1);
      process.exitCode = undefined;
    }
    expect(error).toHaveBeenCalledTimes(cases.length);
  });

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
    expect(
      verify?.options.find((option) => option.long === "--instance")?.mandatory,
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
