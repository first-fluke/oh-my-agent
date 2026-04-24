import type { Command } from "commander";
import color from "picocolors";
import { runDoctor } from "./doctor.js";
import { runGenerate } from "./generate.js";
import { runListVendors } from "./list-vendors.js";

// Collector for the -r/--reference option. Commander invokes this once per
// -r occurrence; by returning a new array each time we accumulate values
// without the greedy variadic syntax (which would consume the positional
// <prompt...>). The collector also splits comma-separated values, matching
// the normalizer in generate.ts.
function collectReference(value: string, previous: string[] = []): string[] {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...previous, ...parts];
}

export function registerImageCommand(program: Command): void {
  const image = program
    .command("image")
    .description(
      "Multi-vendor AI image generation — authentication-aware parallel dispatch",
    )
    .alias("img");

  image
    .command("generate <prompt...>")
    .description(
      "Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or gemini (needs API key + billing, disabled by default)",
    )
    .option(
      "--vendor <name>",
      "Vendor: auto | pollinations | codex | gemini | all",
      "auto",
    )
    .option(
      "--size <size>",
      "Image size: 1024x1024 | 1024x1536 | 1536x1024 | auto",
    )
    .option("--quality <level>", "Quality: low | medium | high | auto")
    .option("-n, --count <n>", "Number of images (1..5)")
    .option("--out <dir>", "Output directory")
    .option("--allow-external-out", "Allow --out paths outside $PWD")
    .option("--model <name>", "Vendor-specific model override")
    .option(
      "--strategy <list>",
      "Gemini fallback order, comma-separated (mcp,stream,api)",
    )
    .option("--timeout <seconds>", "Per-image timeout")
    .option(
      "-r, --reference <path>",
      "Reference image path; repeatable (-r a.png -r b.png) or comma-separated. Supported on codex and gemini vendors.",
      collectReference,
      [] as string[],
    )
    .option("-y, --yes", "Skip cost confirmation")
    .option(
      "--no-prompt-in-manifest",
      "Store SHA256 of prompt instead of raw text",
    )
    .option("--dry-run", "Print plan and cost estimate; do not execute")
    .option("--format <format>", "CLI output format: text | json", "text")
    .action(
      async (
        promptWords: string[],
        opts: Record<string, unknown>,
      ): Promise<void> => {
        try {
          const exitCode = await runGenerate({
            prompt: promptWords.join(" "),
            opts,
          });
          process.exitCode = exitCode;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  image
    .command("doctor")
    .description("Check authentication and install status per vendor")
    .option("--format <format>", "Output format: text | json", "text")
    .action(async (opts: Record<string, unknown>): Promise<void> => {
      try {
        const exitCode = await runDoctor({ opts });
        process.exitCode = exitCode;
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  image
    .command("list-vendors")
    .description("List registered vendors and supported models")
    .option("--format <format>", "Output format: text | json", "text")
    .action(async (opts: Record<string, unknown>): Promise<void> => {
      try {
        await runListVendors({ opts });
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });
}
