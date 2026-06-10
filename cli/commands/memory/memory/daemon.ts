import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import {
  DEFAULT_AGENTMEMORY_PORT,
  parsePositivePort,
} from "../../../platform/agentmemory-service.js";
import {
  createAgentMemoryProvider,
  resolveAgentMemoryEndpoint,
} from "../../../state/memory-provider.js";
import type { MemoryDaemonResult } from "../../../types/memory.js";
import {
  agentMemoryConfigDir,
  agentMemoryPidPath,
  writeEndpointConfig,
} from "./endpoint-config.js";

function readOwnedPid(homeDir: string): number | undefined {
  const pidPath = agentMemoryPidPath(homeDir);
  if (!existsSync(pidPath)) return undefined;
  const pid = Number(readFileSync(pidPath, "utf-8").trim());
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  return pid;
}

function isProcessRunning(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeOwnedPid(homeDir: string, pid: number): void {
  const pidPath = agentMemoryPidPath(homeDir);
  mkdirSync(dirname(pidPath), { recursive: true, mode: 0o700 });
  writeFileSync(pidPath, `${pid}\n`, { encoding: "utf-8", mode: 0o600 });
}

async function daemonStatus(args: {
  homeDir: string;
  env?: NodeJS.ProcessEnv;
  action?: MemoryDaemonResult["action"];
  dryRun?: boolean;
  message?: string;
}): Promise<MemoryDaemonResult> {
  const ownedPid = readOwnedPid(args.homeDir);
  const provider = createAgentMemoryProvider({
    env: args.env,
    homeDir: args.homeDir,
  });
  const status = await provider.status();
  return {
    action: args.action ?? "status",
    homeDir: args.homeDir,
    pidPath: agentMemoryPidPath(args.homeDir),
    ownedPid,
    ownedProcessRunning: isProcessRunning(ownedPid),
    endpoint: resolveAgentMemoryEndpoint({
      env: args.env,
      homeDir: args.homeDir,
    }),
    status,
    dryRun: args.dryRun === true,
    message: args.message,
  };
}

export async function controlAgentMemoryDaemon(args: {
  action: "status" | "start" | "stop" | "restart";
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  bin?: string;
  port?: number | string;
  dryRun?: boolean;
}): Promise<MemoryDaemonResult> {
  const homeDir = args.homeDir ?? homedir();
  const env = args.env ?? process.env;
  const bin = args.bin ?? env.AGENTMEMORY_BIN ?? "agentmemory";
  const port = parsePositivePort(args.port) ?? DEFAULT_AGENTMEMORY_PORT;

  if (args.action === "status") {
    return daemonStatus({
      homeDir,
      env,
      action: "status",
      dryRun: args.dryRun,
    });
  }

  if (args.action === "stop" || args.action === "restart") {
    const ownedPid = readOwnedPid(homeDir);
    let stoppedPid: number | undefined;
    let attemptedFallbackStop = false;
    let fallbackStopCode: number | null | undefined;

    if (!args.dryRun) {
      // `agentmemory stop` shuts down the iii engine, which owns the REST port
      // and the on-disk store and runs in its OWN process group — signalling
      // only the recorded wrapper pid would orphan it (accumulating stale
      // engines that keep the port and write to ./data). Always invoke it, then
      // also reap the wrapper launcher we recorded.
      attemptedFallbackStop = true;
      const result = spawnSync(bin, ["stop"], {
        env,
        timeout: 10000,
        encoding: "utf-8",
      });
      fallbackStopCode = result.status;

      if (ownedPid && isProcessRunning(ownedPid)) {
        try {
          process.kill(ownedPid, "SIGTERM");
        } catch {
          // wrapper already exited
        }
        stoppedPid = ownedPid;
      }
    }

    if (args.action === "stop") {
      return {
        ...(await daemonStatus({
          homeDir,
          env,
          action: "stop",
          dryRun: args.dryRun,
        })),
        stoppedPid,
        attemptedFallbackStop,
        fallbackStopCode,
      };
    }
  }

  if (args.action === "start" || args.action === "restart") {
    if (args.dryRun) {
      return daemonStatus({
        homeDir,
        env,
        action: args.action,
        dryRun: true,
        message: `${bin} would be started on port ${port}`,
      });
    }

    // Race guard (start only): if a healthy daemon already serves the port,
    // reuse it instead of spawning a competitor — overlapping iii engines fight
    // over port 3111 and can leave a half-initialised engine answering 404.
    if (args.action === "start") {
      const existing = await daemonStatus({ homeDir, env, action: "start" });
      if (existing.status.reachable) {
        return {
          ...existing,
          message: `AgentMemory already running on ${existing.endpoint ?? `port ${port}`}; reusing`,
        };
      }
      // Not reachable but a stale engine may still hold the port; clear it so
      // the fresh engine can bind cleanly.
      spawnSync(bin, ["stop"], { env, timeout: 10000, encoding: "utf-8" });
    }

    mkdirSync(agentMemoryConfigDir(homeDir), { recursive: true, mode: 0o700 });
    writeEndpointConfig(homeDir, {
      port,
      source: "oma",
      updatedAt: new Date().toISOString(),
    });

    const child = spawn(bin, [], {
      detached: true,
      // AgentMemory's iii-engine writes its store to a cwd-relative `./data/`.
      // Pin the daemon's cwd to the config home so it lands in
      // ~/.agentmemory/data instead of polluting the project it was started in.
      cwd: agentMemoryConfigDir(homeDir),
      env: { ...env, III_REST_PORT: String(port) },
      stdio: "ignore",
    });

    const startedPid = await new Promise<number>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      child.once("error", (error) => {
        settle(() => reject(error));
      });
      child.once("exit", (code) => {
        settle(() =>
          reject(
            new Error(`agentmemory exited during startup with code ${code}`),
          ),
        );
      });
      setTimeout(() => {
        settle(() => resolve(child.pid ?? 0));
      }, 250);
    });

    if (startedPid > 0) {
      child.unref();
      writeOwnedPid(homeDir, startedPid);
    }

    return {
      ...(await daemonStatus({
        homeDir,
        env,
        action: args.action,
        dryRun: false,
      })),
      startedPid,
    };
  }

  return daemonStatus({
    homeDir,
    env,
    action: args.action,
    dryRun: args.dryRun,
  });
}
