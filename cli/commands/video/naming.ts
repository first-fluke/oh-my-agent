import {
  formatTimestamp,
  renderPattern,
  shortId,
} from "../../utils/run-naming.js";

export {
  formatTimestamp,
  renderPattern,
  shortId,
} from "../../utils/run-naming.js";

export interface VideoRunId {
  timestamp: string;
  shortid: string;
  mode: string;
  value: string;
}

export function makeVideoRunId(mode: string, date = new Date()): VideoRunId {
  const timestamp = formatTimestamp(date);
  const id = { timestamp, shortid: shortId(), mode };
  return { ...id, value: renderPattern("{timestamp}-{shortid}-{mode}", id) };
}

/**
 * Filename-safe slug for the output mp4 (`<mode>-<slug>.mp4`). Deterministic
 * pure function of the script title: lowercase, unicode letters/digits kept
 * (CJK titles stay readable), everything else collapsed to single dashes,
 * capped so the filename stays shareable.
 */
export function slugify(input: string, maxLen = 40): string {
  const slug = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/, "");
  return slug.length > 0 ? slug : "video";
}
