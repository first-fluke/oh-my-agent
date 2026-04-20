import * as child_process from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCommitsWithStats,
  getDefaultBranch,
  getFileChanges,
} from "./git.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

describe("retro/git.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses default branch from origin HEAD", () => {
    vi.mocked(child_process.execSync).mockReturnValue("main");

    expect(getDefaultBranch("/repo")).toBe("main");
  });

  it("parses commits with shortstat output", () => {
    vi.mocked(child_process.execSync).mockReturnValue(
      [
        "COMMIT:abc|Grace|g@example.com|1710000000|feat: add auth",
        " 1 file changed, 12 insertions(+), 3 deletions(-)",
      ].join("\n"),
    );

    expect(
      getCommitsWithStats(
        "/repo",
        { since: "7 days ago", label: "7d", days: 7 },
        "origin/main",
      ),
    ).toEqual([
      {
        hash: "abc",
        author: "Grace",
        email: "g@example.com",
        timestamp: 1710000000,
        subject: "feat: add auth",
        insertions: 12,
        deletions: 3,
      },
    ]);
  });

  it("parses file changes from numstat output", () => {
    vi.mocked(child_process.execSync).mockReturnValue(
      ["COMMIT:abc|Grace", "12\t3\tsrc/auth.ts"].join("\n"),
    );

    expect(
      getFileChanges(
        "/repo",
        { since: "7 days ago", label: "7d", days: 7 },
        "origin/main",
      ),
    ).toEqual([
      {
        file: "src/auth.ts",
        insertions: 12,
        deletions: 3,
        author: "Grace",
      },
    ]);
  });
});
