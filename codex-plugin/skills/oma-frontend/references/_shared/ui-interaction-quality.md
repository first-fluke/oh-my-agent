# UI Interaction Quality

Load the relevant sections when changing motion, input feedback, or rendered
web-component behavior. Static document corrections do not require this resource.
Follow existing project conventions; native implementation uses `oma-mobile`.

## Decide what the interaction needs

`oma-design` owns the intended behavior and its effect on the user:

- Name the purpose: acknowledge input, show a state change, explain a spatial
  relationship, preserve continuity, or support an explicitly requested effect.
  Keep a direct state change when motion adds no useful information.
- Consider how often the interaction occurs and whether it blocks the next
  action. Repeated work and keyboard-driven workflows need prompt, unobstructed
  feedback; occasional explanatory moments can support more expression.
- Keep content stable while the user reads, compares, selects, or acts on it.
  Decorative movement must not compete with task information or conceal state.
- Define the reduced-motion result with the behavior. Preserve essential state,
  feedback, and control when movement is reduced or removed.
- Reuse the approved project direction, motion tokens, and component behavior.
  Specify the affected states and acceptance criteria rather than imposing a new
  timing scale, spring table, or page-wide motion quota.

Use the supplied brief and inspected UI to make these decisions. Ask only about
a material unresolved choice. An audit returns findings within its read-only
scope; an implementation request proceeds under the existing authorization.

## Implement within the current stack

`oma-frontend` owns the implementation. First inspect the component primitives,
existing motion mechanisms, tokens, and affected lifecycle. Extend a suitable
existing mechanism before adding a second one.

| Mechanism | Relevant use |
|---|---|
| CSS transitions or animations | Stylesheet-driven changes and predetermined motion that need no additional controller |
| Web Animations API | Browser-native imperative playback, cancellation, or sequencing where it fits the required behavior |
| Project-selected Motion integration | Supported spring, layout, entry/exit, or gesture behavior in the project's current component architecture |
| Existing or selected GSAP integration | Its timelines, scroll coordination, or plugins when those capabilities are part of the task |

This table identifies capabilities, not an automatic dependency choice. A fade
does not justify installing an engine. Preserve the project's framework,
component library, styling, state, and dependency policy.

### State and interruption

An interaction may reverse, repeat, or be cancelled before a transition ends.
Continue from the currently displayed position and velocity where appropriate,
rather than resetting to an obsolete starting frame. Keep one owner for each
animated property and cancel or supersede stale work.

Keep semantic state authoritative. A visual exit must not leave a hidden control
active, preserve stale content after reopening, or lose the intended focus
destination. Use the existing component's state and lifecycle contracts instead
of adding an independent animation state machine without a demonstrated need.

In React, keep continuous visual values outside component render state when they
do not change the UI's meaning. Use the existing controller, motion values, or
refs for those updates. Commit meaningful state changes through the normal React
model; do not force a render for every animation frame or pointer sample merely
to move an element.

### Press, focus, hover, and touch

- Give prompt press feedback through the project's control primitives. Feedback
  on pointer-down is distinct from committing an action: preserve cancellation,
  click/activation semantics, and keyboard behavior.
- Keep focus visible and stable through transitions. Exercise keyboard entry,
  activation, dismissal, and return focus where the component supports them.
- Gate hover-only decoration by input capability. Keep essential information
  and actions available to touch and keyboard users; support mixed input devices
  without assuming a screen width or user-agent identifies the input method.
- Preserve zoom, browser scrolling, and text interaction. Scope gesture handling
  and selection restrictions to the control that needs them.
- Verify pending, disabled, success, and failure feedback where those states
  exist. Appearance alone must not substitute for the component's actual state.

### Component lifetime

Tie controllers, frames, listeners, observers, timers, and subscriptions to the
component lifetime. Use the incumbent integration's cleanup mechanisms; cancel
obsolete work on unmount or replacement. Check repeated mount/unmount and rapid
open/close for duplicate handlers, stale callbacks, and continuing animations.
Pause nonessential continuous work when the surface is inactive when appropriate.

## Diagnose performance from evidence

Reproduce the affected interaction with representative content and concurrent
work. Inspect browser profiling, renders, layout, paint, and compositing as the
symptom requires. Compare frame work with the actual target device's budget;
do not infer smoothness from a library name or a desktop screenshot.

Transforms and opacity often avoid layout work, but acceleration depends on the
actual property, browser, controller, and content. Check costly descendants,
inherited custom-property updates, effects, and large layers before choosing a
fix. Add layer promotion or `will-change` only for an observed need, then verify
the effect and resource cost.

Measure the affected case before and after a proposed performance fix. Record
the browser/device, content, steps, relevant trace or observation, and remaining
limits. Emulation and code inspection can support findings; they do not prove
behavior on an untested physical device.

## Exercise realistic content and states

Use fixtures at the component's real data boundary and container size. Derive
limits from the schema, API, validation, and supported product behavior. Mark an
unknown limit as unknown; use plausible stress data without inventing product
claims or introducing real personal data into a fixture.

Select cases relevant to the affected UI:

- Long and short names, unbroken identifiers, translated labels, CJK text and
  mixed scripts. Check glyph fallback, line breaking, wrapping, and readable
  control labels with the project's actual fonts and supported languages.
- Empty, single-item, and realistic large collections; absent optional fields,
  unavailable images, and the number/date formats the product supports.
- Loading, failure, retry, disabled and successful states; repeated activation,
  cancellation, reopening, and interruption while content or layout changes.
- Supported narrow containers, zoom/text enlargement, themes, directionality,
  and input modes. Include keyboard, touch, safe-area, or software-keyboard
  behavior when the changed surface depends on them.

Keep meaning and essential values accessible when space is tight. Use the
project's existing wrapping, disclosure, scrolling, or truncation conventions
according to the data's purpose. An optional debug fixture or prototype stays
outside production flows unless the task explicitly includes it.

Report what was exercised and observed, including the component/state, content,
viewport or input, and result. Separate rendered findings from code-only
inferences and unrun checks. Keep fixes within the authorized scope and repeat
the affected checks after a change.
