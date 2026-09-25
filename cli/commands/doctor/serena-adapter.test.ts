import { beforeEach, expect, it, vi } from "vitest";
import { ensureSerenaAdapter } from "../../io/serena-adapter.js";
import { readRegistry } from "../../io/serena-daemon.js";
import {
  projectUsesDart,
  serenaContextHasDartTool,
  serenaRuntimeRevision,
} from "../../io/serena-managed-runtime.js";
import { collectSerenaAdapterCheck } from "./serena-adapter.js";

vi.mock("../../io/serena-adapter.js", () => ({ ensureSerenaAdapter: vi.fn() }));
vi.mock("../../io/serena-daemon.js", () => ({
  readRegistry: vi.fn(),
  daemonKey: (root: string, context: string) => `${root}::${context}`,
}));
vi.mock("../../io/serena-managed-runtime.js", () => ({
  projectUsesDart: vi.fn(),
  serenaContextHasDartTool: vi.fn(),
  serenaRuntimeRevision: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(projectUsesDart).mockReturnValue(true);
  vi.mocked(serenaContextHasDartTool).mockReturnValue(true);
  vi.mocked(ensureSerenaAdapter).mockReturnValue({
    status: "ready",
    revision: "v1",
  });
  vi.mocked(serenaRuntimeRevision).mockReturnValue("v1");
  vi.mocked(readRegistry).mockReturnValue({});
});
it("does not probe or repair an adapter for non-Dart projects", () => {
  vi.mocked(projectUsesDart).mockReturnValue(false);
  expect(collectSerenaAdapterCheck("/repo").applicable).toBe(false);
  expect(ensureSerenaAdapter).not.toHaveBeenCalled();
});
it("reports lost installation and context without repairing either", () => {
  vi.mocked(ensureSerenaAdapter).mockReturnValue({ status: "missing" });
  vi.mocked(serenaContextHasDartTool).mockReturnValue(false);
  const result = collectSerenaAdapterCheck("/repo");
  expect(result.issues).toHaveLength(2);
  expect(ensureSerenaAdapter).toHaveBeenCalledExactlyOnceWith(true);
});
it("reports pending runtime revision on existing daemon", () => {
  vi.mocked(readRegistry).mockReturnValue({
    "/repo::oma": {
      root: "/repo",
      context: "oma",
      port: 12341,
      pid: 42,
      startedAt: "now",
      runtimeRevision: "old",
    },
  });
  expect(collectSerenaAdapterCheck("/repo").pendingRestart).toBe(true);
  vi.mocked(serenaRuntimeRevision).mockReturnValue("old");
  expect(collectSerenaAdapterCheck("/repo").issues).toEqual([]);
});
