import { describe, expect, it } from "vitest";
import {
  checkRepoArchive,
  countArchiveEntries,
  MAX_COMPRESSED_BYTES,
  MAX_ENTRIES,
} from "./check-repo-archive.mjs";

/** One ustar header block; data blocks are padded to 512 like `git archive`. */
function tarEntry(name: string, type: string, size = 0): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, "ascii");
  header.write(`${size.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header.write(type, 156, "ascii");
  const data = Buffer.alloc(Math.ceil(size / 512) * 512, "d");
  return Buffer.concat([header, data]);
}
const END = Buffer.alloc(1024);

describe("countArchiveEntries", () => {
  it("counts files, folders, and symlinks, skipping padded data blocks", () => {
    // The folder header sits after the file's two data blocks: a wrong
    // size/padding calculation would read data as a header and miscount.
    const tar = Buffer.concat([
      tarEntry("pkg/SKILL.md", "0", 600),
      tarEntry("pkg/references/", "5"),
      tarEntry("pkg/link", "2"),
      END,
    ]);
    expect(countArchiveEntries(tar)).toBe(3);
  });

  it("does not count pax and GNU long-name metadata records", () => {
    const tar = Buffer.concat([
      tarEntry("pax_global_header", "g", 52),
      tarEntry("PaxHeader/long", "x", 30),
      tarEntry("././@LongLink", "L", 300),
      tarEntry("pkg/a-very-long-name.md", "0", 10),
      END,
    ]);
    expect(countArchiveEntries(tar)).toBe(1);
  });

  it("returns 0 for an empty or end-only archive", () => {
    expect(countArchiveEntries(Buffer.alloc(0))).toBe(0);
    expect(countArchiveEntries(END)).toBe(0);
  });
});

describe("checkRepoArchive", () => {
  it("accepts an archive within both budgets", () => {
    expect(
      checkRepoArchive({
        compressedBytes: MAX_COMPRESSED_BYTES,
        entries: MAX_ENTRIES,
      }),
    ).toEqual([]);
  });

  it("rejects an archive above the compressed size budget", () => {
    const issues = checkRepoArchive({
      compressedBytes: MAX_COMPRESSED_BYTES + 1,
      entries: 1,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("directory limit 50 MiB");
  });

  it("rejects an archive above the entry budget", () => {
    const issues = checkRepoArchive({
      compressedBytes: 1,
      entries: MAX_ENTRIES + 1,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("directory limit 10,000");
  });
});
