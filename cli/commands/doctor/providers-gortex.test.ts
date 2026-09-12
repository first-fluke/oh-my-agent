import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const probe = vi.hoisted(() => ({
  checkCLI: vi.fn(async () => ({
    name: "gortex",
    installed: true,
    version: "gortex v0.64.1",
    installCmd: "Install Gortex separately",
  })),
}));

const gortexState = vi.hoisted(() => ({
  isGortexTracked: vi.fn((_root: string): boolean | null => true),
}));

vi.mock("./environment-checks.js", () => ({ checkCLI: probe.checkCLI }));
vi.mock("../../io/gortex.js", () => ({
  isGortexTracked: gortexState.isGortexTracked,
}));

import { collectProviderCheck } from "./providers.js";

let root: string | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-doctor-gortex-"));
  mkdirSync(join(root, ".agents"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers:\n  code_intelligence: gortex\n",
  );
});

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
  vi.clearAllMocks();
});

function run() {
  return collectProviderCheck(root as string, {
    provider: "agentmemory",
    reachable: true,
  });
}

it("probes Gortex with its version subcommand", async () => {
  const report = await run();

  expect(probe.checkCLI).toHaveBeenCalledWith(
    "gortex",
    "gortex",
    expect.stringContaining("Install Gortex separately"),
    ["version"],
  );
  expect(report.codeIntelligence.binaryAvailable).toBe(true);
});

it("reports a tracked project without issues", async () => {
  const report = await run();

  expect(gortexState.isGortexTracked).toHaveBeenCalledWith(root);
  expect(report.codeIntelligence.tracked).toBe(true);
  expect(report.issues).toEqual([]);
});

it("flags an untracked project with `oma update` as the fix", async () => {
  gortexState.isGortexTracked.mockReturnValueOnce(false);

  const report = await run();

  expect(report.codeIntelligence.tracked).toBe(false);
  expect(report.issues).toEqual([
    expect.stringMatching(/does not track this project.*oma update/),
  ]);
});

it("omits tracking (no issue) when the tracked set cannot be read", async () => {
  gortexState.isGortexTracked.mockReturnValueOnce(null);

  const report = await run();

  expect(report.codeIntelligence.tracked).toBeUndefined();
  expect(report.issues).toEqual([]);
});

it("does not probe tracking when the binary is missing", async () => {
  probe.checkCLI.mockResolvedValueOnce({
    name: "gortex",
    installed: false,
    version: undefined as unknown as string,
    installCmd: "Install Gortex separately",
  });

  const report = await run();

  expect(gortexState.isGortexTracked).not.toHaveBeenCalled();
  expect(report.codeIntelligence.tracked).toBeUndefined();
  expect(report.issues).toEqual([
    expect.stringContaining("Gortex binary is unavailable"),
  ]);
});
