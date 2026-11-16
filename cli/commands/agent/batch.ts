import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import { ALL_CLI_VENDORS } from "../../constants/vendors.js";
import type { ExecutionOptions } from "../../io/session-execution.js";
import { resolveVendor, splitArgs } from "../../platform/agent-config.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { beginSessionExecution } from "./common.js";
import { dispatchResume } from "./resume.js";

/** Placeholder replaced by the item in the prompt template and the check. */
export const ITEM_PLACEHOLDER = "{item}";

/** Vendor runs that fail in a row before the batch stops using that vendor. */
const VENDOR_FAILURE_LIMIT = 2;

/** Bytes of check output kept as feedback for the next attempt. */
const CHECK_OUTPUT_LIMIT = 4000;

export type BatchItemStatus =
  | "already-passing"
  | "fixed"
  | "failed"
  | "not-run";

export interface BatchItemResult {
  item: string;
  status: BatchItemStatus;
  /** Agent runs that reached the check; vendor failures are not counted. */
  attempts: number;
  /** Vendor of the last agent run, when one ran. */
  vendor?: string;
  detail?: string;
}

export interface BatchReport {
  ok: boolean;
  total: number;
  counts: Record<BatchItemStatus, number>;
  /** Why dispatch stopped before every item was handled. */
  stopped?: string;
  items: BatchItemResult[];
}

export interface CheckResult {
  ok: boolean;
  output: string;
  /** The check command itself could not run; nothing is known about the item. */
  unavailable?: boolean;
}

export interface BatchDispatch {
  item: string;
  index: number;
  attempt: number;
  /** Undefined selects the configured vendor for the agent. */
  vendor: string | undefined;
  /** Output of the failing check that this run must make pass. */
  feedback: string;
}

export interface BatchDeps {
  check(item: string): Promise<CheckResult>;
  /** Runs one agent session and resolves with the exit code of `agent spawn`. */
  dispatch(request: BatchDispatch): Promise<number | null>;
  log?(line: string): void;
}

export interface BatchRunOptions {
  concurrency: number;
  maxAttempts: number;
  /** Primary vendor first, then the fallback chain. */
  vendors: Array<string | undefined>;
}

/**
 * `agent spawn` exits 0 for a completed run and 3 when the vendor CLI exited
 * cleanly but the result is incomplete. Any other code is the vendor CLI's own
 * failure (quota, authentication, crash): the item was not attempted.
 */
function isVendorFailure(code: number | null): boolean {
  return code !== null && code !== 0 && code !== 3 && !isStopCode(code);
}

/** Cancellation and deadline exits; the batch must stop, not retry. */
function isStopCode(code: number | null): boolean {
  return code === null || code === 124 || code === 130 || code === 143;
}

async function mapLimit<T>(
  count: number,
  limit: number,
  worker: (index: number) => Promise<T>,
): Promise<T[]> {
  const results = new Array<T>(count);
  let next = 0;
  const run = async () => {
    while (next < count) {
      const index = next++;
      results[index] = await worker(index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, count) }, () => run()),
  );
  return results;
}

/**
 * Run a worklist: each item is done when its check passes. Items that already
 * pass are skipped, each remaining item gets one bounded agent session per
 * attempt, and the parent re-runs the check after every session. Re-running a
 * batch resumes it, because the check decides what is left.
 */
