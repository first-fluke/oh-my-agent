/** Max characters kept per detail field (input / output / thinking). */
export const DETAIL_CAP = 20_000;
/** Max characters of a ledger row summary. */
export const SUMMARY_CAP = 200;

/** Vendor session ids become path components; reject anything path-like. */
export function isSafeVendorSid(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

export function capDetail(text: string): string {
  if (text.length <= DETAIL_CAP) return text;
  return `${text.slice(0, DETAIL_CAP)}\n… [truncated ${text.length - DETAIL_CAP} chars]`;
}

/** Collapse whitespace into a single-line row summary. */
export function summarize(text: string, max = SUMMARY_CAP): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function stringifyDetail(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

/** Parse tool arguments that vendors store as a JSON string. */
export function parseJsonObject(
  value: unknown,
): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const ARGUMENT_KEYS = [
  "command",
  "cmd",
  "file_path",
  "path",
  "relative_path",
  "pattern",
  "substring_pattern",
  "query",
  "url",
  "description",
  "skill",
  "prompt",
];

/** `Tool argument` summary using the most descriptive argument available. */
export function summarizeToolCall(name: string, input: unknown): string {
  const args = parseJsonObject(input);
  let hint = "";
  if (args) {
    const key =
      ARGUMENT_KEYS.find((candidate) => typeof args[candidate] === "string") ??
      Object.keys(args).find(
        (candidate) => typeof args[candidate] === "string",
      );
    if (key) hint = String(args[key]);
  } else if (typeof input === "string") {
    hint = input;
  }
  return summarize(hint ? `${name} ${hint}` : name);
}
