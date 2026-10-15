import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main, rewriteRelativeLinks, syncReadme } from "./sync-readme.mjs";

const REPO = "https://github.com/first-fluke/oh-my-agent";

// cli/README.md is rendered from cli/ on GitHub and from the package page on
// npm, so a target that is relative to the repository root resolves to a path
// that does not exist there. Every relative target must become absolute.
function relativeTargets(markdown: string): string[] {
  const outsideFences = markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
  const targets = [
    ...outsideFences.matchAll(/!?\[[^\]]*]\(([^)\s]+)\)/g),
    ...outsideFences.matchAll(/\b(?:src|href)="([^"]+)"/g),
  ].map((match) => match[1] ?? "");
  return targets.filter(
    (target) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target),
  );
}

describe("sync-readme rewriteRelativeLinks", () => {
  it("rewrites ./ markdown links to blob URLs and images to raw URLs", () => {
    expect(
      rewriteRelativeLinks(
        "[Spec](./docs/AGENTS_SPEC.md#intro) ![Demo](./docs/assets/video/demo.gif)",
      ),
    ).toBe(
      `[Spec](${REPO}/blob/main/docs/AGENTS_SPEC.md#intro) ![Demo](${REPO}/raw/main/docs/assets/video/demo.gif)`,
    );
  });

  it("rewrites relative HTML href and src attributes", () => {
    expect(
      rewriteRelativeLinks(
        '<a href="./docs/SUPPORTED_AGENTS.md">more</a> <img src="./docs/assets/agents/pi.svg" alt="Pi" />',
      ),
    ).toBe(
      `<a href="${REPO}/blob/main/docs/SUPPORTED_AGENTS.md">more</a> <img src="${REPO}/raw/main/docs/assets/agents/pi.svg" alt="Pi" />`,
    );
  });

  it("rewrites relative markdown links without a ./ prefix", () => {
    expect(
      rewriteRelativeLinks("[OMA for Orca](integrations/orca/README.md)"),
    ).toBe(`[OMA for Orca](${REPO}/blob/main/integrations/orca/README.md)`);
  });

  it("rewrites an image nested in a link as raw and the link as blob", () => {
    expect(
      rewriteRelativeLinks(
        "[![Demo](./docs/assets/video/demo.gif)](./docs/assets/video/demo.mp4)",
      ),
    ).toBe(
      `[![Demo](${REPO}/raw/main/docs/assets/video/demo.gif)](${REPO}/blob/main/docs/assets/video/demo.mp4)`,
    );
  });

  it("leaves absolute URLs, fragments, and fenced code unchanged", () => {
    const input = [
      '[npm](https://www.npmjs.com/package/oh-my-agent) [top](#quick-start) <a href="https://claude.com">Claude</a>',
      '<img src="https://github.com/openai.png?size=120" alt="Codex" />',
      "```bash",
      "echo '[not a link](./scratch.md)'",
      "```",
    ].join("\n");
    expect(rewriteRelativeLinks(input)).toBe(input);
  });

  it("leaves no repository-relative target in the synced root README", () => {
    const rootReadme = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf-8",
    );
    expect(relativeTargets(rootReadme).length).toBeGreaterThan(0);
    expect(relativeTargets(rewriteRelativeLinks(rootReadme))).toEqual([]);
  });
});

describe("sync-readme --check", () => {
  let dir: string;
  let rootPath: string;
  let cliPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sync-readme-"));
    rootPath = join(dir, "README.md");
    cliPath = join(dir, "cli", "README.md");
    writeFileSync(rootPath, "[Spec](./docs/AGENTS_SPEC.md)\n");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("exits 1 on drift and leaves the stale file untouched", () => {
    syncReadme({ rootPath, cliPath });
    writeFileSync(cliPath, "stale\n");

    expect(main(["--check"], { rootPath, cliPath })).toBe(1);
    expect(readFileSync(cliPath, "utf-8")).toBe("stale\n");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("out of sync"),
    );
  });

  it("exits 1 when cli/README.md is missing and does not create it", () => {
    expect(main(["--check"], { rootPath, cliPath })).toBe(1);
    expect(() => readFileSync(cliPath, "utf-8")).toThrow();
  });

  it("exits 0 once synced, and sync rewrites a drifted file", () => {
    syncReadme({ rootPath, cliPath });
    writeFileSync(cliPath, "stale\n");

    expect(main([], { rootPath, cliPath })).toBe(0);
    expect(readFileSync(cliPath, "utf-8")).toBe(
      `[Spec](${REPO}/blob/main/docs/AGENTS_SPEC.md)\n`,
    );
    expect(main(["--check"], { rootPath, cliPath })).toBe(0);
  });
});
