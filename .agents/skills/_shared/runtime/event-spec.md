# OMA L1 Event Spec

This file defines the minimum durable event contract for cross-runtime workflow state.
Events are appended to `.agents/state/sessions/{sid}/events.jsonl`.

## Common Fields

Every event MUST be a single JSON object on one JSONL line:

```json
{
  "eventId": "01HXZK...",
  "ts": "2026-05-25T00:00:00.000Z",
  "sid": "oma-...",
  "kind": "decision.made",
  "writerPid": 12345,
  "vendor": "codex",
  "vendorSid": "runtime-session-id",
  "parentEventId": "01HXZJ...",
  "causalityKey": "workflow-gate",
  "payload": {}
}
```

Required fields:

- `eventId`: unique sortable id generated before append.
- `ts`: ISO timestamp.
- `sid`: OMA session id.
- `kind`: event kind.
- `writerPid`: process id or runtime equivalent.

Optional fields:

- `vendor`: runtime/vendor name.
- `vendorSid`: runtime/vendor session id.
- `parentEventId`: prior event id for causal interpretation.
- `causalityKey`: stable grouping key for related events.
- `payload`: event-specific JSON object.

Readers MUST derive state by sorting valid events by `(ts, eventId)`. Raw file order is an implementation detail only.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://oh-my-agent.dev/schemas/l1-event.schema.json",
  "title": "OMA L1 Event",
  "type": "object",
  "required": ["eventId", "ts", "sid", "kind", "writerPid"],
  "additionalProperties": false,
  "properties": {
    "eventId": { "type": "string", "minLength": 1 },
    "ts": { "type": "string", "format": "date-time" },
    "sid": { "type": "string", "minLength": 1 },
    "kind": { "type": "string", "minLength": 1 },
    "writerPid": { "type": "integer" },
    "vendor": { "type": "string" },
    "vendorSid": { "type": "string" },
    "parentEventId": { "type": "string" },
    "causalityKey": { "type": "string" },
    "payload": {
      "type": "object",
      "properties": {
        "instanceId": { "type": "string", "pattern": "\\S" }
      }
    }
  },
  "allOf": [
    {
      "if": { "properties": { "kind": { "const": "decision.made" } } },
      "then": {
        "required": ["payload"],
        "properties": {
          "payload": {
            "type": "object",
            "required": ["subject", "decision", "rationale"],
            "properties": {
              "subject": { "type": "string", "pattern": "\\S" },
              "decision": { "type": "string", "pattern": "\\S" },
              "rationale": { "type": "string", "pattern": "\\S" }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "kind": { "const": "session.ended" } } },
      "then": {
        "required": ["payload"],
        "properties": {
          "payload": {
            "type": "object",
            "required": ["status"],
            "properties": {
              "status": { "enum": ["completed", "failed"] }
            }
          }
        }
      }
    },
    {
      "if": { "properties": { "kind": { "const": "blocker.raised" } } },
      "then": {
        "required": ["payload"],
        "properties": {
          "payload": {
            "required": ["summary"],
            "properties": { "summary": { "type": "string", "pattern": "\\S" } }
          }
        }
      }
    }
  ]
}
```

## Event Kinds

### `boundary`

Durable vendor/session transition mapping.

Required payload fields:

- `reason`
- `toVendor`
- `toVendorSid`

Optional payload fields:

- `fromVendor`
- `fromVendorSid`
- `previousSid`

### `session.created`

Starts an OMA L1 workflow session.

Required payload fields:

- `workflow`
- `category`

### `workflow.phase`

Records a phase transition.

Required payload fields:

- `phase`

### `gate.passed`

Records a passed gate.

Required payload fields:

- `gate`

Optional payload fields:

- `by`
- `evidence`

### `gate.failed`

Records a failed gate.

Required payload fields:

- `gate`
- `reason`

### `blocker.raised`

Records a workflow blocker.

Required payload fields:

- `summary`

Optional payload fields:

- `severity`
- `remediation`

### `decision.made`

Records a critical decision that must survive vendor/session boundaries without AgentMemory.

Required payload fields:

- `subject`: stable verifier key, such as `ultrawork.plan-approved`.
- `decision`: concise decision summary.
- `rationale`: why this decision was made.

Optional payload fields:

- `alternatives`
- `evidence`
- `instanceId`: concrete finding, revision, or attempt identifier. Required when the event must satisfy a workflow checkpoint.

> **Substitute real content.** Fill `decision` and `rationale` with the actual choice and cause. Preserve the fixed `subject`; use the same concrete `instanceId` in the emitted payload and verifier. Empty or whitespace-only decision fields are rejected. An optional decision without `instanceId` is retained but cannot satisfy a required checkpoint.

Use an instance that changes when the reviewed item changes: iteration plus plan revision, a finding ID plus patch/revalidation revision, or a target path plus patch revision. A single session-wide constant allows old decisions to satisfy later work. Keep IDs identical for emit and verify; do not emit literal angle-bracket placeholders.

### `decision.missing`

Records deterministic verifier failure for a required `decision.made` event.

Required payload fields:

- `workflow`
- `checkpoint`
- `instanceId`
- `missing`
- `remediation`

### `session.ended`

Records terminal workflow state.

Required payload fields:

- `status`: `completed` or `failed`.

Optional payload fields:

- `reason`: completion cause or failure reason.

Completion gates and explicit workflow completion end the session as `completed`. Exhausted budgets end it as `failed` with a reason. A failed retryable gate keeps the session active. Terminal events remove matching active-index entries. Persistent-mode termination also exports the coordination summary; other callers can use `oma state summary`. Unsupported terminal statuses are diagnosed and do not mark a session completed.

## Emitting Decisions

Call `oma state emit` **directly** at each required checkpoint — do not wrap it in a shell helper.

Every Bash tool call runs in a fresh shell, so a shell function defined in one call (such as the historical `oma_emit`) does not exist in the next call. The wrapper saved nothing over the underlying command and only produced "command not found" fallbacks, so it has been removed.

Required decision example:

```bash
oma state emit "decision.made" '{"subject":"ultrawork.plan-approved","instanceId":"iteration-1:plan-v2","decision":"Use SQLite for the local append-only retry ledger.","rationale":"The approved scope requires cross-process serialization without a hosted service."}'
oma state verify --workflow ultrawork --checkpoint plan-approved --instance "iteration-1:plan-v2"
```

Required verification matches both `subject` and `instanceId` and checks nonblank decision content, including historical records. A decision for an earlier iteration, patch, or finding cannot satisfy the current checkpoint. `oma doctor` reports malformed event envelopes and payloads without rewriting the authoritative log.

Core kinds above have stable contracts. Additional event kinds may be used by extensions; they do not satisfy core decision or terminal contracts.
