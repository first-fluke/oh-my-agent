/**
 * DriftReport types for the docs resolver.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import type { DocRef } from "../../../types/docs.js";

// ---------------------------------------------------------------------------
// DriftReport types
// ---------------------------------------------------------------------------

export interface BrokenRef {
  doc: string;
  line: number;
  kind: DocRef["kind"];
  target: string;
  reason: string;
}

export interface SkippedRef {
  doc: string;
  line: number;
  kind: DocRef["kind"];
  target: string;
  reason: string;
}

export interface DriftReport {
  scannedDocs: number;
  totalRefs: number;
  broken: BrokenRef[];
  skipped: SkippedRef[];
}
