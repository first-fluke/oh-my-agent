# Migrations

Idempotent, ordered migrations that run during `oma install` and `oma update`.

## Adding a new migration

1. Create `NNN-descriptive-name.ts` (zero-padded, next sequential number)
2. Export a `Migration` object with `name` and `up(cwd, ctx)` returning `string[]` of action logs
3. Register it in `index.ts`

```ts
// 004-example.ts
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

export const migrateExample: Migration = {
  name: "004-example",
  up(cwd: string, ctx?: MigrationContext): string[] {
    const actions: string[] = [];
    if (allowsVendor(ctx, "codex")) {
      // writes under .codex/ go here
    }
    // idempotent logic here
    return actions;
  },
};
```

## Rules

- **Idempotent** — safe to run multiple times, skip if already applied
- **No down** — migrations are forward-only
- **Return actions** — every meaningful change should be logged as a string for UI display
- **Best-effort** — wrap risky operations in try/catch, don't crash the install/update flow
- **Gate vendor writes** — anything written under a vendor-owned path (`.codex/`,
  `.qwen/`, `.cursor/`, `.mcp.json`, `~/.claude.json`, …) must be guarded by
  `allowsVendor(ctx, vendor)`. Those files exist whenever the user installed
  that CLI, with or without oma, so file existence is not consent to write —
  only the run's vendor selection is. Paths oma owns (`.agents/**`,
  `.serena/project.yml`) need no gate.

## Current migrations

<!-- oma-docs:ignore-start -->
| # | File | Description |
|---|------|-------------|
| 001 | `001-agents-dir.ts` | `.agent/` → `.agents/`, legacy skill/agent renames, `.cursor/skills` cleanup |
| 002 | `002-shared-layout.ts` | `_shared/` flat → `core/conditional/runtime` nested structure |
| 003 | `003-oma-config.ts` | `.agents/config/user-preferences.yaml` → `.agents/oma-config.yaml` |
| 028 | `028-profile-sessions.ts` | Verified copy of inactive legacy sessions and archives to home profile 0; removes verified originals without backups and defers active sessions |
| 031 | `031-claude-md-agents.ts` | Once `claude --version` is ≥ 2.1.277 (Claude Code reads `AGENTS.md` natively), strips the legacy OMA block from `./CLAUDE.md`: deletes the file when the block was its sole content, otherwise appends an `@AGENTS.md` import so the surviving `CLAUDE.md` does not shadow `AGENTS.md` |
<!-- oma-docs:ignore-end -->
