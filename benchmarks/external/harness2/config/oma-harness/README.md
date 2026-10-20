# OMA harness config for Harness²

This directory is a placeholder for expressing OMA's harness as a Harness²
harness configuration. It is **not** an executor adapter, and it does not make
Harness² measure OMA directly.

## Why a config and not an adapter

Harness² ships two substrates: OpenCode (`oc`) and Codex (`cx`). Adding a third
executor is a code-level change under `harness2/substrate/`; upstream does not
document a plugin API. A harness configuration is the lower-effort path: it
runs on an existing substrate and controls the editable harness surface.

The trade-off is fidelity. OpenCode/Codex will not execute OMA's vendor hooks,
`.qwen`/`.claude` settings, or slash commands. Only prompt/skill/subagent-shaped
artifacts survive the port.

## Mapping

| Harness² component | OMA source | Portability |
|---|---|---|
| System prompt | `AGENTS.md`, vendor instruction files | High |
| Guardrails | `.agents/rules/`, commit/quality rules | Medium (prompt only) |
| Memory | `.agents/state/`, memory policy | Low (runtime-specific) |
| Tool guidance | `.agents/skills/*/references`, tool rules | High |
| Subagents | `.agents/agents/`, vendor agent files | High |
| Skills | `.agents/skills/*/SKILL.md` | High |
| Scripts | hooks, `cli/commands/*` | Low (hooks do not run) |
| Plugins | vendor extensions, MCP servers | Low (substrate-specific) |

## Layout to create

Match the upstream harness layout (see
`third_party/jb_runner/harness_baseline_oc/` in the Harness² checkout):

```
config/oma-harness/
  harness.yaml
  systemprompt.md
  guardrails.md
  sub_agents/
  tool_descriptions/
  scripts/
```

Start from one benchmark subset, keep the baseline harness unchanged, and vary
only the OMA-derived files. Record the mapping and every deviation in the run
manifest or an adjacent `NOTES.md`.

## Rules

- Do not claim a Harness² result measures OMA unless OMA is the configured
  executor or the port is complete and documented.
- Keep the model, substrate, `k`, mode, seed, and network policy fixed across
  baseline and OMA-harness runs.
- Treat benchmark gains as hypotheses for OMA changes, not as release gates.