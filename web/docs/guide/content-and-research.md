---
title: "Guide: Content and Research Workflows"
sidebar_label: Overview
description: Choose the right oh-my-agent pathway, with its prerequisites, for PDF and HWP extraction, voice, scholarly and web research, slides, images, video, code explainers, diagrams, market research, recaps, translation, and academic writing.
---

# Content and Research Workflows

This guide routes document, audio, research, media, and presentation work to the capability that owns it. Start with the artifact you need, then use the smallest command or skill entry point that produces a reviewable result. Capabilities with their own guide link to it in the last column; the rest are covered on this page.

| Need | Entry point | Prerequisites | First result | Guide |
|---|---|---|---|---|
| Extract a PDF | `oma-pdf` skill, or the `uvx opendataloader-pdf` commands below | `uv` (for `uvx`) | Markdown, text, JSON, or a short extraction report | [below](#extract-pdf-content) |
| Extract HWP/HWPX/HWPML | `oma-hwp` skill and `bunx kordoc@latest` | Bun | Markdown or structured JSON/chunks | [below](#extract-hwp-family-documents) |
| Speak or transcribe audio | `/oma-voice` | Voicebox app on `127.0.0.1:17493` | Audio plus a manifest, or `transcript.md` plus a manifest | [below](#generate-speech-or-transcribe-audio) |
| Find and validate papers | `oma scholar` | none; optional `S2_API_KEY`, `OPENALEX_EMAIL` | Search results, a fetched sidecar, or a lint report | [below](#search-and-validate-scholarly-material) |
| Search the web or fetch a page | `oma-search` skill, `oma search` | optional Chrome, Python `curl_cffi`, `yt-dlp`, `gh` (check with `oma search doctor`) | JSON on stdout | [CLI Commands: search](../cli-interfaces/commands.md#search) |
| Build a presentation | `oma-slide` skill and `oma slide` | Chrome, or `OMA_CHROME_PATH` | Validated HTML slides and optional exports | [below](#slides-and-presentations) |
| Generate images | `oma-image` skill, `oma image generate` | one of `POLLINATIONS_API_KEY`, `codex login`, or a signed-in `agy` | Images plus `manifest.json` under `.agents/results/images/` | [Image Generation](./image-generation.md) |
| Make a short, explainer, or demo video | `/video`, `oma video` | Node.js 22+, FFmpeg, then `oma video doctor --install` | A run directory under `.agents/results/videos/`; an MP4 after `oma video render` | [Video Generation](./video-generation.md) |
| Explain a change or a topic as one page | `/explain`, `oma explain` | git for change mode; `gh` for PR refs | Self-contained HTML under `.agents/results/explain/` | [Code Explainer](./code-explainer.md) |
| Interactive architecture diagram | `/architecture`, `oma diagram` | none; archify is fetched on first use | Mermaid block, plus `.archify.html` when archify resolves | [Diagram Engine](./diagram-engine.md) |
| Community market research | `oma-market` skill, `oma market` | Python 3.12+ | A brief under `.agents/results/market/` | [Market Research](./market-research.md) |
| Summarize agent conversations | `/recap`, `oma recap` | none | Recap JSON from the CLI; a dated Markdown recap from `/recap` | [below](#recap-agent-conversations) |
| Translate or review localized prose | `oma-translation` skill | none | Target-language text or an evidence-backed review | [below](#translate-or-review-localized-content) |
| Draft or audit academic prose | `oma-academic-writing` skill | none | Draft, revision, or compliance report with a Claim-Evidence Map | [below](#draft-or-audit-academic-writing) |

The `oma` command names in this page are registered public commands. `uvx`, `bunx`, and `bun` are external conversion tools documented by their owning skills. The remaining [skills](../getting-started/glossary.md#skill) are natural-language or slash-command entry points; there is no standalone `oma pdf`, `oma hwp`, `oma voice`, `oma translation`, or `oma academic-writing` command.

## Extract PDF content

Use the `oma-pdf` skill when the input is a PDF and the output needs readable structure for a person, an LLM, or a retrieval pipeline. The skill probes the text layer before choosing standard, tagged, or hybrid OCR extraction.

For a quick text-layer check, print a small page range without creating an output file:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

For Markdown extraction and normalization:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Choose a page range with `--pages` for large documents. If the text layer is readable, stay with standard extraction. If tagged structure is present but the reading order is poor, retry with `--use-struct-tree`; for broken tables, try `--table-method cluster` or `--markdown-with-html` before switching to OCR.

For a scanned or image-based PDF, start the hybrid server and then run the hybrid converter:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

In a second terminal, define the output directory and run the converter:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

The successful artifact is the Markdown or text file in the selected output directory, accompanied by the page count and any quality notes. Encrypted PDFs require an unlocked copy or a password. Large files may need separate page ranges and output directories so repeated runs do not overwrite the same basename. Do not treat OCR guesses as source facts; report uncertain or missing tables.

## Extract HWP-family documents

Use `oma-hwp` for `.hwp`, `.hwpx`, and `.hwpml` files. It runs `kordoc` through Bun, then post-processes Markdown tables and Private Use Area glyphs when needed.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

On a fresh clone, the helper may report `Cannot find module "turndown"`; run `bun install` in the `oma-hwp` skill's `resources/` directory, then rerun the helper.

Use an explicit output directory for a batch:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

The default output is Markdown. For a structured AST use `bunx kordoc@latest "<input.hwp>" --format json`; for retrieval-oriented chunks use `--format chunks`. The conversion options `--dedupe-headers`, `--keep-empty-cols`, and `--inline-images` control common table and image cases. Check headings, nested or merged tables, lists, images, footnotes, and links in the result before passing it to another skill.

`bun` and `bunx` are prerequisites. Empty output can indicate scanned image content; route that case to an OCR-capable workflow. Encrypted or DRM-limited material may remain incomplete. PDF, DOCX, and XLSX inputs belong to their matching skills even though `kordoc` has other authoring and parsing subcommands.

## Generate speech or transcribe audio

`oma-voice` is MCP-native and uses a local Voicebox server. Invoke it in an agent with a slash command:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS accepts up to 5,000 characters per call and needs a Voicebox voice profile. Transcription does not need a TTS profile and accepts audio up to 30 minutes. Persisted TTS and STT work writes under `.agents/results/voice/`; transcription produces `transcript.md` and `manifest.json`. Notification mode normally stays in Voicebox Captures and does not write a local audio file.

The local MCP endpoint is `http://127.0.0.1:17493/mcp`. A first-use setup registers Voicebox with the agent, and the Voicebox desktop app supplies voice profiles. The skill discovers the actual MCP tool names with `tools/list`, then calls `voicebox_speak`, `voicebox_transcribe`, or `voicebox_list_profiles`. If TTS has no profile, create or select one in Voicebox; splitting an overlong request is a user decision because the skill does not auto-chunk it. If the server is unavailable, check the local health endpoint and restart Voicebox before retrying.

## Search and validate scholarly material

Use the `oma scholar` CLI for Knows sidecars and paper metadata. Search and resolve are discovery operations; `get` retrieves a record or selected section; `lint` is the sharing gate.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows is tried first, with OpenAlex and Semantic Scholar fallbacks. `--section` can request `statements`, `evidence`, `relations`, `artifacts`, or `citation`. Use `--lenient` when dangling cross-record references are expected during local assembly; use `--fail-on-warning` for a strict CI gate. A search result or fetched sidecar is evidence for discovery, not a claim that the paper supports every conclusion. Generate or revise a sidecar in the agent, then run `oma scholar lint` before sharing it.

If a remote service times out, retry a broader query or allow the CLI's fallback; `--always-fallback` queries OpenAlex and Semantic Scholar even when Knows has hits. A 429 from Semantic Scholar can be an anonymous-pool limit; retry later, or set `S2_API_KEY`. Set `OPENALEX_EMAIL` (and optionally `OPENALEX_API_KEY`) to identify your OpenAlex requests. If a sidecar has a provenance enum error, use `tool`, `person`, or `org`; if relation-density warnings remain, add supported evidence relations only where the source supports them.

## Slides and presentations

Use `oma-slide` when the deliverable is a fixed-stage presentation. The authoring skill writes HTML fragments at 1920×1080; the CLI validates geometry, bundles the deck, and exports it.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Export only after validation:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Use `--slide <file>` for a single-slide check and `--report-file <path>` with JSON output when another process needs the findings. `slide import pptx <file>` starts an import workflow; `slide asset fetch-video <url>` downloads a video asset; `slide style list|preview|get <slug>` inspects styles. PPTX output is raster-backed, so it does not provide editable text or shape layers. Validation and export require Chrome/puppeteer; set `OMA_CHROME_PATH` when the executable is not discoverable. If validation cannot converge after three auto-fix iterations, use the reported geometry findings to edit the affected fragment.

## Recap agent conversations

Use `/recap` (or ask the agent for a recap) for evidence-based work summaries; it runs `oma recap` to collect the history. A calendar date and a rolling window are different inputs:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

These commands print the collected history (terminal text by default, JSON with `--json`, or a Mermaid gantt chart with `--mermaid`), and `--graph` opens an interactive graph in the browser instead; the CLI itself writes no file. `/recap` saves the Markdown recap under `.agents/results/recap/`, normally as `{date}.md` for a daily recap or `{start-date}~{end-date}.md` for a range. The recap groups by work content, marks requested and in-progress work separately from completed work, and records missing tool history. Use `--top` or `--sort` when the report needs a narrower view. If the CLI is unavailable, the skill can use the documented Claude-history fallback, but the reduced source coverage must be stated.

Use `oma retro` for a git-based engineering retrospective. It answers a different question from a conversation recap and can compare adjacent windows with `--compare`.

## Translate or review localized content

Use `oma-translation` for UI strings, documentation, reports, marketing copy, or academic prose. Invoke it in natural language or with the `/oma-translation` skill entry point; there is no public `oma translation` command.

Give the skill the source, target locale, content type, and whether the task is translation, review, or source-diff synchronization. It loads one matching language profile from the skill resources when available, preserves placeholders, links, Markdown structure, and protected syntax, and follows the project's sibling translations and glossary. For a long document or review, it also applies the translation rubric. If no target profile exists, it uses the shared rules and reports that limit once.

For documentation, translate the stable English page after its anchors and command examples are settled. Keep CLI names, flags, paths, environment variables, and code blocks exact; translate surrounding explanation and verify the target page's structure against English. An ambiguous source meaning should be flagged rather than silently guessed.

## Draft or audit academic writing

Use `oma-academic-writing` for English essays, reports, literature reviews, analyses, executive summaries, conclusions, and revisions. Select one mode and provide the rubric or source constraints:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` returns prose, Writing Notes, and a Claim-Evidence Map. `revise` returns the original and revised blocks plus concrete changes. `review` returns PASS/FAIL findings for sentence structure, verbs, hedging, specificity, anti-AI patterns, paragraph clarity, rhythm, and claim-evidence alignment. The skill reads an existing draft in full for revise/review, weakens or removes unsupported claims, and hands non-English output to `oma-translation` after the English pass.

Use `oma scholar` for source discovery and sidecar evidence before drafting. If a citation or rubric is missing, mark the claim as pending or ask for the missing constraint; do not fill the gap with an invented source. The useful completion artifact is the prose plus the evidence map or audit report, rather than a generic “polished” paragraph with no traceable support.

## Recovery checklist

| Symptom | Next action |
|---|---|
| Output is empty or structurally garbled | Check the input type, then choose tagged, table, or OCR mode for PDFs; for HWP, verify Bun and inspect the source for image-only pages. |
| A local skill cannot connect | Check the owning local service or CLI (`Voicebox`, `Chrome`, `uvx`, `bunx`) before changing the content request. |
| A research result is thin | Broaden the query, inspect the fallback/source status, and preserve the uncertainty in the report. |
| A slide export fails | Run `oma slide validate --workspace <dir> --output json`, fix geometry or font findings, then export again. |
| A recap overstates completion | Recheck receipts and artifacts; a prompt or tool invocation alone is not completion evidence. |
| A translation changes code syntax | Restore protected names and rerun structure checks before reviewing prose quality. |
| Academic prose has unsupported claims | Remove or hedge the claim, add evidence through the scholar path, and rerun the Claim-Evidence Map. |

## Next steps

- [Image Generation](./image-generation.md), [Video Generation](./video-generation.md), [Code Explainer](./code-explainer.md), [Diagram Engine](./diagram-engine.md), and [Market Research](./market-research.md) — the guides for the capabilities in the table above
- [CLI Commands](../cli-interfaces/commands.md) and [CLI Options](../cli-interfaces/options.md) — the complete registered CLI paths and option aliases
- [Configuration reference](./configuration-reference.md) — the `pdf`, `hwp`, `voice`, and `scholar` config sections
