import { readManifest } from "./manifest.js";
import {
  expectedScheduleCommand,
  isStaleScheduleCommand,
  type SchedulerPort,
  selectAdapter,
} from "./port.js";

export interface SyncSchedulesResult {
  /** Manifest jobs that were absent from the OS scheduler and re-registered. */
  synced: number;
  /** Registered jobs whose OS command was stale and got rewritten. */
  resynced: number;
  /** Orphan OS jobs removed (only with `prune`). */
  pruned: number;
}

/**
 * Labels whose OS registration exists but carries a command the current CLI
 * no longer accepts. Adapters without `readCommand` report none.
 */
export async function findStaleLabels(
  port: SchedulerPort,
  jobs: ReadonlyArray<{ id: string; osJobLabel: string }>,
  osLabelSet: ReadonlySet<string>,
): Promise<Set<string>> {
  const stale = new Set<string>();
  if (!port.readCommand) return stale;
  for (const job of jobs) {
    if (!osLabelSet.has(job.osJobLabel)) continue;
    try {
      const registered = await port.readCommand(job.osJobLabel);
      if (isStaleScheduleCommand(registered, job.id)) stale.add(job.osJobLabel);
    } catch {
      // Unreadable registration — leave it as synced rather than guess.
    }
  }
  return stale;
}

export async function syncSchedules(
  options: { prune?: boolean; log?: (line: string) => void } = {},
): Promise<SyncSchedulesResult> {
  const log = options.log ?? (() => {});
  const result: SyncSchedulesResult = { synced: 0, resynced: 0, pruned: 0 };
  const manifest = readManifest();
  if (manifest.jobs.length === 0 && !options.prune) return result;

  const port = await selectAdapter();
  const osLabels = await port.listLabels();
  const osLabelSet = new Set(osLabels);
  const staleLabels = await findStaleLabels(port, manifest.jobs, osLabelSet);

  for (const job of manifest.jobs) {
    const missing = !osLabelSet.has(job.osJobLabel);
    const stale = staleLabels.has(job.osJobLabel);
    if (!missing && !stale) continue;
    await port.upsert({
      id: job.id,
      cron: job.cron,
      command: expectedScheduleCommand(job.id),
      label: job.osJobLabel,
      workspace: job.workspace,
    });
    if (missing) {
      result.synced++;
      log(`  synced: ${job.id} → ${job.osJobLabel}`);
    } else {
      result.resynced++;
      log(`  resynced (stale command): ${job.id} → ${job.osJobLabel}`);
    }
  }

  if (options.prune) {
    const manifestLabelSet = new Set(
      manifest.jobs.map((job) => job.osJobLabel),
    );
    for (const label of osLabels) {
      if (!manifestLabelSet.has(label)) {
        await port.remove(label);
        result.pruned++;
        log(`  pruned: ${label}`);
      }
    }
  }

  return result;
}
