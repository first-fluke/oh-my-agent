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
if (files.length === 0) {
  console.error("Usage: bun flatten-tables.ts <file.md> [<file.md>...]");
  process.exit(1);
}

// Non-greedy: a nested <table> inside another would be truncated at the first
// </table>. kordoc emits nested tables as separate blocks, so this holds in
// practice; see troubleshooting.md §4 if stray closing tags ever appear.
const TABLE_BLOCK = /<table[\s\S]*?<\/table>/g;
const PUA = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu;

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
    let out = src.replace(TABLE_BLOCK, (match: string) => {
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

main().catch((err: unknown) => {
  console.error("[flatten-tables]", err);
  process.exit(1);
});
