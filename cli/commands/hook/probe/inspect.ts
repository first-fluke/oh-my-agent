import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProbeStatus, VendorProbeResult } from "./types.js";
import { type ProbeVendor, VENDOR_CASES } from "./vendor-cases.js";

function hookPath(hooksDir: string, hook: string): string {
  return join(hooksDir, hook);
}

export function runHook(
  hooksDir: string,
  hook: string,
  input: Record<string, unknown>,
  env: Record<string, string>,
  cwd: string,
): { ok: boolean; stdout: string } {
  const result = spawnSync("bun", [hookPath(hooksDir, hook)], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 15000,
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "" };
}

export function classifyInjection(
  vendor: ProbeVendor,
  raw: string,
): { ok: boolean; field: string; context: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, field: "(no output)", context: null };
  if (vendor === "kiro") {
    return { ok: true, field: "stdout", context: trimmed };
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return { ok: false, field: "(invalid json)", context: null };
  }

  if (vendor === "antigravity") {
    // agy injects via PreInvocation `injectSteps[].ephemeralMessage`.
    const steps = parsed.injectSteps;
    const first = Array.isArray(steps)
      ? (steps[0] as Record<string, unknown> | undefined)
      : undefined;
    const ctx = first?.ephemeralMessage ?? first?.userMessage;
    return {
      ok: typeof ctx === "string",
      field: "injectSteps[].ephemeralMessage",
      context: typeof ctx === "string" ? ctx : null,
    };
  }

  const vendorCase = VENDOR_CASES[vendor];
  if (vendorCase.usesHookSpecificOutput) {
    const hso = parsed.hookSpecificOutput as
      | Record<string, unknown>
      | undefined;
    const context = hso?.additionalContext;
    const ok =
      typeof context === "string" &&
      hso?.hookEventName === vendorCase.expectedHookEvent;
    return {
      ok,
      field: "hookSpecificOutput.additionalContext",
      context: typeof context === "string" ? context : null,
    };
  }

  const fields = vendorCase.injectionFields;
  const ok = fields.every((field) => typeof parsed[field] === "string");
  const context = parsed[fields[0] as string];
  return {
    ok,
    field: fields.join(" + "),
    context: typeof context === "string" ? context : null,
  };
}

export function readChainOrder(
  projectDir: string,
  vendor: ProbeVendor,
): { chain: string[]; fromVariants: boolean } {
  const variantPath = join(
    projectDir,
    ".agents",
    "hooks",
    "variants",
    `${vendor}.json`,
  );
  if (!existsSync(variantPath)) return { chain: [], fromVariants: false };
  try {
    const variant = JSON.parse(readFileSync(variantPath, "utf-8")) as {
      events?: Record<string, unknown>;
    };
    const entry = variant.events?.[VENDOR_CASES[vendor].promptEvent];
    const list = Array.isArray(entry) ? entry : entry ? [entry] : [];
    const chain = list
      .map((item) => (item as { hook?: string }).hook)
      .filter((hook): hook is string => typeof hook === "string");
    return { chain, fromVariants: true };
  } catch {
    return { chain: [], fromVariants: false };
  }
}

export function readActiveSid(projectDir: string): string | null {
  const path = join(projectDir, ".agents", "state", "sessions", "_index.json");
  if (!existsSync(path)) return null;
  try {
    const index = JSON.parse(readFileSync(path, "utf-8")) as {
      active?: Record<string, string>;
    };
    return index.active?.main ?? null;
  } catch {
    return null;
  }
}

export function readEventKinds(projectDir: string, sid: string): string[] {
  const path = join(
    projectDir,
    ".agents",
    "state",
    "sessions",
    sid,
    "events.jsonl",
  );
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return (JSON.parse(line) as { kind?: string }).kind ?? "";
      } catch {
        return "";
      }
    });
}

export function deriveStatus(
  result: Omit<VendorProbeResult, "status">,
): ProbeStatus {
  if (!result.invoked || !result.stdinAccepted) return "failed";
  if (result.injection.ok && result.eventsRecorded && result.reopenFlush) {
    return "verified";
  }
  return "partial";
}
