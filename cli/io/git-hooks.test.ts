import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CO_AUTHORS_ALLOW_FILE,
  ensureCoAuthorGuardHook,
  OMA_HOOKS_DIR,
} from "./git-hooks.js";

const created: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "oma-git-hooks-"));
  created.push(dir);
  execFileSync("git", ["init", "--quiet", "-b", "main"], {
    cwd: dir,
    stdio: ["ignore", "ignore", "ignore"],
  });
  execFileSync("git", ["config", "user.email", "dev@example.com"], {
    cwd: dir,
  });
  execFileSync("git", ["config", "user.name", "Dev"], { cwd: dir });
  return dir;
}

function writeConfig(
  repo: string,
  co_author: Record<string, unknown> | null,
): void {
  mkdirSync(join(repo, ".agents"), { recursive: true });
  const block =
    co_author === null
      ? ""
      : `  co_author:\n${Object.entries(co_author)
          .map(([k, v]) => `    ${k}: ${typeof v === "string" ? `"${v}"` : v}`)
          .join("\n")}\n`;
  writeFileSync(
    join(repo, ".agents", "oma-config.yaml"),
    `language: en\nscm:\n  conventional_commits: true\n${block}`,
  );
}

/** Commit `file` with `message`; returns git's exit status and stderr. */
function tryCommit(
  repo: string,
  file: string,
  message: string,
): { status: number | null; stderr: string } {
  writeFileSync(join(repo, file), `${file}\n`);
  execFileSync("git", ["add", "--", file], { cwd: repo });
  const res = spawnSync("git", ["commit", "-m", message], {
    cwd: repo,
    encoding: "utf-8",
  });
  return { status: res.status, stderr: res.stderr ?? "" };
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("ensureCoAuthorGuardHook", () => {
  it("skips a directory that is not a git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "oma-git-hooks-plain-"));
    created.push(dir);
    writeConfig(dir, { enabled: true, email: "bot@example.com" });

    const result = ensureCoAuthorGuardHook(dir);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("not a git repository");
    expect(existsSync(join(dir, OMA_HOOKS_DIR, "commit-msg"))).toBe(false);
  });

  it("skips when scm.co_author is disabled", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: false, email: "bot@example.com" });

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("scm.co_author disabled");
  });

  it("skips when enforce_hook is false", () => {
    const repo = makeRepo();
    writeConfig(repo, {
      enabled: true,
      email: "bot@example.com",
      enforce_hook: false,
    });

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("scm.co_author.enforce_hook is false");
  });

  it("writes an executable hook, seeds the allowlist, and claims core.hooksPath", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.status).toBe("written");
    expect(result.warning).toBeUndefined();

    const hook = join(repo, OMA_HOOKS_DIR, "commit-msg");
    expect(existsSync(hook)).toBe(true);
    // Execute bits: a hook without them is present but inert.
    expect(statSync(hook).mode & 0o111).not.toBe(0);

    const allow = readFileSync(
      join(repo, OMA_HOOKS_DIR, CO_AUTHORS_ALLOW_FILE),
      "utf-8",
    );
    expect(allow).toContain("Dev <dev@example.com>");

    const configured = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: repo,
      encoding: "utf-8",
    }).trim();
    expect(configured).toBe(OMA_HOOKS_DIR);
  });

  it("is idempotent and does not overwrite an edited allowlist", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);

    const allowPath = join(repo, OMA_HOOKS_DIR, CO_AUTHORS_ALLOW_FILE);
    writeFileSync(allowPath, "Someone <someone@example.com>\n");

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.status).toBe("unchanged");
    expect(result.written).toEqual([]);
    expect(readFileSync(allowPath, "utf-8")).toBe(
      "Someone <someone@example.com>\n",
    );
  });

  it("warns instead of hijacking a core.hooksPath owned by another tool", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    execFileSync("git", ["config", "core.hooksPath", ".husky"], { cwd: repo });

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.status).toBe("written");
    expect(result.warning).toContain(".husky");
    // The foreign setting is left exactly as the other tool wrote it.
    const configured = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: repo,
      encoding: "utf-8",
    }).trim();
    expect(configured).toBe(".husky");
  });

  it("points a husky user at the authored hook, not the generated shim", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    // husky sets core.hooksPath to its shim directory; `.husky/_/commit-msg` is
    // regenerated on every husky install, so edits there do not survive.
    execFileSync("git", ["config", "core.hooksPath", ".husky/_"], {
      cwd: repo,
    });

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.warning).toContain(".husky/commit-msg");
    expect(result.warning).not.toContain(".husky/_/commit-msg");
  });

  it("warns instead of disabling a pre-existing .git/hooks/commit-msg", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    const legacy = join(repo, ".git", "hooks", "commit-msg");
    writeFileSync(legacy, "#!/bin/sh\nexit 0\n");

    const result = ensureCoAuthorGuardHook(repo);

    expect(result.warning).toContain("already exists");
    const configured = spawnSync("git", ["config", "core.hooksPath"], {
      cwd: repo,
      encoding: "utf-8",
    });
    expect(configured.status).not.toBe(0);
  });
});

