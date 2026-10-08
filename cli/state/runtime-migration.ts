import { projectIdentity } from "../../.agents/hooks/core/session-storage.js";
import { migrateMemoryRetry } from "./memory-retry-migration.js";
import { migrateProjectRuntime } from "./project-runtime-migration.js";
import type {
  RuntimeMigrationEntry,
  RuntimeMigrationOptions,
} from "./runtime-migration-types.js";

export interface RuntimeMigrationResult {
  ok: boolean;
  dryRun: boolean;
  profile: string;
  projectDir: string;
  entries: RuntimeMigrationEntry[];
}

/** One-time transfer; normal runtime readers never consult the old locations. */
export async function migrateRuntimeState(
  options: RuntimeMigrationOptions,
): Promise<RuntimeMigrationResult> {
  const identity = projectIdentity(options.projectDir);
  const resolved = { ...options, projectDir: identity.projectDir };
  const entries = [
    ...(await migrateProjectRuntime(resolved)),
    ...(await migrateMemoryRetry(resolved)),
  ];
  return {
    ok: !entries.some(
      (entry) => entry.status === "conflict" || entry.status === "deferred",
    ),
    dryRun: options.dryRun === true,
    profile: identity.profile,
    projectDir: identity.projectDir,
    entries,
  };
}

export function renderRuntimeMigration(result: RuntimeMigrationResult): string {
  if (!result.entries.length) return "No project runtime files to migrate";
  const prefix = result.dryRun ? "[dry-run] " : "";
  return result.entries
    .map(
      (entry) =>
        `${prefix}${entry.status}: ${entry.source}${entry.destination ? ` -> ${entry.destination}` : ""}${entry.reason ? ` (${entry.reason})` : ""}`,
    )
    .join("\n");
}
