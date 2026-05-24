# Changelog

All notable changes to oh-my-agent are documented here.

## [Unreleased]

### Added

- `oma install --global` — installs SSOT into `~/.agents/` and reconciles vendor configs at `~/.claude/`, `~/.codex/`, `~/.gemini/`, `~/.qwen/`.
- `oma update --global` — updates the global install; writes updated `_install.json` on success.
- `oma uninstall [--global] [--dry-run]` — removes oma-owned files; dry-run preview separates oma-owned vs user-owned content; oma-config.yaml and mcp.json are always preserved.
- Unified workflow skills: `.agents/skills/<workflow>/SKILL.md` is now the canonical SSOT; per-vendor paths are symlinks into it.
- i18n for install/update warnings and errors — ko + en at minimum; triggered by system locale (`$LANG`), not oma-config.yaml (which is not yet loaded at install time).
- `_install.json` metadata file written on each successful install/update (schemaVersion 1; fields: mode, installedAt, ohMyAgentVersion, vendors, installRoot).
- `_install.lock` concurrency guard with `{pid, hostname, startedAt, uid}`; stale locks are auto-cleared; a second concurrent run aborts cleanly.

### Changed

- `createCliSymlinks` renamed to `createVendorSymlinks`; old name is kept as a deprecated alias for one release cycle.
- Qwen Code symlink support added to `createVendorSymlinks` (`~/.qwen/skills/<n>` → `~/.agents/skills/<n>`).

### Security / Patches

- `safeWriteJson`: atomic tmp-then-rename writes with EXDEV fallback; Date.now()-pid stamped backups pruned to last 3 (3-tier backup).
- `FORBIDDEN_VENDOR_FILES` guard: writing `.claude.json` is rejected at the write layer.
- `createSkillLink` validates symlink targets with `realpathSync`; throws if target escapes the SSOT base directory.
- Windows long-path support: `\\?\` prefix applied automatically when path length exceeds 260 characters.
- Sudo refusal: `oma install` exits with a clear message when run under `sudo` (EC-5).
- `cwd === homedir()` guard: project-mode install from HOME without `--global` prompts interactively; non-interactive mode aborts (EC-12).
- `OMA_HOME` deny-list: `/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc` (and their `realpathSync` equivalents) are rejected.

### Migration

- Migration 011 (`011-unify-workflow-skills`): legacy `.claude/skills/<workflow>/`, `.codex/skills/<workflow>/`, and `.qwen/skills/<workflow>/` real directories that carry the `<!-- oma:generated -->` marker are automatically backed up to `.migration-backup/011/` and converted to relative symlinks pointing at `.agents/skills/<workflow>/`. Directories without the marker are never touched. Running the migration a second time is a no-op. See [docs/migrations/011-unify-workflow-skills.md](./docs/migrations/011-unify-workflow-skills.md) for rollback steps.
