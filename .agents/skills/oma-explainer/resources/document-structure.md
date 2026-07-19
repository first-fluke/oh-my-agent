# Document Structure — oma-explainer

> The structural and rhetorical contract for all generated HTML explainer documents.
> Read this document to understand WHAT content is generated and in what tone.
> For HOW the HTML is styled and behaves, see `html-contract.md`.

---

## 1. Overall Shape

Every explainer document must be a **single long scrolling page**.
Do **not** use top-level tabs or multi-page navigation.
The document must begin with a Table of Contents (TOC), followed strictly by these four fixed sections in order:
1. **Background**
2. **Intuition**
3. **Code**
4. **Quiz**

---

## 2. Background

The Background section establishes context before presenting any code changes. It is composed of two tiers:

- **Tier A (Deep Background)**: Broadly explains the surrounding system or architecture. Must be explicitly marked "skippable if you already know the system."
- **Tier B (Narrow Background)**: Directly explains the context relevant to the specific change.

*Note on Reader Level:* If the requested reader level is `reviewer`, aggressively condense Tier A (Deep Background).

---

## 3. Intuition

The Intuition section conveys the core essence of the change without diving into full implementation details.

- **Toy-Data Examples**: Concrete toy-data examples are **mandatory**. Show, don't just tell, how the inputs and outputs change.
- **Visuals**: Liberally use diagrams (see Section 6) to establish mental models early.

---

## 4. Code

The Code section is a high-level walkthrough of the changes.

- **Comprehension Order**: Group and order the code walkthrough for human comprehension. Do **not** simply list files in alphabetical or git-diff order.
- **Reference**: Reference code using `file:line` notation where useful.

---

## 5. Quiz

The Quiz verifies understanding. While `html-contract.md` defines the interaction and JS behavior, this document governs question quality:

- **Count**: 5 questions by default (this count is parameterizable).
- **Difficulty**: Medium. Questions must be answerable only if the reader understood the substance of the change. No trick questions or gotchas.
- **Coverage**: Each question must target a distinct aspect of the change.
- **Distractors**: Wrong options (distractors) must be highly plausible.
- **Feedback**: **Every** option (correct and incorrect) must have accompanying feedback text explaining exactly why it is right or wrong.

---

## 6. Diagram Families

Visual consistency is critical. Pick **2–3 diagram families** per document and **reuse** them across sections to build continuity.

### Family Catalog
Choose from the following conceptual families:
- **Simplified UI Mock**: Abstracted representation of what the user sees.
- **System/Data-Flow Diagram**: Component interaction flows carrying **example data** directly on the arrows.
- **Before/After State**: Visual comparison of the system state before and after the change.

### Format Constraints
- Diagrams must be rendered using **HTML/CSS** or **inline SVG** only.
- **ASCII art is strictly forbidden.**
- Use semantic HTML lists (`<ul>`, `<ol>`, `<dl>`) for textual lists.

---

## 7. Callouts

Use styled callout blocks to highlight:
- Key concepts and definitions.
- Important edge cases and gotchas.

These should visually interrupt the prose to draw the reader's attention to critical information.

---

## 8. Writing Style and Language

The explainer must read with authoritative clarity, smooth transitions between sections, and an engaging tone.

- **English Prose**: Aim for Martin Kleppmann-like clarity. Classic style, engaging, logically rigorous but accessible.
- **CJK Output**: Follow the `translation_voice` register configured in `.agents/oma-config.yaml`.
- **i18n Rules**: Prose and quiz content must be in the user's requested language. However, following `.agents/rules/i18n-guide.md`, **code blocks, identifiers, and inline code are always in English**. Do not translate technical terms or variable names.

---

## 9. Provenance Footer

Every document must end with a provenance footer containing:
- **Generated-from reference**: The commit range, PR number, or branch used as input.
- **Generation Date**: The timestamp localized to the `Asia/Seoul` timezone.
- **Excluded Files**: If the diff was oversized and files were dropped, list the excluded files in a footnote. Never silently truncate.
