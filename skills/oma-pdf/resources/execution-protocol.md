# PDF Conversion - Execution Protocol

## Step 0: Validate Input

1. Read `config/pdf-config.yaml` for defaults (image output, struct tree, OCR languages, hybrid port, overwrite behavior); explicit user options override config values
2. Confirm the PDF file path exists
3. Check file size (`wc -c` or `ls -lh`); warn if >100MB
4. Determine output location:
   - If user specified output path → use it
   - If not specified → use the same directory as the input PDF
5. Determine output filename: `{input_name}.md` (same base name, `.md` extension)
6. If the output file already exists and config `output.overwrite` is `false`, confirm with the user before overwriting

## Step 1: Assess PDF Type

Quick check to determine conversion strategy — probe only the first pages, no temp files:

```bash
# Check if PDF has text layer (vs scanned image).
# -q is required: without it, Java INFO logs mix into stdout.
uvx opendataloader-pdf input.pdf -f text --pages 1-3 --to-stdout -q
```

- If output contains readable text → standard mode
- If output is empty or garbled → needs OCR (hybrid mode)

## Step 2: Convert

### Standard conversion
```bash
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}"
```

### If Tagged PDF (structured documents, official reports)
```bash
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --use-struct-tree
```

### If tables are missing or broken (try these BEFORE hybrid)

Hybrid mode downloads a large OCR stack; the core CLI has cheaper retries:

```bash
# Borderless tables: cluster-based detection
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --table-method cluster

# Complex tables (row/col spans): allow HTML tables inside Markdown
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --markdown-with-html
```

Escalate to hybrid mode only if tables are still wrong (typically scanned tables).

### If the PDF is large (memory pressure or slow conversion)

```bash
# Convert each page range into a distinct directory, then concatenate the files
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}/p1-50" --pages "1-50"
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}/p51-100" --pages "51-100"

# Or append each range from stdout into one combined file
uvx opendataloader-pdf "{input_path}" --format markdown --pages "1-50" --to-stdout >> "{output_path}"

# Or parallelize per-page processing (experimental)
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --threads 4
```

### Optional flags on request

- `--sanitize` — mask PII (emails, phone numbers, IPs, credit cards, URLs) for AI-ready data prep
- `--detect-strikethrough` — mark struck-through text with `~~` (experimental)
- `--markdown-page-separator "%page-number%"` — insert page markers between pages
- Hybrid server extras: `--enrich-formula` (LaTeX formulas), `--enrich-picture-description` (AI chart/image descriptions). Both require client-side `--hybrid-mode full`; the default `auto` mode may keep pages on the local path and skip enrichment.

### If scanned/image-based PDF (requires hybrid server)
```bash
# Start hybrid server (if not already running).
# The server is a console script of the [hybrid] extra — bare `uvx opendataloader-pdf-hybrid` fails (no such PyPI package).
# First run downloads a large OCR stack (torch, easyocr, docling); warn the user before starting.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid --port 5002 --force-ocr --ocr-lang "{languages}"

# Convert
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full "{input_path}" --format markdown --output-dir "{output_dir}"
```

## Step 3: Lint & Format

Run `mdformat` to normalize the converted Markdown:

```bash
uvx mdformat "{output_path}"
```

This auto-fixes:
- Inconsistent heading style
- Missing blank lines around blocks
- Trailing whitespace
- Unordered list marker normalization

## Step 4: Verify

1. Read the generated Markdown file
2. Verify structure:
   - Headings preserved (`#`, `##`, etc.)
   - Tables rendered correctly (pipe syntax)
   - Lists maintained (bullets, numbered)
   - No garbled or missing sections
3. If output directory is temporary, move the file to the target location
4. If the user needs the content in the conversation, read and present it

## Step 5: Report

Tell the user:
- Output file path
- Page count processed — read it from the converter log line `Processing N pages`, or `pdfinfo` when available
- Any issues encountered (missing tables, OCR quality, etc.)
- Suggest hybrid mode if standard conversion had quality issues

## Error Recovery

| Error | Recovery |
|-------|----------|
| `uvx` not found | Ask user to install `uv`: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| PDF password protected | Ask user for the password, then retry with `-p "{password}"` (`opendataloader-pdf --password`) |
| Missing or broken tables | Retry with `--table-method cluster` or `--markdown-with-html` first; hybrid mode only for scanned tables |
| Hybrid server not running | Guide user to start it, or fall back to standard mode with quality warning |
| Out of memory on large PDF | Process each `--pages` range into a distinct output directory (or append `--to-stdout`) before concatenating; reusing one directory overwrites the same basename |
| Network error (hybrid mode) | Check server port, retry, or fall back to standard mode |
