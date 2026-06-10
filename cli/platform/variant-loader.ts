import { readFileSync } from "node:fs";

/**
 * Parse and validate a vendor variant config read from the (untrusted)
 * working project (`.agents/{agents,hooks}/variants/<vendor>.json`).
 *
 * Returns `null` — without throwing — when the file is malformed or when
 * `validate` throws (typically `assertContainedRelPath` on a path-bearing
 * field), so a single bad variant neither crashes the install mid-loop
 * (reliability) nor lets the installer write outside the workspace
 * (security). Both failure modes warn with the variant path for diagnosis.
 */
export function safeLoadVariant<T>(options: {
  variantPath: string;
  /** Used in warning messages, e.g. "hook" → "Skipping malformed hook variant …". */
  kind: string;
  /** Throws to reject the variant as unsafe; return normally to accept. */
  validate: (variant: T) => void;
}): T | null {
  let variant: T;
  try {
    variant = JSON.parse(readFileSync(options.variantPath, "utf-8")) as T;
  } catch (err) {
    console.warn(
      `[oma] Skipping malformed ${options.kind} variant ${options.variantPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
  try {
    options.validate(variant);
  } catch (err) {
    console.warn(
      `[oma] Skipping unsafe ${options.kind} variant ${options.variantPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
  return variant;
}
