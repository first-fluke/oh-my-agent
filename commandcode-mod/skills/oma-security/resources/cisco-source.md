# Cisco AI Deep SAST

Load for an explicitly selected Cisco application-source pass, its setup, or troubleshooting.
Application-source scans otherwise use Deepsec. Do not add Cisco after an empty result without a selected plan.
Use [findings-contract.md](findings-contract.md) for receipts and [validation.md](validation.md) for independent proof.

## Resolve the artifact and mode

- Upstream is [cisco-open/ai-deep-sast](https://github.com/cisco-open/ai-deep-sast), licensed Apache-2.0.
- Record the exact source commit, local modifications, Python environment/dependency digest, rule/model artifacts, and selected mode.
- The public repository has an early history; vendor ownership does not establish production maturity or detection accuracy.
- `CISCO_SAST_ROOT` is the reviewed scanner checkout; `SCANNER_PYTHON` is its existing isolated Python interpreter.
- `SOURCE_TARGET` and `RUN_DIR` are absolute paths. Keep the scanner checkout separate from the scanned repository.
- `TARGET_COMMIT` identifies the scanned source; also retain its dirty-tree content digest and scope in `run.json`.
- Missing tools, models, or dependencies leave this engine skipped/failed. Installation, model downloads, and builds are separate setup operations.

Inspect the selected checkout and help before composing a scan:

```bash
git -C "$CISCO_SAST_ROOT" rev-parse HEAD
git -C "$CISCO_SAST_ROOT" status --short
"$SCANNER_PYTHON" "$CISCO_SAST_ROOT/aideepsast.py" --help
"$SCANNER_PYTHON" "$CISCO_SAST_ROOT/deepscan.py" --help
```

Capture help/version evidence with the engine receipt; the commands below require matching installed flags.
Do not replace an unavailable pinned dependency or model with a floating release.

| Mode | Work performed | Prerequisites and boundary |
|---|---|---|
| Fast, rules only | Semgrep findings without LLM triage | Existing Semgrep and reviewed rules; `--skip-llm` |
| Fast, local triage | Semgrep plus Foundation-Sec-8B triage | Existing llama.cpp/model; upstream documents about 8 GB model storage and 16 GB RAM |
| Deep, index only | Parse supported functions and create index/checklist state | `--dry-run`; no LLM phase, but local artifacts are written |
| Deep, default | Function-oriented LLM detection plus exploratory analysis | Explicit OpenAI-compatible provider/model and budget |
| Deep, guided | Send rule-matched functions or Semgrep candidates to the LLM | Explicit guide selection; filtered scope must be reported |

The [upstream README](https://github.com/cisco-open/ai-deep-sast/blob/main/README.md) documents these distinct pipelines.
Configure the selected backend through its documented settings. For deep mode these include `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY`.
Resolve key values from existing credential references; retain only references and the permitted endpoint in receipts.
A local OpenAI-compatible backend is possible; its availability and resource requirements still need checking.
Remote deep analysis sends source context to that provider. Secret redaction is not a guarantee that all private data is removed.
Do not enable a paid/provider fallback, remote rules download, or extra egress implicitly.

## Canonical command path

Run from the reviewed scanner root so its relative configuration/rule paths resolve; always pass an absolute target.
Give every revision/mode/backend/configuration identity its own native output directory and database.
The runner captures argv, cwd, timestamps, stdout, stderr, and native exit even when the command fails.

Fast rules-only pass, when selected; `SEMGREP_RULES` is an existing reviewed local rules file/directory:

```bash
cd "$CISCO_SAST_ROOT"
"$SCANNER_PYTHON" aideepsast.py --target "$SOURCE_TARGET" --skip-llm --semgrep-config "$SEMGREP_RULES" --output-dir "$RUN_DIR/cisco-fast"
```

For fast local triage, use the pinned checkout's reviewed scanner configuration and omit `--skip-llm` only after the model is available.
Keep fast and deep native results separate; their exit contracts and finding states differ.

Index-only deep preflight, when useful for the selected scan:

```bash
"$SCANNER_PYTHON" deepscan.py --target "$SOURCE_TARGET" --dry-run --output-dir "$RUN_DIR/cisco-index" --db-path "$RUN_DIR/cisco-index/state.db" --commit "$TARGET_COMMIT" --json-summary
```

An index-only run is preparation, not a completed vulnerability scan.
For an authorized deep pass with the selected backend configured:

```bash
"$SCANNER_PYTHON" deepscan.py --target "$SOURCE_TARGET" --output-dir "$RUN_DIR/cisco-deep" --db-path "$RUN_DIR/cisco-deep/state.db" --commit "$TARGET_COMMIT" --show-needs-review --json-summary
```

Pass `--commit` explicitly: automatic Git discovery can reflect the scanner's cwd rather than the target checkout.
For an explicitly chosen ASVS/CodeGuard-guided pass, add `--guided --guide-rules both` to a separate native workspace.
Other documented choices are `asvs`, `codeguard`, and `semgrep`; inspect installed help before using them.
`--skip-exploratory` narrows default deep coverage. Record it as a mode choice, never an invisible cost optimization.
Semgrep-guided mode can fetch registry rules and reuses an existing `semgrep_report.json`; verify both egress and artifact identity.
If missing guide rules cause an upstream fallback to broader LLM analysis, stop unless that scope and budget were already selected.
The [deep entry point](https://github.com/cisco-open/ai-deep-sast/blob/main/deepscan.py) defines these flags and mode transitions.

## Interpret coverage and resume

- Deep analysis indexes supported function AST nodes; it does not establish review of every file, configuration, dependency, or runtime path.
- The [indexer](https://github.com/cisco-open/ai-deep-sast/blob/main/indexer.py) excludes common dependency/build directories and supports a bounded language set.
- The [detector](https://github.com/cisco-open/ai-deep-sast/blob/main/detector.py) uses function bodies and selected call-graph context; exploratory batches group functions from a file.
- Guided ASVS/CodeGuard analysis skips unmatched functions; Semgrep-guided analysis starts from Semgrep findings. Report those omissions.
- Retain indexed files/functions, analyzed/skipped functions, phase errors, refusals, and actual candidate counts as measured coverage.
- A generated checklist or printed completion banner does not prove every coverage item was closed; inspect [coverage tracking](https://github.com/cisco-open/ai-deep-sast/blob/main/coverage_guide.py).
- Resume is native state reuse, not an assumed `--resume` flag. Preserve the index, SQLite database, and native reports together.
- The [finding store](https://github.com/cisco-open/ai-deep-sast/blob/main/finding_store.py) can reuse processed symbols without binding them to all revision/model/mode inputs.
- Reuse that state only for the same recorded identity. A changed source/config/model/mode gets a new workspace; retain the old receipt.
- Never import a previous `semgrep_report.json` merely because its filename matches.

## Collect results and handle failure

Retain the JSON summary, native JSON/Markdown reports, SQLite state, index, stderr, and stdout unchanged.
Follow `phases.reports.json` from the summary rather than guessing the native report filename; validate the pinned output schema.
The [reporter](https://github.com/cisco-open/ai-deep-sast/blob/main/deepscan_reporter.py) owns native finding serialization.
Deep `0` means the orchestrator reported execution success; `1` means it did not. It is not a severity gate.
Inspect `success`, `error`, phase error counters, skipped work, and required reports before marking a receipt `completed`.
Usable output with missed intended work is `partial`; no usable result is `failed`; unavailable prerequisites are `skipped`.
Do not borrow the fast scanner's severity exits or the fast-only [Jenkins example](https://github.com/cisco-open/ai-deep-sast/blob/main/Jenkinsfile).
Parse findings and completion separately before applying [ci.md](ci.md).

Upstream triage is another static LLM judgment; its TP/verdict/evidence strings do not supply independent observed reproduction.
The [triager](https://github.com/cisco-open/ai-deep-sast/blob/main/triager.py) cannot replace the fresh verifier in `validation.md`.
Import native candidates with origin and severity intact, then apply the common evidence contract.
Missing sandbox, fixtures, or observed proof keeps candidates `needs_validation`; a static TP label cannot make them `confirmed`.
