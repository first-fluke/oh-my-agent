# Agent Result Contract

`oma agent:spawn` and `oma agent:parallel` create a unique run and inject its result path. Use `--task-id` on spawn to match the session plan. A process exiting zero without a valid claim is `partial`, and a failed process is `failed`.

Native agents use the same contract:

1. Define the acceptance contract in the session plan (see below), then run `oma agent:begin <agent-id> <task-id> <session-id>` from the project root. Save `runId` and `claimPath` from its JSON output.
2. Load task references with `oma agent:context <agent-id> --difficulty Medium`, perform the task, and execute its pinned checks with `oma agent:verify <run-id> --required`. Spawn/parallel already inject this graph-selected context. Individual exact commands can also be recorded with `oma agent:verify <run-id> -- <executable> <args...>`. Run checks serially per run. No build unless explicitly requested.
3. Write the claim file with `status` (`completed`, `partial`, `blocked`, or `failed`), `changedFiles` (relative paths), `unresolved` (descriptions), and `artifacts` (relative paths to reports). A non-executable review may use `verificationSkipped` with a specific reason; it cannot override failed checks.
4. Native agents call `oma agent:finish <run-id> <claim-file>`. Spawned processes leave finalization to the parent. The parent captures the actual exit code.

Example claim:

```json
{"status":"completed","changedFiles":["src/parser.ts"],"unresolved":[],"artifacts":[".agents/results/result-qa-s1.md",".agents/results/plan-s1.json",".agents/state/memories/session-ultrawork.md"]}
```

Receipts live in `.agents/state/agent-runs/`. They contain session/task/run IDs, vendor, workspace, timestamps, actual command argv and exit codes, working tree hashes, artifact hashes, unresolved work, and final status. These records prevent accidental reuse of stale evidence; they are local files, not a security boundary against an agent that intentionally edits receipts.

The Ralph gate requires QA and REFINE task IDs in a nonempty plan, current successful executable checks, and report/plan/phase artifacts bound to those runs. A waiver alone does not pass this gate. Record a justified REFINE exception as `REFINE skipped: <specific reason>` before QA finalizes its evidence. Old Markdown-only reports remain readable but must be reverified to pass the gate.

Checks cover the Git working tree (HEAD, tracked contents/modes and nonignored untracked files). Generated `.agents/state`, `.agents/results`, and `.serena/memories`, and generated `.opencode/agents/oma-spawn-*.md` wrappers are excluded from the tree hash and artifacts are hashed separately. In an unversioned directory, all files except those generated directories, `.git`, and `node_modules` are covered. External services, ignored dependencies, and malicious receipt tampering require separate controls.

Read-only dispatch returns `OMA_RESULT_JSON: {claim}` as one final stdout line. The parent persists that inspection. A `verificationSkipped` inspection remains distinguishable from executable checks and does not pass Ralph.

Repository checks: `cli/state/agent-results.test.ts`, `cli/state/artifact-verifier.test.ts`.

## Acceptance and recovery

Each executable task declares `acceptance_criteria: [{id, description}]` and `required_checks: [{id, criteria: [criterionId], command: [executable, ...args], cwd: "."}]`. Every criterion needs a check. Check IDs and executable/argv/cwd selectors must be unique. The run snapshots this contract. Another command/directory, a removed requirement or an uncovered criterion cannot count as acceptance evidence. Legacy plans without required checks remain readable but need a new contract/run to pass executable completion.

`oma agent:verify RUN_ID --affected PATH...` executes tests selected from actual graph references and records outcomes. They count toward acceptance only when matching pinned checks. Use `--required` for all declared checks. Unmatched paths and empty graph test selections fail explicitly.

Optional `inputs` narrows hashing to declared project-relative files/directories and must include all relevant source, tests, configuration and dependency inputs. Missing/deleted inputs change the hash. No globs or symlink traversal are supported. Omit it for whole-tree hashing. The contract is checked independently of scope. Task dependency IDs use the existing `dependencies` array.

`oma agent:resume SESSION_ID --dry-run` reports reused, ready, running and blocked tasks. Without `--dry-run`, it retries ready tasks in dependency order, persists outcomes, and revalidates evidence before success. Changed dependencies invalidate dependent reuse even if their own inputs match. Live managed processes and native attempts without liveness evidence are not duplicated.

Automatic replay requires `retry_policy: "safe"` and a prompt/agent in the plan or saved dispatch. The default is `manual`. `--max-attempts` defaults to 3 including the original attempt. A session lease prevents duplicate coordinators and permits recovery after the local owner dies. Mark interrupted native attempts partial/failed through their result contract before resuming. Keep the JSON plan fixed while recovery runs; record progress separately. This resumes tasks, not the model's interrupted conversation.
