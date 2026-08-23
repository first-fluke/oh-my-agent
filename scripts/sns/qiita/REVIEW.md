# Japanese Translation Review — oma-translation Stage 5–7

Post-draft review pass for Qiita posts. **Weekly mode** compares the Japanese draft against git context (source of truth). **Sync mode** (`--sync`) compares against the English dev.to article. `SOUL.md` is the voice reference in both cases.

## Workflow (blocking)

Run all three stages internally before emitting output. Do not return the first draft unchanged unless it already passes every check.

### Stage 5: Critical review

Compare the Japanese draft against the source material paragraph by paragraph (git context in weekly mode, English article in sync mode).

First, list 3–7 concrete tells that still feel machine-translated (register drift, repeated connectives, literal calques, noun-ending fragments in body prose, em dashes, etc.). Then fix them in Stage 6.

Checklist:
- **Accuracy**: facts, numbers, qualifiers unchanged
- **Europeanized Japanese**: unnecessary また/さらに/〜による, passive chains, noun pile-up
- **Register**: consistent です・ます in body; fragments only in list items
- **Terminology**: CLI, API, MCP, workflow, harness kept; no over-localization
- **Code integrity**: every code block, path, command identical to source
- **Anti-AI**: no 革新的/画期的, no さあ見ていきましょう, no added opinions

### Stage 6: Revision

Apply every Stage 5 finding. Rewrite translation-ese into native Japanese technical prose.

### Stage 7: Polish

Final read as a standalone Qiita article. Smooth transitions; verify footer links and tag list.

## Mechanical gate (must pass before emit)

- Zero em dashes (`—`) in Japanese prose
- Placeholders and code spans unchanged
- Heading count and list structure match source
- `source_url` unchanged from draft input
- Footer preserved: horizontal rule, 原文（英語） line, GitHub URL

## Output

JSON ONLY (no markdown fence, no commentary):

```json
{
  "title": "string",
  "body": "string (Markdown)",
  "tags": ["..."],
  "source_url": "https://..."
}
```

`tags` may be adjusted only for Qiita fit; do not drop required technical tags.
