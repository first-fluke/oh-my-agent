/**
 * AST- and prose-level reference extraction for oma-docs extract.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Extractor
 */

import type { Code, Html, Image, InlineCode, Link, Node, Root } from "mdast";
import type { DocRef, RefKind } from "../../../types/docs.js";
import { type IgnoreRange, isLineIgnored } from "./ignore-ranges.js";
import {
  extractConfigKeys,
  extractEnvVars,
  extractScripts,
  extractUrls,
  KNOWN_CLI_BINARIES,
  looksLikeFilePath,
  SHELL_LANGS,
} from "./ref-patterns.js";

// ---------------------------------------------------------------------------
// Node position helper
// ---------------------------------------------------------------------------

function nodeLine(node: Node): number {
  return node.position?.start.line ?? 1;
}

// ---------------------------------------------------------------------------
// AST-based reference extractor
// ---------------------------------------------------------------------------

export function extractRefsFromAst(
  tree: Root,
  ignoreRanges: IgnoreRange[],
): DocRef[] {
  const refs: DocRef[] = [];

  function addRef(kind: RefKind, target: string, line: number): void {
    if (!target.trim()) return;
    if (isLineIgnored(line, ignoreRanges)) return;
    refs.push({ kind, target: target.trim(), line });
  }

  function visitNode(node: Node): void {
    const line = nodeLine(node);

    switch (node.type) {
      case "link": {
        const link = node as Link;
        const url = link.url ?? "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const stripped = url.replace(/#[^#]*$/, "");
          addRef("url", stripped, line);
        } else if (looksLikeFilePath(url)) {
          addRef("file", url, line);
        }
        break;
      }

      case "image": {
        const img = node as Image;
        const url = img.url ?? "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const stripped = url.replace(/#[^#]*$/, "");
          addRef("url", stripped, line);
        } else if (looksLikeFilePath(url)) {
          addRef("file", url, line);
        }
        break;
      }

      case "inlineCode": {
        const ic = node as InlineCode;
        const val = ic.value ?? "";

        // CLI: first token is known binary
        const firstToken = val.trim().split(/\s+/)[0] ?? "";
        if (KNOWN_CLI_BINARIES.has(firstToken)) {
          // Check if it's a script pattern first
          const scripts = extractScripts(val);
          for (const s of scripts) {
            addRef("script", s, line);
          }
          // Only add as cli if no script match consumed it OR there's remaining cli context
          const scriptPattern = /(?:bun\s+run|npm\s+run|pnpm(?:\s+run)?)\s+/;
          if (!scriptPattern.test(val)) {
            addRef("cli", val.trim(), line);
          } else if (scripts.length === 0) {
            addRef("cli", val.trim(), line);
          }
        } else if (looksLikeFilePath(val)) {
          addRef("file", val, line);
        } else if (val.startsWith("http://") || val.startsWith("https://")) {
          addRef("url", val.replace(/#[^#]*$/, ""), line);
        } else {
          // Config keys
          for (const k of extractConfigKeys(val)) {
            addRef("config", k, line);
          }
          // Env vars in backtick context
          for (const e of extractEnvVars(val)) {
            addRef("env", e, line);
          }
        }
        break;
      }

      case "code": {
        const code = node as Code;
        const lang = (code.lang ?? "").toLowerCase();
        const val = code.value ?? "";

        if (SHELL_LANGS.has(lang)) {
          // Extract CLI commands line by line.
          //
          // Script refs (`npm run X`, `bun run X`) are intentionally NOT
          // extracted from fenced code blocks: those blocks frequently carry
          // illustrative polyglot examples (`npm test`, `pip install`,
          // `cargo build`) that aren't claims about THIS project's scripts.
          // To assert a real local script ref, use inline code in prose:
          // "run `bun run test`".
          for (const rawLine of val.split("\n")) {
            const stripped = rawLine.replace(/^[$#]\s*/, "").trim();
            if (!stripped) continue;

            // CLI — if first token is known binary and not a script pattern
            const firstTok = stripped.split(/\s+/)[0] ?? "";
            const scriptPat = /(?:bun\s+run|npm\s+run|pnpm(?:\s+run)?)\s+/;
            if (KNOWN_CLI_BINARIES.has(firstTok) && !scriptPat.test(stripped)) {
              addRef("cli", stripped, line);
            }
          }
        }

        // Always extract env vars from code blocks
        for (const e of extractEnvVars(val)) {
          addRef("env", e, line);
        }

        // Extract config keys from code blocks
        for (const k of extractConfigKeys(val)) {
          addRef("config", k, line);
        }

        break;
      }

      case "html": {
        const html = node as Html;
        // Extract URLs from raw HTML nodes
        for (const u of extractUrls(html.value ?? "")) {
          addRef("url", u, line);
        }
        break;
      }

      case "paragraph":
      case "blockquote":
      case "heading":
      case "listItem":
      case "tableCell": {
        // Traverse children
        const parent = node as { children?: Node[] };
        if (parent.children) {
          for (const child of parent.children) {
            visitNode(child);
          }
        }
        break;
      }

      default: {
        // Traverse any children
        const generic = node as { children?: Node[] };
        if (generic.children) {
          for (const child of generic.children) {
            visitNode(child);
          }
        }
        break;
      }
    }
  }

  for (const child of tree.children) {
    visitNode(child);
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Text extraction for prose env/config mentions
// ---------------------------------------------------------------------------

export function extractProseRefs(
  content: string,
  ignoreRanges: IgnoreRange[],
): DocRef[] {
  const refs: DocRef[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (isLineIgnored(lineNum, ignoreRanges)) continue;
    const line = lines[i];
    if (line === undefined) continue;

    // ENV vars in prose: process.env.X, $X, "Set `X` env var"
    for (const e of extractEnvVars(line)) {
      refs.push({ kind: "env", target: e, line: lineNum });
    }
  }

  return refs;
}
