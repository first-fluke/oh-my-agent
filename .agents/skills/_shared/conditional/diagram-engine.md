# Diagram Engine Protocol (archify ↔ Mermaid, stack-diagram)

Load class: `conditional` — read only when a workflow is about to emit a
structural diagram (architecture, sequence, data-flow, lifecycle) or a
tech-stack poster.

Two routes exist. The **structural route** (Steps 0–4) draws boundaries, call
chains, data flow, and lifecycles with archify or Mermaid. The **stack route**
(last section) draws a tech-stack / infrastructure poster with official vendor
logos through the upstream stack-diagram skill. Pick the route first:

| Signal (first match wins) | Route |
|---|---|
| Prompt names `archify` | structural |
| Prompt names `stack-diagram` or asks for vendor logos | stack |
| Most nodes are vendor products or services (AWS, Vercel, Postgres, Hono, …) and the user wants a stack / infra / deployment topology | stack |
| Boundaries, call order, data flow, lifecycle, or any ADR structure | structural |

`/explain` sidecars never take the stack route: `oma explain render --archify`
derives the archify spec from the draft in code, and stack-diagram has no code
path. Both routes author Mermaid first (Step 1).

Two engines serve the structural route. Mermaid is always available and is the **text SSOT** that
lives inside the Markdown artifact. [archify](https://github.com/tt-a1i/archify)
(MIT, Node ≥ 18, zero runtime deps) is an optional upgrade that turns a typed
JSON IR into a validated, self-contained interactive HTML diagram (dark/light,
pan-zoom, search, trace, PNG/SVG/WebM export).

**archify is installed as an agent skill through the skills CLI.**
`oma diagram resolve` reads installed skill directories; `oma diagram update`
installs it when missing (`bunx skills add tt-a1i/archify --skill archify -g -y`)
and updates it otherwise. Install only after the user agrees.
`diagram.archify.path` / `ARCHIFY_HOME` are explicit pins that win over installs.

## Step 0 — Resolve the engine (deterministic, all vendors)

```bash
oma diagram resolve --json
```

| Field | Meaning |
|---|---|
| `engine` | `archify` or `mermaid` — the engine to use for THIS run |
| `ok` | `false` only when `diagram.engine: archify` is pinned and archify is not installed → stop and offer `oma diagram update`; never silently downgrade a pin |
| `archify.root` / `archify.bin` | install dir; the schema/example files live under `root` |
| `warnings` | deprecated config keys (`diagram.archify.managed|channel|check_interval_min` are ignored); relay them |
| `quality` | `showcase` (default) or `standard` — pass as `--quality` |
| `explainSidecar` | whether `/explain` should also emit an archify sidecar |

Resolution order: `diagram.archify.path` → `ARCHIFY_HOME` → project
`.agents/.claude/.codex/.cursor/.qwen/.kiro/.gemini/.copilot/skills/archify` →
the same under `~` → `~/.config/agents/skills/archify`. Configure in `.agents/oma-config.yaml` (`diagram:` section).

When `engine` is `mermaid`, author the Mermaid block per the calling skill's
template and skip the rest of this file.

## Step 1 — Always author Mermaid first

Mermaid in the Markdown artifact is the durable, diffable, git-reviewable form.
Write it first, scoped to the elements the decision or change touches (C4
context/container for architecture; sequence for call chains). The archify
artifact and the stack poster are derived from it — never the other way round.

## Step 2 — Author the archify JSON IR

Consult the installed archify `SKILL.md` (`<root>/SKILL.md`) for its schema,
invariants, and diagnostic repair rules. Apply these within the user's scope and
OMA execution policy; vendor guidance does not expand authorization. The oma-specific rules are:

- Type router: architecture/container view → `architecture`; call chain →
  `sequence`; pipeline/lineage → `dataflow`; state machine → `lifecycle`;
  process/CI → `workflow`. When unsure: `oma diagram archify guide "<scenario>" --json`.
<!-- oma-docs:ignore-start -->
- Read only `schemas/common.schema.json`, the one matching `schemas/<type>.schema.json`,
  and one matching example under `examples/`. Do not read renderer internals.
<!-- oma-docs:ignore-end -->
- Translate the Mermaid topology semantically (archify's "Mermaid input" rule):
  same nodes, same edges, same labels; fresh stable IDs; ≤ 12 primary nodes,
  one main path. Split into two diagrams rather than exceeding that.
- `meta.quality_profile` = the resolved `quality`. Omit `meta.visual_preset`,
  `meta.subtitle`, `meta.legend`, `meta.locale` unless the user asked
  (for a non-en/zh-CN authored language, disclose that Viewer UI stays English).
- Authored language follows the i18n-guide order (prompt → config `language` → en);
  identifiers, paths, protocols stay verbatim.
- Never invent a `brand`; only set it when the node IS that product.

Spec path: sibling of the Markdown artifact, `<artifact-stem>.archify.json`.

## Step 3 — Validate → repair → deliver (bounded)

```bash
oma diagram archify validate <type> <stem>.archify.json --quality <quality> --json
oma diagram archify deliver  <type> <stem>.archify.json <stem>.archify.html --quality <quality> --json [--open]
```

<!-- oma-docs:ignore-start -->
`oma diagram archify …` runs the resolved `bin/archify.mjs` with
`ARCHIFY_UPDATE_CHECK_DISABLED=1` and propagates the exit code — a non-zero
exit is never success.
<!-- oma-docs:ignore-end -->

Repair loop rules:

1. Change only the diagnosed `subject`; verify `evidence`; pick from
   `supportedFixes`; re-validate.
2. Keep iterating while the objective error count reaches a new minimum.
3. Stop when the spec passes, archify's convergence rule fires, after 3 repair
   attempts, after 10 minutes total, or when the same diagnostic repeats.
4. Never delete a semantic relationship label merely to pass; never fake a pass
   with `overflow: hidden`, clipped content, or shrunken typography.
5. A passing final `validate` freezes the spec; `deliver` is then the single
   acceptance command. Re-run `deliver` (not `validate`) if the spec changed.

On convergence without a pass: keep the Mermaid artifact as the delivered
diagram, leave the last `<stem>.archify.json` in place for a human to finish,
and report the unresolved diagnostics truthfully. Do not delete the Markdown
Mermaid block in any outcome.

Optional evidence (never modifies the HTML; exit 2 = no Chrome, report as
skipped): `oma diagram archify visual-check <stem>.archify.html --json`.

## Step 4 — Link, don't embed

- Markdown artifacts (ADR / recommendation / review): add under the Diagram
  section — `Interactive: [<stem>.archify.html](./<stem>.archify.html)` — keep
  the Mermaid block above it.
- `/explain` HTML: the explainer's own self-contained / CSS-variable-theme
  contract forbids embedding a second full HTML document. Write the archify
  sidecar as `<explainer-stem>.archify.html` next to the explainer and link it
  with a plain `<a href="./<stem>.archify.html">` anchor (hyperlinks are allowed
  by `html-contract.md` §1). Never `<iframe>`, `<object>`, or `<script src>` it.

## Stack route — stack-diagram

[stack-diagram](https://github.com/Caru-ini/stack-diagram) (MIT; Python 3.9+
standard library, network access for logos) turns a described stack into a
poster with official vendor logos from hand-placed HTML. It is an upstream
agent skill used the way `oma-slide` uses ppt-master
(`oma-slide/resources/native-pptx.md`): no oma CLI, no config key. OMA owns
route selection, the output path, the substitutions below, and delivery.
Upstream owns everything else. This route is HTML only: upstream's PNG export
and screenshot check depend on Playwright + Chromium, and neither is installed
or run here.

### Resolve the upstream skill

1. Check the runtime skill catalog for `stack-diagram` from
   `https://github.com/Caru-ini/stack-diagram`. Reuse its advertised installed
   location and read its complete `SKILL.md` when available.
2. If it is absent, load it without a persistent installation or another agent:

   ```bash
   bunx skills use caru-ini/stack-diagram@stack-diagram
   ```

   Omit `--agent`. Use the supporting-files directory from the result as
   `SKILL_DIR` for every path. Do not guess a cache path.
3. Confirm `python3 --version` reports 3.9 or newer. Record the source,
   version, and `SKILL_DIR` with the run.
4. When the skill cannot be resolved, Python is missing, or the logo sources are
   unreachable: take the structural route from Step 0, deliver that, and report
   the reason. The stack route never blocks delivery.

### Follow upstream

Read `$SKILL_DIR/SKILL.md` top to bottom and follow its content, icon, layout,
and build steps (`scripts/fetch_icons.py`, `references/geometry.md`,
`assets/template.html`, `scripts/build.py`). Skip its verify step
(`scripts/render_png.py`), its PNG delivery, and its gallery step. Apply the
rest within the user's scope and OMA execution policy; vendor guidance does not
expand authorization. Translate the Mermaid topology from Step 1 semantically:
same nodes, same groups, same edges, same labels.

### OMA substitutions and guardrails

- Output: `<artifact-stem>.stack.html` beside the Markdown artifact, and
  nothing else. Never run `scripts/render_png.py` and never install Playwright
  or Chromium, even when PNG is requested; say that PNG is not on this route.
- Link, don't embed: under the artifact's Diagram section add
  `Stack: [<stem>.stack.html](./<stem>.stack.html)` and keep the Mermaid block
  above it.
- Skip the upstream gallery step entirely. Never offer or run `scripts/share.py`
  unless the user explicitly asks to publish the diagram.
- Bounded: at most 2 build attempts and 5 minutes in total. A `build.py` run
  that exits 0 with no unresolved tokens is the acceptance; there is no visual
  check. On a bound, keep the Mermaid block as the delivered diagram, leave the
  HTML source next to it, and report the last error.
- Authored language follows the i18n-guide order (prompt → config `language`
  → en); set the template's `lang` attribute to match. Identifiers, paths, and
  product names stay verbatim.
- Logos come from upstream's sources and keep their own licenses and
  trademarks; never recolor, redraw, or substitute a mark.

## Reporting

State which route and engine ran (the archify version, or the stack-diagram
version and `SKILL_DIR`), the artifact paths, the final validation summary
(artifact checks / errors / warnings from the `--json` receipt on the
structural route; the `build.py` result on the stack route), and, when an
engine was skipped or failed, the one-line reason from
`oma diagram resolve` or the last diagnostics. Do not claim a visual review you
did not perform.
