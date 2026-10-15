import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { currentMemoryAdapter } from "../../.agents/hooks/core/memory-adapter.js";

let parent: string;
beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), "oma-memory-boundary-"));
  mkdirSync(join(parent, ".agents", "state"), { recursive: true });
  writeFileSync(
    join(parent, ".agents", "state", "provider-selection.json"),
    JSON.stringify({ semantic_memory: "honcho" }),
  );
});
afterEach(() => rmSync(parent, { recursive: true, force: true }));

it.each(["oma-config.cue", "oma-config.yaml"])(
  "a nested project owning only %s does not inherit the parent's provider",
  (configFile) => {
    const nested = join(parent, "apps", "api");
    mkdirSync(join(nested, ".agents"), { recursive: true });
    writeFileSync(join(nested, ".agents", configFile), "");
    expect(currentMemoryAdapter(nested)).toBeUndefined();
  },
);

it("a directory without its own config still inherits the parent's provider", () => {
  const nested = join(parent, "apps", "web");
  mkdirSync(nested, { recursive: true });
  expect(currentMemoryAdapter(nested)).toBeDefined();
});
