---
name: oma-pdf
description: >
  Convert PDF files to Markdown using opendataloader-pdf. Extracts text, tables, headings,
  lists, and images with correct reading order. Use for PDF parsing, PDF to Markdown conversion,
  document extraction, and AI-ready data preparation.
---

# PDF Skill - PDF to Markdown Conversion

## When to use
- Converting PDF documents to Markdown for LLM context or RAG
- Extracting structured content (tables, headings, lists) from PDFs
- Preparing PDF data for AI consumption
- User says "convert this PDF", "parse PDF", "PDF to markdown", "read this PDF"

## When NOT to use
- Generating or creating PDFs -> use appropriate document tools
- Editing existing PDFs -> out of scope
- Simple file reading of already-text files -> use Read tool directly

## Core Rules
1. Use `uvx opendataloader-pdf` to run — no installation required
2. Default output format is Markdown
3. If no output directory specified, output to the same directory as the input PDF
4. Preserve document structure: headings, tables, lists, images
5. For scanned PDFs, use hybrid mode with OCR
6. Always run `uvx mdformat` on the output to normalize Markdown formatting
7. Validate the output Markdown is readable and well-structured
8. Report any conversion issues (missing tables, garbled text) to the user

## How to Execute
Follow `resources/execution-protocol.md` step by step.

## Quick Reference

### Basic conversion (single file)
```bash
uvx opendataloader-pdf input.pdf
```

### Specify output directory
```bash
uvx opendataloader-pdf input.pdf --output-dir ./output/
```

### Multiple files or folder
```bash
uvx opendataloader-pdf file1.pdf file2.pdf folder/
```

### With OCR (scanned PDFs)
Requires hybrid mode server:
```bash
uvx opendataloader-pdf-hybrid --port 5002 --force-ocr --ocr-lang "ko,en"
uvx opendataloader-pdf --hybrid docling-fast input.pdf
```

### With image extraction (embedded base64)
```bash
uvx opendataloader-pdf input.pdf --image-output embedded --image-format png
```

### With Tagged PDF structure
```bash
uvx opendataloader-pdf input.pdf --use-struct-tree
```

## Output Formats
| Format   | Flag                | Use case                              |
|----------|---------------------|---------------------------------------|
| Markdown | `--format markdown` | Default. Clean text for LLM/RAG      |
| JSON     | `--format json`     | Structured data with bounding boxes   |
| HTML     | `--format html`     | Web display                           |
| Text     | `--format text`     | Plain text extraction                 |
| Combined | `--format markdown,json` | Multiple formats at once         |

## Configuration
Project-specific settings: `config/pdf-config.yaml`

## Troubleshooting

| Issue                        | Solution                                                |
|------------------------------|---------------------------------------------------------|
| Garbled text in output       | Try `--use-struct-tree` for Tagged PDFs                 |
| Scanned PDF (no text layer)  | Use hybrid mode with `--force-ocr`                      |
| Tables not extracted properly| Use hybrid mode for complex/borderless tables           |
| Non-English PDF              | Add `--ocr-lang` with appropriate language codes        |
| Large PDF (100+ pages)       | Process in page ranges or use batch mode                |
| Formula not extracted        | Use hybrid mode with `--enrich-formula`                 |

## References
- Execution steps: `resources/execution-protocol.md`
- Configuration: `config/pdf-config.yaml`
- Context loading: `../_shared/core/context-loading.md`
- Quality principles: `../_shared/core/quality-principles.md`
