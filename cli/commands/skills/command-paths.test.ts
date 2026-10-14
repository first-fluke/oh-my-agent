import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { canonicalCommandPath } from "../../utils/command-paths.js";
import { createCommandSurface } from "../../utils/command-surface.js";
import { registerSkillsCommand } from "./command.js";

function program(): Command {
  const cli = new Command("oma").exitOverride();
  registerSkillsCommand(cli);
  return cli;
}

describe("skill command paths", () => {
  it("publishes every registered skills action under the standard skill group", () => {
    const skills = program().commands.find((c) => c.name() === "skills");
    const paths = (skills?.commands ?? []).map((c) =>
      canonicalCommandPath(`skills ${c.name()}`),
    );
    expect(paths).toContain("skill matrix");
    expect(paths.filter((path) => !path.startsWith("skill "))).toEqual([]);
  });

  it("routes skill matrix to the registered command and rejects the old spelling", () => {
    const surface = createCommandSurface(program());
    expect(surface.normalize(["skill", "matrix"])).toEqual([
      "skills",
      "matrix",
    ]);
    expect(() => surface.normalize(["skills", "matrix"])).toThrow(
      "Unknown command",
    );
  });
});
