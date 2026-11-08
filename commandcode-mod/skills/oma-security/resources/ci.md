# Security scan gates

Load only for CI or an explicitly requested gate. Keep native execution outcome, candidate severity, independent validation, and gate acceptance separate.
Use the findings contract for `run.json`, `findings.json`, `runtime.json`, and `gate.json`; this file owns native exit interpretation and gate policy.

## Native contracts

Verify the installed/pinned version before applying this table. Preserve actual exit codes and native output; an exit alone cannot establish that every required analyzer completed.

| Engine/mode | Native behavior | OMA interpretation |
|---|---|---|
| Deepsec direct diff/files mode | Official documentation describes 0 for no net-new finding, 1 for a net-new finding; other failures are runtime errors | Read this run's native receipts and errors; a finding exit is not independent proof and zero does not clear unresolved stored findings |
| Cisco AI Deep SAST | `deepscan.py` exits 0 when its summary `success` is true, otherwise 1 | Parse produced reports and coverage separately; 0 can coexist with vulnerabilities, and dry-run success is not an LLM security scan |
| Cisco Skill Scanner | Current official results guide: 0 below selected threshold, 1 threshold findings, 2 setup/policy/requested-analyzer construction error | Use the actual `--fail-on-severity` setting and inspect per-skill coverage; a setup error is not a finding |
| Cisco MCP Scanner | Output and error handling depend on command/mode/version; no common severity exit contract is assumed here | Verify its actual interface and parse native results plus analyzer completion; do not borrow another scanner's exit mapping |
| Cloudflare local validation | Structured verifier records and observed evidence; no native severity exit is assumed | Accept only validated current records; validator success proves format, not exploitability |
| ARTEX | Autonomous platform/task interface; no assumed scanner CLI, headless mode, severity exit, or CI support | Require verified adapter or validated manual/external task receipts and evidence; never derive acceptance from service-process exit |

Deepsec's documentation labels runtime errors separately but its numeric table is not sufficient to distinguish every implementation failure. If exit 1 has no usable finding receipt, preserve the ambiguity as error/incomplete rather than synthesizing a vulnerability.
Cisco Skill Scanner's `LLM_ANALYSIS_FAILED` and `LLM_CONTEXT_BUDGET_EXCEEDED` can appear as INFO coverage notes that do not trigger the severity gate. Treat failed or truncated required judge coverage as incomplete.
An explicitly selected analyzer that cannot start or cannot complete cannot be silently replaced by a smaller analyzer set.

## Policy receipt

Write `gate.json` using the recorded required receipt identities (`engine:target_id:mode`), policy name/revision, blocking record IDs, and reasons.
Resolve severity thresholds and whether native candidates gate from the user's/team's existing policy. Do not turn an engine rating into an OMA confirmed vulnerability merely to evaluate the gate.
If no existing policy resolves an outcome-changing choice, prepare the concrete alternatives and ask only for that missing choice under shared policy.

Apply these outcomes in order while retaining every reason:

1. `error`: required engine execution or result parsing failed; preserve logs/native code.
2. `incomplete`: required operation, target identity, coverage unit, candidate review, runtime receipt, or proof check is missing/partial/stale; required planned/running/skipped receipts are also incomplete.
3. `findings`: required checks completed and the policy blocks on the recorded confirmed findings or explicitly selected native candidate threshold.
4. `pass`: required checks and evidence are complete/current and the selected policy has no blocker.

A partial/error run may also contain confirmed findings; list them and their blocking IDs even when the gate status reflects incomplete execution.
Reviewed `needs_validation` leads remain distinct from confirmed findings. A policy may require their resolution before passing; do not assign them a normalized severity to make that decision.
An empty findings array is insufficient for pass: inspect the engine receipts, required coverage, pending candidates, and runtime completion.

Example of a valid gate receipt:

```json
{
  "schema_version": 1,
  "run_id": "20261010-example",
  "status": "incomplete",
  "policy": "team-high-plus-v1",
  "required_engines": ["deepsec:app-source:diff", "artex:test-site:manual_external"],
  "blocking_records": [],
  "reasons": ["The requested ARTEX task has no validated completion and traffic receipt."]
}
```

## Deepsec diff gate

Use the selected installed runner from the source resource; do not bootstrap a new workspace or run `init` merely to set up a gate. Current `init` may start model-backed review, so it belongs inside the authorized execution plan.
Resolve the exact baseline and fetched history; record the command, tool/config version, scoped paths, source identity, and persisted/stateless mode.
The following shows native capture only; it is not the normalized OMA acceptance gate:

```bash
set +e
deepsec process --diff "$security_base_ref" \
  --comment-out "$security_run_dir/raw/deepsec/comment.md" \
  >"$security_run_dir/raw/deepsec/stdout.log" \
  2>"$security_run_dir/raw/deepsec/stderr.log"
security_native_exit=$?
set -e
```

