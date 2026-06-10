/**
 * editor/server/locks.ts — per-slide write serialization lock.
 */

// ─── Per-slide write lock ─────────────────────────────────────────────────────

/**
 * Per-slide serialization lock.
 * Prevents concurrent edits to the same slide file.
 * Key = slideFile (bare filename), Value = Promise chain tail.
 */
const slideLocks = new Map<string, Promise<void>>();

/**
 * Serialize `fn` for the given slideFile.
 * Subsequent callers for the same file will queue behind the current operation.
 */
export function withSlideLock<T>(
  slideFile: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = slideLocks.get(slideFile) ?? Promise.resolve();
  let resolveTail!: () => void;
  const tail = new Promise<void>((r) => {
    resolveTail = r;
  });
  slideLocks.set(slideFile, tail);

  const result = prev
    .then(() => fn())
    .finally(() => {
      resolveTail();
      // Clean up lock entry if it's still ours
      if (slideLocks.get(slideFile) === tail) {
        slideLocks.delete(slideFile);
      }
    });
  return result;
}
