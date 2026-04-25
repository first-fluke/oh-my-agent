// HTTP clients for knows.academy and OpenAlex with abstract reconstruction.

const KNOWS_BASE = "https://knows.academy";
const OPENALEX_BASE = "https://api.openalex.org";
const TIMEOUT_MS = 30_000;

export interface KnowsHit {
  source: "knows.academy";
  id: string;
  title: string | null;
  year: number | null;
  venue: string | null;
  summary: string | null;
  lint_passed: boolean | null;
  has_sidecar: true;
}

export interface OpenAlexHit {
  source: "openalex";
  id: string | null;
  doi: string | null;
  title: string | null;
  year: number | null;
  venue: string | null;
  authors: string[];
  abstract: string;
  oa_url: string | null;
  cited_by_count: number | null;
  has_sidecar: false;
}

export type Hit = KnowsHit | OpenAlexHit;

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "oma-scholar/0.1",
        Accept: "application/json",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`request timed out after ${TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export function reconstructAbstract(
  inv: Record<string, number[]> | null | undefined,
): string {
  if (!inv) return "";
  const pos = new Map<number, string>();
  for (const [word, idxs] of Object.entries(inv)) {
    for (const i of idxs) pos.set(i, word);
  }
  return [...pos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, w]) => w)
    .join(" ");
}

function openalexAuthQuery(): URLSearchParams {
  const p = new URLSearchParams();
  if (process.env.OPENALEX_API_KEY)
    p.set("api_key", process.env.OPENALEX_API_KEY);
  if (process.env.OPENALEX_EMAIL) p.set("mailto", process.env.OPENALEX_EMAIL);
  return p;
}

export async function searchKnows(
  query: string,
  maxResults = 20,
): Promise<KnowsHit[]> {
  try {
    const url = `${KNOWS_BASE}/api/proxy/search?q=${encodeURIComponent(query)}`;
    const d = (await getJson(url)) as {
      results?: Array<Record<string, unknown>>;
    };
    return (d.results ?? []).slice(0, maxResults).map((r) => ({
      source: "knows.academy" as const,
      id: String(r.record_id ?? ""),
      title: (r.title as string | null) ?? null,
      year: (r.year as number | null) ?? null,
      venue: (r.venue as string | null) ?? null,
      summary: (r.summary as string | null) ?? null,
      lint_passed: (r.lint_passed as boolean | null) ?? null,
      has_sidecar: true,
    }));
  } catch (err) {
    process.stderr.write(
      `knows.academy search failed: ${(err as Error).message}\n`,
    );
    return [];
  }
}

export async function searchOpenAlex(
  query: string,
  options: { yearMin?: number; maxResults?: number } = {},
): Promise<OpenAlexHit[]> {
  const params = openalexAuthQuery();
  params.set("search", query);
  params.set("per_page", String(options.maxResults ?? 20));
  if (options.yearMin !== undefined) {
    params.set("filter", `from_publication_date:${options.yearMin}-01-01`);
  }
  try {
    const d = (await getJson(`${OPENALEX_BASE}/works?${params}`)) as {
      results?: Array<Record<string, unknown>>;
    };
    return (d.results ?? []).map((r) => normalizeOpenAlexWork(r));
  } catch (err) {
    process.stderr.write(`openalex error: ${(err as Error).message}\n`);
    return [];
  }
}

function normalizeOpenAlexWork(r: Record<string, unknown>): OpenAlexHit {
  const primaryLocation = (r.primary_location as Record<string, unknown>) ?? {};
  const source = (primaryLocation.source as Record<string, unknown>) ?? {};
  const oa = (r.open_access as Record<string, unknown>) ?? {};
  const authorships = (r.authorships as Array<Record<string, unknown>>) ?? [];
  return {
    source: "openalex",
    id: (r.id as string | null) ?? null,
    doi: (r.doi as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    year: (r.publication_year as number | null) ?? null,
    venue: (source.display_name as string | null) ?? null,
    authors: authorships
      .map((a) => (a.author as Record<string, unknown> | null)?.display_name)
      .filter((x): x is string => typeof x === "string"),
    abstract: reconstructAbstract(
      r.abstract_inverted_index as Record<string, number[]> | null,
    ),
    oa_url: (oa.oa_url as string | null) ?? null,
    cited_by_count: (r.cited_by_count as number | null) ?? null,
    has_sidecar: false,
  };
}

export async function fetchKnowsSidecar(
  recordId: string,
  section?: string,
): Promise<unknown> {
  const enc = encodeURIComponent(recordId);
  const url = section
    ? `${KNOWS_BASE}/api/proxy/partial?record_id=${enc}&section=${encodeURIComponent(section)}`
    : `${KNOWS_BASE}/api/proxy/sidecars/${enc}`;
  return getJson(url);
}

export async function fetchOpenAlexWork(
  identifier: string,
): Promise<OpenAlexHit> {
  const params = openalexAuthQuery();
  let url: string;
  if (identifier.startsWith("https://doi.org/") || /^10\./.test(identifier)) {
    const doi = identifier.replace(/^https:\/\/doi\.org\//, "");
    url = `${OPENALEX_BASE}/works/doi:${doi}`;
  } else if (identifier.startsWith("https://openalex.org/")) {
    url = identifier;
  } else {
    url = `${OPENALEX_BASE}/works/${identifier}`;
  }
  const qs = params.toString();
  if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  return normalizeOpenAlexWork((await getJson(url)) as Record<string, unknown>);
}
