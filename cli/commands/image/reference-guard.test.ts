import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_COUNT,
  validateReferenceImages,
} from "./reference-guard.js";

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GIF_HEADER = Buffer.from("GIF89a");
const WEBP_HEADER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("validateReferenceImages", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-ref-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function make(name: string, bytes: Buffer): string {
    const p = path.join(tmp, name);
    writeFileSync(p, bytes);
    return p;
  }

  it("accepts PNG files and returns absolute path + mime + bytes", async () => {
    const p = make("pic.png", Buffer.concat([PNG_HEADER, Buffer.alloc(100)]));
    const out = await validateReferenceImages([p]);
    expect(out).toHaveLength(1);
    expect(out[0]?.absolutePath).toBe(p);
    expect(out[0]?.mime).toBe("image/png");
    expect(out[0]?.bytes).toBe(PNG_HEADER.length + 100);
  });

  it("accepts JPEG/GIF/WebP via magic bytes", async () => {
    const j = make("a.jpg", JPEG_HEADER);
    const g = make("a.gif", GIF_HEADER);
    const w = make("a.webp", WEBP_HEADER);
    const out = await validateReferenceImages([j, g, w]);
    expect(out.map((o) => o.mime)).toEqual([
      "image/jpeg",
      "image/gif",
      "image/webp",
    ]);
  });

  it("rejects unsupported format regardless of extension", async () => {
    const p = make("fake.png", Buffer.from("not an image"));
    await expect(validateReferenceImages([p])).rejects.toMatchObject({
      kind: "invalid-input",
      field: "reference",
    });
  });

  it("rejects non-existent file with invalid-input", async () => {
    await expect(
      validateReferenceImages(["/nonexistent/path.png"]),
    ).rejects.toMatchObject({ kind: "invalid-input", field: "reference" });
  });

  it("rejects directory passed as reference", async () => {
    const dir = path.join(tmp, "subdir");
    rmSync(dir, { recursive: true, force: true });
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir);
    await expect(validateReferenceImages([dir])).rejects.toMatchObject({
      kind: "invalid-input",
      reason: expect.stringContaining("not a regular file"),
    });
  });

  it("rejects files larger than MAX_REFERENCE_BYTES", async () => {
    const p = make(
      "big.png",
      Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_REFERENCE_BYTES + 1)]),
    );
    await expect(validateReferenceImages([p])).rejects.toMatchObject({
      kind: "invalid-input",
      reason: expect.stringContaining("limit"),
    });
  });

  it("enforces MAX_REFERENCE_COUNT", async () => {
    const refs = Array.from({ length: MAX_REFERENCE_COUNT + 1 }, (_, i) =>
      make(`${i}.png`, PNG_HEADER),
    );
    await expect(validateReferenceImages(refs)).rejects.toMatchObject({
      kind: "invalid-input",
      reason: expect.stringContaining("too many"),
    });
  });

  it("rejects duplicate paths (after resolve)", async () => {
    const p = make("dup.png", PNG_HEADER);
    await expect(validateReferenceImages([p, p])).rejects.toMatchObject({
      kind: "invalid-input",
      reason: expect.stringContaining("duplicate"),
    });
  });

  it("resolves relative paths against cwd option", async () => {
    make("rel.png", PNG_HEADER);
    const out = await validateReferenceImages(["rel.png"], { cwd: tmp });
    expect(out[0]?.absolutePath).toBe(path.join(tmp, "rel.png"));
  });
});
