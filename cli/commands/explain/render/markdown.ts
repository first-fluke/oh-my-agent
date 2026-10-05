import type {
  AlignType,
  Definition,
  FootnoteDefinition,
  List,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { escapeHtml } from "./text.js";

// Panel prose: remark parses GitHub-flavoured Markdown into a syntax tree,
// and this file writes that tree out as HTML. Parsing is remark's job; what
// stays here is how the page shows each node. Raw HTML in a draft is a node
// like any other and is written as text, so `<sid>` shows as written and no
// draft can inject markup.

const parser = unified().use(remarkParse).use(remarkGfm);

/** The syntax tree of a piece of Markdown; positions are lines of `text`. */
export function parseMarkdown(text: string): Root {
  return parser.parse(text);
}

const STATUS_MARK: Record<string, string> = { ok: "✓", no: "✕", warn: "!" };
const STATUS_ALIAS: Record<string, string> = {
  "✓": "ok",
  "✔": "ok",
  "✗": "no",
  "✘": "no",
  "✕": "no",
  "⚠": "warn",
};
export const STATUS_RE = /^\s*(ok|no|warn|✓|✔|✗|✘|✕|⚠)(?=\s|$)\s*/iu;

/** The status a table cell opens with, as ok / no / warn. */
export function cellStatus(text: string): string | undefined {
  const word = STATUS_RE.exec(text)?.[1]?.toLowerCase();
  return word ? (STATUS_ALIAS[word] ?? word) : undefined;
}

const SAFE_URL =
  /^(?:https?:\/\/|mailto:|\.{0,2}\/|#|[\w.-]+(?:\/|\.html?\b))/i;
const DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|svg\+xml)[;,]/i;

interface Context {
  definitions: Map<string, Definition>;
  /** Footnote ids in the order the text refers to them. */
  footnotes: string[];
}

const label = (identifier: string) => identifier.toLowerCase();

function link(url: string, title: string | null | undefined, body: string) {
  if (!SAFE_URL.test(url)) return body;
  return `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${body}</a>`;
}

// Only data: images are embedded. The page loads nothing from outside, so
// any other image becomes a link that carries its alt text.
function image(url: string, alt: string | null | undefined): string {
  const text = escapeHtml(alt || url);
  if (DATA_IMAGE.test(url)) {
    return `<img alt="${escapeHtml(alt ?? "")}" src="${escapeHtml(url)}">`;
  }
  return link(url, undefined, text);
}

function phrasing(nodes: PhrasingContent[], context: Context): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case "text":
          return escapeHtml(node.value);
        case "emphasis":
          return `<em>${phrasing(node.children, context)}</em>`;
        case "strong":
          return `<strong>${phrasing(node.children, context)}</strong>`;
        case "delete":
          return `<del>${phrasing(node.children, context)}</del>`;
        case "inlineCode":
          return `<code>${escapeHtml(node.value)}</code>`;
        case "break":
          return "<br>";
        case "link":
          return link(node.url, node.title, phrasing(node.children, context));
        case "image":
          return image(node.url, node.alt);
        case "linkReference": {
          const target = context.definitions.get(label(node.identifier));
          const body = phrasing(node.children, context);
          return target ? link(target.url, target.title, body) : body;
        }
        case "imageReference": {
          const target = context.definitions.get(label(node.identifier));
          return target
            ? image(target.url, node.alt)
            : escapeHtml(node.alt ?? "");
        }
        case "footnoteReference": {
          const id = label(node.identifier);
          if (!context.footnotes.includes(id)) context.footnotes.push(id);
          const number = context.footnotes.indexOf(id) + 1;
          return `<sup class="oe-fn-ref">[${number}]</sup>`;
        }
        case "html":
          // Markup in a draft is content to show, never markup to run.
          return escapeHtml(node.value);
        default:
          return "";
      }
    })
    .join("");
}

function listHtml(node: List, context: Context): string {
  const items = node.children.map((item) => {
    const task = typeof item.checked === "boolean";
    const box = task
      ? `<span class="oe-task${item.checked ? " oe-task-done" : ""}" aria-hidden="true">${item.checked ? "✓" : ""}</span><span class="oe-sr">${item.checked ? "done: " : "to do: "}</span>`
      : "";
    // A tight item is its text, not a paragraph.
    const loose = node.spread || item.spread;
    const body = item.children
      .map((child) =>
        child.type === "paragraph" && !loose
          ? phrasing(child.children, context)
          : block(child, context),
      )
      .join("\n");
    return `<li${task ? ' class="oe-task-item"' : ""}>${box}${body}</li>`;
  });
  const start = node.start ?? 1;
  const open = node.ordered
    ? `<ol${start !== 1 ? ` start="${start}"` : ""}>`
    : "<ul>";
  return `${open}${items.join("")}</${node.ordered ? "ol" : "ul"}>`;
}

