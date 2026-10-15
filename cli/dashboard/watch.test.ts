import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { startDashboard } from "../dashboard.js";
import { startTerminalDashboard } from "../terminal-dashboard.js";

const { watchMock } = vi.hoisted(() => ({ watchMock: vi.fn() }));
vi.mock("chokidar", () => ({ watch: watchMock }));

describe("dashboard artifact watching", () => {
  let projectDir: string;
  let memoriesDir: string;
  let resultsDir: string;
  let watcher: EventEmitter & { close: ReturnType<typeof vi.fn> };
  let dashboard: ReturnType<typeof startDashboard> | undefined;
  let socket: WebSocket | undefined;
  let sigintListeners: ReturnType<typeof process.listeners>;
  let sigtermListeners: ReturnType<typeof process.listeners>;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-dashboard-watch-"));
    memoriesDir = join(projectDir, ".agents", "state", "memories");
    resultsDir = join(projectDir, ".agents", "results");
    vi.stubEnv("MEMORIES_DIR", "");
    watcher = Object.assign(new EventEmitter(), {
      close: vi.fn().mockResolvedValue(undefined),
    });
    watchMock.mockReset().mockReturnValue(watcher);
    sigintListeners = process.listeners("SIGINT");
    sigtermListeners = process.listeners("SIGTERM");
  });

  afterEach(async () => {
    socket?.terminate();
    socket = undefined;
    if (dashboard) await dashboard.close();
    dashboard = undefined;
    for (const listener of process.listeners("SIGINT")) {
      if (!sigintListeners.includes(listener)) process.off("SIGINT", listener);
    }
    for (const listener of process.listeners("SIGTERM")) {
      if (!sigtermListeners.includes(listener))
        process.off("SIGTERM", listener);
    }
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("serves canonical results and broadcasts their changes to web clients", async () => {
    mkdirSync(resultsDir, { recursive: true });
    const reportPath = join(resultsDir, "result-backend.md");
    writeFileSync(
      reportPath,
      "Agent: backend\n## Completed\n- Initial result verified\n",
    );
    dashboard = startDashboard({ projectDir, port: 0 });
    await dashboard.ready;

    expect(watchMock.mock.calls[0]?.[0]).toEqual([memoriesDir, resultsDir]);
    const ignored = watchMock.mock.calls[0]?.[1].ignored;
    expect(ignored(reportPath)).toBe(false);
    expect(ignored(join(resultsDir, "architecture"))).toBe(true);
    expect(ignored(join(resultsDir, "research.md"))).toBe(true);
    expect(ignored(join(memoriesDir, "progress-backend.md"))).toBe(false);

    const response = await fetch(`${dashboard.url}api/state`, {
      headers: { "X-OMA-Dashboard-Token": dashboard.token },
    });
    expect(await response.json()).toMatchObject({
      agents: [{ agent: "backend", status: "completed", task: "", turn: null }],
    });

    socket = new WebSocket(
      `${dashboard.url.replace("http", "ws")}?token=${dashboard.token}`,
    );
    const initial = await new Promise<string>((resolve, reject) => {
      socket?.once("message", (data) => resolve(String(data)));
      socket?.once("error", reject);
    });
    expect(JSON.parse(initial).data.activity[0].message).toBe(
      "Initial result verified",
    );

    const updated = new Promise<string>((resolve, reject) => {
      socket?.once("message", (data) => resolve(String(data)));
      socket?.once("error", reject);
    });
    writeFileSync(
      reportPath,
      "Agent: backend\n## Failed\n- Updated report failure\n",
    );
    watcher.emit("all", "change", reportPath);
    expect(JSON.parse(await updated)).toMatchObject({
      type: "update",
      file: "result-backend.md",
      data: { agents: [{ agent: "backend", status: "failed" }] },
    });
  });

  it("keeps a custom web memory directory as its only watch source", async () => {
    const customDir = join(projectDir, "custom-store");
    vi.stubEnv("MEMORIES_DIR", customDir);
    dashboard = startDashboard({ projectDir, port: 0 });
    await dashboard.ready;

    expect(watchMock.mock.calls[0]?.[0]).toEqual([customDir]);
    expect(dashboard.resultsDir).toBeUndefined();
    expect(existsSync(resultsDir)).toBe(false);
  });

  it("renders result changes in the terminal while retaining progress turns", async () => {
    mkdirSync(memoriesDir, { recursive: true });
    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(
      join(memoriesDir, "progress-frontend.md"),
      "Agent: frontend\nturn: 8\n## Progress\n- Frontend work continues\n",
    );
    const reportPath = join(resultsDir, "result-backend.md");
    writeFileSync(
      reportPath,
      "Agent: backend\n## Completed\n- Backend checks passed\n",
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "clear").mockImplementation(() => undefined);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const terminal = startTerminalDashboard({ projectDir });
    expect(watchMock.mock.calls[0]?.[0]).toEqual([memoriesDir, resultsDir]);
    expect(log.mock.calls.flat().join("\n")).toContain("backend");
    expect(log.mock.calls.flat().join("\n")).toContain("frontend");

    log.mockClear();
    writeFileSync(
      reportPath,
      "Agent: backend\n## Failed\n- Backend checks failed\n",
    );
    watcher.emit("all", "change", reportPath);
    expect(log.mock.calls.flat().join("\n")).toContain("failed");
    expect(log.mock.calls.flat().join("\n")).toMatch(/frontend.*running.*8/);

    process.emit("SIGINT");
    await terminal;
    expect(watcher.close).toHaveBeenCalledOnce();
  });
});
