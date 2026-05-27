/**
 * scope-css.ts — scope a per-slide stylesheet to a single slide id.
 *
 * Why this exists:
 *   Each slide-NN.html is authored as a STANDALONE document whose <style> block
 *   uses generic selectors — the generation protocol mandates rules like
 *   `.slide { position: absolute; background: #0d1117 }`. In isolation (PNG
 *   export navigates one file at a time) that is correct. But viewer.html and
 *   the bundle MERGE every slide's <style> into one document, where those
 *   generic selectors collide: every `.slide` rule applies to EVERY slide, so
 *   all slides inherit the last-defined background and position. The result is
 *   a viewer/PDF where all pages share one background and overlap.
 *
 *   scopeSlideCss() rewrites a slide's CSS so it only targets that slide's
 *   subtree: the slide-root class `.slide` becomes the slide's `#id`, and every
 *   other selector is prefixed with `#id `. @media / @supports / @container
 *   wrappers are recursed into; other at-rules (@keyframes, @font-face, @page)
 *   pass through unchanged.
 *
 * Contract assumption (generation-protocol §3b): one <section class="slide"
 * id="slide-NN"> per file. The caller passes that id.
 */

const SLIDE_CLASS_TOKEN = /\.slide(?![\w-])/g;

/** At-rules whose body contains nested style rules we must also scope. */
const NESTED_AT_RULES = new Set(["media", "supports", "container", "layer"]);

interface CssRule {
  /** Text before the `{` (selector list or at-rule prelude), trimmed. */
  prelude: string;
  /** Text inside the `{ }`. Undefined for statements like `@import …;`. */
  body?: string;
}

/**
 * Split a stylesheet into top-level rules, respecting brace nesting and
 * `@import`/`@charset`-style statements that end in `;` with no body.
 */
function tokenizeRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  let prelude = "";
  let depth = 0;
  let body = "";
  let inBody = false;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (!inBody) {
      if (ch === "{") {
        inBody = true;
        depth = 1;
        body = "";
      } else if (ch === ";") {
        // Bodyless statement (e.g. @import url(...);)
        const p = prelude.trim();
        if (p) rules.push({ prelude: `${p};` });
        prelude = "";
      } else {
        prelude += ch;
      }
    } else {
      if (ch === "{") {
        depth++;
        body += ch;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          rules.push({ prelude: prelude.trim(), body });
          prelude = "";
          body = "";
          inBody = false;
        } else {
          body += ch;
        }
      } else {
        body += ch;
      }
    }
  }
  // Trailing prelude with no braces (malformed) — drop silently.
  return rules;
}

/** Split a selector list on top-level commas (ignoring commas inside `()`). */
function splitSelectorList(selectorList: string): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;
  for (const ch of selectorList) {
    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    if (ch === "," && parenDepth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Scope one selector to `#slideId`:
 *   - `.slide`        → `#slideId`            (the slide root itself)
 *   - `.slide .title` → `#slideId .title`
 *   - `.title`        → `#slideId .title`     (descendant gets a prefix)
 *   - `section.slide` → `section#slideId`
 */
function scopeSelector(selector: string, idSelector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;

  // Standalone slide files commonly define theme tokens on :root, html, or body.
  // Once multiple slides are merged into viewer.html/bundle.html those globals
  // must become slide-local root rules so custom properties inherit through the
  // slide subtree. Prefixing into "#slide-01 :root" never matches anything.
  if (trimmed === ":root" || trimmed === "html" || trimmed === "body") {
    return idSelector;
  }

  const replaced = trimmed.replace(SLIDE_CLASS_TOKEN, idSelector);
  // If the selector already anchors on the slide id (it referenced .slide),
  // it is fully scoped. Otherwise it is a descendant — prefix it.
  return replaced.includes(idSelector) ? replaced : `${idSelector} ${replaced}`;
}

/**
 * Rewrite a slide's CSS so every rule targets only `#slideId`'s subtree.
 * Safe to call on already-trimmed or whitespace-padded CSS.
 */
export function scopeSlideCss(css: string, slideId: string): string {
  const idSelector = `#${slideId}`;
  const out: string[] = [];

  for (const rule of tokenizeRules(css)) {
    // Bodyless statement (@import, @charset) — pass through.
    if (rule.body === undefined) {
      out.push(rule.prelude);
      continue;
    }

    if (rule.prelude.startsWith("@")) {
      const name = (/^@([\w-]+)/.exec(rule.prelude)?.[1] ?? "").toLowerCase();
      if (NESTED_AT_RULES.has(name)) {
        // Recurse: scope the inner rules, keep the at-rule wrapper.
        out.push(`${rule.prelude} {\n${scopeSlideCss(rule.body, slideId)}\n}`);
      } else {
        // @keyframes / @font-face / @page / etc. — leave untouched.
        out.push(`${rule.prelude} {${rule.body}}`);
      }
      continue;
    }

    // Plain style rule — scope each selector in the list.
    const scoped = splitSelectorList(rule.prelude)
      .map((sel) => scopeSelector(sel, idSelector))
      .join(", ");
    out.push(`${scoped} {${rule.body}}`);
  }

  return out.join("\n");
}

/**
 * Extract the first `id="…"` from a slide HTML fragment's <section class="slide">.
 * Returns null when no id is present (caller then leaves styles unscoped).
 */
export function firstSlideId(slideHtml: string): string | null {
  const m =
    /<section[^>]*\bclass="[^"]*\bslide\b[^"]*"[^>]*\bid="([^"]+)"/i.exec(
      slideHtml,
    ) ??
    /<section[^>]*\bid="([^"]+)"[^>]*\bclass="[^"]*\bslide\b/i.exec(slideHtml);
  return m?.[1] ?? null;
}

/**
 * Scope every <style>…</style> block found in `slideHtml` to `slideId`,
 * returning the rewritten <style> strings. Non-CSS attributes on the opening
 * <style> tag are preserved.
 */
export function scopeStyleBlocks(
  styleBlocks: string[],
  slideId: string,
): string[] {
  return styleBlocks.map((block) => {
    const m = /^<style([^>]*)>([\s\S]*)<\/style>$/i.exec(block.trim());
    if (!m) return block;
    const attrs = m[1] ?? "";
    const css = m[2] ?? "";
    return `<style${attrs}>\n${scopeSlideCss(css, slideId)}\n</style>`;
  });
}