export async function runBatch(
  items: string[],
  options: BatchRunOptions,
  deps: BatchDeps,
): Promise<BatchReport> {
  const log = deps.log ?? (() => {});
  const vendors = options.vendors.length > 0 ? options.vendors : [undefined];
  const vendorName = (index: number) => vendors[index] ?? "configured vendor";

  const initial = await mapLimit(items.length, options.concurrency, (index) =>
    deps.check(items[index] as string),
  );
  const unavailable = initial.find((result) => result.unavailable);
  if (unavailable) {
    throw new Error(`The check command could not run: ${unavailable.output}`);
  }

  const results: BatchItemResult[] = items.map((item, index) => ({
    item,
    status: initial[index]?.ok ? "already-passing" : "not-run",
    attempts: 0,
  }));
  const queue = results.flatMap((result, index) =>
    result.status === "not-run" ? [index] : [],
  );
  log(
    `${items.length} items: ${items.length - queue.length} already pass, ${queue.length} to run`,
  );

  let vendorIndex = 0;
  let consecutiveVendorFailures = 0;
  let stopped: string | undefined;

  const runItem = async (index: number): Promise<void> => {
    const result = results[index] as BatchItemResult;
    let feedback = initial[index]?.output ?? "";
    while (result.attempts < options.maxAttempts && !stopped) {
      const usedVendorIndex = vendorIndex;
      result.vendor = vendors[usedVendorIndex];
      const code = await deps.dispatch({
        item: result.item,
        index,
        attempt: result.attempts + 1,
        vendor: vendors[usedVendorIndex],
        feedback,
      });
      if (isStopCode(code)) {
        stopped ??= "the run was cancelled or reached its deadline";
        break;
      }
      if (isVendorFailure(code)) {
        result.detail = `${vendorName(usedVendorIndex)} exited with code ${code}`;
        // A failure on a vendor the batch already left is only retried.
        if (usedVendorIndex !== vendorIndex) continue;
        consecutiveVendorFailures++;
        if (consecutiveVendorFailures < VENDOR_FAILURE_LIMIT) continue;
        if (vendorIndex + 1 < vendors.length) {
          log(
            `${vendorName(vendorIndex)} failed ${consecutiveVendorFailures} runs in a row; switching to ${vendorName(vendorIndex + 1)}`,
          );
          vendorIndex++;
          consecutiveVendorFailures = 0;
          continue;
        }
        stopped ??= `${vendorName(vendorIndex)} failed ${consecutiveVendorFailures} runs in a row and no fallback vendor remains`;
        break;
      }
      if (usedVendorIndex === vendorIndex) consecutiveVendorFailures = 0;
      result.attempts++;
      const checked = await deps.check(result.item);
      if (checked.ok) {
        result.status = "fixed";
        result.detail = undefined;
        log(`fixed: ${result.item}`);
        return;
      }
      feedback = checked.output;
      result.detail = checked.output;
    }
    // Zero attempts means no agent run reached the check: the item is untried.
    if (result.attempts > 0) {
      result.status = "failed";
      log(`failed: ${result.item}`);
    }
  };

  await mapLimit(queue.length, options.concurrency, (position) =>
    runItem(queue[position] as number),
  );

  const counts: Record<BatchItemStatus, number> = {
    "already-passing": 0,
    fixed: 0,
    failed: 0,
    "not-run": 0,
  };
  for (const result of results) counts[result.status]++;
  return {
    ok: counts.failed === 0 && counts["not-run"] === 0,
    total: items.length,
    counts,
    ...(stopped ? { stopped } : {}),
    items: results,
  };
}

/** One item per line; blank lines and `#` comments are skipped, duplicates dropped. */
export function parseBatchItems(content: string): string[] {
  const items = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return [...new Set(items)];
}

/** Split the check into argv and require the item placeholder. */
export function parseCheckTemplate(check: string): string[] {
  const argv = splitArgs(check);
  if (argv.length === 0) throw new Error("--check must name a command.");
  if (!argv.some((token) => token.includes(ITEM_PLACEHOLDER))) {
    throw new Error(
      `--check must contain ${ITEM_PLACEHOLDER}; without it every item runs the same check.`,
    );
  }
  return argv;
}

export function renderCheck(template: string[], item: string): string[] {
  return template.map((token) => token.replaceAll(ITEM_PLACEHOLDER, item));
}

export function renderBatchPrompt(
  template: string,
  item: string,
  check: string[],
  feedback: string,
): string {
  return `${template.replaceAll(ITEM_PLACEHOLDER, item).trimEnd()}

## Completion check
The parent runs this command after you finish. This item is done only when it exits 0:
    ${check.join(" ")}
It currently fails with:
${feedback || "(no output)"}
`;
}

function runCheck(
  template: string[],
  item: string,
  cwd: string,
): Promise<CheckResult> {
  const [command, ...args] = renderCheck(template, item);
  return new Promise((resolve) => {
    const child = spawn(command as string, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const keep = (chunk: Buffer) => {
      output = (output + chunk.toString("utf8")).slice(-CHECK_OUTPUT_LIMIT);
    };
    child.stdout?.on("data", keep);
    child.stderr?.on("data", keep);
    child.once("error", (error) => {
      resolve({ ok: false, output: error.message, unavailable: true });
    });
    child.once("close", (code) => {
      resolve({ ok: code === 0, output: output.trim() });
    });
  });
}

/**
 * The vendors a batch moves to when the current one keeps failing. Unlike
 * spawn failover, which continues one half-done run from a checkpoint, a batch
 * re-runs an item from its check, so every vendor named here is acceptable.
 */
export function parseFallbackVendors(
  value: string | undefined,
  primaryVendor: string,
): { vendors: string[]; rejected: string[] } {
  const vendors: string[] = [];
  const rejected: string[] = [];
  for (const raw of value?.split(",") ?? []) {
    const vendor = raw.trim().toLowerCase();
    if (!vendor) continue;
    if (vendor === primaryVendor || vendors.includes(vendor)) {
      rejected.push(`${vendor}: duplicate or primary vendor`);
    } else if (!(ALL_CLI_VENDORS as readonly string[]).includes(vendor)) {
      rejected.push(`${vendor}: unknown vendor`);
    } else {
      vendors.push(vendor);
    }
  }
  return { vendors, rejected };
}

export interface BatchCommandOptions extends ExecutionOptions {
  items: string;
  check: string;
  vendor?: string;
  fallbackVendors?: string;
  modelId?: string;
  editOnly?: boolean;
  concurrency?: string;
  maxAttempts?: string;
  sessionId?: string;
  workspace?: string;
  dryRun?: boolean;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `Expected a positive integer, got ${JSON.stringify(value)}`,
    );
  }
  return parsed;
}

