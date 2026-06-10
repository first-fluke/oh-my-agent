// --- Unified diff helper (T5) ---

/**
 * Produce a minimal unified diff between `original` and `final`.
 *
 * This is a pure line-by-line diff — no Date.now/Math.random, deterministic.
 * Produces standard unified diff format (--- / +++ / @@ headers, +/- lines).
 */
export function unifiedDiff(
  original: string,
  final: string,
  filename = "SKILL.md",
): string {
  if (original === final) return "";

  const origLines = original.split("\n");
  const finalLines = final.split("\n");

  // Build a list of chunks using a simple greedy LCS-based diff
  const hunks: string[] = [];

  // Use a simple line diff: mark lines as context/added/removed
  const diff = computeLineDiff(origLines, finalLines);

  // Group into hunks (context=3)
  const CONTEXT = 3;
  let hunkLines: string[] = [];
  const origStart = 0;
  const finalStart = 0;
  const origCount = 0;
  const finalCount = 0;
  let lastChangeIdx = -1;

  for (let i = 0; i < diff.length; i++) {
    const op = diff[i];
    if (op !== "=") {
      lastChangeIdx = i;
    }
  }

  if (lastChangeIdx === -1) return ""; // no changes

  let inHunk = false;
  let hunkOrigStart = 1;
  let hunkFinalStart = 1;
  let hunkOrigCount = 0;
  let hunkFinalCount = 0;
  let pendingContext: string[] = [];
  let origLine = 0;
  let finalLine = 0;

  const flushHunk = () => {
    if (hunkLines.length === 0) return;
    // Trim trailing context lines from hunk (keep only CONTEXT trailing lines)
    let trail = 0;
    for (let k = hunkLines.length - 1; k >= 0; k--) {
      if (hunkLines[k]?.startsWith(" ")) {
        trail++;
      } else {
        break;
      }
    }
    const excess = Math.max(0, trail - CONTEXT);
    if (excess > 0) {
      hunkLines = hunkLines.slice(0, hunkLines.length - excess);
      hunkFinalCount -= excess;
      hunkOrigCount -= excess;
    }
    const header = `@@ -${hunkOrigStart},${hunkOrigCount} +${hunkFinalStart},${hunkFinalCount} @@`;
    hunks.push([header, ...hunkLines].join("\n"));
    hunkLines = [];
    hunkOrigCount = 0;
    hunkFinalCount = 0;
    inHunk = false;
    pendingContext = [];
  };

  // Suppress unused variable warnings
  void origStart;
  void finalStart;
  void origCount;
  void finalCount;

  for (let i = 0; i < diff.length; i++) {
    const op = diff[i] ?? "=";
    const isChange = op !== "=";

    if (isChange) {
      // Flush pending context as leading context lines
      if (!inHunk) {
        const leading = pendingContext.slice(-CONTEXT);
        hunkOrigStart = origLine - leading.length + 1;
        hunkFinalStart = finalLine - leading.length + 1;
        hunkOrigCount = 0;
        hunkFinalCount = 0;
        hunkLines = [...leading];
        hunkOrigCount += leading.length;
        hunkFinalCount += leading.length;
        inHunk = true;
        pendingContext = [];
      } else {
        // Flush any pending context that was accumulated while inHunk
        for (const ctx of pendingContext) {
          hunkLines.push(ctx);
          hunkOrigCount++;
          hunkFinalCount++;
        }
        pendingContext = [];
      }

      if (op === "-") {
        hunkLines.push(`-${origLines[origLine] ?? ""}`);
        hunkOrigCount++;
        origLine++;
      } else if (op === "+") {
        hunkLines.push(`+${finalLines[finalLine] ?? ""}`);
        hunkFinalCount++;
        finalLine++;
      }
    } else {
      // context line
      const ctxLine = ` ${origLines[origLine] ?? ""}`;
      origLine++;
      finalLine++;

      if (inHunk) {
        pendingContext.push(ctxLine);
        // Check if we are far enough from the next change to flush the hunk
        // Look ahead to see if there's a change within CONTEXT lines
        let hasNearChange = false;
        for (let k = 1; k <= CONTEXT && i + k < diff.length; k++) {
          if (diff[i + k] !== "=") {
            hasNearChange = true;
            break;
          }
        }
        if (!hasNearChange && pendingContext.length >= CONTEXT) {
          flushHunk();
        }
      } else {
        pendingContext.push(ctxLine);
        if (pendingContext.length > CONTEXT) {
          pendingContext.shift();
        }
      }
    }
  }

  if (inHunk) {
    flushHunk();
  }

  if (hunks.length === 0) return "";

  return [`--- a/${filename}`, `+++ b/${filename}`, ...hunks].join("\n");
}

/**
 * Compute a line-level diff between two string arrays.
 * Returns an array of operations: "=" (context), "-" (removed), "+" (added).
 *
 * Uses a Myers-style patience diff (greedy LCS via dynamic programming).
 * Deterministic: no random/date.
 */
function computeLineDiff(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table (m+1 x n+1)
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const row = dp[i];
      if (row === undefined) continue;
      if (a[i] === b[j]) {
        row[j] = (dp[i + 1]?.[j + 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
      }
    }
  }

  // Trace back
  const ops: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push("=");
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push("-");
      i++;
    } else {
      ops.push("+");
      j++;
    }
  }
  while (i < m) {
    ops.push("-");
    i++;
  }
  while (j < n) {
    ops.push("+");
    j++;
  }
  return ops;
}
