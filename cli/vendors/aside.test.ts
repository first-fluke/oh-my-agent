import { EventEmitter } from "node:events";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ASIDE_INSTALL_COMMAND,
  ensureAsideInstalled,
  resolveAsideCommand,
} from "./aside.js";

const state = vi.hoisted(() => ({ spawn: vi.fn(), access: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: state.spawn }));
vi.mock("node:fs", () => ({
  accessSync: state.access,
  constants: { X_OK: 1 },
}));
vi.mock("@clack/prompts", () => ({ log: { info: vi.fn(), success: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PATH", "/test/bin");
  vi.stubEnv("ASIDE_CLI_BIN_DIR", "/test/aside-bin");
  state.access.mockImplementation(() => {
    throw new Error("missing");
  });
});
afterEach(() => vi.unstubAllEnvs());

it("does not install when Aside is not selected", async () => {
  await ensureAsideInstalled(["chrome", "firefox"]);
  expect(state.spawn).not.toHaveBeenCalled();
});
it("reuses an existing command on PATH", async () => {
  state.access.mockImplementation((path) => {
    if (path !== "/test/bin/aside") throw new Error("missing");
  });
  await ensureAsideInstalled(["aside"]);
  expect(resolveAsideCommand()).toBe("aside");
  expect(state.spawn).not.toHaveBeenCalled();
});
it("installs missing Aside and resolves its executable outside PATH", async () => {
  state.spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => {
      state.access.mockImplementation((path) => {
        if (path !== join("/test/aside-bin", "aside"))
          throw new Error("missing");
      });
      child.emit("close", 0, null);
    });
    return child;
  });
  await ensureAsideInstalled(["aside"]);
  expect(state.spawn).toHaveBeenCalledWith(
    "bash",
    ["-o", "pipefail", "-c", ASIDE_INSTALL_COMMAND],
    { stdio: "inherit" },
  );
  expect(resolveAsideCommand()).toBe("/test/aside-bin/aside");
  await ensureAsideInstalled(["aside"]);
  expect(state.spawn).toHaveBeenCalledTimes(1);
});
it.each([1, null])("rejects installer exit %s", async (code) => {
  state.spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() =>
      child.emit("close", code, code === null ? "SIGTERM" : null),
    );
    return child;
  });
  await expect(ensureAsideInstalled(["aside"])).rejects.toThrow(
    "Aside installation failed",
  );
});
it("rejects spawn failures", async () => {
  state.spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("error", new Error("bash missing")));
    return child;
  });
  await expect(ensureAsideInstalled(["aside"])).rejects.toThrow("bash missing");
});
it("rejects success without an executable", async () => {
  state.spawn.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0, null));
    return child;
  });
  await expect(ensureAsideInstalled(["aside"])).rejects.toThrow(
    "no executable was found",
  );
});
