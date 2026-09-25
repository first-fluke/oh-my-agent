import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ensureOmaSerenaContexts } from "./serena.js";
import { ensureSerenaAdapter } from "./serena-adapter.js";
import {
  prepareSerenaRuntime,
  serenaRuntimeRevision,
} from "./serena-managed-runtime.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("./serena-adapter.js", () => ({
  DART_PROJECT_TOOL: "get_dart_project_diagnostics",
  ensureSerenaAdapter: vi.fn(),
}));
let root: string;
let sdk: string;
const ready = {
  status: "ready" as const,
  version: "1.7.0",
  revision: "adapter-v1",
  python: "/python",
};
beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "oma-runtime-")));
  sdk = join(root, "flutter/bin/cache/dart-sdk/bin/dart");
  mkdirSync(join(root, ".serena"));
  mkdirSync(join(root, "flutter/bin/cache/dart-sdk/bin"), { recursive: true });
  writeFileSync(sdk, "installed SDK");
  writeFileSync(
    join(root, ".serena/project.yml"),
    "language_servers: [dart]\n",
  );
  vi.stubEnv("SERENA_HOME", join(root, "serena-home"));
  vi.mocked(ensureSerenaAdapter).mockReturnValue(ready);
  vi.mocked(execFileSync).mockImplementation((command) =>
    command === "mise"
      ? join(root, "flutter/bin/flutter")
      : "Dart SDK version: 3.13.4 (stable)",
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  rmSync(root, { recursive: true, force: true });
});

it("repairs adapter registration after context regeneration and remains idempotent", () => {
  const first = prepareSerenaRuntime(root, true);
  expect(first.sdk).toBe(sdk);
  const context = join(root, "serena-home/contexts/oma.yml");
  expect(readFileSync(context, "utf8")).toContain(
    "- get_dart_project_diagnostics\n",
  );
  writeFileSync(context, "fixed_tools: []\n");
  expect(prepareSerenaRuntime(root, true).runtimeRevision).toBe(
    first.runtimeRevision,
  );
  expect(ensureOmaSerenaContexts().changed).toEqual([]);
});

it("tracks both adapter payload and SDK upgrades", () => {
  const first = prepareSerenaRuntime(root, true).runtimeRevision;
  expect(serenaRuntimeRevision(root, { ...ready, revision: "v2" })).not.toBe(
    first,
  );
  vi.mocked(execFileSync).mockImplementation((command) =>
    command === "mise"
      ? join(root, "flutter/bin/flutter")
      : "Dart SDK version: 3.14.0 (stable)",
  );
  expect(serenaRuntimeRevision(root, ready)).not.toBe(first);
});

it("rejects unsupported adapter for Dart without registering an unknown tool", () => {
  vi.mocked(ensureSerenaAdapter).mockReturnValue({
    status: "unsupported",
    error: "unsupported version",
  });
  expect(() => prepareSerenaRuntime(root, true)).toThrow("unsupported version");
  expect(
    readFileSync(join(root, "serena-home/contexts/oma.yml"), "utf8"),
  ).not.toContain("get_dart_project_diagnostics");
});

it("preserves an explicit SDK and refuses a nonexistent SDK", () => {
  const config = join(root, ".serena/project.yml");
  writeFileSync(
    config,
    `language_servers: [dart]\nls_specific_settings:\n  dart:\n    dart_executable: ${sdk}\n`,
  );
  expect(prepareSerenaRuntime(root, true).sdk).toBe(sdk);
  expect(readFileSync(config, "utf8")).toContain(`dart_executable: ${sdk}`);
  rmSync(sdk);
  expect(() => prepareSerenaRuntime(root, true)).toThrow();
});

it("allows discovery without a project SDK but rejects package checks", () => {
  vi.mocked(execFileSync).mockImplementation(() => {
    throw new Error("no project SDK");
  });
  expect(prepareSerenaRuntime(root).sdk).toBeUndefined();
  expect(() => prepareSerenaRuntime(root, true)).toThrow(
    "project Dart SDK is required",
  );
  expect(readFileSync(join(root, ".serena/project.yml"), "utf8")).not.toContain(
    "dart_executable",
  );
});
