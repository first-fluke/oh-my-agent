// Title similarity helpers used to dedup across knows.academy and OpenAlex.

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "and",
  "in",
  "on",
  "to",
  "is",
  "are",
  "with",
]);

function normalizeWords(s: string | null | undefined): Set<string> {
  if (!s) return new Set();
  const out = new Set<string>();
  for (const raw of s.split(/\s+/)) {
    const w = raw
      .replace(/^[.,:;!?()[\]"']+|[.,:;!?()[\]"']+$/g, "")
      .toLowerCase();
    if (w && !STOP_WORDS.has(w)) out.add(w);
  }
  return out;
}

/** Asymmetric: how well does the query cover the title? overlap / |query| */
export function queryToTitleSimilarity(query: string, title: string): number {
  const qw = normalizeWords(query);
  const tw = normalizeWords(title);
  if (qw.size === 0 || tw.size === 0) return 0;
  let inter = 0;
  for (const w of qw) if (tw.has(w)) inter++;
  return inter / qw.size;
}

/** Symmetric Jaccard between two full titles — for cross-source dedup. */
export function titleToTitleSimilarity(a: string, b: string): number {
  const wa = normalizeWords(a);
  const wb = normalizeWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}
