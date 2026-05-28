import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { retryObservePath } from "../../state/events.js";
import type {
  MemoryObservePayload,
  MemoryProvider,
  MemoryProviderStatus,
} from "../../types/memory.js";
import {
  controlAgentMemoryDaemon,
  drainMemoryRetryQueue,
  getAgentMemoryStatus,
  installAgentMemoryService,
  setupAgentMemory,
  uninstallAgentMemoryService,
} from "./memory.js";

function providerStub(args: {
  status?: MemoryProviderStatus;
  observe?: (payload: MemoryObservePayload) => Promise<boolean> | boolean;
}): MemoryProvider {
  return {
    name: args.status?.provider ?? "agentmemory",
    async status() {
      return (
        args.status ?? {
          provider: "agentmemory",
          reachable: true,
          endpoint: "http://127.0.0.1:1234",
        }
      );
    },
    async observe(payload) {
      return args.observe?.(payload) ?? true;
    },
  };
}

function eventLine(eventId: string, sid = "oma-test"): string {
  return JSON.stringify({
    eventId,
    ts: "2026-05-27T00:00:00.000Z",
    sid,
    kind: "decision.made",
    writerPid: 1,
  });
}

describe("memory commands", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-memory-command-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("returns injected AgentMemory provider status", async () => {
    await expect(
      getAgentMemoryStatus(
        providerStub({
          status: {
            provider: "agentmemory",
            reachable: false,
            reason: "disabled",
          },
        }),
      ),
    ).resolves.toEqual({
      provider: "agentmemory",
      reachable: false,
      reason: "disabled",
    });
  });

  it("reports an empty retry queue when no retry file exists", async () => {
    await expect(
      drainMemoryRetryQueue({
        projectDir,
        provider: providerStub({}),
      }),
    ).resolves.toMatchObject({
      retryPath: retryObservePath(projectDir),
      total: 0,
      drained: 0,
      retained: 0,
      invalid: 0,
      dryRun: false,
    });
  });

  it("sets up AgentMemory endpoint config when a port is provided", async () => {
    const result = await setupAgentMemory({
      homeDir: projectDir,
      env: { OMA_NO_AGENTMEMORY: "1" },
      port: 3222,
    });

    expect(result).toMatchObject({
      homeDir: projectDir,
      endpoint: "http://127.0.0.1:3222",
      endpointConfigured: true,
      wroteEndpoint: true,
      installRequested: false,
      startRequested: false,
    });
    expect(
      JSON.parse(readFileSync(result.endpointPath, "utf-8")),
    ).toMatchObject({
      port: 3222,
      source: "oma",
    });
  });

  it("installs AgentMemory only when setup install is requested", async () => {
    let installCount = 0;
    const serviceCommands: string[] = [];
    const result = await setupAgentMemory({
      homeDir: projectDir,
      env: { OMA_NO_AGENTMEMORY: "1" },
      platform: "darwin",
      dryRun: false,
      install: true,
      async installer() {
        installCount += 1;
        return { status: 0 };
      },
      serviceRunner(command) {
        serviceCommands.push([command.bin, ...command.args].join(" "));
        return { status: 0 };
      },
    });

    expect(installCount).toBe(1);
    expect(result).toMatchObject({
      installRequested: true,
      installExitCode: 0,
      service: {
        supported: true,
        wroteFile: true,
        activated: true,
      },
      startRequested: false,
    });
    expect(serviceCommands).toEqual(
      expect.arrayContaining([expect.stringContaining("launchctl bootstrap")]),
    );
    expect(result.service?.servicePath).toContain("LaunchAgents");
    const serviceFile = readFileSync(
      result.service?.servicePath ?? "",
      "utf-8",
    );
    expect(serviceFile).toContain("III_REST_PORT");
    expect(serviceFile).toContain("/usr/bin/env");
  });

  it("skips install command in setup dry-run mode", async () => {
    let installCount = 0;
    const result = await setupAgentMemory({
      homeDir: projectDir,
      env: { OMA_NO_AGENTMEMORY: "1" },
      platform: "darwin",
      dryRun: true,
      install: true,
      async installer() {
        installCount += 1;
        return { status: 0 };
      },
    });

    expect(installCount).toBe(0);
    expect(result).toMatchObject({
      installRequested: true,
      installSkipped: true,
      dryRun: true,
      service: {
        supported: true,
        dryRun: true,
        wroteFile: false,
      },
    });
    expect(result.service?.content).toContain("agentmemory");
  });

  it("does not install the service when setup package install fails", async () => {
    await expect(
      setupAgentMemory({
        homeDir: projectDir,
        env: { OMA_NO_AGENTMEMORY: "1" },
        platform: "darwin",
        install: true,
        async installer() {
          return { status: 1, error: "install failed" };
        },
      }),
    ).rejects.toThrow("install failed");

    expect(
      existsSync(
        join(
          projectDir,
          "Library",
          "LaunchAgents",
          "dev.oma.agentmemory.plist",
        ),
      ),
    ).toBe(false);
  });

  it("previews AgentMemory daemon start without writing endpoint or pid files", async () => {
    const result = await controlAgentMemoryDaemon({
      action: "start",
      homeDir: projectDir,
      env: {},
      port: 3333,
      dryRun: true,
    });

    expect(result).toMatchObject({
      action: "start",
      dryRun: true,
      ownedProcessRunning: false,
      endpoint: null,
    });
    expect(result.message).toContain("3333");
    expect(existsSync(result.pidPath)).toBe(false);
  });

  it("previews service install files for supported platforms", () => {
    expect(
      installAgentMemoryService({
        homeDir: projectDir,
        platform: "darwin",
        dryRun: true,
        port: 3444,
      }),
    ).toMatchObject({
      action: "install",
      platform: "darwin",
      supported: true,
      dryRun: true,
      wroteFile: false,
      content: expect.stringContaining("3444"),
      activated: false,
      commands: expect.arrayContaining([
        expect.stringContaining("launchctl bootstrap"),
      ]),
    });
  });

  it("uninstalls service files for supported platforms", () => {
    const service = installAgentMemoryService({
      homeDir: projectDir,
      platform: "darwin",
      runner() {
        return { status: 0 };
      },
    });
    expect(existsSync(service.servicePath ?? "")).toBe(true);

    const commands: string[] = [];
    const result = uninstallAgentMemoryService({
      homeDir: projectDir,
      platform: "darwin",
      runner(command) {
        commands.push([command.bin, ...command.args].join(" "));
        return { status: 0 };
      },
    });

    expect(result).toMatchObject({
      action: "uninstall",
      supported: true,
      removedFile: true,
    });
    expect(commands).toEqual(
      expect.arrayContaining([expect.stringContaining("launchctl disable")]),
    );
    expect(existsSync(service.servicePath ?? "")).toBe(false);
  });

  it("drains successful retry events and retains failed or invalid lines", async () => {
    const retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    writeFileSync(
      retryPath,
      `${eventLine("ok", "sid-ok")}\n${eventLine("fail", "sid-fail")}\nnot-json\n`,
      "utf-8",
    );

    const observed: MemoryObservePayload[] = [];
    const result = await drainMemoryRetryQueue({
      projectDir,
      provider: providerStub({
        observe(payload) {
          observed.push(payload);
          return payload.sessionId === "sid-ok";
        },
      }),
    });

    expect(result).toMatchObject({
      total: 3,
      drained: 1,
      retained: 2,
      invalid: 1,
      dryRun: false,
    });
    expect(observed.map((payload) => payload.sessionId)).toEqual([
      "sid-ok",
      "sid-fail",
    ]);
    expect(readFileSync(retryPath, "utf-8").trim().split("\n")).toEqual([
      eventLine("fail", "sid-fail"),
      "not-json",
    ]);
  });

  it("leaves retry file unchanged in dry-run mode", async () => {
    const retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    const content = `${eventLine("dry-run")}\n`;
    writeFileSync(retryPath, content, "utf-8");

    const result = await drainMemoryRetryQueue({
      projectDir,
      provider: providerStub({}),
      dryRun: true,
    });

    expect(result).toMatchObject({
      total: 1,
      drained: 0,
      retained: 1,
      invalid: 0,
      dryRun: true,
    });
    expect(existsSync(retryPath)).toBe(true);
    expect(readFileSync(retryPath, "utf-8")).toBe(content);
  });
});
