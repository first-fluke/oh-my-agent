import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommandSurface } from "../../utils/command-surface.js";
import { registerUpdate } from "./command.js";

const updateMock = vi.hoisted(() => vi.fn(async () => {}));
const updateMcpMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./mcp.js", () => ({ updateMcp: updateMcpMock }));

vi.mock("./run.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./run.js")>();
  return { ...actual, update: updateMock };
});

function makeProgram(): Command {
  const program = new Command();
  program.option("-g, --global");
  registerUpdate(program);
  return program;
}

describe("update command vendor flags", () => {
  beforeEach(() => {
    updateMock.mockClear();
    updateMcpMock.mockClear();
  });

  it.each([
    { argv: ["update"], global: undefined },
    { argv: ["--global", "update"], global: true },
  ])("runs the default update through the CLI surface: $argv", async (test) => {
    const program = makeProgram();
    const surface = createCommandSurface(program);
    expect(surface.showHelp(test.argv)).toBe(false);
    await program.parseAsync(surface.normalize(test.argv), { from: "user" });
    expect(updateMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ global: test.global }),
    );
    expect(updateMcpMock).not.toHaveBeenCalled();
  });

  it("routes update mcp to browser selection without a registry update", async () => {
    await makeProgram().parseAsync([
      "node",
      "oma",
      "--global",
      "update",
      "mcp",
      "--yes",
      "--vendor",
      "codex",
    ]);
    expect(updateMock).not.toHaveBeenCalled();
    expect(updateMcpMock).toHaveBeenCalledWith({
      global: true,
      yes: true,
      vendor: "codex",
    });
  });

  it("passes --yes without changing vendor scope", async () => {
    await makeProgram().parseAsync(["node", "oma", "update", "--yes"]);

    expect(updateMock).toHaveBeenCalledWith({
      force: undefined,
      ci: undefined,
      yes: true,
      global: undefined,
      all: undefined,
      vendor: undefined,
    });
  });

  it("passes --all to update()", async () => {
    await makeProgram().parseAsync(["node", "oma", "update", "--all"]);

    expect(updateMock).toHaveBeenCalledWith({
      force: undefined,
      ci: undefined,
      yes: undefined,
      global: undefined,
      all: true,
      vendor: undefined,
    });
  });

  it("passes comma-separated --vendor to update()", async () => {
    await makeProgram().parseAsync([
      "node",
      "oma",
      "update",
      "--vendor",
      "claude,qwen",
    ]);

    expect(updateMock).toHaveBeenCalledWith({
      force: undefined,
      ci: undefined,
      yes: undefined,
      global: undefined,
      all: undefined,
      vendor: "claude,qwen",
    });
  });
});
