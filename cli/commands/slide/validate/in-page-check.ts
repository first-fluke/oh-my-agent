import type { Rect } from "./geometry.js";

// ─── Per-slide checks (run inside page.evaluate) ──────────────────────────────

export interface InPageTextElement {
  selector: string;
  rect: Rect;
  fontSize: number;
  text: string;
}

/** Serializable result from page.evaluate. */
export interface InPageCheckResult {
  textElements: InPageTextElement[];
  remoteRefs: Array<{ selector: string; url: string }>;
}

/**
 * In-page check function string.
 *
 * H2 fix: iterates each `.slide` element inside `.deck-stage` (canonical DOM contract
 * from deck-stage.js: `<deck-stage><div class="deck-viewport"><div class="deck-stage">
 * <section class="slide">…`). Each `.slide` element's bounding rect is used as the
 * frame origin so overflow geometry is in design-space coordinates (0,0 to 1920×1080).
 * Falls back to `document.body` when `.deck-stage` is absent (legacy / custom layouts).
 *
 * M2 fix: also collects remote refs from `<script src>`, `<iframe src>`, `srcset`
 * attributes, and inline CSS `url()` in style attributes and `<style>` blocks.
 */
export const IN_PAGE_CHECK_FN = `(function() {
  var REMOTE_RE = /^https?:\\/\\//i;

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var tag = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
      var cls = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
      tag = tag + '.' + cls;
    }
    if (!el.parentElement || el.parentElement.tagName === 'BODY') return tag;
    var siblings = Array.from(el.parentElement.children);
    var idx = siblings.indexOf(el);
    return getSelector(el.parentElement) + ' > ' + tag + ':nth-child(' + (idx + 1) + ')';
  }

  // ── Locate slide frames (canonical: .deck-stage > .slide) ──────────────────
  var deckStage = document.querySelector('.deck-stage');
  var slideEls = deckStage
    ? Array.from(deckStage.querySelectorAll('.slide'))
    : [];
  // Fallback: treat entire body as a single frame when no canonical structure
  var frames = slideEls.length > 0 ? slideEls : [document.body];

  var textElements = [];

  for (var fi = 0; fi < frames.length; fi++) {
    var frame = frames[fi];
    var frameRect = frame.getBoundingClientRect();

    var all = Array.from(frame.querySelectorAll('*'));
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var children = el.childNodes;
      var hasText = false;
      for (var j = 0; j < children.length; j++) {
        if (children[j].nodeType === 3 && children[j].textContent.trim()) {
          hasText = true;
          break;
        }
      }
      if (!hasText) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var style = window.getComputedStyle(el);
      var fontSize = parseFloat(style.fontSize) || 0;
      textElements.push({
        selector: getSelector(el),
        rect: {
          x: r.left - frameRect.left,
          y: r.top - frameRect.top,
          width: r.width,
          height: r.height
        },
        fontSize: fontSize,
        text: el.textContent ? el.textContent.trim().slice(0, 60) : ''
      });
    }
  }

  // ── Remote asset references (M2: comprehensive) ────────────────────────────
  var remoteRefs = [];

  // img / source / video / audio — src attribute
  var mediaSrcEls = Array.from(document.querySelectorAll(
    'img[src], source[src], video[src], audio[src]'
  ));
  for (var k = 0; k < mediaSrcEls.length; k++) {
    var src = mediaSrcEls[k].getAttribute('src') || '';
    if (REMOTE_RE.test(src)) {
      remoteRefs.push({ selector: getSelector(mediaSrcEls[k]), url: src });
    }
  }

  // img / source — srcset attribute
  var srcsetEls = Array.from(document.querySelectorAll('[srcset]'));
  for (var si = 0; si < srcsetEls.length; si++) {
    var srcset = srcsetEls[si].getAttribute('srcset') || '';
    var parts = srcset.split(',');
    for (var pi = 0; pi < parts.length; pi++) {
      var url = parts[pi].trim().split(/\\s+/)[0] || '';
      if (REMOTE_RE.test(url)) {
        remoteRefs.push({ selector: getSelector(srcsetEls[si]), url: url });
        break; // one hit per element is enough
      }
    }
  }

  // link[href] — stylesheets, preload, etc.
  var links = Array.from(document.querySelectorAll('link[href]'));
  for (var l = 0; l < links.length; l++) {
    var href = links[l].getAttribute('href') || '';
    if (REMOTE_RE.test(href)) {
      remoteRefs.push({ selector: getSelector(links[l]), url: href });
    }
  }

  // script[src]
  var scripts = Array.from(document.querySelectorAll('script[src]'));
  for (var sc = 0; sc < scripts.length; sc++) {
    var ssrc = scripts[sc].getAttribute('src') || '';
    if (REMOTE_RE.test(ssrc)) {
      remoteRefs.push({ selector: getSelector(scripts[sc]), url: ssrc });
    }
  }

  // iframe[src]
  var iframes = Array.from(document.querySelectorAll('iframe[src]'));
  for (var ic = 0; ic < iframes.length; ic++) {
    var isrc = iframes[ic].getAttribute('src') || '';
    if (REMOTE_RE.test(isrc)) {
      remoteRefs.push({ selector: getSelector(iframes[ic]), url: isrc });
    }
  }

  // Inline style attributes: background-image / src url()
  var CSS_URL_RE = /url\\(["']?(https?:[^"')]+)["']?\\)/gi;
  var styledEls = Array.from(document.querySelectorAll('[style]'));
  for (var se = 0; se < styledEls.length; se++) {
    var styleAttr = styledEls[se].getAttribute('style') || '';
    var m;
    CSS_URL_RE.lastIndex = 0;
    while ((m = CSS_URL_RE.exec(styleAttr)) !== null) {
      remoteRefs.push({ selector: getSelector(styledEls[se]), url: m[1] });
    }
  }

  // <style> blocks: url() inside stylesheets
  var styleBlocks = Array.from(document.querySelectorAll('style'));
  for (var sb = 0; sb < styleBlocks.length; sb++) {
    var cssText = styleBlocks[sb].textContent || '';
    CSS_URL_RE.lastIndex = 0;
    var urlMatch;
    while ((urlMatch = CSS_URL_RE.exec(cssText)) !== null) {
      remoteRefs.push({ selector: getSelector(styleBlocks[sb]), url: urlMatch[1] });
    }
  }

  return { textElements: textElements, remoteRefs: remoteRefs };
})()`;
