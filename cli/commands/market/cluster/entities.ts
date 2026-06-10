/**
 * Pure helpers for entity extraction and set similarity used by
 * `oma market cluster`.
 */

import { STOPWORDS, STOPWORDS_KO } from "./constants.js";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Extract Hangul syllable n-grams. Korean has no inter-word spaces in
 * many compounds (`카페24`, `쇼핑몰`, `워드프레스`). Use bigrams + trigrams
 * over Hangul runs so that overlapping topics ("카페24 호스팅" vs
 * "카페24 셀러 수수료") share at least the "카페24" trigram.
 */
function extractHangulNgrams(text: string): string[] {
  const ngrams: string[] = [];
  // Capture sequences of Hangul syllables (possibly with digits/letters mixed)
  const runs = text.match(/[가-힣]+[\w]*|[\w]*[가-힣]+/g) ?? [];
  for (const run of runs) {
    // Pure Hangul → bigrams/trigrams
    if (run.length >= 2) {
      // The whole run is also a candidate (helps for short compounds like 쇼핑몰)
      if (run.length <= 8) ngrams.push(run);
      // Trigrams for finer matching
      for (let i = 0; i + 3 <= run.length && i < 10; i++) {
        ngrams.push(run.slice(i, i + 3));
      }
    }
  }
  return ngrams;
}

/**
 * Extract meaningful entities from text. Mixed-script aware (Latin/digit
 * tokens via whitespace split + filter; Korean via Hangul n-gram extraction).
 * Returns a lowercase set of tokens that pass the keep criteria.
 */
export function extractEntities(text: string): Set<string> {
  const result = new Set<string>();

  // --- Latin / digit tokens (whitespace-separated) ---
  // Replace non-word chars (excluding Hangul) with spaces; Hangul runs are
  // handled separately below so we don't lose them via `[^\w]` (which in JS
  // regex `\w` does NOT include Hangul).
  const cleanedLatin = text.replace(/[^\w가-힣\s]/g, " ");
  for (const word of cleanedLatin.split(/\s+/)) {
    if (!word) continue;
    // Pure-Hangul tokens are handled by the n-gram path below; skip here.
    if (/^[가-힣]+$/.test(word)) continue;

    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (word.length <= 2) continue;

    const firstChar = word[0];
    const firstUpper =
      firstChar !== undefined &&
      firstChar === firstChar.toUpperCase() &&
      firstChar !== firstChar.toLowerCase();
    const allUpper = word === word.toUpperCase() && /[A-Z]/.test(word);
    const hasDigit = /\d/.test(word);
    const longEnough = word.length >= 4;

    if (firstUpper || allUpper || hasDigit || longEnough) {
      result.add(lower);
    }
  }

  // --- Korean n-gram tokens ---
  for (const ng of extractHangulNgrams(text)) {
    if (STOPWORDS_KO.has(ng)) continue;
    result.add(ng);
  }

  return result;
}

/**
 * Overlap coefficient: |A ∩ B| / min(|A|, |B|).
 * Returns 0 if either set is empty.
 */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / Math.min(a.size, b.size);
}
