# Diagram Engine Protocol (archify ↔ Mermaid, stack-diagram)

Load class: `conditional` — read only when a workflow is about to emit a
structural diagram (architecture, sequence, data-flow, lifecycle) or a
tech-stack poster.

Two upstream skill routes exist — neither has an `oma` CLI wrapper or an
`oma-config` key. OMA owns route selection, the Mermaid SSOT, output paths,
bounds, and delivery; upstream owns schemas, layout, and rendering:

- **Structural route** (Steps 0–4) — draws boundaries, call chains, data flow,
  and lifecycles with [archify](https://github.com/tt-a1i/archify) (MIT,
  Node ≥ 18, zero runtime deps) or the built-in **Mermaid** fallback.
- **Stack route** (last section) — draws a tech-stack / infrastructure poster
  with official vendor logos through
  [stack-diagram](https://github.com/Caru-ini/stack-diagram) (MIT, Python 3.9+,
  network access for logos).

Pick the route first:

| Signal (first match wins) | Route |
|---|---|
| Prompt names `archify` | structural (`archify`) |
| Prompt asks for Mermaid only | structural (Mermaid only) |
| Prompt names `stack-diagram` or asks for vendor logos | stack |
| Most nodes are vendor products or services (AWS, Vercel, Postgres, Hono, …) and the user wants a stack / infra / deployment topology | stack |
| Boundaries, call order, data flow, lifecycle, or any ADR structure | structural (`archify` when resolvable, else Mermaid) |

Mermaid is always available and is the **text SSOT** that lives inside Markdown
artifacts (`/architecture`). Both upstream HTML artifacts are derived from the
same topology and linked as sibling files — never embedded.

## Step 0 — Resolve the upstream `archify` skill

Skip to Step 1 (Mermaid only) when the user asked for Mermaid only.

1. Check the runtime skill catalog for `archify` from
   `https://github.com/tt-a1i/archify` (or `ARCHIFY_HOME` env if explicitly
   set). Reuse its installed location (`SKILL_DIR`) and read `$SKILL_DIR/SKILL.md`
   in full when available.
2. If it is absent, load it without a persistent installation or another agent:

   ```bash
   bunx skills use tt-a1i/archify@archify
   ```

   Omit `--agent`. Use the supporting-files directory from the result as
   `SKILL_DIR` for every path, and confirm `$SKILL_DIR/bin/archify.mjs` exists.
   Do not guess a cache path.
3. Confirm Node.js ≥ 18 is available (`node --version`). Record the resolved
   source, version (from `$SKILL_DIR/package.json` when present), and
   `SKILL_DIR` with the run.
4. When `archify` cannot resolve or Node.js is missing:
   - If the user **explicitly requested `archify`**, report the failed route
     and missing capability instead of silently pretending it ran; deliver the
     Mermaid block (or primary `/explain` HTML) with that disclosure.
   - Otherwise deliver Mermaid only and report the one-line skip reason.

## Step 1 — Always author Mermaid first

For Markdown artifacts (`/architecture`), Mermaid is the durable, diffable,
git-reviewable form. Write it first, scoped to the elements the decision or
change touches (C4 context/container for architecture; sequence for call
chains). The archify artifact and the stack poster are derived from it — never
the other way round.

For `/explain` opt-in sidecars, derive the archify spec from the primary
`flow` or `sequence` diagram in the explainer draft.

## Step 2 — Author the archify JSON IR

Consult `$SKILL_DIR/SKILL.md` for its schema, invariants, and diagnostic repair
rules. Apply these within the user's scope and OMA execution policy; vendor
guidance does not expand authorization. The oma-specific rules are:

- Type router: architecture/container view → `architecture`; call chain →
  `sequence`; pipeline/lineage → `dataflow`; state machine → `lifecycle`;
  process/CI → `workflow`. When unsure:
  `ARCHIFY_UPDATE_CHECK_DISABLED=1 node "$SKILL_DIR/bin/archify.mjs" guide "<scenario>" --json`.
<!-- oma-docs:ignore-start -->
- Read only `$SKILL_DIR/schemas/common.schema.json`, the one matching
  `$SKILL_DIR/schemas/<type>.schema.json`, and one matching example under
  `$SKILL_DIR/examples/`. Do not read renderer internals.
