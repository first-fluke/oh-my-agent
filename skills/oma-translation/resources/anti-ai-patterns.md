# Translation prose diagnostics

Load `../../_shared/core/anti-ai-prose.md` and the target `lang/{code}.md` alongside
this file when reviewing prose style. Common pattern definitions live in the shared
resource; this file owns fidelity exceptions and translation-specific rules.

A target profile takes precedence for target-language usage; do not borrow a
different language's rules.

## Fidelity exceptions

- Preserve meaning, claims, named sources, qualifiers, emotional force, terminology,
  placeholders, code, links, locale keys, and required document structure.
- Do not add praise, authority, certainty, opinions, jokes, first person, examples,
  numbers, or citations. A portability finding is not permission to invent specifics.
- Do not remove source content merely because a shared diagnostic flags it. In strict
  translation, preserve the claim and intended emphasis in natural target wording;
  flag a source problem separately when material. Deletion or reorganization belongs
  to authorized adaptation or revision, not automatic translation cleanup.
- Classify source figurative language as interpret, substitute,
  or retain. Do not add mannered metaphors, and do not flatten intentional source voice.
- Retain an intentional ending, uncertainty, research
  question, or rhetorical effect when fidelity requires it. Do not intensify it.
- Preserve headings, lists, tables, formatting, and quoted chatbot
  language when they are source content. Do not introduce decorative structure.
- Use the target profile's vocabulary examples. Five or more flagged
  terms in one paragraph prompt contextual review, not automatic substitutions.
- Follow the target profile's dash conventions with at most one per
  paragraph. Reconstruct the clause instead of swapping punctuation;
  compare sibling wording before deciding the target syntax.
- Preserve source cadence where natural. Do not import academic
  sentence-length targets, first-person bans, or paragraph templates.

## Europeanized / Translation-ese Patterns

Patterns where the target text mimics source-language (typically English) grammar
instead of following native structure.

The categories below are shared. **Every example and every fix is
language-specific**, so the working version of each rule lives in
`lang/{code}.md` under "Localizations of shared rules". A profile may also
declare that a category does not apply to its language.

### Unnecessary Connectives

AI over-inserts logical connectives (*therefore, however, additionally,
furthermore, moreover*) where context already implies the relationship. If the
previous sentence already carries the logic, drop the connective and let the
clause boundary do the work.

### Passive Voice Abuse

English uses the passive far more than most target languages. Restructure to
active with an explicit agent unless the target genuinely prefers the passive in
that position, or the agent is unknown or deliberately suppressed.

### Noun Pile-up (Long Modifier Chains)

English stacks modifiers before nouns. Most languages read better when the chain
is broken into shorter clauses.

Rule: 3 or more stacked modifiers before a noun → break into clauses. Some
languages need a tighter threshold; see the profile.

### Over-nominalization

English uses abstract nouns plus a light verb ("conduct an analysis") where most
languages prefer a single verb ("analyze"). Watch for light-verb constructions in
the target and collapse them.

### Awkward Pronoun Insertion

English requires explicit subjects. Pro-drop languages prefer omission when the
subject is clear from context, so calqued pronouns read as stammering.

Rule: if the subject has not changed and is clear from context, omit it. For
targets that are **not** pro-drop, the inverse applies: supply the subject the
source omitted rather than leaving a dangling clause.

### Cleft Sentence Calques

English "It is X that ..." and "What matters is X" structures should not be
calqued. Most languages express the same emphasis with word order or a focus
particle.

### Target-Language Typography and Fragments

Sentence-completion requirements, fragment tolerance by position, quotation
marks, dash glyphs, spacing between scripts, counters, and date and number
formats are entirely language-specific.

There is no shared rule here. See the typography and sentence-completion sections
of `lang/{code}.md`.

---

## Translation checks

Check protected syntax and document structure first. Then use the shared diagnostics
with the fidelity exceptions above, the translation rubric for substantive text,
and the target profile's grammar and typography checks. Report only supported accuracy or
style defects, separate optional preferences, and accept zero findings.
