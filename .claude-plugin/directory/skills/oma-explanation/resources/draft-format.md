# Draft Format — `oma explain render`

> The authoring contract for explanations. You write a Markdown draft; `oma explain render`
> turns it into the HTML page. You never write HTML, CSS, SVG, or coordinates.
> For WHAT a change explainer must contain, see `document-structure.md`.

## 1. Why a draft

Layout, theme, diagram geometry, responsiveness, escaping, and the quiz script are the
renderer's job. They are the same on every page and they are tested. Your job is the content:
which panels exist, what each one says, and which relations a diagram shows.

```bash
oma explain render draft.md            # → .agents/results/explain/{YYYY-MM-DD}-{slug}.html
oma explain render - < draft.md        # draft from stdin
oma explain components                 # list the components
oma explain components flow            # one component's syntax and example
oma explain lint draft.md              # prose check only, no page
oma explain patch <page.html> --panel C panel.md   # replace one panel, keep the rest
oma explain patch <page.html> --panel "Call order" panel.md   # or name it by title
```

Write the draft to a scratch location (or pipe it); the HTML is the artifact, and it embeds
the draft so a later `patch` needs nothing else.

## 2. Shape of a draft

```markdown
---
title: How the row planner fills a page        # required (or start the body with "# Title")
subtitle: One sentence that says what the reader will know afterwards
slug: row-planner                               # file name; required when the title is not ASCII
template: sheet                                 # sheet = grid of panels (default) | doc = one column with contents
theme: blueprint                                # blueprint (default) | card; the reader can switch on the page
mode: auto                                      # auto (default) | light | dark
cols: 3                                         # grid the span hints refer to, 1-12
style: warn                                     # prose check: off | warn (default) | strict
Scope: cli/commands/explain/render              # any other key shows in the header meta line
---

One or two lead sentences: the answer first.

## Panel title {span=2 note="12 nodes"}

Markdown prose, lists, tables, and component blocks.

## Next panel
```

- One `## ` heading starts one panel. Panels get letters A, B, C in order; a heading may
  give its own (`## C Title`, `## B1 Title`), and ids must not repeat.
- Panel attributes, all optional: `span=N` (width hint in grid columns; `span` equal to `cols`
  keeps the panel on its own row), `rows=N` (height in the plain grid), `note="…"` (small text
  at the right of the head), `bare` (no head), `archify` (this panel's diagram feeds the
  interactive sidecar, see section 5).
- You do not place panels. The page measures every panel and packs rows so they fill the
  width with the least blank space, keeps the diagrams of one page at similar scales, and
  falls back to one column on a phone. A wide table or diagram gets a wider span by itself,
  so write `span` only for a panel that must stand out.
- `template: sheet` suits an overview read at a glance: 4 to 9 panels. `template: doc` suits
  a linear explanation read top to bottom; it adds a contents list from three panels up.
- One idea per panel: a diagram with two sentences beats a wall of text.
- Prose is GitHub-flavoured Markdown, parsed by remark: `###` headings, nested and task
  lists, tables with alignment, quotes, rules, links (inline or reference style), footnotes. An image shows only as a `data:` URI; any other image
  becomes a link, because the page loads nothing from outside.

## 3. Components

A fenced block named after a component renders that component. Any other fence
(`ts`, `bash`, `json`, …) is shown as code; `diff` colours added and removed lines.

| Component | Use it for | Draft content |
| --- | --- | --- |
| `flow` | architecture, pipelines, decisions | relations: `A -> B: label`, `group Name: A, B` |
| `sequence` | calls between actors over time | `From -> To: message`, `note A, B: text`, `== Phase ==` |
| `tree` | org chart, breakdown, file tree | indented names, `label \| note`, `*highlight` |
| `timeline` | history, phases, rollout | `when \| title \| detail`, `*when` for the key event |
| `limits` | a value against its limit | `label \| value / limit \| unit` |
| `annot` | a command or line of code, part by part | `[span]{note}`, `[span]{!wrong}` |
| `kv` | facts as a grid, or a title block | `key: value`, `* wide key: value`, `cols=N` |
| `callout` | the one point not to miss | `callout info\|ok\|warn\|err\|key Title` + Markdown |
| `quiz` | comprehension check | `? question`, `- wrong`, `+ right`, `> feedback` |

Run `oma explain components <name>` for the exact grammar before the first use in a session.
The essentials:

````markdown
```flow LR
(User) -> API -> Service* -> [(Orders DB)]
Service --> Queue: order.created
{Valid?} -> Service: yes
group Backend: API, Service
```
````

- `->` solid, `-->` dashed. A chain creates its nodes. `A -> B & C` fans out.
- Shapes: `(pill)` for actors and endpoints, `{diamond}` for decisions, `[(cylinder)]` for
  stores, plain text or `[box]` for everything else. A `*` before the name marks the node
  the panel is about. `name = Long label` gives a long label a short name.
