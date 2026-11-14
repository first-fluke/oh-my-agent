// Argv for the sibling `oma` commands the video pipeline shells out to.
//
// The video slice may not import the image or slide slices (cli/ARCHITECTURE.md),
// so it reaches them through their CLI surface. Keeping every such argv here
// lets one contract test check them against the registered commands: a renamed
// or removed option otherwise fails only at runtime, where the caller treats a
// non-zero exit as "use the placeholder".

/** `oma image doctor` — per-vendor health as JSON. */
export function omaImageDoctorArgs(): string[] {
  return ["image", "doctor", "--output", "json"];
}

/** `oma image generate` — one still into `outDir`, result manifest as JSON. */
export function omaImageGenerateArgs(
  prompt: string,
  size: { width: number; height: number },
  outDir: string,
): string[] {
  return [
    "image",
    "generate",
    prompt,
    "--vendor",
    "auto",
    "--size",
    `${size.width}x${size.height}`,
    "--output",
    "json",
    "--output-dir",
    outDir,
  ];
}

/** `oma slide export png` — every slide of the deck at `deckDir` into `outDir`. */
export function omaSlideExportPngArgs(
  deckDir: string,
  outDir: string,
): string[] {
  return [
    "slide",
    "export",
    "png",
    "--workspace",
    deckDir,
    "--output-dir",
    outDir,
  ];
}
