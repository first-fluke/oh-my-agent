import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureHarnessSnapshot,
  materializeHarnessSnapshot,
  validateHarnessSnapshot,
} from "./evidence.js";

const roots: string[] = [];
const temporary = () => {
  const root = mkdtempSync(join(tmpdir(), "oma-evidence-"));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("harness raw artifact snapshots", () => {
  it("round-trips binary bytes, empty directories, and file/directory permissions", () => {
    const source = temporary();
    const target = temporary();
    mkdirSync(join(source, "data"));
    mkdirSync(join(source, "empty"));
    writeFileSync(
      join(source, "data", "payload.bin"),
      Buffer.from([0, 255, 128, 10]),
    );
    chmodSync(join(source, "data"), 0o750);
    chmodSync(join(source, "data", "payload.bin"), 0o640);
    const snapshot = captureHarnessSnapshot(source, {
      strict: true,
      excludeHarnessControls: false,
    });
    materializeHarnessSnapshot(snapshot, target);
    expect(readFileSync(join(target, "data", "payload.bin"))).toEqual(
      Buffer.from([0, 255, 128, 10]),
    );
    expect(statSync(join(target, "data")).mode & 0o777).toBe(0o750);
    expect(
      captureHarnessSnapshot(target, { excludeHarnessControls: false }),
    ).toEqual(snapshot);
  });

  it("marks secrets, links, and oversized artifacts insufficient without copying their bytes", () => {
    const source = temporary();
    writeFileSync(join(source, ".env"), "PRIVATE");
    writeFileSync(join(source, "large.dat"), Buffer.alloc(5 * 1024 * 1024 + 1));
    symlinkSync(join(source, ".env"), join(source, "linked"));
    const snapshot = captureHarnessSnapshot(source);
    expect(snapshot.complete).toBe(false);
    expect(snapshot.omissions).toHaveLength(3);
    expect(JSON.stringify(snapshot)).not.toContain(
      Buffer.from("PRIVATE").toString("base64"),
    );
    expect(() => captureHarnessSnapshot(source, { strict: true })).toThrow(
      /cannot be pinned/,
    );
    expect(() => materializeHarnessSnapshot(snapshot, temporary())).toThrow(
      /incomplete/,
    );
  });

  it("rejects artifact corruption and destination symlinks, including ancestors", () => {
    const source = temporary();
    const parent = temporary();
    const outside = temporary();
    writeFileSync(join(source, "artifact.txt"), "original");
    const snapshot = captureHarnessSnapshot(source);
    const corrupt = structuredClone(snapshot);
    const first = corrupt.entries[0];
    if (!first) throw new Error("Missing test file");
    first.contentBase64 = Buffer.from("edited").toString("base64");
    expect(() => validateHarnessSnapshot(corrupt)).toThrow(/digest/);
    symlinkSync(outside, join(parent, "linked"));
    expect(() =>
      materializeHarnessSnapshot(snapshot, join(parent, "linked")),
    ).toThrow(/symbolic/);
    expect(() =>
      materializeHarnessSnapshot(snapshot, join(parent, "linked", "nested")),
    ).toThrow(/symbolic/);
    expect(existsSync(join(outside, "artifact.txt"))).toBe(false);
  });

  it("excludes copied harness controls from artifacts but refuses them as initial task state", () => {
    const source = temporary();
    mkdirSync(join(source, ".agents"));
    writeFileSync(join(source, ".agents", "control"), "private harness");
    expect(captureHarnessSnapshot(source).complete).toBe(true);
    expect(captureHarnessSnapshot(source).entries).toEqual([]);
    expect(() =>
      captureHarnessSnapshot(source, {
        strict: true,
        excludeHarnessControls: false,
      }),
    ).toThrow(/Harness controls/);
  });
});
