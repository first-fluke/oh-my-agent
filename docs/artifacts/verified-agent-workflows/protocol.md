# Completion and recovery protocol (OMA 20.10.3)

This is an implementation-derived specification of the contracted-task path at source commit `6df65bc42db756f2e7dd73c8f3d48fc474cb3ae7`. It is not a formal proof or an adversarial security protocol. Source anchors are `cli/state/agent-results.ts`, `agent-resume.ts`, `task-contract.ts`, and `agent-decisions.ts` at that commit. The paper summarizes these rules; this companion records details omitted for space.

## Contract and claim schemas

The session plan contains `max_attempts` (positive integer, default 3), optional `lineage_id`, and tasks. Task IDs are unique; dependencies must exist and form an acyclic graph. Each contracted task has:

| Field | Validation |
|---|---|
| `id`, optional `goal_id` | Nonblank strings. Goal and lineage identify a shared retry budget. |
| `acceptance_criteria` | Nonempty array of unique `{id, description}` nonblank strings. |
| `required_checks` | Nonempty array of `{id, criteria, command, cwd}`. IDs and command/cwd pairs are unique. Every criterion is covered; referenced criteria exist. `command` is a nonempty argv array with a nonblank executable. `cwd` defaults to `.`. |
| `inputs` | Optional nonempty array of project-relative literal files/directories. Traversal, absolute paths, NUL and glob metacharacters are rejected. |
| `dependencies` | Unique task IDs, excluding self. Default empty. |
| `retry_policy` | `safe` or `manual`; default `manual`. |
| `required_decisions` | Optional array of `{subject, description}` with nonblank text and unique subjects. |

The claim is `{status, changedFiles, unresolved, artifacts, decisions?, verificationSkipped?}`. Status is `completed`, `partial`, `blocked` or `failed`. The three required collections are arrays of strings; artifact paths must resolve to regular files within the artifact root. `unresolved` is a list of reported remaining issues, not an executable predicate. Decisions contain nonblank `{subject, decision, rationale}` and optional string arrays `alternatives` and `evidence`. The CLI records each decision with the agent/task/run/session identity and requires matching subjects for declared decisions. It checks schema, identity and event hashes, not the semantic quality of a rationale.

## Plan pin and fingerprints

The complete parsed plan is pinned at execution start, including prompts and retry settings. Object keys are recursively sorted, array order retained, and `session_id`, `created` and `lineage_id` excluded from the identity payload. SHA-256 of the serialized payload is stored against both session and lineage; lineage identity is separately checked. Changing acceptance conditions requires an explicit new session and lineage. `verify` rejects a changed plan. A valid completed claim at `finish` becomes failed if the pinned contract no longer matches. Initial `resume` plan loading rejects a divergent/missing pinned plan with an error; it does not synthesize a ready/blocked task report. A change during an already active resume blocks remaining dispatches and invalidates retained successful results.

For explicit inputs, OMA normalizes each path relative to the root, replaces backslashes with slashes, deduplicates, and sorts. It walks directories recursively in sorted entry order. A SHA-256 stream includes path plus NUL, file mode plus NUL when present, content SHA-256 for regular files (or the literal `missing` marker), and a trailing NUL. Directories contribute their own name/mode and their children's records. File creation, deletion, content and mode changes are detected within this scope. Symlinks in the path or beneath a declared directory are rejected. A missing explicitly named path remains represented. Globs are not expanded because the schema forbids them.

Generated `.agents/state/` and `.agents/results/`, `.serena/memories/`, matching generated OpenCode spawn files and `.git/` are excluded. Without explicit inputs, the fallback includes Git HEAD and sorted tracked/unignored untracked files, or a recursive non-Git walk excluding `.git` and `node_modules`; the demonstration always uses explicit inputs. Environment variables, executable versions, remote services and undeclared paths are not automatically hashed. Overlapping input paths are not collapsed beyond exact duplicates. These bytes and filesystem modes make the fingerprint a local consistency key, not a portable cross-platform build key.

Dependency invalidation is structural. A child's local fingerprint does not automatically include its parent's artifacts. The scheduler propagates non-reusable parent status along declared edges even when the child's own input fingerprint is unchanged.

## Current checks and completion precedence

Let `F` be the input fingerprint captured at finish. Let `L` retain only the last receipt for each exact `(argv, resolved cwd)` pair. Current checks require all of:

