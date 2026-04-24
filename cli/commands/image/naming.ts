const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function shortId(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

export function formatTimestamp(date = new Date()): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function makeRunId(date = new Date()): {
  timestamp: string;
  shortid: string;
} {
  return { timestamp: formatTimestamp(date), shortid: shortId() };
}

export function renderPattern(
  pattern: string,
  vars: Record<string, string>,
): string {
  return pattern.replace(
    /\{(\w+)\}/g,
    (_m, key: string) => vars[key] ?? `{${key}}`,
  );
}

// Sanitize a model name for safe use in filenames:
// - strip path separators and any non-[alnum._-] characters
// - collapse dot-runs (".." or more) to "_" so no traversal sequence survives
// - collapse runs of replacement underscores
export function sanitizeModelForFilename(model: string): string {
  const cleaned = model
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/_+/g, "_");
  return cleaned.length > 0 ? cleaned : "model";
}

export interface OutputNameArgs {
  vendor: string;
  model: string;
  runShortid: string;
  index?: number;
  total: number;
  ext: string;
}

export function buildOutputFilename(args: OutputNameArgs): string {
  const safeModel = sanitizeModelForFilename(args.model);
  const base = `${args.vendor}-${safeModel}-${args.runShortid}`;
  const suffix = args.total > 1 ? `-${(args.index ?? 0) + 1}` : "";
  return `${base}${suffix}.${args.ext}`;
}
