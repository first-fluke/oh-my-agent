---
title: "Guide: Diagram Engine (archify)"
description: How oh-my-agent chooses between Mermaid and the optional tt-a1i/archify agent skill for architecture, sequence, and data-flow diagrams — the diagram config section, oma diagram resolve / oma diagram archify, how /architecture and /explain use it, and the unbounded validate-repair-deliver loop.
---

# Diagram Engine

`/architecture` (ADRs, recommendations, reviews) and `/explain` (code-change explainers) both emit structural diagrams. Those are always **Mermaid** blocks inside the Markdown artifact, and — whenever [archify](https://github.com/tt-a1i/archify) can be resolved, which is the normal case — additionally an **interactive, validated HTML diagram** next to the artifact: dark/light theme, pan-zoom, search, relationship tracing, PNG/SVG/WebM export, rendered from a typed JSON spec.

Mermaid never goes away: it is the text SSOT that lives in the Markdown and in git diffs. archify is a derived artifact.

---

## Always the latest archify — nothing to install

archify is an MIT-licensed agent skill (Node ≥ 18, zero runtime dependencies). oh-my-agent does not rely on a copy you installed once; it keeps its **own managed copy** and tracks the latest release:

- Cache: `~/.cache/oma-diagram/archify/<tag>/` plus a `state.json` pointer.
- Before each use, `oma diagram resolve` asks GitHub for the latest release tag (throttled to once per `check_interval_min`, default 60 min), downloads the source tarball when a newer tag exists (atomic per-tag directory; older tags pruned), and otherwise reuses the cached copy.
- Network failures are never fatal: the cached copy is used and reported as `stale` with the reason. Only a first run with no network and no cache falls back to a user-installed skill copy, and after that to Mermaid.

```bash
oma diagram update          # force a check / download now
oma diagram resolve
# engine:   archify  (requested: auto)
# reason:   archify 2.15.0 via managed:v2.15.0 (current)
# root:     /Users/you/.cache/oma-diagram/archify/v2.15.0
# quality:  showcase
oma diagram resolve --offline   # never touch the network
```

Resolution order (first hit wins, identical on every vendor runtime):

1. `diagram.archify.path` in `oma-config.yaml` — explicit pin, opts out of auto-latest
2. `ARCHIFY_HOME` environment variable — explicit pin
3. **Managed latest** (`~/.cache/oma-diagram/archify`)
4. User-installed skill dirs: project `.agents` / `.claude` / `.codex` / `.cursor` / `.qwen` / `.kiro` `/skills/archify`, then the same under `~`, plus `~/.raven/workspace/skills/archify`

A hit requires `bin/archify.mjs` to exist.

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

| `engine` | Behaviour |
|---|---|
| `auto` (default) | archify whenever it resolves (managed latest, pin, or skill dir), otherwise Mermaid |
| `archify` | Require archify. `oma diagram resolve` exits 1 when nothing resolves (first run offline); workflows stop instead of silently downgrading |
| `mermaid` | Never call archify |

A prompt can override the config for one run (`/explain 640 with archify`).

---

## CLI

```bash
oma diagram resolve [--engine auto|archify|mermaid] [--refresh] [--offline] [--json]
oma diagram update  [--json]
oma diagram archify <archify args…>
```

`oma diagram archify` runs the resolved `bin/archify.mjs` with `ARCHIFY_UPDATE_CHECK_DISABLED=1` (no network) and propagates the exit code, so `validate` / `deliver` / `visual-check` behave exactly as archify documents them:

```bash
oma diagram archify guide "show the auth request lifecycle" --json
oma diagram archify validate architecture adr-auth.archify.json --quality showcase --json
oma diagram archify deliver  architecture adr-auth.archify.json adr-auth.archify.html --quality showcase --json
oma diagram archify visual-check adr-auth.archify.html --json   # exit 2 = no Chrome, reported as skipped
```

`--json` on `resolve` returns `{ ok, requested, engine, quality, open, explainSidecar, archify?: { root, bin, version, source, status?, note? }, reason, probed }` — `source` is `managed:<tag>`, `config:…`, `env:…`, or a skill-dir label; `status` (`fresh` / `current` / `stale`) and `note` are set for managed copies.

---

## How the workflows use it

The shared protocol lives in `.agents/skills/_shared/conditional/diagram-engine.md`. Both workflows follow the same sequence:

1. `oma diagram resolve --json`
2. Author the Mermaid block first (always).
3. If `engine: archify`: translate the Mermaid topology into archify's JSON IR (`architecture` / `sequence` / `dataflow` / `lifecycle` / `workflow`), reading only the matching schema and one example from the install.
4. `validate` → repair → `deliver`. **There is no fixed iteration cap.** The agent keeps repairing while archify's objective error count improves and stops only on archify's own convergence rule (two consecutive rounds without improvement). Semantic labels are never deleted just to pass.
5. Link the HTML — never embed it.

### `/architecture`

Only for structural decisions (boundaries, dependencies, data flow). Output next to the Markdown artifact under `.agents/results/architecture/`:

```
adr-notification-service.md            # Mermaid block + "Interactive:" link
adr-notification-service.archify.json  # frozen spec (kept even on failure)
adr-notification-service.archify.html  # delivered viewer
```

### `/explain`

Opt-in, because the explainer's own contract (single self-contained file, CSS-variable theming) does not allow embedding a second full HTML document. Enable with `diagram.explain_sidecar: true` or ask in the prompt. The sidecar `{date}-{slug}.archify.html` is derived from the explainer's primary System/Data-Flow diagram and linked with a plain `<a href>`; a sidecar failure never blocks the explainer.

---

## Failure modes

| Situation | Result |
|---|---|
| Update check fails (offline, rate-limited) | Cached copy is used and reported as `stale` with the reason |
| No cache, no network, no skill dir, `engine: auto` | Mermaid only; the report says to run `oma diagram update` once online |
| Same, but `engine: archify` | Workflow stops (`ok: false`) with the `oma diagram update` hint |
| `validate` never converges | Mermaid remains the delivered diagram; the last `.archify.json` is left for a human; diagnostics are reported verbatim |
| Chrome missing for `visual-check` | Reported as `skipped`, never as a pass |

---

## Related

- [Code Explainer](/docs/guide/code-explainer) — `/explain` workflow
- [oma-config.yaml semantics](/docs/guide/oma-config-semantics)
- archify upstream: [tt-a1i/archify](https://github.com/tt-a1i/archify)
