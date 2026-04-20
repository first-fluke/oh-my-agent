import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { registerSignalCleanup } from "../../lib/process-signals.js";
import { planDispatch } from "../../lib/runtime-dispatch.js";
import { detectWorkspace } from "../../lib/workspaces.js";
import {
  loadExecutionProtocol,
  resolvePromptContent,
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";
import { isProcessRunning } from "./common.js";

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
) {
  const effectiveWorkspace =
    workspace === "." ? detectWorkspace(agentId) : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const logFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.pid`);

  const rawPromptContent = resolvePromptContent(prompt);
  const { vendor, config } = resolveVendor(agentId, vendorOverride);
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  const promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  const vendorConfig = config?.vendors?.[vendor] || {};
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  const dispatch = planDispatch(
    agentId,
    vendor,
    vendorConfig,
    promptFlag,
    promptContent,
  );
  const { command, args, env } = dispatch.invocation;
  console.log(
    color.dim(
      `  Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor}, ${dispatch.reason})`,
    ),
  );

  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream],
    detached: false,
    env,
  });

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch {
      // ignore
    }
  };

  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    unregisterSignalCleanup();
    cleanup();
    process.exit();
  };

  const unregisterSignalCleanup = registerSignalCleanup(
    cleanAndExit,
    cleanAndExit,
  );

  (child as unknown as NodeJS.EventEmitter).on(
    "exit",
    (code: number | null) => {
      unregisterSignalCleanup();
      console.log(color.blue(`[${agentId}] Exited with code ${code}`));
      if (code !== 0 && fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, "utf-8").trim();
        if (log) {
          console.log(color.red(`[${agentId}] Log output:`));
          console.log(log);
        }
      }
      cleanup();
      process.exit(code ?? 0);
    },
  );
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = path.join(
      rootPath,
      ".serena",
      "memories",
      `result-${agent}.md`,
    );
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      const match = content.match(/^## Status:\s*(\S+)/m);
      results[agent] = match?.[1] ? match[1] : "completed";
    } else if (fs.existsSync(pidFile)) {
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = Number.parseInt(pidContent, 10);
      results[agent] =
        !Number.isNaN(pid) && isProcessRunning(pid) ? "running" : "crashed";
    } else {
      results[agent] = "crashed";
    }
  }

  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}
