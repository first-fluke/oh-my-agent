# Subagent Prompt Template

Use this template for a bounded task. CLI dispatch injects the owning skill, vendor protocol, execution policy, and result contract; do not duplicate their bodies here.

```markdown
## Assignment
- Agent: {AGENT_ROLE}
- Task ID: {TASK_ID}
- Workspace: {WORKSPACE_PATH}
- Scope: {ALLOWED_PATHS}

{TASK_DESCRIPTION}

## Acceptance criteria
{ACCEPTANCE_CRITERIA}

## Task references
{RELEVANT_ARTIFACT_PATHS_AND_LOAD_CONDITIONS}

## Material constraints
{TASK_SPECIFIC_CONSTRAINTS}

Use the injected run and claim identity. Preserve other agents' edits. Report necessary changes outside scope for coordination. Apply existing authorization and pause only dependent work when required information is missing.

Complete the assigned criteria and relevant checks. If interrupted or unable to finish, save progress, unresolved work, and evidence in the injected result contract. Turn estimates guide checkpoints; they are not completion boundaries.
```

Use the assigned plan task ID and flat report name `result-{agentId}-{taskId}-{runId}-{sessionId}.md`. A report file supplements the structured claim; it is not proof of completion. Select tests or alternative verification for the task's risk under `_shared/core/test-approach.md`. No fixed Charter block is required.

For native dispatch, provide paths to the execution policy, result contract, and owning skill if not already present. Make additional specialist skills available as routes, rather than pasting every skill into the prompt.
