# Security evidence and result contract

Load when retaining, normalizing, deduplicating, or reporting scanner results. This is the authoritative OMA output contract, not an upstream scanner schema.

## L1 decisions

In an active OMA L1 session, use the shared event spec. Emit actual decisions directly; the CLI supplies the envelope. These records retain existing authorization and evidence, not a new approval requirement.

Before the first consequential paid/runtime action or a change of engine/backend/scope/budget, record the approved, limited or declined execution plan. Include target/run identity, engine/model, source/deployment scope, permitted effects, numeric stopping limits, estimated spend and the existing authorization source. One unchanged current plan covers its subsequent commands. Routine free status/scan work without a consequential scope choice needs no synthetic decision.

Replace placeholders with actual values and use the same current session/instance in each pair:

```bash
oma state emit "decision.made" '{"subject":"security.execution-scope","instanceId":"<run ID>:<plan revision>","decision":"<approved|limited|declined>: <engine/model, scope, effects, limits and estimate>","rationale":"<existing authorization source or actual limitation>","evidence":["<scope/calibration artifact>"]}'
oma state verify --workflow security --checkpoint execution-scope --instance "<run ID>:<plan revision>"
```

Record every reviewed finding disposition before suppression or export, including rejected claims and unresolved leads. Use the stable normalized finding ID plus target/verdict revision and review attempt as the instance; an earlier proof cannot satisfy a changed finding. Keep native TP/FP/fixed verdicts in provenance rather than treating them as independent confirmation.

```bash
oma state emit "decision.made" '{"subject":"security.triage-outcome","instanceId":"<run ID>:<finding ID>@<target/verdict revision>:<review attempt>","findingId":"<finding ID>","decision":"<confirmed|needs_validation|rejected>: <actual claim and disposition>","rationale":"<independent evidence, counterevidence or exact missing fact>","evidence":["<current finding/evidence artifact>"]}'
oma state verify --workflow security --checkpoint triage-outcome --instance "<run ID>:<finding ID>@<target/verdict revision>:<review attempt>"
```

Do not emit literal placeholders or invent decisions for a no-candidate pass. The verifier checks subject/instance and nonblank content; the parent must still check evidence identity and the semantic requirements below.

## Files and identity

Use `.agents/results/security/<run-id>/` with `run.json`, `findings.json`, and `report.md`; require `runtime.json` for web-runtime tasks and `gate.json` for CI.
Write initial planned receipts before execution and update them from observed results. Preserve prior receipts when resuming or changing identity.
Choose a unique run ID; a file found through a wildcard in another run cannot satisfy the current task.
Source identity includes the commit and dirty-tree digest; hash the actual scoped inputs, including relevant untracked files, rather than treating `HEAD` as the whole tree.
Package/MCP identity includes the input/configuration digest and available server/tool/image identity. Missing runtime version limits the claim to the observed session.
Runtime identity binds URL, environment, deployed revision/image when available, and session/task; never equate a local commit with deployed code without evidence.
Store commands as argument arrays with sensitive values omitted; record credential variable/reference names, never their contents.

### Receipt lifecycle

Engine and runtime receipts allow `planned` before execution and `running` while work is active; these are pending states, not completed scan results.
On final handoff, settle each selected receipt as `completed | partial | failed | skipped` from its actual outcome. Required work that never ran is `skipped` with its blocker; incomplete/interrupted work is `partial` with its last native task state retained in raw evidence.
Do not overwrite a running platform task's native status; the normalized partial receipt reports that its completion remains unknown and links the current native observation.
Final `run.status` is `completed | partial | failed`; a required skipped/partial receipt or pending required review prevents completed status. Optional skipped operations remain visible without implying they were performed.
During an active/background task, a planned/running receipt can be reported as interim status, but never as final scan completion or a passing gate.

## JSON Schema