1. A nonempty declared check set and an unchanged contract.
2. Every declared check has a recorded receipt matching its ID, argv and resolved cwd.
3. `L` is nonempty, and **every** retained receipt has `exitCode == 0` and `before == after == F`.

Both fingerprint endpoints are checked. A command that mutates declared inputs while returning zero cannot supply current evidence. A successful rerun supersedes only the same argv/cwd pair. The explicit `verify RUN_ID -- COMMAND ...` path can record additional checks; unsuperseded failures or stale receipts from those commands also fail condition 3. To clear a mistyped command, rerun that same pair successfully without changing scoped inputs, or begin a new run and record the correct checks. A receipt cannot be appended to a finished run.

For a well-formed claim requesting `completed` with readable artifacts, apply these rules in order:

| Priority | Predicate | Status |
|---|---|---|
| 1 | Contract or required-decision declarations changed | `failed` |
| 2 | At least one receipt exists, but current-check predicate is false | `failed` |
| 3 | `unresolved` is nonempty | `partial` |
| 4 | Required current checks are absent | `partial` |
| 5 | Required decision evidence is missing/invalid | `partial` |
| 6 | All above checks pass | `completed` |

Thus zero receipts yields partial, but one recorded check with another required check missing yields failed. Stale or failed receipts yield failed even when another check is absent. An invalid/missing structured claim, invalid decision payload, or unreadable artifact is caught as partial with a diagnostic; this handler is separate from the table's well-formed-claim path. A nonzero/null runner exit finally overrides the result to failed. A metadata-repair run that changes product inputs also becomes failed. Explicit non-completed claim statuses are retained except for these error/exit rules. The optional skipped-verification explanation does not exempt a contracted task from executable checks.

## Recovery, dependency propagation and active execution

`resultEvidenceValid` requires completed status, zero runner exit, no unresolved issues, unchanged inputs and contract/decision requirements, current checks, valid bound decision events and unchanged recorded artifact hashes.

Initial task classification follows this order:

1. A running attempt whose PID is alive, or whose PID is absent, remains `running`.
2. Valid completed evidence is `reused`.
3. A latest logical-goal run with current successful product checks, zero runner exit, unchanged inputs and only supported workflow-evidence diagnostics is `blocked` for evidence repair.
4. Other work is `ready` only with `retry_policy=safe`, a replayable prompt and agent, and remaining attempts. Otherwise it is `blocked`.

A task initially marked reused becomes ready (or blocked if retry requirements fail) when any dependency is not reused. A ready task with a blocked/running dependency becomes blocked. A ready parent and ready child can both appear in a dry-run plan. During execution, however, the child is dispatched only after each parent is reused or newly completed. An upstream retry failure blocks the child. The scheduler rechecks all reused/completed evidence at the end because a later task could have changed earlier inputs.

An artifact-only edit on otherwise current passing evidence is classified as workflow evidence failure. The automatic scheduler stops product replay. A manual new run can perform one metadata-repair attempt for that logical goal, preserving product inputs and the frozen plan, correcting claim/report bindings and reexecuting existing checks. It must stop on unresolved evidence rather than recursively replanning. This is not a generic automatic repair algorithm.

The active coordinator acquires a per-session JSON lease under `runtimeStateDir(root, 'agent-resume')` using the state-index lock. It records PID, host and a random ownership token. A live/unknown PID or foreign host prevents acquisition. A dead same-host PID can be replaced; release removes only the matching token. There is no time-based expiry. The default runtime state is in the OMA home profile's project scope; the plan and reported artifacts remain project files. `maxAttempts` is capped by the plan's limit and counts runs across the logical goal/lineage.

## Host and trust boundaries

A runner begins a run, gives its ID and contract to the host, and calls finish with the host's structured claim. The host or developer invokes the verification command. The direct CLI can also be used without runtime hooks. A natural-language “done” message creates no receipt or verified completion. A caller that bypasses this lifecycle is outside the evaluated guarantee; this paper does not establish universal hook coverage.

SHA-256 is cryptographic, but these local receipts and pins are unsigned and not protected from an actor able to rewrite code and evidence. They do not implement in-toto's signed supply-chain attestations or ExoFlow's exactly-once guarantee. Developers must choose adequate tests, declare the relevant inputs/dependencies and provide an appropriate execution trust boundary.
