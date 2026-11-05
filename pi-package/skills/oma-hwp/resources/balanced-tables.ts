/**
 * Replace balanced outermost table blocks. Nested tables are passed to the
 * callback as part of their parent instead of being truncated at the first
 * closing tag.
 */
export function replaceBalancedTables(
  source: string,
  replace: (tableHtml: string) => string,
): string {
  const tag = /<\/?table\b[^>]*>/gi;
  let depth = 0;
  let blockStart = -1;
  let cursor = 0;
  let output = "";

  for (let match = tag.exec(source); match; match = tag.exec(source)) {
    const closing = /^<\/table/i.test(match[0]);
    if (!closing) {
      if (depth === 0) {
        blockStart = match.index;
        output += source.slice(cursor, blockStart);
      }
      depth += 1;
      continue;
    }

    if (depth === 0) continue;
    depth -= 1;
    if (depth === 0 && blockStart >= 0) {
      const blockEnd = tag.lastIndex;
      output += replace(source.slice(blockStart, blockEnd));
      cursor = blockEnd;
      blockStart = -1;
    }
  }

  // Preserve malformed/unclosed input verbatim rather than dropping content.
  return output + source.slice(blockStart >= 0 ? blockStart : cursor);
}
