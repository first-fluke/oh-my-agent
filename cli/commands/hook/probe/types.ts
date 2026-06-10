import type { ProbeVendor } from "./vendor-cases.js";

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
