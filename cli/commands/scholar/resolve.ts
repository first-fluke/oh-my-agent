import { type Hit, searchKnows, searchOpenAlex } from "./api.js";
import {
  queryToTitleSimilarity,
  titleToTitleSimilarity,
} from "./similarity.js";

export interface ResolveResult {
  query: string;
  knowsAcademy: (Hit & { query_match_score: number }) | null;
  openalex: (Hit & { query_match_score: number }) | null;
  cross_source_similarity: number;
  recommendation: string;
}

const SAME_PAPER_THRESHOLD = 0.7;

export async function runResolve(query: string): Promise<ResolveResult> {
  const [knows, oa] = await Promise.all([
    searchKnows(query, 5),
    searchOpenAlex(query, { maxResults: 5 }),
  ]);
  const knowsTop = knows[0] ?? null;
  const oaTop = oa[0] ?? null;

  const cross =
    knowsTop && oaTop
      ? titleToTitleSimilarity(knowsTop.title ?? "", oaTop.title ?? "")
      : 0;

  let recommendation: string;
  if (knowsTop && oaTop && cross >= SAME_PAPER_THRESHOLD) {
    recommendation = `use knows.academy sidecar (cross-source match ${cross.toFixed(2)}; same paper, rich structure)`;
  } else if (oaTop) {
    recommendation = `use openalex (knows.academy top hit looks like a different paper, cross-sim ${cross.toFixed(2)}) — fetch abstract and run Mode 1 Generate locally for a sidecar`;
  } else if (knowsTop) {
    recommendation =
      "use knows.academy (only source with hits — verify it's the right paper)";
  } else {
    recommendation = "no match in either source";
  }

  return {
    query,
    knowsAcademy: knowsTop
      ? {
          ...knowsTop,
          query_match_score: queryToTitleSimilarity(
            query,
            knowsTop.title ?? "",
          ),
        }
      : null,
    openalex: oaTop
      ? {
          ...oaTop,
          query_match_score: queryToTitleSimilarity(query, oaTop.title ?? ""),
        }
      : null,
    cross_source_similarity: cross,
    recommendation,
  };
}
