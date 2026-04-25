import { type Hit, searchKnows, searchOpenAlex } from "./api.js";

export interface SearchResult {
  query: string;
  primary: "knows.academy";
  fallback: "openalex" | null;
  results: Hit[];
}

export async function runSearch({
  query,
  max = 10,
  yearMin,
  alwaysFallback = false,
}: {
  query: string;
  max?: number;
  yearMin?: number;
  alwaysFallback?: boolean;
}): Promise<SearchResult> {
  const knowsHits = await searchKnows(query, max);
  let oaHits: Hit[] = [];
  if (knowsHits.length === 0 || alwaysFallback) {
    oaHits = await searchOpenAlex(query, { yearMin, maxResults: max });
  }
  return {
    query,
    primary: "knows.academy",
    fallback: oaHits.length > 0 ? "openalex" : null,
    results: [...knowsHits, ...oaHits],
  };
}
