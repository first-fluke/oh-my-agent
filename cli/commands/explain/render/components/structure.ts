import { parseAttrs } from "../draft.js";
import { renderInline, renderMarkdown } from "../markdown.js";
import { escapeHtml } from "../text.js";
import {
  type Component,
  ComponentError,
  contentLines,
  fields,
} from "./types.js";

// tree, timeline, kv, callout: HTML components, so they wrap with the panel.

interface TreeNode {
  label: string;
  note: string;
  highlight: boolean;
  children: TreeNode[];
}

/** A label that opens with inline code gets that code as a grey tag. */
function treeLabel(label: string): string {
  return renderInline(label).replace(
    /^<code>([^<]*)<\/code>(?=\s*\S)/,
    '<span class="oe-tree-tag">$1</span>',
  );
}

function treeBox(node: TreeNode, root = false): string {
  const note = node.note ? `<small>${renderInline(node.note)}</small>` : "";
  return `<div class="oe-tree-box${root ? " oe-tree-box-root" : ""}${node.highlight ? " oe-tree-box-em" : ""}">${treeLabel(node.label)}${note}</div>`;
}

function treeList(nodes: TreeNode[], top = true): string {
  const items = nodes.map((node) => {
    const folder = node.label.endsWith("/") || node.children.length > 0;
    const note = node.note
      ? `<span class="oe-tree-note">${renderInline(node.note)}</span>`
      : "";
    const children =
      node.children.length > 0 ? treeList(node.children, false) : "";
    return `<li${node.highlight ? ' class="oe-tree-em"' : ""}><span class="oe-tree-row"><span class="oe-tree-name${folder ? " oe-tree-dir" : ""}">${treeLabel(node.label)}</span>${note}</span>${children}</li>`;
  });
  return `<ul${top ? ' class="oe-tree-list"' : ""}>${items.join("")}</ul>`;
}

function treeColumn(node: TreeNode): string {
  const children = node.children.length > 0 ? treeList(node.children) : "";
  return `<div class="oe-tree-col">${treeBox(node)}${children}</div>`;
}

