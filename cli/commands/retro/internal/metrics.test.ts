import { describe, expect, it } from "vitest";
import {
  computeCommitTypes,
  computeFocusScore,
  detectSessions,
  isTestFile,
} from "./metrics.js";

describe("retro/metrics.ts", () => {
  it("detects test files", () => {
    expect(isTestFile("src/auth.test.ts")).toBe(true);
    expect(isTestFile("src/auth.ts")).toBe(false);
  });

  it("groups commits into sessions", () => {
    const sessions = detectSessions([
      {
        hash: "a",
        author: "A",
        email: "a@example.com",
        timestamp: 1000,
        subject: "feat: first",
        insertions: 1,
        deletions: 0,
      },
      {
        hash: "b",
        author: "A",
        email: "a@example.com",
        timestamp: 1000 + 60 * 10,
        subject: "fix: second",
        insertions: 1,
        deletions: 0,
      },
      {
        hash: "c",
        author: "A",
        email: "a@example.com",
        timestamp: 1000 + 60 * 70,
        subject: "docs: third",
        insertions: 1,
        deletions: 0,
      },
    ]);

    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.commits).toBe(2);
    expect(sessions[1]?.commits).toBe(1);
  });

  it("computes conventional commit types", () => {
    expect(
      computeCommitTypes([
        {
          hash: "a",
          author: "A",
          email: "a@example.com",
          timestamp: 1,
          subject: "feat(auth): add login",
          insertions: 1,
          deletions: 0,
        },
        {
          hash: "b",
          author: "A",
          email: "a@example.com",
          timestamp: 2,
          subject: "fix: patch bug",
          insertions: 1,
          deletions: 0,
        },
        {
          hash: "c",
          author: "A",
          email: "a@example.com",
          timestamp: 3,
          subject: "misc update",
          insertions: 1,
          deletions: 0,
        },
      ]),
    ).toEqual({
      feat: 1,
      fix: 1,
      other: 1,
    });
  });

  it("computes focus score from top directory concentration", () => {
    expect(
      computeFocusScore([
        { file: "src/a.ts", insertions: 1, deletions: 0, author: "A" },
        { file: "src/b.ts", insertions: 1, deletions: 0, author: "A" },
        { file: "test/a.test.ts", insertions: 1, deletions: 0, author: "A" },
      ]),
    ).toEqual({
      score: 67,
      area: "src",
    });
  });
});
