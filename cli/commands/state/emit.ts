import type { Command } from "commander";
import {
  emitEventWithMemory,
  getActiveSid,
  readIndex,
} from "../../state/events.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";

export interface EmitOptions {
  sid?: string;
  category?: string;
  vendor?: string;
  vendorSid?: string;
  parentEventId?: string;
  causalityKey?: string;
  ts?: string;
}

export function parsePayload(
  raw?: string,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("payload must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function resolveEmitSid(
  projectDir: string,
  options: Pick<EmitOptions, "sid" | "category">,
): string {
  if (options.sid) return options.sid;
  const sid = getActiveSid(readIndex(projectDir), options.category ?? "main");
  if (!sid) {
    throw new Error(
      "No active L1 session found. Pass --sid or run a workflow first.",
    );
  }
  return sid;
}

export function registerEmit(program: Command): void {
  addOutputOptions(
    program
      .command("state:emit <kind> [payload]")
      .description("Append an OMA L1 workflow event")
      .option("--sid <sid>", "Target session id")
      .option("--category <category>", "Active category lookup", "main")
      .option("--vendor <vendor>", "Runtime/vendor name")
      .option("--vendor-sid <vendorSid>", "Runtime/vendor session id")
      .option("--parent-event-id <eventId>", "Parent event id")
      .option("--causality-key <key>", "Causality grouping key")
      .option("--ts <iso>", "Override event timestamp"),
  ).action(
    runAction(
      async (kind: string, payloadRaw: string | undefined, options) => {
        const jsonMode = resolveJsonMode(options);
        const emitOptions = options as EmitOptions;
        const sid = resolveEmitSid(process.cwd(), emitOptions);
        const event = await emitEventWithMemory(process.cwd(), sid, {
          kind,
          ts: emitOptions.ts,
          vendor: emitOptions.vendor,
          vendorSid: emitOptions.vendorSid,
          parentEventId: emitOptions.parentEventId,
          causalityKey: emitOptions.causalityKey,
          payload: parsePayload(payloadRaw),
        });

        if (jsonMode) {
          console.log(JSON.stringify(event, null, 2));
        } else {
          console.log(`Emitted ${event.kind} ${event.eventId} -> ${sid}`);
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
