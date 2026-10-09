# Profile session storage

New OMA L1 sessions live under `~/.oma/u/0/sessions/`. The `0` is a local
profile slot, not a Git email hash or an OS user ID. Git and login are not
required. Automatically generated session IDs use the UTC creation date and
16 cryptographically random, URL-safe characters:

```text
~/.oma/
└── u/0/
    ├── profile.json
    ├── sessions/
    │   └── 2026-09-06_b6CHZoYzuF75f0nb/
    │       ├── context.json
    │       ├── meta.json
    │       ├── events.jsonl
    │       └── inject-log/
    └── projects/<project-id>/
        ├── _index.json
        ├── locks/
        └── archive/<YYYY-MM>/<session-id>/
```

The ID and directory remain unchanged when a session resumes on another day.
Explicit and legacy session IDs remain supported. Injection logs are created
when needed.

## Profiles and future login

The first state write creates `profile.json` with a persistent random
`profileId`, its local `slot`, a `createdAt` timestamp, `schemaVersion: 1`, and
`account: null`. Repeated writes preserve this identity. A future login flow
can link an account using `account: { issuer, subject }`, where `subject` is
the stable server account ID. Email changes do not require moving sessions.
The storage contract and local profile CLI do not implement provider login,
credential storage, or synchronization.

The process selects a profile through `OMA_PROFILE` (default `0`). Profile
slots are non-negative decimal integers. For example:

```bash
OMA_PROFILE=1 oma state
```

Manage local profile slots with `oma profile list`, `oma profile create 1`,
and `oma profile show`. Listing and inspection do not create a profile.
To select an existing profile in the current Bash or Zsh shell, evaluate the
activation command:

```bash
eval "$(oma profile use 1 --shell zsh)"
oma profile show
```

Profile selection uses `OMA_PROFILE`, so commands and vendor hooks launched
from that shell agree. Running `oma profile use 1` by itself prints activation
guidance; it cannot change its parent shell. Already-running applications keep
their existing environment. No CLI-only default is persisted.

To select a profile for one process and its children, use
`oma profile run 1 -- oma state list`. Arguments after `--` belong to the
child command, including its help and output-format flags. The parent shell's
profile remains unchanged.

`OMA_HOME` selects the absolute OMA global storage root, defaulting to `~/.oma`.
Profile storage normally follows it at `OMA_HOME/u/<profile>/`. An explicit
`OMA_STATE_HOME` overrides only profile/L1/project runtime storage and points
to the directory containing `u/`; it does not relocate global definitions,
schedules, or service state. Both the CLI and standalone hooks use these
environment settings; configure them consistently in their launch environment.

## Project isolation

`context.json` binds a session to its profile and project. The project ID is
a SHA-256 digest of the canonical absolute project/worktree path. It does not
depend on Git configuration. Symlink aliases of an existing directory share
an identity; different worktrees have separate identities.

Active pointers and index locks are scoped to both profile and project.
`oma state`, repair, archive, purge, and memory GC operate only on the current
project's sessions in the selected profile. The archive is also stored in
the home directory. A direct read or write of another project's session ID
is rejected.

Use `oma state list --all-projects` to explicitly list home sessions across
projects in the selected profile. Add `--project <id-or-path>` or
`--search <text>` to narrow the aggregate list, and `--json` for structured
output. This is read-only discovery: it does not relax project-scoped writes,
activation, archive, purge, or repair. Legacy sessions in other repositories
remain discoverable from those repositories until migrated to home storage.

New home sessions survive repository deletion and can be inspected through
the storage APIs with their original canonical project path. Moving a project
to a different path changes its project ID; automatic relocation is not part
of this change. Session storage does not relocate project configuration,
coordination memories, retry queues, or other project artifacts.

## Existing installations

Profile `0` continues to read and resume existing
`.agents/state/sessions/<sid>/` sessions in place and can read existing
`.agents/state/archive/` archives. Other profiles do not inherit these files.

Migration `028-profile-sessions` runs during `oma install` and `oma update`
for the current project. It copies inactive legacy sessions and archives to
profile `0`, preserving session IDs, event bytes, metadata, injection logs,
and archive month buckets. Active session pointers are deferred; rerun after
the active workflow has moved to another session. No expiration is introduced.

Preview or run the same migration explicitly from the project:

```bash
oma state migrate --dry-run --json
oma state migrate --json
oma state migrate --include-active --json
```

The preview performs no writes. Execution hashes every source file, copies
to a temporary home directory, verifies the copy and rechecks the source,
then publishes and flushes the home directory. After verification, it renames
the original into a temporary `.agents/state/.session-migration-cleanup/`
directory to switch the resolver to home atomically, then removes that
temporary original. Successful migrations leave no backup or temporary copy.
If cleanup is interrupted, rerunning verifies the remaining temporary files
against home before removing them. The legacy index is removed after all
sessions have moved and the home index is present. Session writes share a
lock with the switch; index locks are held one session at a time.

Automatic install/update migration defers active sessions. The explicit
`--include-active` flag also migrates them while retaining their active
pointers. CLI and hook writers must use this storage implementation to share
the migration locks.

Re-running a completed migration is a no-op. An interrupted run can finish
an already published copy if it still matches the source. Different target
contents, another project's same-named session, or links
inside a source tree are reported and left untouched. A corrupt active index
blocks migration rather than guessing which sessions are safe to move.
Manual execution returns a nonzero exit status on failures; install/update
reports them without aborting other installation work. Successful sessions
can migrate even when another session is deferred or fails.

If the home project index does not yet exist, reads fall back to the legacy
`_index.json`. The first index update preserves those pointers in the home
index, which becomes authoritative thereafter. Update the CLI and standalone
hook runtime together; older runtimes only know the legacy index.

The shared path implementation is
`.agents/hooks/core/session-storage.ts`, re-exported by `cli/state/events.ts`.
The migration implementation is `cli/state/session-migration.ts`.
Consumers must use `sessionDir()` and `listSessionIds()` to include legacy
sessions and enforce project scope. `sessionsDir()` is the whole selected
profile's session root and must not be scanned for project-scoped maintenance.
