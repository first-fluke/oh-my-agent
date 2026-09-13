/**
 * Live evaluation issues one subprocess per arm, neighbor arm, and judge
 * call. Running them strictly one after another made a single optimization
 * epoch take forty minutes; a small bounded pool keeps the same recordings
 * and scores while overlapping the waits.
 */
export const DEFAULT_EVAL_CONCURRENCY = 4;
export const MAX_EVAL_CONCURRENCY = 16;

export function evalConcurrency(): number {
  const configured = Number.parseInt(
    process.env.OMA_SKILL_EVAL_CONCURRENCY ?? "",
    10,
  );
  if (!Number.isFinite(configured)) return DEFAULT_EVAL_CONCURRENCY;
  return Math.min(MAX_EVAL_CONCURRENCY, Math.max(1, configured));
}

/** Map with at most `limit` calls in flight; results keep input order. */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index] as T, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
