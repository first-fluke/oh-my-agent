import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { qwenTrustDecision, trustQwenFolder } from "./folder-trust.js";

describe("qwenTrustDecision", () => {
  it("lets the deepest rule win and an untrusted rule win a tie", () => {
    expect(qwenTrustDecision({ "/w": "TRUST_FOLDER" }, "/w/app")).toBe(true);
    expect(
      qwenTrustDecision(
        { "/w": "DO_NOT_TRUST", "/w/app": "TRUST_FOLDER" },
        "/w/app",
      ),
    ).toBe(true);
    expect(
      qwenTrustDecision(
        { "/w": "TRUST_FOLDER", "/w/app": "DO_NOT_TRUST" },
        "/w/app/sub",
      ),
    ).toBe(false);
    // TRUST_PARENT applies to the entry's parent folder.
    expect(qwenTrustDecision({ "/w/x": "TRUST_PARENT" }, "/w/app")).toBe(true);
    expect(qwenTrustDecision({ "/w-old": "TRUST_FOLDER" }, "/w")).toBe(
      undefined,
    );
  });
});

describe("trustQwenFolder", () => {
  let dir: string;
  let project: string;
  let store: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-qwen-trust-")));
    project = join(dir, "project");
    mkdirSync(project);
    mkdirSync(join(dir, "qwen-home"));
    store = join(dir, "qwen-home", "trustedFolders.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("adds TRUST_FOLDER for the project and keeps other rules", () => {
    // TRUST_PARENT trusts the entry's parent, here /elsewhere.
    writeFileSync(
      store,
      JSON.stringify({ "/elsewhere/child": "TRUST_PARENT" }),
    );

    expect(trustQwenFolder(store, project)).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    expect(JSON.parse(readFileSync(store, "utf-8"))).toEqual({
      "/elsewhere/child": "TRUST_PARENT",
      [project]: "TRUST_FOLDER",
    });
    expect(trustQwenFolder(store, project).alreadyTrusted).toBe(true);
  });

  it("keeps an explicit distrust of the project or an ancestor", () => {
    writeFileSync(store, JSON.stringify({ [dir]: "DO_NOT_TRUST" }));
    const result = trustQwenFolder(store, project);
    expect(result.changed).toBe(false);
    expect(result.reason).toContain("untrusted");
  });

  it("skips when Qwen has never run", () => {
    const missing = join(dir, "nope", "trustedFolders.json");
    expect(trustQwenFolder(missing, project).changed).toBe(false);
  });
});