- `group Name: A, B` frames related nodes. The layout keeps every other node out of the frame.
- A node name that holds a colon goes in brackets: `[step: one]`.
- Write relations only. Do not order lines to "place" nodes, and never use ASCII art.
- Keep a diagram under about 12 nodes and labels under about 20 characters. Split it otherwise.
- Put example data on the arrows (`: {sid, kind}`) when the data is the point.

````markdown
```sequence num
participants: Client, Server
Client -> Server: SYN
Server --> Client: SYN-ACK
== Established ==
note Client, Server: both sides can send
```
````

- `participants:` fixes the left-to-right order; `num` numbers the messages; `== Title ==`
  starts a phase; a note may span several participants.

`tree` picks its shape from the content: one root with 2 to 4 children draws an org chart,
several roots stand side by side, and a file tree (`src/`, `main.ts`) or the `list` argument
gives an indented list. `timeline` runs left to right up to six events and top to bottom
beyond (`h` / `v` force it).

Fullwidth punctuation works wherever a colon or comma separates fields (`：`, `，`), so a
Chinese, Japanese, or Korean draft needs no switch of input mode.

Tables: a cell that starts with `ok`, `no`, or `warn` becomes a status badge
(`| Retry | ok idempotent |`). Use this for comparisons and before/after tables.

Text is always shown as written. `<sid>`, `<T>`, and HTML in a draft appear as characters;
nothing in a draft can inject markup.

## 4. Writing

The renderer checks the prose (`style: warn` prints warnings, `strict` fails the render):

- One fact per sentence. English: at most 25 words (20 in a numbered step). Korean: about
  70 characters. Japanese 65, Chinese 45. At most 6 sentences in a paragraph.
- Plain words: "use", not "utilize"; "to", not "in order to". Name who does what instead of
  the passive.
- Korean: no double passive (`되어진`, `보여지다`), no translationese (`~에 있어서`,
  `~로부터`, `~하는 것이 가능하다`, `~에 의해`), verbs instead of `~을 수행/진행하다`, and
  correct spellings (`됐`, `며칠`).
- Chinese: no light verbs (`进行验证` → `验证`), no clichés (`赋能`, `闭环`), numbers
  instead of `若干` / `尽快`, and `大于` / `不小于` instead of `10 次以上`.
- Japanese: `できる` instead of `することができる`, the verb instead of `〜を行う`.
- The page language is detected from the draft (Hangul → Korean). Set `lang:` only to override.
- Fix warnings by rewriting the sentence, not by turning the check off. Counter-examples go
  in `~~strikethrough~~` or a table row marked `no`; those are not checked.

When the render fails, the error names the draft line and prints the component's syntax and
an example. Fix that line and render again.

## 5. archify sidecar

`flow` and `sequence` blocks already hold a typed graph, so the renderer derives the archify
spec itself:

```bash
oma explain render draft.md --archify      # or diagram.explain_sidecar: true in oma-config
```

- Source diagram: the first flow/sequence block of the panel marked `{archify}`, else the
  first one in the draft. Mark the panel whose diagram is the main picture.
- Output: `{stem}.archify.html` (and `.archify.json`) next to the page, linked by a plain
  anchor under that panel and in the footer. Never embedded.
- `flow` becomes an archify `architecture` grid and its groups become boundaries; `sequence`
  becomes an archify `sequence` and its `== Phase ==` dividers become segments. Component
  types come from the label and shape: name stores, queues, users, and UI as what they are.
- A sidecar is an extra. If archify is not installed, the diagram is too small, or
  `deliver` fails, the page is still written and the report says why. Do not hand-author a
  spec to work around it unless the user asks; `--no-archify` skips it.

## 6. Change explainer drafts

For a diff / PR / branch (`document-structure.md`), set `template: doc` and write the four
sections as panels in this order:

1. **Background** panels: surrounding system (say it is skippable), then the narrow context.
   A `flow` or `tree` usually carries the first one.
2. **Intuition** panels: toy data in a table or on `flow` / `sequence` arrows; before/after
   as a table with `no` / `ok` cells.
3. **Code** panels in comprehension order: a `diff` (or language) fence per step, with
   `file:line` in the panel `note` or the sentence above it. `annot` for a single line that
   deserves a part-by-part reading.
4. **Quiz** panel: one `quiz` block, 5 questions by default, feedback (`>`) on every option.

Add the provenance facts as frontmatter keys (`Source: PR #640`, `Excluded: bun.lock`), so
they show in the header.

## 7. After rendering

```bash
oma explain validate <file>
```

The renderer already guarantees the self-contained rule, `<pre>` code containers, themes,
focus states, and the quiz behaviour. The validator still matters for what you control:
the file name and secrets quoted in prose or code.