/** A cell that opens with ok / no / warn (or ✓ ✗ ⚠) becomes a status badge. */
function cellHtml(children: PhrasingContent[], context: Context): string {
  const [first, ...rest] = children;
  const status = first?.type === "text" ? cellStatus(first.value) : undefined;
  if (!status || first?.type !== "text") return phrasing(children, context);
  const remainder = phrasing(
    [{ ...first, value: first.value.replace(STATUS_RE, "") }, ...rest],
    context,
  );
  return `<span class="oe-status oe-status-${status}"><b aria-hidden="true">${STATUS_MARK[status]}</b><span class="oe-sr">${status}</span>${remainder ? ` ${remainder}` : ""}</span>`;
}

function tableHtml(node: Table, context: Context): string {
  const style = (align: AlignType | undefined) =>
    align ? ` style="text-align:${align}"` : "";
  const [head, ...body] = node.children;
  const width = head?.children.length ?? 0;
  const headHtml = (head?.children ?? [])
    .map(
      (cell, index) =>
        `<th${style(node.align?.[index])}>${phrasing(cell.children, context)}</th>`,
    )
    .join("");
  const bodyHtml = body
    .map((row) => {
      const cells = Array.from({ length: width }, (_cell, index) => {
        const cell = row.children[index];
        return `<td${style(node.align?.[index])}>${cell ? cellHtml(cell.children, context) : ""}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
  // A wide table scrolls inside its own box instead of widening the page.
  return `<div class="oe-scroll"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function block(node: RootContent, context: Context): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${phrasing(node.children, context)}</p>`;
    case "heading": {
      // The panel title is the h2; headings inside a panel start below it.
      const level = Math.min(6, Math.max(3, node.depth));
      return `<h${level}>${phrasing(node.children, context)}</h${level}>`;
    }
    case "thematicBreak":
      return "<hr>";
    case "blockquote":
      return `<blockquote>${blocks(node.children, context)}</blockquote>`;
    case "list":
      return listHtml(node, context);
    case "code": {
      const lang = node.lang ? ` data-lang="${escapeHtml(node.lang)}"` : "";
      return `<div class="oe-scroll"><pre${lang}><code>${escapeHtml(node.value)}</code></pre></div>`;
    }
    case "table":
      return tableHtml(node, context);
    case "html":
      return `<p>${escapeHtml(node.value)}</p>`;
    case "definition":
    case "footnoteDefinition":
      // Collected up front; shown where they are referred to.
      return "";
    default:
      return "";
  }
}

function blocks(nodes: RootContent[], context: Context): string {
  return nodes
    .map((node) => block(node, context))
    .filter(Boolean)
    .join("\n");
}

function collect(tree: Root): {
  context: Context;
  notes: Map<string, FootnoteDefinition>;
} {
  const definitions = new Map<string, Definition>();
  const notes = new Map<string, FootnoteDefinition>();
  const visit = (node: Root | RootContent) => {
    if (node.type === "definition") {
      if (!definitions.has(label(node.identifier))) {
        definitions.set(label(node.identifier), node);
      }
    } else if (node.type === "footnoteDefinition") {
      notes.set(label(node.identifier), node);
    }
    if ("children" in node) {
      for (const child of node.children) visit(child as RootContent);
    }
  };
  visit(tree);
  return { context: { definitions, footnotes: [] }, notes };
}

/** Block Markdown → HTML. */
export function renderMarkdown(text: string): string {
  const tree = parseMarkdown(text);
  const { context, notes } = collect(tree);
  const html = blocks(tree.children, context);
  if (context.footnotes.length === 0) return html;
  const items = context.footnotes.map((id) => {
    const note = notes.get(id);
    return `<li>${note ? blocks(note.children, context) : ""}</li>`;
  });
  return `${html}\n<ol class="oe-footnotes">${items.join("")}</ol>`;
}

/**
 * Inline Markdown → HTML, for a label or a cell of a component. Text that
 * would parse as a block (a line that opens with `- ` or `1. `) is a label
 * all the same, so it is shown as written.
 */
export function renderInline(text: string): string {
  const tree = parseMarkdown(text);
  const [only] = tree.children;
  if (tree.children.length === 1 && only?.type === "paragraph") {
    return phrasing(only.children, collect(tree).context);
  }
  return escapeHtml(text);
}

/** Column count of the widest table in a piece of Markdown. */
export function tableColumns(text: string): number {
  let widest = 0;
  const visit = (node: Root | RootContent) => {
    if (node.type === "table") {
      widest = Math.max(widest, node.children[0]?.children.length ?? 0);
    }
    if ("children" in node) {
      for (const child of node.children) visit(child as RootContent);
    }
  };
  visit(parseMarkdown(text));
  return widest;
}
