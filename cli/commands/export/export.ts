import pc from "picocolors";
import { generateCursorRules } from "../../platform/rules.js";

export type ExportFormat = "cursor";

const SUPPORTED_FORMATS: ExportFormat[] = ["cursor"];

/**
 * CLI entry point for `oma export <format>`.
 */
export async function exportRules(
  format: string,
  targetDir: string,
  jsonMode = false,
): Promise<void> {
  if (!SUPPORTED_FORMATS.includes(format as ExportFormat)) {
    throw new Error(
      `Unsupported format: ${format}. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
    );
  }

  const exported = generateCursorRules(targetDir);

  if (exported.length === 0) {
    throw new Error("No rules found. Run `oma install` first.");
  }

  if (jsonMode) {
    console.log(
      JSON.stringify({ format, exported, dir: ".cursor/rules" }, null, 2),
    );
    return;
  }

  console.log(
    `\n${pc.green("✓")} Exported ${pc.bold(String(exported.length))} rules to ${pc.cyan(".cursor/rules")}/\n`,
  );

  for (const name of exported) {
    console.log(`  ${pc.green("✓")} ${name}.mdc`);
  }

  console.log(
    `\n${pc.dim("Tip: Rules with globs auto-activate on matching files. Others are available via @rule-name in Cursor chat.")}\n`,
  );
}
