// Unit tests for installSkillsFromRemote — doctor's repair flow.
//
// Covers:
//   1. Downloads source via downloadAndExtract before installing
//   2. Calls installShared with the EXTRACTED dir (not cwd) — regression
//      guard for the prior `installShared(cwd, cwd)` crash bug
//   3. Calls installSkill per name with extracted dir as source
//   4. Always invokes cleanup() — even if installation throws

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tarballState = vi.hoisted(() => ({
  cleanup: vi.fn(),
  downloadAndExtract: vi.fn(async () => ({
    dir: "/tmp/extracted-source",
    cleanup: tarballState.cleanup,
  })),
}));

const skillsState = vi.hoisted(() => ({
  installShared: vi.fn(),
  installSkill: vi.fn(() => true),
  getAllSkills: vi.fn(() => []),
  INSTALLED_SKILLS_DIR: ".agents/skills",
}));

vi.mock("../../io/tarball.js", () => tarballState);
vi.mock("../../platform/skills-installer.js", () => skillsState);

vi.mock("../../vendors/index.js", () => ({
  isClaudeAuthenticated: vi.fn(() => false),
  isCodexAuthenticated: vi.fn(() => false),
  isGeminiAuthenticated: vi.fn(() => false),
  isQwenAuthenticated: vi.fn(() => false),
}));

import { installSkillsFromRemote } from "./doctor.js";

describe("installSkillsFromRemote", () => {
  const target = "/tmp/test-project";

  beforeEach(() => {
    vi.clearAllMocks();
    tarballState.cleanup = vi.fn();
    tarballState.downloadAndExtract.mockResolvedValue({
      dir: "/tmp/extracted-source",
      cleanup: tarballState.cleanup,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads the source tarball before installing", async () => {
    await installSkillsFromRemote(target, ["oma-frontend"]);
    expect(tarballState.downloadAndExtract).toHaveBeenCalledTimes(1);
  });

  it("calls installShared with extracted source dir, not cwd (regression for src=dest crash)", async () => {
    await installSkillsFromRemote(target, ["oma-frontend"]);
    expect(skillsState.installShared).toHaveBeenCalledWith(
      "/tmp/extracted-source",
      target,
    );
    // Critical: the SOURCE must NOT equal the target
    const call = skillsState.installShared.mock.calls[0];
    expect(call[0]).not.toBe(call[1]);
  });

  it("installs each named skill with extracted source dir", async () => {
    await installSkillsFromRemote(target, [
      "oma-frontend",
      "oma-backend",
      "oma-mobile",
    ]);
    expect(skillsState.installSkill).toHaveBeenCalledTimes(3);
    for (const call of skillsState.installSkill.mock.calls) {
      expect(call[0]).toBe("/tmp/extracted-source"); // sourceDir
      expect(call[2]).toBe(target); // targetDir
      expect(call[0]).not.toBe(call[2]); // src != dest
    }
  });

  it("invokes onProgress for each skill", async () => {
    const onProgress = vi.fn();
    await installSkillsFromRemote(
      target,
      ["oma-frontend", "oma-backend"],
      onProgress,
    );
    expect(onProgress).toHaveBeenCalledWith("oma-frontend");
    expect(onProgress).toHaveBeenCalledWith("oma-backend");
  });

  it("calls cleanup even when installSkill throws", async () => {
    skillsState.installSkill.mockImplementationOnce(() => {
      throw new Error("disk full");
    });

    await expect(
      installSkillsFromRemote(target, ["oma-frontend"]),
    ).rejects.toThrow("disk full");

    expect(tarballState.cleanup).toHaveBeenCalledTimes(1);
  });

  it("calls cleanup even when installShared throws", async () => {
    skillsState.installShared.mockImplementationOnce(() => {
      throw new Error("permission denied");
    });

    await expect(
      installSkillsFromRemote(target, ["oma-frontend"]),
    ).rejects.toThrow("permission denied");

    expect(tarballState.cleanup).toHaveBeenCalledTimes(1);
  });
});
