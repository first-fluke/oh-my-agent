import { parse as parseYaml } from "yaml";

/** One run of content inside a panel, with its line in the draft (1-based). */
export type DraftBlock =
  | { type: "markdown"; text: string; line: number }
  | {
      type: "component";
      name: string;
      args: string;
      text: string;
      line: number;
    };

export interface DraftPanel {
  /** Letter id shown in the panel head: A, B, C, … */
  id: string;
  title: string;
  line: number;
  /** Width hint in grid columns. */
  span?: number;
  /** Small text shown at the right of the panel head. */
  note?: string;
  /** No title bar. */
  bare: boolean;
  /** Preferred source of the interactive archify sidecar. */
  archify: boolean;
  blocks: DraftBlock[];
}

export interface DraftMeta {
  title: string;
  subtitle?: string;
  slug?: string;
  theme?: string;
  mode?: string;
  lang?: string;
  style?: string;
  cols: number;
  /** Any other frontmatter key, shown in the page header's meta line. */
  extras: Array<[string, string]>;
}

export interface Draft {
  meta: DraftMeta;
  lead: DraftBlock[];
  panels: DraftPanel[];
  /** The draft text, kept in the page so one panel can be patched later. */
  source: string;
}

export class DraftError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
    this.name = "DraftError";
  }
}

const KNOWN_META = new Set([
  "title",
  "subtitle",
  "slug",
  "theme",
  "mode",
  "lang",
  "style",
  "cols",
]);

function parseMeta(yaml: string, line: number): DraftMeta {
  let raw: unknown;
  try {
    raw = parseYaml(yaml);
  } catch (error) {
    throw new DraftError(
      `frontmatter is not valid YAML: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      line,
    );
  }
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const text = (key: string): string | undefined => {
    const value = record[key];
    return value === undefined || value === null ? undefined : String(value);
  };
  const cols = Number(record.cols ?? 3);
  return {
    title: text("title") ?? "",
    subtitle: text("subtitle"),
    slug: text("slug"),
    theme: text("theme"),
    mode: text("mode"),
    lang: text("lang"),
    style: text("style"),
    cols: Number.isInteger(cols) && cols >= 1 && cols <= 4 ? cols : 3,
    extras: Object.entries(record)
      .filter(([key]) => !KNOWN_META.has(key))
      .map(([key, value]): [string, string] => [key, String(value)]),
  };
}

/** `## A Title {span=2 note="…" bare archify}` → title and attributes. */
function parsePanelHead(
  head: string,
  line: number,
  ordinal: number,
): DraftPanel {
  let title = head.trim();
  let span: number | undefined;
  let note: string | undefined;
  let bare = false;
  let archify = false;
  const attrs = /\{([^{}]*)\}\s*$/.exec(title);
  if (attrs) {
    title = title.slice(0, attrs.index).trim();
    const body = attrs[1] ?? "";
    span = Number(/\bspan=(\d+)/.exec(body)?.[1]) || undefined;
    note = /\b(?:note|meta)="([^"]*)"/.exec(body)?.[1];
    bare = /\bbare\b/.test(body);
    archify = /\barchify\b/.test(body);
  }
  const lettered = /^([A-Z])\s+(.+)$/.exec(title);
  const id = lettered?.[1] ?? String.fromCharCode(65 + (ordinal % 26));
  return {
    id,
    title: lettered?.[2] ?? title,
    line,
    span,
    note,
    bare,
    archify,
    blocks: [],
  };
}

/**
 * Parse a draft: optional YAML frontmatter, an optional lead, then one panel
 * per `## ` heading. Inside a panel, a fenced block names a component
 * (```flow LR) and everything else is Markdown.
 */
export function parseDraft(source: string): Draft {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let cursor = 0;
  let meta = parseMeta("", 1);

  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end === -1) {
      throw new DraftError("frontmatter opened with --- is never closed", 1);
    }
    meta = parseMeta(lines.slice(1, end).join("\n"), 2);
    cursor = end + 1;
  }

  const lead: DraftBlock[] = [];
  const panels: DraftPanel[] = [];
  let target = lead;
  let prose: string[] = [];
  let proseLine = cursor + 1;

  const flushProse = () => {
    const text = prose.join("\n").trim();
    if (text) target.push({ type: "markdown", text, line: proseLine });
    prose = [];
  };

  while (cursor < lines.length) {
    const line = lines[cursor] ?? "";
    const fence = /^(`{3,})\s*([A-Za-z][\w-]*)?\s*(.*)$/.exec(line);
    if (fence) {
      const ticks = fence[1] as string;
      const close = lines.findIndex(
        (candidate, index) => index > cursor && candidate.trim() === ticks,
      );
      if (close === -1) {
        throw new DraftError(
          `fenced block opened with ${ticks} is never closed`,
          cursor + 1,
        );
      }
      flushProse();
      target.push({
        type: "component",
        name: (fence[2] ?? "").toLowerCase(),
        args: (fence[3] ?? "").trim(),
        text: lines.slice(cursor + 1, close).join("\n"),
        line: cursor + 1,
      });
      cursor = close + 1;
      proseLine = cursor + 1;
      continue;
    }
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flushProse();
      const panel = parsePanelHead(
        heading[1] as string,
        cursor + 1,
        panels.length,
      );
      panels.push(panel);
      target = panel.blocks;
      cursor++;
      proseLine = cursor + 1;
      continue;
    }
    if (prose.length === 0) {
      if (!line.trim()) {
        cursor++;
        continue;
      }
      proseLine = cursor + 1;
    }
    prose.push(line);
    cursor++;
  }
  flushProse();

  if (!meta.title) {
    throw new DraftError(
      "the draft needs a title: add `title: …` to the frontmatter",
      1,
    );
  }
  if (panels.length === 0) {
    throw new DraftError(
      "the draft has no panels: start each one with `## Panel title`",
      lines.length,
    );
  }
  return { meta, lead, panels, source };
}
