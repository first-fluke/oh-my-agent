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
4. Preserve emotional connotations — translate the feeling, not just the dictionary meaning (e.g., "alarming" carries urgency/concern, not merely "surprising")
5. Match register consistently throughout a single piece
6. Split, merge, or restructure sentences for target language naturalness
7. Flag ambiguous source text rather than guessing
8. Preserve domain terminology — if a term has established meaning in the field (e.g., harness, scaffold, shim, polyfill, middleware), keep it even if a "simpler" native word exists
9. Never produce literal word-for-word translations
10. Never mix registers within a single piece (formal + casual)
11. Never replace domain-specific terms with generic equivalents (e.g., "harness" → "framework", "shim" → "wrapper")
12. Never translate proper nouns unless existing translations do so
13. Never change the meaning to "sound better"
14. Never skip verification stage for batches > 10 strings
15. Never modify source file structure (keys, nesting, comments)
16. Never preserve source-language formatting artifacts that are unnatural in the target language. For CJK targets (Korean, Japanese, Chinese), em dashes (—), title case in headings, and trailing "-ing" participle clauses must be restructured — even when the source uses them. See `resources/anti-ai-patterns.md` rules 13–16.

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
- **Sentence rhythm**: Short/punchy vs. long/flowing — note parallel structures, intentional repetition, and emphasis patterns
- **Comprehension challenges**: Terms or references target readers may struggle with — domain jargon lacking standard translations, cultural references (pop culture, history, social norms), implicit knowledge the author assumes, wordplay or puns, named concepts (e.g., "Dunning-Kruger effect"). For each, note: the original term, why it may confuse, and a concise plain-language explanation for a potential translator's note
- **Figurative language mapping**: For each metaphor, simile, idiom, or figurative expression, classify the handling approach:
  - **Interpret**: Discard source image entirely, express the intended meaning directly in natural target language
  - **Substitute**: Replace with a target-language idiom or image that conveys the same idea and emotional effect
  - **Retain**: Keep the original image if it works equally well in the target language
- **Emotional connotations**: Words carrying subjective feeling beyond dictionary meaning (e.g., "alarming" = urgency, "haunting" = lingering unease) — note the emotional effect to preserve in translation

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
- Many languages (Korean, Japanese, Chinese, etc.) allow subject or pronoun omission when contextually clear
- Don't force subjects or pronouns that feel unnatural in the target language

### Stage 4: Verification Gate (blocking — do not emit output until every item is confirmed)

This stage is mandatory. Skipping any item is a bug, not a shortcut. Before producing the final translation, run the mechanical checks first, then the rubric.

**A. Mechanical checks (run before rubric, must all pass):**

