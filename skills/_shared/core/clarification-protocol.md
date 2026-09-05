# Clarification Protocol

Apply [Execution Policy](execution-policy.md) before deciding whether to ask.

| Situation | Action |
|-----------|--------|
| Goal and authorization are clear; routine details remain | Use repository conventions, state consequential assumptions, proceed |
| A preference could improve the result | Ask one concise optional question and continue independent work |
| Missing information materially changes correctness or scope | Ask the specific question; pause only the dependent work |
| An action requires authorization not already given | Prepare the reviewable result, explain the action and reason, then ask |

Check prior messages, project configuration, and existing behavior before asking. The presence of tradeoffs, an existing-code conflict, or subjective wording alone is not a blocker. Do not add authentication, a database, or a framework solely because a generic checklist has a default.

Subagents report the exact missing fact and any independent work completed in a structured `blocked` or `partial` result. The coordinator answers from existing context where possible and asks the user only when necessary.
