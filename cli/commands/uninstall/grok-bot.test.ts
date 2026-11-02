import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ remove: vi.fn(), confirm: vi.fn() }));
vi.mock("../../platform/grok-bot-skills.js", () => ({
  uninstallGrokBotSkills: mocks.remove,
}));
vi.mock("@clack/prompts", () => ({
  note: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  confirm: mocks.confirm,
  isCancel: () => false,
}));

import { registerUninstall } from "./command.js";

describe("Bot uninstall route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CI", "");
    vi.stubEnv("OMA_YES", "");
    mocks.remove.mockReturnValue({
      directory: "/bot/workflows",
      removed: ["oma-qa/SKILL.md"],
      preserved: [],
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  async function run(...args: string[]): Promise<void> {
    const program = new Command();
    registerUninstall(program);
    await program.parseAsync([
      "node",
      "oma",
      "uninstall",
      "--target",
      "grok-bot",
      "--workflows-dir",
      "/bot/workflows",
      ...args,
    ]);
  }

  it("dry-run previews only the Bot library", async () => {
    await run("--dry-run");
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.remove).toHaveBeenCalledWith(
      expect.objectContaining({ workflowsDir: "/bot/workflows", dryRun: true }),
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("--yes removes only after previewing the Bot library", async () => {
    await run("--yes");
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.remove.mock.calls[0]?.[0].dryRun).toBe(true);
    expect(mocks.remove.mock.calls[1]?.[0].dryRun).not.toBe(true);
  });

  it("declining the existing confirmation leaves the library intact", async () => {
    mocks.confirm.mockResolvedValue(false);
    await run();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
