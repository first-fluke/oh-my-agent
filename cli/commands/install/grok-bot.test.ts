import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  install: vi.fn(),
  cleanup: vi.fn(),
}));
vi.mock("../../io/tarball.js", () => ({ downloadAndExtract: mocks.download }));
vi.mock("../../platform/grok-bot-skills.js", () => ({
  installGrokBotSkills: mocks.install,
}));

import { install } from "./run.js";

describe("Bot install route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.download.mockResolvedValue({
      dir: "/downloaded/release",
      warnings: [],
      cleanup: mocks.cleanup,
    });
    mocks.install.mockReturnValue({
      directory: "/bot/workflows",
      installed: ["oma-qa"],
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("uses the Bot library and cleans the downloaded payload without running project setup", async () => {
    await install({
      target: "grok-bot",
      workflowsDir: "/bot/workflows",
      preset: "research",
    });
    expect(mocks.download).toHaveBeenCalledOnce();
    expect(mocks.install).toHaveBeenCalledWith("/downloaded/release", {
      workflowsDir: "/bot/workflows",
      skills: expect.arrayContaining(["oma-scholar", "oma-search"]),
    });
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it("still cleans the payload when a library ownership conflict rejects installation", async () => {
    mocks.install.mockImplementation(() => {
      throw new Error("Local edit");
    });
    await expect(install({ target: "grok-bot" })).rejects.toThrow("Local edit");
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it("rejects a Bot directory flag without the Bot target before downloading", async () => {
    await expect(install({ workflowsDir: "/bot/workflows" })).rejects.toThrow(
      "requires --target grok-bot",
    );
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
