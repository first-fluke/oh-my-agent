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
  /** Id shown in the panel head: A, B, C, … or the one the heading gives. */
  id: string;
  title: string;
  line: number;
  /** Width hint in grid columns, as the author wrote it. */
  span?: number;
  /** Height hint in grid rows; shapes the plain grid only. */
  rows?: number;
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
  template?: string;
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
  "template",
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
    template: text("template"),
    theme: text("theme"),
    mode: text("mode"),
    lang: text("lang"),
    style: text("style"),
    cols: Number.isInteger(cols) && cols >= 1 && cols <= 12 ? cols : 3,
    extras: Object.entries(record)
      .filter(
        ([key, value]) =>
          !KNOWN_META.has(key) && value !== null && value !== "",
      )
      .map(([key, value]): [string, string] => [key, String(value)]),
  };
}

const ATTR_BLOCK_RE = /\s*\{([^{}]*)\}\s*$/;
const ATTR_TOKEN_RE = /([\w-]+)(?:=("[^"]*"|'[^']*'|\S+))?/g;
const PANEL_ID_RE = /^([A-Z][0-9]?)\s+(.+)$/;

/** `span=2 note="a b" bare` → { span: "2", note: "a b", bare: true }. */
export function parseAttrs(text: string): Record<string, string | true> {
  const attrs: Record<string, string | true> = {};
  for (const match of text.matchAll(ATTR_TOKEN_RE)) {
    const value = match[2];
    attrs[match[1] as string] =
      value === undefined ? true : value.replace(/^(["'])(.*)\1$/, "$2");
  }
  return attrs;
}

/** `## A Title {span=2 note="…" bare archify}` → title, optional id, attributes. */
export function parsePanelHead(
  head: string,
  line: number,
): Omit<DraftPanel, "id"> & { id?: string } {
  let title = head.trim();
  let attrs: Record<string, string | true> = {};
  const block = ATTR_BLOCK_RE.exec(title);
  if (block) {
    attrs = parseAttrs(block[1] ?? "");
    title = title.slice(0, block.index).trim();
  }
  const lettered = PANEL_ID_RE.exec(title);
  const count = (key: string): number | undefined => {
    const value = Number(attrs[key]);
    return Number.isInteger(value) && value >= 1 ? value : undefined;
  };
  const note = attrs.note ?? attrs.meta;
  return {
    id: lettered?.[1],
    title: lettered?.[2]?.trim() ?? title,
    line,
    span: count("span"),
    rows: count("rows"),
    note: typeof note === "string" ? note : undefined,
    bare: attrs.bare === true,
    archify: attrs.archify === true,
    blocks: [],
  };
}

/** Letters for the panels that have no id of their own; P27, P28 after Z. */
function assignIds(
  panels: Array<Omit<DraftPanel, "id"> & { id?: string }>,
): DraftPanel[] {
  const used = new Set<string>();
  for (const panel of panels) {
    if (!panel.id) continue;
    if (used.has(panel.id)) {
      throw new DraftError(
        `two panels have the id "${panel.id}"; give each panel its own letter or leave the letters out`,
        panel.line,
      );
    }
    used.add(panel.id);
  }
  let code = 65;
  const next = (): string => {
    while (code <= 90 && used.has(String.fromCharCode(code))) code++;
    const id = code <= 90 ? String.fromCharCode(code) : `P${code - 64}`;
    used.add(id);
    code++;
    return id;
  };
  return panels.map((panel) => ({ ...panel, id: panel.id ?? next() }));
}

/**
 * Parse a draft: optional YAML frontmatter, an optional lead, then one panel
 * per `## ` heading. Inside a panel, a fenced block names a component
 * (```flow LR) and everything else is Markdown. Without a frontmatter title,
 * a leading `# Heading` is the title.
 */
export function parseDraft(source: string): Draft {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let cursor = 0;
  let meta = parseMeta("", 1);

  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex(
      (line, index) => index > 0 && line.trim() === "---",
    );
    if (end === -1) {
      throw new DraftError("frontmatter opened with --- is never closed", 1);
    }
    meta = parseMeta(lines.slice(1, end).join("\n"), 2);
    cursor = end + 1;
  }

  const lead: DraftBlock[] = [];
  const panels: Array<Omit<DraftPanel, "id"> & { id?: string }> = [];
  let target = lead;
  let prose: string[] = [];
  let proseLine = cursor + 1;

  const flushProse = () => {
    const text = prose.join("\n").trimEnd();
    if (text.trim()) target.push({ type: "markdown", text, line: proseLine });
    prose = [];
  };

  while (cursor < lines.length) {
    const line = lines[cursor] ?? "";
    const fence = /^(`{3,}|~{3,})\s*([^\s`]*)\s*(.*)$/.exec(line);
    if (fence) {
      const marker = fence[1] as string;
      const closing = new RegExp(`^${marker[0]}{${marker.length},}\\s*$`);
      const close = lines.findIndex(
        (candidate, index) => index > cursor && closing.test(candidate),
      );
      if (close === -1) {
        throw new DraftError(
          `fenced block opened with ${marker}${fence[2] ?? ""} is never closed`,
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
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flushProse();
      const panel = parsePanelHead(heading[1] as string, cursor + 1);
      panels.push(panel);
      target = panel.blocks;
      cursor++;
      proseLine = cursor + 1;
      continue;
    }
    const title = /^#\s+(.+?)\s*$/.exec(line);
    if (title && target === lead && lead.length === 0 && prose.length === 0) {
      // The page title, when the frontmatter gives none.
      if (!meta.title) meta.title = title[1] as string;
      cursor++;
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
      "the draft needs a title: add `title: …` to the frontmatter, or start with `# Title`",
      1,
    );
  }
  if (panels.length === 0) {
    throw new DraftError(
      "the draft has no panels: start each one with `## Panel title`",
      lines.length,
    );
  }
  return { meta, lead, panels: assignIds(panels), source };
}