export async function batchRun(
  agentId: string,
  promptTemplate: string,
  options: BatchCommandOptions,
): Promise<void> {
  const root = resolveProjectRoot(process.cwd());
  const workspace = path.resolve(options.workspace ?? ".");
  const template = fs.readFileSync(promptTemplate, "utf8");
  if (!template.includes(ITEM_PLACEHOLDER)) {
    throw new Error(
      `${promptTemplate} must contain ${ITEM_PLACEHOLDER}; without it every item gets the same prompt.`,
    );
  }
  const items = parseBatchItems(
    fs.readFileSync(options.items === "-" ? 0 : options.items, "utf8"),
  );
  if (items.length === 0) throw new Error("No items to run.");
  const check = parseCheckTemplate(options.check);
  const concurrency = positiveInteger(options.concurrency, 3);
  const maxAttempts = positiveInteger(options.maxAttempts, 2);

  const { vendor: primaryVendor } = resolveVendor(agentId, options.vendor);
  const fallback = parseFallbackVendors(options.fallbackVendors, primaryVendor);
  for (const rejected of fallback.rejected) {
    console.warn(`[batch] Fallback vendor ignored: ${rejected}`);
  }
  // An unset --vendor keeps the configured vendor for the first leg.
  const vendors = [options.vendor, ...fallback.vendors];

  if (options.dryRun) {
    const report = await runBatch(
      items,
      { concurrency, maxAttempts: 0, vendors },
      {
        check: (item) => runCheck(check, item, workspace),
        dispatch: async () => 0,
      },
    );
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(
    agentsPathFromRoot(root, AGENTS_RESULTS_DIR),
    `batch-${stamp}-${randomUUID().slice(0, 8)}`,
  );
  const sessionId = options.sessionId ?? path.basename(runDir);
  const execution = beginSessionExecution(sessionId, root, options);
  try {
    execution.assertActive();
    fs.mkdirSync(runDir, { recursive: true });
    execution.recordResources([{ kind: "path", id: runDir }]);

    const report = await runBatch(
      items,
      { concurrency, maxAttempts, vendors },
      {
        check: (item) => runCheck(check, item, workspace),
        log: (line) => console.log(`[batch] ${line}`),
        dispatch: ({ item, index, attempt, vendor, feedback }) => {
          const promptFile = path.join(runDir, `${index}-${attempt}.prompt.md`);
          fs.writeFileSync(
            promptFile,
            renderBatchPrompt(
              template,
              item,
              renderCheck(check, item),
              feedback,
            ),
            { mode: 0o600 },
          );
          return dispatchResume(
            {
              taskId: `batch-${index}`,
              agentId,
              workspace,
              vendor,
              prompt: promptFile,
              editOnly: options.editOnly,
              // A model id belongs to the primary vendor's catalog.
              model: vendor === options.vendor ? options.modelId : undefined,
              dependsOn: [],
              status: "ready",
              reason: "batch item",
            },
            sessionId,
            root,
            execution,
          );
        },
      },
    );

    const reportFile = path.join(runDir, "report.json");
    fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
    const { counts } = report;
    console.log(
      `[batch] ${report.total} items: ${counts["already-passing"]} already passing, ${counts.fixed} fixed, ${counts.failed} failed, ${counts["not-run"]} not run`,
    );
    if (report.stopped) console.log(`[batch] Stopped: ${report.stopped}`);
    for (const result of report.items) {
      if (result.status === "failed" || result.status === "not-run") {
        console.log(`[batch]   ${result.status}: ${result.item}`);
      }
    }
    console.log(`[batch] Report: ${reportFile}`);
    if (!report.ok) process.exitCode = 1;
    execution.assertActive();
  } finally {
    execution.dispose();
  }
}
