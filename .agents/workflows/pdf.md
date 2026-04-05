---
description: Convert PDF to Markdown using opendataloader-pdf — extracts text, tables, headings, and images with correct reading order
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/config/user-preferences.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.
- **Default output location: same directory as input PDF.**

---

> **Vendor note:** This workflow executes inline (no subagent spawning). Uses `uvx opendataloader-pdf` for zero-install execution.

---

## Step 1: Validate Input

1. Identify the PDF file path from the user's request
2. Confirm the file exists (`ls -lh "{path}"`)
3. Determine output location:
   - User specified a path → use it
   - Not specified → same directory as the input PDF
4. Set output filename: `{input_basename}.md`

If user provided no PDF path, ask:
```
Which PDF file should I convert? Please provide the file path.
```

---

## Step 2: Convert

Run the conversion:

```bash
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}"
```

### Variant: Tagged PDF (structured documents)
```bash
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --use-struct-tree
```

### Variant: With images embedded
```bash
uvx opendataloader-pdf "{input_path}" --format markdown --output-dir "{output_dir}" --image-output embedded
```

### Variant: Multiple formats
```bash
uvx opendataloader-pdf "{input_path}" --format markdown,json --output-dir "{output_dir}"
```

---

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

To check without modifying (dry-run):
```bash
uvx mdformat --check "{output_path}"
```

---

## Step 4: Verify Output

1. Check the output file was created
2. Read the first ~50 lines to verify structure:
   - Headings present (`#`, `##`, etc.)
   - Tables rendered (pipe syntax `|`)
   - No garbled text or encoding issues
3. If quality is poor:
   - Try `--use-struct-tree` if not already used
   - Suggest hybrid mode for scanned/complex PDFs

---

## Step 5: Report

Tell the user:
- Output file path
- Quick quality assessment (headings, tables, images detected)
- Any issues or recommendations

**Output example:**
```
PDF converted successfully.

Output: /path/to/document.md
- 15 pages processed
- 3 tables, 12 headings detected
- No issues found
```

---

## OCR Mode (Scanned PDFs)

If standard conversion produces empty or garbled output:

1. Inform the user the PDF appears to be scanned
2. Guide them to start the hybrid server:
   ```bash
   uvx opendataloader-pdf-hybrid --port 5002 --force-ocr --ocr-lang "en"
   ```
3. Re-run conversion with hybrid:
   ```bash
   uvx opendataloader-pdf --hybrid docling-fast "{input_path}" --format markdown --output-dir "{output_dir}"
   ```

For Korean documents, use `--ocr-lang "ko,en"`.

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| `uvx` not found | Guide: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| File not found | Ask user to verify the path |
| Permission denied | Check file permissions |
| Empty output | Likely scanned PDF → suggest OCR mode |
| Timeout on large PDF | Suggest processing specific page ranges |

---

## Quick Reference

| Command | Effect |
|---------|--------|
| `/pdf document.pdf` | Convert to .md in same directory |
| `/pdf document.pdf --output-dir ./out/` | Convert to specified directory |
| `/pdf document.pdf --format json` | Output as JSON instead |
| `/pdf document.pdf --use-struct-tree` | Use Tagged PDF structure |
| `/pdf document.pdf --image-output embedded` | Include images as base64 |
| `/pdf *.pdf` | Batch convert all PDFs |
