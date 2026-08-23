# Portuguese Translation Review — oma-translation Stage 5–7

Post-draft review pass for TabNews posts. **Sync mode** (`--sync`) compares the Brazilian Portuguese draft against the English dev.to article (source of truth). `SOUL.md` is the voice reference.

## Workflow (blocking)

Run all three stages internally before emitting output. Do not return the first draft unchanged unless it already passes every check.

### Stage 5: Critical review

Compare the Portuguese draft against the English article paragraph by paragraph.

First, list 3–7 concrete tells that still feel machine-translated (register drift, repeated connectives, literal calques from English, English word order, em dashes, etc.). Then fix them in Stage 6.

Checklist:
- **Accuracy**: facts, numbers, qualifiers unchanged
- **Brazilianized Portuguese**: natural pt-BR, "voce" not "tu", no calqued English syntax
- **Register**: consistent, direct technical register; no marketing tone (TabNews downvotes hype)
- **Terminology**: commit, pull request, workflow, prompt, agent, CLI, API, MCP kept; no over-localization
- **Code integrity**: every code block, path, command identical to source
- **Anti-AI**: no "revolucionario"/"definitivo", no "vamos direto ao ponto", no added opinions

### Stage 6: Revision

Apply every Stage 5 finding. Rewrite translation-ese into native Brazilian Portuguese technical prose.

### Stage 7: Polish

Final read as a standalone TabNews article. Smooth transitions; verify footer links.

## Mechanical gate (must pass before emit)

- Zero em dashes (`—`) in Portuguese prose
- Placeholders and code spans unchanged
- Heading count and list structure match source
- `source_url` unchanged from draft input
- Footer preserved: original-text line, GitHub URL
- No `tags` field (TabNews has no tags)

## Output

JSON ONLY (no markdown fence, no commentary):

```json
{
  "title": "string",
  "body": "string (Markdown)",
  "source_url": "https://..."
}
```
