---
name: oma-translation
description: "Translate or revise localized UI strings and prose while preserving meaning, terminology, placeholders, and structure."
---

# Translation - Context-Aware Localization

## Scheduling

### Goal
Translate, review, or adapt multilingual content faithfully and naturally while preserving the
parts that must remain exact: placeholders, code, links, formatting, terminology, and file
structure.

### Intent signature
- Translate, localize, review a translation, adapt copy, or create a glossary/style guide.
- Update target-language files after the source changed.

### When to use
- UI strings, error messages, locale files, documentation, reports, marketing copy, and prose.
- Review of existing translations for accuracy, register, terminology, or naturalness.

### When NOT to use
- i18n infrastructure, locale registration, or key extraction -> use the relevant development skill.
- Date/pluralization APIs or other code-level localization -> use the owning code-domain skill.

### Expected inputs
- Source text, target language or locale, content type, and requested output mode.
- Existing locale files, glossary, surrounding context, and optional author sample.
- Placeholder and formatting constraints when the source is structured.

### Expected outputs
- Natural target-language text or evidence-backed review findings.
- Exact preservation of placeholders, code spans, links, headings, list structure, and locale keys.
- Translator notes only for meaningful ambiguity or necessary cultural explanation.

### Dependencies
- Target profile: `resources/lang/{code}.md`, if one exists.
- `resources/translation-rubric.md` for substantive content or review.
- `resources/anti-ai-patterns.md` when prose needs style review.
- Existing siblings and glossary when translating into a project.

### Control-flow features
- Branches by UI batch versus prose, profile availability, locale variant, ambiguity, and review mode.
- Loads only the target profile and references required for the content type.
- Edits files only when the user asked for file changes.

## Structural Flow

### Entry
1. Identify source, target locale, content type, and whether this is translate, review, or diff-sync.
2. Preserve exact tokens first: placeholders, code, URLs, keys, and structural markers.
3. Load the target profile if available; read sibling translations when the target is in a project.

### Scenes
1. **PREPARE**: Resolve locale, output mode, target audience, and protected syntax.
2. **ACQUIRE**: Read the target profile, relevant siblings, glossary, and source context. For prose or review, load the rubric; load anti-AI patterns only when style review is needed.
3. **REASON**: Determine meaning, register, terminology, cultural references, and any ambiguity. Decide whether an idiom should be interpreted, substituted, or retained.
4. **ACT**: Write natural target-language text. Match established project patterns without adding meaning, opinion, or personality.
5. **VERIFY**: Check protected syntax and structure. For substantive text, check meaning, terminology, register, and target-language naturalness against the rubric.
6. **FINALIZE**: Return the requested text, patch, or review with only supported findings.

### Transitions
- A profile exists -> load it; its target-language rules take precedence over shared guidance.
- A locale variant is required -> resolve it before drafting.
- No profile exists -> use shared guidance and note that limit once; do not borrow another language's rules.
- A short independent UI string with established siblings -> use protected-syntax and sibling checks; the full prose review is optional.
- Long prose, documentation, marketing copy, mixed tables/code, or review mode -> use the rubric.
- Ambiguous meaning that changes the result -> ask one targeted question or flag the choice.
- Diff-sync -> modify only source-touched equivalents, located by headings and surrounding context, not line number.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Missing target context | Use the source register and state the assumption, unless the ambiguity changes meaning |
| Conflicting literal wording and project convention | Follow the established target convention and explain a material difference |
| Placeholder or structure mismatch | Revise before emitting or applying a patch |
| Missing profile | Use shared guidance and identify the coverage limit once |
| Unclear cultural reference | Add a concise note only when the target audience needs it |

### Exit
- Success: the text is faithful, natural, structurally safe, and checked in proportion to content risk.
- Partial: unresolved ambiguity or missing context is stated without inventing an answer.

### Language profile loading

Resolve the BCP 47 primary subtag and load one matching profile when present:

| Target | Profile |
|---|---|
| Korean | `resources/lang/ko.md` |
| Japanese | `resources/lang/ja.md` |
| Chinese | `resources/lang/zh.md`; resolve the declared variant |
| English | `resources/lang/en.md` |
| Other | no profile; use shared guidance |

Profiles define typography, register, and target-language checks. Shared guidance explains common
risks. A profile wins if they conflict. Add a new profile from `resources/lang/_template.md` only
when the task is to extend this skill.

### Translation method

1. Read for meaning, intended effect, domain terms, and protected syntax. Identify figurative
   wording as **interpret**, **substitute**, or **retain**. Do not add a new metaphor or remove an
   intentional one without a reason.
