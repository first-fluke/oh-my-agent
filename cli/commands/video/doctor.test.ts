import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMptProjectStatus } from "./internal/mpt-project.js";
import {
  checkMptProject,
  checkNode,
  checkPixelle,
  checkRemotionProject,
} from "./internal/readiness.js";
import { getRemotionProjectStatus } from "./internal/remotion-project.js";

// The subprocess/network checks (ffmpeg, voicebox, oma-image, cap) are exercised
// end-to-end by the doctor command; here we cover the pure/synchronous checks
// and the env-gated Pixelle branch so the determinism stays clock/network-free.
describe("video readiness checks (pure)", () => {
  const original = process.env.RUNNINGHUB_API_KEY;

  beforeEach(() => {
    delete process.env.RUNNINGHUB_API_KEY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RUNNINGHUB_API_KEY;
    else process.env.RUNNINGHUB_API_KEY = original;
  });

  it("reports Node as present with the runtime version", () => {
    const node = checkNode();
    expect(node.name).toBe("node");
    expect(node.ok).toBe(true);
    expect(node.detail).toBe(process.version);
  });

  it("marks Pixelle off by default without RUNNINGHUB_API_KEY", () => {
    const pixelle = checkPixelle();
    expect(pixelle.ok).toBe(false);
    expect(pixelle.detail).toBe("off by default");
    expect(pixelle.remediation).toContain("RUNNINGHUB_API_KEY");
  });

  it("marks Pixelle ready when RUNNINGHUB_API_KEY is present", () => {
    process.env.RUNNINGHUB_API_KEY = "rh-test";
    const pixelle = checkPixelle();
    expect(pixelle.ok).toBe(true);
    expect(pixelle.detail).toContain("RUNNINGHUB_API_KEY present");
  });

  it("reports the remotion project readiness consistently", () => {
    // ok reflects deps installed AND the Chrome Headless Shell downloaded (the
    // real render needs both); a not-ready case must carry the --install
    // remediation (which provisions deps + headless shell).
    const status = getRemotionProjectStatus();
    const check = checkRemotionProject();
    expect(check.name).toBe("remotion-project");
    expect(check.ok).toBe(status.installed && status.browserReady);
    if (!check.ok) {
      expect(check.remediation).toBeDefined();
      if (status.dir) {
        expect(check.remediation).toContain("--install");
      }
    } else {
      expect(check.detail).toContain("ready");
    }
  });

  it("reports the mpt project readiness consistently", () => {
    // ok reflects the cloned checkout AND its venv being installed (the real MPT
    // branch needs both). A not-ready case must carry the --install-mpt
    // remediation. The checkout lives OUTSIDE the repo, so this is env-gated.
    const status = getMptProjectStatus();
    const check = checkMptProject();
    expect(check.name).toBe("mpt-project");
    expect(check.ok).toBe(status.installed);
    if (!check.ok) {
      expect(check.remediation).toBeDefined();
      expect(check.remediation).toContain("--install-mpt");
    } else {
      expect(check.detail).toContain("ready");
    }
  });
});
