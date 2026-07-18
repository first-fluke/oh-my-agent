#!/usr/bin/env bun
/**
 * flatten-tables.ts: post-process kordoc output:
 *   1. convert HTML <table> blocks to GFM pipe tables
 *   2. strip Private Use Area characters (Hancom font-specific glyphs)
 *
 * (1) kordoc emits HTML <table> when a table has colspan/rowspan because GFM
 *     cannot represent merged cells. This script trades merge-cell fidelity
 *     for a pure-Markdown output.
 * (2) HWP references Hancom-font-specific glyphs via Private Use Area code
 *     points (U+E000-U+F8FF, U+F0000-U+FFFFD, U+100000-U+10FFFD). Without
 *     the Hancom font these render as blanks or tofu squares; stripping is
 *     the pragmatic default for AI / plain-MD consumption.
 *
 * Usage: bun flatten-tables.ts <file.md> [<file.md>...]
 * (also runs under node >= 22.6 via type stripping)
 */

import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  bulletListMarker: "-",
});
td.use(tables);

const files = process.argv.slice(2);
if (import.meta.main && files.length === 0) {
  console.error("Usage: bun flatten-tables.ts <file.md> [<file.md>...]");
  process.exit(1);
}

const PUA = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu;

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

async function main(): Promise<void> {
  for (const path of files) {
    try {
      await access(path, constants.F_OK);
    } catch {
      console.error(`[flatten-tables] not found: ${path}`);
      process.exitCode = 1;
      continue;
    }

    const src = await readFile(path, "utf8");

    let tableCount = 0;
    let keptCount = 0;
    let out = replaceBalancedTables(src, (match: string) => {
      const nestedTableCount = (match.match(/<table\b/gi) ?? []).length;
      if (nestedTableCount > 1) {
        keptCount += 1;
        return match;
      }
      const converted = td.turndown(match).trim();
      // turndown-plugin-gfm only converts tables whose first row is <th>
      // (kordoc always emits one); anything else is kept as HTML — do not
      // count it as flattened.
      if (converted.startsWith("<table")) {
        keptCount += 1;
        return match;
      }
      tableCount += 1;
      return `\n\n${converted}\n\n`;
    });

    let puaCount = 0;
    out = out.replace(PUA, () => {
      puaCount += 1;
      return "";
    });

    if (tableCount === 0 && puaCount === 0) {
      const kept = keptCount ? ` (${keptCount} table(s) kept as HTML: no <th> heading row)` : "";
      console.log(`[flatten-tables] ${path}: nothing to change${kept}`);
      continue;
    }

    await writeFile(path, out, "utf8");
    const parts: string[] = [];
    if (tableCount) parts.push(`${tableCount} table(s) flattened`);
    if (keptCount) parts.push(`${keptCount} table(s) kept as HTML (no <th> heading row)`);
    if (puaCount) parts.push(`${puaCount} PUA char(s) stripped`);
    console.log(`[flatten-tables] ${path}: ${parts.join(", ")}`);
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error("[flatten-tables]", err);
    process.exit(1);
  });
}
