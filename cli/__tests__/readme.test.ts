import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("npm package readme", () => {
  it("should provide a generated README in the published cli package root", () => {
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf-8",
    );

    expect(readme).toMatch(/^# oh-my-agent\n/);
    expect(readme).not.toMatch(/\]\(\.\//);
    expect(readme).toContain(
      "https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.ko.md",
    );
  });
});
