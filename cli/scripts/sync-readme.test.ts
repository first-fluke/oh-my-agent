import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rewriteRelativeLinks } from "./sync-readme.mjs";

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