- **CJK em dash scan**: For Korean, Japanese, or Chinese targets, search the draft output for `—`. Every occurrence must be replaced with a comma, colon, parenthesis, or restructured sentence. Zero em dashes in the emitted output.
- **Placeholder integrity**: Every `{name}`, `{{count}}`, `%s`, `<tag>`, and `` `code` `` from the source appears unchanged in the target.
- **Structure parity**: Headings, list bullets, table rows, code blocks, and links match the source count and nesting.
- **Register consistency**: One sentence-ending style throughout (don't mix `-ㅂ니다` with `-다`, formal with casual).

If any mechanical check fails, revise and re-run. Do not proceed to the rubric until all pass.

**B. Translation rubric (see `resources/translation-rubric.md`):**
1. Does it read like it was originally written in the target language?
2. Are domain terms consistent with existing translations in the project?
3. Is the register consistent throughout?
4. Is the meaning preserved (not just words)?
5. Are cultural references adapted appropriately?
6. Are emotional connotations preserved (not flattened into neutral descriptions)?

**C. Anti-AI patterns (see `resources/anti-ai-patterns.md`):**
7. No AI vocabulary clustering or inflated significance
8. No promotional tone upgrade beyond the source
9. No synonym cycling — consistent terminology
10. No source-language word order leaking through
11. No unnecessary bold or formatting artifacts (em dashes already covered in mechanical check A)
12. No Europeanized patterns (unnecessary connectives, passive voice, noun pile-up, over-nominalization, forced pronouns, cleft calques)

**D. Figurative language handling:**
13. Were all metaphors/idioms handled per the classify decision (interpret/substitute/retain)?
14. Do figurative expressions read naturally in the target language, not as literal calques?

## Translator's Notes Guidelines

When adding explanatory notes for terms, cultural references, or concepts that target readers may struggle with:

**Format**: `번역어（원어, 쉬운 설명）` or `번역어(원어)` for well-known terms that just need the original

**Calibration by audience**:
- **Technical readers**: Skip annotation on common tech terms (API, deploy, refactor). Only annotate domain-specific or coined terms
- **General readers**: More generous annotation. Explain jargon, cultural references, and domain concepts in plain language
- **Short texts** (< 5 sentences): Minimize — only annotate terms the target audience is unlikely to know

**Rules**:
- Annotate on first occurrence only — don't repeat the note
- Keep notes concise (aim for under 10 words)
- Explain *what it means*, not just provide the English original
- Don't annotate self-explanatory terms or widely recognized loanwords
- If a comprehension challenge was identified in Stage 1, use the pre-planned explanation

## Refined Mode (Long-form Content)

For publication-quality translation of long-form content (articles, documentation, essays), extend the standard 4-stage workflow with three additional passes. Use when explicitly requested or when the content demands high polish.

### When to use
- User explicitly requests "refined", "publication quality", or "정밀 번역"
- Important documents, official publications, marketing materials
- Content where naturalness and readability are critical

### Extended workflow

After completing Stage 1–4, continue with:

**Stage 5: Critical Review**

Re-read the translation against the source with fresh eyes. Produce a diagnostic review (no rewriting yet):

- **Accuracy**: Compare paragraph by paragraph — any facts, numbers, or qualifiers altered?
- **Europeanized language**: Scan for unnecessary connectives, passive voice, noun pile-up, over-nominalization, forced pronouns (see `resources/anti-ai-patterns.md`)
- **Figurative language fidelity**: Cross-check metaphor mapping from Stage 1 — were all handled per the classify decision? Any literal calques that sound unnatural?
- **Emotional fidelity**: Were subjective/emotional word choices flattened into neutral descriptions?
- **Tone drift**: Does the register stay consistent from start to finish, or does it shift mid-document (e.g., formal intro drifting into casual explanation)?
- **Expression & flow**: Flag sentences that still read like "translation-ese" — stiff phrasing, unnatural word order, awkward transitions
- **Translator's notes quality**: Too many? Too few? Accurate and concise?

**Stage 6: Revision**

Apply all findings from Stage 5 to produce a revised translation:
- Fix accuracy issues
- Rewrite Europeanized expressions into native patterns
- Re-interpret literally translated metaphors per the mapping
- Restore flattened emotional connotations
- Restructure stiff sentences for fluency
- Adjust translator's notes per review recommendations

**Stage 7: Polish**

Final pass for publication quality:
- Read as a standalone piece — does it flow as native content?
- Smooth remaining rough transitions between paragraphs
- Ensure narrative voice is consistent throughout
- Final scan for surviving literal metaphors or translation-ese
- Verify formatting preservation (headings, bold, links, code blocks)

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
| Multiple valid translations for a term | Pick the one most consistent with project's existing translations; note alternatives |
| Target language requires gendered forms | Follow source text intent; prefer gender-neutral forms when available in target language |
| Tone shifts across a long document | Re-read end-to-end after translating; normalize register to the dominant tone |

## How to Execute

Follow the translation method (Stage 1-4) step by step.
Before submitting, verify against `resources/translation-rubric.md` and `resources/anti-ai-patterns.md`.

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References

- Translation rubric: `resources/translation-rubric.md` — 5-criterion scoring (naturalness, accuracy, register, terminology, technical integrity)
- Anti-AI patterns: `resources/anti-ai-patterns.md` — AI output patterns + Europeanized/translation-ese patterns to avoid
- Context loading: `../_shared/core/context-loading.md`
- Quality principles: `../_shared/core/quality-principles.md`
