---
name: oma-hwp
description: >
  Convert HWP / HWPX / HWPML files to Markdown using kordoc. Extracts text, headings, tables,
  lists, images, footnotes, and hyperlinks. Use for Korean word processor files (Hangul),
  government documents, and AI-ready data preparation.
---

# HWP Skill - HWP / HWPX / HWPML to Markdown Conversion

## When to use
- Converting Korean HWP documents (`.hwp`, `.hwpx`, `.hwpml`) to Markdown
- Preparing Korean government/enterprise documents for LLM context or RAG
- Extracting structured content (tables, headings, lists, images) from HWP
- User says "convert this HWP", "parse hwpx", "HWP to markdown", "한글 파일"

## When NOT to use
- PDF files -> use `oma-pdf` (OCR + Tagged PDF specialization)
- XLSX / DOCX files -> currently out of scope (may be covered by a future `oma-docs`)
- Generating or editing HWP documents -> out of scope
- Already-text files -> use Read tool directly

## Core Rules
1. Use `bunx kordoc@latest` to run — no installation required. Always pass `@latest` (or a pinned version) to avoid using a stale bunx cache
2. Default output format is Markdown
3. If no output directory specified, output to the same directory as the input
4. kordoc handles structure preservation (headings, tables, nested tables, footnotes, hyperlinks, images)
5. Security defenses (ZIP bomb, XXE, SSRF, XSS) are provided by kordoc — do not add our own
6. For encrypted or DRM-locked HWP, report the limitation to the user clearly
7. After kordoc runs, post-process with `resources/flatten-tables.ts` to convert HTML `<table>` blocks (kordoc's fallback for merged cells) into GFM pipe tables. Merged-cell fidelity is traded for pure-Markdown output — this is the accepted default
8. Validate the output Markdown is readable and well-structured before reporting success
9. Report any conversion issues (missing tables, garbled text, empty output) to the user

## How to Execute
Follow `resources/execution-protocol.md` step by step.

## Quick Reference

> Without `-o` or `-d`, kordoc prints Markdown to **stdout**. Always pass an output target to write a file.

### Basic conversion (write next to input)
```bash
# Given input.hwp at /path/to/input.hwp, write /path/to/input.md
bunx kordoc@latest /path/to/input.hwp -o /path/to/input.md
```

### Print to stdout (preview / pipe)
```bash
bunx kordoc@latest input.hwp
bunx kordoc@latest input.hwpx
```

### Specify output directory (multiple files)
```bash
bunx kordoc@latest *.hwp -d ./out/
```

### Page / section range
```bash
bunx kordoc@latest input.hwp -p 1-5
bunx kordoc@latest input.hwp -p 1,3,5
```

### JSON output (structured)
```bash
bunx kordoc@latest input.hwp --format json
```

### Silent mode (hide progress)
```bash
bunx kordoc@latest input.hwp --silent
```

## kordoc CLI Flags

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Output file path (single-file mode) |
| `-d, --out-dir <dir>` | Output directory (multi-file mode) |
| `-p, --pages <range>` | Page/section range (e.g., `1-3`, `1,3,5`) |
| `--format <type>` | `markdown` (default) or `json` |
| `--no-header-footer` | Strip PDF headers/footers (PDF only) |
| `--silent` | Suppress progress messages |
| `-V, --version` / `-h, --help` | Standard |

This skill passes kordoc flags through as-is — no translation layer.

## Supported Formats (official scope)
| Format | Extension | Notes |
|--------|-----------|-------|
| HWP 5.x binary | `.hwp` | Full support (incl. DRM-locked via kordoc's rhwp-algorithm port) |
| HWPX | `.hwpx` | Full support incl. nested tables, merged cells |
| HWPML | `.hwp` (XML variant) | Auto-detected by signature |

> kordoc also parses PDF / XLSX / DOCX. Those are intentionally outside this skill's scope — see "When NOT to use".

## Configuration
Project-specific settings: `config/hwp-config.yaml`

## Troubleshooting
See `resources/troubleshooting.md`.

## References
- Execution steps: `resources/execution-protocol.md`
- Troubleshooting: `resources/troubleshooting.md`
- Configuration: `config/hwp-config.yaml`
- Upstream: https://github.com/chrisryugj/kordoc
- Related: `../oma-pdf/SKILL.md` (use for `.pdf` inputs)
