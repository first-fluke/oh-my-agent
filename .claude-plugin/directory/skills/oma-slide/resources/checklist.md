# Pre-Delivery Checklist — oma-slide

Run this gate after Phase 5 (Review) and before Phase 6 delivery (bundle/export).
Every item maps to a SKILL.md guardrail or the validator contract in `fixed-stage.md`.

## Gate (must pass)

- [ ] `oma slide validate --workspace "$DECK_DIR" --output json` passes, or the surfaced diff was explicitly approved by the user after 3 auto-fix iterations
- [ ] Every slide root carries `data-om-validate` (validator contract)
- [ ] All slides authored at the fixed 1920×1080 stage in px units (no vw/vh/% layout)
- [ ] All `<img src>` / `<video src>` point to local `./assets/<file>` only — no remote URLs
- [ ] `meta.json` is current: `{ title, order[], style, density, speakerNotes }` matches the actual `slide-NN.html` set

## Accessibility

- [ ] Nav controls have visible focus states (`.deck-nav button:focus-visible`)
- [ ] CJK text present → Pretendard font included on those slides

## Delivery artifacts

<!-- oma-docs:ignore-start -->
- [ ] `oma slide bundle --workspace "$DECK_DIR"` produced `out/deck.html` and it opens in a browser
<!-- oma-docs:ignore-end -->
- [ ] If `./assets/` contains video: user was warned the bundle is not fully self-contained
- [ ] PPTX export (if requested) labeled **experimental** in user-facing output
- [ ] Canva export (if performed): design URL included in the delivery summary

## Delivery summary (Phase 6c)

<!-- oma-docs:ignore-start -->
- [ ] Reported: workdir path, slide file list, `out/deck.html` path, export paths, validate status
<!-- oma-docs:ignore-end -->
- [ ] Reported: any `TODO(oma-deferred)` items (e.g., unresolved image generation placeholders)

## Native PPTX route (`resources/native-pptx.md`)

Replaces the HTML gate above when Phase 0 selected `native-pptx`.

- [ ] ppt-master resolved from the runtime catalog or `bunx skills use`; source, version, and `SKILL_DIR` recorded
- [ ] Bundle complete and `$SKILL_DIR/scripts/attribution_guard.py` exited 0
- [ ] Python packages installed only after explicit user consent (or already present)
- [ ] Upstream final quality gate passed for the selected route
- [ ] PPTX present under `<project>/exports/`; project under `.agents/results/slides/<session-id>/`
- [ ] AI images came from oma-image via Path B, or the user explicitly chose another path
- [ ] No upstream file was copied, vendored, or edited
- [ ] Delivery summary lists the PPTX path, upstream version, route and gates, and image sources
