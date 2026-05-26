/**
 * styles.ts — oma slide styles list|preview|get
 *
 * T10: Style/template library commands.
 *
 * list:     reads selection-index.json + style-presets.md from the oma-slide
 *           resources dir (located via the SAME upward-search resolver as workspace.ts)
 *           and prints all 12 presets + 34 bold-template metadata entries.
 *
 * preview:  prints a metadata card for a single slug (preset or bold template).
 *
 * get <slug> [--refresh]:
 *           fetches the bold template's design.md from its `source` URL
 *           (always-latest main, no SHA pin), caches to
 *           ~/.cache/oma-slide/styles/<slug>.md.
 *           Default: use cache as offline fallback on fetch failure.
 *           --refresh: force re-fetch (ignore cache).
 *           On 404/fetch error: falls back to a vendored preset with clear message.
 *           Logs the source URL fetched (untrusted DATA — style reference only).
 *
 * Exit codes: 0 ok · 1 error · 4 invalid-input
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import color from "picocolors";
import { resolveAssetsSourceDir } from "./workspace.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoldTemplate {
  slug: string;
  name: string;
  mood: string[];
  tone: string[];
  formality: string;
  density: string;
  scheme: string;
  tagline: string;
  source: string;
}

interface SelectionIndex {
  _license?: string;
  // selection-index.json top-level array key is `templates` (34 bold templates).
  templates: BoldTemplate[];
}

// ─── Resource paths ───────────────────────────────────────────────────────────

/**
 * Locate the oma-slide resources directory.
 * Reuses the upward-search resolver pattern from workspace.ts (resolveAssetsSourceDir),
 * but looks for the resources dir itself (parent of assets/).
 */
function resolveResourcesDir(): string | null {
  const assetsDir = resolveAssetsSourceDir();
  if (!assetsDir) return null;
  // assetsDir = <root>/.agents/skills/oma-slide/resources/assets
  // resourcesDir = <root>/.agents/skills/oma-slide/resources
  return dirname(assetsDir);
}

// ─── Cache dir ────────────────────────────────────────────────────────────────

function getStylesCacheDir(): string {
  return join(homedir(), ".cache", "oma-slide", "styles");
}

export function getCachedStylePath(slug: string): string {
  return join(getStylesCacheDir(), `${slug}.md`);
}

// ─── Load selection-index.json ────────────────────────────────────────────────

function loadSelectionIndex(resourcesDir: string): SelectionIndex | null {
  const indexPath = join(resourcesDir, "selection-index.json");
  if (!existsSync(indexPath)) return null;
  try {
    return JSON.parse(readFileSync(indexPath, "utf8")) as SelectionIndex;
  } catch {
    return null;
  }
}

// ─── Load style-presets.md ────────────────────────────────────────────────────

function loadStylePresets(resourcesDir: string): string | null {
  const presetsPath = join(resourcesDir, "style-presets.md");
  if (!existsSync(presetsPath)) return null;
  return readFileSync(presetsPath, "utf8");
}

/**
 * Extract preset slugs and names from style-presets.md.
 * Looks for "### `<slug>`" headings followed by bold metadata lines.
 */
export function parsePresetsFromMd(md: string): Array<{
  slug: string;
  name: string;
  mood: string;
  scheme: string;
  density: string;
}> {
  const presets: Array<{
    slug: string;
    name: string;
    mood: string;
    scheme: string;
    density: string;
  }> = [];

  // Match "### `slug`\n\n**Mood**: ...\n**Scheme**: ...\n..."
  const headingRe = /^### `([^`]+)`\s*\n([\s\S]*?)(?=^###|$(?![\s\S]))/gm;
  let m: RegExpExecArray | null = headingRe.exec(md);

  while (m !== null) {
    const slug = (m[1] ?? "").trim();
    const body = m[2] ?? "";

    const mood = extractMeta(body, "Mood") ?? "";
    const scheme = extractMeta(body, "Scheme") ?? "";
    const density = "balanced"; // presets don't have explicit density field

    presets.push({ slug, name: slugToName(slug), mood, scheme, density });
    m = headingRe.exec(md);
  }

  return presets;
}

function extractMeta(body: string, key: string): string | null {
  const re = new RegExp(`\\*\\*${key}\\*\\*:?\\s*([^\n]+)`, "i");
  const g = re.exec(body)?.[1];
  return g !== undefined ? g.trim() : null;
}

export function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── list ─────────────────────────────────────────────────────────────────────

