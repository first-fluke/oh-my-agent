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
vi.mock("../../platform/skills-installer.js", () => ({
  REPO: "first-fluke/oh-my-agent",
}));

import { maybePromptGitHubStar } from "./github-star.js";

const REPO_URL = "https://github.com/first-fluke/oh-my-agent";

describe("update maybePromptGitHubStar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isGhInstalled.mockReturnValue(true);
    state.isGhAuthenticated.mockReturnValue(true);
    state.isAlreadyStarred.mockReturnValue(false);
  });

  it("shows the repository link when gh is missing", async () => {
    state.isGhInstalled.mockReturnValue(false);

    await maybePromptGitHubStar(false);

    expect(state.info).toHaveBeenCalledWith(expect.stringContaining(REPO_URL));
    expect(state.confirm).not.toHaveBeenCalled();
  });

  it("shows the repository link when gh is not authenticated", async () => {
    state.isGhAuthenticated.mockReturnValue(false);

    await maybePromptGitHubStar(false);

    expect(state.info).toHaveBeenCalledWith(expect.stringContaining(REPO_URL));
    expect(state.confirm).not.toHaveBeenCalled();
  });

  it("does nothing in non-interactive runs", async () => {
    state.isGhInstalled.mockReturnValue(false);

    await maybePromptGitHubStar(true);

    expect(state.info).not.toHaveBeenCalled();
    expect(state.isGhInstalled).not.toHaveBeenCalled();
  });

  it("asks before starring when gh is authenticated", async () => {
    state.confirm.mockResolvedValue(false);

    await maybePromptGitHubStar(false);

    expect(state.confirm).toHaveBeenCalledOnce();
    expect(state.execFileSync).not.toHaveBeenCalled();
    expect(state.info).not.toHaveBeenCalled();
  });

  it("does nothing when already starred", async () => {
    state.isAlreadyStarred.mockReturnValue(true);

    await maybePromptGitHubStar(false);

    expect(state.confirm).not.toHaveBeenCalled();
    expect(state.info).not.toHaveBeenCalled();
  });
});