describe("the installed hook, enforced by git", () => {
  it("rejects a Co-authored-by address that is not allowed", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);

    const { status, stderr } = tryCommit(
      repo,
      "a.txt",
      "feat: thing\n\nCo-authored-by: Bot <typo@example.com>",
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("typo@example.com");
    expect(stderr).toContain("not on the allowlist");
  });

  it("accepts the address configured in oma-config.yaml", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);

    const { status } = tryCommit(
      repo,
      "b.txt",
      "feat: thing\n\nCo-Authored-By: Bot <BOT@example.com>",
    );

    expect(status).toBe(0);
  });

  it("accepts an address listed in the allowlist", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);
    writeFileSync(
      join(repo, OMA_HOOKS_DIR, CO_AUTHORS_ALLOW_FILE),
      "Real Person <real@example.com>\n",
    );

    const { status } = tryCommit(
      repo,
      "c.txt",
      "feat: thing\n\nCo-authored-by: Real Person <real@example.com>",
    );

    expect(status).toBe(0);
  });

  it("rejects only the bad address when several trailers are present", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);

    const { status, stderr } = tryCommit(
      repo,
      "d.txt",
      [
        "feat: thing",
        "",
        "Co-authored-by: Bot <bot@example.com>",
        "Co-authored-by: Nobody <nobody@example.com>",
      ].join("\n"),
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("nobody@example.com");
    expect(stderr).not.toContain("rejected: bot@example.com");
  });

  // The escape hatch oma prints when another tool owns core.hooksPath. Runners
  // like husky execute their hook file without `set -e`, so a bare call to the
  // guard prints the rejection and then has its exit code discarded by the next
  // command — the guard looks installed while permitting every bad address.
  // `|| exit 1` is what makes the suggested wiring actually work.
  it("propagates a rejection through the wiring oma tells users to add", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    const legacy = join(repo, ".git", "hooks", "commit-msg");
    writeFileSync(
      legacy,
      // `exit 0` stands in for the next hook in the chain succeeding.
      `#!/bin/sh\nsh ${OMA_HOOKS_DIR}/commit-msg "$1" || exit 1\nexit 0\n`,
    );
    chmodSync(legacy, 0o755);

    const result = ensureCoAuthorGuardHook(repo);
    expect(result.warning).toContain("|| exit 1");

    const { status, stderr } = tryCommit(
      repo,
      "f.txt",
      "feat: thing\n\nCo-authored-by: Bot <typo@example.com>",
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("typo@example.com");
  });

  it("would swallow the rejection without `|| exit 1` — why the snippet has it", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    const legacy = join(repo, ".git", "hooks", "commit-msg");
    writeFileSync(
      legacy,
      `#!/bin/sh\nsh ${OMA_HOOKS_DIR}/commit-msg "$1"\nexit 0\n`,
    );
    chmodSync(legacy, 0o755);
    ensureCoAuthorGuardHook(repo);

    const { status } = tryCommit(
      repo,
      "g.txt",
      "feat: thing\n\nCo-authored-by: Bot <typo@example.com>",
    );

    // Documents the trap rather than endorsing it: the bad address commits.
    expect(status).toBe(0);
  });

  it("leaves a commit without any trailer alone", () => {
    const repo = makeRepo();
    writeConfig(repo, { enabled: true, email: "bot@example.com" });
    ensureCoAuthorGuardHook(repo);

    const { status } = tryCommit(repo, "e.txt", "chore: no trailer");

    expect(status).toBe(0);
  });
});
