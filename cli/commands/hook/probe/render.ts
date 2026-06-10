import type { HookProbeMatrix, ProbeStatus } from "./types.js";

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
