import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import color from "picocolors";
import { loadTimezone } from "../../../utils/config.js";
import { openUrl } from "../../../utils/open-url.js";
import { COMPONENTS, findComponent } from "./components/index.js";
import { DraftError, parseDraft } from "./draft.js";
import { formatWarning } from "./lint.js";
import {
  extractDraftSource,
  patchDraft,
  type RenderOptions,
  type RenderResult,
  readPageSettings,
  renderDraft,
} from "./render.js";

export interface ExplainRenderOptions {
  file?: string;
  out?: string;
  template?: string;
  theme?: string;
  mode?: string;
  style?: string;
  lang?: string;
  open?: boolean;
  json?: boolean;
  cwd?: string;
  /** Test seam: the draft text, instead of reading `file` or stdin. */
  source?: string;
}

const RESULTS_DIR = path.join(".agents", "results", "explain");

/**
 * Today in the project's timezone (`timezone` in oma-config, else the system
 * timezone), the date the explain artifacts are named by.
 */
export function artifactDate(cwd?: string, now = new Date()): string {
  const format = (timeZone?: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  try {
    return format(loadTimezone(cwd));
  } catch (error) {
    // A mistyped `timezone` must not block rendering; use the system zone.
    if (error instanceof RangeError) return format();
    throw error;
  }
}

/** File-name slug: the draft's `slug`, else its title, else the input's name. */
export function artifactSlug(
  slug: string | undefined,
  title: string,
  file?: string,
): string {
  const tidy = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "");
  const fromSlug = tidy(slug ?? "");
  if (fromSlug) return fromSlug;
  const fromTitle = tidy(title);
  // A title that is mostly non-ASCII leaves a stub; prefer the file name then.
  if (fromTitle.length >= Math.min(8, title.trim().length)) return fromTitle;
  const fromFile = file
    ? tidy(
        path
          .basename(file)
          .replace(/\.[^.]+$/, "")
          .replace(/^\d{4}-\d{2}-\d{2}-/, ""),
      )
    : "";
  if (fromFile) return fromFile;
  const hash = createHash("sha256").update(title).digest("hex").slice(0, 8);
  return fromTitle ? `${fromTitle}-${hash}` : `explain-${hash}`;
}

function readSource(opts: ExplainRenderOptions, cwd: string): string {
  if (opts.source !== undefined) return opts.source;
  if (!opts.file || opts.file === "-") {
    if (process.stdin.isTTY) {
      throw new Error(
        "no draft given: pass a Markdown file, or pipe the draft to stdin",
      );
    }
    return fs.readFileSync(0, "utf-8");
  }
  return fs.readFileSync(path.resolve(cwd, opts.file), "utf-8");
}

function draftLabel(opts: { file?: string }): string {
  return opts.file && opts.file !== "-" ? opts.file : "draft";
}

function reportDraftError(
  error: unknown,
  label: string,
  json: boolean,
): number {
  const line = error instanceof DraftError ? error.line : undefined;
  const message = error instanceof Error ? error.message : String(error);
  if (json) {
    console.log(JSON.stringify({ ok: false, error: message, line }, null, 2));
  } else {
    console.error(
      color.red(`${label}${line !== undefined ? `:${line}` : ""}: ${message}`),
    );
  }
  return 1;
}

function finish(
  result: RenderResult,
  outPath: string,
  opts: { json?: boolean; open?: boolean },
  label: string,
): number {
  const strict = result.style === "strict" && result.warnings.length > 0;
  if (!strict) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, result.html);
  }
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: !strict,
          file: strict ? undefined : outPath,
          lang: result.lang,
          template: result.template,
          theme: result.theme,
          components: result.components,
          panels: result.draft.panels.map((panel) => ({
            id: panel.id,
            title: panel.title,
          })),
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
  } else {
    for (const warning of result.warnings) {
      console.error(color.yellow(`${label}: ${formatWarning(warning)}`));
    }
    if (strict) {
      console.error(
        color.red(
          `style: strict — ${result.warnings.length} warning(s); nothing was written`,
        ),
      );
    } else {
      console.log(`${color.green("✔")} ${outPath}`);
    }
  }
  if (strict) return 1;
  if (opts.open) openUrl(outPath);
  return 0;
}

