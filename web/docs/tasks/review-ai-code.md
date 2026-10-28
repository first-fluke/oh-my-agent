---
title: Review AI code before merging
description: Review code written by AI for bugs, missing checks, and regressions using a scoped diff and reproducible findings.
---

# Review AI code before merging

Use `oma-qa` to review a change against its intended behavior. Start with the diff and the project's existing checks.

## Load the skill

Ask your coding agent to run this command, then read the returned instructions and support directory:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Provide the input

- The change or a local comparison ref, such as `origin/main`.
- The expected behavior, especially permissions, data changes, and failure handling.
- Existing lint/test commands and any environment limits.

## Give the task

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Check the result

Expect ordered findings with a reproduction or decisive code evidence, a suggested fix, and the commands actually run. If no defect is confirmed, the report should still identify the inspected scope and remaining gaps.

Open each cited location and verify that the trigger reaches it. Re-run the narrow check used as evidence. A missing tool or an untested path is a verification gap; a review summary alone does not establish that the change is safe to ship.

## Dependencies and next step

The agent needs access to the diff, local source, and the project's existing check tools. Browser, security, and performance checks need their corresponding target and tooling. Loading the skill does not provision those dependencies.

For a confirmed failure, continue with [debugging a failing test](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). If you want project hooks or team workflows, [choose a runtime setup](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) that includes `oma-qa`.
