import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cross-runtime hook compatibility probe (design 013, D63 / PR 0).
 *
 * Runs the real `keyword-detector` and `state-boundary` hooks against each
 * vendor's stdin shape inside an isolated temp project, then reports a
 * capability matrix: hook invocation, stdin acceptance, stdout injection field,
 * L1 event recording, and the close-reopen snapshot flush.
 *
 * SCOPE (important): this exercises OMA's OWN hook behavior — does OMA accept
 * the vendor stdin shape and emit a well-formed injection + L1 events? It does
 * NOT run the real vendor CLI, so a PASS does NOT prove the vendor consumes the
 * injection or executes the hook at runtime. That remains per-vendor live/manual
 * verification. Known gaps: grok ignores passive-hook stdout (no prompt-time
 * injection channel); agy (antigravity) loads hooks from a separate hooks.json
 * and its JSON-hook execution may be feature-flag gated.
 */

// commandcode is deliberately absent: its hook surface has no prompt event
// (only PreToolUse/PostToolUse/Stop per commandcode.ai/docs/hooks/reference),
// and the probe exercises the prompt-injection flow.
export type ProbeVendor =
  | "antigravity"
  | "claude"
  | "codex"
  | "cursor"
  | "gemini"
  | "grok"
  | "kiro"
  | "qwen";

export const PROBE_VENDORS: ProbeVendor[] = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "grok",
  "kiro",
  "qwen",
  "antigravity",
];

interface VendorCase {
  promptEvent: string;
  expectedHookEvent: string;
  injectionFields: string[];
  usesHookSpecificOutput: boolean;
  build(
    projectDir: string,
    vendorSid: string,
    prompt: string,
  ): {
    input: Record<string, unknown>;
    env: Record<string, string>;
  };
}

const VENDOR_CASES: Record<ProbeVendor, VendorCase> = {
  antigravity: {
    promptEvent: "PreInvocation",
    expectedHookEvent: "PreInvocation",
    injectionFields: ["injectSteps[].ephemeralMessage"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "PreInvocation",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: { ANTIGRAVITY_PROJECT_DIR: projectDir },
    }),
  },
  claude: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        sessionId: vendorSid,
        prompt,
      },
      env: { CLAUDE_PROJECT_DIR: projectDir },
    }),
  },
  codex: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        session_id: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: {},
    }),
  },
  cursor: {
    promptEvent: "beforeSubmitPrompt",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext", "additional_context"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "beforeSubmitPrompt",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: {},
    }),
  },
  gemini: {
    promptEvent: "BeforeAgent",
    expectedHookEvent: "BeforeAgent",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "BeforeAgent",
        sessionId: vendorSid,
        prompt,
      },
      env: { GEMINI_PROJECT_DIR: projectDir },
    }),
  },
  grok: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hookEventName: "user_prompt_submit",
        sessionId: vendorSid,
        cwd: projectDir,
        workspaceRoot: projectDir,
        prompt,
      },
      env: { GROK_WORKSPACE_ROOT: projectDir },
    }),
  },
  kiro: {
    promptEvent: "userPromptSubmit",
    expectedHookEvent: "userPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "userPromptSubmit",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: { KIRO_PROJECT_DIR: projectDir },
    }),
  },
  qwen: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        sessionId: vendorSid,
        prompt,
      },
      env: { QWEN_PROJECT_DIR: projectDir },
    }),
  },
};

export type ProbeStatus = "verified" | "partial" | "failed";

export interface VendorProbeResult {
  vendor: ProbeVendor;
  invoked: boolean;
  stdinAccepted: boolean;
  injection: { ok: boolean; field: string };
  eventsRecorded: boolean;
  reopenFlush: boolean;
  chainOrder: string[];
  status: ProbeStatus;
  notes: string[];
}

export interface HookProbeMatrix {
  hooksDir: string;
  generatedFromVariants: boolean;
  results: VendorProbeResult[];
}

function hookPath(hooksDir: string, hook: string): string {
  return join(hooksDir, hook);
}

