# Execution evidence and dependency queries

OMA now separates process termination from task completion. A successful process without a valid structured result is `partial`. An unsuccessful process is `failed`. Completed claims with unresolved work become `partial`; failed or stale verification cannot be overridden by a skip reason.

## Agent results

`oma agent:spawn` and `oma agent:parallel` create unique runs, inject the result contract, and finalize results when the child exits. For planned work, pass `--task-id T1` to `agent:spawn`. The result record identifies the session, task, run, vendor, workspace, changed files, unresolved items, checks, and artifact hashes. `agent:status` prefers these records over legacy Markdown; a completed record whose code/artifacts changed is reported as `stale`.

Native agents register the same evidence explicitly:

```sh
# First define T1 acceptance_criteria and required_checks in the session plan.
oma agent:begin qa-reviewer T1 session-1
oma agent:context qa-reviewer --difficulty Medium
# Use runId returned by agent:begin:
oma agent:verify RUN_ID --required
oma agent:finish RUN_ID .agents/state/claim.json
```

Commands following `--` are executable/argument arrays, not shell expressions. `--root` locates the project storing receipts; individual checks default to the run workspace, while declared checks use project-relative `cwd`. Checks run serially per run. Only declare build commands when a build is authorized.

Example claim (`artifacts` paths are relative to the project storing the run):

```json
{
  "status": "completed",
  "changedFiles": ["src/parser.ts"],
  "unresolved": [],
  "artifacts": [
    ".agents/results/result-qa-session-1.md",
    ".agents/results/plan-session-1.json",
    ".agents/state/memories/session-ultrawork.md"
  ]
}
```

For a task requiring only inspection, `verificationSkipped` records a specific reason. That waiver does not override a failed command and does not satisfy Ralph's executable-evidence gate. Read-only dispatch returns the same JSON on a final `OMA_RESULT_JSON: {...}` stdout line so the parent can persist it.

Receipts are local under `.agents/state/agent-runs/`. Hashes cover HEAD, tracked contents/modes, and nonignored untracked files. Runtime results/state and generated OpenCode dispatch wrappers are excluded; referenced artifacts are hashed separately. In an unversioned directory, OMA recursively hashes files except runtime directories, `.git`, and `node_modules`.

## Ralph migration

Existing Markdown reports remain readable as `legacy-*` or `unverified`, but do not prove completion. Reverify an old result instead of renaming or touching it. Supply a session and iteration start:

```sh
oma ralph:verify --json --session session-1 --newer-than 2026-09-05T00:00:00Z
```

The plan must contain nonempty tasks with unique IDs and descriptions, titles, or scopes. QA and REFINE runs must match those task IDs and the selected session. Their receipts need current successful checks and hashes of the report, plan, and phase log. The latest attempt for a task supersedes earlier attempts, including when the latest one failed. A documented `REFINE skipped: <specific reason>` may satisfy REFINE after the QA receipt binds that phase log.

Update phase logs and code before finalizing evidence. Later source or artifact edits invalidate it. Gates report missing/stale evidence and require remediation; they do not automatically require another user approval for already authorized work.

These receipts prevent accidental stale reuse. They do not establish that a chosen command is relevant or prove independent agent identity cryptographically. Ignored dependencies, external services, and deliberate modification of local receipts are outside this mechanism.

## Dependency graph queries

```sh
oma visualize --focus skill:oma-backend --json
oma visualize --affected .agents/skills/_shared/core/execution-policy.md --json
```

`--focus` follows declared references transitively. `--affected` follows reverse references to skills, agents, workflows, and check files. Both accept node IDs or project-relative definition paths; affected queries also accept directories or multiple paths. Unknown inputs are reported in `unmatched` and produce exit status 1. Cycles terminate safely.

Custom skills and installed agent definitions across vendors are discovered from files. Relative Markdown links and literal paths create resource dependencies. Plain skill names in agent/workflow directives connect their assigned skills; ordinary mentions in shared prose do not expand the context. Test commands are suggested only for actual test files that name a definition path or are explicitly referenced by that definition. Commands are returned as argv arrays and are never executed by graph queries. This is a static reference graph, so dynamically constructed paths can remain undiscovered.

Authorization and verification policy is centralized in `.agents/skills/_shared/core/execution-policy.md`. Vendor protocols retain transport details and use the common result contract. CLI and hook state storage share `.agents/hooks/core/state-core.ts` and the same process lock.

## Requirement-backed verification

Declare the task contract before starting a run:

```json
{
  "tasks": [{
    "id": "T1",
    "agent": "backend",
    "task": "Fix the parser edge case and verify it",
    "description": "Parser accepts empty input without throwing",
    "acceptance_criteria": [{"id": "AC1", "description": "Empty input returns an empty result"}],
    "required_checks": [{"id": "parser-test", "criteria": ["AC1"], "command": ["bun", "test", "src/parser.test.ts"], "cwd": "."}],
    "dependencies": [],
    "retry_policy": "safe",
    "inputs": ["src", "package.json", "bun.lock"]
  }]
}
```

Replace the example command with the repository's actual check. OMA matches executable, arguments, cwd and check ID; it cannot judge whether test assertions express the user's intent. Every criterion needs a check. Changing the contract invalidates earlier receipts, and inspection waivers cannot bypass a declared executable contract.

`inputs` is optional. Declare it only when the list covers all behavioral inputs, including tests and dependency/configuration files. Use concrete project-relative files/directories, without globs or symlink traversal. Missing/deleted inputs affect the hash. Omit `inputs` to retain conservative whole-tree verification. Generated evidence is excluded and artifacts are hashed separately.

## Runtime graph integration

Spawn and parallel dispatch load actual skill/resource contents selected by graph reachability. Approximate resource budgets are 1,500/4,000/8,000 tokens for Simple/Medium/Complex tasks. Deferred reference paths remain visible for on-demand reading. Common policy and vendor transport are injected separately. Unknown agents do not receive an unrelated full skill collection.

Native dispatch can retrieve the same selected contents through `oma agent:context AGENT_ID --difficulty Medium`; this reports an error when the agent has no matching context.

```sh
oma agent:verify RUN_ID --affected .agents/skills/oma-backend/SKILL.md
```

This executes graph-selected tests and records outcomes. Unmatched paths and empty selections fail explicitly. Selected commands satisfy acceptance criteria only when matching the pinned task checks. Use `--required` for the entire declared check set.

## Interrupted-session recovery

```sh
oma agent:resume session-1 --dry-run
oma agent:resume session-1 --max-attempts 3
```

Recovery reuses current acceptance evidence and orders retries by `dependencies`. It retries stale/failed/missing tasks only when `retry_policy` is `safe`; the default is `manual`. A replayable `task` prompt and `agent` can come from the plan or saved dispatch. Pending tasks can start even when interruption preceded their first dispatch.

Changed dependencies force dependent revalidation. Failed prerequisites block downstream execution. Live processes and native attempts whose liveness is unknown are not duplicated; mark an interrupted native attempt partial/failed through its result contract before resuming. Retry ancestry enforces attempt limits, and checkpoints live in `.agents/state/agent-resume/`. A lease prevents concurrent coordinators and recovers a dead local owner.

Keep the JSON plan fixed during recovery and use the Markdown tracker/run records for progress. The coordinator rechecks evidence before returning success, including when a later task changes earlier inputs. This resumes tasks; it does not reconstruct model conversation state or make external side effects idempotent automatically.
