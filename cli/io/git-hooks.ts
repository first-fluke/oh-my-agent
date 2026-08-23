/**
 * Git `commit-msg` guard for `Co-authored-by:` trailers.
 *
 * oma instructs agents to append a `Co-authored-by:` trailer, and agents compose
 * commit messages as literal text. A model can therefore emit the address from
 * memory and get it wrong even with the correct value in context. That mistake
 * is not inert: GitHub resolves a co-author address against verified account
 * emails and credits whoever owns it as a repository contributor. The
 * attribution then survives a history rewrite, because `refs/pull/*` keeps the
 * original commits reachable for the lifetime of the repository — the only
 * remedies left are a support ticket or deleting the repository.
 *
 * Prose in a skill file cannot prevent a typo. A `commit-msg` hook can, and it
 * covers every vendor at once because git enforces it below the agent.
 */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { loadOmaConfig } from "../utils/config.js";
import { isRecord } from "../utils/type-guards.js";
import { isGitRepo } from "./gitignore.js";

/** Directory (repo-relative) that holds the oma-managed hooks. */
export const OMA_HOOKS_DIR = ".githooks";

/** Allowlist consulted by the hook, alongside `scm.co_author.email`. */
export const CO_AUTHORS_ALLOW_FILE = "co-authors.allow";

/**
 * The hook body. Kept as POSIX `sh` with no runtime dependency so it works on a
 * bare checkout — a hook that needs `node` or `bun` on PATH is a hook that
 * silently stops running.
 *
 * Allowed addresses come from two places, unioned: `co-authors.allow` next to
 * the hook, and `scm.co_author.email` in `.agents/oma-config.yaml`. Reading the
 * config at commit time (rather than baking the address in) means changing the
 * co-author in `oma-config.yaml` does not require reinstalling the hook.
 */
export const CO_AUTHOR_GUARD_HOOK = `#!/bin/sh
#
# Managed by oh-my-agent. Rejects commits whose Co-authored-by trailer carries
# an address that is not on the allowlist.
#
# GitHub resolves a co-author address against verified account emails and
# credits that account as a contributor. A wrong address therefore attributes
# your work to an unrelated person, and refs/pull/* keeps the commit reachable
# permanently, so rewriting history does not undo it.
#
# Allowlist: ${OMA_HOOKS_DIR}/${CO_AUTHORS_ALLOW_FILE}, plus scm.co_author.email
# from .agents/oma-config.yaml.

set -eu

msg_file="$1"
repo_root=$(git rev-parse --show-toplevel)
allow_file="$repo_root/${OMA_HOOKS_DIR}/${CO_AUTHORS_ALLOW_FILE}"
oma_config="$repo_root/.agents/oma-config.yaml"

allowed=$(
	{
		if [ -f "$allow_file" ]; then
			sed -e 's/#.*$//' "$allow_file" |
				grep -oE '<[^>]+>' |
				tr -d '<>'
		fi

		# The \`email:\` key inside the co_author block. Scoped to the lines
		# following \`co_author:\` so an unrelated \`email:\` is not picked up.
		if [ -f "$oma_config" ]; then
			grep -A 3 '^[[:space:]]*co_author:' "$oma_config" |
				grep -E '^[[:space:]]*email:' |
				sed -e 's/.*email:[[:space:]]*//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\\$//"
		fi
	} | tr '[:upper:]' '[:lower:]' | sed '/^[[:space:]]*$/d' | sort -u
)

found=$(
	grep -iE '^[[:space:]]*co-authored-by:' "$msg_file" 2>/dev/null |
		grep -oE '<[^>]+>' |
		tr -d '<>' |
		tr '[:upper:]' '[:lower:]' |
		sed '/^[[:space:]]*$/d' |
		sort -u || true
)

[ -n "$found" ] || exit 0

bad=""
for email in $found; do
	if ! printf '%s\\n' "$allowed" | grep -qxF "$email"; then
		bad="$bad $email"
	fi
done

[ -n "$bad" ] || exit 0

exec >&2
echo
echo "commit-msg: Co-authored-by address is not on the allowlist."
echo
for email in $bad; do
	echo "  rejected: $email"
done
echo
echo "allowed:"
if [ -n "$allowed" ]; then
	printf '  %s\\n' $allowed
else
	echo "  (none — check ${OMA_HOOKS_DIR}/${CO_AUTHORS_ALLOW_FILE})"
fi
echo
echo "GitHub matches co-author addresses against verified account emails and"
echo "credits that account as a contributor. A wrong address attributes your"
echo "work to an unrelated person, and refs/pull/* makes it permanent."
echo
echo "For a real collaborator, add them to ${OMA_HOOKS_DIR}/${CO_AUTHORS_ALLOW_FILE}."
echo
exit 1
`;

/** Template written once, then owned by the user. */
function allowFileTemplate(seedEmails: string[]): string {
  const seeds = seedEmails.length > 0 ? `\n${seedEmails.join("\n")}\n` : "\n";
  return `# Allowed Co-authored-by identities, one "Name <email>" per line.
# Enforced by ${OMA_HOOKS_DIR}/commit-msg. Only the address inside <> is compared.
#
# Add a line here only for a real collaborator. A wrong address silently
# credits whoever has it verified on GitHub, and refs/pull/* makes that
# permanent.
#
# scm.co_author.email from .agents/oma-config.yaml is allowed automatically
# and does not need an entry here.
${seeds}`;
}

