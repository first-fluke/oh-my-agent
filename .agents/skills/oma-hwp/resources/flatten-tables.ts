#!/usr/bin/env bun
/**
 * flatten-tables.ts — post-process kordoc output to convert HTML <table>
 * blocks into GFM pipe tables.
 *
 * kordoc emits HTML <table> when a table has colspan/rowspan because GFM
 * cannot represent merged cells. This script trades merge-cell fidelity
 * for a pure-Markdown output. Run after kordoc produces a .md file.
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

for (const path of files) {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`[flatten-tables] not found: ${path}`);
    process.exitCode = 1;
    continue;
  }
  const src = await file.text();
  let replaced = 0;
  const out = src.replace(TABLE_BLOCK, (match) => {
    replaced += 1;
    const md = td.turndown(match).trim();
    return `\n\n${md}\n\n`;
  });
  if (replaced === 0) {
    console.log(`[flatten-tables] ${path} — no <table> blocks`);
    continue;
  }
  await Bun.write(path, out);
  console.log(`[flatten-tables] ${path} — ${replaced} table(s) flattened`);
}
