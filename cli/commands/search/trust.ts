import { httpFetch } from "./http.js";

/**
 * Trust scoring — hybrid of static registry + heuristics + Tranco ranking.
 * This module is the single source of truth for domain trust scores;
 * `oma-search` resources/trust-registry.md documents it. Tranco provides a
 * popularity prior for unknown domains, capped below the verified threshold.
 */

export type TrustLevel =
  | "verified"
  | "official"
  | "community"
  | "external"
  | "unknown";

export interface TrustScore {
  domain: string;
  level: TrustLevel;
  score: number | null;
  tags: string[];
  source: "registry" | "heuristic" | "tranco";
  rank?: number;
}

const REGISTRY: Record<string, TrustScore> = {
  "github.com": {
    domain: "github.com",
    level: "verified",
    score: 0.95,
    tags: ["code-host"],
    source: "registry",
  },
  "docs.github.com": {
    domain: "docs.github.com",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "gitlab.com": {
    domain: "gitlab.com",
    level: "verified",
    score: 0.95,
    tags: ["code-host"],
    source: "registry",
  },
  "developer.mozilla.org": {
    domain: "developer.mozilla.org",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "nextjs.org": {
    domain: "nextjs.org",
    level: "verified",
    score: 0.9,
    tags: ["vendor", "lang-docs"],
    source: "registry",
  },
  "vercel.com": {
    domain: "vercel.com",
    level: "verified",
    score: 0.9,
    tags: ["vendor"],
    source: "registry",
  },
  "typescriptlang.org": {
    domain: "typescriptlang.org",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "stackoverflow.com": {
    domain: "stackoverflow.com",
    level: "community",
    score: 0.7,
    tags: ["qna"],
    source: "registry",
  },
  "stackexchange.com": {
    domain: "stackexchange.com",
    level: "community",
    score: 0.7,
    tags: ["qna"],
    source: "registry",
  },
  "w3.org": {
    domain: "w3.org",
    level: "verified",
    score: 0.95,
    tags: ["standards"],
    source: "registry",
  },
  "tc39.es": {
    domain: "tc39.es",
    level: "verified",
    score: 0.95,
    tags: ["standards"],
    source: "registry",
  },
  "ietf.org": {
    domain: "ietf.org",
    level: "verified",
    score: 0.95,
    tags: ["standards"],
    source: "registry",
  },
  "datatracker.ietf.org": {
    domain: "datatracker.ietf.org",
    level: "verified",
    score: 0.95,
    tags: ["standards"],
    source: "registry",
  },
  "owasp.org": {
    domain: "owasp.org",
    level: "verified",
    score: 0.95,
    tags: ["standards"],
    source: "registry",
  },
  "dev.to": {
    domain: "dev.to",
    level: "external",
    score: 0.4,
    tags: ["blog"],
    source: "registry",
  },
  "medium.com": {
    domain: "medium.com",
    level: "external",
    score: 0.35,
    tags: ["blog"],
    source: "registry",
  },
  "hashnode.com": {
    domain: "hashnode.com",
    level: "external",
    score: 0.35,
    tags: ["blog"],
    source: "registry",
  },
  "substack.com": {
    domain: "substack.com",
    level: "external",
    score: 0.35,
    tags: ["blog"],
    source: "registry",
  },
  "velog.io": {
    domain: "velog.io",
    level: "external",
    score: 0.3,
    tags: ["blog", "kr"],
    source: "registry",
  },
  "tistory.com": {
    domain: "tistory.com",
    level: "external",
    score: 0.3,
    tags: ["blog", "kr"],
    source: "registry",
  },
  "w3schools.com": {
    domain: "w3schools.com",
    level: "external",
    score: 0.3,
    tags: ["tutorial"],
    source: "registry",
  },
  "geeksforgeeks.org": {
    domain: "geeksforgeeks.org",
    level: "external",
    score: 0.3,
    tags: ["tutorial"],
    source: "registry",
  },
  "freecodecamp.org": {
    domain: "freecodecamp.org",
    level: "external",
    score: 0.45,
    tags: ["tutorial"],
    source: "registry",
  },
  "baeldung.com": {
    domain: "baeldung.com",
    level: "external",
    score: 0.45,
    tags: ["tutorial"],
    source: "registry",
  },
  "npmjs.com": {
    domain: "npmjs.com",
    level: "verified",
    score: 0.9,
    tags: ["registry"],
    source: "registry",
  },
  "pypi.org": {
    domain: "pypi.org",
    level: "verified",
    score: 0.9,
    tags: ["registry"],
    source: "registry",
  },
  "crates.io": {
    domain: "crates.io",
    level: "verified",
    score: 0.9,
    tags: ["registry"],
    source: "registry",
  },
  "pub.dev": {
    domain: "pub.dev",
    level: "verified",
    score: 0.9,
    tags: ["registry"],
    source: "registry",
  },
  "news.ycombinator.com": {
    domain: "news.ycombinator.com",
    level: "community",
    score: 0.65,
    tags: ["news"],
    source: "registry",
  },
  "reddit.com": {
    domain: "reddit.com",
    level: "community",
    score: 0.55,
    tags: ["forum"],
    source: "registry",
  },
  "wikipedia.org": {
    domain: "wikipedia.org",
    level: "community",
    score: 0.75,
    tags: ["encyclopedia"],
    source: "registry",
  },
  "arxiv.org": {
    domain: "arxiv.org",
    level: "verified",
    score: 0.9,
    tags: ["academic"],
    source: "registry",
  },
  "doi.org": {
    domain: "doi.org",
    level: "verified",
    score: 0.95,
    tags: ["academic"],
    source: "registry",
  },
  "react.dev": {
    domain: "react.dev",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "go.dev": {
    domain: "go.dev",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "rust-lang.org": {
    domain: "rust-lang.org",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "python.org": {
    domain: "python.org",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
  "nodejs.org": {
    domain: "nodejs.org",
    level: "verified",
    score: 0.95,
    tags: ["lang-docs"],
    source: "registry",
  },
};

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

function registryLookup(domain: string): TrustScore | null {
  if (domain in REGISTRY) {
    const record = REGISTRY[domain];
    return record ? { ...record } : null;
  }
  const stripped = stripWww(domain);
  if (stripped in REGISTRY) {
    const record = REGISTRY[stripped];
    return record ? { ...record } : null;
  }
  return null;
}

function heuristic(domain: string): TrustScore | null {
  const tld = domain.split(".").pop();
  if (tld === "gov" || tld === "edu" || tld === "mil") {
    return {
      domain,
      level: "verified",
      score: 0.9,
      tags: ["institution"],
      source: "heuristic",
    };
  }
  if (/\.gov\.[a-z]{2}$/.test(domain) || /\.ac\.[a-z]{2}$/.test(domain)) {
    return {
      domain,
      level: "verified",
      score: 0.85,
      tags: ["institution"],
      source: "heuristic",
    };
  }
  if (/^docs\./.test(domain) || /\.docs\./.test(domain)) {
    return {
      domain,
      level: "verified",
      score: 0.9,
      tags: ["docs-subdomain"],
      source: "heuristic",
    };
  }
  if (/^developers?\./.test(domain)) {
    return {
      domain,
      level: "verified",
      score: 0.85,
      tags: ["dev-portal"],
      source: "heuristic",
    };
  }
  return null;
}

// Domains arrive from externally-parsed URL hostnames; only well-formed public
// FQDNs may be interpolated into the Tranco request (SSRF guard).
const FQDN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i;

export function isSafePublicDomain(domain: string): boolean {
  return (
    domain.length <= 253 &&
    FQDN_RE.test(domain) &&
    !PRIVATE_HOST_RE.test(domain)
  );
}

async function trancoRank(domain: string): Promise<TrustScore | null> {
  if (!isSafePublicDomain(domain)) return null;
  try {
    const resp = await httpFetch(
      `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`,
      { timeoutMs: 5000 },
    );
    if (!resp.ok) return null;
    const data = JSON.parse(resp.text) as {
      ranks?: Array<{ rank: number }>;
    };
    const rank = data.ranks?.[0]?.rank;
    if (!rank) return null;
    const score = rank < 10_000 ? 0.6 : rank < 100_000 ? 0.4 : 0.2;
    return {
      domain,
      level: rank < 10_000 ? "community" : "external",
      score,
      tags: ["tranco"],
      source: "tranco",
      rank,
    };
  } catch {
    return null;
  }
}

export async function trustScore(domain: string): Promise<TrustScore> {
  const direct = registryLookup(domain);
  if (direct) return direct;
  const heuristicHit = heuristic(domain);
  if (heuristicHit) return heuristicHit;
  const remote = await trancoRank(domain);
  if (remote) return remote;
  return {
    domain,
    level: "unknown",
    score: null,
    tags: [],
    source: "heuristic",
  };
}
