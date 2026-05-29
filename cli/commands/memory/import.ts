import * as p from "@clack/prompts";
import { TZDate } from "@date-fns/tz";
import { parse, startOfDay } from "date-fns";
import pc from "picocolors";
import "../recap/internal/index.js";
import { createAgentMemoryProvider } from "../../state/memory-provider.js";
import type {
  MemoryImportLoadOptions,
  MemoryImportOptions,
  MemoryImportResult,
  MemoryImportSource,
  MemoryProvider,
  MemoryRawTurn,
  MemoryRawTurnLoadResult,
} from "../../types/memory.js";
import { loadTimezone } from "../../utils/config.js";
import { resolveWindowBounds } from "../../utils/time-window.js";
import { filterParsers } from "../recap/internal/registry.js";
import { drainMemoryRetryQueue } from "./memory.js";

const VENDOR_IMPORT_SOURCES = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "qwen",
] as const;

type VendorImportSource = (typeof VENDOR_IMPORT_SOURCES)[number];

function resolveImportWindow(since?: string): { start: number; end: number } {
  if (!since) return resolveWindowBounds("30d");
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    const timezone = loadTimezone();
    const start = startOfDay(
      parse(since, "yyyy-MM-dd", new TZDate(Date.now(), timezone)),
    );
    if (Number.isNaN(start.getTime())) {
      throw new Error(`invalid since date: ${since}`);
    }
    return { start: start.getTime(), end: Date.now() };
  }
  const resolved = resolveWindowBounds(since);
  return { start: resolved.start, end: resolved.end };
}

function parseImportSources(source?: string): MemoryImportSource[] {
  if (!source || source === "all") return ["all"];
  const sources = source
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as MemoryImportSource[];
  const allowed = new Set<MemoryImportSource>([
    "all",
    "claude",
    "codex",
    "cursor",
    "gemini",
    "qwen",
    "retry",
  ]);
  for (const item of sources) {
    if (!allowed.has(item)) {
      throw new Error(`invalid memory import source: ${item}`);
    }
  }
  return sources.length > 0 ? sources : ["all"];
}

function expandVendorSources(
  sources: MemoryImportSource[],
): VendorImportSource[] {
  if (sources.includes("all")) return [...VENDOR_IMPORT_SOURCES];
  return sources.filter((source): source is VendorImportSource =>
    VENDOR_IMPORT_SOURCES.includes(source as VendorImportSource),
  );
}

async function loadRawTurnsFromRecap(
  options: MemoryImportLoadOptions,
): Promise<MemoryRawTurnLoadResult> {
  const parsers = filterParsers(options.sources);
  const warnings: string[] = [];
  const batches = await Promise.all(
    parsers.map(async (parser) => {
      if (!(await parser.detect())) return [];
      if (parser.parseRaw) {
        const result = await parser.parseRaw(options.start, options.end);
        if (Array.isArray(result)) return result;
        warnings.push(...result.warnings);
        return result.turns;
      }
      warnings.push(
        `${parser.name} parser has no parseRaw implementation; skipping raw import`,
      );
      return [];
    }),
  );
  return {
    turns: batches.flat().sort((a, b) => a.timestamp - b.timestamp),
    warnings,
  };
}

async function observeRawTurns(args: {
  provider: MemoryProvider;
  turns: MemoryRawTurn[];
  dryRun?: boolean;
}): Promise<{ imported: number; failed: number }> {
  if (args.dryRun) return { imported: 0, failed: 0 };

  let imported = 0;
  let failed = 0;
  for (const turn of args.turns) {
    const ok = await args.provider.observe({
      sessionId: turn.vendorSessionId ?? turn.idempotencyKey,
      source: `oma-memory-import:${turn.vendor}`,
      content: `${JSON.stringify(turn)}\n`,
    });
    if (ok) imported += 1;
    else failed += 1;
  }
  return { imported, failed };
}

export async function importAgentMemory(
  args: MemoryImportOptions = {},
): Promise<MemoryImportResult> {
  const { start, end } = resolveImportWindow(args.since);
  const sources = parseImportSources(args.source);
  if (sources.includes("retry") && sources.length > 1) {
    throw new Error("memory import source 'retry' cannot be combined");
  }

  if (sources.includes("retry")) {
    const retry = await drainMemoryRetryQueue({
      projectDir: args.projectDir,
      provider: args.provider,
      dryRun: args.dryRun,
    });
    return {
      source: sources.join(","),
      start,
      end,
      total: retry.total,
      imported: retry.drained,
      failed: retry.retained,
      dryRun: args.dryRun === true,
      partial: false,
      warnings: [],
      retry,
    };
  }

  const vendorSources = expandVendorSources(sources);
  const warnings: string[] = [];
  if (vendorSources.includes("cursor") && !args.forcePartial) {
    warnings.push(
      "cursor import only includes raw rows with exact timestamps; close Cursor and rerun with --force-partial if coverage is partial",
    );
  }

  const loaded = await (args.rawTurnLoader ?? loadRawTurnsFromRecap)({
    sources: vendorSources,
    start,
    end,
  });
  const turns = Array.isArray(loaded) ? loaded : loaded.turns;
  if (!Array.isArray(loaded)) warnings.push(...loaded.warnings);
  const provider = args.provider ?? createAgentMemoryProvider();
  const observed = await observeRawTurns({
    provider,
    turns,
    dryRun: args.dryRun,
  });

  return {
    source: sources.join(","),
    start,
    end,
    total: turns.length,
    imported: observed.imported,
    failed: observed.failed,
    dryRun: args.dryRun === true,
    partial: warnings.length > 0,
    warnings,
  };
}

export async function printAgentMemoryImport(
  jsonMode = false,
  args: MemoryImportOptions = {},
): Promise<void> {
  const result = await importAgentMemory(args);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  p.note(
    [
      `Source: ${pc.cyan(result.source)}`,
      `Window: ${pc.cyan(new Date(result.start).toISOString())} - ${pc.cyan(new Date(result.end).toISOString())}`,
      `Total turns: ${result.total}`,
      `Imported: ${pc.green(String(result.imported))}`,
      `Failed/retained: ${result.failed > 0 ? pc.yellow(String(result.failed)) : "0"}`,
      result.partial ? pc.yellow("Partial coverage warning") : null,
      ...result.warnings.map((warning) => `Warning: ${warning}`),
      result.dryRun ? pc.dim("Dry run: AgentMemory unchanged") : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    "AgentMemory import",
  );
}
