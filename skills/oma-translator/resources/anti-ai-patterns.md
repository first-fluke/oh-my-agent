# Anti-AI Writing Patterns for Translation

Translated text should read like a human wrote it in the target language from
scratch. These patterns are common in AI-generated or AI-translated text.
Avoid all of them.

**This file is language-neutral.** It defines the pattern taxonomy and
illustrates it with source-side (English) examples. How each pattern manifests
in a specific target language, and what the fix looks like there, lives in
`lang/{code}.md`. Load the shared file and the profile for your target language
together; neither is sufficient alone.

Rule numbers are stable. Language profiles cite them (`Shared 21`) and add their
own numbered rules under a language prefix (`KO-2`, `JA-4`, `ZH-1`, `EN-7`).

---

## Content Patterns

### 1. Inflated Significance

**Avoid:** *stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal role, underscores/highlights its importance, reflects broader, symbolizing its enduring, setting the stage for, key turning point, indelible mark*

AI inflates the importance of mundane subjects. In translation, this manifests as
adding emphasis that was not in the source.

- Do not add emphasis words where the source does not emphasize
- Do not turn a simple description into a grand statement
- Translate the weight of the original, not more

### 2. Superficial Analysis via -ing Phrases

**Avoid:** *highlighting/underscoring/emphasizing ..., ensuring ..., reflecting/symbolizing ..., contributing to ..., fostering ...*

AI appends shallow analysis as participle phrases. Verb-final languages have no
natural slot for a trailing participle, so a literal rendering produces an
awkward hanging clause. Unpack the phrase into a clause or a separate sentence,
preserving the meaning.

Source: "The update improves performance, **ensuring a seamless experience**"

### 3. Promotional Tone

**Avoid:** *boasts a, vibrant, rich (figurative), profound, enhancing, showcasing, exemplifies, commitment to, groundbreaking, renowned*

AI defaults to positive, promotional language. Translation must match the
source's actual tone. If the source is neutral, the translation is neutral.

- Do not upgrade "good" to "excellent" during translation
- Do not add marketing flair that was not there

### 4. Vague Attribution

**Avoid:** *Experts argue, Some critics argue, Industry reports suggest, Observers have cited*

If the source has a specific attribution, keep it specific. If the source is
vague, do not make it vaguer.

### 4a. Notability and Media Padding

**Avoid:** unsupported authority padding such as *covered by major media*, *widely recognized*, *leading expert*, *active social presence*, or long publication-name lists that do not add a concrete claim.

Do not make a weak source sound more notable than it is. If the source lists
authority markers without substance, preserve the factual claim plainly or flag
that the sentence needs a source.

### 4b. Formulaic Challenges/Future and Generic Conclusions

**Avoid:** formulaic endings such as *Despite these challenges*, *future outlook*, *exciting times ahead*, *the future looks bright*, *major step in the right direction*, or *continues its journey toward excellence*.

These closers sound assembled. Translate the actual next step, risk, or
conclusion instead. If the source itself is generic, keep it restrained rather
than making it more polished.

---

## Language Patterns

### 5. AI Vocabulary Overuse

Words that appear far more in AI text than in human text. Avoid overusing them
in translated output.

**English:** *Additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate, key (adjective), landscape (abstract), leverage, pivotal, robust, seamless, showcase, streamline, tapestry (abstract), testament, underscore (verb), utilize, valuable, vibrant*

Every target language has its own overused set, and it does not map
word-for-word from this list. See the "Shared 5" table in your language profile.

### 6. Copula Avoidance

AI replaces simple "is/are/has" with fancier alternatives:

- "serves as a" → just "is a"
- "boasts/features/offers" → just "has"

In translation, use the simplest natural equivalent in the target language.

### 7. Rule of Three

AI overuses triple constructions: "adjective, adjective, and adjective."

Source: "a fast, reliable, and intuitive experience"

If the source uses the rule of three, you may compress or keep it. Follow what
sounds natural in the target language; most languages read a mechanical triple
as list-like rather than emphatic.

### 8. Elegant Variation (Synonym Cycling)

AI avoids repeating words by cycling synonyms: user → participant → key player →
stakeholder.

In translation, **consistent terminology matters more than variety**. Pick one
term per concept and use it every time.

### 9. Negative Parallelisms

AI overuses "Not only ... but also ..." and "It's not just about X, it's about Y."

These structures feel unnatural when calqued. Restructure, vary the construction,
or simply state both facts.

### 10. Hyphenated Compound Adjectives

