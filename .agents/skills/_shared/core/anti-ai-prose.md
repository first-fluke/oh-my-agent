# Shared prose diagnostics

Load for academic prose audits and translation style reviews, together with the
owning skill's domain rules. Meaning, evidence, required structure, and target-language
conventions take precedence over these style diagnostics.

## Editing and review contract

Read the whole passage and identify its point, audience, and existing voice. Make only
changes that correct a supported defect. Keep useful details, uncertainty, and clear
sentences. Do not invent facts, examples, numbers, opinions, humor, or personality to
make writing seem more human. Reorganize only when the current order impairs understanding.

In review-only mode, name the pattern, quote the affected text, explain the defect,
and suggest a local fix. Do not rewrite the full draft or infer AI authorship from
style. Zero findings is valid. The owning skill controls its domain report format;
an evidence or translation-quality score is not an AI-authorship probability.

## Common patterns

Target-language grammar and typography remain in the translation resource.
Refer to patterns by heading name, not by position in this file.

### Inflated significance

Replace claims of importance with the supported action, result, or consequence.
Do not describe an ordinary change as a milestone without evidence.

### Superficial analysis

A trailing clause such as `highlighting its importance` needs an actual explanation
or evidence. Remove it when empty; retain substantive causal or analytical content.

### Promotional tone

Remove unearned praise and claims of novelty. Match the evidence and intended register.

### Mannered prose

Prefer a literal statement when metaphor or flourish obscures the meaning. Do not
replace one decorative metaphor with another. The owning skill determines how to
handle an author's intentional figurative language.

### Vague attribution

Identify the available source of a claim. Do not replace a named source with an
anonymous consensus or invent a source to repair an unsupported statement.

### Authority padding

Keep relevant credentials and coverage only when they support a concrete claim.
Remove unsupported prestige claims and publication lists used as praise.

### Generic endings

Remove formulaic optimism and redundant recaps. End with a supported result,
limitation, implication, or next action. Preserve a required conclusion or abstract.

### Vocabulary clustering

Look for clusters of vague or inflated wording, including `delve`, `leverage`,
`foster`, `pivotal`, `seamless`, `tapestry`, and `groundbreaking`. Judge the meaning
in context; a technical term is not defective because it appears on a list.
Language-specific examples and domain thresholds belong to the owning resource.

### Unnecessary verb inflation

Keep ordinary verbs such as `is`, `has`, and `uses` when accurate. Replace them only
when a different verb states a useful distinction supported by the content.

### Mechanical triples

Remove stacked descriptors that repeat praise. Keep three items when each adds
information; list length alone is not a defect.

### Synonym cycling

Use one term for one concept. Do not rotate labels merely to avoid repetition.

### Rhetorical contrasts

State the claim directly when a negative contrast or repeated negation adds only
drama. Retain contrasts that distinguish real alternatives or necessary exclusions.

### Compound adjective stacking

Unpack stacked compound modifiers when they obscure what the subject does.
Keep established technical terms and meaningful distinctions.

### Abstract noun and adjective stacking

Replace vague descriptive clusters with a concrete action or property already
supported by the passage. Do not remove necessary technical precision.

### False ranges

Use a range only when its endpoints define a meaningful scale or scope.

### Decorative bold

Avoid mechanical emphasis. Use formatting that helps the reader locate information.

### Decorative dashes

Express the relationship between clauses with suitable grammar and punctuation.
Do not use dashes as a repeated rhythm device. Domain and locale rules set limits.

### Mechanical punctuation swaps

Replacing a dash with a colon or parentheses does not repair unclear syntax.
Rewrite the relationship when punctuation alone cannot express it.

### Heading case

Follow the document's required heading convention and target-language typography.

### Unnecessary tables

Use tables for information readers need to compare or look up, when the format allows.

### Mini-heading lists

Do not turn short prose into a series of bold labels and explanations without a
reading or reference need.

### Emoji decoration

Do not add emoji as ornament. Preserve content or UI conventions where required.

### Heading warmups

Remove a sentence that merely repeats the heading before the actual content begins.

### Chatbot artifacts

Exclude conversational acknowledgments and offers of further help from deliverable
prose unless they are themselves the requested content or quoted source material.

### Empty metadiscourse

Remove sentences telling readers a point matters when the passage already shows
why. If the explanation is missing, provide existing evidence instead of emphasis.
Keep uncertainty that reflects the evidence or the author's intended meaning.

### Announced exposition

Remove introductory announcements that delay the subject without adding context.
Keep introductions that define scope or help readers follow a necessary transition.

### Unsupported insight claims

Remove claims that the writer alone sees a hidden truth. Present the argument and
its support without asserting that everyone else missed it.

### Boilerplate limitations

Remove generic availability or knowledge disclaimers. Keep actual source limitations
and uncertainty relevant to the claim.

### Filler and indirect verbs

Shorten empty phrases and use direct verbs where meaning survives. Preserve a
qualifier when it carries uncertainty, emphasis, or a necessary distinction.

### Mechanical rhythm

Repair repeated sentence shapes when they impede reading. Preserve clear variation
and an author's characteristic cadence. Do not impose identical paragraph shapes
or insert fragments solely to create variation; domain structure rules still apply.

### Portability test

Check whether a sentence could describe an unrelated subject with only its name
changed. If so, determine whether it adds necessary context or merely generic praise.
Replace empty wording with an available mechanism, observation, consequence, or
example; otherwise remove it where editing scope permits. Never fabricate detail.

### Dramatic reveals and rhetorical questions

Remove a question answered immediately for effect, or a label followed by a colon
that delays a plain claim. Keep real research questions, definitions, labels, and
structural colons when the domain allows them.

### Performative endings and fragments

Remove an unsupported aphorism, decorative metaphor, or sequence of punchy fragments
at the end. Finish on a concrete sentence already supported by the passage. Preserve
intentional source cadence in translation and required academic conclusions.

## Origin

Consolidated from OMA's academic and translation diagnostics. Additional editorial
checks were informed by Peter Yang's [no-ai-slop skill](https://github.com/petergyang/no-ai-slop/blob/main/skills/no-ai-slop/SKILL.md).
This resource uses domain-specific exceptions rather than adopting its word bans
or stylistic preferences as universal rules.
