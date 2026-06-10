export function classifyUpdateTarget(
  localVersion: string | null,
  hasExistingInstall: boolean,
): "ready" | "legacy" | "missing" {
  if (localVersion !== null) return "ready";
  return hasExistingInstall ? "legacy" : "missing";
}

/**
 * Decide which freshly-copied skills to prune after the bulk `.agents` copy.
 *
 * An update overwrites the whole `.agents` tree with the release, which drops
 * in every skill the release ships. To preserve the selection the user made at
 * install time, we prune skills that are new in the release and were not already
 * present — unless the user opts into them with `--with-new-skills`.
 *
 * @param installedBefore skill dirs present before the copy (the user's selection)
 * @param installedAfter  skill dirs present after the copy (the full release set)
 * @param withNewSkills   when true, keep new skills instead of pruning them
 * @returns skill names to remove (sorted): new in the release and not opted in
 */
export function selectSkillsToPrune(
  installedBefore: string[],
  installedAfter: string[],
  withNewSkills: boolean,
): string[] {
  if (withNewSkills) return [];
  const kept = new Set(installedBefore);
  return installedAfter
    .filter((name) => name.startsWith("oma-") && !kept.has(name))
    .sort();
}