2. Choose register from the source, target audience, and sibling translations. Apply
   `translation_voice` from `.agents/oma-config.yaml` only as a rhythm/formality preference:
   `formal`, `balanced` (default), or `interpreter`. It never overrides meaning or target norms.
3. Reconstruct in the target language. Change word order, split or merge sentences, and omit
   implied subjects only when the target language calls for it.
4. Preserve author style only where it belongs: prose, dialogue, adaptation, or explicitly
   user-authored documentation. Match observable rhythm and diction, never add facts, stance,
   jokes, first person, or stronger emotion.

### Verification

Always check:

- Every placeholder, code span, identifier, URL, and locale key is unchanged.
- Headings, links, table rows, list nesting, and code blocks retain their structure.
- The target follows its profile's typography and register rules.
- Existing siblings are matched when they establish terminology or UI style.

For substantive content and review mode, also check the rubric: meaning, naturalness,
terminology, register, cultural fit, and emotional force. Use anti-AI patterns as a diagnostic,
not a demand to make prose decorative or to remove intentional source style.

### Review mode

Review from evidence, not from an expectation that every draft is machine-translated. Record zero
findings when no material defect is confirmed. Separate:

- **Accuracy or safety defects**: changed meaning, broken placeholder, incorrect term, or wrong register.
- **Supported style findings**: a concrete target-language issue with a reason and proposed fix.
- **Preferences**: optional alternatives that do not make the existing translation wrong.

Do not rewrite a sound translation merely to produce findings.

### Batch and diff-sync work

For batches, read the complete set first, translate values only, and maintain one terminology and
register decision. Verify placeholders and key structure across the set.

For diff-sync, map each source hunk by heading and surrounding context. Touch only the affected
target section; leave unrelated text byte-identical. State updated sections, skipped cosmetic
hunks, and material terminology decisions.

### Output formats

For a single text, present the translation and brief notes for ambiguities or adaptations. For
files, preserve the input format and modify only requested values. For review, show the original,
the suggested revision only when warranted, and the evidence for each finding.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|---|---|---|
| Resolve locale and mode | `SELECT` | User request and file context |
| Read profile and siblings conditionally | `READ` | Target profile, glossary, nearby translations |
| Protect syntax and structure | `VALIDATE` | Source tokens and structural markers |
| Infer meaning and register | `INFER` | Source, audience, project convention |
| Translate or revise | `WRITE` | Target text or requested file patch |
| Review substantive content | `VALIDATE` | Rubric and concrete findings |
| Report result and limits | `NOTIFY` | Translation, patch, or review |

### Tools and instruments
- Native search/read for local source and sibling translations.
- Configured `code_intelligence` capability when available for code-context navigation; native
  search/read when it is unavailable or times out.
- Target profile, rubric, anti-AI patterns, and language-template resources as selected above.

### Canonical workflow path
1. Resolve target locale and protect exact syntax.
2. Load the one applicable language profile and relevant siblings; load rubric/style resources only
   for substantive content or review.
3. Infer meaning, register, terminology, and figurative-language handling.
4. Draft in natural target order and project style.
5. Verify exact syntax and structure, then review substantive content against the rubric.
6. Emit the requested translation, patch, or evidence-backed review. State a missing-profile or
   context limitation when material.

### Resource scope
| Scope | Resource target |
|---|---|
| `LOCAL_FS` | Source/target files, glossaries, language profiles |
| `CODEBASE` | Sibling translations and code context |
| `PROCESS` | Native search and syntax checks |
| `MEMORY` | Locale, terminology, register, protected syntax, unresolved ambiguity |

### Effects and side effects
- Produces translated text or review findings.
- Changes locale/docs files only when explicitly requested.
- Retains source structure, identifiers, and placeholders.

### Guardrails
1. Preserve meaning, protected syntax, and file structure before stylistic preference.
2. Do not invent facts, opinions, emotional emphasis, examples, citations, or personality.
3. Do not use a different language's profile as a substitute.
4. Do not change untouched sections during diff-sync.
5. Do not claim completion of a check that the available source cannot support.

## References

- Translation rubric: `resources/translation-rubric.md` (load for substantive content or review)
- Style diagnostics: `resources/anti-ai-patterns.md` (load when prose style needs review)
- Target profiles: `resources/lang/{ko,ja,zh,en}.md` (load one matching profile)
- Profile template: `resources/lang/_template.md` (only when adding a profile)
- Shared context loading: `../_shared/core/context-loading.md`
- Shared quality principles: `../_shared/core/quality-principles.md`