export async function runStylesList(): Promise<number> {
  const resourcesDir = resolveResourcesDir();

  if (!resourcesDir) {
    console.error(
      color.red(
        "oma-slide resources directory not found. Run from within the oh-my-agent project directory.",
      ),
    );
    return 1;
  }

  // Load selection-index.json (34 bold templates)
  const index = loadSelectionIndex(resourcesDir);
  if (!index) {
    console.warn(
      color.yellow(
        `  Warning: selection-index.json not found in "${resourcesDir}" — bold templates unavailable.`,
      ),
    );
  }

  // Load style-presets.md (12 presets)
  const presetsMd = loadStylePresets(resourcesDir);

  // Print vendored presets section
  console.log(
    color.bold("\n── Vendored Presets (12) — offline, always available ──\n"),
  );

  if (presetsMd) {
    const presets = parsePresetsFromMd(presetsMd);
    if (presets.length > 0) {
      for (const p of presets) {
        const schemeTag =
          p.scheme === "dark"
            ? color.dim("[dark]")
            : p.scheme === "light"
              ? color.dim("[light]")
              : color.dim("[auto]");
        console.log(
          `  ${color.cyan(p.slug.padEnd(20))} ${color.bold(p.name.padEnd(22))} ${schemeTag.padEnd(10)} ${color.dim(p.mood)}`,
        );
      }
    } else {
      // Fallback: list known preset slugs from the file content
      const knownPresets = [
        "default",
        "dark-pro",
        "minimal-white",
        "vibrant-color",
        "editorial",
        "deep-dark",
        "warm-cream",
        "ocean-deep",
        "forest-green",
        "tech-blue",
        "sunset-warm",
        "monochrome",
      ];
      for (const slug of knownPresets) {
        console.log(`  ${color.cyan(slug)}`);
      }
    }
  } else {
    console.warn(
      color.yellow(
        `  Warning: style-presets.md not found in "${resourcesDir}"`,
      ),
    );
  }

  // Print bold templates section
  console.log(
    color.bold(
      "\n── Bold Templates (34) — fetched on demand via 'styles get' ──\n",
    ),
  );

  if (index) {
    const templates = index.templates;
    for (const t of templates) {
      const schemeTag =
        t.scheme === "dark" ? color.dim("[dark]") : color.dim("[light]");
      console.log(
        `  ${color.cyan(t.slug.padEnd(20))} ${color.bold(t.name.padEnd(22))} ${schemeTag.padEnd(10)} ${color.dim(`${t.mood.join(", ")} · ${t.tone.join(", ")}`)}`,
      );
    }
    console.log(
      color.dim(
        `\n  Run 'oma slide styles get <slug>' to fetch a template's design.md`,
      ),
    );
  } else {
    console.log(
      color.dim(
        "  Bold templates unavailable (selection-index.json not found).",
      ),
    );
  }

  const totalPresets = presetsMd ? parsePresetsFromMd(presetsMd).length : 0;
  const totalBold = index ? index.templates.length : 0;
  console.log(
    color.dim(
      `\nTotal: ${totalPresets} presets + ${totalBold} bold templates = ${totalPresets + totalBold} styles\n`,
    ),
  );

  return 0;
}

// ─── preview ─────────────────────────────────────────────────────────────────

export async function runStylesPreview(slug: string): Promise<number> {
  const resourcesDir = resolveResourcesDir();

  if (!resourcesDir) {
    console.error(
      color.red(
        "oma-slide resources directory not found. Run from within the oh-my-agent project directory.",
      ),
    );
    return 1;
  }

  // Check bold templates first
  const index = loadSelectionIndex(resourcesDir);
  if (index) {
    const template = index.templates.find((t) => t.slug === slug);
    if (template) {
      console.log(color.bold(`\n── Bold Template: ${template.name} ──\n`));
      console.log(`  Slug:      ${color.cyan(template.slug)}`);
      console.log(`  Name:      ${color.bold(template.name)}`);
      console.log(`  Mood:      ${template.mood.join(", ")}`);
      console.log(`  Tone:      ${template.tone.join(", ")}`);
      console.log(`  Formality: ${template.formality}`);
      console.log(`  Density:   ${template.density}`);
      console.log(`  Scheme:    ${template.scheme}`);
      console.log(`  Tagline:   ${color.dim(template.tagline)}`);
      console.log(`  Source:    ${color.dim(template.source)}`);
      console.log(
        color.dim(
          `\n  To fetch the full design.md: oma slide styles get ${slug}`,
        ),
      );
      console.log();
      return 0;
    }
  }

  // Check vendored presets
  const presetsMd = loadStylePresets(resourcesDir);
  if (presetsMd) {
    const presets = parsePresetsFromMd(presetsMd);
    const preset = presets.find((p) => p.slug === slug);
    if (preset) {
      const presetsPath = join(resourcesDir, "style-presets.md");
      console.log(color.bold(`\n── Vendored Preset: ${preset.name} ──\n`));
      console.log(`  Slug:   ${color.cyan(preset.slug)}`);
      console.log(`  Name:   ${color.bold(preset.name)}`);
      console.log(`  Mood:   ${preset.mood}`);
      console.log(`  Scheme: ${preset.scheme}`);
      console.log(`  Path:   ${color.dim(presetsPath)}`);
      console.log(
        color.dim(
          `\n  Full definition in: style-presets.md (vendored, offline)`,
        ),
      );
      console.log();
      return 0;
    }
  }

  console.error(
    color.red(
      `Style slug "${slug}" not found. Run 'oma slide styles list' to see all available styles.`,
    ),
  );
  return 4;
}

