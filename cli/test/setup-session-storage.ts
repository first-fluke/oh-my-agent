import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach } from "vitest";

// All state writers, including spawned Bun hooks, inherit an isolated home.
const root = mkdtempSync(join(tmpdir(), "oma-profile-tests-"));
let sequence = 0;
beforeEach(() => {
  const slot = String(sequence++);
  process.env.OMA_STATE_HOME = join(root, slot);
  process.env.OMA_PROFILE = "0";
  // Hook duplicate-delivery claims stay per test, never in the user's tmpdir.
  process.env.OMA_HOOK_DEDUP_DIR = join(root, "hook-dedup", slot);
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});
