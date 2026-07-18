import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGENTS_BACKUP_GITIGNORE,
  AGENTS_RESULTS_GITIGNORE,
  AGENTS_STATE_GITIGNORE,
  ANTIGRAVITYCLI_GITIGNORE,
  DOCS_PLANS_GITIGNORE,
  MIGRATION_BACKUP_GITIGNORE,
} from "../constants/paths.js";
import {
  ensureGitignored,
  ensureOmaProjectGitignore,
  isGitRepo,
  isInIgnoredSet,
  isPathGitIgnored,
  listGitIgnoredPaths,
} from "./gitignore.js";

function makeRepo(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  execFileSync("git", ["init", "--quiet", "-b", "main"], {
    cwd: dir,
    stdio: ["ignore", "ignore", "ignore"],
  });
  return dir;
}

describe("isGitRepo", () => {
  let repo: string;
  let plain: string;

  beforeEach(() => {
    repo = makeRepo("oma-gitignore-isrepo-");
    plain = mkdtempSync(join(tmpdir(), "oma-gitignore-plain-"));
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(plain, { recursive: true, force: true });
  });

  it("returns true inside a git work tree", () => {
    expect(isGitRepo(repo)).toBe(true);
  });

  it("returns false in a plain directory", () => {
    expect(isGitRepo(plain)).toBe(false);
  });
});

