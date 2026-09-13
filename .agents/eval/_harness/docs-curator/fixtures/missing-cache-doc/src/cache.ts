const store = new Map<string, unknown>();
export function getCached<T>(key: string): T | undefined { return store.get(key) as T | undefined; }
export function setCached(key: string, value: unknown): void { store.set(key, value); }
/** Drop every cached entry whose key starts with the prefix. */
export function invalidateCache(prefix: string): number {
  let removed = 0;
  for (const key of store.keys()) if (key.startsWith(prefix)) { store.delete(key); removed += 1; }
  return removed;
}
