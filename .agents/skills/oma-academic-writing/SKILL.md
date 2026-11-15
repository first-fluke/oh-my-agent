---
name: oma-academic-writing
description: "Draft and revise academic prose against a rubric, evidence, and citation requirements. Use for essays, reports, literature reviews, or academic style audits."
---

# Academic Writing: Publication-Grade English Prose

## Scheduling

### Goal
Produce, revise, and audit publication-grade academic English prose: clear sentence structure, accurate verbs, hedging matched to evidence, no unresolved prose-audit finding, and every claim mapped to verifiable evidence.

### Intent signature
- "draft this abstract / essay / report / executive summary / conclusion / literature review"
- "rewrite this paragraph in academic English"
- "polish this draft to top-band quality" / "revise to match the rubric"
- "run an anti-AI audit on this prose"
- "check sentence structure variety" / "fix monotonous rhythm"
- "the prose sounds AI-generated, make it pass"
- "verify claims against evidence" / "reverse outline this section"

### When to use
- Drafting or revising academic reports, essays, or analysis sections
- Writing research abstracts, executive summaries, conclusions, or literature reviews
- Rewriting AI-sounding prose into natural academic English
- Polishing draft text to achieve top-band rubric quality (HD, A, top-band, etc.)
- Reviewing prose for sentence variety, verb quality, hedging, and anti-AI compliance
- Any task requiring formal academic English output bound by a rubric

### When NOT to use
- Translation tasks → use `oma-translation`
- Source discovery, citation gathering, or scholarly literature search → use `oma-scholar`
- Code documentation, README, or API reference text → use the relevant domain skill (`oma-frontend`, `oma-backend`, `oma-mobile`, `oma-db`, etc.)
- Informal communication, chat, or marketing copy → no skill needed
- Non-English academic writing → call `oma-translation` for the target language after drafting in English

### Expected inputs
- `mode`: one of `draft` | `revise` | `review`
- Optional `rubric_or_constraint`: assignment brief, rubric file, or word/structure limits (path or inline text); draft-only revision/review does not require a rubric
- `existing_draft`: prior text to revise or audit (path or inline text); required for `revise` and `review`
- `source_data`: available evidence, figures, citations the writer may use
- `target_register`: defaults to formal academic English with American spelling (en-US)

### Expected outputs
- `draft` mode: section heading + drafted prose + Writing Notes (sentence mix, key verbs, anti-AI flags resolved, paragraph lengths) + Claim-Evidence Map
- `revise` mode: original block, revised block, list of specific changes (verb upgrades, structure variation, anti-AI fixes)
- `review` mode: PASS/FAIL Compliance Report across Sentence Structure, Verb Quality, Anti-AI, Specificity, Hedging, Paragraph Clarity, Rhythm/Burstiness, Claim-Evidence Alignment, plus recommended fixes

### Dependencies
- `../_shared/core/anti-ai-prose.md` and `resources/anti-ai-checklist.md`: common diagnostics and academic constraints; load together for prose audits
- `resources/sentence-structure-reference.md`: contextual rhythm guidance, sentence openers, paragraph cohesion model
- `resources/academic-verb-guide.md`: meaning- and evidence-based verb guidance
- `resources/hedging-guide.md`: calibrated certainty expressions matched to evidence strength
- `../_shared/core/context-loading.md`: task-relevant resource loading
- `../_shared/core/quality-principles.md`: shared quality bar

## Structural Flow

### Transitions
- If a rubric line is ambiguous → quote it back to the user and ask for interpretation; do not infer combined rules.
- If a claim cannot be supported by available evidence → weaken with hedging or remove; if a citation gap is structural, NOTIFY `oma-scholar`.
- If the target language is non-English → finish the English pass, then hand off to `oma-translation`.
- If the same anti-AI flag survives one fix attempt → restructure the surrounding two sentences instead of word-substitution alone.
- If an output mode mismatch is detected (e.g., user asked for review but supplied a fresh prompt) → confirm the mode before producing output.

### Failure and recovery
| Failure | Recovery |
|---------|----------|
| Word count over / under target | Cut filler adverbs and redundant qualifiers, or expand with supporting evidence; re-run audit |
| Repeated syntax obscures the argument | Revise the affected sentences for clarity using shared rhythm guidance; preserve clear sentences |
| Rubric requirement unclear | Quote exact rubric text and ask user; do not combine rules |
| Claim lacks evidence | Add citation, hedge to match weaker evidence, or remove the claim entirely |
| Hedging miscalibrated | Replace double hedges; align hedge strength with `resources/hedging-guide.md` evidence-level table |
| Verb is vague | Name the action, method, result, or evidence only if that makes the claim clearer |
| Repeated paragraph structure hinders progression | Reorganize the affected argument without inserting a paragraph solely to vary length |

