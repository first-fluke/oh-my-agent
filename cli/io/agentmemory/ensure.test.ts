import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MemoryDaemonResult,
  MemoryProviderStatus,
  MemoryServiceResult,
} from "../../types/memory.js";
import { acquireOwnedDirectoryLock } from "../../utils/owned-directory-lock.js";
import {
  agentMemoryEndpointPath,
  writeEndpointConfig,
} from "./endpoint-config.js";
import { ensureAgentMemory } from "./ensure.js";

type Dependencies = NonNullable<Parameters<typeof ensureAgentMemory>[1]>;

function dependencies() {
  let time = 0;
  const unreachable: MemoryProviderStatus = {
    provider: "agentmemory",
    reachable: false,
    reason: "not running",
  };
  const ready: MemoryProviderStatus = {
    provider: "agentmemory",
    reachable: true,
  };
  const service: MemoryServiceResult = {
    action: "install",
    platform: "darwin",
    supported: true,
    dryRun: false,
    wroteFile: true,
    removedFile: false,
    activated: true,
    commands: [],
    message: "installed",
  };
  const daemon: MemoryDaemonResult = {
    action: "start",
    homeDir: "/unused",
    pidPath: "/unused/pid",
    ownedProcessRunning: true,
    endpoint: null,
    status: unreachable,
    dryRun: false,
    startedPid: 123,
  };
  return {
    ready,
    unreachable,
    service,
    daemon,
    status: vi
      .fn<NonNullable<Dependencies["status"]>>()
      .mockResolvedValueOnce(unreachable)
      .mockResolvedValue(ready),
    findBinary: vi
      .fn<NonNullable<Dependencies["findBinary"]>>()
      .mockReturnValue("/test/bin/agentmemory"),
    installPackage: vi
      .fn<NonNullable<Dependencies["installPackage"]>>()
      .mockResolvedValue({ status: 0 }),
    servicePresence: vi
      .fn<NonNullable<Dependencies["servicePresence"]>>()
      .mockReturnValue({
        platform: "darwin",
        supported: true,
        installed: false,
      }),
    installService: vi
      .fn<NonNullable<Dependencies["installService"]>>()
      .mockReturnValue(service),
    startDaemon: vi
      .fn<NonNullable<Dependencies["startDaemon"]>>()
      .mockResolvedValue(daemon),
    now: () => time,
    sleep: vi.fn(async (milliseconds: number) => {
      time += milliseconds;
    }),
  };
}

