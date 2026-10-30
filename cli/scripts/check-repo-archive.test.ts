import { describe, expect, it } from "vitest";
import {
  checkRepoArchive,
  MAX_COMPRESSED_BYTES,
  MAX_ENTRIES,
} from "./check-repo-archive.mjs";

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
