/**
 * Coverage validation for nativeEventToKind — design 019, Task 12.
 *
 * Dynamically loads every variant JSON under .agents/hooks/variants/*.json,
 * extracts every event key registered for the 8 hook-model vendors (all JSON
 * files; the `pi` subdirectory is excluded as it is not a vendor JSON), and
 * asserts that nativeEventToKind(vendor, event) returns a non-null kind for
 * each registered event.
 *
 * Events that OMA intentionally does not handle (status-line / HUD-only hooks
 * such as gemini's AfterTool and SessionStart) are listed in the NULL_ALLOWLIST
 * below with a comment explaining why they are null. Any new intentionally-null
 * event MUST be added here explicitly — that is the whole point of this test.
 *
 * If this test fails, either:
 *   a) a vendor JSON registers a new event that nativeEventToKind does not map
 *      (add the mapping to adapters.ts), or
 *   b) a new intentionally-unhandled event was added to a variant JSON (add it
 *      to NULL_ALLOWLIST with a comment).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nativeEventToKind, normalizeInput } from "./adapters.js";
import type { Vendor } from "./types.js";

// ---------------------------------------------------------------------------
// Known-null allowlist — events that OMA deliberately does not handle.
// These are status-line / HUD-only hooks that fire on events OMA has no
// business logic for. Asserting them explicitly here prevents silent regressions
// if someone later adds a handler to nativeEventToKind by accident.
//
// Format: `${vendor}:${nativeEvent}` → reason comment
// ---------------------------------------------------------------------------

const NULL_ALLOWLIST: Record<string, string> = {
  // gemini AfterTool fires after every tool call; OMA has no post-tool handler.
  // Only hud.ts (status-line) is registered for it in gemini.json.
  "gemini:AfterTool":
    "intentionally null — HUD/status-line only, no OMA business handler",

  // gemini SessionStart fires once when a session opens; OMA has no session-
  // open handler. Only hud.ts is registered for it in gemini.json.
  "gemini:SessionStart":
    "intentionally null — HUD/status-line only, no OMA business handler",
};

// ---------------------------------------------------------------------------
// Variant JSON loader — reads all *.json files directly under variants/.
// The `pi` entry is a subdirectory (not a vendor JSON), so readdirSync with
// { withFileTypes: true } lets us skip non-file entries safely.
// ---------------------------------------------------------------------------

const variantsDir = join(
  __dirname,
  "..",
  "..",
  "..",
  ".agents",
  "hooks",
  "variants",
);

interface VariantJson {
  vendor: string;
  events: Record<string, unknown>;
}

function loadVariants(): VariantJson[] {
  const entries = readdirSync(variantsDir, { withFileTypes: true });
  const variants: VariantJson[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    // Skip the schema file — it has no `vendor` or `events` fields.
    if (entry.name === "hook-variant.schema.json") continue;

    const raw = readFileSync(join(variantsDir, entry.name), "utf-8");
    const parsed = JSON.parse(raw) as VariantJson;
    variants.push(parsed);
  }

  return variants;
}

// ---------------------------------------------------------------------------
// Dynamic coverage test
// ---------------------------------------------------------------------------

describe("nativeEventToKind — variant JSON coverage", () => {
  const variants = loadVariants();

  it("loaded at least one variant JSON (sanity check)", () => {
    expect(variants.length).toBeGreaterThan(0);
  });

  for (const variant of variants) {
    const vendor = variant.vendor as Vendor;
    const eventKeys = Object.keys(variant.events ?? {});

    describe(`vendor "${vendor}"`, () => {
      it("has at least one registered event", () => {
        expect(eventKeys.length).toBeGreaterThan(0);
      });

      for (const event of eventKeys) {
        const allowlistKey = `${vendor}:${event}`;
        const isKnownNull = allowlistKey in NULL_ALLOWLIST;

        if (isKnownNull) {
          it(`event "${event}" is in the null allowlist (${NULL_ALLOWLIST[allowlistKey]})`, () => {
            const kind = nativeEventToKind(vendor, event);
            expect(kind).toBeNull();
          });
        } else {
          it(`event "${event}" maps to a non-null kind`, () => {
            const kind = nativeEventToKind(vendor, event);
            expect(
              kind,
              `nativeEventToKind("${vendor}", "${event}") returned null — ` +
                `add a mapping in adapters.ts or add to NULL_ALLOWLIST if intentional`,
            ).not.toBeNull();
          });
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// normalizeInput — prompt payload shapes through the central dispatch path.
// Kimi delivers `prompt` as a ContentPart[] array (MoonshotAI/kimi-code #917);
// every settings-file vendor reaches handlers via this path, so the array must
// normalize here, not only in the standalone script entrypoints.

describe("normalizeInput — prompt field shapes", () => {
  it("normalizes a Kimi ContentPart[] prompt to its text", () => {
    const raw = JSON.stringify({
      prompt: [
        { type: "text", text: "work: fix" },
        { type: "image", data: "…" },
        { type: "text", text: "the bug" },
      ],
      cwd: "/tmp/p",
      session_id: "kimi-1",
      hook_event_name: "UserPromptSubmit",
    });
    const input = normalizeInput("kimi", "UserPromptSubmit", raw);
    expect(input).toEqual({
      kind: "prompt",
      prompt: "work: fix the bug",
      cwd: "/tmp/p",
    });
  });

  it("passes a plain string prompt through unchanged", () => {
    const raw = JSON.stringify({
      prompt: "hello",
      cwd: "/tmp/p",
      hook_event_name: "UserPromptSubmit",
    });
    const input = normalizeInput("claude", "UserPromptSubmit", raw);
    expect(input).toEqual({ kind: "prompt", prompt: "hello", cwd: "/tmp/p" });
  });
});
