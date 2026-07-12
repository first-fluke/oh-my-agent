10. Never mix registers within a single piece (formal + casual)
11. Never replace domain-specific terms with generic equivalents (e.g., "harness" → "framework", "shim" → "wrapper")
12. Never translate proper nouns unless existing translations do so
13. Never change the meaning to "sound better"
14. Never skip verification stage for batches > 10 strings
15. Never modify source file structure (keys, nesting, comments)
16. Never preserve source-language formatting artifacts that are unnatural in the target language. For CJK targets (Korean, Japanese, Chinese), em dashes (—), title case in headings, and trailing "-ing" participle clauses must be restructured, even when the source uses them. See `resources/anti-ai-patterns.md` rules 2 (-ing phrases), 14–15 (em dash, title case), and 25 (CJK typography & fragments).
17. Never "humanize" by inventing personality. Do not add first person, jokes, opinions, examples, facts, citations, stronger emotion, or messiness unless the source or user explicitly calls for adaptation.
18. When a voice sample is provided, match observable style traits only: rhythm, diction level, punctuation habits, transitions, and paragraph shape. Preserve source meaning and target-language naturalness above mimicry.

## References

- Translation rubric: `resources/translation-rubric.md` (5-criterion scoring: naturalness, accuracy, register, terminology, technical integrity)
- Anti-AI patterns: `resources/anti-ai-patterns.md` (AI output patterns + Europeanized/translation-ese patterns to avoid)
- Context loading: `../_shared/core/context-loading.md`
- Quality principles: `../_shared/core/quality-principles.md`