describe("ensureGitignored", () => {
  let repo: string;

  beforeEach(() => {
    repo = makeRepo("oma-gitignore-ensure-");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("creates .gitignore when missing and writes the patterns", () => {
    const result = ensureGitignored(repo, ["docs/generated/"]);

    expect(result.skipped).toBe(false);
    expect(result.added).toEqual(["docs/generated/"]);
    expect(result.alreadyPresent).toEqual([]);

    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content).toContain("docs/generated/");
  });

  it("appends patterns when .gitignore already exists", () => {
    writeFileSync(join(repo, ".gitignore"), "node_modules\n");

    const result = ensureGitignored(repo, ["docs/generated/"]);

    expect(result.added).toEqual(["docs/generated/"]);
    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules");
    expect(content).toContain("docs/generated/");
  });

  it("does not duplicate exact-match patterns", () => {
    writeFileSync(join(repo, ".gitignore"), "docs/generated/\n");

    const result = ensureGitignored(repo, ["docs/generated/"]);

    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(["docs/generated/"]);

    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content.match(/docs\/generated\//g)?.length).toBe(1);
  });

  it("ignores comments and blanks when checking for duplicates", () => {
    writeFileSync(
      join(repo, ".gitignore"),
      "# generated artifacts\n\ndocs/generated/\n",
    );

    const result = ensureGitignored(repo, ["docs/generated/"]);
    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(["docs/generated/"]);
  });

  it("writes header once and skips it on the second run", () => {
    const opts = { header: "# oma docs generated" };

    const first = ensureGitignored(repo, ["docs/generated/"], opts);
    expect(first.added).toEqual(["docs/generated/"]);

    const second = ensureGitignored(repo, ["other/path/"], opts);
    expect(second.added).toEqual(["other/path/"]);

    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content.match(/# oma docs generated/g)?.length).toBe(1);
    expect(content).toContain("docs/generated/");
    expect(content).toContain("other/path/");
  });

  it("normalises missing trailing newline before appending", () => {
    writeFileSync(join(repo, ".gitignore"), "node_modules");

    ensureGitignored(repo, ["docs/generated/"]);

    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    const lines = content.split("\n");
    expect(lines).toContain("node_modules");
    expect(lines).toContain("docs/generated/");
  });

  it("returns skipped: true outside a git repo", () => {
    const plain = mkdtempSync(join(tmpdir(), "oma-gitignore-noop-"));
    try {
      const result = ensureGitignored(plain, ["docs/generated/"]);
      expect(result).toEqual({
        added: [],
        alreadyPresent: [],
        skipped: true,
      });
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it("treats trimmed patterns as identical to existing ones", () => {
    writeFileSync(join(repo, ".gitignore"), "docs/generated/\n");

    const result = ensureGitignored(repo, ["  docs/generated/  "]);
    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(["docs/generated/"]);
  });
});

describe("ensureOmaProjectGitignore", () => {
  let repo: string;

  beforeEach(() => {
    repo = makeRepo("oma-gitignore-oma-project-");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("adds managed patterns when missing", () => {
    const result = ensureOmaProjectGitignore(repo);

    expect(result.skipped).toBe(false);
    expect(result.added).toEqual([
      ANTIGRAVITYCLI_GITIGNORE,
      AGENTS_RESULTS_GITIGNORE,
      AGENTS_STATE_GITIGNORE,
      AGENTS_BACKUP_GITIGNORE,
      DOCS_PLANS_GITIGNORE,
      MIGRATION_BACKUP_GITIGNORE,
    ]);

    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content).toContain(ANTIGRAVITYCLI_GITIGNORE);
    expect(content).toContain(AGENTS_RESULTS_GITIGNORE);
    expect(content).toContain(AGENTS_STATE_GITIGNORE);
    expect(content).toContain(AGENTS_BACKUP_GITIGNORE);
    expect(content).toContain(DOCS_PLANS_GITIGNORE);
    expect(content).toContain(MIGRATION_BACKUP_GITIGNORE);
    expect(content).toContain(
      "# oh-my-agent runtime (local artifacts — do not commit)",
    );
  });

  it("adds only missing patterns when one entry already exists", () => {
    writeFileSync(join(repo, ".gitignore"), ".antigravitycli/\n");

    const result = ensureOmaProjectGitignore(repo);

    expect(result.added).toEqual([
      AGENTS_RESULTS_GITIGNORE,
      AGENTS_STATE_GITIGNORE,
      AGENTS_BACKUP_GITIGNORE,
      DOCS_PLANS_GITIGNORE,
      MIGRATION_BACKUP_GITIGNORE,
    ]);
    expect(result.alreadyPresent).toEqual([ANTIGRAVITYCLI_GITIGNORE]);
  });

  it("does not duplicate existing entries", () => {
    writeFileSync(
      join(repo, ".gitignore"),
      ".antigravitycli/\n.agents/results/\n.agents/state/\n.agents/backup/\ndocs/plans/\n.migration-backup/\n",
    );

    const result = ensureOmaProjectGitignore(repo);

    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual([
      ANTIGRAVITYCLI_GITIGNORE,
      AGENTS_RESULTS_GITIGNORE,
      AGENTS_STATE_GITIGNORE,
      AGENTS_BACKUP_GITIGNORE,
      DOCS_PLANS_GITIGNORE,
      MIGRATION_BACKUP_GITIGNORE,
    ]);
    const content = readFileSync(join(repo, ".gitignore"), "utf-8");
    expect(content.match(/\.antigravitycli\//g)?.length).toBe(1);
    expect(content.match(/\.agents\/results\//g)?.length).toBe(1);
    expect(content.match(/\.agents\/state\//g)?.length).toBe(1);
    expect(content.match(/docs\/plans\//g)?.length).toBe(1);
    expect(content.match(/\.migration-backup\//g)?.length).toBe(1);
  });

  it("appends slash patterns when only a different line shape exists", () => {
    writeFileSync(join(repo, ".gitignore"), ".agents/results\n");

    const result = ensureOmaProjectGitignore(repo);

    expect(result.alreadyPresent).toEqual([]);
    expect(result.added).toContain(AGENTS_RESULTS_GITIGNORE);
  });
});

describe("isPathGitIgnored", () => {
  let repo: string;

  beforeEach(() => {
    repo = makeRepo("oma-gitignore-check-");
    writeFileSync(join(repo, ".gitignore"), "build/\n*.log\n");
    mkdirSync(join(repo, "build"), { recursive: true });
    writeFileSync(join(repo, "build", "out.txt"), "x");
    writeFileSync(join(repo, "app.log"), "y");
    writeFileSync(join(repo, "src.ts"), "z");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("returns true for a path covered by .gitignore", () => {
    expect(isPathGitIgnored(join(repo, "build", "out.txt"), repo)).toBe(true);
    expect(isPathGitIgnored(join(repo, "app.log"), repo)).toBe(true);
  });

  it("returns false for a tracked-eligible path", () => {
    expect(isPathGitIgnored(join(repo, "src.ts"), repo)).toBe(false);
  });

  it("returns false outside a git repo", () => {
    const plain = mkdtempSync(join(tmpdir(), "oma-gitignore-plain-"));
    try {
      expect(isPathGitIgnored(join(plain, "anything.log"), plain)).toBe(false);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });
});

describe("listGitIgnoredPaths + isInIgnoredSet", () => {
  let repo: string;

  beforeEach(() => {
    repo = makeRepo("oma-gitignore-list-");
    writeFileSync(join(repo, ".gitignore"), "build/\n*.log\n");
    mkdirSync(join(repo, "build"), { recursive: true });
    writeFileSync(join(repo, "build", "out.txt"), "x");
    writeFileSync(join(repo, "build", "nested.log"), "x");
    writeFileSync(join(repo, "root.log"), "y");
    writeFileSync(join(repo, "src.ts"), "z");
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("collects ignored entries with absolute paths", () => {
    const set = listGitIgnoredPaths(repo);

    expect(isInIgnoredSet(join(repo, "root.log"), set)).toBe(true);
    expect(isInIgnoredSet(join(repo, "build", "out.txt"), set)).toBe(true);
    expect(isInIgnoredSet(join(repo, "src.ts"), set)).toBe(false);
  });

  it("returns an empty Set outside a git repo", () => {
    const plain = mkdtempSync(join(tmpdir(), "oma-gitignore-list-noop-"));
    try {
      expect(listGitIgnoredPaths(plain).size).toBe(0);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });
});