function runHook(
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

function classifyInjection(
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

function readChainOrder(
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

function readActiveSid(projectDir: string): string | null {
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

function readEventKinds(projectDir: string, sid: string): string[] {
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

function deriveStatus(result: Omit<VendorProbeResult, "status">): ProbeStatus {
  if (!result.invoked || !result.stdinAccepted) return "failed";
  if (result.injection.ok && result.eventsRecorded && result.reopenFlush) {
    return "verified";
  }
  return "partial";
}

export function probeVendor(
  vendor: ProbeVendor,
  options: { hooksDir: string; sourceProjectDir: string },
): VendorProbeResult {
  const notes: string[] = [];
  const probeDir = mkdtempSync(join(tmpdir(), `oma-hook-probe-${vendor}-`));
  // resolveGitRoot pins to the dir containing `.git`; a marker isolates state.
  mkdirSync(join(probeDir, ".git"), { recursive: true });

  const { chain, fromVariants } = readChainOrder(
    options.sourceProjectDir,
    vendor,
  );
  if (!fromVariants) notes.push("variant file missing; chain order unknown");

  try {
    const vendorCase = VENDOR_CASES[vendor];
    const first = vendorCase.build(probeDir, `${vendor}-session-1`, "work");

    const keyword = runHook(
      options.hooksDir,
      "keyword-detector.ts",
      first.input,
      first.env,
      probeDir,
    );
    const boundary = runHook(
      options.hooksDir,
      "state-boundary.ts",
      first.input,
      first.env,
      probeDir,
    );

    const invoked = keyword.ok && boundary.ok;
    if (!keyword.ok) notes.push("keyword-detector exited non-zero");
    if (!boundary.ok) notes.push("state-boundary exited non-zero");

    const injection = classifyInjection(vendor, boundary.stdout);
    const stdinAccepted = boundary.stdout.trim().length > 0;

    const sid = readActiveSid(probeDir);
    const kinds = sid ? readEventKinds(probeDir, sid) : [];
    const eventsRecorded =
      sid !== null &&
      kinds.includes("session.created") &&
      kinds.includes("boundary");
    if (!eventsRecorded) notes.push("L1 events not recorded");

    // Close-reopen: a fresh vendor session id must keep the OMA sid and flush
    // an L1 snapshot containing the existing sid.
    let reopenFlush = false;
    if (sid) {
      const second = vendorCase.build(probeDir, `${vendor}-session-2`, "go");
      const reopened = runHook(
        options.hooksDir,
        "state-boundary.ts",
        second.input,
        second.env,
        probeDir,
      );
      const reopenInjection = classifyInjection(vendor, reopened.stdout);
      const context = reopenInjection.context ?? "";
      reopenFlush =
        readActiveSid(probeDir) === sid &&
        context.includes("[OMA STATE SNAPSHOT]") &&
        context.includes(`sid: ${sid}`);
      if (!reopenFlush) notes.push("close-reopen snapshot flush failed");
    }

    const base: Omit<VendorProbeResult, "status"> = {
      vendor,
      invoked,
      stdinAccepted,
      injection: { ok: injection.ok, field: injection.field },
      eventsRecorded,
      reopenFlush,
      chainOrder: chain,
      notes,
    };
    return { ...base, status: deriveStatus(base) };
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

export function runHookProbe(
  options: {
    vendors?: ProbeVendor[];
    projectDir?: string;
    hooksDir?: string;
  } = {},
): HookProbeMatrix {
  const projectDir = options.projectDir ?? process.cwd();
  const hooksDir =
    options.hooksDir ?? join(projectDir, ".agents", "hooks", "core");
  if (!existsSync(join(hooksDir, "state-boundary.ts"))) {
    throw new Error(
      `OMA hooks not found at ${hooksDir}. Run from a project with .agents/hooks/core or pass --hooks-dir.`,
    );
  }
  const vendors = options.vendors ?? PROBE_VENDORS;
  const results = vendors.map((vendor) =>
    probeVendor(vendor, { hooksDir, sourceProjectDir: projectDir }),
  );
  return {
    hooksDir,
    generatedFromVariants: results.every((r) => r.chainOrder.length > 0),
    results,
  };
}

function statusGlyph(status: ProbeStatus): string {
  if (status === "verified") return "PASS";
  if (status === "partial") return "PARTIAL";
  return "FAIL";
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function renderProbeMatrix(matrix: HookProbeMatrix): string {
  const lines = [
    "OMA hook compatibility probe",
    `hooks: ${matrix.hooksDir}`,
    "PASS = OMA emits a valid injection + L1 events for this stdin shape;",
    "       it does NOT confirm the vendor consumes it (live verification needed).",
    "",
    "vendor       status   invoke  stdin  inject  events  reopen  chain",
    "-----------  -------  ------  -----  ------  ------  ------  -----",
  ];
  for (const r of matrix.results) {
    lines.push(
      [
        r.vendor.padEnd(11),
        statusGlyph(r.status).padEnd(7),
        yesNo(r.invoked).padEnd(6),
        yesNo(r.stdinAccepted).padEnd(5),
        yesNo(r.injection.ok).padEnd(6),
        yesNo(r.eventsRecorded).padEnd(6),
        yesNo(r.reopenFlush).padEnd(6),
        String(r.chainOrder.length),
      ].join("  "),
    );
  }
  const notes = matrix.results.filter((r) => r.notes.length > 0);
  if (notes.length > 0) {
    lines.push("", "notes:");
    for (const r of notes) {
      lines.push(`  ${r.vendor}: ${r.notes.join("; ")}`);
    }
  }
  return lines.join("\n");
}

export function renderProbeMatrixMarkdown(matrix: HookProbeMatrix): string {
  const lines = [
    "# OMA Hook Compatibility Matrix",
    "",
    `Hooks: \`${matrix.hooksDir}\``,
    "",
    "> **PASS = OMA emits a valid injection + L1 events for this vendor's stdin",
    "> shape.** It does NOT confirm the vendor consumes the injection or fires",
    "> the hook at runtime — that is per-vendor live verification. Known gaps:",
    "> grok ignores passive-hook stdout; agy loads hooks from a separate",
    "> hooks.json that may be feature-flag gated.",
    "",
    "| Vendor | Status | Invoke | Stdin | Inject | Events | Reopen | Chain |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const r of matrix.results) {
    lines.push(
      `| ${r.vendor} | ${statusGlyph(r.status)} | ${yesNo(r.invoked)} | ${yesNo(
        r.stdinAccepted,
      )} | ${yesNo(r.injection.ok)} (${r.injection.field}) | ${yesNo(
        r.eventsRecorded,
      )} | ${yesNo(r.reopenFlush)} | ${r.chainOrder.join(" → ") || "(unknown)"} |`,
    );
  }
  return lines.join("\n");
}
