import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { createCommandSurface } from "../../utils/command-surface.js";
import { registerVerify } from "./command.js";

function surface() {
  const program = new Command("oma").exitOverride();
  registerVerify(program);
  return createCommandSurface(program);
}

// `oma verify <agent-type>` is a deliberately removed spelling (see the
// "Aliases and removed spellings" table in web/docs/cli-interfaces/commands.md).
// It must stay rejected, but the error has to name the replacement instead of
// sending the user to --help.
describe("oma verify short form", () => {
  it.each([
    [["verify", "backend"]],
    [["verify", "frontend", "--json"]],
    [["verify", "-w", ".", "mobile"]],
    [["verify", "PM"]],
  ])("rejects %j and points to oma verify agent", (argv) => {
    expect(() => surface().normalize(argv)).toThrow(
      "Unexpected argument for oma verify. Use oma verify agent <agent-type>.",
    );
  });

  it("routes the canonical forms unchanged", () => {
    const s = surface();
    expect(s.normalize(["verify", "agent", "backend", "--json"])).toEqual([
      "verify",
      "agent",
      "backend",
      "--json",
    ]);
    expect(s.normalize(["verify", "triggers"])).toEqual(["verify", "triggers"]);
  });
});
