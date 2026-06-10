/**
 * LAW self-check for `oma market render` (output-laws.md).
 *
 * LAW execution order:
 *   1. LAW 8  badge        — prepend if missing (auto-fix)
 *   2. LAW 2  body opener  — verify "What we learned:" (violation if absent)
 *   3. LAW 4  forbidden ## — flag unfixable headers (violation)
 *   4. LAW 6  evidence dump — flag raw cluster pattern (violation)
 *   5. LAW 7  citations    — rewrite bare URLs, unwrap empty links (auto-fix)
 *   6. LAW 3  em-dash      — replace outside code blocks (auto-fix)
 *   7. LAW 1  Sources block — strip trailing sources list (auto-fix)
 *   8. LAW 5  footer       — verify ENGINE FOOTER present (auto-fix if missing)
 */

// Allowed ## headers for COMPARISON layout
const COMPARISON_ALLOWED_HEADERS = new Set([
  "Quick Verdict",
  "Head-to-Head",
  "The Bottom Line",
]);

// Allowed ## headers for framework sections + cluster bank
const FRAMEWORK_HEADERS = new Set([
  "SWOT",
  "Strengths",
  "Weaknesses",
  "Opportunities",
  "Threats",
  "Porter's 5 Forces",
  "PESTEL",
  "Cluster Bank",
]);

// `### C1`, `### C2` ... cluster-bank IDs are also allowed structurally.
const CLUSTER_ID_HEADER_RE = /^C\d+\b/;

// ---------------------------------------------------------------------------
// LAW self-check helpers
// ---------------------------------------------------------------------------

const BADGE_RE = /^🔎 oma-market v[\w.-]+ · synced \d{4}-\d{2}-\d{2}$/;

function applyLaw3EmDash(text: string): string {
  // Replace em-dash and en-dash outside code blocks
  // Split on fenced code blocks and process only non-code parts
  const segments = text.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return segments
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // code block — skip
      return seg.replace(/\s+[—–]\s+/g, " - ").replace(/[—–]/g, "-");
    })
    .join("");
}

function applyLaw7Citations(text: string): string {
  // Split on fenced code blocks and process only non-code parts
  const segments = text.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return segments
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // code block — skip

      // Rewrite bare URLs not already inside [text](url) or (url)
      let out = seg.replace(/(?<!\()(?<!\]\()https?:\/\/[^\s)<>]+/g, (url) => {
        try {
          const host = new URL(url).hostname;
          return `[${host}](${url})`;
        } catch {
          return url;
        }
      });

      // Unwrap empty links [text]() -> text
      out = out.replace(/\[([^\]]+)\]\(\s*\)/g, "$1");

      return out;
    })
    .join("");
}

function applyLaw1StripSources(text: string): string {
  const lines = text.split("\n");
  const last30 = lines.slice(Math.max(0, lines.length - 30));

  const sourceHeaderRe =
    /^(Sources|References|Further reading|Citations):\s*$/i;
  let sourceBlockStart = -1;

  for (let i = 0; i < last30.length; i++) {
    const line = last30[i];
    if (line !== undefined && sourceHeaderRe.test(line)) {
      // Check if followed by a bullet list
      const nextLine = last30[i + 1];
      if (nextLine !== undefined && /^[-*]/.test(nextLine)) {
        sourceBlockStart = lines.length - last30.length + i;
        break;
      }
    }
  }

  if (sourceBlockStart !== -1) {
    return lines.slice(0, sourceBlockStart).join("\n");
  }
  return text;
}

// ---------------------------------------------------------------------------
// LAW self-check
// ---------------------------------------------------------------------------

export interface SelfCheckResult {
  body: string;
  violations: string[];
}

export function runSelfCheck(
  rawBody: string,
  isComparison: boolean,
  entityA: string,
  entityB: string,
  badge: string,
): SelfCheckResult {
  const violations: string[] = [];
  let body = rawBody;

  // --- LAW 8: Badge ---
  const bodyLines = body.split("\n");
  const firstLine = bodyLines[0] ?? "";
  if (!BADGE_RE.test(firstLine)) {
    body = `${badge}\n\n${body}`;
  }

  // --- LAW 2: Body opener ---
  const updatedLines = body.split("\n");
  // Find first non-empty line after badge + blank
  let bodyStart = 0;
  if (BADGE_RE.test(updatedLines[0] ?? "")) {
    // Skip badge line and blank
    bodyStart = 2;
  }
  const firstBodyLine = updatedLines[bodyStart] ?? "";
  if (!isComparison) {
    if (!firstBodyLine.startsWith("What we learned:")) {
      violations.push(
        "LAW 2: body opener missing 'What we learned:' - regeneration required",
      );
    }
  } else {
    const expectedPrefix = `# ${entityA} vs ${entityB}`;
    if (!firstBodyLine.startsWith(expectedPrefix)) {
      violations.push(
        `LAW 2: COMPARISON body opener missing '${expectedPrefix}:' - regeneration required`,
      );
    }
  }

  // --- LAW 4: Forbidden headers ---
  const allowedHeaders = new Set([
    ...FRAMEWORK_HEADERS,
    ...(isComparison ? COMPARISON_ALLOWED_HEADERS : []),
    ...(isComparison ? [entityA, entityB] : []),
  ]);

  const headerRe = /^#{2,3}\s+(.+)$/gm;
  for (const match of body.matchAll(headerRe)) {
    const headerText = match[1]?.trim() ?? "";
    if (allowedHeaders.has(headerText)) continue;
    // Cluster Bank emits `### C1`, `### C2`, etc. as structural anchors —
    // allow any header that starts with the cluster-ID pattern.
    if (CLUSTER_ID_HEADER_RE.test(headerText)) continue;
    violations.push(
      `LAW 4: forbidden header '## ${headerText}' - regeneration required`,
    );
  }

  // --- LAW 6: Evidence dump ---
  if (/^### \d+\. .* \(score \d+,/m.test(body)) {
    violations.push(
      "LAW 6: raw evidence dump pattern found - regeneration required",
    );
  }

  // --- LAW 7: Citation format (auto-fix) ---
  body = applyLaw7Citations(body);

  // --- LAW 3: Em-dash (auto-fix) ---
  body = applyLaw3EmDash(body);

  // --- LAW 1: Trailing Sources block (auto-fix) ---
  body = applyLaw1StripSources(body);

  // --- LAW 5: Footer ---
  if (
    !body.includes("<!-- ENGINE FOOTER -->") ||
    !body.includes("<!-- END ENGINE FOOTER -->")
  ) {
    violations.push("LAW 5: ENGINE FOOTER missing");
  }

  return { body, violations };
}
