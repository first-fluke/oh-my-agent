# `<Language>` Target-Language Profile (`<code>`)

Copy this file to `<code>.md` (BCP 47 primary subtag, e.g. `de.md`, `pt.md`,
`vi.md`) to add a profile. Register the code in the routing table in
`../../SKILL.md` under "Language Profile Loading".

A profile exists to hold what the shared files must not: anything that is true
of one target language and false of another. If a rule would apply equally to
every target, it belongs in `../anti-ai-patterns.md` instead.

Delete every section you have nothing grounded to say about. An empty profile
is better than an invented one, because a wrong rule is followed as confidently
as a right one.

---

## Variant resolution

Only if the language has variants that change script, vocabulary, or
orthography (`pt-BR` vs `pt-PT`, `zh-CN` vs `zh-TW`, `es-ES` vs `es-419`).
State the resolution order and the default, and say what must never be mixed.

## Register

How formality is encoded in this language, and how it maps to `translation_voice`
(`formal` / `balanced` / `interpreter`) from `.agents/oma-config.yaml`.

Cover whatever the language actually forces a choice on: sentence endings,
T-V distinction (`du`/`Sie`, `tu`/`vous`, `tú`/`usted`), honorifics, or
formal/informal verb paradigms. State that the choice is made once per document
and never drifts, and name the exempt positions (headings, table cells).

## `<CODE>`-only rules

Number them `<CODE>-1`, `<CODE>-2`, ... so the self-check and `SKILL.md` can
cite them without colliding with shared rule numbers.

Typical categories worth a rule, when the language has one:

- Grammatical agreement the source language lacks (gender, case, number,
  animacy, definiteness)
- Word order constraints (V2, verb-final, clitic placement)
- Constructions that only appear as calques from English
- Typography: quotation marks, dashes, decimal and thousands separators,
  spacing before punctuation, capitalization of headings and nouns
- Date, number, and unit formats
- Orthography standards and the loanword forms machine output gets wrong

Give every rule at least one `bad → good` pair. The examples do more work than
the rule text.

## Localizations of shared rules

Only the shared rules that manifest distinctly in this language. Cite the shared
number and show the language's version.

Commonly needed: `2` (participle phrases), `5` (AI vocabulary equivalents),
`7` (rule of three), `8` (synonym cycling), `10`/`11` (compound stacking),
`14`/`14a` (dash handling), `19`–`24` (translation-ese).

Say explicitly when a shared rule **does not** apply. `en.md` does this for the
em-dash rule, which exists only for CJK targets. Silence gets read as agreement.

## `<Language>` self-check

A flat checklist, one line per rule, each citing its rule ID. It runs after the
shared self-check, before emitting.

## References

Cite sources for adopted rules, with the license when the source is a repository.
