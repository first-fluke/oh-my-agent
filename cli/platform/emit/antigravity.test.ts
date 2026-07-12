import { describe, expect, it } from "vitest";
import { emitAntigravityPlugin } from "./antigravity.js";

describe("emitAntigravityPlugin", () => {
  it("reports deferred status and writes nothing", () => {
    const report = emitAntigravityPlugin();
    expect(report.deferred).toBe(true);
    expect(report.reason).toContain("TODO");
    // Guards against a future implementer accidentally dropping the
    // upstream-pending explanation without updating this assertion.
  });
});
