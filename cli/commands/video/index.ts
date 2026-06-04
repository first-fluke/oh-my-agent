import type { Command } from "commander";
import color from "picocolors";
import { runVideoDoctor } from "./doctor.js";
import { runVideoGenerate } from "./generate.js";
import { runVideoListProviders } from "./list-providers.js";
import { runVideoRender } from "./render.js";

export function registerVideoCommand(program: Command): void {
  const video = program
    .command("video")
    .description("Short-form, explainer, and demo video generation")
    .alias("vid");

  video
    .command("generate <brief...>")
    .description("Generate a video run directory from a brief")
    .option("--mode <mode>", "Mode: shorts | explainer | demo")
    .option("--aspect <aspect>", "Aspect: 9:16 | 16:9 | 1:1 | auto")
    .option("--locale <lang>", "Locale/language tag")
    .option("--captions <style>", "Captions: tiktok | lower-third | none")
    .option(
      "--visual <mode>",
      "Visuals: auto | generate | stock | aigc | slide",
    )
    .option("--voice <profile>", "Voice profile, or none")
    .option("--music <mode>", "Music: upbeat | calm | none")
    .option("--duration <sec>", "Duration in seconds, or auto")
    .option("--compositor <name>", "Compositor: remotion | mpt")
    .option(
      "--capture <path>",
      "Capture input path for demo mode (--source file)",
    )
    .option("--source <kind>", "Demo capture source: file | web", "file")
    .option("--url <url>", "Target URL for --source web (any URL)")
    .option(
      "--device <name>",
      "Device frame for web capture (overrides aspect size)",
    )
    .option(
      "--ready-selector <css>",
      "CSS selector to await before web capture",
    )
    .option("--show-cursor", "Overlay a visible cursor in the web capture")
    .option("--polish", "Overlay the Remotion Demo composition on the footage")
    .option("--capture-timeout <sec>", "Hard ceiling for the live web capture")
    .option(
      "--capture-stop <mode>",
      "Non-interactive stop for CI: duration:<sec> | selector:<css>",
    )
    .option("--out <dir>", "Output base directory")
    .option("--allow-external-out", "Allow --out paths outside $PWD")
    .option("--max-usd <n>", "Maximum estimated cost before confirmation")
    .option("--seed <n>", "Deterministic seed")
    .option("--timeout <seconds>", "Timeout in seconds")
    .option("-y, --yes", "Skip cost confirmation")
    .option("--dry-run", "Emit script/render-spec/manifest, skip rendering")
    .option("--format <format>", "CLI output format: text | json", "text")
    .option(
      "--no-brief-in-manifest",
      "Store SHA256 of brief instead of raw text",
    )
    .action(
      async (
        briefWords: string[],
        opts: Record<string, unknown>,
      ): Promise<void> => {
        try {
          const exitCode = await runVideoGenerate({
            brief: briefWords.join(" "),
            opts,
          });
          process.exitCode = exitCode;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  video
    .command("doctor")
    .description("Check video provider and compositor readiness")
    .option("--format <format>", "Output format: text | json", "text")
    .option(
      "--install",
      "One-time install of the vendored Remotion project dependencies",
    )
    .option(
      "--install-mpt",
      "One-time install of the MoneyPrinterTurbo checkout (clone + venv + deps)",
    )
    .option(
      "--install-playwright",
      "One-time install of Playwright (npm i playwright + chromium) for web capture",
    )
    .action(async (opts: Record<string, unknown>): Promise<void> => {
      try {
        process.exitCode = await runVideoDoctor({ opts });
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  video
    .command("list-providers")
    .description("List video providers and availability")
    .option("--format <format>", "Output format: text | json", "text")
    .action(async (opts: Record<string, unknown>): Promise<void> => {
      try {
        process.exitCode = await runVideoListProviders({ opts });
      } catch (err) {
        console.error(color.red((err as Error).message));
        process.exitCode = 1;
      }
    });

  video
    .command("render <runDir>")
    .description("Re-render a run directory from render-spec.json")
    .option("--format <format>", "Output format: text | json", "text")
    .action(
      async (runDir: string, opts: Record<string, unknown>): Promise<void> => {
        try {
          process.exitCode = await runVideoRender({ runDir, opts });
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );
}
