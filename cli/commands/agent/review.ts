import { execSync, spawn as spawnProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import {
  ownedProcessSpawnOptions,
  stopOwnedProcess,
  stopUnidentifiedOwnedChild,
} from "../../io/owned-process.js";
import { loadUserConfig } from "../../io/runtime-dispatch/config-loader.js";
import { type Invocation, planDispatch } from "../../io/runtime-dispatch.js";
import {
  type ExecutionOptions,
  ExecutionStoppedError,
} from "../../io/session-execution.js";
import {
  forgetSubagentProcess,
  recordSubagentProcess,
  type SubagentProcessRecord,
} from "../../io/subagent-process.js";
import {
  resolveVendor,
  type VendorConfig,
} from "../../platform/agent-config.js";
import {
  probeFreeProvider,
  resolveFreeProvider,
} from "../../utils/free-provider.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { beginSessionExecution, resolveSessionId } from "./common.js";

const REVIEW_FALLBACK_VENDOR = "codex";
const REVIEW_SUPPORTED_VENDORS = ["codex", "claude", "qwen", "grok"];

function buildReviewDiffPrompt(
  prompt: string,
  uncommitted: boolean,
  cwd: string,
  deadline?: number,
): string {
  if (uncommitted) {
    return `Review the uncommitted changes (git diff) in this repository. ${prompt}`;
  }

  try {
    const diff = execSync("git --no-pager diff --no-ext-diff HEAD~1", {
      cwd,
      encoding: "utf-8",
      ...(deadline === undefined
        ? {}
        : {
            timeout: Math.max(1, deadline - Date.now()),
            killSignal: "SIGKILL",
          }),
    }).trim();
    if (!diff) return `No committed changes found. ${prompt}`;
    return `Review the following committed diff:\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n${prompt}`;
  } catch {
    return `Review the latest committed changes. ${prompt}`;
  }
}

interface ReviewArgsRequest {
  vendor: string;
  vendorConfig: VendorConfig;
  prompt: string;
  uncommitted: boolean;
  cwd: string;
  deadline?: number;
}

function buildReviewArgs({
  vendor,
  vendorConfig,
  prompt,
  uncommitted,
  cwd,
  deadline,
}: ReviewArgsRequest): string[] {
  const command = vendorConfig.command || vendor;

  if (vendor === "codex") {
    return uncommitted
      ? [command, "review", "--uncommitted"]
      : [command, "review"];
  }

  const reviewPrompt = buildReviewDiffPrompt(
    prompt,
    uncommitted,
    cwd,
    deadline,
  );
  const promptFlag = vendorConfig.prompt_flag || "-p";
  const args = [command, promptFlag, reviewPrompt];

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      qwen: "--yolo",
    };
    const fallback = defaultAutoApprove[vendor];
    if (fallback) args.push(fallback);
  }

  if (vendor === "claude") {
    args.push("--output-format", "text");
  }

  return args;
}

