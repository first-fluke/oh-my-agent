import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerSearchProviders, searchProviderReport } from "./providers.js";

let root: string;
const originalExitCode = process.exitCode;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-search-providers-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
});
afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = originalExitCode;
  rmSync(root, { recursive: true, force: true });
});

it("reports only shipped providers and does not claim a native search tool is connected", () => {
  const report = searchProviderReport(root);
  expect(report.selected.docs.provider).toBe("context7");
  expect(report.selected.web).toMatchObject({
    provider: "native",
    status: "runtime-managed",
    reachability: "not-probed",
  });
  expect(report.providers.map((p) => p.id)).toEqual([
    "native",
    "context7",
    "brave",
    "exa",
  ]);
  expect(
    report.providers
      .filter((p) => !["brave", "exa"].includes(p.id))
      .every((p) => !p.cliAdapter),
  ).toBe(true);
});

it("preserves unregistered selections in diagnostics rather than silently selecting native", () => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers:\n  web: you\n",
  );
  expect(searchProviderReport(root).selected.web).toMatchObject({
    provider: "you",
    status: "unregistered",
  });
});

it("exposes registration failures through the CLI JSON and exit status", async () => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers:\n  web: you\n",
  );
  vi.spyOn(process, "cwd").mockReturnValue(root);
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const command = new Command();
  registerSearchProviders(command);
  await command.parseAsync(["node", "search", "providers", "--json"]);
  expect(
    JSON.parse(String(output.mock.calls[0]?.[0])).selected.web,
  ).toMatchObject({ provider: "you", status: "unregistered" });
  expect(process.exitCode).toBe(1);
});

it("rejects malformed provider IDs", () => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers:\n  web: ../plugin\n",
  );
  expect(() => searchProviderReport(root)).toThrow();
});
