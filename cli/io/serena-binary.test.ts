import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFileSync: vi.fn() };
});

import { execFileSync } from "node:child_process";
import {
  ensureSerenaBinary,
  isSerenaBinaryAvailable,
  isUvAvailable,
  SERENA_INSTALL_HINT,
} from "./serena.js";

const mockExec = vi.mocked(execFileSync);

/** A successful probe — execFileSync returns stdout (string with stdio:ignore). */
function ok(): string {
  return "";
}
function fail(): never {
  throw new Error("ENOENT: command not found");
}

describe("serena binary helpers", () => {
  beforeEach(() => {
    mockExec.mockReset();
  });

  it("isSerenaBinaryAvailable reflects the probe result", () => {
    mockExec.mockReturnValueOnce(ok());
    expect(isSerenaBinaryAvailable()).toBe(true);

    mockExec.mockImplementationOnce(fail);
    expect(isSerenaBinaryAvailable()).toBe(false);
  });

  it("isUvAvailable reflects the probe result", () => {
    mockExec.mockReturnValueOnce(ok());
    expect(isUvAvailable()).toBe(true);
  });

  it("SERENA_INSTALL_HINT is the uv tool install command", () => {
    expect(SERENA_INSTALL_HINT).toBe(
      "uv tool install -p 3.13 serena-agent@latest --prerelease=allow",
    );
  });
});

describe("ensureSerenaBinary", () => {
  beforeEach(() => {
    mockExec.mockReset();
  });

  it("returns present when serena is already on PATH (no install attempted)", () => {
    mockExec.mockReturnValueOnce(ok()); // serena --version
    const onInstallStart = vi.fn();

    expect(ensureSerenaBinary({ onInstallStart })).toEqual({
      status: "present",
    });
    expect(mockExec).toHaveBeenCalledTimes(1);
    expect(onInstallStart).not.toHaveBeenCalled();
  });

  it("installs via uv when serena is missing but uv is present", () => {
    mockExec
      .mockImplementationOnce(fail) // serena --version → missing
      .mockReturnValueOnce(ok()) // uv --version → present
      .mockReturnValueOnce(ok()) // uv tool install → success
      .mockReturnValueOnce(ok()); // serena --version → now runnable
    const onInstallStart = vi.fn();

    expect(ensureSerenaBinary({ onInstallStart })).toEqual({
      status: "installed",
    });
    expect(onInstallStart).toHaveBeenCalledTimes(1);
    // Third call is the install with the documented args.
    const installCall = mockExec.mock.calls[2];
    expect(installCall?.[0]).toBe("uv");
    expect(installCall?.[1]).toEqual([
      "tool",
      "install",
      "-p",
      "3.13",
      "serena-agent@latest",
      "--prerelease=allow",
    ]);
  });

  it("reports when uv installs serena but the binary is still not on PATH", () => {
    mockExec
      .mockImplementationOnce(fail) // serena --version → missing
      .mockReturnValueOnce(ok()) // uv --version → present
      .mockReturnValueOnce(ok()) // uv tool install → success
      .mockImplementationOnce(fail); // serena --version → still missing

    expect(ensureSerenaBinary()).toEqual({
      status: "installed-not-on-path",
    });
  });

  it("returns uv-missing when neither serena nor uv is available", () => {
    mockExec.mockImplementation(fail); // every probe fails
    expect(ensureSerenaBinary()).toEqual({ status: "uv-missing" });
  });

  it("returns install-failed when the uv install errors", () => {
    let call = 0;
    mockExec.mockImplementation(() => {
      call += 1;
      if (call === 1) fail(); // serena --version → missing
      if (call === 2) return ok(); // uv --version → present
      throw new Error("network unreachable"); // uv tool install → fails
    });

    const outcome = ensureSerenaBinary();
    expect(outcome.status).toBe("install-failed");
    if (outcome.status === "install-failed") {
      expect(outcome.error).toContain("network unreachable");
    }
  });
});
