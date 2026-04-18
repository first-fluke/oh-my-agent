#!/usr/bin/env bun
/**
 * flatten-tables.ts — post-process kordoc output:
 *   1. convert HTML <table> blocks to GFM pipe tables
 *   2. strip Private Use Area characters (Hancom font-specific glyphs)
 *
 * (1) kordoc emits HTML <table> when a table has colspan/rowspan because GFM
 *     cannot represent merged cells. This script trades merge-cell fidelity
 *     for a pure-Markdown output.
 * (2) HWP references Hancom-font-specific glyphs via Private Use Area code
 *     points (U+E000-U+F8FF, U+F0000-U+FFFFD, U+100000-U+10FFFD). Without
 *     the Hancom font these render as blanks or tofu squares — stripping is
 *     the pragmatic default for AI / plain-MD consumption.
 *
 * Usage: bun run flatten-tables.ts <file.md> [<file.md>...]
 */

import TurndownService from "turndown";
// @ts-ignore — no type defs published
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
  console.error("Usage: bun run flatten-tables.ts <file.md> [<file.md>...]");
  process.exit(1);
}

const TABLE_BLOCK = /<table[\s\S]*?<\/table>/g;
const PUA = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu;

for (const path of files) {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`[flatten-tables] not found: ${path}`);
    process.exitCode = 1;
    continue;
  }
  const src = await file.text();

  let tableCount = 0;
  let out = src.replace(TABLE_BLOCK, (match) => {
    tableCount += 1;
    return `\n\n${td.turndown(match).trim()}\n\n`;
  });

  let puaCount = 0;
  out = out.replace(PUA, () => {
    puaCount += 1;
    return "";
  });

  if (tableCount === 0 && puaCount === 0) {
    console.log(`[flatten-tables] ${path} — nothing to change`);
    continue;
  }
  await Bun.write(path, out);
  const parts: string[] = [];
  if (tableCount) parts.push(`${tableCount} table(s) flattened`);
  if (puaCount) parts.push(`${puaCount} PUA char(s) stripped`);
  console.log(`[flatten-tables] ${path} — ${parts.join(", ")}`);
}
