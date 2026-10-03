import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CODEX_FULL_ACCESS_FLAG,
  codexWritableRoots,
  resolveCodexAutoApproveArgs,
} from "./codex-flags.js";

const SANDBOX_PREFIX = [
  "--sandbox",
  "workspace-write",
  "-c",
  "sandbox_workspace_write.network_access=true",
];

describe("resolveCodexAutoApproveArgs", () => {
  let base: string;
  let home: string;
  const env: NodeJS.ProcessEnv = {};
  // The default sandbox always grants the OMA state home (created on demand).
  const sandboxArgs = () => [
    ...SANDBOX_PREFIX,
    "--add-dir",
    join(home, ".oma"),
  ];

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), "oma-codex-flags-"));
    home = join(base, "home");
    mkdirSync(home);
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it.each([
    [undefined],
    [""],
    ["--full-auto"],
    ["--sandbox workspace-write"],
    ["--sandbox=workspace-write"],
    ["-s workspace-write"],
  ])("maps %j to the workspace-write sandbox with network", (configured) => {
    const args = resolveCodexAutoApproveArgs(configured, { env, home });
    expect(args).toEqual(sandboxArgs());
    expect(args).not.toContain(CODEX_FULL_ACCESS_FLAG);
  });

  it("honors an explicit full-access flag verbatim", () => {
    expect(
      resolveCodexAutoApproveArgs(CODEX_FULL_ACCESS_FLAG, { env, home }),
    ).toEqual([CODEX_FULL_ACCESS_FLAG]);
  });

  it("splits any other configured value into argv tokens", () => {
    expect(
      resolveCodexAutoApproveArgs("--sandbox danger-full-access", {
        env,
        home,
      }),
    ).toEqual(["--sandbox", "danger-full-access"]);
  });

  it("OMA_CODEX_SANDBOX overrides the configured flag", () => {
    expect(
      resolveCodexAutoApproveArgs(undefined, {
        env: { OMA_CODEX_SANDBOX: "danger-full-access" },
        home,
      }),
    ).toEqual([CODEX_FULL_ACCESS_FLAG]);
    expect(
      resolveCodexAutoApproveArgs("--full-auto", {
        env: { OMA_CODEX_SANDBOX: "read-only" },
        home,
      }),
    ).toEqual(["--sandbox", "read-only"]);
    expect(
      resolveCodexAutoApproveArgs(CODEX_FULL_ACCESS_FLAG, {
        env: { OMA_CODEX_SANDBOX: " Workspace-Write " },
        home,
      }),
    ).toEqual(sandboxArgs());
  });

  it("falls back to the sandbox when OMA_CODEX_SANDBOX is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      resolveCodexAutoApproveArgs(CODEX_FULL_ACCESS_FLAG, {
        env: { OMA_CODEX_SANDBOX: "yolo" },
        home,
      }),
    ).toEqual(sandboxArgs());
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("OMA_CODEX_SANDBOX"),
    );
  });

  it("grants existing writable roots with --add-dir", () => {
    mkdirSync(join(home, ".npm"));
    mkdirSync(join(home, ".bun", "install", "cache"), { recursive: true });
    mkdirSync(join(home, ".oma"));
    const args = resolveCodexAutoApproveArgs(undefined, { env, home });
    expect(args.slice(0, SANDBOX_PREFIX.length)).toEqual(SANDBOX_PREFIX);
    expect(args.slice(SANDBOX_PREFIX.length)).toEqual([
      "--add-dir",
      join(home, ".oma"),
      "--add-dir",
      join(home, ".bun", "install", "cache"),
      "--add-dir",
      join(home, ".npm"),
    ]);
  });
});

