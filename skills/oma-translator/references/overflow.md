- Produces translated text or translation review.
- May modify locale/docs files only when requested.
- Preserves source structure and placeholders.

### Guardrails

1. Scan existing locale files before translating to align with project conventions
2. Preserve placeholders and interpolation syntax
3. Translate meaning, not words
4. Preserve emotional connotations: translate the feeling, not just the dictionary meaning (e.g., "alarming" carries urgency/concern, not merely "surprising")
5. Match register consistently throughout a single piece
6. Split, merge, or restructure sentences for target language naturalness
7. Flag ambiguous source text rather than guessing
8. Preserve domain terminology: if a term has established meaning in the field (e.g., harness, scaffold, shim, polyfill, middleware), keep it even if a "simpler" native word exists
9. Never produce literal word-for-word translations
10. Never mix registers within a single piece (formal + casual)
11. Never replace domain-specific terms with generic equivalents (e.g., "harness" → "framework", "shim" → "wrapper")
12. Never translate proper nouns unless existing translations do so
13. Never change the meaning to "sound better"
14. Never skip verification stage for batches > 10 strings
15. Never modify source file structure (keys, nesting, comments)
16. Never preserve source-language formatting artifacts that are unnatural in the target language. See `resources/anti-ai-patterns.md` rules `2` (-ing phrases), `14`–`15` (em dash, title case), and `25` (typography, which defers entirely to the language profile). For CJK targets, em dashes (`—`), title case in headings, and trailing "-ing" participle clauses must be restructured even when the source uses them; the exact typography rules are in `resources/lang/{code}.md`.
17. Never "humanize" by inventing personality. Do not add first person, jokes, opinions, examples, facts, citations, stronger emotion, or messiness unless the source or user explicitly calls for adaptation.
18. When a voice sample is provided, match observable style traits only: rhythm, diction level, punctuation habits, transitions, and paragraph shape. Preserve source meaning and target-language naturalness above mimicry.
19. Never translate into a language whose profile exists without reading it, and never substitute a different language's profile when none exists for the target. Fall back to the shared files and say so once in the output notes.

## References

Shared, language-neutral:

- Translation rubric: `resources/translation-rubric.md` (5-criterion scoring: naturalness, accuracy, register, terminology, technical integrity)
- Anti-AI patterns: `resources/anti-ai-patterns.md` (AI writing pattern taxonomy, rules `1`–`25`)

Per target language (load the one matching the target):

- Korean: `resources/lang/ko.md`
- Japanese: `resources/lang/ja.md`
- Chinese: `resources/lang/zh.md`
- English: `resources/lang/en.md`
- New profile skeleton: `resources/lang/_template.md`
- Context loading: `../_shared/core/context-loading.md`
- Quality principles: `../_shared/core/quality-principles.md`
