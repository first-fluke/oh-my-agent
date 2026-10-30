import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  confirm: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  isGhInstalled: vi.fn(() => true),
  isGhAuthenticated: vi.fn(() => true),
  isAlreadyStarred: vi.fn(() => false),
  getInstallMode: vi.fn(() => "project"),
}));

vi.mock("node:child_process", () => ({ execFileSync: state.execFileSync }));
vi.mock("@clack/prompts", () => ({
  confirm: state.confirm,
  isCancel: () => false,
  log: { info: state.info, success: state.success, warn: state.warn },
}));
vi.mock("../../io/github.js", () => ({
  isGhInstalled: state.isGhInstalled,
  isGhAuthenticated: state.isGhAuthenticated,
  isAlreadyStarred: state.isAlreadyStarred,
}));
vi.mock("../../platform/install-context.js", () => ({
  getInstallMode: state.getInstallMode,
}));
vi.mock("../../platform/skills-installer.js", () => ({
  REPO: "first-fluke/oh-my-agent",
}));

import { maybePromptGithubStar } from "./github-star.js";

const REPO_URL = "https://github.com/first-fluke/oh-my-agent";

describe("install maybePromptGithubStar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isGhInstalled.mockReturnValue(true);
    state.isGhAuthenticated.mockReturnValue(true);
    state.isAlreadyStarred.mockReturnValue(false);
    state.getInstallMode.mockReturnValue("project");
  });

  it("shows the repository link when gh is missing", async () => {
    state.isGhInstalled.mockReturnValue(false);

    await maybePromptGithubStar(false, false);

    expect(state.info).toHaveBeenCalledWith(expect.stringContaining(REPO_URL));
    expect(state.confirm).not.toHaveBeenCalled();
    expect(state.execFileSync).not.toHaveBeenCalled();
  });

  it("shows the repository link on --yes when gh is not authenticated", async () => {
    state.isGhAuthenticated.mockReturnValue(false);

    await maybePromptGithubStar(true, true);

    expect(state.info).toHaveBeenCalledWith(expect.stringContaining(REPO_URL));
    expect(state.execFileSync).not.toHaveBeenCalled();
  });

  it("stays silent on auto-detected CI without gh", async () => {
    state.isGhInstalled.mockReturnValue(false);

    await maybePromptGithubStar(false, true);

    expect(state.info).not.toHaveBeenCalled();
  });

  it("asks before starring when gh is authenticated", async () => {
    state.confirm.mockResolvedValue(true);

    await maybePromptGithubStar(false, false);

    expect(state.confirm).toHaveBeenCalledOnce();
    expect(state.execFileSync).toHaveBeenCalledWith(
      "gh",
      ["api", "-X", "PUT", "/user/starred/first-fluke/oh-my-agent"],
      { stdio: "ignore" },
    );
    expect(state.info).not.toHaveBeenCalled();
  });

  it("skips the prompt and link on --global --yes", async () => {
    state.getInstallMode.mockReturnValue("global");
    state.isGhInstalled.mockReturnValue(false);

    await maybePromptGithubStar(true, true);

    expect(state.info).toHaveBeenCalledOnce();
    expect(state.info).not.toHaveBeenCalledWith(
      expect.stringContaining(REPO_URL),
    );
  });
});
