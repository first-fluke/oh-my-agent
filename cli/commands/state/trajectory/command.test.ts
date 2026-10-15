import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockStartDashboard = vi.hoisted(() => vi.fn());
const mockOpenUrl = vi.hoisted(() => vi.fn());
const mockResolveProjectRoot = vi.hoisted(() => vi.fn());

vi.mock("../../../dashboard.js", () => ({
  startDashboard: mockStartDashboard,
}));
vi.mock("../../../utils/open-url.js", () => ({ openUrl: mockOpenUrl }));
vi.mock("../../../utils/fs-utils.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../utils/fs-utils.js")>()),
  resolveProjectRoot: mockResolveProjectRoot,
}));

import { registerTrajectory } from "./command.js";

/** A dashboard handle whose server finishes binding only when the test says so. */
function deferredDashboard(route: string) {
  let resolveReady: () => void = () => undefined;
  let rejectReady: (err: Error) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const handle = {
    url: `http://127.0.0.1:0${route}`,
    ready,
    close: vi.fn(async () => undefined),
  };
  return {
    handle,
    listen(port: number) {
      handle.url = `http://127.0.0.1:${port}${route}`;
      resolveReady();
    },
    fail(err: Error) {
      rejectReady(err);
    },
  };
}

async function runOpen(sid: string): Promise<void> {
  const program = new Command();
  program.exitOverride();
  registerTrajectory(program);
  await program.parseAsync(["node", "oma", "state:trajectory", sid, "--open"]);
}

describe("state:trajectory --open", () => {
  let projectDir = "";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-trajectory-open-"));
    mockResolveProjectRoot.mockReturnValue(projectDir);
    mockStartDashboard.mockReset();
    mockOpenUrl.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.exitCode = undefined;
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("opens the trajectory viewer only after the dashboard is listening", async () => {
    const route = "/trajectory?sid=oma-main";
    const dashboard = deferredDashboard(route);
    mockStartDashboard.mockReturnValue(dashboard.handle);

    await runOpen("oma-main");
    expect(mockStartDashboard).toHaveBeenCalledWith({ route, projectDir });

    // A slow bind: well past the old 500 ms guess, the server is not up yet.
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockOpenUrl).not.toHaveBeenCalled();

    dashboard.listen(9847);
    await vi.advanceTimersByTimeAsync(0);
    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
    expect(mockOpenUrl).toHaveBeenCalledWith(`http://127.0.0.1:9847${route}`);
  });

  it("does not open the viewer and reports the error when binding fails", async () => {
    const dashboard = deferredDashboard("/trajectory?sid=oma-main");
    mockStartDashboard.mockReturnValue(dashboard.handle);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await runOpen("oma-main");
    dashboard.fail(new Error("listen EACCES: permission denied"));
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockOpenUrl).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("listen EACCES: permission denied"),
    );
    expect(process.exitCode).toBe(1);
  });
});