/** File and module trees read as a list, never as an org chart. */
function looksLikePaths(roots: TreeNode[]): boolean {
  let total = 0;
  let paths = 0;
  const visit = (node: TreeNode) => {
    total++;
    if (/\/$|^[\w.@-]+\.[A-Za-z0-9]{1,5}$/.test(node.label.trim())) paths++;
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return paths * 2 >= total;
}

export const tree: Component = {
  name: "tree",
  summary: "Hierarchy by indentation: org chart, breakdown, or file tree",
  syntax: [
    "```tree [list]",
    "Root | subtitle",
    "  Child",
    "    Grandchild | one-line note",
    "  *Highlighted child",
    "```",
    '- Indentation (spaces or tabs) sets the level. "label | note" or "label  # note" adds a grey note.',
    "- One root with 2 to 4 children draws an org chart; several roots (up to 4) stand side by side.",
    "- More children, a file tree (names such as src/ or main.ts), or the list argument gives an indented list.",
    "- Labels take inline Markdown: `Section 1` Words shows the code as a tag.",
  ].join("\n"),
  example:
    "```tree\noma explain | subcommands\n  render | draft to page\n    *Layout\n    Lint\n  patch | one panel\n  validate\n```",
  render(text, args) {
    const roots: TreeNode[] = [];
    const stack: Array<{ indent: number; node: TreeNode }> = [];
    for (const raw of text.replace(/\t/g, "  ").split("\n")) {
      if (!raw.trim() || raw.trim().startsWith("//")) continue;
      // Box-drawing prefixes pasted from `tree` output count as indentation.
      const prefix = /^[\s│├└─]*(?:\|[-─]+\s*)?/u.exec(raw)?.[0] ?? "";
      let body = raw.slice(prefix.length).trim();
      if (!body) continue;
      const highlight = body.startsWith("*") && body.length > 1;
      if (highlight) body = body.slice(1).trim();
      const hash = /^(.*?)\s+#\s+(.+)$/.exec(body);
      const [label = "", ...rest] = hash ? [hash[1], hash[2]] : fields(body);
      const node: TreeNode = {
        label: (label ?? "").trim(),
        note: rest.join(" | ").trim(),
        highlight,
        children: [],
      };
      const indent = prefix.length;
      while (stack.length > 0 && (stack.at(-1)?.indent ?? 0) >= indent) {
        stack.pop();
      }
      const parent = stack.at(-1)?.node;
      (parent ? parent.children : roots).push(node);
      stack.push({ indent, node });
    }
    if (roots.length === 0) {
      throw new ComponentError("tree needs at least one line", 1);
    }
    const list = /\blist\b/i.test(args) || looksLikePaths(roots);
    const [root] = roots;
    if (roots.length === 1 && root) {
      const count = root.children.length;
      if (!list && count >= 2 && count <= 4) {
        return {
          html: `<div class="oe-tree oe-tree-org"><div class="oe-tree-root">${treeBox(root, true)}</div><div class="oe-tree-cols" style="--n:${count}">${root.children.map(treeColumn).join("")}</div></div>`,
        };
      }
      if (!list) {
        return {
          html: `<div class="oe-tree"><div class="oe-tree-root oe-tree-root-solo">${treeBox(root, true)}</div>${treeList(root.children)}</div>`,
        };
      }
    }
    if (!list && roots.length <= 4) {
      return {
        html: `<div class="oe-tree"><div class="oe-tree-cols oe-tree-cols-free" style="--n:${roots.length}">${roots.map(treeColumn).join("")}</div></div>`,
      };
    }
    return {
      html: `<div class="oe-tree oe-tree-files">${treeList(roots)}</div>`,
    };
  },
};

export const timeline: Component = {
  name: "timeline",
  summary: "Events in order: history, phases, a rollout",
  syntax: [
    "```timeline [h|v]",
    "when | title | detail (optional)",
    "*when | title         a leading * marks the current or key event",
    "```",
    "- Up to 6 events run left to right, more run top to bottom; h or v forces a direction.",
    "- A horizontal timeline becomes vertical on a narrow screen.",
  ].join("\n"),
  example:
    "```timeline\n2023 | Prototype | one vendor\n*2024 | Stable | eleven vendors\n2025 | Next | planned\n```",
  render(text, args) {
    const rows = contentLines(text).map(({ text: line, line: at }) => {
      const [rawWhen = "", rawTitle = "", ...detail] = fields(line);
      if (!rawWhen || !rawTitle) {
        throw new ComponentError(
          `timeline line must be "when | title | detail": "${line}"`,
          at,
        );
      }
      const lead = rawWhen.startsWith("*");
      const trail = rawTitle.endsWith("*") && rawTitle.length > 1;
      return {
        when: lead ? rawWhen.slice(1).trim() : rawWhen,
        title: trail ? rawTitle.slice(0, -1).trim() : rawTitle,
        detail: detail.join(" | "),
        key: lead || trail,
      };
    });
    if (rows.length === 0) {
      throw new ComponentError("timeline needs at least one line", 1);
    }
    const vertical =
      /\bv(ertical)?\b/i.test(args) ||
      (!/\bh(orizontal)?\b/i.test(args) && rows.length > 6);
    const items = rows.map(
      (row) =>
        `<li${row.key ? ' class="oe-tl-key"' : ""}><span class="oe-tl-when">${escapeHtml(row.when)}</span><span class="oe-tl-dot" aria-hidden="true"></span><span class="oe-tl-body"><strong>${renderInline(row.title)}</strong>${row.detail ? `<span>${renderInline(row.detail)}</span>` : ""}</span></li>`,
    );
    return {
      html: vertical
        ? `<ol class="oe-timeline oe-timeline-v">${items.join("")}</ol>`
        : `<ol class="oe-timeline oe-timeline-h" style="--n:${rows.length}">${items.join("")}</ol>`,
    };
  },
};

export const kv: Component = {
  name: "kv",
  summary: "Facts as a key-value grid, or a title block",
  syntax: [
    "```kv [cols=2]",
    "key: value",
    "key | value | note      the pipe form adds a grey note",
    "* wide key: value       a leading * spans the full row in larger text",
    "```",
    "- A line splits at the first colon; the value may hold more colons.",
  ].join("\n"),
  example:
    "```kv cols=2\n* Output: one HTML file\nInput: Markdown draft\nNetwork: none | works offline\n```",
  render(text, args) {
    const cols = Math.max(1, Math.min(Number(parseAttrs(args).cols) || 2, 6));
    const cells = contentLines(text).map(({ text: line, line: at }) => {
      const wide = line.startsWith("*") && line.length > 1;
      const body = wide ? line.slice(1).trim() : line;
      const colon = /^([^:：|]+)[:：]\s*(.*)$/.exec(body);
      const piped = fields(body);
      let key = "";
      let value = "";
      let note = "";
      if (colon) {
        const parts = fields(colon[2] as string);
        key = (colon[1] as string).trim();
        value = parts[0] ?? "";
        note = parts.slice(1).join(" | ");
      } else if (piped.length >= 2) {
        key = piped[0] ?? "";
        value = piped[1] ?? "";
        note = piped.slice(2).join(" | ");
      } else {
        throw new ComponentError(
          `kv line has no colon: "${line}"; write key: value`,
          at,
        );
      }
      if (!key) {
        throw new ComponentError(`kv line has no key: "${line}"`, at);
      }
      return `<div class="oe-kv-cell${wide ? " oe-kv-wide" : ""}"><dt>${renderInline(key)}</dt><dd>${renderInline(value)}${note ? `<span class="oe-kv-note">${renderInline(note)}</span>` : ""}</dd></div>`;
    });
    if (cells.length === 0) {
      throw new ComponentError("kv needs at least one key: value line", 1);
    }
    return {
      html: `<dl class="oe-kv" style="--kv-cols:${cols}">${cells.join("")}</dl>`,
    };
  },
};

const CALLOUT_MARK: Record<string, string> = {
  info: "i",
  ok: "✓",
  warn: "!",
  err: "✕",
  key: "★",
};
/** Words authors write for the five kinds. */
const CALLOUT_ALIAS: Record<string, string> = {
  note: "info",
  tip: "ok",
  success: "ok",
  warning: "warn",
  caution: "warn",
  error: "err",
  danger: "err",
};

export const callout: Component = {
  name: "callout",
  summary: "A conclusion, tip, or warning the reader must not miss",
  syntax: [
    "```callout <info|ok|warn|err|key> [title]",
    "Body (Markdown); a title alone is enough",
    "```",
    "- When the first word is not a kind, the whole argument is the title and the kind is info.",
    "- At most one or two per page; a page of callouts emphasizes nothing.",
  ].join("\n"),
  example:
    "```callout warn Offline only\nThe page loads no external resource.\n```",
  render(text, args) {
    const [first = "", ...rest] = args.split(/\s+/).filter(Boolean);
    const word = first.toLowerCase();
    const named = CALLOUT_ALIAS[word] ?? (word in CALLOUT_MARK ? word : "");
    const kind = named || "info";
    const title = (named ? rest.join(" ") : args).trim();
    if (!title && !text.trim()) {
      throw new ComponentError("callout needs a title or a body", 1);
    }
    const [firstLine] = contentLines(text);
    const typeLine =
      firstLine && /^type\s*[:：]\s*([a-z][\w-]*)\s*$/i.exec(firstLine.text);
    if (typeLine && firstLine) {
      const wanted = (typeLine[1] as string).toLowerCase();
      const fixed =
        CALLOUT_ALIAS[wanted] ??
        (wanted in CALLOUT_MARK ? wanted : "<info|ok|warn|err|key>");
      throw new ComponentError(
        `callout: put the kind on the fence line, not in the body: \`\`\`callout ${fixed} [title]. The line "${firstLine.text}" would show as body text`,
        firstLine.line,
      );
    }
    const head = title
      ? `<strong class="oe-callout-title">${escapeHtml(title)}</strong>`
      : "";
    const body = text.trim() ? renderMarkdown(text) : "";
    return {
      html: `<aside class="oe-callout oe-callout-${kind}" role="note"><span class="oe-callout-mark" aria-hidden="true">${CALLOUT_MARK[kind]}</span><div>${head}${body}</div></aside>`,
    };
  },
};
