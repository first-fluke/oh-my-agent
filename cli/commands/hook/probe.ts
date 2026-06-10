import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyInjection,
  deriveStatus,
  readActiveSid,
  readChainOrder,
  readEventKinds,
  runHook,
} from "./probe/inspect.js";
import type { HookProbeMatrix, VendorProbeResult } from "./probe/types.js";
import {
  PROBE_VENDORS,
  type ProbeVendor,
  VENDOR_CASES,
} from "./probe/vendor-cases.js";

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

export {
  renderProbeMatrix,
  renderProbeMatrixMarkdown,
} from "./probe/render.js";
export type {
  HookProbeMatrix,
  ProbeStatus,
  VendorProbeResult,
} from "./probe/types.js";
export { PROBE_VENDORS, type ProbeVendor } from "./probe/vendor-cases.js";

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
