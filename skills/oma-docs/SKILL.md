---
name: oma-docs
description: Check documentation references, sync docs to code changes, and
  detect translation drift. Use for documentation maintenance in a repository.
---

# Documentation Maintenance

## Scheduling

### Goal
Keep documentation aligned with repository behavior and report verification limits.

### Intent signature
Check references, update docs for a code diff, identify translation drift, or lint localized prose.

### When to use
Repository documentation verification, diff-based synchronization, and translation maintenance.

### When NOT to use
- General source research -> oma-search.
- Application implementation -> the owning specialist.
- Translating known text -> oma-translation.

### Expected inputs
Mode (`verify`, `sync`, `i18n`, or `lint`), target paths or diff range, and authorized edit scope. Use `verify` when no mode is specified.

### Expected outputs
Findings with paths and evidence, authorized patches when requested, and unresolved checks. CLI reports remain distinct from host-authored interpretation.

### Dependencies
The `oma docs` CLI, Git for diff-based work, and repository docs. `lychee` is optional for URL verification. Read `resources/commands.md` for flags and output files of the selected mode.

## Structural Flow

### Transitions
- `verify`: extract and resolve references, then summarize the report.
- `sync`: obtain candidates, read relevant docs and diffs, and apply only authorized corrections.
- `i18n` / `lint`: report drift or style issues; use oma-translation for authorized corrections.
- Review-only requests produce proposals. Existing scoped edit requests authorize applying those corrections without another per-file approval.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Missing CLI | Report unavailable automated checks; continue useful scoped inspection without presenting it as a CLI verification |
| Missing lychee or incomplete URL scan | Report core results and the unverified URL scope |
| One document cannot be parsed | Record the skipped file and continue other documents |
| Patch does not apply | Re-read the affected current content and make the equivalent authorized correction |
| Index write fails | Report the failure; do not claim the index or check is complete |

### Exit
Report verified findings, edits made, and remaining gaps. A clean reference scan does not establish semantic correctness or complete translation quality.

## Logical Operations

### Canonical command path
1. Select mode, paths/diff, and authorization from the request. Read only the matching section of `resources/commands.md`.
2. Run `oma docs verify --json`, `oma docs sync <range> --json`, `oma docs i18n --json`, or `oma docs lint --json` as appropriate. For sync, use the requested range; otherwise staged changes, then `HEAD~1..HEAD`.
3. Inspect the structured results. Verify each proposed correction against current code and document context. Exclude secret-bearing files and values from patches and reports.
4. Apply corrections already authorized by the user or assigned task. Ask only about material missing decisions or new scope; continue independent work while waiting.
5. Re-run affected checks after edits and record remaining failures. Regenerate the reference index once after a patch batch when needed.

### Resource scope and effects
Verification regenerates `docs/generated/doc-refs.json`; optional URL results go to `docs/generated/url-drift.json`. Sync's CLI emits candidate data; the host drafts and applies patches. i18n/lint commands report only. A workflow hook runs only when `docs.auto_verify` is enabled and is warn-only.

### Guardrails
- Follow `../_shared/core/execution-policy.md` for authorization and completion.
- Keep review-only requests read-only and changes within the assigned diff or acceptance criteria.
- Do not expose secret-bearing files (`.env*`, private keys, credentials) in diff reports.
- The CLI produces structured data; the host performs natural-language synthesis. Do not invent CLI findings or call a vendor LLM API from the docs CLI.
- Honor ignore blocks, `oma-docs: skip`, and configured exclusions. Missing gitignored runtime outputs are skipped, not broken references.
- Preserve language, terminology, and placeholders when applying localized corrections.

## References
- Mode commands, flags, and outputs: `resources/commands.md` (selected operation only).
- Translation: `../oma-translation/SKILL.md` (localized correction).
- Authorization: `../_shared/core/execution-policy.md` (when not already provided).