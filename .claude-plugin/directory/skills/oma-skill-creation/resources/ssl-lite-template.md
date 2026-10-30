# SSL-lite Skill Template

Keep the four top-level sections. Describe execution once in the canonical path. Add a
subsection only when it contributes a distinct branch, contract, or constraint; do not copy
the same steps into Entry, Scenes, Actions, and the canonical path.

````markdown
---
name: oma-{skill-name}
description: >
  {Concise task/domain description and routing triggers.}
---

# {Skill Title}

## Scheduling

### Goal
{Capability and intended outcome.}

### Intent signature
- {Concrete trigger; this section supports specialist routing.}

### When to use
- {Positive use case.}

### When NOT to use
- {Boundary} -> {other skill or tool}.

### Expected inputs
- `{input}`: {meaning and required constraints}.

### Expected outputs
- {Result and evidence needed to establish completion}.

### Dependencies
- {Required tools or resources; state when optional resources are loaded}.

## Structural Flow

### Transitions
- If {condition}, {branch or next action}.

### Failure and recovery
| Failure | Recovery |
|---|---|
| {Concrete failure mechanism} | {Executable remedy or accurate partial result} |

### Exit
- Success: {observable condition}.
- Partial/failed: {unresolved work and evidence to retain}.

## Logical Operations

### Canonical workflow path
1. {Resolve inputs and necessary preconditions}.
2. {Perform the domain operation using concrete files, tools, or commands}.
3. {Run the applicable validator and report the observed outcome}.

### Resource scope and effects
{Affected files/processes/services, writes, credentials, destructive actions, or cost.}

### Guardrails
- {Domain-specific harmful action to avoid}.
- {Constraint not already covered by shared policy or the canonical path}.

## References
- {Purpose}: `resources/{file}.md` ({condition for loading it}).
````

## Optional detail

- For command-heavy skills, rename the canonical heading to `### Canonical command path`
  and include the exact commands there. Use exactly one canonical heading.
- Add `Entry` or `Preconditions` only for conditions that do not fit the canonical path.
- Add `Scenes` for a real state machine with named phases. The canonical path should then
  dispatch those phases instead of repeating their steps.
- Add an `Actions` table only when actor/tool bindings or evidence differ in ways a normal
  procedure cannot express. SSL primitive labels alone do not justify a second procedure.
- Add `Control-flow features`, `Tools and instruments`, or a scope table only when they add
  information beyond Transitions, Dependencies, and Resource scope and effects.
- Keep long examples, provider variants, and detailed checklists in resources. Do not make
  every task load them. Parsed output examples and schemas are useful; decorative sample
  reports are not required.

## Machine-checkable outputs

When artifacts can be globbed, replace the freeform Expected outputs bullets with an
`outputs:` YAML block. `oma verify` checks required artifact presence via
`parseExpectedOutputs`:

```yaml
outputs:
  - name: plan
    description: PM task breakdown
    artifact: ".agents/results/plan-*.json"
    required: true
```

`artifact` is workspace-relative and supports `**`. `required` defaults to false. This is
an artifact-presence contract, not proof of correctness. Keep the matching verification
command or evidence requirement in the canonical path.

## Validation

Use `validation-checklist.md` for structural, routing, reference, and utility checks. The
skill must encode a concrete failure and remedy, executable domain steps, and relevant
harmful-action limits. Section count and repeated terminology are not measures of quality.
