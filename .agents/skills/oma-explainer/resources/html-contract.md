# HTML Explainer Contract

This resource specifies HOW the generated HTML file behaves and is validated. For content requirements, refer to the sibling `document-structure.md` file.

## 1. Self-contained Rule
The generated HTML file MUST make ZERO external resource loads.
- No CDN scripts or stylesheets.
- No webfonts.
- No external images (use inline SVG or data URIs).
- Must open correctly offline via `file://`.
- **Note:** Hyperlink anchors (`<a href="https://...">`) ARE allowed. The ban covers resource-LOADING only.

## 2. Code Blocks
- All code blocks must use `<pre>` tags.
- Any custom-styled container holding code MUST declare `white-space: pre-wrap` (or `pre`).
- Do NOT use external syntax-highlighting libraries. Use plain theme-aware colors only.

## 3. Font Stack
The `Self-contained rule` supersedes any webfont suggestion in the project `design.md`. Use the following font stack:
1. Locally installed Pretendard, matched by family name — NOT the CSS `local()` function, which is only valid inside `@font-face src` (see the code comment below)
2. System CJK fonts (`Apple SD Gothic Neo` / `Noto Sans CJK`)
3. `system-ui` stack

```css
/* Locally installed Pretendard resolves by family name; local() is only valid
   inside @font-face src, so never use it in font-family. */
font-family: Pretendard, 'Pretendard Variable', 'Apple SD Gothic Neo', 'Noto Sans CJK KR', 'Noto Sans CJK JP', 'Noto Sans CJK SC', 'Noto Sans CJK TC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

## 4. Layout and Accessibility (a11y)
- **Responsive:** Mobile-first, responsive from 375px up.
- **Contrast:** WCAG AA contrast in BOTH light and dark themes.
- **Dark Mode:** Must support `prefers-color-scheme: dark`.
- **Motion:** Animations are optional and must be subtle. `prefers-reduced-motion` MUST be respected.
- **Focus States:** Visible focus states are required on all interactive elements.

## 5. Quiz JS Specification
- Use **Vanilla JS only** (no frameworks).
- Options must be rendered as `<button>` elements.
- Clicking an option (or using Enter/Space) must reveal correct/incorrect immediately.
- Include per-option feedback text (explain *why* wrong answers are wrong).
- Feedback must be announced via an `aria-live="polite"` region for screen readers.
- Correct answers must be randomly distributed across option positions (no position bias).
- Display a final score summary at the end of the quiz.
- The entire quiz must be fully keyboard-navigable.

## 6. Validation Checklist (Post-generation)
Execute the following grep-based checks on the generated HTML. 
Loop: fix and re-validate at most **3 iterations**, then STOP and surface the failing items to the user.

**Known false positives — do not "fix" example code.** A hit located inside a `<pre>` block that merely *quotes* a matching pattern as illustrative text (a commented-out `@import` in a "what not to do" snippet, an example `api_key` in a config walkthrough) is not a live resource load or a real secret. Log such hits as reviewed false positives in the provenance footer instead of mangling the example, and do not count them against the 3-iteration budget. Live `<head>` / `<script src>` references and actual secret values must still be fixed or gated. (Related: this contract's own §3 comment legitimately contains the literal `@font-face` — the §6 greps do not match it, and a stricter v2 validator must not flag it either.)

- **No external resource loads** (zero matches required):
  ```bash
  grep -E -i 'src="http|<link rel="stylesheet" href="http|@import|url\(http' {file}
  ```
- **Code containers compliance** (must match if code exists):
  ```bash
  grep -E -i '<pre|white-space:\s*pre|white-space:\s*pre-wrap' {file}
  ```
- **Quiz script presence** (must match; `[ >]` covers attributed tags like `<script type="module">`):
  ```bash
  grep -i -E '<script[ >]' {file}
  ```
- **Filename matches format** (the pattern is anchored, so check the basename, not the full path):
  Ensure filename follows `{YYYY-MM-DD}-{slug}.html` with the date in `Asia/Seoul` timezone.
  ```bash
  basename "{file}" | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+\.html$'
  ```
- **Final-HTML secret scan** (zero matches required, see §7):
  ```bash
  grep -E -i '(api_key|api-key|secret|password|token|private[-_]key|connection[-_]string)\s*[=:]\s*["'\'']?[A-Za-z0-9\-_]{16,}["'\'']?' {file}
  ```

## 7. Secret Gates
Secrets must be gated at two stages:
1. **Pre-generation:** Scan the collected diff.
2. **Post-generation:** Scan the final HTML (as background prose may quote unchanged files, the diff scan alone is insufficient).

### Secret Patterns
*Note: the excluded-file globs below mirror `EXCLUDED_FILE_PATTERNS` in `cli/commands/docs/sync-propose.ts` — when those globs diverge, that file wins. The content-value regex is defined HERE (no CLI implementation of a content-level secret regex exists yet; a deterministic scanner ships with `oma explain validate` in v2).*

Mirroring a MINIMAL pattern set for secret-like literal values (API keys, tokens, private keys, passwords, connection strings):
- **Excluded Files:** `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_rsa*`
- **Regex Pattern:** `(api_key|api-key|secret|password|token|private[-_]key|connection[-_]string)\s*[=:]\s*["']?[A-Za-z0-9\-_]{16,}["']?`
  (canonical pattern — the embedded quotes break naive single-quoted shell pasting; run it via the pre-escaped §6 "final-HTML secret scan" invocation)

**On Any Hit:**
- **STOP** immediately.
- Report the masked locations only (NEVER echo the actual value).
- Redacted continuation requires explicit user confirmation.

## 8. Sharing Caution
**Caution (informational, for the operator):** the artifact embeds code excerpts — treat it like source code when sharing externally. Embedding this caution inside the generated document itself is deferred to v2 (design 022 Tier 3); the generated footer's contract is `document-structure.md` §9 and does not include a sharing-caution line in v1.
