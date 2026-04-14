import { execSync, spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { resolveVendor, type VendorConfig } from "../../lib/agent-config.js";
import { registerSignalCleanup } from "../../lib/process-signals.js";
import { isProcessRunning, resolveSessionId } from "./common.js";

const REVIEW_FALLBACK_VENDOR = "codex";
const REVIEW_SUPPORTED_VENDORS = ["codex", "claude", "gemini", "qwen"];

function buildReviewDiffPrompt(
  prompt: string,
  uncommitted: boolean,
  cwd: string,
): string {
  if (uncommitted) {
    return `Review the uncommitted changes (git diff) in this repository. ${prompt}`;
  }

  try {
    const diff = execSync("git diff HEAD~1", { cwd, encoding: "utf-8" }).trim();
    if (!diff) return `No committed changes found. ${prompt}`;
    return `Review the following committed diff:\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n${prompt}`;
  } catch {
    return `Review the latest committed changes. ${prompt}`;
  }
}

function buildReviewArgs(
  vendor: string,
  vendorConfig: VendorConfig,
  prompt: string,
  uncommitted: boolean,
  cwd: string,
): string[] {
  const command = vendorConfig.command || vendor;

  if (vendor === "codex") {
    return uncommitted
      ? [command, "review", "--uncommitted"]
      : [command, "review"];
  }

  const reviewPrompt = buildReviewDiffPrompt(prompt, uncommitted, cwd);
  const promptFlag = vendorConfig.prompt_flag || "-p";
  const args = [command, promptFlag, reviewPrompt];

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
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

export async function reviewAgent(options: {
  prompt?: string;
  model?: string;
  workspace?: string;
  uncommitted?: boolean;
}) {
  const sessionId = resolveSessionId();
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
  const reviewArgs = buildReviewArgs(
    vendor,
    vendorConfig,
    prompt,
    uncommitted,
    resolvedWorkspace,
  );
  const command = reviewArgs[0] ?? vendor;
  const args = reviewArgs.slice(1);

  const logFile = path.join(tmpdir(), `review-${sessionId}.log`);
  const pidFile = path.join(tmpdir(), `review-${sessionId}.pid`);

  console.log(color.dim(`  Session: ${sessionId}`));
  console.log(color.blue(`[${agentId}] Starting review...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(
    color.dim(`  Command: ${command} ${args.slice(0, 2).join(" ")}...`),
  );

  const logStream = fs.openSync(logFile, "w");
  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream],
    detached: false,
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
      cleanup();
      process.exit(code ?? 0);
    },
  );
}
