import fs from "node:fs";
import path from "node:path";
import { isRecord } from "./coerce.js";
import { signalFromText } from "./signals.js";
import type { CoverageNote, IntelConfig, IntelSignal } from "./types.js";

export function collectLocalSignals(
  config: IntelConfig,
  cwd: string,
  now: Date,
): { signals: IntelSignal[]; coverage: CoverageNote[] } {
  const root = path.resolve(cwd, config.sources.local?.path ?? ".");
  const files = ["README.md", "package.json", "cli/cli.ts"];
  const signals: IntelSignal[] = [];
  const retrievedAt = now.toISOString();

  for (const file of files) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8").slice(0, 4000);
    signals.push(
      signalFromText({
        repo: config.target,
        source: "local",
        observedAt: retrievedAt,
        retrievedAt,
        title: `Target local context: ${file}`,
        summary: content,
        trust: "high",
      }),
    );
  }

  return {
    signals,
    coverage: [
      {
        source: "local",
        status: signals.length > 0 ? "ok" : "skipped",
        detail:
          signals.length > 0
            ? `Collected ${signals.length} local context files.`
            : "No local context files found.",
      },
    ],
  };
}

export function collectMarketSignals(
  config: IntelConfig,
  now: Date,
): { signals: IntelSignal[]; coverage: CoverageNote[] } {
  if (!config.sources.market?.enabled) {
    return {
      signals: [],
      coverage: [{ source: "market", status: "skipped", detail: "Disabled." }],
    };
  }
  if (!config.topic) {
    return {
      signals: [],
      coverage: [
        { source: "market", status: "skipped", detail: "No topic configured." },
      ],
    };
  }
  const retrievedAt = now.toISOString();
  return {
    signals: [
      signalFromText({
        repo: config.target,
        source: "market",
        observedAt: retrievedAt,
        retrievedAt,
        title: `Market research topic: ${config.topic}`,
        summary:
          "Market source is enabled. Use this topic to collect community and trend signals through oma market during full research runs.",
        trust: "low",
      }),
    ],
    coverage: [
      {
        source: "market",
        status: "partial",
        detail:
          "Topic captured for market research; full community harvest is delegated to oma market.",
      },
    ],
  };
}

export function loadFixture(fixturePath: string): {
  signals: IntelSignal[];
  coverage: CoverageNote[];
} {
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as unknown;
  if (Array.isArray(raw)) {
    return { signals: raw as IntelSignal[], coverage: [] };
  }
  if (isRecord(raw)) {
    return {
      signals: Array.isArray(raw.signals) ? (raw.signals as IntelSignal[]) : [],
      coverage: Array.isArray(raw.coverage)
        ? (raw.coverage as CoverageNote[])
        : [],
    };
  }
  throw new Error("Fixture must be an array or object with signals.");
}
