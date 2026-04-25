import { fetchKnowsSidecar, fetchOpenAlexWork, searchOpenAlex } from "./api.js";

const VALID_SECTIONS = new Set([
  "statements",
  "evidence",
  "relations",
  "artifacts",
  "citation",
]);

export function slugFromKnowsId(id: string): string | null {
  // knows:generated/<slug>/<version> -> "<slug>"
  const m = /^knows:[^/]+\/([^/]+)\//.exec(id);
  const slug = m?.[1];
  if (!slug) return null;
  return slug.replace(/-/g, " ");
}

export async function runGet({
  id,
  section,
}: {
  id: string;
  section?: string;
}): Promise<unknown> {
  if (section && !VALID_SECTIONS.has(section)) {
    throw new Error(
      `invalid --section '${section}'. allowed: ${[...VALID_SECTIONS].join(", ")}`,
    );
  }
  if (id.startsWith("knows:")) {
    try {
      return await fetchKnowsSidecar(id, section);
    } catch (err) {
      // Auto-fallback: knows.academy unreachable → derive title slug from
      // record_id and search OpenAlex for the same paper. Returns metadata
      // (no sidecar). Caller can then run Mode 1 Generate from the abstract.
      const titleHint = slugFromKnowsId(id);
      if (titleHint) {
        const oa = await searchOpenAlex(titleHint, { maxResults: 1 });
        if (oa.length > 0) {
          return {
            fallback: "openalex",
            reason: `knows.academy unavailable: ${(err as Error).message}`,
            original_request: id,
            ...oa[0],
          };
        }
      }
      throw err;
    }
  }
  return fetchOpenAlexWork(id);
}
