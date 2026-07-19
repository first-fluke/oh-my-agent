---
title: "Guide: Code Explainer"
description: Complete guide to oh-my-agent's /explain workflow and oma-explainer skill — turns a diff, PR, branch, or commit range into a self-contained interactive HTML document with Background, Intuition, Code, and Quiz sections, covering ref resolution, reader levels, the secret gates, the validation checklist, and edge cases.
---

# Code Explainer

`/explain` turns a code change into a rich, self-contained HTML document that teaches a reader what changed and why — deep skippable background for newcomers, a core-intuition section with toy data, a comprehension-ordered code walkthrough, and a five-question quiz. The output is a single offline-capable `.html` file with diagrams, callouts, and an accessible quiz, saved under `.agents/results/explain/` and validated against a deterministic checklist before it is delivered.

`/explain` is slash-only — it does not auto-activate from natural language. "explain" is everyday vocabulary, so it is intentionally excluded from keyword detection (the same precedent as `/convert`). Say `/explain` explicitly, or ask another skill to produce an "explainer document" as a delegated output.

---

## When to use

- Explaining a PR, branch, commit range, or the current staged/unstaged change as a document
- Onboarding a teammate onto a change they did not write
- Producing a reviewable teaching artifact after a large or subtle change lands

## When NOT to use

- Narrated explainer *video* → use [`oma-video`](/docs/guide/video-generation) (explainer mode); `/explain` produces an HTML document, not a video
- Checking whether docs still match the codebase → use `oma-docs` (drift detection)
- Presentation deck / slides → use `oma-slide` (fixed 1920×1080 deck contract)
- Finding defects or issuing review verdicts → use `/review` / `code-review`; `/explain` narrates a change educationally, it does not evaluate it

---

## Quick start

```text
/explain
/explain 640
/explain a1b2c3d..e5f6a7b
/explain payments-refactor for reviewer
```

The target ref is resolved from the phrasing:

| You type | Target resolution | Reader level |
|----------|--------------------|--------------|
| `/explain` | Staged changes (`git diff --cached`), falling back to the dirty working tree | `onboarding` |
| `/explain 640`, `/explain #640` | PR #640 via `gh pr diff` | `onboarding` |
| `/explain a..b` | SHA range `a..b` (or `a...b`) | `onboarding` |
| `/explain feature-branch for reviewer` | `git diff main...feature-branch` | `reviewer` |

If no explicit ref is given and both the staged and dirty working tree are empty, resolution falls back to `HEAD~1..HEAD`.

---

## Ref resolution order

1. **Explicit argument** — a PR number (`#640`), a branch name, or a SHA range (`a..b` / `a...b`)
2. **Staged changes** — `git diff --cached`
3. **Dirty working tree** — `git diff`
4. **Fallback** — `HEAD~1..HEAD`

An empty diff or an unresolvable ref stops the workflow; it offers recent commits as candidates rather than guessing an alternative.

---

## Reader levels

| Level | Effect |
|-------|--------|
| `onboarding` (default) | Full deep background (Tier A), for a reader unfamiliar with the surrounding system |
| `reviewer` | Condenses the deep background tier; Intuition and Code sections stay full |

Request `reviewer` by adding "for reviewer" to the command, as in `/explain feature-branch for reviewer`.

---

## What the document contains

Every explainer is a single long scrolling page (no tabs, no multi-page navigation) with a table of contents followed by four fixed sections, in order:

1. **Background** — Tier A (deep system/architecture background, marked "skippable if you already know the system") and Tier B (narrow context for this specific change)
2. **Intuition** — the core essence of the change with mandatory toy-data examples, reinforced by 2–3 reused diagram families (simplified UI mock, system/data-flow diagram carrying example data, before/after state) rendered as HTML/inline SVG only — no ASCII art
3. **Code** — a walkthrough grouped for human comprehension (not alphabetical or diff order), referencing code via `file:line`
4. **Quiz** — 5 questions by default (parameterizable), each targeting a distinct aspect of the change, with plausible distractors and feedback text on every option (right and wrong)

