# Per-Task Test Approach & TDD Evidence

Opt-in, per-task test strategy carried in the PM plan (`plan-{sessionId}.json`).
PM assigns it (see `oma-pm/resources/execution-protocol.md` Step 3); implementation
agents honor it; QA and Ultrawork gates verify evidence **only** for tasks marked `tdd`.

## Approaches

| `test_approach` | Meaning | Agent obligation |
|---|---|---|
| `tdd` | Deterministic, high-risk behavior (validation, authorization, state transitions, calculations, error handling) | Write and run the focused test **before** the production change (RED), make the minimal change (GREEN), refactor only if needed. Record a `TDD_EVIDENCE` block in the result file. |
| `test_after` | Automated tests required, but a useful isolated RED state is impractical | Write tests with/after the implementation. No evidence block required. |
| `not_applicable` | Automated tests inappropriate | Perform the plan's `alternative_verification` and report its outcome. Plan must carry `test_approach_rationale`. |

Tasks without a `test_approach` field behave as today (tests per the agent's
normal protocol). Refactor tasks never use `tdd` — they keep the
characterization-test safety net (`oma-refactor`).

## Coverage non-waiver rule

No `test_approach` value relaxes the global unit-test coverage gate
(**>= 80%**, QA checklist / SHIP_GATE). `not_applicable` code still counts
toward the aggregate; excluding it requires a declarative entry in the
project's coverage config with justification — never a silent drop.

## TDD_EVIDENCE block format

Append to the agent's result file (`result-{agent}.md`), one entry per `tdd` task:

```
TDD_EVIDENCE:
- task: task-2
  test_command: bun test src/services/discount.test.ts
  red: "expected 400, received 200" (before implementation)
  green: 12 pass, 0 fail (after implementation)
```

Requirements (enforced by `oma verify <agent>` → "TDD Evidence" check):

1. Block starts with the literal marker `TDD_EVIDENCE:`
2. Every `tdd` task id from the plan appears in the block
3. At least one `red:` entry (the observed failure before the change) and one
   `green:` entry (the passing result after the change)

A task may opt out with `tdd_evidence_required: false` in the plan (e.g., the
RED state is demonstrated in a linked CI run instead); the rationale belongs in
the task description.

## Debug parity

Debug regression tests follow the same discipline where feasible: run the
regression test before applying the fix, record the failing output (RED) and
the post-fix pass (GREEN) in the bug report / result file.
