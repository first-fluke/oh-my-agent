# SSL-lite Skill Validation Checklist

Use this checklist after creating or updating a skill. `oma skill lint --skill {skill-name}` automates the Required Structure checks plus broken-reference and boundary detection — run it first and use this checklist to interpret findings and cover what lint cannot judge (content quality, routing wording, utility dimensions).

## Required Structure

- YAML frontmatter exists.
- Frontmatter includes `name`.
- Frontmatter includes a routing-grade `description`.
- The only top-level `##` headings outside code fences are exactly:
  - `## Scheduling`
  - `## Structural Flow`
  - `## Logical Operations`
  - `## References`
- The skill contains exactly one of:
  - `### Canonical command path`
  - `### Canonical workflow path`

## Scheduling Checks

- `Goal` states the capability and outcome.
- `Intent signature` contains concrete user prompt patterns or domain triggers.
- `When to use` gives positive routing cases.
- `When NOT to use` names boundaries and cross-routes to adjacent skills.
- `Expected inputs` and `Expected outputs` are explicit. If the skill produces machine-checkable artifacts, prefer the structured `outputs:` YAML block over freeform bullets so `oma verify` can run a closure check.
- `Dependencies` names tools, files, standards, APIs, or resources.
- Branching, tool calls, writes, and clarification points are represented where relevant; a separate `Control-flow features` section is optional.

## Cross-Skill Boundary Check

- Keep the description to the capability, concrete trigger, and material exclusion. Move supplier lists, method catalogs, cost detail, and output decoration into the relevant reference. The exclusion must be visible before the skill is loaded.
- Audit nested resources for unconditional preloads, repeated approval, conflicting coverage targets, and obsolete result paths. Generated mirrors are checked through their emit path.
- Use `prompt-evaluation.md` for behavioral changes; a clean lint result does not establish utility or savings on a named model.

- Run `oma skill audit` (or `oma doctor`) after editing frontmatter `description`.
- Resolve any `FAIL` (≥ 75% similarity) pair by rewriting one description to highlight distinct triggers, domains, or boundaries.
- `WARN` (≥ 60%) pairs are acceptable when descriptions cover genuinely related domains; document the distinction in `When NOT to use` cross-routes.

## Utility Content Checks (SkillLens rubric)

Three content dimensions predict whether a skill measurably improves task outcomes
(SkillLens, arXiv:2605.23899). Section structure, formatting, and prose fluency alone do
not — a well-written skill can still fail `oma skill eval`.

- **Failure mechanism encoding**: `Failure and recovery` (and guardrails) explain *why* the
  agent fails in this domain and give an executable remedy. Reject generic advice
  ("be careful", "edit minimally"); encode domain-specific failure modes
  (e.g. "formulas don't evaluate in headless runs, so precompute static values").
- **Actionable specificity**: the canonical path is a step-level procedure referencing
  concrete domain objects, tools, flags, and file paths. An agent should be able to act
  without re-deriving the procedure from scratch.
- **High-risk action blacklist**: guardrails name and forbid the domain's specific harmful
  action patterns (e.g. "never run `terraform apply` without a reviewed plan"), not only
  positive instructions.
- When in doubt, verify with `oma skill eval` fixtures instead of judging by prose quality —
  textual plausibility does not predict utility.

## Execution and Constraint Checks

- The canonical path is operational enough to follow without re-deriving commands or loading every resource.
- Entry conditions, transitions, success/partial/failure outcomes, and side effects are clear. They do not require separate sections when already stated in the canonical path or recovery table.
- `Scenes` is optional; include it only for distinct states/phases, not a second copy of the procedure.
- `Actions` is optional; include a table only for meaningful actor/tool/evidence bindings, not to attach SSL labels to steps already described.
- Dependencies and affected files/processes/services are identified. Add tool or scope tables only when they contribute missing detail.
- Preconditions and harmful-action limits are concrete and domain-specific.

## Duplication Checks

- One authoritative place owns each procedure, policy, and output contract.
- Independently invoked skills/workflows keep a short pointer to shared requirements; injected context is not copied into every vendor protocol.
- References list each resource once with a load condition. Do not repeat a prose reading list immediately above the same links.
- Do not count source/generated distribution copies as removable prompt duplication.
- When claiming savings, distinguish file size from assembled prompt size. A smaller repository does not prove lower context usage for each invocation.

## Reference Checks

- `References` points only to files that exist or are intentionally planned.
- Provider-specific variants are in `resources/`, not duplicated inline.
- Any examples that remain document a parsed output contract, not a preferred report shape.
- No instruction tells the agent to re-verify or self-review its own answer; only runnable validators.
- Reference files are one hop from `SKILL.md`; avoid deep reference chains.

## Suggested Commands

Primary — automated smell detection (frontmatter, top-level headings, canonical path, broken references, boundaries, empty failure/recovery):

```bash
oma skill lint --skill {skill-name}
```

Resolve every `fail`-severity smell before finishing; `warn` smells need either a fix or a stated reason.

Fallback when the `oma` CLI is unavailable — check top-level headings and canonical path manually:

```bash
f=".agents/skills/{skill-name}/SKILL.md"
awk 'BEGIN{c=0} /^```/{c=!c; next} !c && /^## /{print $0}' "$f"
rg -n '^### Canonical (command|workflow) path$' "$f"
```

Check formatting whitespace (not covered by `oma skill lint`):

```bash
git diff --check -- ".agents/skills/{skill-name}"
```
