# Verified agent workflows

Reproducibility materials for OMA completion verification and recovery. The examples use a three-task JavaScript request limiter and require no language-model account. The evaluated package is `oh-my-agent@20.10.3`.

[Watch the demonstration](https://youtu.be/bjuBB7Ssn1s) · [OMA source](https://github.com/first-fluke/oh-my-agent)

## Run the CLI demonstration

Requirements: Python 3.9+, Node.js and npm with `npx`. The first run downloads the pinned package. The captured run used Node.js 26.11.1 on macOS; other Node versions were not tested for this package.

From the repository root:

```sh
cd docs/artifacts/verified-agent-workflows
python3 demo.py
```

The driver invokes `npx --yes --package=oh-my-agent@20.10.3 oma`, creates an isolated fixture and state directory, and checks nine observations. It does not compile OMA or invoke a model. Run output is retained under ignored `work/`; `work/latest.txt` identifies the latest successful run.

| Condition | Expected observation |
|---|---|
| Completion claim without verification | `partial` |
| Completion claim after failed acceptance test | `failed` |
| Verified limiter, usage and docs | Three `completed` results |
| Recovery with unchanged evidence | All `reused` |
| File added outside declared inputs | All `reused` |
| Limiter source changed | Limiter and usage `ready`; docs `reused` |
| Source restored, limiter report changed | Limiter and usage `blocked`; docs `reused` |

The walkthrough uses scripted edits and `resume --dry-run`. It demonstrates scheduling decisions, not autonomous repair. The video's closing slide shows the earlier `docs/papers/icse-2027-tool-demo/` path; use `docs/artifacts/verified-agent-workflows/` instead.

## Run active recovery and cache comparisons

See [the comparison methods and results](review-comparison.md) for the source checkout and dependency requirements, then run:

```sh
python3 review_experiments.py
```

This comparison uses full reexecution, an input-hash cache, an input/output-hash cache and the actual OMA scheduler with a fixed verification callback. It also checks 12 protocol boundary cases. It requires OMA source commit `6df65bc42db756f2e7dd73c8f3d48fc474cb3ae7`, Bun and installed dependencies. Source imports resolve relative to this directory, so retain its repository path when copying these materials into the evaluated checkout. No build or model calls are required.

The earlier `python3 compare.py` experiment compares last-success reuse, independent rerun-all checks and OMA dry-run planning. Its [methods and results](comparison.md) are retained separately because its dependency policy differs from the active comparison.

## Specification and captured evidence

| Material | Contents |
|---|---|
| [Protocol](protocol.md) | Contract and claim schemas, completion precedence, fingerprints, recovery, dependency gating and trust boundaries |
| [CLI summary](evidence/summary.json) and [transcript](evidence/transcript.json) | Nine observations and captured commands |
| [Standalone replay](evidence/standalone-check.json), [summary](evidence/standalone-summary.json) and [transcript](evidence/standalone-transcript.json) | A run from a temporary directory containing only `demo.py` |
| [Active comparison summary](evidence/review-summary.json), [baseline commands](evidence/review-baseline-commands.json) and [execution output](evidence/review-execution.txt) | Four policies, four probes and 12 boundary cases |
| [Earlier comparison summary](evidence/comparison-summary.json) and [transcript](evidence/comparison-transcript.json) | Planning-only comparison retained for provenance |
| [Regression test output](evidence/regression-tests.txt) | Previously executed 37 verification/recovery tests |

Recorded hashes identify the captured drivers and evidence. Original records retain historical local paths; moving this artifact does not rewrite those records. New runs write separate output rather than replacing captured evidence.

These deterministic examples establish protocol behavior on one fixture. They do not measure autonomous coding effectiveness, false-completion rates or productivity. The source-level comparison uses authored cache policies, not executions of Bazel or Shake. Receipts are unsigned local records and do not protect against an actor able to rewrite code and evidence.
