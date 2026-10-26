import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerDefaultInstallAction,
  registerInstall,
  resolveInstallYesFlag,
} from "./command.js";

const installMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("./run.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./run.js")>();
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

  it("passes provider and Honcho connection flags to install", async () => {
    await makeProgram().parseAsync([
      "node",
      "oma",
      "install",
      "--yes",
      "--code-intelligence",
      "gortex",
      "--semantic-memory",
      "honcho",
      "--honcho-url",
      "http://127.0.0.1:8000",
      "--honcho-workspace",
      "team",
    ]);
    expect(installMock).toHaveBeenCalledWith({
      yes: true,
      codeIntelligence: "gortex",
      semanticMemory: "honcho",
      honchoUrl: "http://127.0.0.1:8000",
      honchoWorkspace: "team",
    });
  });

  it("rejects unsupported provider names before installation", async () => {
    const program = makeProgram();
    program.exitOverride().configureOutput({ writeErr: () => {} });
    await expect(
      program.parseAsync([
        "node",
        "oma",
        "install",
        "--code-intelligence",
        "invalid",
      ]),
    ).rejects.toThrow();
    expect(installMock).not.toHaveBeenCalled();
  });

  it.each(["brave", "exa"])(
    "passes %s web selection to the installer",
    async (webSearch) => {
      await makeProgram().parseAsync([
        "node",
        "oma",
        "install",
        "--yes",
        "--web-search",
        webSearch,
      ]);
      expect(installMock).toHaveBeenCalledWith({ yes: true, webSearch });
    },
  );

  it("rejects unregistered web providers before installation", async () => {
    const program = makeProgram();
    program.exitOverride().configureOutput({ writeErr: () => {} });
    await expect(
      program.parseAsync([
        "node",
        "oma",
        "install",
        "--yes",
        "--web-search",
        "unregistered-provider",
      ]),
    ).rejects.toThrow();
    expect(installMock).not.toHaveBeenCalled();
  });
});