export async function runExplainRender(
  opts: ExplainRenderOptions,
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const label = draftLabel(opts);
  const json = opts.json === true;
  // Resolved once: config loading can shell out to `cue`, and the file name
  // must match the date stamped into the page even across midnight.
  const date = artifactDate(cwd);
  const renderOptions: RenderOptions = {
    template: opts.template,
    theme: opts.theme,
    mode: opts.mode,
    style: opts.style,
    lang: opts.lang,
    date,
  };
  let source: string;
  let result: RenderResult;
  try {
    source = readSource(opts, cwd);
    result = renderDraft(source, renderOptions);
  } catch (error) {
    return reportDraftError(error, label, json);
  }

  const { meta } = result.draft;
  const outPath = path.resolve(
    cwd,
    opts.out ??
      path.join(
        RESULTS_DIR,
        `${date}-${artifactSlug(meta.slug, meta.title, opts.file)}.html`,
      ),
  );
  return finish(result, outPath, opts, label);
}

export interface ExplainPatchOptions {
  html: string;
  panel: string;
  file?: string;
  open?: boolean;
  json?: boolean;
  cwd?: string;
  source?: string;
}

/** Re-render one panel of a page from the draft embedded in it. */
export async function runExplainPatch(
  opts: ExplainPatchOptions,
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const json = opts.json === true;
  const htmlPath = path.resolve(cwd, opts.html);
  let result: RenderResult;
  try {
    const html = fs.readFileSync(htmlPath, "utf-8");
    const draft = extractDraftSource(html);
    if (draft === undefined) {
      throw new Error(
        `${opts.html} was not made by \`oma explain render\`, so it holds no draft to patch`,
      );
    }
    const replacement = readSource(
      { file: opts.file, source: opts.source },
      cwd,
    );
    // The page keeps the look it was rendered with.
    const settings = readPageSettings(html);
    result = renderDraft(patchDraft(draft, opts.panel, replacement), {
      ...settings,
      date: artifactDate(cwd),
    });
  } catch (error) {
    return reportDraftError(error, draftLabel(opts), json);
  }
  // Warning lines count from the top of the draft embedded in the page.
  return finish(result, htmlPath, opts, `${opts.html} (draft)`);
}

export interface ExplainLintOptions {
  file?: string;
  style?: string;
  lang?: string;
  json?: boolean;
  cwd?: string;
  source?: string;
}

/** Check a draft's prose without rendering it. */
export function runExplainLint(opts: ExplainLintOptions): number {
  const cwd = opts.cwd ?? process.cwd();
  const label = draftLabel(opts);
  const json = opts.json === true;
  try {
    const source = readSource(opts, cwd);
    // Rendering resolves the language and reports a malformed draft exactly
    // as `render` would. A draft that turns its own check off is still
    // checked here: that is what this command is for.
    const own = parseDraft(source).meta.style;
    const result = renderDraft(source, {
      style: opts.style ?? (own === "off" ? "warn" : own),
      lang: opts.lang,
    });
    const { warnings } = result;
    const failed = result.style === "strict" && warnings.length > 0;
    if (json) {
      console.log(
        JSON.stringify(
          { ok: !failed, lang: result.lang, style: result.style, warnings },
          null,
          2,
        ),
      );
    } else if (warnings.length === 0) {
      console.log(`${color.green("✔")} ${label}: no prose warnings`);
    } else {
      for (const warning of warnings) {
        console.log(color.yellow(`${label}: ${formatWarning(warning)}`));
      }
      console.log(
        `${warnings.length} warning(s)${failed ? " — style: strict fails on any warning" : ""}`,
      );
    }
    return failed ? 1 : 0;
  } catch (error) {
    return reportDraftError(error, label, json);
  }
}

/** List the components, or print one component's syntax and example. */
export function runExplainComponents(
  name: string | undefined,
  opts: { json?: boolean } = {},
): number {
  if (name) {
    const component = findComponent(name.toLowerCase());
    if (!component) {
      console.error(
        color.red(
          `unknown component "${name}"; available: ${COMPONENTS.map((c) => c.name).join(", ")}`,
        ),
      );
      return 1;
    }
    if (opts.json) {
      const { render: _render, ...rest } = component;
      console.log(JSON.stringify(rest, null, 2));
    } else {
      console.log(
        `${color.bold(component.name)} — ${component.summary}\n\n${component.syntax}\n\nExample:\n${component.example}`,
      );
    }
    return 0;
  }
  if (opts.json) {
    console.log(
      JSON.stringify(
        COMPONENTS.map(({ render: _render, ...rest }) => rest),
        null,
        2,
      ),
    );
    return 0;
  }
  for (const component of COMPONENTS) {
    console.log(`${color.bold(component.name.padEnd(10))}${component.summary}`);
  }
  console.log(
    color.dim(
      "\n`oma explain components <name>` prints the syntax and an example.\nAny other fenced block (```ts, ```diff, …) is shown as code.",
    ),
  );
  return 0;
}
