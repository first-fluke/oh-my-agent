import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import color from "picocolors";
import {
  ARCHIFY_ENV_NO_UPDATE,
  loadDiagramConfig,
  resolveDiagramEngine,
} from "../../../platform/diagram-engine.js";
import { openUrl } from "../../../utils/open-url.js";
import { type ArchifyQuality, toArchifySpec } from "./archify.js";
import { COMPONENTS, findComponent } from "./components/index.js";
import { DraftError, parseDraft } from "./draft.js";
import { formatWarning } from "./lint.js";
import {
  extractDraftSource,
  type PanelDiagram,
  patchDraft,
  type RenderOptions,
  type RenderResult,
  readPageSettings,
  renderDraft,
  sidecarSource,
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
  /** true / false from the flag; undefined defers to `diagram.explain_sidecar`. */
  archify?: boolean;
  json?: boolean;
  cwd?: string;
  /** Test seam: the draft text, instead of reading `file` or stdin. */
  source?: string;
}

export interface SidecarReport {
  status: "linked" | "skipped" | "failed";
  file?: string;
  spec?: string;
  reason?: string;
}

const RESULTS_DIR = path.join(".agents", "results", "explain");
const SIDECAR_TIMEOUT_MS = 120_000;

/** Today in Asia/Seoul, the date the explain artifacts are named by. */
export function artifactDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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

/**
 * Build the archify sidecar next to the page. Never throws: a sidecar is an
 * extra, and the page is complete without it.
 */
async function buildSidecar(
  diagram: PanelDiagram,
  title: string,
  htmlPath: string,
  cwd: string,
): Promise<SidecarReport> {
  const resolution = await resolveDiagramEngine({ cwd });
  if (!resolution.archify) {
    return { status: "skipped", reason: resolution.reason };
  }
  const dir = path.dirname(htmlPath);
  const stem = path.basename(htmlPath).replace(/\.html$/i, "");
  const specName = `${stem}.archify.json`;
  const outName = `${stem}.archify.html`;
  // Showcase asks for more than a derived spec always carries; fall back to
  // standard once rather than drop the sidecar.
  const qualities: ArchifyQuality[] =
    resolution.quality === "showcase" ? ["showcase", "standard"] : ["standard"];
  let reason = "";
  for (const quality of qualities) {
    const built = toArchifySpec(diagram.model, {
      title: `${title} — ${diagram.title}`,
      output: outName,
      quality,
    });
    if (!built) {
      return {
        status: "skipped",
        reason: "the diagram is too small or too large for an archify view",
      };
    }
    fs.writeFileSync(
      path.join(dir, specName),
      `${JSON.stringify(built.spec, null, 2)}\n`,
    );
    const run = spawnSync(
      process.execPath,
      [
        resolution.archify.bin,
        "deliver",
        built.type,
        specName,
        outName,
        "--quality",
        quality,
        "--json",
      ],
      {
        cwd: dir,
        encoding: "utf-8",
        timeout: SIDECAR_TIMEOUT_MS,
        env: { ...process.env, [ARCHIFY_ENV_NO_UPDATE]: "1" },
      },
    );
    if (run.status === 0 && fs.existsSync(path.join(dir, outName))) {
      return {
        status: "linked",
        file: path.join(dir, outName),
        spec: path.join(dir, specName),
        reason:
          `archify ${resolution.archify.version ?? ""} ${built.type}, ${quality}`.replace(
            /\s+/g,
            " ",
          ),
      };
    }
    reason = firstDiagnostic(run.stdout, run.stderr, run.error);
  }
  return {
    status: "failed",
    spec: path.join(dir, specName),
    reason: reason || "archify deliver did not produce the file",
  };
}

function firstDiagnostic(
  stdout: string | null,
  stderr: string | null,
  error?: Error,
): string {
  if (error) return error.message;
  try {
    const receipt = JSON.parse(stdout ?? "") as {
      errors?: Array<{ message?: string; code?: string }>;
      error?: string;
    };
    const first = receipt.errors?.[0];
    if (first) return [first.code, first.message].filter(Boolean).join(": ");
    if (receipt.error) return receipt.error;
  } catch {
    // Not a JSON receipt; fall through to the raw text.
  }
  const text = `${stderr ?? ""}\n${stdout ?? ""}`.trim();
  return text.split("\n")[0]?.slice(0, 240) ?? "";
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
  sidecar: SidecarReport | undefined,
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
          sidecar,
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
      if (sidecar?.status === "linked" && !sidecar.file) {
        console.log(color.dim(`  archify sidecar: ${sidecar.reason}`));
      } else if (sidecar?.status === "linked") {
        console.log(
          `  interactive diagram: ${sidecar.file} (${sidecar.reason})`,
        );
      } else if (sidecar) {
        console.log(
          color.dim(`  archify sidecar ${sidecar.status}: ${sidecar.reason}`),
        );
      }
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
  const renderOptions: RenderOptions = {
    template: opts.template,
    theme: opts.theme,
    mode: opts.mode,
    style: opts.style,
    lang: opts.lang,
    date: artifactDate(),
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
        `${artifactDate()}-${artifactSlug(meta.slug, meta.title, opts.file)}.html`,
      ),
  );

  let sidecar: SidecarReport | undefined;
  const wanted = opts.archify ?? loadDiagramConfig(cwd).explain_sidecar;
  const strict = result.style === "strict" && result.warnings.length > 0;
  if (wanted && !strict) {
    const diagram = sidecarSource(result.diagrams);
    if (!diagram) {
      sidecar = {
        status: "skipped",
        reason: "the draft has no flow or sequence block",
      };
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      try {
        sidecar = await buildSidecar(diagram, meta.title, outPath, cwd);
      } catch (error) {
        sidecar = {
          status: "failed",
          reason: error instanceof Error ? error.message : String(error),
        };
      }
      if (sidecar.status === "linked" && sidecar.file) {
        result = renderDraft(source, {
          ...renderOptions,
          sidecarHref: `./${path.basename(sidecar.file)}`,
        });
      }
    }
  }
  return finish(result, outPath, sidecar, opts, label);
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
  let hadSidecar = false;
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
    hadSidecar = settings.sidecarHref !== undefined;
    result = renderDraft(patchDraft(draft, opts.panel, replacement), {
      ...settings,
      date: artifactDate(),
    });
  } catch (error) {
    return reportDraftError(error, draftLabel(opts), json);
  }
  const sidecar: SidecarReport | undefined = hadSidecar
    ? {
        status: "linked",
        reason:
          "kept the existing sidecar; run `oma explain render --archify` again if the diagram changed",
      }
    : undefined;
  // Warning lines count from the top of the draft embedded in the page.
  return finish(result, htmlPath, sidecar, opts, `${opts.html} (draft)`);
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
