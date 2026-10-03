/**
 * Locks the Stop budget chain so a goal gate is always stopped — and recorded
 * — by the hook itself, never killed silently by the vendor (fail-open, no
 * trace, possibly an orphaned test runner):
 *
 *   gate (GATE_TIMEOUT_MS) < persistent-mode handler timeout < vendor timeout
 *
 * Also pins the seconds→ms conversion: the old `> 30 ⇒ already ms` rule turned
 * any 31–999 s budget into a few dozen milliseconds.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_TIMEOUT_MS } from "../../.agents/hooks/core/persistent-mode.ts";
import { toMs } from "../commands/hook/dispatch.js";
import { chainTimeoutSeconds } from "../platform/hooks-composer.js";

const VARIANTS_DIR = join(__dirname, "../../.agents/hooks/variants");

interface Entry {
  hook: string;
  timeout: number;
}

interface Variant {
  vendor: string;
  homeOnly?: boolean;
  events: Record<string, Entry | Entry[]>;
}

const schema = JSON.parse(
  readFileSync(join(VARIANTS_DIR, "hook-variant.schema.json"), "utf-8"),
);
const TIMEOUT_SCHEMA = schema.$defs.hookEvent.properties.timeout;

const variants: Variant[] = readdirSync(VARIANTS_DIR)
  .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
  .map((f) => JSON.parse(readFileSync(join(VARIANTS_DIR, f), "utf-8")));

const entriesOf = (raw: Entry | Entry[]): Entry[] =>
  Array.isArray(raw) ? raw : [raw];

/** The event chain (and its name) that runs persistent-mode, if any. */
function stopChain(variant: Variant): Entry[] | null {
  for (const raw of Object.values(variant.events)) {
    const chain = entriesOf(raw);
    if (chain.some((e) => e.hook === "persistent-mode.ts")) return chain;
  }
  return null;
}

describe("hook timeout budget chain", () => {
  it("covers every vendor variant", () => {
    expect(variants.length).toBeGreaterThanOrEqual(9);
    for (const variant of variants) {
      expect(stopChain(variant), variant.vendor).not.toBeNull();
    }
  });

  it("keeps every variant timeout inside the schema's integer-seconds range", () => {
    for (const variant of variants) {
      for (const [event, raw] of Object.entries(variant.events)) {
        for (const entry of entriesOf(raw)) {
          const where = `${variant.vendor}.${event}.${entry.hook}`;
          expect(Number.isInteger(entry.timeout), where).toBe(true);
          expect(entry.timeout, where).toBeGreaterThanOrEqual(
            TIMEOUT_SCHEMA.minimum,
          );
          expect(entry.timeout, where).toBeLessThanOrEqual(
            TIMEOUT_SCHEMA.maximum,
          );
        }
      }
    }
  });

  it("gives the gate less time than the persistent-mode handler", () => {
    for (const variant of variants) {
      const handler = stopChain(variant)?.find(
        (e) => e.hook === "persistent-mode.ts",
      );
      expect(toMs(handler?.timeout ?? 0), variant.vendor).toBeGreaterThan(
        GATE_TIMEOUT_MS,
      );
    }
  });

  it("gives the vendor more time than the whole Stop chain it runs", () => {
    for (const variant of variants) {
      const chain = stopChain(variant) ?? [];
      const handler = chain.find((e) => e.hook === "persistent-mode.ts");
      // agy registers each handler as its own hook (timeout = the handler's);
      // every other vendor runs the chain in one `oma hook run` entry.
      const vendorSeconds =
        variant.homeOnly && variant.vendor === "antigravity"
          ? (handler?.timeout ?? 0)
          : chainTimeoutSeconds(chain);
      expect(vendorSeconds * 1000, variant.vendor).toBeGreaterThan(
        GATE_TIMEOUT_MS,
      );
      if (variant.vendor !== "antigravity") {
        expect(vendorSeconds, variant.vendor).toBeGreaterThan(
          handler?.timeout ?? 0,
        );
      }
    }
  });

  it("runs persistent-mode with the handler budget in the pi and opencode bridges", () => {
    const claudeHandler = stopChain(
      variants.find((v) => v.vendor === "claude") as Variant,
    )?.find((e) => e.hook === "persistent-mode.ts");
    for (const bridge of ["pi/index.ts", "opencode/oma.ts"]) {
      const source = readFileSync(join(VARIANTS_DIR, bridge), "utf-8");
      const declared = source.match(
        /const PERSISTENT_MODE_TIMEOUT_MS = ([\d_]+);/,
      )?.[1];
      expect(declared, bridge).toBeDefined();
      const budgetMs = Number(declared?.replaceAll("_", ""));
      expect(budgetMs, bridge).toBeGreaterThan(GATE_TIMEOUT_MS);
      expect(budgetMs, bridge).toBeGreaterThanOrEqual(
        toMs(claudeHandler?.timeout ?? 0),
      );
      // The persistent-mode spawn must actually use it.
      expect(source, bridge).toMatch(
        /"persistent-mode\.ts",[\s\S]{0,200}?PERSISTENT_MODE_TIMEOUT_MS/,
      );
    }
  });
});

describe("toMs", () => {
  it("reads variant timeouts as seconds", () => {
    expect(toMs(5)).toBe(5_000);
    expect(toMs(30)).toBe(30_000);
  });

  it("no longer turns a 31–999 s budget into milliseconds", () => {
    expect(toMs(31)).toBe(31_000);
    expect(toMs(120)).toBe(120_000);
    expect(toMs(999)).toBe(999_000);
  });

  it("keeps legacy millisecond values (≥ 1000) as-is", () => {
    expect(toMs(5_000)).toBe(5_000);
  });

  it("falls back to the default for invalid values", () => {
    expect(toMs(0)).toBe(5_000);
    expect(toMs(-1)).toBe(5_000);
    expect(toMs(Number.NaN)).toBe(5_000);
  });
});
