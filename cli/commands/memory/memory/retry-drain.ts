import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { type OmaEvent, retryObservePath } from "../../../state/events.js";
import { createAgentMemoryProvider } from "../../../state/memory-provider.js";
import type {
  MemoryProvider,
  MemoryRetryDrainResult,
} from "../../../types/memory.js";

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