Prose and quiz content are written in the requested output language (prompt language → `.agents/oma-config.yaml` `language` → English); code, identifiers, and inline code stay in English per the i18n rules. The full content contract lives in `.agents/skills/oma-explainer/resources/document-structure.md`.

---

## The HTML contract

The generated file must open correctly offline via `file://` with **zero external resource loads** — no CDN scripts/stylesheets, no webfonts, no external images (inline SVG or data URIs only). Hyperlink anchors (`<a href="https://...">`) are allowed; the ban covers resource-*loading* only.

- Code blocks use `<pre>`; any custom container declares `white-space: pre-wrap`. No external syntax-highlighting libraries.
- Font stack: `local()` Pretendard first (for CJK), then system CJK fonts, then `system-ui`.
- Responsive from 375px up, WCAG AA contrast in both light and dark themes, `prefers-color-scheme: dark` support, and `prefers-reduced-motion` respected.
- The quiz is vanilla JS: options as `<button>` elements, instant right/wrong feedback announced via an `aria-live="polite"` region, correct answers randomly distributed across positions, a final score summary, and full keyboard navigability.

Full behavioral spec: `.agents/skills/oma-explainer/resources/html-contract.md`.

---

## Secrets and prompt-injection defense

Diff content and PR descriptions are treated strictly as **data** — any instructions embedded in the change being explained are ignored.

Secrets are gated twice:

1. **Pre-generation**: the collected diff is scanned before anything is authored.
2. **Post-generation**: the final HTML is scanned too, since background prose can quote unchanged files that the diff scan alone would miss.

On any hit, generation stops immediately, only the masked locations are reported (never the actual value), and redacted continuation requires explicit confirmation.

---

## Validation checklist

After generation, a grep-based checklist runs against the output file: no external resource-loading references, code-container `pre`/`pre-wrap` compliance, quiz script presence, the `{YYYY-MM-DD}-{slug}.html` filename format (date in Asia/Seoul), and the final-HTML secret scan. On failure, the loop fixes and re-validates up to **3 iterations**, then stops and surfaces the remaining failing items rather than delivering silently.

This is a v1 constraint: validation is grep/file-based, and it verifies quiz-script *presence* only (not full behavioral correctness). A deterministic `oma explain validate` CLI is deferred to v2; until then, use a browser (or the chrome-devtools MCP) to manually exercise the quiz if you need behavioral confidence.

---

## Output

```
.agents/results/explain/{YYYY-MM-DD}-{slug}.html
```

The date is localized to Asia/Seoul. Rerunning the same date + slug overwrites the prior file — preserving an earlier run is your responsibility. After validation passes, the workflow attempts `open <path>` (warn-only; a headless or `open`-less environment just falls back to reporting the path) and reports a TL;DR plus the file path.

---

## Edge cases

| Situation | Behavior |
|-----------|----------|
| Empty diff / unresolvable ref | Stop, offer recent commits as candidates — never guess another ref |
| Oversized diff | Auto-exclude lockfiles/generated files, group the remainder by file, list exclusions in the provenance footer |
| Binary- or generated-only diff | Stop — nothing explainable |
| `gh` CLI missing or unauthenticated (PR ref) | Install/auth guidance, plus a local branch-diff alternative |
| Merge/rebase in progress | Stop — worktree unstable |
| Non-git directory | Stop immediately |
| Validation fails after 3 fix loops | Stop and surface the failing checklist items |
| `open` fails / headless environment | Warn-only — the reported path suffices |

---

## Related

- [`/explain` workflow](/docs/core-concepts/workflows) — the ref-resolution → collect → secret gate → generate → validate → deliver pipeline
- [Video Generation](/docs/guide/video-generation) — `oma-video`'s explainer *mode* produces a narrated video instead of an HTML document
