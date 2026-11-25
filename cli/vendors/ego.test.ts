import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import { EGO_LITE_URL, reportEgoStatus, resolveEgoCommand } from "./ego.js";

const state = vi.hoisted(() => ({
  access: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("node:fs", () => ({
  accessSync: state.access,
  constants: { X_OK: 1 },
}));
vi.mock("@clack/prompts", () => ({
  log: { info: state.info, warn: state.warn },
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.access.mockImplementation(() => {
    throw new Error("missing");
  });
});

function allow(...paths: string[]): void {
  state.access.mockImplementation((path: string) => {
    if (!paths.includes(path)) throw new Error("missing");
  });
}

it("resolves ego-browser on PATH by name", () => {
  allow(join("/test/bin", "ego-browser"));
  expect(resolveEgoCommand({ PATH: "/test/bin" }, "/home/u", "darwin")).toBe(
    "ego-browser",
  );
});

it("falls back to ~/.local/bin, where onboarding links the CLI", () => {
  const installed = join("/home/u", ".local", "bin", "ego-browser");
  allow(installed);
  expect(resolveEgoCommand({ PATH: "/test/bin" }, "/home/u", "darwin")).toBe(
    installed,
  );
});

it("accepts the Windows executable name", () => {
  allow(join("/test/bin", "ego-browser.exe"));
  expect(resolveEgoCommand({ PATH: "/test/bin" }, "/home/u", "win32")).toBe(
    "ego-browser",
  );
});

it("returns undefined when ego lite is not installed", () => {
  expect(
    resolveEgoCommand({ PATH: "/test/bin" }, "/home/u", "darwin"),
  ).toBeUndefined();
});

it("does nothing when ego is not selected", () => {
  const resolve = vi.fn();
  expect(reportEgoStatus(["aside", "chrome"], resolve)).toBe(true);
  expect(resolve).not.toHaveBeenCalled();
  expect(state.warn).not.toHaveBeenCalled();
});

it("reports a detected CLI without writing anything", () => {
  expect(reportEgoStatus(["ego"], () => "ego-browser")).toBe(true);
  expect(state.info).toHaveBeenCalledWith(
    expect.stringContaining("ego-browser skill"),
  );
  expect(state.warn).not.toHaveBeenCalled();
});

it("warns with install and onboarding steps when the CLI is missing", () => {
  expect(reportEgoStatus(["ego"], () => undefined)).toBe(false);
  expect(state.warn).toHaveBeenCalledWith(
    expect.stringContaining(EGO_LITE_URL),
  );
  expect(state.warn).toHaveBeenCalledWith(
    expect.stringContaining("onboarding"),
  );
});