Use only after the output directory, installed CLI, authorized backend/scope, and runtime/spend limits have been established. Add only flags verified against that version; the source-scanning resource owns current limit controls.
Capture and upload receipts with an always-run CI step so a nonzero exit cannot hide failure evidence.
`--comment-out` may produce no file when there are no new findings; absence of this optional artifact neither proves success nor supplies required scan evidence.

Persisted Deepsec state excludes old findings from the net-new gate. Repeated execution can exit 0 while an unresolved issue remains.
Choose the already established policy explicitly:

- Net-new policy: evaluate only current direct-mode net-new candidates and preserve prior-state identity.
- Unresolved-finding policy: inspect current valid stored findings as well; do not rely on the native net-new code alone.
- Stateless policy: each run analyzes its scoped input again; record that behavior and its cost rather than presenting it as a cache hit.

Running from the repository root versus inside `.deepsec/` can change config/context discovery; record the actual cwd/config and never imply custom matchers/INFO.md applied when they did not.

## Cisco gates

For AI Deep SAST, the verified CLI supports `--json-summary`; retain the summary and native reports, including needs-review records and coverage. Confirm flags for the selected commit before use.
`--dry-run` indexes without the model analysis; record it as preparatory coverage, not a completed vulnerability pass.
Check native `success`, phase outcomes, skipped/error counts, output validity, and the JSON findings selected by policy. Do not interpret exit 1 as severity.

For Skill Scanner, preserve the configured policy and threshold. A locally installed version may use:

```bash
skill-scanner scan "$security_skill_path" \
  --fail-on-severity high --format json \
  --output "$security_run_dir/raw/skill-scanner/scan.json"
```

This example selects core analysis only; add `--use-llm` or other network analyzers only when the selected plan authorizes them. Core-only output does not imply that an LLM judge ran.
Inspect `findings` and `suppressed_findings`; for `scan-all`, inspect each item under `results`. Preserve suppression reasons and native artifacts.
Treat requested-analyzer setup errors and per-skill model failures/truncated context as incomplete/error even when severity is below the selected threshold.

For MCP Scanner, the MCP resource owns the exact supported command, output shape, network/stdio effects, and version check.
Preserve transport/discovery/analyzer errors separately; a discovered server with zero analyzed tools does not satisfy a nonempty requested tool scan.
No arbitrary MCP tool execution or additional endpoint access follows from a CI gate request.

## ARTEX runtime gates

Do not add a guessed `artex scan`, headless flag, or severity-based exit wrapper. A running platform process says nothing about task completion or vulnerability severity.
Before automation, verify the chosen snapshot's adapter/API, task lifecycle, scope enforcement, artifact export, and failure/budget-stop reporting.
Otherwise use `integration: manual_external` and import the actual task/evidence receipt; label the integration external/manual, not native CI support.
When runtime is required, a pending external task cannot produce a pass.

Validate the runtime receipt's target URL/host/port, allowlist, account roles, allowed effects, bounded execution budget, backend egress, snapshot/tool/image digests, and deployment/session identity.
Require observed completion/coverage and retained traffic/tool evidence; engine narrative, a screenshot, or “no successful attack” is insufficient.
Independent replay must bind each confirmed runtime record to the same observed deployment/session; absent deployed revision limits the claim to that session.
If proof is required and a target identity cannot be established, keep the gate incomplete rather than mapping the checked-out commit onto the deployment.
Redirects/discovered hosts cannot expand the allowlist; scope violations or budget stops remain visible in receipts and coverage.

## CI trust and artifacts

Keep PR-controlled code in a job without repository-write permissions. A separate PR-comment/report job consumes only a bounded sanitized artifact and never checks out or runs PR code.
Pin production action references and tool snapshots. Never run untrusted fork code with repository secrets by switching to a privileged event or job.
Use existing credential exposure policy; adding a scanner does not authorize sending the entire repository or traffic to another provider.
Keep raw traffic/logs restricted. Upload redacted derivatives and the normalized receipt/report, with defined retention and access; omit cookies, authorization headers, keys, and private data.
The workflow's final process failure/success implements the recorded OMA gate decision; native tool exit codes stay in evidence rather than being overwritten.

## Sources and version checks

- [Deepsec direct-mode contract](https://github.com/vercel-labs/deepsec/blob/main/docs/reviewing-changes.md).
- [Cisco AI Deep SAST CLI success exit](https://github.com/cisco-open/ai-deep-sast/blob/main/deepscan.py).
- [Cisco Skill Scanner results, exit codes, and incomplete judge notes](https://cisco-ai-defense.github.io/docs/skill-scanner/results-and-tuning).
- [Cisco MCP Scanner supported interfaces](https://github.com/cisco-ai-defense/mcp-scanner).
- [Cloudflare independent local validation](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/VALIDATION-AND-REPORTING.md).

These are source references, not version pins. Record the installed release/commit and verify drift before execution; if its behavior disagrees, preserve the observation and update the mapping rather than guessing.
