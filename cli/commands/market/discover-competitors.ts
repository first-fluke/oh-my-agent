/**
 * `oma market discover-competitors` — peer-entity CANDIDATE pool for the
 * `competitor` intent. LLM-first contract: the CLI emits frequency-ranked
 * brand-shaped candidates, the host LLM picks actual brands.
 *
 * Output JSON:
 *   {
 *     topic, locale, queries_used, items_scanned,
 *     candidates: [{ entity: string, mentions: number }, ...],
 *     reason?: string,
 *   }
 *
 * Intended caller: the LLM hosting `oma-market`, when intent is classified
 * as `competitor` and the user did NOT specify `--vs`. The LLM filters the
 * candidate pool (rejecting listicle words, generic nouns, news vocabulary,
 * etc.) and passes the top brands to `oma market harvest --vs`.
 */

import { discoverCompetitors } from "./shared/competitors.js";

export async function runDiscoverCompetitors(argv: string[]): Promise<number> {
  const args = [...argv];
  let topic: string | undefined;
  let locale: "en" | "ko" = "en";
  let limit: number | undefined;
  let timeoutSec: number | undefined;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--locale" && args[i + 1]) {
      const v = args[++i];
      if (v === "en" || v === "ko") locale = v;
      else {
        process.stderr.write(
          `[discover-competitors] invalid locale "${v}" (en|ko)\n`,
        );
        return 4;
      }
    } else if (arg === "--limit" && args[i + 1]) {
      limit = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(limit) || limit < 1 || limit > 25) {
        process.stderr.write("[discover-competitors] --limit must be 1..25\n");
        return 4;
      }
    } else if (arg === "--timeout" && args[i + 1]) {
      timeoutSec = Number.parseInt(args[++i] ?? "", 10);
    } else if (!arg?.startsWith("--") && topic === undefined) {
      topic = arg;
    }
    i++;
  }

  if (!topic?.trim()) {
    process.stderr.write("[discover-competitors] error: topic is required\n");
    return 4;
  }

  const result = await discoverCompetitors({
    topic: topic.trim(),
    locale,
    limit,
    timeoutMs:
      timeoutSec && Number.isFinite(timeoutSec)
        ? Math.max(1000, timeoutSec * 1000)
        : undefined,
  });

  process.stdout.write(JSON.stringify(result));
  // Exit 2 when no candidates emerged (treat as "no signal") so chained
  // shells can detect; exit 0 when we have at least one.
  return result.candidates.length === 0 ? 2 : 0;
}
