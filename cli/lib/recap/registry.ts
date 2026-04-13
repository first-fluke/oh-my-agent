import type { NormalizedEntry, ToolName } from "./schema.js";

export interface HistoryParser {
  name: ToolName;
  detect(): Promise<boolean>;
  parse(start: number, end: number): Promise<NormalizedEntry[]>;
}

const registry: HistoryParser[] = [];

export function registerParser(parser: HistoryParser): void {
  registry.push(parser);
}

export function getParsers(): HistoryParser[] {
  return registry;
}

export function filterParsers(tools?: string[]): HistoryParser[] {
  if (!tools || tools.length === 0) return registry;
  return registry.filter((p) => tools.includes(p.name));
}

export async function getAvailableParsers(): Promise<
  Array<HistoryParser & { available: boolean }>
> {
  return Promise.all(
    registry.map(async (p) => ({ ...p, available: await p.detect() })),
  );
}
