# Deepsec source analysis

Load for source scan/diff, native finding triage, export or resume. Use the configured workspace and pinned native executable. Inspect command help before adding flags.

## Scope and execution

Bind the source revision, dirty/index contents, project root, exclusions, matcher configuration and budget to the receipt. A file-count limit bounds work, not money. Calibrate a large unknown scope within the existing spend limit and record measured usage before expanding.

For a full-source pass, from the existing `.deepsec/` workspace:

```bash
npx deepsec scan
npx deepsec status
```

The matcher pass selects candidates; it does not establish complete vulnerability coverage. Review the inventory against ingress families and sensitive code. An authorized bounded AI calibration may use:

```bash
npx deepsec process --limit 50 --concurrency 5
```

Honor tighter user limits. Confirm installed cost/time controls before execution and use them when supported. Keep actual files/batches/cost/time, refusals and unfinished candidates. Do not extrapolate as an exact quote or silently launch an unbounded continuation.

## Diff and explicit files

Direct mode can investigate changed files without a prior full scan. Choose one selector:

```bash
npx deepsec process --diff origin/main
npx deepsec process --diff-staged
npx deepsec process --diff-working
npx deepsec process --files-from selected-files.txt
```

These are alternatives, not sequential steps. Resolve and record the baseline SHA and exact selected file identities. Explicit files are investigated even without matcher hits; default ignore filtering still affects scope. Use `--no-ignore` only for a deliberate scope change.

Current diff/direct exit 1 means net-new findings; exit 0 can coexist with earlier unresolved findings. Preserve native results and compare current normalized evidence for the chosen gate policy. Never use the init exit map here.

## Triage and state

Native `triage`, `revalidate`, `export` and `metrics` have version-specific options: inspect their help, then retain complete machine-readable outputs plus any human report. Static TP/FP/fixed/uncertain verdicts are provenance, not independent confirmation. Send candidates to the separate verifier and applicable proof procedure.

Deepsec's discovery worker performs static analysis. Do not instruct it to launch the application, contact endpoints or execute exploits. Runtime proof belongs to a separate verifier/context.

On interruption, retain the exact command, state, processed/pending units and stop reason. Resume the same identity/configuration using native checkpoints; investigate changes before reusing cached results. Never remove `data/<id>/` to obtain a clean run.

Sources: [change review](https://github.com/vercel-labs/deepsec/blob/main/docs/reviewing-changes.md), [upstream usage](https://github.com/vercel-labs/deepsec), [static worker contract](https://github.com/vercel-labs/deepsec/blob/main/packages/processor/src/prompt/core.ts).
