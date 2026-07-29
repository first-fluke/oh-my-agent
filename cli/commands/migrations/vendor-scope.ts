/**
 * Vendor gating for migrations.
 *
 * Migrations historically decided whether to touch a vendor's runtime config by
 * asking a single question: does the file exist? That conflates "oma configured
 * this vendor" with "this vendor's CLI happens to be installed on the machine",
 * so a user who has (say) Codex installed independently gets `.codex/config.toml`
 * rewritten even after deselecting Codex in the install prompt — which the
 * prompt's own copy ("deselect all to skip") promises will not happen.
 *
 * Migrations that write into a vendor-owned path must therefore ask
 * `allowsVendor(ctx, vendor)` first. Paths oma itself owns (`.agents/**`,
 * `.serena/project.yml`) stay ungated: they exist only because oma created them.
 */
import type { CliVendor } from "../../types/index.js";

export interface MigrationContext {
  /**
   * Vendors this run may write to.
   *
   * - `CliVendor[]` — the selection in force for this install/update run.
   *   An empty array means "no vendor writes at all", which is what the
   *   pre-prompt pass of `oma install` uses: the selection does not exist yet,
   *   so guessing is exactly the bug this gate prevents.
   * - `null` — unrestricted. For callers with no selection to enforce
   *   (standalone migration runs, tests).
   */
  vendors: readonly CliVendor[] | null;
}

/** Context for callers that have no vendor selection to enforce. */
export const UNRESTRICTED_MIGRATION_CONTEXT: MigrationContext = {
  vendors: null,
};

/** True when `vendor`'s files may be written during this migration run. */
export function allowsVendor(
  ctx: MigrationContext | undefined,
  vendor: CliVendor,
): boolean {
  const vendors = ctx?.vendors;
  if (!vendors) return true;
  return vendors.includes(vendor);
}
