import type { Command } from "commander";
import color from "picocolors";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  runExplainComponents,
  runExplainLint,
  runExplainPatch,
  runExplainRender,
} from "./render/command.js";
import { runExplainValidate } from "./validate.js";

export function registerExplainCommand(program: Command): void {
  const explain = program
    .command("explain")
    .description("Explain artifact management and quality validation tools");

  const validateCmd = explain
    .command("validate [file]")
    .description("Validate self-contained explain HTML report artifacts")
    .option("--dir <path>", "Directory containing HTML files to validate")
    .option(
      "--format <fmt>",
      "Output format: concise | json (default: concise)",
      "concise",
    )
    .option("--out-file <path>", "Write JSON validation report to file");

  addOutputOptions(validateCmd);

  validateCmd.action(
    runAction(
      async (
        file: string | undefined,
        opts: {
          dir?: string;
          format?: string;
          json?: boolean;
          outFile?: string;
        },
      ) => {
        const isJson = resolveJsonMode(opts) || opts.format === "json";
        const format = isJson ? "json" : "concise";
        try {
          const code = await runExplainValidate({
            file,
            dir: opts.dir,
            format,
            outFile: opts.outFile,
          });
          process.exitCode = code;
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  const renderCmd = explain
    .command("render [file]")
    .description(
      "Render a Markdown draft (file or stdin) into one self-contained HTML explanation",
    )
    .option(
      "--out <path>",
      "Output file (default: .agents/results/explain/{YYYY-MM-DD}-{slug}.html)",
    )
    .option(
      "--template <name>",
      "Template: sheet (panel grid) | doc (one column with contents)",
    )
    .option("--theme <name>", "Theme: blueprint | card")
    .option("--mode <mode>", "Colour mode: auto | light | dark")
    .option("--style <level>", "Prose check: off | warn | strict")
    .option(
      "--lang <code>",
      "Page language: en | ko | ja | zh (default: detected)",
    )
    .option("--archify", "Also build and link an interactive archify diagram")
    .option(
      "--no-archify",
      "Skip the archify diagram even when the config enables it",
    )
    .option("--open", "Open the page in the browser");
  addOutputOptions(renderCmd);
  renderCmd.action(
    runAction(
      async (
        file: string | undefined,
        opts: {
          out?: string;
          template?: string;
          theme?: string;
          mode?: string;
          style?: string;
          lang?: string;
          archify?: boolean;
          open?: boolean;
          json?: boolean;
        },
      ) => {
        process.exitCode = await runExplainRender({
          ...opts,
          file,
          json: resolveJsonMode(opts),
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  const patchCmd = explain
    .command("patch <html> [file]")
    .description(
      "Replace one panel of a rendered page from its embedded draft (new panel from file or stdin)",
    )
    .requiredOption(
      "--panel <id>",
      'Panel to replace: its letter (B) or its title ("Call order")',
    )
    .option("--open", "Open the page in the browser");
  addOutputOptions(patchCmd);
  patchCmd.action(
    runAction(
      async (
        html: string,
        file: string | undefined,
        opts: { panel: string; open?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runExplainPatch({
          html,
          file,
          panel: opts.panel,
          open: opts.open,
          json: resolveJsonMode(opts),
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  const lintCmd = explain
    .command("lint [file]")
    .description("Check the prose of a draft (file or stdin) without rendering")
    .option("--style <level>", "warn | strict (strict exits 1 on a warning)")
    .option(
      "--lang <code>",
      "Draft language: en | ko | ja | zh (default: detected)",
    );
  addOutputOptions(lintCmd);
  lintCmd.action(
    runAction(
      async (
        file: string | undefined,
        opts: { style?: string; lang?: string; json?: boolean },
      ) => {
        process.exitCode = runExplainLint({
          ...opts,
          file,
          json: resolveJsonMode(opts),
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  const componentsCmd = explain
    .command("components [name]")
    .description(
      "List the components a draft can use, or print one component's syntax",
    );
  addOutputOptions(componentsCmd);
  componentsCmd.action(
    runAction(
      async (name: string | undefined, opts: { json?: boolean }) => {
        process.exitCode = runExplainComponents(name, {
          json: resolveJsonMode(opts),
        });
      },
      { supportsJsonOutput: true },
    ),
  );
}

export {
  runExplainComponents,
  runExplainLint,
  runExplainPatch,
  runExplainRender,
} from "./render/command.js";
export { runExplainValidate } from "./validate.js";
