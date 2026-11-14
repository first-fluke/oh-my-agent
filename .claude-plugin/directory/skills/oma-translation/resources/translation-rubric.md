# Translation Quality Rubric

Five criteria for substantive content and review. Each has a question and the
red flags that count as findings. No score is produced; report confirmed
defects with evidence and accept zero findings.

**This file is language-neutral.** Criterion 1 (Naturalness) and criterion 3
(Register) can only be judged against the target language's own conventions, so
read them with `lang/{code}.md` open. A draft that shows no red flag here and
fails its language profile's self-check is not a passing translation.

## Criteria

### 1. Naturalness
Does it read like it was originally written in the target language?

Red flags:
- Source language word order leaking through
- Unnatural particles or prepositions
- Overly long sentences that should be split
- Pronouns handled against the target's pro-drop behavior
- Europeanized patterns: unnecessary connectives, passive voice abuse, noun pile-up, over-nominalization, cleft sentence calques
- Any rule in the target's language profile marked as a block-level failure

### 2. Accuracy
Is the meaning fully preserved?

Red flags:
- Added meaning not in source
- Omitted important qualifiers
- Reversed logic (negation errors)
- Hallucinated content
- Emotional connotations flattened (e.g., "alarming" rendered as a neutral "surprising" rather than something that carries concern)
- Figurative language translated literally when the image doesn't work in target language

### 3. Register Consistency
Does the tone match the configured register throughout?

The register system itself is language-specific (sentence endings, T-V
distinction, honorific paradigms, or none of these). Read the "Register" section
of `lang/{code}.md` before judging this criterion.

Red flags:
- Register drift between the opening and the closing of a document
- Mixing two register systems that the target treats as mutually exclusive
- Formal vocabulary in casual context or vice versa
- Honorific or politeness level that the source does not support

### 4. Terminology
Are domain terms consistent and correct?

Red flags:
- Same source term translated differently in same batch
- Glossary term overridden without justification
- Technical term translated when it should stay in English

### 5. Technical Integrity
Are placeholders, formatting, and structure preserved?

Red flags:
- Modified or deleted `{variables}`
- Broken HTML/markdown tags
- Changed JSON/YAML key names
- Added or removed line breaks that affect rendering

Translator's notes, when present, are concise, accurate, and calibrated to the
target audience.
