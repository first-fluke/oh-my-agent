---
title: "Guide: Diagram Engine (archify)"
sidebar_label: Diagrams
description: How oh-my-agent chooses between Mermaid and the optional tt-a1i/archify agent skill for architecture, sequence, and data-flow diagrams — the diagram config section, oma diagram resolve / oma diagram archify, how /architecture and /explain use it, and the bounded validate-repair-deliver loop.
---

# Diagram Engine

`/architecture` (ADRs, recommendations, reviews) and `/explain` (code-change explainers) produce structural diagrams. The `/architecture` artifact always includes a **Mermaid** block in Markdown, and the `/explain` workflow draws inline SVG diagrams. When [archify](https://github.com/tt-a1i/archify) resolves, the architecture workflow also emits an **interactive, validated HTML diagram** next to the artifact. It uses a typed JSON spec and supports dark/light themes, pan-zoom, search, relationship tracing, and PNG/SVG/WebM export.

Mermaid never goes away: it is the text SSOT that lives in the Markdown and in git diffs. archify is a derived artifact.

---

<a id="always-the-latest-archify--nothing-to-install"></a>
## Managed archify copy

archify is an MIT-licensed agent skill (Node ≥ 18, zero runtime dependencies). oh-my-agent does not rely on a copy you installed once; it keeps its **own managed copy** and tracks the latest release:

- Cache: `~/.cache/oma-diagram/archify/<tag>/` plus a `state.json` pointer.
- Before each use, `oma diagram resolve` asks GitHub for the latest release tag (throttled to once per `check_interval_min`, default 60 min), downloads the source tarball when a newer tag exists (atomic per-tag directory; older tags pruned), and otherwise reuses the cached copy.
- Network failures are never fatal: the cached copy is used and reported as `stale` with the reason. Only a first run with no network and no cache falls back to a user-installed skill copy, and after that to Mermaid.

```bash
# Illustrative output; the release tag, cache path, and quality can vary.
oma diagram update          # force a check / download now
oma diagram resolve
# engine:   archify  (requested: auto)
# reason:   archify 2.15.0 via managed:v2.15.0 (current)
# root:     /Users/you/.cache/oma-diagram/archify/v2.15.0
# bin:      /Users/you/.cache/oma-diagram/archify/v2.15.0/bin/archify.mjs
# version:  2.15.0
# quality:  showcase
# sidecar:  off (explain)
oma diagram resolve --offline   # never touch the network
```

Resolution order (first hit wins, identical on every vendor runtime):

1. `diagram.archify.path` in `oma-config.yaml` — explicit pin, opts out of auto-latest
2. `ARCHIFY_HOME` environment variable — explicit pin
3. **Managed latest** (`~/.cache/oma-diagram/archify`)
4. User-installed skill dirs: project `.agents` / `.claude` / `.codex` / `.cursor` / `.qwen` / `.kiro` `/skills/archify`, then the same under `~`, plus `~/.raven/workspace/skills/archify`

<!-- oma-docs:ignore-start -->
A hit requires the managed or pinned archify installation to contain `bin/archify.mjs`.
<!-- oma-docs:ignore-end -->

---

## Configuration

Sparse section in `.agents/oma-config.yaml` (absent keys use the defaults shown):

```yaml
diagram:
  engine: auto                # auto | archify | mermaid
  explain_sidecar: false      # /explain also writes an archify sidecar
  archify:
    managed: true             # false = never download; use pins / skill dirs only
    channel: stable           # stable (latest GitHub Release) | main (HEAD of main)
    check_interval_min: 60    # minutes between remote checks; 0 = every call
    path: null                # explicit install dir (pin)
    quality: showcase         # showcase | standard  → --quality
    open: false               # pass --open to deliver
```

### Which engine runs

One decision covers the config value, whether archify resolves, and what the workflow delivers. "Resolves" means any step of the [resolution order](#always-the-latest-archify--nothing-to-install) finds an install: a pin, the managed latest copy, or a user-installed skill dir.

| `diagram.engine` | archify resolves? | `oma diagram resolve --json` | `/architecture` result |
|---|---|---|---|
| `auto` (default) | yes | `engine: archify`, `ok: true` | Mermaid block + linked `.archify.html` |
| `auto` | no (for example first run offline, or `managed: false` with no skill dir) | `engine: mermaid`, `ok: true` | Mermaid only; the report says to run `oma diagram update` once online |
| `archify` | yes | `engine: archify`, `ok: true` | Mermaid block + linked `.archify.html` |
| `archify` | no | `engine: mermaid`, `ok: false`, exit 1 | Workflow stops with the `oma diagram update` hint instead of silently downgrading |
| `mermaid` | not checked | `engine: mermaid`, `ok: true` | Mermaid only; archify is never called |

`oma diagram resolve --engine <auto|archify|mermaid>` overrides the config for one call, and a prompt can do the same for one run (`/explain 640 with archify`).

---

## CLI

```bash
oma diagram resolve [--engine auto|archify|mermaid] [--refresh] [--offline] [--json]
oma diagram update  [--json]
oma diagram archify <archify args…>
```

`oma diagram update` forces a refresh and exits 1 when no archify install can be resolved.

`oma diagram archify` runs the resolved archify executable with `ARCHIFY_UPDATE_CHECK_DISABLED=1` (no network) and propagates the exit code, so `validate` / `deliver` / `visual-check` behave exactly as archify documents them:

```bash
oma diagram archify guide "show the auth request lifecycle" --json
oma diagram archify validate architecture adr-auth.archify.json --quality showcase --json
oma diagram archify deliver  architecture adr-auth.archify.json adr-auth.archify.html --quality showcase --json
oma diagram archify visual-check adr-auth.archify.html --json   # exit 2 = no Chrome (skipped), or archify itself could not be resolved
```

`--json` on `resolve` returns `{ ok, requested, engine, quality, open, explainSidecar, archify?: { root, bin, version, source, status?, note? }, reason, probed }` — `source` is `managed:<tag>`, `config:…`, `env:…`, or a skill-dir label; `status` (`fresh` / `current` / `stale`) and `note` are set for managed copies.

---

## How the workflows use it

The shared protocol lives in `.agents/skills/_shared/conditional/diagram-engine.md`. `/architecture` follows this sequence:

1. `oma diagram resolve --json`
2. Author the Mermaid block first (always).
3. If `engine: archify`: translate the Mermaid topology into archify's JSON IR (`architecture` / `sequence` / `dataflow` / `lifecycle` / `workflow`), reading only the matching schema and one example from the install.
4. `validate` → repair → `deliver`, bounded: stop when the spec passes, when archify's convergence rule fires, after 3 repair attempts, after 10 minutes in total, or when the same diagnostic repeats. Semantic labels are never deleted just to pass.
5. Link the HTML — never embed it.

```mermaid
flowchart TD
  resolve["oma diagram resolve --json"] -->|"ok: false"| stop["Stop: run oma diagram update once online"]
  resolve -->|"ok: true"| author["Author the Mermaid block"]
  author --> engine{"engine?"}
  engine -->|mermaid| mermaidOnly["Deliver the Mermaid block"]
  engine -->|archify| spec["Translate the topology into .archify.json"]
  spec --> loop["validate and repair (bounded)"]
  loop -->|passes| deliver["deliver .archify.html"]
  loop -->|"bound or convergence reached"| keep["Keep Mermaid, leave .archify.json, report diagnostics"]
  deliver --> link["Link the HTML from the Markdown"]
```

### `/architecture`

Only for structural decisions (boundaries, dependencies, data flow). Output next to the Markdown artifact under `.agents/results/architecture/`:

```text
adr-notification-service.md            # Mermaid block + "Interactive:" link
adr-notification-service.archify.json  # frozen spec (kept even on failure)
adr-notification-service.archify.html  # delivered viewer
```

### `/explain`

Opt-in, because the explainer's own contract (single self-contained file, CSS-variable theming) does not allow embedding a second full HTML document. Enable with `diagram.explain_sidecar: true`, pass `oma explain render --archify`, or ask in the prompt ("with archify"). There is no Mermaid block and no hand-written JSON: the renderer derives the archify spec from a `flow` or `sequence` block of the draft (the panel marked `{archify}`), runs `deliver` (falling back once from `showcase` to `standard` quality), and links `{date}-{slug}.archify.html` with a plain `<a href>`. The command reports `linked`, `skipped` (with the reason), or `failed` (first diagnostic). The workflow does not loop on a failed sidecar, and a sidecar failure never blocks the explainer.

---

## Failure modes

Unresolvable archify is covered by the [engine decision table](#which-engine-runs). The remaining cases:

| Situation | Result |
|---|---|
| Update check fails (offline, rate-limited) | Cached copy is used and reported as `stale` with the reason |
| `validate` never converges | Mermaid remains the delivered diagram; the last `.archify.json` is left for a human; diagnostics are reported verbatim |
| Chrome missing for `visual-check` | Reported as `skipped`, never as a pass |
| `oma diagram archify …` exits 2 | Either Chrome is missing (`visual-check`) or archify could not be resolved; check `oma diagram resolve --json` first |

---

## Next steps

- [Code Explainer](./code-explainer.md) — the `/explain` workflow and its optional archify sidecar
- [`/architecture` workflow](../core-concepts/workflows.md#architecture) — ADRs and reviews that carry the Mermaid block
- [oma-config.yaml semantics](./oma-config-semantics.md) — how the `diagram:` section is merged
- [CLI Commands: diagram](../cli-interfaces/commands.md#diagram) — full option list
- [Market Research](./market-research.md) — the same managed-latest pattern for the last30days engine
- archify upstream: [tt-a1i/archify](https://github.com/tt-a1i/archify)
