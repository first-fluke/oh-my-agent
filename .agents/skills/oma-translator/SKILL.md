---
name: oma-translator
description: Context-aware translation that preserves tone, style, and natural word order. Use when translating UI strings, documentation, marketing copy, or any multilingual content. Infers register, domain, and style from the source text and surrounding codebase context.
---

# Translator - Context-Aware Translation

## When to use

- Translating UI strings, error messages, or microcopy
- Translating documentation, README, or guides
- Translating marketing copy or landing pages
- Reviewing existing translations for naturalness
- Creating glossaries or translation style guides
- Any task involving multilingual content

## When NOT to use

- i18n infrastructure setup (key extraction, routing, build) -> use dev-workflow
- Adding new locale to framework config -> use dev-workflow
- Code-level l10n patterns (date formatting, pluralization API) -> use relevant agent

## Core Rules

1. Scan existing locale files before translating to align with project conventions
2. Preserve placeholders and interpolation syntax
3. Translate meaning, not words
4. Match register consistently throughout a single piece
5. Split/restructure sentences for target language naturalness
6. Flag ambiguous source text rather than guessing
7. Preserve domain terminology as-is — if a term has established meaning in the field (e.g., harness, scaffold, shim, polyfill, middleware), keep it even if a "simpler" native word exists
8. Never produce literal word-for-word translations
9. Never mix registers within a single piece (formal + casual)
10. Never replace domain-specific terms with generic equivalents (e.g., "harness" → "framework", "shim" → "wrapper")
11. Never translate proper nouns unless existing translations do so
12. Never change the meaning to "sound better"
13. Never skip verification stage for batches > 10 strings
14. Never modify source file structure (keys, nesting, comments)

## Context Inference

No config file required. Instead, infer translation context from:

1. **Existing translations in the project** — scan sibling locale files to match register, terminology, and style already in use
2. **File location** — `messages/`, `locales/`, `.arb` files reveal the framework and format
3. **Surrounding code** — component names, comments, and variable names hint at domain and audience
4. **Source text itself** — register, formality, sentence structure reveal intent

If context is insufficient to make a confident decision, ask the user. Prefer one targeted question over a batch of questions.

## Translation Method

### Stage 1: Analyze Source

Read the source text and identify:
- **Register**: Formal, casual, conversational, technical, literary
- **Intent**: Inform, persuade, instruct, entertain
- **Domain terms**: Words that need consistent translation (check existing translations first)
- **Cultural references**: Idioms, metaphors, humor that won't transfer directly
- **Sentence rhythm**: Short/punchy vs. long/flowing

### Stage 2: Extract Meaning

Strip away source language structure. Ask yourself:
- What is the author actually trying to say?
- What emotion or tone should the reader feel?
- What action should the reader take?

Do NOT start forming target sentences yet.

### Stage 3: Reconstruct in Target Language

Rebuild from meaning, following target language norms:

**Word order**: Follow target language's natural structure.
- EN → KO: SVO → SOV, move verb to end, particles replace prepositions
- EN → JA: Similar SOV restructuring, honorific system alignment
- EN → ZH: Maintain SVO but restructure modifiers (pre-nominal in ZH)

**Register matching**:
- Infer from existing translations in the project, or from source text tone
- Adjust formality markers (honorifics, sentence endings, vocabulary level)

**Sentence splitting/merging**:
- English compound sentences often split into shorter Korean/Japanese sentences
- English bullet points may merge into flowing paragraphs in some languages

**Omission of the obvious**:
- Korean/Japanese allow subject omission when contextually clear
- Don't force subjects that feel unnatural

### Stage 4: Verify

Check against rubric (see `resources/translation-rubric.md`):
1. Does it read like it was originally written in the target language?
2. Are domain terms consistent with existing translations in the project?
3. Is the register consistent throughout?
4. Is the meaning preserved (not just words)?
5. Are cultural references adapted appropriately?

Check against anti-AI patterns (see `resources/anti-ai-patterns.md`):
6. No AI vocabulary clustering or inflated significance
7. No promotional tone upgrade beyond the source
8. No synonym cycling — consistent terminology
9. No source-language word order leaking through
10. No unnecessary bold, em dashes, or formatting artifacts

## Batch Translation Rules

When translating multiple strings (e.g., UI keys):

1. **Read all strings first** before translating any — context matters
2. **Scan existing translations** in the project to align terminology and style
3. **Maintain terminology consistency** across the batch
4. **Preserve variables and placeholders** exactly as-is (`{name}`, `{{count}}`, `%s`, `<tag>`, `` `code` ``)
5. **Keep key structure** — only translate values, never keys
6. **Match length roughly** for UI strings (avoid 3x longer translations that break layout)

## Output Format

### Single text
```
Source (EN):
> original text

Translation (KO):
> translated text

Notes:
- [any decisions made about ambiguous terms or cultural adaptation]
```

### Batch (i18n files)
Output in the same format as input (JSON, ARB, YAML, etc.) with only values translated.

### Review mode
```
Original translation:
> existing translation

Suggested revision:
> improved translation

Why:
- [specific issues: unnatural word order, wrong register, inconsistent term, etc.]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ambiguous source meaning | Flag and ask for context before translating |
| No precedent for a term | Propose a translation, confirm with user before applying |
| Register conflict in source | Follow project's existing register, note the inconsistency |
| Placeholder in middle of sentence | Restructure around it; never break placeholder syntax |
| Translation too long for UI | Provide a shorter alternative with note |

## How to Execute

Follow the translation method (Stage 1-4) step by step.
Before submitting, verify against `resources/translation-rubric.md` and `resources/anti-ai-patterns.md`.

## Execution Protocol (CLI Mode)

See `../_shared/execution-protocols/` for vendor-specific protocols.
When spawned via `oh-my-ag agent:spawn`, the protocol is injected automatically.

## References

- Translation rubric: `resources/translation-rubric.md`
- Anti-AI patterns: `resources/anti-ai-patterns.md`
- Context loading: `../_shared/context-loading.md`
- Quality principles: `../_shared/quality-principles.md`
