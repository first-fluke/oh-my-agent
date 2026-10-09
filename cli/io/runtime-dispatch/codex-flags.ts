import { mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { splitArgs } from "../../platform/agent-config.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { profileStateHome } from "../../utils/oma-home.js";

/**
 * Codex full access: no sandbox and no approvals. Never a default; selected
 * only by an explicit `auto_approve_flag` or `OMA_CODEX_SANDBOX`.
 */
export const CODEX_FULL_ACCESS_FLAG =
  "--dangerously-bypass-approvals-and-sandbox";

/**
 * Durable sandbox override for spawned Codex agents. cli-config.yaml is
 * replaced by `oma update`, so a persistent choice lives in the environment.
 */
export const CODEX_SANDBOX_ENV = "OMA_CODEX_SANDBOX";

export const CODEX_SANDBOX_MODES = [
  "workspace-write",
  "read-only",
  "danger-full-access",
] as const;

export type CodexSandboxMode = (typeof CODEX_SANDBOX_MODES)[number];

// Codex 0.153 removed `--full-auto`, which meant the workspace-write sandbox.
const LEGACY_FULL_AUTO_FLAG = "--full-auto";

/**
 * Package-manager caches and stores under $HOME. Installs inside the sandbox
 * write here (verified: bun and npm fail with EPERM without them). Only
 * directories that already exist are granted.
 */
const PACKAGE_CACHE_DIRS: readonly (readonly string[])[] = [
  [".bun", "install", "cache"],
  [".npm"],
  [".cache"],
  ["Library", "Caches"],
  ["Library", "pnpm"],
  [".local", "share", "pnpm"],
  [".yarn", "berry", "cache"],
  [".cargo", "registry"],
  [".cargo", "git"],
  ["go", "pkg", "mod"],
  [".gradle", "caches"],
  [".m2", "repository"],
  [".pub-cache"],
];

export interface CodexSandboxContext {
  /** Absolute workspace the Codex process runs in (its cwd). */
  workspace?: string;
  env?: NodeJS.ProcessEnv;
  home?: string;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isWithin(path: string, parent: string): boolean {
  const rel = relative(parent, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * A linked worktree or submodule keeps its git directory outside the working
 * tree (`.git` is a `gitdir:` file). Git writes refs and objects there.
 */
function externalGitDir(root: string): string | null {
  let pointer: string;
  try {
    pointer = String(readFileSync(join(root, ".git"), "utf-8"));
  } catch {
    return null;
  }
  const gitdir = pointer.match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (!gitdir) return null;
  const gitDir = resolve(root, gitdir);
  try {
    const common = String(readFileSync(join(gitDir, "commondir"), "utf-8"));
    if (common.trim()) return resolve(gitDir, common.trim());
  } catch {
    // Submodules have no commondir; their git directory is self-contained.
  }
  return gitDir;
}

/**
 * Directories a sandboxed Codex agent needs beyond its cwd: the project root
 * when the workspace is a subdirectory (result claims and verification
 * receipts live in `<root>/.agents/state`), an external git directory, the
 * OMA state home (`oma state emit`, `oma agent verify`), and package caches.
 */
export function codexWritableRoots(
  context: CodexSandboxContext = {},
): string[] {
  const env = context.env ?? process.env;
  const home = context.home ?? homedir();
  const workspace = context.workspace ? resolve(context.workspace) : undefined;
  const candidates: string[] = [];
  if (workspace) {
    const projectRoot = resolve(resolveProjectRoot(workspace));
    candidates.push(projectRoot);
    const gitDir = externalGitDir(projectRoot);
    if (gitDir) candidates.push(gitDir);
  }
  const omaStateHome = profileStateHome(env, home);
  // OMA creates its state home on first use. Create it now so the grant also
  // covers the first `oma state emit` a sandboxed agent makes on a fresh machine.
  try {
    mkdirSync(omaStateHome, { recursive: true, mode: 0o700 });
  } catch {
    // Unwritable home: the grant is skipped like any other missing root.
  }
  candidates.push(omaStateHome);
  for (const parts of PACKAGE_CACHE_DIRS) candidates.push(join(home, ...parts));

  const roots: string[] = [];
  for (const dir of candidates) {
    if (workspace && isWithin(dir, workspace)) continue;
    if (roots.some((root) => isWithin(dir, root))) continue;
    if (isDirectory(dir)) roots.push(dir);
  }
  return roots;
}

function sandboxOverride(env: NodeJS.ProcessEnv): CodexSandboxMode | null {
  const raw = env[CODEX_SANDBOX_ENV]?.trim().toLowerCase();
  if (!raw) return null;
  if ((CODEX_SANDBOX_MODES as readonly string[]).includes(raw)) {
    return raw as CodexSandboxMode;
  }
  console.warn(
    `[agent-spawn] ignoring ${CODEX_SANDBOX_ENV}=${JSON.stringify(raw)}; expected one of ${CODEX_SANDBOX_MODES.join(", ")}. Using workspace-write.`,
  );
  return "workspace-write";
}

/**
 * An unset flag, the removed `--full-auto`, and the shipped
 * `--sandbox workspace-write` all select OMA's default sandbox policy.
 */
function selectsDefaultPolicy(configured: string | undefined): boolean {
  const tokens = configured ? splitArgs(configured) : [];
  if (tokens.length === 0) return true;
  if (tokens.length === 1) {
    return (
      tokens[0] === LEGACY_FULL_AUTO_FLAG ||
      tokens[0] === "--sandbox=workspace-write"
    );
  }
  return (
    tokens.length === 2 &&
    (tokens[0] === "--sandbox" || tokens[0] === "-s") &&
    tokens[1] === "workspace-write"
  );
}

/**
 * Codex permission argv for a write-capable spawn. The default keeps Codex's
 * workspace-write sandbox, enables network for installs and searches, and
 * grants the extra roots from {@link codexWritableRoots}. Any other configured
 * flag is used verbatim; `OMA_CODEX_SANDBOX` overrides both.
 */
export function resolveCodexAutoApproveArgs(
  configured: string | undefined,
  context: CodexSandboxContext = {},
): string[] {
  const env = context.env ?? process.env;
  const override = sandboxOverride(env);
  if (!override && !selectsDefaultPolicy(configured)) {
    return splitArgs(configured as string);
  }
  if (override === "danger-full-access") return [CODEX_FULL_ACCESS_FLAG];
  if (override === "read-only") return ["--sandbox", "read-only"];
  return [
    "--sandbox",
    "workspace-write",
    "-c",
    "sandbox_workspace_write.network_access=true",
    ...codexWritableRoots({ ...context, env }).flatMap((dir) => [
      "--add-dir",
      dir,
    ]),
  ];
}
