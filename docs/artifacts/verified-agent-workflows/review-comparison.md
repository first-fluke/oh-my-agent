# Incremental caches and active recovery

This experiment compares incremental caches with active OMA recovery. The older planning-versus-reexecution `compare.py` records remain available as historical evidence in [comparison.md](comparison.md).

## Reproduction and source identity

From `docs/artifacts/verified-agent-workflows/`, run:

```sh
python3 review_experiments.py
```

This requires a checkout of OMA source commit `6df65bc42db756f2e7dd73c8f3d48fc474cb3ae7`, Python, Node.js, Bun and the repository's installed dependencies. Install dependencies with `bun install --frozen-lockfile` from the repository root if needed. No software build or LLM credentials are required. The driver checks core source bytes against the pinned commit and rejects changes in tracked CLI/hook dependencies. The experiment driver and `demo.py` must be available at the path above. The original `python3 demo.py` walkthrough remains the simpler published-package-only entry point.

The experiment calls the actual `resumeSession`, `planSessionResume`, `beginAgentRun`, `verifyRequiredChecks` and `finishAgentRun` source APIs. Its dispatch callback performs fixed verification and submits a completed claim; it does not invoke a model or edit the product to repair it. This exercises the real scheduler, lease, dependency gates and final evidence reassessment. It is not an end-to-end native host or autonomous repair test.

Records: [summary and receipts](evidence/review-summary.json), [baseline command outputs](evidence/review-baseline-commands.json), and [execution output](evidence/review-execution.txt). The summary includes source and driver SHA-256 values. Each invocation retains its own fixture and OMA state in an ignored timestamped work directory.

## Policies and parity

Each of four probes starts with a separate, identical three-task fixture created by `demo.py`, using the correct limiter. The baseline checks and OMA checks must pass at setup. Cache keys are persisted and reloaded. The same task graph, acceptance commands, input scopes and files are provided to all policies.

- **All:** execute every task's checks at recovery.
- **In:** reuse successful checks when the key matches. The key independently hashes the task's declared argv/cwd checks, sorted literal input paths, modes and contents, and recursively the keys of declared dependencies.
- **Out:** In plus the reported output artifact's mode/content hash for each task. Dependency keys therefore propagate output changes too. A dirty target reruns its checks; this policy does not assess the report's meaning or require restoration of its former bytes.
- **OMA:** plan and then execute the actual recovery scheduler using the fixed callback above.

All four policies block dependent execution when a parent fails, while continuing independent tasks. This differs from the earlier `compare.py` baseline, which independently ran all tests despite parent failure. The new count comparison uses the same dependency policy. A matched input/output cache can detect all the changes in these probes; artifact-change detection is not an OMA-only feature.

The cache baselines are independent authored implementations of explicit hash-key policies, not performance evaluations of Bazel, Shake or an in-toto deployment. They are not full build systems: the declared commands verify existing files rather than regenerate report files, they do not retrieve cached artifacts, and they do not implement dynamic dependency discovery or early cutoff. The fixed declaration order is topological for this fixture. OMA's fingerprint function is not used to compute baseline keys.

## Results

Cells contain limit / usage / docs, followed by executed check-command count. C = checks passed, F = failed, B = blocked, R = reused, T = ready to execute. Initial checks are excluded.

| Probe | All | In | Out | OMA plan | OMA active |
|---|---|---|---|---|---|
| Unchanged | C/C/C; 3 | R/R/R; 0 | R/R/R; 0 | R/R/R | R/R/R; 0 |
| Unrelated file | C/C/C; 3 | R/R/R; 0 | R/R/R; 0 | R/R/R | R/R/R; 0 |
| Broken source | F/B/C; 2 | F/B/R; 1 | F/B/R; 1 | T/T/R | F/B/R; 1 |
| Changed report, correct source | C/C/C; 3 | R/R/R; 0 | C/C/R; 2 | B/B/R | B/B/R; 0 |

The source edit changes `<` to `<=`. The report edit changes only the limiter report; product inputs remain correct. Each branch starts from the original passing files, unlike the earlier serial walkthrough. Hashes over declared inputs, checks, dependency keys and reports are checked before/after the probes to detect accidental fixture changes. OMA's generated run evidence is outside those keys.

The caches match OMA on the first three cases. Out detects the report change and rechecks the limiter and usage; OMA instead stops for evidence repair. Both behaviors follow their declared policies. Passing product tests do not establish report correctness, and a changed report does not establish a faulty product. OMA's block is not counted as a completed repair or a performance benefit.

The actual scheduler stops usage after limit fails, yielding F/B/R and one check. Running both tests independently would be a different recovery policy.

## Additional boundary probes

Twelve source-level probes passed: no receipts → partial; stale evidence → failed; unresolved work → partial; additional command failure → failed; successful rerun of that same command → completed; contract change at finish → failed; contract change at resume → error; one receipt with another required check missing → failed; a check that mutates declared input → failed; missing decision → partial; present valid decision → completed; directory additions/deletions affect the fingerprint and globs are rejected.

The first harness attempt reused one session ID across isolated project roots. Decision-event validation rejected this cross-project identity, so that attempt did not complete. The driver was corrected to use separate session IDs per fixture; the retained successful run includes all 12 probes. This was a harness setup correction, not a change to OMA. Failed-run output remains under ignored `work/` for local audit.

## Limits

There is one deterministic fixture, no sampled coding trajectories, no autonomous repair and no false-completion rate estimate. Counts describe actual verification commands under the stated policies; they do not estimate total development cost, wall-clock overhead or productivity. Cryptographic source/evidence hashes identify local records; they do not make the runtime receipts signed attestations or supply an immutable public archive.
