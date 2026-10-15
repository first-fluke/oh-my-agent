import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockStartDashboard = vi.hoisted(() => vi.fn());
const mockOpenUrl = vi.hoisted(() => vi.fn());

vi.mock("../../dashboard.js", () => ({ startDashboard: mockStartDashboard }));
vi.mock("../../utils/open-url.js", () => ({ openUrl: mockOpenUrl }));

import { recap } from "./run.js";

/** A dashboard handle whose server finishes binding only when the test says so. */
function deferredDashboard() {
  let resolveReady: () => void = () => undefined;
  let rejectReady: (err: Error) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const handle = {
    url: "http://127.0.0.1:0/recap",
    ready,
    close: vi.fn(async () => undefined),
  };
  return {
    handle,
    listen(port: number) {
      handle.url = `http://127.0.0.1:${port}/recap`;
      resolveReady();
    },
    fail(err: Error) {
      rejectReady(err);
    },
  };
}

describe("recap --graph", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStartDashboard.mockReset();
    mockOpenUrl.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("opens the browser only after the dashboard is listening", async () => {
    const dashboard = deferredDashboard();
    mockStartDashboard.mockReturnValue(dashboard.handle);

    await recap(false, { graph: true });
    expect(mockStartDashboard).toHaveBeenCalledWith({ route: "/recap" });

    // A slow bind: well past the old 500 ms guess, the server is not up yet.
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockOpenUrl).not.toHaveBeenCalled();

    dashboard.listen(9847);
    await vi.advanceTimersByTimeAsync(0);
    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
    expect(mockOpenUrl).toHaveBeenCalledWith("http://127.0.0.1:9847/recap");
  });

  it("does not open the browser and reports the error when binding fails", async () => {
    const dashboard = deferredDashboard();
    mockStartDashboard.mockReturnValue(dashboard.handle);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await recap(false, { graph: true });
    dashboard.fail(new Error("listen EACCES: permission denied"));
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockOpenUrl).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("listen EACCES: permission denied"),
    );
    expect(process.exitCode).toBe(1);
  });
});
