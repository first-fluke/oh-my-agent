import { afterEach, describe, expect, it, vi } from "vitest";
import { findChromeExecutable } from "./browser.js";

const existsMock = vi.hoisted(() => vi.fn());
const platformMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs", () => ({
  existsSync: existsMock,
}));

vi.mock("node:os", () => ({
  platform: platformMock,
}));

afterEach(() => {
  existsMock.mockReset();
  platformMock.mockReset();
  delete process.env.OMA_CHROME_PATH;
});

describe("findChromeExecutable", () => {
  it("prefers OMA_CHROME_PATH when set", () => {
    process.env.OMA_CHROME_PATH = "/opt/custom-chrome";
    existsMock.mockReturnValue(true);
    expect(findChromeExecutable()).toBe("/opt/custom-chrome");
  });

  it("falls back to system candidates (darwin)", () => {
    platformMock.mockReturnValue("darwin");
    existsMock.mockImplementation(
      (p: string) =>
        p === "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
    expect(findChromeExecutable()).toBe(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
  });

  it("returns null when nothing matches", () => {
    platformMock.mockReturnValue("darwin");
    existsMock.mockReturnValue(false);
    expect(findChromeExecutable()).toBeNull();
  });
});
