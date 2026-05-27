import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ensureMemorySchema } from "../../io/memory.js";
import { type OmaEvent, retryObservePath } from "../../state/events.js";
import { createAgentMemoryProvider } from "../../state/memory-provider.js";
import type {
  MemoryProvider,
  MemoryProviderStatus,
} from "../../types/memory.js";

export interface MemoryRetryDrainResult {
  retryPath: string;
  total: number;
  drained: number;
  retained: number;
  invalid: number;
  dryRun: boolean;
}

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

export async function getAgentMemoryStatus(
  provider: MemoryProvider = createAgentMemoryProvider(),
): Promise<MemoryProviderStatus> {
  return provider.status();
}

function parseRetryLine(line: string): OmaEvent | null {
  try {
    const parsed = JSON.parse(line) as Partial<OmaEvent>;
    if (
      typeof parsed.sid === "string" &&
      typeof parsed.kind === "string" &&
      typeof parsed.eventId === "string" &&
      typeof parsed.ts === "string"
    ) {
      return parsed as OmaEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export async function drainMemoryRetryQueue(
  args: {
    projectDir?: string;
    provider?: MemoryProvider;
    dryRun?: boolean;
  } = {},
): Promise<MemoryRetryDrainResult> {
  const projectDir = args.projectDir ?? process.cwd();
  const provider = args.provider ?? createAgentMemoryProvider();
  const retryPath = retryObservePath(projectDir);
  if (!existsSync(retryPath)) {
    return {
      retryPath,
      total: 0,
      drained: 0,
      retained: 0,
      invalid: 0,
      dryRun: args.dryRun === true,
    };
  }

  const lines = readFileSync(retryPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim());
  const retainedLines: string[] = [];
  let drained = 0;
  let invalid = 0;

  for (const line of lines) {
    const event = parseRetryLine(line);
    if (!event) {
      invalid += 1;
      retainedLines.push(line);
      continue;
    }

    if (args.dryRun) {
      retainedLines.push(line);
      continue;
    }

    const observed = await provider.observe({
      sessionId: event.sid,
      content: `${JSON.stringify(event)}\n`,
      source: "oma-workflow",
    });
    if (observed) {
      drained += 1;
    } else {
      retainedLines.push(line);
    }
  }

  if (!args.dryRun) {
    const tmp = `${retryPath}.${process.pid}.${Date.now()}.tmp`;
    const content =
      retainedLines.length > 0 ? `${retainedLines.join("\n")}\n` : "";
    writeFileSync(tmp, content, "utf-8");
    renameSync(tmp, retryPath);
  }

  return {
    retryPath,
    total: lines.length,
    drained,
    retained: retainedLines.length,
    invalid,
    dryRun: args.dryRun === true,
  };
}

export async function printAgentMemoryStatus(jsonMode = false): Promise<void> {
  const status = await getAgentMemoryStatus();
  if (jsonMode) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const reachable = status.reachable
    ? pc.green("reachable")
    : pc.red("offline");
  console.log(`${pc.bold("AgentMemory")}: ${reachable}`);
  if (status.endpoint) console.log(`Endpoint: ${pc.cyan(status.endpoint)}`);
  if (status.version) console.log(`Version: ${pc.cyan(status.version)}`);
  if (status.reason) console.log(`Reason: ${status.reason}`);
}

export async function printMemoryRetryDrain(
  jsonMode = false,
  dryRun = false,
): Promise<void> {
  const result = await drainMemoryRetryQueue({ dryRun });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`${pc.bold("Retry queue")}: ${pc.cyan(result.retryPath)}`);
  console.log(`Total: ${result.total}`);
  console.log(`Drained: ${pc.green(String(result.drained))}`);
  console.log(`Retained: ${pc.yellow(String(result.retained))}`);
  if (result.invalid > 0)
    console.log(`Invalid: ${pc.red(String(result.invalid))}`);
  if (result.dryRun) console.log(pc.dim("Dry run: retry file unchanged"));
}
