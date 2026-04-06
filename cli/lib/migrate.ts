/**
 * @deprecated — Use `commands/migrations/` instead.
 * Re-exports migration functions for backward compatibility with existing tests.
 */

import { migrateToAgents as _migrateToAgents } from "../commands/migrations/001-agents-dir.js";
import { migrateSharedLayout as _migrateSharedLayout } from "../commands/migrations/002-shared-layout.js";

export const migrateToAgents = (cwd: string) => _migrateToAgents.up(cwd);
export const migrateSharedLayout = (cwd: string) =>
  _migrateSharedLayout.up(cwd);
