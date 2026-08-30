# Diagram Engine Protocol (archify ↔ Mermaid)

Load class: `conditional` — read only when a workflow is about to emit a
structural diagram (architecture, sequence, data-flow, lifecycle).

Two engines exist. Mermaid is always available and is the **text SSOT** that
lives inside the Markdown artifact. [archify](https://github.com/tt-a1i/archify)
(MIT, Node ≥ 18, zero runtime deps) is an optional upgrade that turns a typed
JSON IR into a validated, self-contained interactive HTML diagram (dark/light,
pan-zoom, search, trace, PNG/SVG/WebM export).

**oma always uses the latest archify release.** No manual install is needed:
`oma diagram resolve` keeps an oma-owned copy under
`~/.cache/oma-diagram/archify/<tag>/`, re-checks GitHub Releases before use
(throttled by `diagram.archify.check_interval_min`, default 60 min), downloads a
newer tag when one exists, and reuses the cached copy when the network is down.
`oma diagram update` forces a check now. A copy installed by the user with
`npx skills add tt-a1i/archify` is only a fallback for when nothing is cached
and the network is unavailable; `diagram.archify.path` / `ARCHIFY_HOME` are
explicit pins that opt out of auto-latest.

## Step 0 — Resolve the engine (deterministic, all vendors)

```bash
oma diagram resolve --json
```

| Field | Meaning |
|---|---|
| `engine` | `archify` or `mermaid` — the engine to use for THIS run |
| `ok` | `false` only when `diagram.engine: archify` is pinned and nothing could be resolved (first run offline) → stop and tell the user to run `oma diagram update` once online; never silently downgrade a pin |
| `archify.root` / `archify.bin` | install dir; the schema/example files live under `root` |
| `archify.status` / `archify.note` | managed copies only: `fresh` (just downloaded), `current`, or `stale` (update check failed — the note says why; mention it in the report) |
| `quality` | `showcase` (default) or `standard` — pass as `--quality` |
| `explainSidecar` | whether `/explain` should also emit an archify sidecar |

Resolution order: `diagram.archify.path` → `ARCHIFY_HOME` → managed latest →
project `.agents/.claude/.codex/.cursor/.qwen/.kiro/skills/archify` → the same
under `~`. Configure in `.agents/oma-config.yaml` (`diagram:` section).

When `engine` is `mermaid`, author the Mermaid block per the calling skill's
template and skip the rest of this file.

## Step 1 — Always author Mermaid first

Mermaid in the Markdown artifact is the durable, diffable, git-reviewable form.
Write it first, scoped to the elements the decision or change touches (C4
context/container for architecture; sequence for call chains). The archify
artifact is derived from it — never the other way round.

## Step 2 — Author the archify JSON IR

Follow the installed archify `SKILL.md` (`<root>/SKILL.md`) verbatim; it is the
authority on schema, invariants, and repair rules. The oma-specific rules are:

- Type router: architecture/container view → `architecture`; call chain →
  `sequence`; pipeline/lineage → `dataflow`; state machine → `lifecycle`;
  process/CI → `workflow`. When unsure: `oma diagram archify guide "<scenario>" --json`.
- Read only `schemas/common.schema.json`, the one matching `schemas/<type>.schema.json`,
  and one matching example under `examples/`. Do not read renderer internals.
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

## Step 3 — Validate → repair → deliver (no iteration cap)

```bash
oma diagram archify validate <type> <stem>.archify.json --quality <quality> --json
oma diagram archify deliver  <type> <stem>.archify.json <stem>.archify.html --quality <quality> --json [--open]
```

`oma diagram archify …` runs the resolved `bin/archify.mjs` with
`ARCHIFY_UPDATE_CHECK_DISABLED=1` and propagates the exit code — a non-zero
exit is never success.

Repair loop rules (this project imposes **no fixed iteration budget**):

1. Change only the diagnosed `subject`; verify `evidence`; pick from
   `supportedFixes`; re-validate.
2. Keep iterating while the objective error count reaches a new minimum.
3. Stop only when archify's own convergence rule fires — two consecutive
   rounds with no improvement on the best count — or the spec passes.
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

## Reporting

State which engine ran (including the archify version and `stale` note when
the update check failed), the artifact paths, the final validation summary
(artifact checks / errors / warnings from the `--json` receipt), and, when
archify was skipped or failed, the one-line reason from `oma diagram resolve`
or the last diagnostics. Do not claim a visual review you did not perform.