**Common offenders:** *AI-powered, data-driven, cloud-based, user-friendly, enterprise-grade, production-ready, privacy-focused, community-driven, developer-friendly, mobile-first, cross-platform, open-source, real-time, end-to-end, high-performance, next-generation*

Source: "an AI-powered, cloud-based, enterprise-grade solution"

Rules:

- One per sentence is acceptable; two or more stacked is a red flag
- Unpack the compound into a natural clause rather than calquing the hyphenation
- Not every hyphenated adjective needs to survive translation; drop if redundant

### 11. Adjective-Noun Compound Stacking

**English:** *seamless integration, robust solution, intuitive design, comprehensive overview, scalable architecture, streamlined workflow, cutting-edge technology, holistic approach*

These compounds stack up and create a dense, unnatural rhythm.

Rules:

- Break compounds into simpler, spoken-style expressions
- If a compound feels like it came from a press release, rewrite it
- One compound per sentence is fine; three in a row is a red flag

### 12. False Ranges

AI uses "from X to Y" with loosely related endpoints.

- Bad: "from cutting-edge technology to heartfelt stories"

These are meaningless in any language. Drop or restructure.

---

## Style Patterns

### 13. Boldface Overuse

AI bolds key terms mechanically, especially in lists: "**Feature Name**: description."

- Do not add bold that was not in the source
- Do not format lists as "**bold header**: description" unless the source does
- Bold density conventions differ by language; if the source language bolds more
  freely than the target's publishing norm, drop the excess

### 14. Em Dash Overuse

AI uses em dashes (`—`) where commas, colons, parentheses, or a sentence break
are more natural.

Whether the em dash is available at all depends on the target. Some languages
have no such mark in normal prose, some use a different glyph, and some accept it
freely. Your language profile states which case applies. In every case, one per
paragraph is the ceiling, and it must never substitute for deciding the logical
relationship between the two halves.

### 14a. Mechanical Punctuation Swap (Anti-Pattern)

When the source uses an `X — Y and Z` em-dash pattern and the target language
does not use an em dash naturally in that position, **AI tends to swap the em
dash for `:` / `(` / parens and call it done**. This is not translation; it is
punctuation substitution that preserves source-language structure.

The em dash separator implies a definitional `definiendum — definiens` structure
that may map to:

- Coordinated noun phrases joined by the target's own coordinator
- Relative clauses, pre-nominal or post-nominal per the target's word order
- Separate sentences
- A different grammatical pivot entirely

Run the **Sibling-pattern match** check (Stage 4 mechanical) before emitting: if
siblings coordinate with commas and your draft uses `:`, BLOCK and revise.

### 15. Title Case in Headings

AI capitalizes all main words in headings. This is an English convention. Do not
mimic it in languages that have no case distinction or that use sentence case.
Even for English targets, do not introduce title case where siblings use
sentence case.

### 16. Unnecessary Tables

AI creates small tables that would be better as prose. Do not introduce tabular
format that was not in the source.

### 16a. Inline-Header Vertical Lists

AI often writes bullets as bold mini-headings followed by colons. Do not
introduce this style unless the source already uses it or the target format
requires it.

- Bad: `- **Performance:** Load times were improved.`
- Better: `Load times improved.` or a normal bullet matching sibling style

### 16b. Emoji Decoration

Do not add emoji to headings, bullets, or status labels. Preserve emoji only when
they are part of the source content or an established UI convention in the target
file.

### 16c. Fragmented Heading Warmups

AI often places a heading, then a one-line paragraph that merely restates the
heading before the real content starts. Remove or rewrite these warmups in
adaptation and review mode. In strict translation mode, preserve structure but do
not add a new warmup sentence.

---

## Communication Artifacts

### 17. Chatbot Phrases

**Never include in translated output:**

- "I hope this helps"
- "Let me know if you need anything else"
- "Here is a breakdown of..."
- "Of course!", "Certainly!"

These are chatbot artifacts, not content.

### 18. Hedging and Disclaimers

**Avoid:** *it's important to note, worth noting, it's crucial to remember, may vary*

If the source does not hedge, the translation does not either.

### 18a. Signposting and Announcements

**Avoid:** *let's dive in*, *let's explore*, *let's break this down*, *here's what you need to know*, *now let's look at*, *without further ado*.

These phrases announce the writing instead of doing the writing. Usually drop
them or replace them with the actual claim.

### 18b. Persuasive-Authority Tropes

**Avoid:** *the real question is*, *at its core*, *in reality*, *what really matters*, *fundamentally*, *the heart of the matter*, *the deeper issue*.

