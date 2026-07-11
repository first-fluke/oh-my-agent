# Migrations

Idempotent, ordered migrations that run during `oma install` and `oma update`.

## Adding a new migration

1. Create `NNN-descriptive-name.ts` (zero-padded, next sequential number)
2. Export a `Migration` object with `name` and `up(cwd)` returning `string[]` of action logs
3. Register it in `index.ts`

```ts
// 004-example.ts
import type { Migration } from "./index.js";

export const migrateExample: Migration = {
  name: "004-example",
  up(cwd: string): string[] {
    const actions: string[] = [];
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

## Current migrations

<!-- oma-docs:ignore-start -->
| # | File | Description |
|---|------|-------------|
| 001 | `001-agents-dir.ts` | `.agent/` → `.agents/`, legacy skill/agent renames, `.cursor/skills` cleanup |
| 002 | `002-shared-layout.ts` | `_shared/` flat → `core/conditional/runtime` nested structure |
| 003 | `003-oma-config.ts` | `.agents/config/user-preferences.yaml` → `.agents/oma-config.yaml` |
<!-- oma-docs:ignore-end -->