describe("codexWritableRoots", () => {
  let base: string;
  let home: string;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), "oma-codex-roots-"));
    home = join(base, "home");
    mkdirSync(home);
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("skips missing cache directories", () => {
    expect(codexWritableRoots({ env: {}, home })).toEqual([join(home, ".oma")]);
  });

  it("creates a missing OMA state home so the first state write is granted", () => {
    const stateHome = join(base, "fresh-state");
    expect(existsSync(stateHome)).toBe(false);
    expect(
      codexWritableRoots({ env: { OMA_STATE_HOME: stateHome }, home }),
    ).toEqual([stateHome]);
    expect(statSync(stateHome).isDirectory()).toBe(true);
    if (process.platform !== "win32") {
      expect(statSync(stateHome).mode & 0o777).toBe(0o700);
    }
  });

  it("uses an absolute OMA_STATE_HOME and ignores a relative one", () => {
    const stateHome = join(base, "state");
    mkdirSync(stateHome);
    mkdirSync(join(home, ".oma"));
    expect(
      codexWritableRoots({ env: { OMA_STATE_HOME: stateHome }, home }),
    ).toEqual([stateHome]);
    expect(
      codexWritableRoots({ env: { OMA_STATE_HOME: "relative/state" }, home }),
    ).toEqual([join(home, ".oma")]);
  });

  it("grants the project root when the workspace is a subdirectory", () => {
    const project = join(base, "repo");
    const workspace = join(project, "apps", "api");
    mkdirSync(join(project, ".agents"), { recursive: true });
    writeFileSync(
      join(project, ".agents", "oma-config.yaml"),
      "language: en\n",
    );
    mkdirSync(workspace, { recursive: true });
    expect(codexWritableRoots({ workspace, env: {}, home })).toEqual([
      project,
      join(home, ".oma"),
    ]);
    expect(codexWritableRoots({ workspace: project, env: {}, home })).toEqual([
      join(home, ".oma"),
    ]);
  });

  it("does not repeat roots inside the workspace or another granted root", () => {
    const project = join(base, "repo");
    const workspace = join(project, "apps", "api");
    mkdirSync(join(project, ".agents"), { recursive: true });
    writeFileSync(
      join(project, ".agents", "oma-config.yaml"),
      "language: en\n",
    );
    mkdirSync(workspace, { recursive: true });
    const nestedState = join(project, ".agents", "state-home");
    mkdirSync(nestedState);
    const insideWorkspace = join(workspace, ".oma-state");
    mkdirSync(insideWorkspace);
    expect(
      codexWritableRoots({
        workspace,
        env: { OMA_STATE_HOME: nestedState },
        home,
      }),
    ).toEqual([project]);
    expect(
      codexWritableRoots({
        workspace,
        env: { OMA_STATE_HOME: insideWorkspace },
        home,
      }),
    ).toEqual([project]);
  });

  it("grants the common git directory of a linked worktree", () => {
    const commonGit = join(base, "main", ".git");
    const worktreeGitDir = join(commonGit, "worktrees", "wt");
    mkdirSync(worktreeGitDir, { recursive: true });
    writeFileSync(join(worktreeGitDir, "commondir"), "../..\n");
    const worktree = join(base, "wt");
    mkdirSync(join(worktree, ".agents"), { recursive: true });
    writeFileSync(join(worktree, ".git"), `gitdir: ${worktreeGitDir}\n`);
    expect(codexWritableRoots({ workspace: worktree, env: {}, home })).toEqual([
      commonGit,
      join(home, ".oma"),
    ]);
  });

  it("grants a submodule's external git directory", () => {
    const moduleGitDir = join(base, "super", ".git", "modules", "lib");
    mkdirSync(moduleGitDir, { recursive: true });
    const submodule = join(base, "super", "lib");
    mkdirSync(submodule, { recursive: true });
    writeFileSync(join(submodule, ".git"), "gitdir: ../.git/modules/lib\n");
    expect(codexWritableRoots({ workspace: submodule, env: {}, home })).toEqual(
      [moduleGitDir, join(home, ".oma")],
    );
  });
});