The schema below describes all four machine-readable documents. Select the `$defs` branch by filename. It is a documentation contract; do not invent an OMA runtime validator or install a validator merely to produce a report.
Use an existing JSON Schema validator when available. Otherwise check JSON syntax and required types/fields, then perform the semantic checks below; report the absence of full schema validation.
Record format validation separately from evidence validation: a schema pass does not prove artifact authenticity, coverage, independent review, exploitability, or that the target is secure.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:oma:security:results:1",
  "oneOf": [
    {"$ref": "#/$defs/run"},
    {"$ref": "#/$defs/findings"},
    {"$ref": "#/$defs/runtime"},
    {"$ref": "#/$defs/gate"}
  ],
  "$defs": {
    "strings": {"type": "array", "items": {"type": "string", "minLength": 1}, "uniqueItems": true},
    "nullableString": {"type": ["string", "null"], "minLength": 1},
    "identity": {
      "type": "object", "additionalProperties": false,
      "required": ["commit", "dirty_digest", "input_digest", "deployment_revision", "image_digest", "environment", "session"],
      "properties": {
        "commit": {"$ref": "#/$defs/nullableString"},
        "dirty_digest": {"$ref": "#/$defs/nullableString"},
        "input_digest": {"$ref": "#/$defs/nullableString"},
        "deployment_revision": {"$ref": "#/$defs/nullableString"},
        "image_digest": {"$ref": "#/$defs/nullableString"},
        "environment": {"$ref": "#/$defs/nullableString"},
        "session": {"$ref": "#/$defs/nullableString"}
      }
    },
    "budget": {
      "type": "object", "additionalProperties": false,
      "required": ["max_cost_usd", "duration_s", "requests", "concurrency", "tokens"],
      "properties": {
        "max_cost_usd": {"type": ["number", "null"], "minimum": 0},
        "duration_s": {"type": ["integer", "null"], "minimum": 1},
        "requests": {"type": ["integer", "null"], "minimum": 0},
        "concurrency": {"type": ["integer", "null"], "minimum": 1},
        "tokens": {"type": ["integer", "null"], "minimum": 0}
      }
    },
    "coverage": {
      "type": "object", "additionalProperties": false,
      "required": ["unit", "planned", "reviewed", "unreviewed", "exclusions"],
      "properties": {
        "unit": {"type": "string", "minLength": 1},
        "planned": {"$ref": "#/$defs/strings"},
        "reviewed": {"$ref": "#/$defs/strings"},
        "unreviewed": {"$ref": "#/$defs/strings"},
        "exclusions": {"$ref": "#/$defs/strings"}
      }
    },
    "artifact": {
      "type": "object", "additionalProperties": false,
      "required": ["path", "sha256", "bytes", "restricted"],
      "properties": {
        "path": {"type": "string", "minLength": 1},
        "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
        "bytes": {"type": "integer", "minimum": 0},
        "restricted": {"type": "boolean"}
      }
    },
    "target": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "type", "reference", "identity", "scope", "baseline"],
      "properties": {
        "id": {"type": "string", "minLength": 1},
        "type": {"enum": ["source", "skill", "mcp", "web_runtime"]},
        "reference": {"type": "string", "minLength": 1},
        "identity": {"$ref": "#/$defs/identity"},
        "scope": {
          "type": "object", "additionalProperties": false,
          "required": ["include", "exclude", "allowlist", "effects", "account_refs"],
          "properties": {
            "include": {"$ref": "#/$defs/strings"}, "exclude": {"$ref": "#/$defs/strings"},
            "allowlist": {"$ref": "#/$defs/strings"}, "effects": {"$ref": "#/$defs/strings"},
            "account_refs": {"$ref": "#/$defs/strings"}
          }
        },
        "baseline": {"$ref": "#/$defs/nullableString"}
      }
    },
    "engine": {
      "type": "object", "additionalProperties": false,
      "required": ["engine", "target_id", "version", "mode", "required", "status", "native_exit", "invocation", "backend", "model", "config_digest", "prompt_digest", "raw_artifacts", "coverage", "gaps"],
      "properties": {
        "engine": {"enum": ["deepsec", "cisco-source", "skill-scanner", "mcp-scanner", "artex", "cloudflare-validation"]},
        "target_id": {"type": "string", "minLength": 1}, "version": {"$ref": "#/$defs/nullableString"},
        "mode": {"type": "string", "minLength": 1}, "required": {"type": "boolean"},
        "status": {"enum": ["planned", "running", "completed", "partial", "failed", "skipped"]},
        "native_exit": {"type": ["integer", "null"]}, "invocation": {"type": "array", "items": {"type": "string", "minLength": 1}},
        "backend": {"$ref": "#/$defs/nullableString"}, "model": {"$ref": "#/$defs/nullableString"},
        "config_digest": {"$ref": "#/$defs/nullableString"}, "prompt_digest": {"$ref": "#/$defs/nullableString"},
        "raw_artifacts": {"$ref": "#/$defs/strings"}, "coverage": {"$ref": "#/$defs/coverage"},
        "gaps": {"$ref": "#/$defs/strings"}
      }
    },
    "run": {
      "type": "object", "additionalProperties": false,
      "required": ["schema_version", "run_id", "started_at", "status", "targets", "engines", "budget", "authorization_ref", "artifacts", "gaps"],
      "properties": {
        "schema_version": {"const": 1}, "run_id": {"type": "string", "minLength": 1},
        "started_at": {"type": "string", "format": "date-time"}, "status": {"enum": ["planned", "running", "completed", "partial", "failed"]},
        "targets": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/target"}},
        "engines": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/engine"}},
        "budget": {"$ref": "#/$defs/budget"}, "authorization_ref": {"type": "string", "minLength": 1},
        "artifacts": {"type": "array", "items": {"$ref": "#/$defs/artifact"}}, "gaps": {"$ref": "#/$defs/strings"}
      }
    },
    "origin": {
      "type": "object", "additionalProperties": false,
      "required": ["engine", "native_id", "run_revision", "native_severity", "native_confidence", "native_verdict", "raw_artifacts"],
      "properties": {
        "engine": {"type": "string", "minLength": 1}, "native_id": {"type": "string", "minLength": 1},
        "run_revision": {"type": "string", "minLength": 1}, "native_severity": {"$ref": "#/$defs/nullableString"},
        "native_confidence": {"$ref": "#/$defs/nullableString"}, "native_verdict": {"$ref": "#/$defs/nullableString"},
        "raw_artifacts": {"$ref": "#/$defs/strings"}
      }
    },
    "candidate": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "target_id", "claim", "locations", "origins", "evidence", "gaps"],
      "properties": {
        "id": {"type": "string", "minLength": 1}, "target_id": {"type": "string", "minLength": 1},
        "claim": {"type": "string", "minLength": 1}, "locations": {"$ref": "#/$defs/strings"},
        "origins": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/origin"}},
        "evidence": {"$ref": "#/$defs/strings"}, "gaps": {"$ref": "#/$defs/strings"}
      }
    },
    "finding": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "target_id", "claim", "locations", "origins", "cwe", "validation", "reproduction", "proof_context", "status", "severity", "rationale", "discoverer", "verifier", "evidence", "expected_result", "observed_result", "runtime_receipt", "gaps", "next_check"],
      "properties": {
        "id": {"type": "string", "minLength": 1}, "target_id": {"type": "string", "minLength": 1},
        "claim": {"type": "string", "minLength": 1}, "locations": {"$ref": "#/$defs/strings"},
        "origins": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/origin"}},
        "cwe": {"$ref": "#/$defs/nullableString"}, "validation": {"enum": ["supported", "refuted", "inconclusive"]},
        "reproduction": {"enum": ["not_attempted", "reproduced", "not_reproduced", "blocked"]},
        "proof_context": {"enum": [null, "local_sandbox", "authorized_runtime"]},
        "status": {"enum": ["confirmed", "needs_validation", "rejected"]},
        "severity": {"enum": [null, "info", "low", "medium", "high", "critical"]},
        "rationale": {"type": "string", "minLength": 1}, "discoverer": {"type": "string", "minLength": 1},
        "verifier": {"type": "string", "minLength": 1}, "evidence": {"$ref": "#/$defs/strings"},
        "expected_result": {"$ref": "#/$defs/nullableString"}, "observed_result": {"$ref": "#/$defs/nullableString"},
        "runtime_receipt": {"$ref": "#/$defs/nullableString"}, "gaps": {"$ref": "#/$defs/strings"},
        "next_check": {"$ref": "#/$defs/nullableString"}
      },
      "allOf": [
        {"if": {"properties": {"status": {"const": "confirmed"}}}, "then": {"properties": {
          "validation": {"const": "supported"}, "reproduction": {"const": "reproduced"},
          "proof_context": {"enum": ["local_sandbox", "authorized_runtime"]},
          "severity": {"enum": ["info", "low", "medium", "high", "critical"]},
          "evidence": {"minItems": 1}, "expected_result": {"type": "string"}, "observed_result": {"type": "string"}
        }}},
        {"if": {"properties": {"status": {"const": "needs_validation"}}}, "then": {"properties": {
          "validation": {"enum": ["supported", "inconclusive"]}, "severity": {"const": null},
          "gaps": {"minItems": 1}, "next_check": {"type": "string"}
        }}},
        {"if": {"properties": {"status": {"const": "rejected"}}}, "then": {"properties": {
          "validation": {"const": "refuted"}, "severity": {"const": null}, "evidence": {"minItems": 1}
        }}},
        {"if": {"properties": {"proof_context": {"const": "authorized_runtime"}}}, "then": {"properties": {"runtime_receipt": {"type": "string"}}}}
      ]
    },
    "findings": {
      "type": "object", "additionalProperties": false,
      "required": ["schema_version", "run_id", "findings", "pending_candidates"],
      "properties": {
        "schema_version": {"const": 1}, "run_id": {"type": "string", "minLength": 1},
        "findings": {"type": "array", "items": {"$ref": "#/$defs/finding"}},
        "pending_candidates": {"type": "array", "items": {"$ref": "#/$defs/candidate"}}
      }
    },
    "runtime": {
      "type": "object", "additionalProperties": false,
      "required": ["schema_version", "run_id", "target_id", "url", "task_id", "integration", "snapshot", "deployment", "allowlist", "account_refs", "effects", "budget", "backend_egress", "status", "stop_reason", "coverage", "traffic_artifacts", "replays"],
      "properties": {
        "schema_version": {"const": 1}, "run_id": {"type": "string", "minLength": 1}, "target_id": {"type": "string", "minLength": 1},
        "url": {"type": "string", "minLength": 1}, "task_id": {"$ref": "#/$defs/nullableString"}, "integration": {"enum": ["manual_external", "verified_adapter"]},
        "snapshot": {
          "type": "object", "additionalProperties": false,
          "required": ["repository", "commit", "dependency_digest", "tool_digest", "image_digests", "review_artifacts"],
          "properties": {
            "repository": {"$ref": "#/$defs/nullableString"}, "commit": {"$ref": "#/$defs/nullableString"},
            "dependency_digest": {"$ref": "#/$defs/nullableString"}, "tool_digest": {"$ref": "#/$defs/nullableString"}, "image_digests": {"$ref": "#/$defs/strings"},
            "review_artifacts": {"$ref": "#/$defs/strings"}
          }
        },
        "deployment": {"$ref": "#/$defs/identity"}, "allowlist": {"$ref": "#/$defs/strings"},
        "account_refs": {"$ref": "#/$defs/strings"}, "effects": {"$ref": "#/$defs/strings"},
        "budget": {"$ref": "#/$defs/budget"}, "backend_egress": {"$ref": "#/$defs/strings"},
        "status": {"enum": ["planned", "running", "completed", "partial", "failed", "skipped"]},
        "stop_reason": {"$ref": "#/$defs/nullableString"}, "coverage": {"$ref": "#/$defs/coverage"},
        "traffic_artifacts": {"$ref": "#/$defs/strings"},
        "replays": {"type": "array", "items": {
          "type": "object", "additionalProperties": false,
          "required": ["finding_id", "session", "observed_at", "verifier", "expected_result", "observed_result", "evidence", "outcome"],
          "properties": {
            "finding_id": {"type": "string", "minLength": 1}, "session": {"type": "string", "minLength": 1},
            "observed_at": {"type": "string", "format": "date-time"}, "verifier": {"type": "string", "minLength": 1}, "expected_result": {"type": "string", "minLength": 1},
            "observed_result": {"type": "string", "minLength": 1}, "evidence": {"$ref": "#/$defs/strings"},
            "outcome": {"enum": ["reproduced", "not_reproduced", "blocked"]}
          }
        }}
      },
      "allOf": [
        {"if": {"properties": {"status": {"enum": ["running", "completed"]}}}, "then": {"properties": {
          "task_id": {"type": "string", "minLength": 1},
          "snapshot": {"properties": {
            "repository": {"type": "string", "minLength": 1}, "commit": {"type": "string", "minLength": 1},
            "dependency_digest": {"type": "string", "minLength": 1}, "tool_digest": {"type": "string", "minLength": 1},
            "review_artifacts": {"minItems": 1}
          }}
        }}},
        {"if": {"properties": {"status": {"enum": ["partial", "failed", "skipped"]}}}, "then": {"properties": {
          "stop_reason": {"type": "string", "minLength": 1}
        }}}
      ]
    },
    "gate": {
      "type": "object", "additionalProperties": false,
      "required": ["schema_version", "run_id", "status", "policy", "required_engines", "blocking_records", "reasons"],
      "properties": {
        "schema_version": {"const": 1}, "run_id": {"type": "string", "minLength": 1},
        "status": {"enum": ["pass", "findings", "incomplete", "error"]},
        "policy": {"type": "string", "minLength": 1}, "required_engines": {"$ref": "#/$defs/strings"},
        "blocking_records": {"$ref": "#/$defs/strings"}, "reasons": {"$ref": "#/$defs/strings"}
      }
    }
  }
}
```

## Status mapping

| Observation | Independent validation | Reproduction | OMA disposition |
|---|---|---|---|
| Engine reports a candidate; no verifier | Unreviewed | Any native claim | `pending_candidates`; not a final finding |
| Current source supports a claim; decisive proof unavailable | Supported/inconclusive | Not attempted/blocked | `needs_validation`, exact blocker and next check, no normalized severity |
| Independent bounded proof observes the claimed boundary crossing | Supported | Reproduced | `confirmed`, proof context and demonstrated severity |
| Current evidence shows a preventing control or impossible prerequisite | Refuted | Not required | `rejected`, retain counterevidence |
| Replay does not produce the claimed result | Inconclusive unless refuted | Not reproduced | Preserve observation; do not infer safety or automatic rejection |
| Engine errors, refuses, times out, or exceeds budget | Not a vulnerability verdict | Not proof | Failed/partial engine receipt; never an empty successful scan |

A native Deepsec `true-positive`, Cisco confidence, or ARTEX finding label stays in `origins`; none automatically selects an OMA confirmed branch.
For source-only evidence set `proof_context`, expected/observed result, and runtime receipt to null. Preserve attempted-but-blocked execution as a gap, not a fabricated observation.
For a local proof retain the bounded fixture/command, OS sandbox controls, scratch/promotion receipt, timestamps, exit, and observed result in trusted evidence.
For a runtime proof retain the deployment/session identity, authorized scope, request/response evidence, independent replay, actual boundary crossed, and verifier in `runtime.json`.

## Semantic checks beyond JSON Schema

- Run IDs match every file; engine/finding target IDs resolve to this run's targets; IDs are unique.
- Final handoff receipts have terminal states; planned/running states and missing required receipt/review evidence cannot satisfy completion or gate acceptance.
- Completed engine receipts identify the actual version/backend/model and configuration/prompt digest when applicable; null means unavailable and must have an explicit coverage/evidence gap.
- Discoverer and verifier are different; each retained record has current independent review. Material changes to root cause, proof, impact, or status require fresh independent review.
- Every evidence/raw reference resolves to retained content with a matching hash/size; restricted originals and redacted derivatives are distinguished.
- Artifact paths stay under the run directory or an explicitly recorded native workspace; reject unsafe relative traversal and symlink promotion.
- Every confirmed claim has identity-bound observed proof and a nonempty explanation of demonstrated impact; an engine's severity cannot substitute for it.
- Runtime replay finding IDs and session match the receipt. Missing deployment revision limits the report to that observed session, never the checked-out source.
- `reviewed` and `unreviewed` are disjoint subsets of planned coverage; skips and exclusions remain visible; no engine failure is converted to zero findings.
- Required runtime tasks have bounded allowlists/budgets and task completion evidence; LLM/backend egress does not expand attack-target scope.
- Before task creation, unknown runtime task/snapshot fields stay null. A skipped/failed readiness check records its blocker in `stop_reason` and the engine/run gaps; never invent a task ID or digest. Running/completed tasks require actual reviewed snapshot/task identities and all used image digests. Partial tasks retain every identity already observed.
- Unvalidated candidates remain pending; a required candidate review that cannot run makes the invocation partial and prevents a clean gate.

## Example: planned source run

```json
{
  "schema_version": 1,
  "run_id": "20261010-example",
  "started_at": "2026-10-10T00:00:00Z",
  "status": "planned",
  "targets": [{
    "id": "app-source", "type": "source", "reference": "/workspace/example-app",
    "identity": {"commit": "example-source-commit", "dirty_digest": "sha256:example-scoped-inputs", "input_digest": null, "deployment_revision": null, "image_digest": null, "environment": null, "session": null},
    "scope": {"include": ["src/handler.ts"], "exclude": [], "allowlist": [], "effects": ["static-read"], "account_refs": []},
    "baseline": "example-base-commit"
  }],
  "engines": [{
    "engine": "deepsec", "target_id": "app-source", "version": null, "mode": "diff", "required": true, "status": "planned",
    "native_exit": null, "invocation": [], "backend": null, "model": null, "config_digest": null, "prompt_digest": null,
    "raw_artifacts": [], "coverage": {"unit": "file", "planned": ["src/handler.ts"], "reviewed": [], "unreviewed": ["src/handler.ts"], "exclusions": []},
    "gaps": ["Prerequisite and version inspection has not run."]
  }],
  "budget": {"max_cost_usd": 1, "duration_s": 60, "requests": null, "concurrency": 1, "tokens": null},
  "authorization_ref": "user-selected-example-calibration-scope",
  "artifacts": [], "gaps": []
}
```

## Example: reviewed lead without executable proof

```json
{
  "schema_version": 1,
  "run_id": "20261010-example",
  "findings": [{
    "id": "source-authorization-handler",
    "target_id": "app-source",
    "claim": "The handler may return another tenant's record without checking ownership.",
    "locations": ["src/handler.ts:42"],
    "origins": [{"engine": "deepsec", "native_id": "native-17", "run_revision": "pass-1", "native_severity": "HIGH", "native_confidence": null, "native_verdict": "true-positive", "raw_artifacts": ["raw/deepsec/native-17.json"]}],
    "cwe": "CWE-862",
    "validation": "supported",
    "reproduction": "blocked",
    "proof_context": null,
    "status": "needs_validation",
    "severity": null,
    "rationale": "The independent source trace supports the claim; no bounded execution evidence exists.",
    "discoverer": "deepsec-pass-1",
    "verifier": "verifier-1",
    "evidence": ["evidence/verifier-1-source.json"],
    "expected_result": null,
    "observed_result": null,
    "runtime_receipt": null,
    "gaps": ["No OS-enforced sandbox is available."],
    "next_check": "In an isolated local fixture, compare ownership enforcement for two dummy tenants."
  }],
  "pending_candidates": []
}
```

This is synthetic contract data, not evidence that this repository contains that vulnerability.

## Example: skipped runtime without a reviewed platform

```json
{
  "schema_version": 1,
  "run_id": "20261010-runtime-example",
  "target_id": "test-site",
  "url": "http://127.0.0.1:18080/",
  "task_id": null,
  "integration": "manual_external",
  "snapshot": {"repository": null, "commit": null, "dependency_digest": null, "tool_digest": null, "image_digests": [], "review_artifacts": []},
  "deployment": {"commit": null, "dirty_digest": null, "input_digest": null, "deployment_revision": null, "image_digest": null, "environment": "isolated-example", "session": "example-session"},
  "allowlist": ["http://127.0.0.1:18080/"],
  "account_refs": ["dummy-tenant-a", "dummy-tenant-b"],
  "effects": ["read-dummy-records"],
  "budget": {"max_cost_usd": 1, "duration_s": 60, "requests": 20, "concurrency": 1, "tokens": 1000},
  "backend_egress": ["https://example-llm.invalid/"],
  "status": "skipped",
  "stop_reason": "No reviewed ARTEX artifact or platform task is available.",
  "coverage": {"unit": "endpoint", "planned": ["GET /dummy-records/{id}"], "reviewed": [], "unreviewed": ["GET /dummy-records/{id}"], "exclusions": ["redirect targets outside allowlist"]},
  "traffic_artifacts": [],
  "replays": []
}
```

All example identities/digests are synthetic. Replace them with observed values; a planned receipt never authorizes execution or establishes a completed review.

## Deduplication and reporting

Derive a stable candidate ID from target identity namespace, normalized location/interface, root-cause claim, and relevant source-to-boundary path; preserve the mapping from every native ID.
Compare actual root causes before grouping. Shared titles, CWE, line proximity, or matching severities alone are insufficient.
Within a group retain each origin, native severity/verdict, raw artifact, suppression, independent decision, and revision; keep contradictory results visible.
Do not merge across distinct source/deployment revisions merely because the title matches; link the records as related issues instead.
After target changes, retain old proof and mark the new identity unverified until affected source/runtime checks rerun.
Keep rejected leads to prevent repeated unsupported claims; suppression needs a recorded reason and current evidence, not deletion of the raw finding.
Reports derive from current records: confirmed findings with demonstrated severity, reviewed validation leads without severity, pending candidates, rejection rationale where relevant, measured coverage, failures, and next checks.
Retain raw traffic/logs in restricted local storage; produce separate redacted sharing copies. Credentials and private user data never appear in normalized records or reports.
When an active `/security` workflow requires state decisions, follow its actual event/checkpoint contract using this run/finding identity; do not invent checkpoints or use a retired workflow name.
