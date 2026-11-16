import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  agyPrintTimeoutArgs,
  detectAgyCaps,
  primeAgyCaps,
  resetAgyCapsCache,
} from "./agy-caps.js";

const HELP_1_1 = [
  "Usage of agy:",
  "  --add-dir                       Add a directory to the workspace (repeatable) (default [])",
  "  --model                         Model for the current CLI session",
  "  --print-timeout                 Timeout for print mode wait (default 5m0s)",
  "  -p                              Short alias for --print",
].join("\n");

const HELP_1_0 = [
  "Usage of agy:",
  "  -p          Short alias for --print",
  "  --print     Run a single prompt non-interactively and print the response",
].join("\n");

describe("detectAgyCaps", () => {
  beforeEach(() => resetAgyCapsCache());
  afterEach(() => resetAgyCapsCache());

  it("detects --model and --add-dir from agy 1.1 help", () => {
    expect(detectAgyCaps(() => HELP_1_1)).toEqual({
      modelFlag: true,
      addDir: true,
      printTimeout: true,
      modeFlag: false,
    });
  });

  it("reports no caps for agy 1.0 help", () => {
    expect(detectAgyCaps(() => HELP_1_0)).toEqual({
      modelFlag: false,
      addDir: false,
      printTimeout: false,
      modeFlag: false,
    });
  });

  it("treats a failing probe as no caps (legacy drop behavior)", () => {
    expect(
      detectAgyCaps(() => {
        throw new Error("agy not installed");
      }),
    ).toEqual({
      modelFlag: false,
      addDir: false,
      printTimeout: false,
      modeFlag: false,
    });
  });

  it("matches only flag-definition lines, not prose mentions", () => {
    expect(detectAgyCaps(() => "see the --model docs for details")).toEqual({
      modelFlag: false,
      addDir: false,
      printTimeout: false,
      modeFlag: false,
    });
  });

  it("caches the first probe until reset", () => {
    detectAgyCaps(() => HELP_1_1);
    expect(detectAgyCaps(() => HELP_1_0)).toEqual({
      modelFlag: true,
      addDir: true,
      printTimeout: true,
      modeFlag: false,
    });
    resetAgyCapsCache();
    expect(detectAgyCaps(() => HELP_1_0)).toEqual({
      modelFlag: false,
      addDir: false,
      printTimeout: false,
      modeFlag: false,
    });
  });

  it("detects --mode from a flag-definition line", () => {
    const help = `${HELP_1_1}\n  --mode                          Set the agent execution mode for this session (accept-edits, auto, plan)`;
    expect(detectAgyCaps(() => help).modeFlag).toBe(true);
  });

  it("primeAgyCaps seeds the cache without probing", () => {
    primeAgyCaps({ modelFlag: true, addDir: false });
    expect(detectAgyCaps(() => HELP_1_0)).toEqual({
      modelFlag: true,
      addDir: false,
      printTimeout: false,
      modeFlag: false,
    });
  });
});

describe("agyPrintTimeoutArgs", () => {
  beforeEach(() => resetAgyCapsCache());
  afterEach(() => resetAgyCapsCache());

  // Regression: agy print mode gives up at its 5m default and exits with no
  // result, which the orchestrator reports as a hang that crashed at 5 minutes.
  // oma has no outer spawn timeout, so the flag must be emitted.
  it("raises the 5m print-mode default when agy supports the flag", () => {
    primeAgyCaps({ printTimeout: true });
    expect(agyPrintTimeoutArgs({})).toEqual(["--print-timeout", "30m"]);
  });

  it("emits nothing when agy predates --print-timeout (agy 1.0)", () => {
    primeAgyCaps({ printTimeout: false });
    expect(agyPrintTimeoutArgs({})).toEqual([]);
  });

  it("honors a valid OMA_AGY_PRINT_TIMEOUT override", () => {
    primeAgyCaps({ printTimeout: true });
    expect(agyPrintTimeoutArgs({ OMA_AGY_PRINT_TIMEOUT: "90m" })).toEqual([
      "--print-timeout",
      "90m",
    ]);
  });

  it("falls back to the default when the override is not a Go duration", () => {
    primeAgyCaps({ printTimeout: true });
    expect(
      agyPrintTimeoutArgs({ OMA_AGY_PRINT_TIMEOUT: "10 minutes; rm -rf /" }),
    ).toEqual(["--print-timeout", "30m"]);
  });
});
