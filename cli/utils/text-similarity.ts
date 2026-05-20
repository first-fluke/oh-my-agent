const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "use",
  "used",
  "uses",
  "using",
  "when",
  "this",
  "any",
  "all",
  "via",
  "into",
  "across",
  "between",
  "within",
  "based",
  "while",
  "than",
  "etc",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function inverseDocFreq(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const tokens of docs) {
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  const n = docs.length;
  for (const [term, count] of df) {
    idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
  }
  return idf;
}

function tfidfVector(
  tokens: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const tf = termFreq(tokens);
  const vec = new Map<string, number>();
  const total = tokens.length || 1;
  for (const [term, count] of tf) {
    const weight = (count / total) * (idf.get(term) ?? 0);
    if (weight > 0) vec.set(term, weight);
  }
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, w] of a) normA += w * w;
  for (const [, w] of b) normB += w * w;
  if (normA === 0 || normB === 0) return 0;
  const smaller = a.size < b.size ? a : b;
  const larger = a.size < b.size ? b : a;
  for (const [term, wa] of smaller) {
    const wb = larger.get(term);
    if (wb) dot += wa * wb;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SimilarityPair {
  a: string;
  b: string;
  similarity: number;
}

export function pairwiseSimilarity(
  docs: Array<{ id: string; text: string }>,
): SimilarityPair[] {
  if (docs.length < 2) return [];
  const tokenized = docs.map((d) => tokenize(d.text));
  const idf = inverseDocFreq(tokenized);
  const vectors = tokenized.map((t) => tfidfVector(t, idf));

  const pairs: SimilarityPair[] = [];
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const docI = docs[i];
      const docJ = docs[j];
      const vecI = vectors[i];
      const vecJ = vectors[j];
      if (!docI || !docJ || !vecI || !vecJ) continue;
      const sim = cosine(vecI, vecJ);
      pairs.push({ a: docI.id, b: docJ.id, similarity: sim });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity);
}