describe("ensureAgentMemory", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-memory-ensure-"));
  });
  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("respects explicit disable without probing or writing", async () => {
    const deps = dependencies();
    expect(
      await ensureAgentMemory(
        { homeDir, env: { OMA_NO_AGENTMEMORY: "1" } },
        deps,
      ),
    ).toEqual({
      state: "disabled",
      installed: false,
      started: false,
      reused: false,
    });
    expect(deps.status).not.toHaveBeenCalled();
    expect(deps.installPackage).not.toHaveBeenCalled();
    expect(existsSync(agentMemoryEndpointPath(homeDir))).toBe(false);
  });

  it("installs and activates the default service, then verifies readiness", async () => {
    const deps = dependencies();
    deps.findBinary.mockReturnValueOnce(undefined);
    expect(
      await ensureAgentMemory({ homeDir, env: {}, platform: "darwin" }, deps),
    ).toEqual({
      state: "ready",
      endpoint: "http://127.0.0.1:3111",
      installed: true,
      started: true,
      reused: false,
    });
    expect(deps.installPackage).toHaveBeenCalledOnce();
    expect(deps.installService).toHaveBeenCalledWith({
      homeDir,
      platform: "darwin",
      port: 3111,
      executable: "/test/bin/agentmemory",
      runtimePath: dirname(process.execPath),
    });
    // Service activation already launches the process; avoid a competing daemon.
    expect(deps.startDaemon).not.toHaveBeenCalled();
    expect(
      JSON.parse(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")),
    ).toMatchObject({ port: 3111, source: "oma" });
    expect(deps.status).toHaveBeenLastCalledWith(
      expect.objectContaining({
        env: { AGENTMEMORY_URL: "http://127.0.0.1:3111" },
      }),
    );
  });

  it.each([{ AGENTMEMORY_BIN: "./bin/agentmemory" }, { PATH: "./bin" }])(
    "pins an absolute service executable for relative command lookup: %j",
    async (env) => {
      const projectDir = join(homeDir, "project");
      const binary = join(projectDir, "bin", "agentmemory");
      mkdirSync(join(projectDir, "bin"), { recursive: true });
      writeFileSync(binary, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
      chmodSync(binary, 0o700);
      const mocks = dependencies();
      const deps: Dependencies = { ...mocks };
      delete deps.findBinary;
      const cwd = vi.spyOn(process, "cwd").mockReturnValue(projectDir);
      try {
        expect(
          await ensureAgentMemory({ homeDir, env, platform: "darwin" }, deps),
        ).toMatchObject({ state: "ready", installed: false, started: true });
        expect(mocks.installService).toHaveBeenCalledWith(
          expect.objectContaining({ executable: binary }),
        );
        expect(mocks.installPackage).not.toHaveBeenCalled();
      } finally {
        cwd.mockRestore();
      }
    },
  );

  it("reuses a healthy configured service without reinstalling or rewriting", async () => {
    writeEndpointConfig(homeDir, {
      source: "oma",
      port: 3520,
      updatedAt: "original",
    });
    const before = readFileSync(agentMemoryEndpointPath(homeDir), "utf-8");
    const deps = dependencies();
    deps.status.mockReset().mockResolvedValue(deps.ready);
    expect(await ensureAgentMemory({ homeDir, env: {} }, deps)).toMatchObject({
      state: "ready",
      endpoint: "http://127.0.0.1:3520",
      reused: true,
      installed: false,
      started: false,
    });
    expect(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")).toBe(
      before,
    );
    expect(deps.findBinary).not.toHaveBeenCalled();
    expect(deps.installService).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("configures a healthy default daemon without installing another one", async () => {
    const deps = dependencies();
    deps.status.mockReset().mockResolvedValue(deps.ready);
    expect(await ensureAgentMemory({ homeDir, env: {} }, deps)).toMatchObject({
      state: "ready",
      reused: true,
    });
    expect(
      JSON.parse(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")),
    ).toMatchObject({ port: 3111, source: "oma" });
    expect(deps.installPackage).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("starts an installed but stopped managed service and waits for fresh health", async () => {
    writeEndpointConfig(homeDir, { source: "oma", port: 3520 });
    const deps = dependencies();
    deps.servicePresence.mockReturnValue({
      platform: "darwin",
      supported: true,
      installed: true,
    });
    deps.status
      .mockReset()
      .mockResolvedValueOnce(deps.unreachable)
      .mockResolvedValueOnce(deps.unreachable)
      .mockResolvedValueOnce(deps.unreachable)
      .mockResolvedValue(deps.ready);
    expect(await ensureAgentMemory({ homeDir, env: {} }, deps)).toMatchObject({
      state: "ready",
      installed: false,
      started: true,
    });
    expect(deps.installService).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3520,
        executable: "/test/bin/agentmemory",
      }),
    );
    expect(deps.status).toHaveBeenCalledTimes(4);
    expect(deps.sleep).toHaveBeenCalledTimes(2);
    expect(deps.installPackage).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("preserves a custom endpoint and verifies it without local provisioning", async () => {
    writeEndpointConfig(homeDir, {
      source: "user",
      url: "https://memory.example/api",
    });
    const before = readFileSync(agentMemoryEndpointPath(homeDir), "utf-8");
    const deps = dependencies();
    deps.status.mockReset().mockResolvedValue(deps.ready);
    expect(await ensureAgentMemory({ homeDir, env: {} }, deps)).toMatchObject({
      state: "ready",
      endpoint: "https://memory.example/api",
      reused: true,
    });
    expect(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")).toBe(
      before,
    );
    expect(deps.findBinary).not.toHaveBeenCalled();
    expect(deps.installService).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("does not overwrite local config when an environment endpoint is selected", async () => {
    writeEndpointConfig(homeDir, { source: "oma", port: 3520 });
    const before = readFileSync(agentMemoryEndpointPath(homeDir), "utf-8");
    const deps = dependencies();
    deps.status.mockReset().mockResolvedValue(deps.ready);
    expect(
      await ensureAgentMemory(
        { homeDir, env: { AGENTMEMORY_URL: "https://remote.example" } },
        deps,
      ),
    ).toMatchObject({ endpoint: "https://remote.example", reused: true });
    expect(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")).toBe(
      before,
    );
    expect(deps.status).toHaveBeenCalledWith(
      expect.objectContaining({
        env: { AGENTMEMORY_URL: "https://remote.example" },
      }),
    );
  });

  it.each([
    { source: "user" as const, url: "https://memory.example" },
    { source: "oma" as const, url: "http://localhost:3999/custom" },
    { source: "user" as const, port: 3999 },
    { source: "agentmemory" as const, port: 3999 },
  ])(
    "leaves unavailable custom configuration untouched: %j",
    async (config) => {
      writeEndpointConfig(homeDir, config);
      const before = readFileSync(agentMemoryEndpointPath(homeDir), "utf-8");
      const deps = dependencies();
      await expect(
        ensureAgentMemory({ homeDir, env: {} }, deps),
      ).rejects.toThrow("Configured AgentMemory service is unavailable");
      expect(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")).toBe(
        before,
      );
      expect(deps.installPackage).not.toHaveBeenCalled();
      expect(deps.installService).not.toHaveBeenCalled();
      expect(deps.startDaemon).not.toHaveBeenCalled();
    },
  );

  it("retains the runtime manager PATH when provisioning a service", async () => {
    const deps = dependencies();
    const nodeDirectory = join(
      homeDir,
      "mise",
      "installs",
      "node",
      "26",
      "bin",
    );
    expect(
      await ensureAgentMemory(
        { homeDir, env: { PATH: nodeDirectory }, platform: "darwin" },
        deps,
      ),
    ).toMatchObject({ state: "ready" });
    expect(deps.installService).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: "/test/bin/agentmemory",
        runtimePath: [nodeDirectory, dirname(process.execPath)]
          .filter((entry, index, entries) => entries.indexOf(entry) === index)
          .join(":"),
      }),
    );
  });

  it("finds binaries and retains runtime PATH from Windows mixed-case Path", async () => {
    const directory = join(homeDir, "Volta tools", "bin");
    const binary = join(directory, "agentmemory.exe");
    mkdirSync(directory, { recursive: true });
    writeFileSync(binary, "test executable", { mode: 0o700 });
    chmodSync(binary, 0o700);
    const mocks = dependencies();
    const deps: Dependencies = { ...mocks };
    delete deps.findBinary;
    expect(
      await ensureAgentMemory(
        { homeDir, env: { Path: directory }, platform: "win32" },
        deps,
      ),
    ).toMatchObject({ state: "ready" });
    expect(mocks.installService).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: binary,
        runtimePath: [directory, dirname(process.execPath)]
          .filter((entry, index, entries) => entries.indexOf(entry) === index)
          .join(";"),
      }),
    );
    expect(mocks.installPackage).not.toHaveBeenCalled();
  });

  it("does not provision a local daemon for an unreachable environment endpoint", async () => {
    const deps = dependencies();
    await expect(
      ensureAgentMemory(
        { homeDir, env: { AGENTMEMORY_URL: "https://remote.example" } },
        deps,
      ),
    ).rejects.toThrow("Configured AgentMemory service is unavailable");
    expect(existsSync(agentMemoryEndpointPath(homeDir))).toBe(false);
    expect(deps.installPackage).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("does not replace an invalid existing endpoint file", async () => {
    writeEndpointConfig(homeDir, { port: 3111 });
    writeFileSync(agentMemoryEndpointPath(homeDir), "invalid json", "utf-8");
    const deps = dependencies();
    await expect(ensureAgentMemory({ homeDir, env: {} }, deps)).rejects.toThrow(
      "endpoint configuration is invalid",
    );
    expect(readFileSync(agentMemoryEndpointPath(homeDir), "utf-8")).toBe(
      "invalid json",
    );
    expect(deps.status).not.toHaveBeenCalled();
    expect(deps.installPackage).not.toHaveBeenCalled();
  });

  it("propagates package installation failure before activating a service", async () => {
    const deps = dependencies();
    deps.findBinary.mockReturnValue(undefined);
    deps.installPackage.mockResolvedValue({
      status: 1,
      error: "download failed",
    });
    await expect(ensureAgentMemory({ homeDir, env: {} }, deps)).rejects.toThrow(
      "package installation failed: download failed",
    );
    expect(deps.installService).not.toHaveBeenCalled();
    expect(deps.startDaemon).not.toHaveBeenCalled();
  });

  it("fails clearly when package installation did not make the executable available", async () => {
    const deps = dependencies();
    deps.findBinary.mockReturnValue(undefined);
    await expect(ensureAgentMemory({ homeDir, env: {} }, deps)).rejects.toThrow(
      "executable was not found",
    );
    expect(deps.installService).not.toHaveBeenCalled();
  });

  it("propagates background service activation failure", async () => {
    const deps = dependencies();
    deps.installService.mockReturnValue({
      ...deps.service,
      activated: false,
      commandError: "launchctl denied",
    });
    await expect(ensureAgentMemory({ homeDir, env: {} }, deps)).rejects.toThrow(
      "service activation failed: launchctl denied",
    );
    expect(deps.startDaemon).not.toHaveBeenCalled();
    expect(
      existsSync(join(homeDir, ".agentmemory", "oma-lifecycle.lock")),
    ).toBe(false);
  });

  it("propagates daemon startup failure", async () => {
    const deps = dependencies();
    deps.servicePresence.mockReturnValue({
      platform: "aix",
      supported: false,
      installed: false,
    });
    deps.startDaemon.mockRejectedValue(new Error("spawn failed"));
    await expect(ensureAgentMemory({ homeDir, env: {} }, deps)).rejects.toThrow(
      "startup failed: spawn failed",
    );
  });

  it("fails when health does not become ready before the deadline", async () => {
    const deps = dependencies();
    deps.status.mockReset().mockResolvedValue(deps.unreachable);
    await expect(
      ensureAgentMemory({ homeDir, env: {}, healthTimeoutMs: 25 }, deps),
    ).rejects.toThrow("did not become ready: not running");
    expect(deps.now()).toBe(25);
    expect(deps.sleep).toHaveBeenCalledOnce();
  });

  it("starts directly when the platform has no background service manager", async () => {
    const deps = dependencies();
    deps.servicePresence.mockReturnValue({
      platform: "aix",
      supported: false,
      installed: false,
    });
    expect(
      await ensureAgentMemory({ homeDir, env: {}, platform: "aix" }, deps),
    ).toMatchObject({ state: "ready", started: true });
    expect(deps.installService).not.toHaveBeenCalled();
    expect(deps.startDaemon).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "serializes HOME-shared provisioning across projects (service installed: %s)",
    async (serviceInstalled) => {
      const deps = dependencies();
      let healthy = false;
      let activated = false;
      let binaryAvailable = serviceInstalled;
      let releaseProvision!: () => void;
      let enteredProvision!: () => void;
      const gate = new Promise<void>((resolve) => {
        releaseProvision = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        enteredProvision = resolve;
      });
      deps.status.mockReset().mockImplementation(async () => {
        if (activated && !healthy) {
          await gate;
          healthy = true;
        }
        return healthy ? deps.ready : deps.unreachable;
      });
      deps.findBinary.mockImplementation(() =>
        binaryAvailable ? "/test/bin/agentmemory" : undefined,
      );
      deps.servicePresence.mockReturnValue({
        platform: "darwin",
        supported: true,
        installed: serviceInstalled,
      });
      deps.installPackage.mockImplementation(async () => {
        binaryAvailable = true;
        return { status: 0 };
      });
      deps.installService.mockImplementation(() => {
        activated = true;
        enteredProvision();
        return deps.service;
      });
      const concurrentDeps = {
        ...deps,
        now: Date.now,
        sleep: async () =>
          new Promise<void>((resolve) => setTimeout(resolve, 1)),
      };
      const first = ensureAgentMemory({ homeDir, env: {} }, concurrentDeps);
      await entered;
      const second = ensureAgentMemory({ homeDir, env: {} }, concurrentDeps);
      releaseProvision();
      const results = await Promise.all([first, second]);
      expect(results[0]).toMatchObject({
        state: "ready",
        started: true,
        reused: false,
      });
      expect(results[1]).toMatchObject({
        state: "ready",
        started: false,
        reused: true,
      });
      expect(deps.installPackage).toHaveBeenCalledTimes(
        serviceInstalled ? 0 : 1,
      );
      expect(deps.installService).toHaveBeenCalledOnce();
      expect(deps.startDaemon).not.toHaveBeenCalled();
      expect(
        existsSync(join(homeDir, ".agentmemory", "oma-lifecycle.lock")),
      ).toBe(false);
    },
  );

  it("bounds waiting for an existing lifecycle owner without starting anything", async () => {
    const lease = acquireOwnedDirectoryLock(
      join(homeDir, ".agentmemory", "oma-lifecycle.lock"),
    );
    expect(lease.ok).toBe(true);
    if (!lease.ok) return;
    const deps = dependencies();
    try {
      await expect(
        ensureAgentMemory({ homeDir, env: {}, lockTimeoutMs: 25 }, deps),
      ).rejects.toThrow(
        "Timed out waiting for the shared AgentMemory lifecycle lock",
      );
      expect(deps.now()).toBe(25);
      expect(deps.status).not.toHaveBeenCalled();
      expect(deps.installPackage).not.toHaveBeenCalled();
      expect(deps.startDaemon).not.toHaveBeenCalled();
    } finally {
      lease.release();
    }
  });
});
