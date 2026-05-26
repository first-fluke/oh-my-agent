import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerDefaultInstallAction,
  registerInstall,
  resolveInstallYesFlag,
} from "./command.js";

const installMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("./install.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./install.js")>();
  return { ...actual, install: installMock };
});

function makeProgram(): Command {
  const program = new Command();
  registerDefaultInstallAction(program);
  registerInstall(program);
  return program;
}

describe("install command --yes flag", () => {
  beforeEach(() => {
    installMock.mockClear();
  });

  it("resolveInstallYesFlag reads root program opts", () => {
    const program = new Command();
    program.option("-y, --yes");
    program.parse(["node", "oma", "--yes"]);
    expect(resolveInstallYesFlag(program)).toBe(true);
    expect(resolveInstallYesFlag(program, {})).toBe(true);
  });

  it("oma install --yes passes yes: true to install()", async () => {
    await makeProgram().parseAsync(["node", "oma", "install", "--yes"]);
    expect(installMock).toHaveBeenCalledWith({ yes: true });
  });

  it("oma --yes install passes yes: true to install()", async () => {
    await makeProgram().parseAsync(["node", "oma", "--yes", "install"]);
    expect(installMock).toHaveBeenCalledWith({ yes: true });
  });

  it("oma install without --yes passes yes: false to install()", async () => {
    await makeProgram().parseAsync(["node", "oma", "install"]);
    expect(installMock).toHaveBeenCalledWith({ yes: false });
  });

  it("oma --yes passes yes: true to install()", async () => {
    await makeProgram().parseAsync(["node", "oma", "--yes"]);
    expect(installMock).toHaveBeenCalledWith({ yes: true });
  });
});
