import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerImageCommand } from "../commands/image/index.js";
import { registerSlideCommand } from "../commands/slide/index.js";
import {
  omaImageDoctorArgs,
  omaImageGenerateArgs,
  omaSlideExportPngArgs,
} from "../commands/video/internal/sibling-cli.js";
import { createCommandSurface } from "../utils/command-surface.js";

// Regression: `oma video` shells out to `oma image` and `oma slide`. After the
// option names were standardized it kept sending `--format` / `--out` and
// `slide png --dir`, which the command surface rejects. Every caller treats a
// failed sibling call as "use the placeholder", so the video pipeline silently
// stopped producing real stills. This lives outside commands/ because it needs
// both sibling slices and the video slice may import neither.
function surface() {
  const program = new Command("oma").exitOverride();
  registerImageCommand(program);
  registerSlideCommand(program);
  return createCommandSurface(program);
}

describe("oma video sibling CLI argv", () => {
  it("sends argv the image and slide commands accept", () => {
    const s = surface();

    expect(s.normalize(omaImageDoctorArgs())).toEqual([
      "image",
      "doctor",
      "--format",
      "json",
    ]);
    expect(
      s.normalize(
        omaImageGenerateArgs(
          "a prompt",
          { width: 1024, height: 576 },
          "/run/visuals",
        ),
      ),
    ).toEqual([
      "image",
      "generate",
      "a prompt",
      "--vendor",
      "auto",
      "--size",
      "1024x576",
      "--format",
      "json",
      "--out",
      "/run/visuals",
    ]);
    expect(
      s.normalize(omaSlideExportPngArgs("/deck", "/run/visuals/slides")),
    ).toEqual([
      "slide",
      "png",
      "--dir",
      "/deck",
      "--out-dir",
      "/run/visuals/slides",
    ]);
  });

  // The spellings the pipeline used to send. They are the parser's internal
  // names, not accepted input, so the builders must never return them.
  it.each([
    [["image", "doctor", "--format", "json"], "Removed option --format"],
    [
      ["image", "generate", "p", "--format", "json", "--out", "/x"],
      "Removed option --format",
    ],
    [
      ["slide", "png", "--dir", "/deck", "--out-dir", "/x"],
      "Use oma slide export png",
    ],
  ])("rejects the removed spelling %j", (argv, message) => {
    expect(() => surface().normalize(argv)).toThrow(message);
  });
});
