/**
 * Migration runner — executes all registered migrations in order.
 * Each migration is idempotent: safe to run multiple times.
 * Returns action log strings for UI display.
 */

export interface Migration {
  name: string;
  up(cwd: string): string[];
}

import { migrateToAgents } from "./001-agents-dir.js";
import { migrateSharedLayout } from "./002-shared-layout.js";
import { migrateOmaConfig } from "./003-oma-config.js";

const migrations: Migration[] = [
  migrateToAgents,
  migrateSharedLayout,
  migrateOmaConfig,
];

export function runMigrations(cwd: string): string[] {
  const actions: string[] = [];
  for (const migration of migrations) {
    actions.push(...migration.up(cwd));
  }
  return actions;
}
