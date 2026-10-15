# oma-docs Design Document

> Documentation drift detector skill: verify references and propose updates for diff-affected docs.

**Status**: Approved
**Issue**: [#326 documentation agent](https://github.com/gracefullight/oh-my-agent/issues/326)
**Stakeholders**: Melivo (issue author, end user), gracefullight (maintainer)

---

## Overview

`oma-docs` is a skill that surfaces documentation drift against the current codebase. v1 ships two modes (a docs-first verification pass and a diff-scoped sync proposer) built on a single deterministic reference index. The skill respects the maintainer's stated preference for diff-scoped enhancement while delivering Melivo's docs-first MVP simultaneously.

### v1 Scope (in)
- **verify** mode: extract references from `docs/**/*.md`, check existence against the codebase, report broken refs.
- **sync** mode: given a git diff, find docs that reference changed files and propose patches (LLM-generated, never auto-applied).
- L2 reference extraction: file paths, URLs, CLI commands, package scripts, env vars, config keys.
- Single-direction `doc-refs.json` index, git-tracked, with on-demand reverse lookup for sync mode.
- Approach B architecture: deterministic extractor + resolver, LLM only in reporter and sync proposer.
- Explicit invocation (`/oma-docs verify`, `/oma-docs sync`) plus opt-in workflow hook (`docs.auto_verify`).
- Escape hatch markers (block-level + file-level).
- `deepinit` Step 6 retired; drift detection delegated to oma-docs.

### v2 Scope (explicitly out)
- create mode (generate missing docs)
- multilingual sync via deeper `oma-translator` integration
- L3 symbol-level extraction (Tree-sitter / LSP)
- GitHub Action wrapper
- CHANGELOG completeness checker
- `scope` / `threshold` configuration knobs
- semantic drift (function signature changes, behavior changes)
- omission detection (code without any doc references)

### Acknowledged Limits (not solved by v1)
Melivo explicitly noted "this would not solve every form of documentation drift." v1 detects only what is referenced and physically broken. Code that no doc references will not surface in v1. Wording staleness without a broken ref will not surface either. v2 roadmap addresses these.

---

## Decisions Log

| # | Decision | Rationale |
|---|---|---|
| D1 | Dual-mode v1 (verify + sync) | Matches Melivo's MVP and maintainer's diff-scoped preference. |
| D2 | Single-direction `doc-refs.json` with on-demand reverse map | Stable PR diff, sync built on top without duplicating storage. |
| D3 | Approach B (deterministic extractor + LLM reasoner) | Token cost low, CI-friendly, reproducible. |
| D4 | L2 extraction only | Keeps extractor language-agnostic, no code graph. |
| D5 | broken-only classification (no Tier 2/3) | Avoids LLM judgment in verify path; preserves determinism. |
| D6 | Explicit invocation + opt-in hook (`docs.auto_verify: false` default) | Avoids surprising users; sync never auto-applies. |
| D7 | `docs/generated/doc-refs.json`, git-tracked | Convention from `deepinit` Step 3; PR review visibility. |
| D8 | `deepinit` Step 6 retired, delegates to `oma-docs verify` | Single source of truth for drift detection. |
| D9 | URL HEAD requests skip internal/RFC1918 hosts by default | Avoids leaking intranet structure to third parties. |
| D10 | sync proposer redacts `.env*`, gitignored, secret-pattern files from LLM input | Defense-in-depth against secret leakage. |

---

## Architecture

```
                    docs/**/*.md
                          │
                          ▼
                    [Extractor]                cli/commands/docs/extract.ts
                      - remark + unified AST
                      - escape hatch filter
                      - L2 ref extraction
                          │
                          ▼
                docs/generated/doc-refs.json   (single-direction, git-tracked)
                          │
              ┌───────────┴───────────┐
              │                       │
       [Verify pipeline]        [Sync pipeline]
              │                       │
              ▼                       ▼
       [Resolver]              [Reverse-lookup util]
        cli/commands/docs/      in-memory, on-demand
        resolve.ts              git diff --name-only +
                                index reverse mapping
              │                       │
              ▼                       ▼
       DriftReport             AffectedDocsCandidates
              │                       │
              ▼                       ▼
       [Reporter LLM]          [Sync proposer LLM]
       natural-language         per-doc patch proposals
       summary                  with secret redaction
              │                       │
              ▼                       ▼
       stdout / report-file     interactive accept/reject
```

### Component placement
- `cli/commands/docs/extract.ts`: markdown AST + L2 patterns produce `doc-refs.json`
- `cli/commands/docs/resolve.ts`: deterministic existence checks
- `cli/commands/docs/sync-propose.ts`: git diff intake, reverse lookup, LLM patch proposal
- `.agents/skills/oma-docs/SKILL.md`: SSL-lite skill definition (validated via `/oma-skill-creator`)
- `docs/generated/doc-refs.json`: index artifact (git-tracked)

### Markdown parser
`remark` + `unified` ecosystem (TypeScript-native, stable AST, ergonomic plugin API).

---

## doc-refs.json Schema (v1)

```json
{
  "schemaVersion": 1,
  "generator": "oma-docs/0.1.0",
  "docs": [
    {
      "path": "README.md",
      "refs": [
        { "kind": "file",   "target": "src/auth.ts",         "line": 42  },
        { "kind": "url",    "target": "https://example.com", "line": 50  },
        { "kind": "cli",    "target": "oma docs verify",     "line": 87  },
        { "kind": "script", "target": "test",                "line": 105 },
        { "kind": "env",    "target": "OPENAI_API_KEY",      "line": 120 },
        { "kind": "config", "target": "docs.auto_verify",    "line": 130 }
      ]
    }
  ]
}
```

### Field rules
- `schemaVersion`: integer, increments on breaking changes.
- `generator`: extractor version; distinguishes drift from generator changes.
- `docs[]`: sorted by `path` (alphabetical).
- `docs[].refs[]`: sorted by `line` (ascending).
- `refs[].kind`: enum `file | url | cli | script | env | config`.
- `refs[].target`: normalized; CLI keeps raw command string for resolver to parse.
- `refs[].line`: 1-based source line.
- **No `generatedAt`**: eliminates noisy git diff on every run (T1a resolution).

### Deterministic ordering
Same input always produces byte-identical output. PR diffs reflect real reference changes.

### Empty refs
Docs scanned but containing zero refs are still emitted as `{ path, refs: [] }`. Documents that scanning was performed; future ref additions become visible via diff.

### Excluded paths (extractor input)
- `docs/generated/**` (output, not authored)
- Symlinks (loop avoidance)
- Files >10MB (warn + skip)
- Files matching gitignore

### Frontmatter handling
- File-level skip: frontmatter `oma-docs: skip` removes the file entirely from the index.
- Inline frontmatter values: `file` / `url` kinds are extracted; other kinds skipped (rare in frontmatter).

---

## SKILL.md Interface

### Frontmatter
```yaml
---
name: oma-docs
description: Verify documentation references against the current codebase and propose updates for diff-affected docs. Use to check if docs still match reality (broken file paths, CLI commands, config keys, env vars, scripts) and to surface docs that may need updating after code changes.
---
```

### Mode contracts

#### `/oma-docs verify [path?]`
| Field | Value |
|---|---|
| Args | `path` (optional glob, default `**/*.md`) |
| Behavior | extract → resolve → report |
| Side effects | `doc-refs.json` regenerated |
| Output | markdown report (default), `--json` for machines, `--report-file <path>` to write to file |
| Exit code | 0 = clean, 1 = broken refs found |

#### `/oma-docs sync [diff-range?]`
| Field | Value |
|---|---|
| Args | `diff-range` (default: `--cached`, fallback `HEAD~1..HEAD`) |
| Behavior | git diff → reverse lookup → LLM proposes patches |
| Side effects | only on user-approved patches; `doc-refs.json` regenerated after applies |
| Output | interactive prompts: `[y] apply [n] skip [d] diff [s] full proposal` |
| Auto-trigger | never (sync is always manual) |

### Output formats

**verify markdown report** (example):
```markdown
# Doc verification report

✗ 3 broken refs across 2 docs.

## README.md
- L42 [file]   `src/auth.ts`: file does not exist
- L87 [cli]    `oma docs verify --json`: flag `--json` not in CLI

## cli/AGENTS.md
- L120 [config] `docs.auto_verify`: key not found in oma-config.yaml schema

(45 docs scanned, 2 with drift, 248 refs verified)
```

**verify --json**:
```json
{
  "scannedDocs": 45,
  "totalRefs": 248,
  "broken": [
    { "doc": "README.md", "line": 42, "kind": "file", "target": "src/auth.ts", "reason": "file_missing" }
  ]
}
```

### SSL-lite skill body sections (per `/oma-skill-creator`)
- **Scheduling**: goal, intent signature, when (NOT) to use, expected I/O.
- **Structural Flow**: entry detects mode from first arg; scenes PREPARE, ACQUIRE, REASON, ACT, VERIFY, FINALIZE; mode-specific transitions.
- **Logical Operations**: actions table, tool references (`extract.ts`, `resolve.ts`, `sync-propose.ts`), resource scope (LOCAL_FS read/write on `docs/`, CODEBASE read-only), guardrails.
- **References**: this design doc, schema spec, hook integration spec.

### Guardrails (in SKILL.md)
- Never modify `.agents/` (CLAUDE.md SSOT).
- Never auto-apply sync patches.
- LLM unavailable: graceful degradation to raw JSON (verify) or candidate list only (sync).
- Response language follows `oma-config.yaml` `language`; code/paths/JSON stay English.

### Escape hatch syntax
```markdown
<!-- oma-docs:ignore-start -->
... excluded block ...
<!-- oma-docs:ignore-end -->
```
Symmetric pair (T1b resolution). File-level via frontmatter `oma-docs: skip`.

---

## Workflow Hook Integration

### Config
```yaml
# oma-config.yaml
docs:
  auto_verify: false   # opt-in; runs verify at end of /scm /work /ultrawork
```

### Hook attachment points
| Workflow | Position | Action |
|---|---|---|
| `/scm` | last step (around commit) | `oma docs verify --json` summarized |
| `/work` | before completion report | same |
| `/ultrawork` | before completion report | same |
| `/orchestrate` | not attached (v2) | n/a |
| `/deepinit` | Step 6 retired (delegates) | n/a |

### Hook output policy (T1e resolution)
- **Primary**: stdout (1-3 line summary). CI/log capture works naturally.
- **Optional**: `--report-file <path>` to write a full markdown report. User chooses persistent location.
- **No hidden file in `docs/plans/work/`** (gitignored, breaks CI).

### Hook failure policy (v1: warn-only)
- Broken refs found: workflow continues, warning emitted.
- Extractor failure: warning + workflow continues.
- Network unavailable: URL refs marked `verify-skipped`, others continue.
- `cli/commands/docs/*` not built: hook skipped with installation hint.
- Hook **never blocks** workflow completion in v1. `block` mode reserved for v2.

---

## Edge Cases & Error Handling

### Extractor
| Case | Policy |
|---|---|
| Malformed frontmatter, unclosed code blocks, BOM | skip doc + warn |
| Doc >10MB | skip + warn |
| Binary file with `.md` extension | skip silently |
| Symlinks | skip silently |
| `docs/generated/**` | excluded from input |
| Markdown showing markdown (nested fences) | extracted as-is; user can wrap in `oma-docs:ignore-*` |
| Multi-line CLI with `\` continuation | each line treated separately (minor accuracy loss accepted) |

### Resolver
| Case | Policy |
|---|---|
| URL 401/403 | `verify-skipped: auth-required` (not broken) |
| URL 5xx / timeout / no network | `verify-skipped: unreachable` |
| URL 404/410 | broken |
| URL matching localhost/RFC1918/`*.local`/`*.internal` | `verify-skipped: internal-host` (T1c) |
| CLI binary not on PATH | `verify-skipped: cli-unavailable` |
| package.json absent for script ref | broken |
| env var: not in code or `.env.example` | warn (not broken) |
| config deep-path partial match | broken |
| Case mismatch on case-insensitive FS | broken (matches git semantics) |

### Path resolution (monorepo)
1. Try doc-relative path first (`cli/README.md` references `src/auth.ts` → `cli/src/auth.ts`).
2. Fallback to repo root (`src/auth.ts`).
3. If neither exists, mark broken and report both attempted paths.

### Escape hatch
| Case | Policy |
|---|---|
| `:ignore-start` without `:ignore-end` | ignore until EOF + warn |
| Nested ignore blocks | flattened (first start to first end); nesting unsupported |
| File-level `oma-docs: skip` | doc fully excluded (no `refs: []` entry either) |

### LLM / Reporter
| Case | Policy |
|---|---|
| LLM unavailable (no key, network) | raw JSON output only |
| LLM hallucinates new findings | reporter prompt strict: summarize given DriftReport only |
| Sync proposer suggests destructive change | interactive UI shows full diff; user can reject |
| Token limit exceeded | per-doc batching; otherwise fallback to raw JSON |

### Sync mode secret redaction (T1d)
Before sending diff to LLM:
1. **Exclude files**: `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa*`.
2. **Exclude gitignored**: any staged-but-gitignored file.
3. **Sanitize content**: regex `(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[a-z0-9_\-]{16,}` replaced with `<REDACTED>`.
4. **User notification**: list excluded files in interactive output.

### Concurrency
- Two concurrent hooks → last-write-wins on `doc-refs.json` (no lock; rare in practice).
- Partial-write corruption → next run rewrites from scratch (extractor always overwrites).

---

## Migration: deepinit Step 6

`.agents/workflows/deepinit.md` change:

**Before**: Step 6 re-analyzes codebase, marks stale rules with `<!-- REVIEW: -->`.

**After**:
```markdown
## Step 6: Verify After Updates (Delegated)

This step is now handled by `oma-docs`. After deepinit completes, the user can run:

- `/oma-docs verify`: check generated harness docs against the current codebase
- Set `docs.auto_verify: true` in `oma-config.yaml` to run verify automatically at the end of `/scm` `/work` `/ultrawork` workflows.

deepinit no longer detects drift on update runs; it only generates 0→1 bootstrap content.
```

The legacy `<!-- REVIEW: -->` marker behavior is replaced by the broken-ref report from `oma-docs verify`.

---

## Open Items for PR Phase (T2)

These are not architectural decisions but should be addressed during implementation, before merge.

| # | Item |
|---|---|
| T2a | Markdown parser: `remark` + `unified`; document why. |
| T2b | CLI verification: limit to `which` + first-token match; no `--help` parsing in v1. |
| T2c | Issue #326 close strategy: keep issue open after v1 PR; create v2 follow-up issues per deferred module. |
| T2d | SKILL.md must pass `/oma-skill-creator` validation; add to PR checklist. |
| T2e | Register `cli/commands/docs/` in `cli/AGENTS.md` and `cli/ARCHITECTURE.md` (first dogfooding case). |
| T2f | Issue reply draft: state v1 covers verify + sync; create deferred to v2; mention `lychee` and `code-review-graph` as references reviewed. |

---

## Dogfooding Completion Criteria

v1 is considered complete when:
1. `oma docs verify` runs cleanly on this repo (oh-my-agent itself).
2. Found drift, if any, is reported in normal format (no clean-zero requirement).
3. `oma docs sync` produces sensible patch proposals on a representative diff.
4. `cli/AGENTS.md` and `cli/ARCHITECTURE.md` include the new `commands/docs/` domain.
5. SKILL.md passes `/oma-skill-creator` validation.

---

## References

- Issue [#326](https://github.com/gracefullight/oh-my-agent/issues/326): original feature request and stakeholder discussion.
- [`code-review-graph`](https://github.com/tirth8205/code-review-graph): Tree-sitter based code graph (referenced for v2 L3 path).
- `lychee`: markdown link checker (reference for URL resolution behavior).
- Adjacent skills: `oma-translator` (v2 multilingual integration), `oma-skill-creator` (SSL-lite validation).
- `deepinit` workflow Step 6 retirement coordinated with this design.
