---
name: oma-commit
description: Create git commits following Conventional Commits specification with project-specific branch naming rules. Use for commit message generation, changelog, and versioning.
---

# Commit Skill - Conventional Commits

## When to use
- When user requests "commit this", "commit", "save changes"
- When `/commit` command is invoked

## Configuration
Project-specific settings: `.agents/skills/commit/config/commit-config.yaml`

## Commit Types
| Type | Description | Branch Prefix |
|------|-------------|---------------|
| feat | New feature | feature/ |
| fix | Bug fix | fix/ |
| refactor | Code improvement | refactor/ |
| docs | Documentation changes | docs/ |
| test | Test additions/modifications | test/ |
| chore | Build, configuration, etc. | chore/ |
| style | Code style changes | style/ |
| perf | Performance improvements | perf/ |

## Commit Format
```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: First Fluke <our.first.fluke@gmail.com>
```

## Workflow

### Step 1: Analyze Changes
```bash
git status
git diff --staged
git log --oneline -5
```

### Step 1.5: Split by Feature (if needed)
If changed files span multiple features/domains, **split commits by feature**.

**Split criteria:**
- Different scopes (e.g., workflows vs skills vs docs)
- Different types (e.g., feat vs fix vs docs)
- Logically independent changes

**Example:**
```
# Changed files:
.agents/workflows/*.md (7 files)     → fix(workflows): ...
.agents/skills/**/*.md (4 files)     → fix(skills): ...
USAGE.md, USAGE-ko.md               → docs: ...

# Split into 3 commits
```

**Do NOT split when:**
- All changes belong to a single feature
- Few files changed (5 or fewer)
- User requested a single commit

### Step 2: Determine Commit Type
Analyze changes → Select appropriate type:
- New files added → `feat`
- Bug fixed → `fix`
- Refactoring → `refactor`
- Documentation only → `docs`
- Tests added → `test`
- Build/config changes → `chore`

### Step 3: Determine Scope
Use changed module/component as scope:
- `feat(auth)`: Authentication related
- `fix(api)`: API related
- `refactor(ui)`: UI related
- No scope is also valid: `chore: update dependencies`

### Step 4: Write Description
- Under 72 characters
- Use imperative mood (add, fix, update, remove...)
- Lowercase first letter
- No trailing period

### Step 5: Execute Commit
Show the commit message and proceed immediately without asking for confirmation:
```
📝 Committing:

feat(orchestrator): add multi-CLI agent mapping support

- Add user-preferences.yaml for CLI configuration
- Update spawn-agent.sh to read agent-CLI mapping
- Update memory schema with CLI field

Co-Authored-By: First Fluke <our.first.fluke@gmail.com>
```

```bash
git add <specific-files>
git commit -m "<message>"
```

## References
- Configuration: `config/commit-config.yaml`
- Guide: `resources/conventional-commits.md`

## Important Notes
- **NEVER** use `git add -A` or `git add .` without explicit permission
- **NEVER** commit files that may contain secrets (.env, credentials, etc.)
- **ALWAYS** use specific file names when staging
- **ALWAYS** use HEREDOC for multi-line commit messages