export async function reviewAgent(
  options: ExecutionOptions & {
    prompt?: string;
    model?: string;
    workspace?: string;
    uncommitted?: boolean;
    session?: string;
  },
) {
  const sessionId = options.session ?? resolveSessionId();
  const root = resolveProjectRoot(process.cwd());
  const execution = beginSessionExecution(sessionId, root, options);
  let launchedChild: ReturnType<typeof spawnProcess> | undefined;
  let launchedRecord: SubagentProcessRecord | undefined;
  let emergencyClose: (() => void) | undefined;
  try {
    execution.assertActive();
    const prompt =
      options.prompt ||
      "Review for bugs, security vulnerabilities, performance issues, and code quality. Report findings with severity levels.";
    const agentId = "review";
    const workspace = options.workspace || ".";
    const resolvedWorkspace = path.resolve(workspace);

    const { vendor: resolvedVendor, config } = resolveVendor(
      agentId,
      options.model,
    );
    const vendor = REVIEW_SUPPORTED_VENDORS.includes(resolvedVendor)
      ? resolvedVendor
      : REVIEW_FALLBACK_VENDOR;
    if (vendor !== resolvedVendor) {
      console.log(
        color.yellow(
          `[${agentId}] "${resolvedVendor}" has no review mode, falling back to ${vendor}`,
        ),
      );
    }

    const vendorConfig = config?.vendors?.[vendor] || {};
    const uncommitted = options.uncommitted ?? true;
    const effectiveConfig = loadUserConfig(process.cwd());
    let invocation: Invocation;
    if (effectiveConfig.model_preset === "free") {
      await execution.wait(
        probeFreeProvider(
          resolveFreeProvider(effectiveConfig),
          process.env,
          execution.signal,
        ),
      );
      invocation = planDispatch(
        "qa",
        vendor,
        vendorConfig,
        vendorConfig.prompt_flag ?? "-p",
        buildReviewDiffPrompt(
          prompt,
          uncommitted,
          resolvedWorkspace,
          execution.deadline,
        ),
        process.env,
        { workspace: resolvedWorkspace, readOnly: true },
      ).invocation;
    } else {
      const reviewArgs = buildReviewArgs({
        vendor,
        vendorConfig,
        prompt,
        uncommitted,
        cwd: resolvedWorkspace,
        deadline: execution.deadline,
      });
      invocation = {
        command: reviewArgs[0] ?? vendor,
        args: reviewArgs.slice(1),
        env: process.env,
      };
    }
    const { command, args, env } = invocation;

    const runId = `review-${sessionId}-${randomUUID()}`;
    const logFile = path.join(tmpdir(), `${runId}.log`);
    const pidFile = path.join(tmpdir(), `${runId}.pid`);

    console.log(color.dim(`  Session: ${sessionId}`));
    console.log(color.blue(`[${agentId}] Starting review...`));
    console.log(color.dim(`  Vendor: ${vendor}`));
    console.log(
      color.dim(`  Command: ${command} ${args.slice(0, 2).join(" ")}...`),
    );

    const logStream = fs.openSync(logFile, "w", 0o600);
    execution.assertActive();
    const child = spawnProcess(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, logStream],
      ...ownedProcessSpawnOptions(),
      env: execution.childEnv(env),
    });
    launchedChild = child;
    emergencyClose = () => fs.closeSync(logStream);

    if (!child.pid) {
      console.error(color.red(`[${agentId}] Failed to spawn process`));
      process.exit(1);
    }

    fs.writeFileSync(pidFile, child.pid.toString());
    const owned = recordSubagentProcess(pidFile, child.pid, root, {
      runId,
      sessionId,
      generatedPaths: [logFile],
      isolatedProcessGroup: process.platform !== "win32",
    });
    launchedRecord = owned;
    execution.recordResources([
      { kind: "process", id: String(child.pid) },
      { kind: "path", id: logFile },
    ]);
    console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

    const cleanup = (confirmedStopped: boolean) => {
      execution.dispose();
      fs.closeSync(logStream);
      try {
        if (confirmedStopped) {
          if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
          forgetSubagentProcess(pidFile);
        }
      } catch {
        // ignore
      }
    };

    let terminating = false;
    const cleanAndExit = async (error: ExecutionStoppedError) => {
      if (terminating) return;
      terminating = true;
      const stopped = owned
        ? await stopOwnedProcess(owned)
        : await stopUnidentifiedOwnedChild(child);
      if (!stopped?.stopped)
        console.error(
          `[review] Process termination unconfirmed; retained ${pidFile}`,
        );
      fs.writeFileSync(
        path.join(tmpdir(), `review-${sessionId}.status`),
        `${error.reason}\n`,
      );
      unregisterStop();
      cleanup(stopped?.stopped ?? false);
      process.exit(error.exitCode);
    };

    const unregisterStop = execution.onStop((error) => {
      void cleanAndExit(error);
    });

    (child as unknown as NodeJS.EventEmitter).on(
      "exit",
      async (code: number | null, signal?: NodeJS.Signals) => {
        if (terminating) return;
        try {
          execution.assertActive();
        } catch (error) {
          if (error instanceof ExecutionStoppedError) {
            await cleanAndExit(error);
            return;
          }
          throw error;
        }
        const stopped = owned
          ? await stopOwnedProcess(owned)
          : await stopUnidentifiedOwnedChild(child);
        if (terminating) return;
        if (!stopped.stopped)
          console.warn(
            `[review] Process tree cleanup unverified; retained ${pidFile}`,
          );
        unregisterStop();
        if (fs.existsSync(logFile)) {
          const log = fs.readFileSync(logFile, "utf-8").trim();
          if (log) {
            console.log("");
            console.log(log);
          }
        }
        console.log(
          code === 0
            ? color.green(`[${agentId}] Done`)
            : color.red(`[${agentId}] Exited with code ${code}`),
        );
        cleanup(stopped?.stopped ?? false);
        process.exit(
          code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1),
        );
      },
    );
  } catch (error) {
    if (launchedChild) {
      if (launchedRecord) await stopOwnedProcess(launchedRecord);
      else await stopUnidentifiedOwnedChild(launchedChild);
      emergencyClose?.();
    }
    execution.dispose();
    if (error instanceof ExecutionStoppedError)
      process.exitCode = error.exitCode;
    throw error;
  }
}
