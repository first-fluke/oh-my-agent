---
title: Design an admin UI around its actual tasks
description: Define an admin screen's hierarchy, table density, states, and design handoff while retaining the project's stack and visual contract.
---

# Design an admin UI around its actual tasks

Use `oma-design` to decide how an admin screen should support its users before changing application code.

## Load the skill

Ask your coding agent to run this command and read the returned instructions and support directory:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Provide the input

- A running screen, screenshots, or the relevant components.
- Who uses the screen and the actions they need to complete.
- Existing `DESIGN.md`, tokens, components, languages, and responsive/accessibility requirements.

## Give the task

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Check the result

Expect screen-specific hierarchy and density decisions, state behavior, semantic token mapping, and an implementation handoff. Accepted system changes belong in the project's canonical `DESIGN.md`.

Check the proposal against the triage task: can a user identify the next ticket, change filters, open details, and recover from errors? Inspect keyboard focus, readable Korean/English text, and narrow-screen behavior when a rendered specimen is available. A document-only handoff leaves browser and accessibility execution unverified.

## Dependencies and next step

For new admin/product-interface direction, the [routing contract](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) selects Interface Design. Existing-UI critique, audit, and polish select Impeccable; other web art direction uses Taste. One supplier is loaded for the current operation.

Those external instructions may need their own downloads or runtime tools. The existing stack, brand, CJK coverage, WCAG target, and reduced-motion requirements remain constraints. Loading instructions does not render or verify the UI.

Use the project's frontend specialist for implementation. For project hooks and workflows, [choose a runtime setup](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) that includes `oma-design`.
