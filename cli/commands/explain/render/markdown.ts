import { escapeHtml } from "./text.js";

// A small Markdown renderer for panel prose: paragraphs, lists, tables,
// quotes, code, and inline emphasis. Every character of the draft is escaped,
// so text such as `<sid>` shows as written and no draft can inject markup.

const STATUS = new Set(["ok", "no", "warn"]);
const STATUS_MARK: Record<string, string> = { ok: "✓", no: "✕", warn: "!" };

/** Inline Markdown → HTML. Code spans are taken out first so nothing inside them is styled. */
export function renderInline(text: string): string {
  const spans: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    spans.push(`<code>${escapeHtml(code)}</code>`);
    return `\uE000${spans.length - 1}\uE000`;
  });
  out = escapeHtml(out)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\.{0,2}\/|#)[^)\s]*)\)/g,
      '<a href="$2">$1</a>',
    );
  return out.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => {
    return spans[Number(index)] ?? "";
  });
}

/** A table cell that starts with ok / no / warn becomes a status badge. */
function renderCell(cell: string): string {
  const match = /^(ok|no|warn)\b\s*(.*)$/i.exec(cell.trim());
  const word = match?.[1]?.toLowerCase();
  if (!match || !word || !STATUS.has(word)) return renderInline(cell.trim());
  const rest = match[2] ? ` ${renderInline(match[2])}` : "";
  return `<span class="oe-status oe-status-${word}"><b aria-hidden="true">${STATUS_MARK[word]}</b><span class="oe-sr">${word}</span>${rest}</span>`;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(rows: string[]): string {
  const head = splitRow(rows[0] as string);
  const body = rows.slice(2).map(splitRow);
  const headHtml = head
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("");
  const bodyHtml = body
    .map(
      (row) =>
        `<tr>${head.map((_cell, index) => `<td>${renderCell(row[index] ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");
  // Wide tables scroll inside their own box instead of widening the page.
  return `<div class="oe-scroll"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

interface ListItem {
  indent: number;
  ordered: boolean;
  text: string;
}

function renderList(items: ListItem[]): string {
  let html = "";
  const open: Array<{ indent: number; tag: string }> = [];
  for (const item of items) {
    const tag = item.ordered ? "ol" : "ul";
    while (
      open.length > 0 &&
      (open[open.length - 1]?.indent ?? 0) > item.indent
    ) {
      html += `</li></${open.pop()?.tag}>`;
    }
    const top = open[open.length - 1];
    if (!top || top.indent < item.indent) {
      html += `<${tag}>`;
      open.push({ indent: item.indent, tag });
    } else {
      html += "</li>";
    }
    html += `<li>${renderInline(item.text)}`;
  }
  while (open.length > 0) html += `</li></${open.pop()?.tag}>`;
  return html;
}

/** Block Markdown → HTML. */
export function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index++;
      continue;
    }
    const fence = /^(`{3,})(.*)$/.exec(line);
    if (fence) {
      const close = lines.findIndex(
        (candidate, at) => at > index && candidate.trim() === fence[1],
      );
      const end = close === -1 ? lines.length : close;
      out.push(
        `<div class="oe-scroll"><pre><code>${escapeHtml(lines.slice(index + 1, end).join("\n"))}</code></pre></div>`,
      );
      index = end + 1;
      continue;
    }
    const heading = /^(#{3,4})\s+(.+)$/.exec(line);
    if (heading) {
      out.push(`<h4>${renderInline(heading[2] as string)}</h4>`);
      index++;
      continue;
    }
    if (
      line.includes("|") &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(
        lines[index + 1] ?? "",
      )
    ) {
      const rows: string[] = [];
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        rows.push(lines[index] as string);
        index++;
      }
      out.push(renderTable(rows));
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index] ?? "")) {
        quote.push((lines[index] as string).replace(/^\s*>\s?/, ""));
        index++;
      }
      out.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
      continue;
    }
    const bullet = /^(\s*)([-*]|\d+[.)])\s+(.+)$/;
    if (bullet.test(line)) {
      const items: ListItem[] = [];
      while (index < lines.length) {
        const match = bullet.exec(lines[index] ?? "");
        if (match) {
          items.push({
            indent: (match[1] ?? "").length,
            ordered: /\d/.test(match[2] ?? ""),
            text: match[3] as string,
          });
        } else if ((lines[index] ?? "").trim() && items.length > 0) {
          // A wrapped line continues the item above it.
          const last = items[items.length - 1] as ListItem;
          last.text += ` ${(lines[index] as string).trim()}`;
        } else {
          break;
        }
        index++;
      }
      out.push(renderList(items));
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? "").trim() &&
      !/^(`{3,}|#{3,4}\s|\s*>|\s*([-*]|\d+[.)])\s)/.test(lines[index] ?? "")
    ) {
      paragraph.push((lines[index] as string).trim());
      index++;
    }
    out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return out.join("\n");
}
