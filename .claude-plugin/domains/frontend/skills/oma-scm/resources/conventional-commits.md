# Conventional Commits Guide

Git execution and staging rules live in the parent SKILL.md. Use this reference only for commit syntax and branch names. Repository configuration and hooks determine applicable length and release rules.

## Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

### Primary Types

| Type | Description | SemVer | Example |
|------|-------------|--------|---------|
| `feat` | Add new feature | MINOR | `feat: add user authentication` |
| `fix` | Bug fix | PATCH | `fix: resolve login timeout issue` |

### Secondary Types

| Type | Description | SemVer | Example |
|------|-------------|--------|---------|
| `docs` | Documentation changes | - | `docs: update API documentation` |
| `style` | Code style changes (formatting, semicolons, etc.) | - | `style: fix indentation` |
| `refactor` | Code improvement without behavior change | - | `refactor: extract helper function` |
| `perf` | Performance improvements | PATCH | `perf: optimize database queries` |
| `test` | Add/modify tests | - | `test: add unit tests for auth` |
| `chore` | Maintenance not covered by other types | - | `chore: update .gitignore` |
| `build` | Build system, external dependencies | - | `build: bump vite to v6` |
| `ci` | CI configuration and scripts | - | `ci: cache bun install in workflow` |
| `revert` | Revert a previous commit | varies | `revert: feat(auth): add OAuth2 support` |

## Scope

Scope indicates the area of changed code:

```
feat(auth): add OAuth2 support
fix(api): handle null response
refactor(ui): simplify button component
```

## Description

- **Imperative mood**: "add", "fix", "update" (NOT "added", "fixed", "updates")
- **Lowercase first letter**
- **No trailing period**
- **72 characters or less**

## Body

Body is optional but useful for complex changes:

```
feat(auth): add multi-factor authentication

Implement TOTP-based two-factor authentication:
- Add QR code generation for authenticator apps
- Store encrypted TOTP secrets in database
- Add backup codes for account recovery

Closes #123
```

## Breaking Changes

Breaking changes marked with `!` or in footer:

```
feat(api)!: change response format for user endpoint

BREAKING CHANGE: The user endpoint now returns a nested object
instead of a flat structure. Update client code accordingly.
```

## Footer

### Issue References
```
feat(auth): add password reset flow

Closes #456
Refs #123, #789
```

### Co-Authors

Include `Co-authored-by: <name> <email>` only when effective `scm.co_author.enabled` is true and both configured values are present. Copy them exactly from configuration; otherwise omit the trailer. GitHub credits the verified email owner, so never reuse an example identity. A co-author hook rejection must be corrected against the configured allowlist.

## Branch Naming Convention

| Type | Branch Prefix | Example |
|------|---------------|---------|
| feat | `feature/` | `feature/user-auth` |
| fix | `fix/` | `fix/login-timeout` |
| refactor | `refactor/` | `refactor/api-cleanup` |
| docs | `docs/` | `docs/api-guide` |
| hotfix | `hotfix/` | `hotfix/security-patch` |

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
