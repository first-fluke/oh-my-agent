/**
 * Body builders for `oma market render`: pain/trend body, comparison body,
 * cluster bank, and engine footer.
 */

import type { Cluster } from "../shared/schema.js";
import { cleanSnippet } from "../shared/text.js";
import type { RenderOptions } from "./types.js";

// ---------------------------------------------------------------------------
// Body builders
// ---------------------------------------------------------------------------

/**
 * Build a human-readable lead-in from a cluster's primary representative.
 *
 * Prefer the first sentence of the title (truncated), falling back to a
 * compact slice of the snippet. Strip markdown control chars and entity
 * artefacts. Caps roughly at 80 chars for English / 40 for Korean (no
 * spaces — count syllables more conservatively).
 */
function makeLeadIn(cluster: Cluster, intent: string): string {
  const rep = cluster.representatives[0];
  const fallback = intent === "pain" ? "Notable signal" : "Recent activity";
  const raw = cleanSnippet(rep?.title ?? rep?.snippet ?? "");
  if (!raw) return fallback;

  // First sentence (or first clause if no period)
  const firstSentence = raw.split(/(?<=[.!?。!?])\s/)[0] ?? raw;
  const containsHangul = /[가-힣]/.test(firstSentence);
  const maxChars = containsHangul ? 40 : 80;

  let trimmed = firstSentence.slice(0, maxChars);
  if (firstSentence.length > maxChars) trimmed += "…";
  return trimmed;
}

export function buildPainTrendBody(
  clusters: Cluster[],
  intent: string,
): string {
  const lines: string[] = [];
  lines.push("What we learned:\n");

  // Top clusters by rrf_score descending
  const sorted = [...clusters].sort((a, b) => {
    const aScore = a.representatives[0]?.rrf_score ?? 0;
    const bScore = b.representatives[0]?.rrf_score ?? 0;
    return bScore - aScore;
  });

  const topClusters = sorted.slice(0, 5);

  for (const cluster of topClusters) {
    const reps = cluster.representatives.slice(0, 3);
    const leadIn = makeLeadIn(cluster, intent);
    const citations = reps
      .map((r) => {
        const label = cleanSnippet(r.author ?? r.title ?? r.source);
        return `[${label}](${r.url})`;
      })
      .join(", ");
    const snippetSource = reps[0]?.snippet ?? reps[0]?.body ?? reps[0]?.title;
    const snippet = cleanSnippet(snippetSource).slice(0, 280);
    lines.push(`**${leadIn}** ${snippet} - cited by ${citations}.\n`);
  }

  lines.push("\nKEY PATTERNS from the research:\n");

  const patternClusters = sorted.slice(0, 7);
  patternClusters.forEach((cluster, i) => {
    const rep = cluster.representatives[0];
    if (!rep) return;
    const title = makeLeadIn(cluster, intent);
    const summary = cleanSnippet(rep.snippet ?? rep.body ?? rep.title).slice(
      0,
      220,
    );
    lines.push(`${i + 1}. ${title} - ${summary} ([source](${rep.url}))`);
  });

  lines.push("");
  return lines.join("\n");
}

