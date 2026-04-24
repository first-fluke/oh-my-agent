import { open, stat } from "node:fs/promises";
import path from "node:path";
import type { VendorError } from "./types.js";

export const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;
export const MAX_REFERENCE_COUNT = 10;

export type ReferenceMime =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp";

export interface ValidatedReference {
  absolutePath: string;
  mime: ReferenceMime;
  bytes: number;
}

export interface ValidateOptions {
  cwd?: string;
  maxBytes?: number;
  maxCount?: number;
}

export async function validateReferenceImages(
  paths: string[],
  opts: ValidateOptions = {},
): Promise<ValidatedReference[]> {
  const cwd = opts.cwd ?? process.cwd();
  const maxBytes = opts.maxBytes ?? MAX_REFERENCE_BYTES;
  const maxCount = opts.maxCount ?? MAX_REFERENCE_COUNT;

  if (paths.length > maxCount) {
    throw {
      kind: "invalid-input",
      field: "reference",
      reason: `too many references (${paths.length}); max=${maxCount}`,
    } satisfies VendorError;
  }

  const seen = new Set<string>();
  const out: ValidatedReference[] = [];
  for (const raw of paths) {
    const abs = path.resolve(cwd, raw);
    if (seen.has(abs)) {
      throw {
        kind: "invalid-input",
        field: "reference",
        reason: `duplicate reference path: ${raw}`,
      } satisfies VendorError;
    }
    seen.add(abs);

    const st = await stat(abs).catch((err: NodeJS.ErrnoException) => {
      throw {
        kind: "invalid-input",
        field: "reference",
        reason: `cannot read reference: ${raw} (${err.code ?? "unknown error"})`,
      } satisfies VendorError;
    });
    if (!st.isFile()) {
      throw {
        kind: "invalid-input",
        field: "reference",
        reason: `reference is not a regular file: ${raw}`,
      } satisfies VendorError;
    }
    if (st.size > maxBytes) {
      throw {
        kind: "invalid-input",
        field: "reference",
        reason: `reference exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit: ${raw} (${st.size} bytes)`,
      } satisfies VendorError;
    }

    const mime = await detectMime(abs, raw);
    out.push({ absolutePath: abs, mime, bytes: st.size });
  }
  return out;
}

async function detectMime(
  absolutePath: string,
  displayName: string,
): Promise<ReferenceMime> {
  const fh = await open(absolutePath, "r");
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    const slice = buf.subarray(0, bytesRead);
    const mime = matchMagicBytes(slice);
    if (!mime) {
      throw {
        kind: "invalid-input",
        field: "reference",
        reason: `unsupported format: ${displayName} (expected PNG, JPEG, GIF, or WebP)`,
      } satisfies VendorError;
    }
    return mime;
  } finally {
    await fh.close();
  }
}

function matchMagicBytes(buf: Buffer): ReferenceMime | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38 (GIF8)
  if (
    buf.length >= 4 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38
  ) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
