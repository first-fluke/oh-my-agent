# Semantic Token Handoff

Load this resource when exporting or changing tokens from an accepted design.
OMA defines the mapping from project decisions to semantic roles. The platform
implementation owner implements that mapping in the project's existing token format.

## Read the current source

Identify the existing token package, theme files, component primitives, and
supported themes. Read `DESIGN.md` and its Agent Prompt Guide. Use existing names
and aliases when they express the accepted role; introduce a new role only when
the design requires it.

An audit reports missing or conflicting mappings without editing token files.
When token changes are authorized, preserve callers and the project's theme and
color-space conventions.

## Mapping contract

For each changed role, record:

| Field | Content |
|---|---|
| Semantic role | The use, such as primary action foreground or input focus |
| Project token | Existing token/alias, or the proposed new name |
| Resolved value | The accepted value in the project's format, with source |
| Theme/state | Applicable theme and interaction state |
| Consumers | Affected components or styles |
| Validation | Required contrast/state check and its executed or pending status |

Include typography, spacing, radius, elevation, or motion roles only when they
change. Derive their values from the accepted project design and existing
system; this resource supplies no default palette or visual scale.

## Implement through the project stack

Delegate code and format choices to
[oma-frontend](../../oma-frontend/SKILL.md) or
[oma-mobile](../../oma-mobile/SKILL.md), following the project's conventions. Keep
CSS custom properties, Tailwind version, color format, theme switching, and
component-library mappings consistent with the current implementation.

Do not introduce a parallel Tailwind config, a forced HSL conversion, or a second
theme source merely to export the design. Existing consumers remain valid unless
their migration is within the requested change. Preserve font fallback and CJK
coverage when typography tokens change.

## Verify the result

Compare the implemented mapping with `DESIGN.md` and Section 9. Check affected
consumers and themes using the project's relevant static checks and rendered
inspection. Record actual values, affected states, and results. A mapping table
or generated token file alone is not evidence of browser rendering or contrast.
