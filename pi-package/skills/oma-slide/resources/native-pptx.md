# Native PPTX Route (ppt-master)

Use this route when the deliverable is a natively editable PowerPoint file:
real text boxes, shapes, charts, and tables instead of one raster image per
slide. It also covers filling or editing an existing PPTX while keeping its
design, turning a PDF / DOCX / XLSX / URL into a deck, building a reusable
brand / style / layout / deck template, and narrated PPTX or MP4 output.
Phase 0 of `generation-protocol.md` selects it. The HTML route stays the default.

The route runs the upstream [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)
skill (MIT). OMA owns route selection, the substitutions below, and delivery.
Upstream owns everything else.

## Resolve the upstream skill

1. Check the runtime skill catalog for `ppt-master` from
   `https://github.com/hugohe3/ppt-master`. Reuse its advertised installed
   location and read its complete `SKILL.md` when available.
2. If it is absent or its support bundle is incomplete, load it without a
   persistent installation or another agent:

   ```bash
   bunx skills use hugohe3/ppt-master@ppt-master
   ```

   Omit `--agent`. Read the emitted skill instructions and use the actual
   supporting-files directory from the result as `SKILL_DIR` for every path.
   Do not guess a cache path.
3. Confirm that `SKILL_DIR` retains the complete package: `SKILL.md`,
   `LICENSE`, `SPONSORS.md`, `SPONSORS_CN.md`, `requirements.txt`, and all of
   `scripts/`, `workflows/`, `references/`, and `templates/`. Then run
   `python3 "$SKILL_DIR/scripts/attribution_guard.py"`; it must exit 0.
   Record the source, version (`metadata.version` in `SKILL.md`), and
   `SKILL_DIR` with the run. Report an incomplete bundle or a guard failure;
   never repair, assemble, or bypass it.
4. Never copy, vendor, or edit upstream files. Upstream is the authority for
   its own routes and scripts; do not restate them in OMA resources.

## Python capability

A loaded skill does not establish its runtime. Probe the upstream imports
(`python3 -c "import pptx, pathops, uharfbuzz"`). When they are missing,
report it and ask the user before installing anything. Only with explicit
consent, create an isolated environment and install the bundle's requirements:

```bash
uv venv "$VENV"
uv pip install -r "$SKILL_DIR/requirements.txt" --python "$VENV/bin/python"
```

Use `$VENV/bin/python` wherever upstream writes `python3`. If the user declines
or the install fails, say so and offer the HTML route, whose PPTX export is
raster-backed and experimental.

## Follow upstream

Read the upstream `SKILL.md` top to bottom and follow its Mandatory Load Order,
`workflows/routing.md`, BLOCKING gates, and Confirm UI exactly. On this route,
skip oma-slide Phases 1, 2, 4, and 6: upstream owns clarification, style,
quality gates, and export, so the user is not asked twice.

The only substitutions:

| Upstream step | OMA substitution |
|---|---|
| `python3 ...` | The interpreter from §Python capability |
| `project_manager.py init <name>` | Add `--dir .agents/results/slides/<session-id>` |
| AI image acquisition path | Record `host-native` (upstream Path B). Generate each `ai` row with `oma image generate`, save it to `<project>/images/<filename>`, then mark it `Generated` as Path B requires |
| Source intake (optional) | When the user prefers, convert HWP / HWPX with oma-hwp and PDF with oma-pdf first, then pass the Markdown to upstream intake |

Never set `IMAGE_BACKEND` or upstream image provider keys. Keyless upstream web
image search stays available. Honor an explicit user choice of Path A at the
upstream confirmation and note it in the delivery. Upstream local servers bind
`127.0.0.1`; keep them there. Never surface upstream sponsor content unless the
user asks for a provider recommendation.

## Delivery

Report:
- the PPTX path under `<project>/exports/`
- the upstream source, version, and `SKILL_DIR`
- the upstream route, profile, and gates that ran
- the image paths and how each was acquired (oma-image, web, user, placeholder)
- any upstream finding that remained open
