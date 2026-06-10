/**
 * Pure helpers for `oma market render`: version lookup, slug/date
 * formatting, and comparison-intent detection.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderOptions } from "./types.js";

// ---------------------------------------------------------------------------
// Module-scope constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const PKG_JSON_PATH = join(__filename, "../../../../package.json");

let _cachedVersion: string | undefined;

export function getPackageVersion(): string {
  if (_cachedVersion !== undefined) return _cachedVersion;
  try {
    const raw = readFileSync(PKG_JSON_PATH, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    _cachedVersion = pkg.version ?? "0.0.0";
  } catch {
    _cachedVersion = "0.0.0";
  }
  return _cachedVersion;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  // Lowercase, replace non-alphanumeric and non-Korean with hyphen
  const slug = text
    .toLowerCase()
    .replace(/[^\w가-힣가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.slice(0, 60);
}

export function utcDate(nowMs: number): string {
  const d = new Date(nowMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function utcDateCompact(nowMs: number): string {
  return utcDate(nowMs).replace(/-/g, "");
}

export function isComparisonIntent(opts: RenderOptions): boolean {
  if (opts.intent === "competitor") return true;
  if (opts.vs != null && opts.vs.trim().length > 0) return true;
  // require " vs " / " versus " surrounded by whitespace, avoiding "VS Code"
  // and similar prefixed brand names.
  if (/\s+vs\.?\s+|\s+versus\s+/i.test(opts.topic)) return true;
  return false;
}

export function extractVsEntities(
  topic: string,
  vs: string | null | undefined,
): [string, string] {
  // entity A and B for COMPARISON layout
  const vsMatch = /^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i.exec(topic);
  if (vsMatch?.[1] != null && vsMatch[2] != null) {
    return [vsMatch[1].trim(), vsMatch[2].trim()];
  }
  if (vs != null && vs.trim().length > 0) {
    return [topic, vs.trim()];
  }
  return [topic, "Competitor"];
}
