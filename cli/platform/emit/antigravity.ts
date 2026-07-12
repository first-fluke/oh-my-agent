/**
 * Antigravity plugin emit target — deferred.
 *
 * Google announced (May 2026) that Antigravity IDE is migrating its
 * Extensions surface to a plugin format ("Antigravity plugins"), but the
 * manifest schema is not yet publicly documented. `oma` already emits
 * `.agents/agents/*.md` -> abstract agent definitions that Antigravity reads
 * directly (see docs/AGENTS_SPEC.md), so once the plugin manifest shape is
 * published this module should build an Antigravity plugin manifest the
 * same way `claude-plugin.ts` builds a Claude Code marketplace manifest.
 *
 * // TODO(oma-deferred): implement once Google publishes the Antigravity
 * // plugin manifest schema (Extensions -> "Antigravity plugins" migration).
 */

export interface AntigravityEmitReport {
  target: "antigravity-plugin";
  deferred: true;
  reason: string;
}

const DEFERRED_REASON =
  "TODO(oma-deferred): Antigravity plugin manifest format is not yet " +
  "publicly documented (Google's Extensions -> Antigravity plugins " +
  "migration, announced May 2026). No files are written by this target.";

/**
 * Always returns a deferred report; writes nothing to disk. Kept as an
 * explicit module (rather than silently omitted) so the emit surface makes
 * the gap visible instead of pretending Antigravity plugin support exists.
 */
export function emitAntigravityPlugin(): AntigravityEmitReport {
  return {
    target: "antigravity-plugin",
    deferred: true,
    reason: DEFERRED_REASON,
  };
}
