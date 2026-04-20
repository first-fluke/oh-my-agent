import * as p from "@clack/prompts";
import pc from "picocolors";
import { ensureMemorySchema } from "../../io/memory.js";

export async function initMemory(
  jsonMode = false,
  forceMode = false,
): Promise<void> {
  const cwd = process.cwd();
  const result = ensureMemorySchema(cwd, { force: forceMode });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🧠 oh-my-agent memory:init ")));

  const summaryLines = [
    `Memories dir: ${pc.cyan(result.memoriesDir)}`,
    `Session ID: ${pc.cyan(result.sessionId)}`,
    "",
    pc.bold("Created:"),
    result.created.length > 0
      ? result.created.map((f) => `  + ${f}`).join("\n")
      : "  (none)",
    "",
    pc.bold("Updated:"),
    result.updated.length > 0
      ? result.updated.map((f) => `  ~ ${f}`).join("\n")
      : "  (none)",
    "",
    pc.bold("Skipped:"),
    result.skipped.length > 0
      ? result.skipped.map((f) => `  - ${f}`).join("\n")
      : "  (none)",
  ].join("\n");

  p.note(summaryLines, "Memory Schema");
  p.outro(pc.green("Memory schema ready!"));
}
