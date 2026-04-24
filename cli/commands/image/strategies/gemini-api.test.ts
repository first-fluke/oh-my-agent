import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildReferenceParts } from "./gemini-api.js";

describe("buildReferenceParts", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-gemini-ref-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("encodes each file as base64 inlineData using the validated MIME", async () => {
    const png = path.join(tmp, "a.png");
    const jpg = path.join(tmp, "b.jpg");
    writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(jpg, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const parts = await buildReferenceParts([
      { path: png, mime: "image/png" },
      { path: jpg, mime: "image/jpeg" },
    ]);
    expect(parts).toHaveLength(2);
    expect(parts[0]?.inlineData?.mimeType).toBe("image/png");
    expect(parts[0]?.inlineData?.data).toBe(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"),
    );
    expect(parts[1]?.inlineData?.mimeType).toBe("image/jpeg");
    expect(parts[1]?.inlineData?.data).toBe(
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64"),
    );
  });

  it("uses the validated MIME rather than the file extension", async () => {
    // Regression test for HIGH finding: buildReferenceParts must honor the
    // magic-byte MIME detected by reference-guard, not re-derive from extension.
    const mislabeled = path.join(tmp, "image.jpg"); // .jpg extension...
    writeFileSync(mislabeled, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // ...but PNG bytes
    const parts = await buildReferenceParts([
      { path: mislabeled, mime: "image/png" },
    ]);
    expect(parts[0]?.inlineData?.mimeType).toBe("image/png");
  });

  it("returns empty array for empty input", async () => {
    const parts = await buildReferenceParts([]);
    expect(parts).toEqual([]);
  });
});