export function buildComparisonBody(
  clusters: Cluster[],
  entityA: string,
  entityB: string,
): string {
  const lines: string[] = [];

  lines.push(`# ${entityA} vs ${entityB}: 시장 신호\n`);
  lines.push("## Quick Verdict\n");

  const topRep = clusters[0]?.representatives[0];
  const verdictRaw =
    topRep?.snippet ??
    topRep?.title ??
    "신호 수집 중 - 더 많은 데이터가 필요합니다.";
  lines.push(`${cleanSnippet(verdictRaw)}\n`);

  // Filter clusters per entity by metadata label or split half-half
  const aLabel = `vs-entity:${entityA}`;
  const bLabel = `vs-entity:${entityB}`;

  const aClusters = clusters.filter((c) =>
    c.representatives.some((r) => (r.metadata?.labels ?? []).includes(aLabel)),
  );
  const bClusters = clusters.filter((c) =>
    c.representatives.some((r) => (r.metadata?.labels ?? []).includes(bLabel)),
  );

  // Fallback: split half-half if no label-based filtering
  const useLabels = aClusters.length > 0 || bClusters.length > 0;
  const half = Math.ceil(clusters.length / 2);
  const clusterA = useLabels ? aClusters : clusters.slice(0, half);
  const clusterB = useLabels ? bClusters : clusters.slice(half);

  const renderEntitySection = (name: string, entityClusters: Cluster[]) => {
    lines.push(`## ${name}\n`);
    const top = entityClusters.slice(0, 4);
    for (const c of top) {
      const reps = c.representatives.slice(0, 2);
      const leadIn = makeLeadIn(c, "competitor");
      const citations = reps
        .map(
          (r) => `[${cleanSnippet(r.author ?? r.title ?? r.source)}](${r.url})`,
        )
        .join(", ");
      const snippet = cleanSnippet(
        reps[0]?.snippet ?? reps[0]?.body ?? reps[0]?.title,
      ).slice(0, 280);
      lines.push(`**${leadIn}** ${snippet} - ${citations}.\n`);
    }
    if (top.length === 0) {
      lines.push("_(no signal)_\n");
    }
  };

  renderEntitySection(entityA, clusterA);
  renderEntitySection(entityB, clusterB);

  lines.push("## Head-to-Head\n");
  // Summarize comparing both
  const aSignals = clusterA.flatMap((c) => c.entity_signature).slice(0, 4);
  const bSignals = clusterB.flatMap((c) => c.entity_signature).slice(0, 4);
  lines.push(`${entityA}: ${aSignals.join(", ") || "_(signals emerging)_"}\n`);
  lines.push(`${entityB}: ${bSignals.join(", ") || "_(signals emerging)_"}\n`);

  lines.push("## The Bottom Line\n");
  const count = clusters.length;
  lines.push(
    `Analysis based on ${count} cluster${count !== 1 ? "s" : ""} across sources.\n`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Cluster Bank builder — raw evidence dump for analyst (host LLM)
// ---------------------------------------------------------------------------

/**
 * Cluster Bank: every cluster, sorted by (cross_source_count, member count,
 * top rrf_score), with each representative's [name](url) + short snippet.
 *
 * Purpose: give the host LLM filling SWOT/5F/PESTEL slots a citation-ready
 * material list. The bank never claims any quadrant assignment.
 */
export function buildClusterBank(clusters: Cluster[]): string {
  if (clusters.length === 0) {
    return "## Cluster Bank\n\n_(corpus too thin — no clusters)_\n";
  }
  const sorted = [...clusters].sort((a, b) => {
    if (b.cross_source_count !== a.cross_source_count) {
      return b.cross_source_count - a.cross_source_count;
    }
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length;
    }
    const aScore = a.representatives[0]?.rrf_score ?? 0;
    const bScore = b.representatives[0]?.rrf_score ?? 0;
    return bScore - aScore;
  });

  const lines: string[] = [
    "## Cluster Bank",
    "",
    "> Raw evidence for the analyst. Use these clusters when filling any " +
      "framework section below. Cite as `[name](url)`.",
    "",
  ];
  sorted.forEach((c, i) => {
    const id = `C${i + 1}`;
    const ts =
      c.cross_source_count === 1
        ? "1 source"
        : `${c.cross_source_count} sources`;
    const ms = `${c.members.length} member${c.members.length === 1 ? "" : "s"}`;
    lines.push(`### ${id} - ${ts}, ${ms}`);
    const reps = c.representatives.slice(0, 3);
    if (reps.length === 0) {
      lines.push("- _(no representatives)_");
    } else {
      for (const rep of reps) {
        const label = cleanSnippet(rep.author ?? rep.title ?? rep.source).slice(
          0,
          60,
        );
        const url = rep.url;
        const snippet = cleanSnippet(
          rep.snippet ?? rep.body ?? rep.title,
        ).slice(0, 200);
        const tail = snippet ? ` - ${snippet}` : "";
        lines.push(`- [${label}](${url})${tail}`);
      }
    }
    lines.push("");
  });
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Engine footer builder
// ---------------------------------------------------------------------------

export function buildFooter(clusters: Cluster[], opts: RenderOptions): string {
  const sourcesUsed = opts.sourcesUsed ?? [];
  const sourcesFailed = opts.sourcesFailed ?? [];
  const totalItems = clusters.reduce(
    (n, c) => n + c.members.length + c.representatives.length,
    0,
  );
  const N = sourcesUsed.length + sourcesFailed.length;

  return [
    "<!-- ENGINE FOOTER -->",
    "---",
    `✅ market research footer:`,
    `  - sources used: ${sourcesUsed.join(", ")} (${sourcesUsed.length}/${N} requested)`,
    `  - sources failed: ${sourcesFailed.length ? sourcesFailed.join(", ") : "none"}`,
    `  - clusters: ${clusters.length}`,
    `  - items: ${totalItems}`,
    `  - cache: ${opts.cacheHit ? "hit" : "miss"}`,
    `  - latency: ${opts.latencyMs ?? 0}ms`,
    "---",
    "<!-- END ENGINE FOOTER -->",
  ].join("\n");
}
