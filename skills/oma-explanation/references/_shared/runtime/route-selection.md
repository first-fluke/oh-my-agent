# Route Selection Record

Load when a skill chooses among alternative routes at runtime: an upstream
supplier skill, vendor/provider, engine, backend, or mode. Hooks already record
which skill was routed (`skill.routed`); this record captures the choice made
inside the skill and why.

## When

Record once per selection, after choosing and before loading or running the
selected route. Record again only when a later operation selects a different
route. Do not record forced single-option paths, pure handoffs to another
specialist skill, or choices a CLI makes automatically without agent judgement.

## Command

Call `oma state emit` directly with actual values; never emit placeholders:

```bash
oma state emit "decision.made" '{"subject":"<domain>.route-selection","instanceId":"<request or artifact revision>:<operation>","decision":"<selected route>: <supplier/vendor/engine and operation>","rationale":"<matched routing rule, explicit user request, or observed availability>","alternatives":["<other routes considered>"]}' --category routing
```

- `subject`: the owning skill's domain, e.g. `design.route-selection`. Use the
  subject the skill names.
- `decision`: the selected route and operation, specific enough to replay.
- `rationale`: the routing rule or table row that matched, an explicit user
  request, or the availability/auth/cost fact that decided it.
- `alternatives`: the routes that were viable but not chosen.
- `--category routing` resolves the live workflow session when one owns the
  work, otherwise a `skill-routing` session created on demand.

If `oma` is unavailable or the emit fails, continue the task and state the
selected route and reason in the result instead. A missing record never blocks
the work.
