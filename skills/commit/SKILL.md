---
name: commit
description: Generate Conventional Commits spec git commits (auto-separate by feature)
disable-model-invocation: true
---

# /commit

## Claude Code Adaptation

- Use Claude Code's native git tools
- Run `git status`, `git diff --staged`, `git log` with Bash tool
- Pass multi-line commit messages using HEREDOC

## Commit Types

| Type | Description |
|:-----|:-----------|
| feat | New feature |
| fix | Bug fix |
| refactor | Refactoring |
| docs | Documentation changes |
| test | Test additions/modifications |
| chore | Build/configuration |
| style | Code style |
| perf | Performance improvements |

## Commit Format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: First Fluke <our.first.fluke@gmail.com>
```

## Workflow

1. **Analyze Changes**: `git status` + `git diff --staged`
2. **Separate Features**: Different scope/type → separate commits (no separation needed if ≤5 files)
3. **Determine Type**: Changes → select appropriate type
4. **Determine Scope**: Changed module/component
5. **Write Description**: Imperative mood, ≤72 chars, lowercase, no period
6. **Execute Commit**: Show message and commit immediately (no confirmation questions)

## Absolute Rules

- Do NOT use `git add -A` / `git add .` — always specify files
- Do NOT commit secrets files (.env, credentials)
- Pass commit messages using HEREDOC
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

$ARGUMENTS
