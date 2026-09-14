import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { integerOption } from "./option-parsers.js";

describe("integerOption", () => {
  it("parses base 10 regardless of the option's previous value", () => {
    const program = new Command()
      .option("--repeats <n>", "", integerOption, 3)
      .option("--raw <n>", "", parseInt, 3)
      .exitOverride();
    program.parse(["--repeats", "3", "--raw", "3"], { from: "user" });
    const opts = program.opts<{ repeats: number; raw: number }>();
    expect(opts.repeats).toBe(3);
    // The bare parser is the regression this helper prevents.
    expect(Number.isNaN(opts.raw)).toBe(true);
  });
});