Use these only if the source author genuinely takes that rhetorical stance.
Otherwise, translate the concrete claim directly.

### 18c. Knowledge-Cutoff and Availability Disclaimers

**Avoid:** *as of my last update*, *based on available information*, *specific details are limited*, *readily available sources*.

These are usually chatbot artifacts. Do not preserve them unless the source text
is explicitly about uncertainty or source limitations.

---

## Filler and Rhythm Patterns

### 18d. Filler Phrase Compression

Compress empty setup phrases when reviewing or adapting prose:

- `in order to` → `to`
- `due to the fact that` → `because`
- `at this point in time` → `now`
- `has the ability to` → `can`
- `it is important to note that` → usually delete

In strict translation mode, preserve the author's intended emphasis but do not
add filler.

### 18e. Sterile Rhythm

For prose, marketing, blogs, interviews, and adaptation tasks, scan for writing
that is technically correct but too evenly shaped: same-length sentences,
identical paragraph arcs, neutral summary without a stance where the genre
expects one, or transitions that feel like a template.

Fix by matching the source or author voice: vary sentence rhythm, keep concrete
details, and let the target language use its natural cadence. Do not add first
person, opinions, humor, or stronger emotion unless the source or the user asks
for adaptation.

---

## Europeanized / Translation-ese Patterns

Patterns where the target text mimics source-language (typically English) grammar
instead of following native structure.

The categories below are shared. **Every example and every fix is
language-specific**, so the working version of each rule lives in
`lang/{code}.md` under "Localizations of shared rules". A profile may also
declare that a category does not apply to its language.

### 19. Unnecessary Connectives

AI over-inserts logical connectives (*therefore, however, additionally,
furthermore, moreover*) where context already implies the relationship. If the
previous sentence already carries the logic, drop the connective and let the
clause boundary do the work.

### 20. Passive Voice Abuse

English uses the passive far more than most target languages. Restructure to
active with an explicit agent unless the target genuinely prefers the passive in
that position, or the agent is unknown or deliberately suppressed.

### 21. Noun Pile-up (Long Modifier Chains)

English stacks modifiers before nouns. Most languages read better when the chain
is broken into shorter clauses.

Rule: 3 or more stacked modifiers before a noun → break into clauses. Some
languages need a tighter threshold; see the profile.

### 22. Over-nominalization

English uses abstract nouns plus a light verb ("conduct an analysis") where most
languages prefer a single verb ("analyze"). Watch for light-verb constructions in
the target and collapse them.

### 23. Awkward Pronoun Insertion

English requires explicit subjects. Pro-drop languages prefer omission when the
subject is clear from context, so calqued pronouns read as stammering.

Rule: if the subject has not changed and is clear from context, omit it. For
targets that are **not** pro-drop, the inverse applies: supply the subject the
source omitted rather than leaving a dangling clause.

### 24. Cleft Sentence Calques

English "It is X that ..." and "What matters is X" structures should not be
calqued. Most languages express the same emphasis with word order or a focus
particle.

### 25. Target-Language Typography and Fragments

Sentence-completion requirements, fragment tolerance by position, quotation
marks, dash glyphs, spacing between scripts, counters, and date and number
formats are entirely language-specific.

There is no shared rule here. See the typography and sentence-completion sections
of `lang/{code}.md`.

---

## Self-Check (shared)

Run this list first, then the self-check in your language profile. Neither
replaces the other.

- [ ] No AI vocabulary clustering (5+ flagged words in one paragraph)
- [ ] No inflated significance added beyond the source
- [ ] No promotional tone upgrade
- [ ] Consistent terminology, no synonym cycling
- [ ] No source-language word order leaking through
- [ ] No unnecessary bold or formatting artifacts
- [ ] No chatbot communication artifacts
- [ ] No signposting phrases such as "let's dive in" unless the source uses them
- [ ] No persuasive-authority tropes unless the source voice requires them
- [ ] No generic positive conclusions or formulaic challenge/future sections
- [ ] No unsupported media or notability padding
- [ ] No emoji decoration or inline-header vertical lists introduced by translation
- [ ] No filler phrases that can be compressed without changing meaning
- [ ] For prose and adaptation tasks, rhythm matches the source or the provided
      voice sample without invented personality
- [ ] No unnecessary connectives where context already implies the relationship
- [ ] No passive voice where the target prefers active
- [ ] No long modifier chains stacked before a noun
- [ ] No over-nominalization where the target has a plain verb
- [ ] Pronouns handled per the target's pro-drop behavior
- [ ] No cleft sentence calques
- [ ] Language profile self-check completed for the target language
