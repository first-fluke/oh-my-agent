import type { Command } from "commander";
import { VENDORS } from "../../constants/vendors.js";
import { runAction } from "../../utils/cli-framework.js";
import { extractSessionId } from "./adapters.js";
import {
  PROBE_VENDORS,
  type ProbeVendor,
  renderProbeMatrix,
  renderProbeMatrixMarkdown,
  runHookProbe,
} from "./probe.js";
import { selectTransport } from "./transport.js";
import type { HookRequest, Vendor } from "./types.js";

const PROBE_FORMATS = ["text", "md", "json"] as const;
type ProbeFormat = (typeof PROBE_FORMATS)[number];

function parseFormat(value: string | undefined): ProbeFormat {
  const normalized = (value ?? "text").trim().toLowerCase();
  if (!PROBE_FORMATS.includes(normalized as ProbeFormat)) {
    throw new Error(
      `invalid format: ${value}. Expected one of ${PROBE_FORMATS.join(", ")}`,
    );
  }
  return normalized as ProbeFormat;
}

function parseVendors(value: string | undefined): ProbeVendor[] | undefined {
  if (!value) return undefined;
  const requested = value
    .split(",")
    .map((vendor) => vendor.trim().toLowerCase())
    .filter(Boolean);
  const invalid = requested.filter(
    (vendor) => !PROBE_VENDORS.includes(vendor as ProbeVendor),
  );
  if (invalid.length > 0) {
    throw new Error(
      `unknown vendor(s): ${invalid.join(", ")}. Valid: ${PROBE_VENDORS.join(", ")}`,
    );
  }
  return requested as ProbeVendor[];
}

// Vendors write the hook payload and close stdin immediately; if the write end
// of the pipe is held open (observed with Codex UserPromptSubmit spawns), an
// unbounded read blocks until the vendor's hook timeout kills the process.
// Fail-open: after this budget, dispatch with whatever has been received.
const STDIN_READ_TIMEOUT_MS = 2_000;

async function readAllStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.pause();
      resolve(Buffer.concat(chunks).toString("utf-8"));
    };
    const timer = setTimeout(finish, STDIN_READ_TIMEOUT_MS);
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
  });
}

export function registerHook(program: Command): void {
  // ---------------------------------------------------------------------------
  // oma hook — canonical ABI for vendor hook dispatch (design 019).
  // Each vendor hook event invokes: oma hook --vendor <v> --event <e> [--matcher <m>]
  // stdin = vendor raw payload; stdout = vendor dialect or empty; exit always 0.
  // ---------------------------------------------------------------------------
  program
    .command("hook")
    .description(
      "Dispatch a vendor hook event through the centralised oma hook router (design 019)",
    )
    .requiredOption(
      "--vendor <v>",
      `Vendor identity (one of: ${VENDORS.join(", ")})`,
    )
    .requiredOption(
      "--event <e>",
      "Native hook event name from the vendor registration",
    )
    .option(
      "--matcher <m>",
      "Optional tool name / matcher forwarded from the hook registration",
    )
    .action(
      runAction(async (options) => {
        const vendorRaw = (options.vendor as string).trim().toLowerCase();
        const nativeEvent = (options.event as string).trim();
        const matcher = options.matcher as string | undefined;

        // Validate --vendor against the VENDORS whitelist.
        if (!VENDORS.includes(vendorRaw as (typeof VENDORS)[number])) {
          process.stderr.write(
            `oma hook: unknown vendor "${vendorRaw}". Valid: ${VENDORS.join(", ")}\n`,
          );
          // fail-open: exit 0, write nothing to stdout
          return;
        }

        const vendor = vendorRaw as Vendor;

        let rawStdin = "";
        try {
          rawStdin = await readAllStdin();
        } catch {
          // fail-open: proceed with empty stdin
        }

        const cwd = process.cwd();
        const sid = extractSessionId(vendor, rawStdin);

        const req: HookRequest = {
          vendor,
          nativeEvent,
          matcher,
          rawStdin,
          cwd,
          sid,
        };

        // selectTransport: probes for daemon socket (OMA_HOOK_SOCKET or per-project
        // default) with a 200ms connect timeout; falls back to InProcessTransport
        // today since SocketTransport is not yet implemented (design 019 §2.7).
        const transport = await selectTransport({ cwd });

        try {
          const response = await transport.dispatch(req);
          if (response.output) {
            process.stdout.write(response.output);
          }
        } catch {
          // fail-open: any error → write nothing to stdout, warn to stderr.
          // A legitimate block result is NOT an error — it returns normally.
          process.stderr.write(
            `oma hook: dispatch error for vendor=${vendor} event=${nativeEvent} (fail-open)\n`,
          );
        }
        // Always exit 0 (process.exitCode default is 0).
      }),
    );

  program
    .command("hook:probe")
    .description(
      "Probe per-vendor L1 hook compatibility and print a matrix (D63)",
    )
    .option(
      "--vendor <list>",
      `Comma-separated vendors (default: ${PROBE_VENDORS.join(",")})`,
    )
    .option("--format <fmt>", "Output format: text | md | json", "text")
    .option("--hooks-dir <dir>", "Override the .agents/hooks/core directory")
    .action(
      runAction(async (options) => {
        const format = parseFormat(options.format as string | undefined);
        const matrix = runHookProbe({
          vendors: parseVendors(options.vendor as string | undefined),
          hooksDir: options.hooksDir as string | undefined,
        });

        if (format === "json") {
          console.log(JSON.stringify(matrix, null, 2));
        } else if (format === "md") {
          console.log(renderProbeMatrixMarkdown(matrix));
        } else {
          console.log(renderProbeMatrix(matrix));
        }

        if (matrix.results.some((result) => result.status === "failed")) {
          process.exitCode = 1;
        }
      }),
    );
}
