# Deepsec Decision Records

Use these records in an active OMA L1 session. Call `oma state emit` directly and follow `../references/_shared/runtime/event-spec.md`. Substitute actual values; placeholder text does not record a decision. A record preserves the choice and its evidence; it does not authorize the action or require a new approval.

## Execution scope

Before the first paid action under a selected plan, or a consequential change of backend, scope, or budget, reuse existing authorization and record the selected action. A current record covering subsequent passes in that same plan remains sufficient; do not repeat an unchanged choice before each CLI command. Include the project/pass identity, backend/model, file/matcher scope, limits, estimated cost, and authorization source. Record approved, limited, and declined outcomes; execute only the authorized outcome. Credentials and a configured backend do not grant spend authorization. A file limit bounds work, not dollars.

```bash
oma state emit "decision.made" '{"subject":"deepsec.execution-scope","instanceId":"<project ID>:<planned pass revision>","decision":"<approved|limited|declined>: <backend/model>; <file/matcher scope>; <limits and estimated spend>","rationale":"<existing authorization or actual limitation/decline and calibrated estimate>","outcome":"<approved|limited|declined>","backend":"<selected backend>","scope":"<actual file/matcher/pass scope>","evidence":["<calibration/cost/scope artifact path>"]}'
oma state verify --workflow deepsec --checkpoint execution-scope --instance "<project ID>:<planned pass revision>"
```

No event is required for routine free scan/status work with no consequential scope choice. Resolve a material missing authorization before the dependent paid action; do not ask again when existing authorization covers it.

## Finding verdicts

Both the main scan pipeline and standalone triage record every triaged finding before filtering, suppression, or export. Read each finding's actual revalidation verdict and reasoning, including `false-positive` and `fixed` findings that will be omitted from the report. Keep `uncertain` findings visible with the missing evidence; do not convert uncertainty into an accepted verdict.

Use the upstream finding ID and analysis/revalidation run revision to construct `instanceId`: `<project ID>:<finding ID>@<verdict revision>`. If upstream supplies no stable finding ID, derive and retain one from the project ID, source path, vulnSlug, and finding location/title in the run artifact. A revised verdict uses a new revision so an earlier choice cannot satisfy the current checkpoint.

```bash
oma state emit "decision.made" '{"subject":"deepsec.triage-outcome","instanceId":"<project ID>:<finding ID>@<verdict revision>","findingId":"<finding ID>","decision":"<true-positive|false-positive|fixed|uncertain>: <finding ID>, <source path:line>, <specific finding>.","rationale":"<actual code/history evidence supporting this verdict or the evidence still missing>","verdict":"<true-positive|false-positive|fixed|uncertain>","evidence":["<finding FileRecord path>","<analysis/revalidation run artifact path>"]}'
oma state verify --workflow deepsec --checkpoint triage-outcome --instance "<project ID>:<finding ID>@<verdict revision>"
```

Only after each verdict has a current record may the workflow suppress false positives/matched fixes or export the selected findings. A no-findings pass reports that result; it does not invent a finding decision.
