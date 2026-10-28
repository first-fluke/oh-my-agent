# Task Handoffs

Use this guide when composing a task for another agent or when the requested outcome is unclear. A simple direct request does not need to be rewritten into a template.

Include the information the recipient needs:

| Element | Content |
|---|---|
| Goal | Observable behavior or artifact to change |
| Context | Relevant paths, existing patterns, errors, and prior decisions |
| Constraints | Actual scope, compatibility, ownership, and authorization boundaries |
| Done when | Acceptance criteria and proportionate verification |

Infer routine details from the request and repository. Do not invent constraints or ask the user to fill headings. Ask only about a missing fact that materially changes the result; follow `execution-policy.md` and `clarification-protocol.md`.

For implementation, include affected tests or examples when they clarify the contract. For a bug, describe the failure and expected behavior. For verification, name applicable project checks; a build is included only when explicitly requested by the user.

For dispatched tasks, preserve injected task/run/claim identity and required artifact paths from `../runtime/result-contract.md`. Reference the owning skill rather than pasting instructions already supplied by the runtime. Ownership and dependencies matter more than a decorative report format.
