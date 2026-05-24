# Migration 011: Unify Vendor Workflow Skills into SSOT Symlinks

## Summary

Before this migration, each vendor runtime kept its own real directory for workflow skills (e.g., `.claude/skills/orchestrate/`, `.codex/skills/orchestrate/`). After this migration, `.agents/skills/<workflow>/` is the single source of truth and per-vendor paths become relative symlinks pointing into it.

The migration is idempotent and safety-gated: only directories that carry the `<!-- oma:generated -->` marker are converted. User-authored skill directories are never touched.

## Before

```
<project>/
  .claude/
    skills/
      orchestrate/         # real directory, oma:generated
        SKILL.md           # contains <!-- oma:generated -->
      my-custom-skill/     # real directory, user-authored (NO marker)
        SKILL.md
  .codex/
    skills/
      orchestrate/         # real directory, oma:generated
        SKILL.md
  .qwen/
    skills/
      orchestrate/         # real directory, oma:generated
        SKILL.md
  .agents/
    skills/
      orchestrate/
        SKILL.md           # canonical SSOT copy
```

## After

```
<project>/
  .claude/
    skills/
      orchestrate -> ../../.agents/skills/orchestrate   # symlink
      my-custom-skill/     # unchanged — user-authored, no marker
        SKILL.md
  .codex/
    skills/
      orchestrate -> ../../.agents/skills/orchestrate   # symlink
  .qwen/
    skills/
      orchestrate -> ../../.agents/skills/orchestrate   # symlink
  .agents/
    skills/
      orchestrate/
        SKILL.md           # canonical SSOT (unchanged)
  .migration-backup/
    011/
      .claude/skills/orchestrate/   # backup of former real directory
      .codex/skills/orchestrate/
      .qwen/skills/orchestrate/
```

## Step-by-Step Execution

1. The migration runner calls `migrateUnifyWorkflowSkills.up(cwd)` automatically during `oma install` and `oma update`.
2. For each vendor (`claude`, `codex`, `qwen`) it scans `.<vendor>/skills/`.
3. For each entry it checks whether the entry is already a symlink (no-op), a user-authored directory (no-op), or an oma-generated directory (convert).
4. Conversion: back up to `.migration-backup/011/.<vendor>/skills/<name>/`, remove the real directory, create a relative symlink.
5. The log of actions is surfaced in the terminal as a "Migration" note.

## Rollback

If you need to revert to real directories:

```bash
# Replace symlink with the backed-up real directory (example: claude/orchestrate)
rm .claude/skills/orchestrate
cp -r .migration-backup/011/.claude/skills/orchestrate .claude/skills/orchestrate
```

Repeat for each vendor and each workflow skill entry as needed. The backup is retained at `.migration-backup/011/` indefinitely — do not delete it until you are satisfied with the migration.

## Idempotency

Running migration 011 a second time produces zero actions:

- Entries that are already symlinks are skipped (no-op path).
- The SSOT target already exists, so no new symlinks are created.
- No backup operations are triggered.

## User-Skill Safety

Directories that do NOT contain `<!-- oma:generated -->` in their `SKILL.md` are classified as user-authored and are never backed up, removed, or replaced. If `SKILL.md` is absent or unreadable the directory is also left untouched.
