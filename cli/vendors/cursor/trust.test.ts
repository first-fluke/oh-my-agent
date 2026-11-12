import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CURSOR_TRUST_MARKER,
  cursorProjectSlug,
  trustCursorWorkspace,
} from "./trust.js";

describe("cursorProjectSlug", () => {
  it("matches cursor-agent's ~/.cursor/projects naming", () => {
    expect(cursorProjectSlug("/Users/me/workspace/oh-my-agent")).toBe(
      "Users-me-workspace-oh-my-agent",
    );
    expect(cursorProjectSlug("/tmp/a b/c__d/")).toBe("tmp-a-b-c-d");
  });
});

describe("trustCursorWorkspace", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-cursor-trust-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes the workspace-trusted marker once", () => {
    const data = join(dir, ".cursor");
    mkdirSync(data);
    const root = "/work/my-app";
    const now = new Date("2026-11-12T00:00:00.000Z");

    expect(trustCursorWorkspace(data, root, now)).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    const marker = join(data, "projects", "work-my-app", CURSOR_TRUST_MARKER);
    expect(JSON.parse(readFileSync(marker, "utf-8"))).toEqual({
      trustedAt: "2026-11-12T00:00:00.000Z",
      workspacePath: root,
    });
    expect(trustCursorWorkspace(data, root, now)).toEqual({
      changed: false,
      alreadyTrusted: true,
    });
  });

  it("skips when cursor-agent has never run", () => {
    const data = join(dir, ".cursor");
    expect(trustCursorWorkspace(data, "/work/my-app").changed).toBe(false);
    expect(existsSync(data)).toBe(false);
  });
});
