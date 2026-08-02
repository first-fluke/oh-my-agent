import { posix, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENTS_RESULTS_DIR,
  AGENTS_RESULTS_GITIGNORE,
  AGENTS_STATE_ARCHIVE_DIR,
  AGENTS_STATE_DIR,
  AGENTS_STATE_GITIGNORE,
  agentsPathFromRoot,
  asGitignoreDir,
  OMA_PROJECT_GITIGNORE_PATTERNS,
} from "./paths.js";

describe("paths constants", () => {
  it("exposes stable agents runtime dirs", () => {
    expect(AGENTS_RESULTS_DIR).toBe(".agents/results");
    expect(AGENTS_STATE_DIR).toBe(".agents/state");
    expect(AGENTS_STATE_ARCHIVE_DIR).toBe(".agents/state/archive");
  });

  it("builds gitignore directory patterns with a trailing slash", () => {
    expect(asGitignoreDir(AGENTS_RESULTS_DIR)).toBe(".agents/results/");
    expect(AGENTS_RESULTS_GITIGNORE).toBe(".agents/results/");
    expect(AGENTS_STATE_GITIGNORE).toBe(".agents/state/");
  });

  it("lists managed project gitignore patterns", () => {
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".agents/results/");
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".agents/state/");
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".antigravitycli/");
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".agents/backup/");
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".migration-backup/");
    expect(OMA_PROJECT_GITIGNORE_PATTERNS).toContain(".qwen/tmp/");
  });

  it("agentsPathFromRoot resolves under POSIX project root", () => {
    expect(agentsPathFromRoot("/repo", AGENTS_RESULTS_DIR)).toBe(
      posix.join("/repo", ".agents", "results"),
    );
  });

  it("agentsPathFromRoot segments match win32.join layout", () => {
    const segments = AGENTS_RESULTS_DIR.split("/").filter(Boolean);
    expect(segments).toEqual([".agents", "results"]);
    expect(win32.join("C:\\repo", ...segments)).toBe(
      "C:\\repo\\.agents\\results",
    );
  });
});