// ─── get ─────────────────────────────────────────────────────────────────────

export interface StylesGetOptions {
  slug: string;
  refresh?: boolean;
}

export async function runStylesGet(opts: StylesGetOptions): Promise<number> {
  const { slug, refresh } = opts;

  const resourcesDir = resolveResourcesDir();

  if (!resourcesDir) {
    console.error(
      color.red(
        "oma-slide resources directory not found. Run from within the oh-my-agent project directory.",
      ),
    );
    return 1;
  }

  // Load selection-index to find source URL for bold templates
  const index = loadSelectionIndex(resourcesDir);
  const template = index?.templates.find((t) => t.slug === slug);

  // Also check vendored presets
  const presetsMd = loadStylePresets(resourcesDir);
  const presets = presetsMd ? parsePresetsFromMd(presetsMd) : [];
  const preset = presets.find((p) => p.slug === slug);

  if (!template && !preset) {
    console.error(
      color.red(
        `Style slug "${slug}" not found. Run 'oma slide styles list' to see all available styles.`,
      ),
    );
    return 4;
  }

  // For vendored presets: just print the path and excerpt
  if (!template && preset) {
    const presetsPath = join(resourcesDir, "style-presets.md");
    console.log(
      color.green(
        `"${slug}" is a vendored preset — available offline in style-presets.md`,
      ),
    );
    console.log(color.dim(`  Path: ${presetsPath}`));
    console.log(
      color.dim(
        `  No network fetch needed for vendored presets. Full CSS variables in the file above.`,
      ),
    );
    return 0;
  }

  // Bold template: check cache first (unless --refresh)
  const cacheDir = getStylesCacheDir();
  const cachePath = getCachedStylePath(slug);
  mkdirSync(cacheDir, { recursive: true });

  if (!refresh && existsSync(cachePath)) {
    const cached = readFileSync(cachePath, "utf8");
    console.log(color.green(`Using cached design.md for "${slug}"`));
    console.log(color.dim(`  Cache: ${cachePath}`));
    console.log();
    console.log(cached);
    return 0;
  }

  // Fetch from source (always-latest main).
  // template is guaranteed non-null here: the `!template && !preset` and
  // `!template && preset` branches above both returned early.
  if (!template) return 4;
  const sourceUrl = template.source;
  console.log(color.dim(`Fetching design.md for "${slug}" from:`));
  console.log(color.dim(`  ${sourceUrl}`));
  console.log(
    color.dim(`  (Treating fetched content as untrusted style reference data)`),
  );

  let fetchedContent: string | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent":
          "oma-slide/1.0 (+https://github.com/first-fluke/oh-my-agent)",
      },
    });

    if (res.status === 404) {
      fetchError = `404 Not Found at ${sourceUrl}`;
    } else if (!res.ok) {
      fetchError = `HTTP ${res.status} from ${sourceUrl}`;
    } else {
      fetchedContent = await res.text();
    }
  } catch (err) {
    fetchError = `Network error: ${(err as Error).message}`;
  }

  // Handle fetch failure
  if (!fetchedContent) {
    console.warn(color.yellow(`  Warning: ${fetchError}`));

    // Try offline cache fallback
    if (existsSync(cachePath)) {
      console.warn(
        color.yellow(`  Falling back to cached version: ${cachePath}`),
      );
      const cached = readFileSync(cachePath, "utf8");
      console.log();
      console.log(cached);
      return 0;
    }

    // Final fallback: print a vendored preset message
    console.warn(
      color.yellow(
        `  No cache available for "${slug}". Falling back to vendored preset "default".`,
      ),
    );
    const presetsPath = join(resourcesDir, "style-presets.md");
    if (existsSync(presetsPath)) {
      const fallbackContent = readFileSync(presetsPath, "utf8");
      // Extract just the default preset section
      const defaultMatch = /### `default`[\s\S]*?(?=^###|$(?![\s\S]))/m.exec(
        fallbackContent,
      );
      if (defaultMatch) {
        console.log(
          color.dim(
            `\n── Vendored fallback: "default" preset (from style-presets.md) ──\n`,
          ),
        );
        console.log(defaultMatch[0]);
        return 0;
      }
    }
    console.log(color.dim(`Full presets reference: ${presetsPath}`));
    return 1;
  }

  // Cache the fetched content
  writeFileSync(cachePath, fetchedContent, "utf8");
  console.log(color.green(`\nFetched and cached design.md for "${slug}"`));
  console.log(color.dim(`  Cached to: ${cachePath}`));
  console.log();
  console.log(fetchedContent);

  return 0;
}
