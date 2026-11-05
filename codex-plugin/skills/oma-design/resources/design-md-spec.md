# DESIGN.md Specification

## Purpose

`DESIGN.md` records the project's accepted visual language and the instructions
downstream implementers need. OMA owns this project contract. The selected
upstream skill supplies design guidance; vendor seeds supply reference data.

Preserve the nine sections below. Use project-specific decisions and values;
do not copy an upstream visual cookbook or a vendor's product claims. During an
audit, report proposed document changes without modifying the document.

## 9-Section Structure

### 1. Visual Theme & Atmosphere

Describe the accepted direction, audience, brand intent, and constraints in
plain terms. For an existing system, distinguish retained decisions from the
requested changes. Link to relevant inspected references when useful.

### 2. Color Palette & Roles

Record each relevant color's descriptive name, concrete value, semantic role,
and project token/alias. Use the project's color format. Include applicable
themes and interaction states; identify unresolved or unmeasured values.

### 3. Typography Rules

Record font families and fallback stacks, language coverage, and the accepted
hierarchy. Preserve the hierarchy table:

| Role | Font | Size | Weight | Line Height | Letter Spacing | Features | Notes |
|---|---|---|---|---|---|---|---|
| Project text role | Approved family/fallback | Project value/token | Project value | Project value | Project value | Applicable features | Language/state constraints |

For ko/ja/zh, follow the project's CJK policy and verify suitable glyph coverage
and fallback. A Latin vendor font is only a reference signal. New CJK stacks
should prioritize Pretendard Variable or Noto Sans CJK as appropriate to the
language; preserve a suitable approved project stack.

### 4. Component Stylings

Specify the affected components, variants, semantic token roles, measurements,
and interaction states needed by implementation. Record relevant keyboard,
focus, error, and disabled behavior. Reuse the project's primitives rather than
selecting a replacement component framework in this document.

### 5. Layout Principles

Record the accepted content structure, container/grid behavior, spacing and
radius roles, and their existing project mappings. The values come from the
project decision; no fixed grid or scale is imposed by this specification.

### 6. Depth & Elevation

Record the relevant layer/elevation roles and overlay relationships. Include
surface or material treatments only when the project uses them. State when an
entry is not applicable instead of inventing decorative effects.

### 7. Do's and Don'ts

Record project-specific constraints and accepted exceptions: preserved brand,
content, language coverage, behavior, and choices resolved during the design
operation. Reference the affected project decision. Do not reproduce a generic
anti-pattern list or blanket bans from a different brand.

### 8. Responsive Behavior

Specify the project's target viewports/input modes, applicable breakpoints,
content ordering, navigation and control changes, media handling, and safe-area
or keyboard constraints where relevant. Identify required responsive and
accessibility checks and whether they have been executed.

### 9. Agent Prompt Guide

This section is mandatory. Downstream implementation agents read it as the component
contract. Keep it consistent with Sections 1-8 and the existing project stack.

#### Quick Color Reference

List the critical semantic roles, project tokens, and accepted values for the
affected UI, including applicable theme/state differences.

#### Example Component Prompts

Provide prompts for the components in scope. Include the decisions and values
needed to implement each one, preserved behavior, and relevant acceptance
criteria. Use actual project content; label any unresolved content or placeholder.

#### Iteration Guide

Record the project constraints an implementer must retain and how to verify the
affected result. Keep the list proportional to the task. Link to existing token,
i18n, or component sources rather than duplicating their implementation rules.

## Writing and extraction

Keep the technical document in English and use consistent project terminology.
Use exact values when supported by evidence; label assumptions and pending
measurements. Keep framework-specific implementation in the frontend owner,
except for the project-specific instructions needed in Section 9.

When extracting from an existing design, identify the inspected source and map
its observed values to the nine sections. For a requested vendor seed, use
[getdesign-fetcher.md](getdesign-fetcher.md) for retrieval, consistency checking,
and attribution. Synthesize project decisions, preserve CJK/brand constraints,
and rewrite Section 9 for the actual project.
