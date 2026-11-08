# Clarification Protocol

Apply [Execution Policy](execution-policy.md) before deciding whether to ask.

| Situation | Action |
|-----------|--------|
| Goal and authorization are clear; routine details remain | Use repository conventions, state consequential assumptions, proceed |
| A preference could improve the result | Ask one concise optional question and continue independent work |
| Missing information materially changes correctness or scope | Ask the specific question; pause only the dependent work |
| An action requires authorization not already given | Prepare the reviewable result, explain the action and reason, then ask |

Check prior messages, project configuration, and existing behavior before asking. The presence of tradeoffs, an existing-code conflict, or subjective wording alone is not a blocker. Do not add authentication, a database, or a framework solely because a generic checklist has a default.

## Question transport

- When clarification, a preference, or approval is needed, prefer the runtime's asynchronous user-question tool when available and permitted for that purpose. Otherwise use an available question tool or one concise plain-text question, respecting the runtime's mode and tool restrictions.
- Ask one focused question at a time. For approval, first present the concrete result and explain which action needs authorization and why; the question must be understandable on its own.
- Continue independent, authorized work while an answer is pending. Pause only the work that depends on required information or approval.
- Silence, elapsed time, and a preselected option are not approval. Keep required questions pending until the user explicitly answers; do not repeat an unanswered question through multiple channels.
- For an optional preference, allow a reasonable opportunity to answer, then state an assumption and proceed if necessary. An optional question must not become an approval gate.
- Vendor execution protocols map this policy to tools exposed in the current session; do not assume every vendor provides the same tool name.

Subagents report the exact missing fact and any independent work completed in a structured `blocked` or `partial` result. The coordinator answers from existing context where possible and asks the user only when necessary.
