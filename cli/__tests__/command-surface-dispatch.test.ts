import { Command } from "commander";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { _resetInstallContext } from "../platform/install-context.js";
import { canonicalCommandPath } from "../utils/command-paths.js";
import { createCommandSurface } from "../utils/command-surface.js";

type RegisteredCommand = Command & { _actionHandler?: unknown };
let program: Command;

// Capture the actual CLI registration without running an install or command.
beforeAll(async () => {
  const argv = process.argv;
  const parse = vi
    .spyOn(Command.prototype, "parseAsync")
    .mockImplementation(async function (this: Command) {
      program = this;
      return this;
    });
  process.argv = ["node", "oma", "--version"];
  try {
    await import("../cli.js");
  } finally {
    process.argv = argv;
    parse.mockRestore();
  }
});

afterEach(() => vi.restoreAllMocks());

function registeredCommands() {
  const commands: { path: string; command: RegisteredCommand }[] = [];
  function visit(parent: Command, prefix = "") {
    for (const command of parent.commands) {
      const path = `${prefix} ${command.name()}`.trim();
      commands.push({ path: canonicalCommandPath(path), command });
      visit(command, path);
    }
  }
  visit(program);
  return commands;
}

describe("actual CLI command surface dispatch", () => {
  it("never swallows an executable command as implicit group help", () => {
    const surface = createCommandSurface(program);
    const help = vi.spyOn(Command.prototype, "outputHelp").mockReturnThis();
    const actions = registeredCommands().filter(
      ({ path, command }) => command._actionHandler && path !== "help",
    );
    expect(actions.length).toBeGreaterThan(100);
    for (const { path } of actions) {
      expect(surface.showHelp(path.split(" ")), path).toBe(false);
    }
    expect(help).not.toHaveBeenCalled();
  });

  it("dispatches every zero-argument parent action exactly once", async () => {
    const parents = registeredCommands().filter(
      ({ command }) =>
        command._actionHandler &&
        command.commands.length > 0 &&
        !command.registeredArguments.some((argument) => argument.required),
    );
    expect(parents.map(({ path }) => path)).toContain("update");
    const surface = createCommandSurface(program);
    for (const { path, command } of parents) {
      const original = command._actionHandler;
      const action = vi.fn();
      command.action(action);
      try {
        const argv = path.split(" ");
        expect(surface.showHelp(argv), path).toBe(false);
        _resetInstallContext();
        await program.parseAsync(surface.normalize(argv), { from: "user" });
        expect(action, path).toHaveBeenCalledOnce();
      } finally {
        command._actionHandler = original;
        _resetInstallContext();
      }
    }
    console.log(
      `Verified parent actions: ${parents.map(({ path }) => path).join(", ")}`,
    );
  });

  it("preserves explicit help and bare discovery groups", () => {
    const surface = createCommandSurface(program);
    vi.spyOn(Command.prototype, "outputHelp").mockReturnThis();
    for (const { path } of registeredCommands()) {
      if (path === "help") continue;
      expect(surface.showHelp([...path.split(" "), "--help"]), path).toBe(true);
    }
    expect(surface.showHelp(["help"])).toBe(true);
    for (const path of ["schedule", "search", "image", "dashboard"]) {
      expect(surface.showHelp(path.split(" ")), path).toBe(true);
    }
  });
});