### Exit
- Success: the prose audit leaves no unresolved supported finding, the Claim-Evidence Map has no unsupported entries, word count complies, and the mode-specific output format is fully populated.
- Partial success: emit prose with explicit `needs evidence` / `pending citation` markers and report which audit items remain at risk; flag handoff candidates.
- Failure: report a material blocker such as required source data being unavailable or contradictory supplied constraints. The absence of an optional rubric alone does not block draft-only revision/review.

## Logical Operations

### Canonical workflow path
1. **READ**: identify the mode (`draft`, `revise`, `review`); a rubric / constraint or an existing draft (or both) must be provided. Read the existing draft in full when revising or reviewing; when drafting, confirm the available source data and citations. Read any supplied rubric; quote actual assignment constraints and pin their requirements. If no rubric is supplied, use the requested revision/review scope without inventing constraints. If the final deliverable is non-English, confirm the user agrees to a downstream `oma-translation` handoff.
2. **PLAN** each paragraph as Topic-Support-Conclude (the paragraph cohesion model in `resources/sentence-structure-reference.md`); identify where evidence strength or a vague claim calls for a more precise verb or hedge. Read `resources/sentence-structure-reference.md`, `resources/academic-verb-guide.md`, and `resources/hedging-guide.md` only for the patterns relevant to the current section. For research abstracts, use `resources/abstract-guide.md` to select motivation, approach, measured results, and a supported contribution within the venue's format.
3. **DRAFT** prose with sentence variety, clear verb choice, hedging, and Topic-Support-Conclude structure.
4. **AUDIT** with `../_shared/core/anti-ai-prose.md` and `resources/anti-ai-checklist.md`. Fix supported defects in draft/revise mode; in review mode, quote the passage, identify the defect, and recommend a local fix without a full rewrite or AI-authorship estimate.
5. **REVERSE-OUTLINE** the section and build the Claim-Evidence Map, a three-column table (Claim / Evidence / Status) with one row per major claim; weaken or remove any unsupported claim.
6. **POLISH** with cohesion, specificity, word-count, rhythm, and paragraph-length-variation checks; emit in the mode's output format.

### Resource scope and effects
Writes drafted, revised, or reviewed prose to the user's working location (file or inline). Does not modify `resources/` reference files. Does not fetch external citations; defers to `oma-scholar` when discovery is required. A handoff to `oma-scholar` or `oma-translation` is a notification only: the user or workflow drives the actual handoff, and this skill does not auto-spawn either.

### Guardrails
1. Every sentence must be verifiable; never fabricate data, statistics, or citations.
2. Quote supplied rubric constraints before judging compliance. Without a rubric, explain prose/evidence findings against the requested scope rather than inventing assignment criteria.
3. Never combine distinct rules to invent a new constraint; apply rules exactly as written.
4. Choose verbs for their exact meaning and support. Keep common verbs when they are accurate and natural; replace a vague verb only when the new wording states a relevant distinction without inflating the claim.
5. Review repeated structure and sentence length in context. Change rhythm where it improves clarity or emphasis; do not force sentence-type quotas or rewrite clear prose merely to vary it.
6. Match hedge strength to evidence strength per `hedging-guide.md`, including its limits on intensifiers and first-person opinion markers.
7. Apply common prose diagnostics with the academic checklist's evidence and register exceptions. Vocabulary counts trigger contextual review, not automatic replacement of precise terms.
8. Apply the punctuation and heading limits in `resources/anti-ai-checklist.md`; no didactic disclaimers (`It is important to note`) or summary phrases (`In summary`, `Overall`).
9. Every claim must map to evidence in the Claim-Evidence Map; weaken or remove unsupported claims rather than emit them.
10. Apply the shared mannered-prose guidance with the academic checklist's literal-statement requirement.

## References
- Research abstract guidance: `resources/abstract-guide.md` (load when drafting, revising, or reviewing an abstract)
- Common prose diagnostics: `../_shared/core/anti-ai-prose.md` (load with the academic checklist for prose audits)
- Academic audit constraints: `resources/anti-ai-checklist.md` (load with the common diagnostics for prose audits)
- Sentence-structure reference: `resources/sentence-structure-reference.md` (load when rhythm, openers, or paragraph structure need review)
- Academic verb guidance: `resources/academic-verb-guide.md` (load when a verb is vague or overstates its evidence)
- Hedging guide: `resources/hedging-guide.md` (load when certainty is material to a claim)
- Shared context loading: `../_shared/core/context-loading.md`
- Shared quality principles: `../_shared/core/quality-principles.md`
