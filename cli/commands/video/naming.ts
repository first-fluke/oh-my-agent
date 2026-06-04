// Naming helpers are intentionally local to the video slice: commands/<x> must
// not import from commands/<y> (see cli/ARCHITECTURE.md / check-boundaries).
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

export interface VideoRunId {
  timestamp: string;
  shortid: string;
  mode: string;
  value: string;
}

export function makeVideoRunId(mode: string, date = new Date()): VideoRunId {
  const timestamp = formatTimestamp(date);
  const id = { timestamp, shortid: shortId(), mode };
  return { ...id, value: renderPattern("{timestamp}-{shortid}-{mode}", id) };
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