<!-- oma-docs:ignore-end -->
- Translate the Mermaid (or explainer draft) topology semantically (archify's
  "Mermaid input" rule): same nodes, same edges, same labels; fresh stable IDs;
  ≤ 12 primary nodes, one main path. Split into two diagrams rather than
  exceeding that.
- Default `meta.quality_profile` to `"showcase"` (or `"standard"` if requested).
  Omit `meta.visual_preset`, `meta.subtitle`, `meta.legend`, `meta.locale`
  unless the user asked (for a non-en/zh-CN authored language, disclose that
  Viewer UI stays English).
- Authored language follows the i18n-guide order (prompt → config `language` → en);
  identifiers, paths, protocols stay verbatim.
- Never invent a `brand`; only set it when the node IS that product.

Spec path: sibling of the primary artifact, `<artifact-stem>.archify.json`.

## Step 3 — Validate → repair → deliver (bounded)

Always set `ARCHIFY_UPDATE_CHECK_DISABLED=1` so the skill's update ping stays
offline, and check the exit code — a non-zero exit is never success:

```bash
ARCHIFY_UPDATE_CHECK_DISABLED=1 node "$SKILL_DIR/bin/archify.mjs" validate <type> <stem>.archify.json --quality showcase --json
ARCHIFY_UPDATE_CHECK_DISABLED=1 node "$SKILL_DIR/bin/archify.mjs" deliver  <type> <stem>.archify.json <stem>.archify.html --quality showcase --json
```

Repair loop rules:

1. Change only the diagnosed `subject`; verify `evidence`; pick from
   `supportedFixes`; re-validate.
2. Keep iterating while the objective error count reaches a new minimum.
3. Stop when the spec passes, archify's convergence rule fires, after 3 repair
   attempts / 10 minutes total (`/architecture`) or 2 attempts / 5 minutes
   total (`/explain` sidecar), or when the same diagnostic repeats.
4. Never delete a semantic relationship label merely to pass; never fake a pass
   with `overflow: hidden`, clipped content, or shrunken typography.
5. A passing final `validate` freezes the spec; `deliver` is then the single
   acceptance command. Re-run `deliver` (not `validate`) if the spec changed.

On convergence without a pass: keep the Mermaid block (or `/explain` HTML) as
the delivered artifact, leave the last `<stem>.archify.json` in place for a
human to finish, and report the unresolved diagnostics truthfully. Do not
delete the Markdown Mermaid block in any outcome.

Optional evidence (never modifies the HTML; exit 2 = no Chrome, report as
skipped):
`ARCHIFY_UPDATE_CHECK_DISABLED=1 node "$SKILL_DIR/bin/archify.mjs" visual-check <stem>.archify.html --json`.

## Step 4 — Link, don't embed

- Markdown artifacts (ADR / recommendation / review): add under the Diagram
  section — `Interactive: [<stem>.archify.html](./<stem>.archify.html)` — keep
  the Mermaid block above it.
- `/explain` HTML: the explainer's own self-contained / CSS-variable-theme
  contract forbids embedding a second full HTML document. Write the archify
  sidecar as `<explainer-stem>.archify.html` next to the explainer and link it
  with a plain Markdown/HTML relative link (`./<explainer-stem>.archify.html`;
  hyperlinks are allowed by `html-contract.md` §1). Never `<iframe>`,
  `<object>`, or `<script src>` it.

## Stack route — stack-diagram

[stack-diagram](https://github.com/Caru-ini/stack-diagram) (MIT; Python 3.9+
standard library, network access for logos) turns a described stack into a
poster with official vendor logos from hand-placed HTML. It uses the same pure
skill-routing pattern as `archify` above and `ppt-master` in `oma-slide`: no
`oma` CLI, no config key. OMA owns route selection, the output path, the
substitutions below, and delivery. Upstream owns everything else. This route is
HTML only: upstream's PNG export and screenshot check depend on Playwright +
Chromium, and neither is installed or run here.

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

State which route and engine ran (the archify or stack-diagram version and
`SKILL_DIR`, or Mermaid fallback), the artifact paths, the final validation
summary (artifact checks / errors / warnings from the `--json` receipt on the
structural route; the `build.py` result on the stack route), and, when an
engine was skipped or failed, the one-line reason or last diagnostics. Do not
claim a visual review you did not perform.