export interface CoAuthorGuardResult {
  /** `written` covers both a first install and an update of a drifted hook. */
  status: "written" | "unchanged" | "skipped";
  /** Why the pass did nothing — set for `skipped`. */
  reason?: string;
  /**
   * Set when the hook was installed but cannot run, because another tool owns
   * `core.hooksPath` or a legacy `.git/hooks/commit-msg` is in the way. The
   * caller surfaces this; oma does not edit another tool's hooks.
   */
  warning?: string;
  /** Absolute paths written this pass. */
  written: string[];
}

/**
 * Read `scm.co_author` from oma-config.yaml.
 *
 * The guard is installed only when a co-author trailer is actually configured:
 * that is precisely when oma tells agents to type an address, and so the only
 * time the failure mode exists. `enforce_hook: false` opts out for users who
 * do not want oma touching git config.
 */
export function loadCoAuthorGuardSettings(cwd?: string): {
  enabled: boolean;
  enforceHook: boolean;
  email?: string;
} {
  const config = loadOmaConfig(cwd) as unknown as {
    scm?: { co_author?: unknown };
  } | null;
  const scm = isRecord(config?.scm) ? config.scm : undefined;
  const raw = isRecord(scm?.co_author) ? scm.co_author : {};
  const email = raw.email;
  return {
    enabled: raw.enabled === true,
    enforceHook: raw.enforce_hook !== false,
    email: typeof email === "string" ? email : undefined,
  };
}

/** `git config <key>` in `repoRoot`, or undefined when unset. */
function gitConfig(repoRoot: string, key: string): string | undefined {
  const res = spawnSync("git", ["config", key], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (res.status !== 0 || typeof res.stdout !== "string") return undefined;
  const value = res.stdout.trim();
  return value.length > 0 ? value : undefined;
}

function setGitConfig(repoRoot: string, key: string, value: string): boolean {
  const res = spawnSync("git", ["config", "--local", key, value], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  return res.status === 0;
}

/**
 * Install the co-author guard into `repoRoot`. Idempotent: rewrites the hook
 * only when its content drifted, and never overwrites an existing allowlist.
 *
 * Called from `link()` in project mode. A global install has no repository to
 * attach hooks to, so the caller gates on install mode.
 */
export function ensureCoAuthorGuardHook(repoRoot: string): CoAuthorGuardResult {
  const written: string[] = [];

  if (!isGitRepo(repoRoot)) {
    return { status: "skipped", reason: "not a git repository", written };
  }

  const settings = loadCoAuthorGuardSettings(repoRoot);
  if (!settings.enabled) {
    return { status: "skipped", reason: "scm.co_author disabled", written };
  }
  if (!settings.enforceHook) {
    return {
      status: "skipped",
      reason: "scm.co_author.enforce_hook is false",
      written,
    };
  }

  const hooksDir = resolve(repoRoot, OMA_HOOKS_DIR);
  const hookPath = join(hooksDir, "commit-msg");
  const allowPath = join(hooksDir, CO_AUTHORS_ALLOW_FILE);

  mkdirSync(hooksDir, { recursive: true });

  let changed = false;
  const current = existsSync(hookPath)
    ? readFileSync(hookPath, "utf-8")
    : undefined;
  if (current !== CO_AUTHOR_GUARD_HOOK) {
    writeFileSync(hookPath, CO_AUTHOR_GUARD_HOOK);
    written.push(hookPath);
    changed = true;
  }
  // Re-applied unconditionally: a checkout that lost the executable bit leaves
  // the hook present but inert, which is the failure this module exists to stop.
  chmodSync(hookPath, 0o755);

  if (!existsSync(allowPath)) {
    // Seed the committer's own identity so a self-co-authored commit — which
    // some workflows produce — does not trip the guard on a fresh install.
    const self = gitConfig(repoRoot, "user.email");
    const name = gitConfig(repoRoot, "user.name") ?? "You";
    writeFileSync(
      allowPath,
      allowFileTemplate(self ? [`${name} <${self}>`] : []),
    );
    written.push(allowPath);
    changed = true;
  }

  // core.hooksPath: claim it only when free. Another tool owning it (husky,
  // lefthook) is a configuration oma must not silently take over, and a legacy
  // .git/hooks/commit-msg would be disabled the moment hooksPath is set.
  let warning: string | undefined;
  const configured = gitConfig(repoRoot, "core.hooksPath");
  if (configured === undefined) {
    const legacy = join(repoRoot, ".git", "hooks", "commit-msg");
    if (existsSync(legacy)) {
      warning =
        `${legacy} already exists; core.hooksPath left unset so it keeps running. ` +
        `Add \`sh ${OMA_HOOKS_DIR}/commit-msg "$1" || exit 1\` to it to enable the co-author guard.`;
    } else if (!setGitConfig(repoRoot, "core.hooksPath", OMA_HOOKS_DIR)) {
      warning = `Could not set core.hooksPath to ${OMA_HOOKS_DIR}.`;
    }
  } else if (configured !== OMA_HOOKS_DIR) {
    // husky points core.hooksPath at `.husky/_`, a directory of generated shims
    // that it rewrites on install. The hook a user edits lives one level up, so
    // naming the shim here would send them to a file their next `husky` run
    // overwrites.
    const authored = configured.replace(/\/_\/?$/, "");
    // `|| exit 1` is load-bearing: these runners execute the hook file without
    // `set -e`, so a bare call prints the rejection and then has it discarded by
    // the exit code of whatever command runs next.
    warning =
      `core.hooksPath is ${configured} (managed by another tool), so the guard is not active. ` +
      `Add \`sh ${OMA_HOOKS_DIR}/commit-msg "$1" || exit 1\` to ${authored}/commit-msg to enable it.`;
  }

  return {
    status: changed ? "written" : "unchanged",
    warning,
    written,
  };
}
