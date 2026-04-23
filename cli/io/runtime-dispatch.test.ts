import { describe, expect, it, vi } from "vitest";
import { detectRuntimeVendor, planDispatch } from "./runtime-dispatch.js";

const minimalVendorConfig = {
  command: "oma-agent",
  prompt_flag: "-p",
};

describe("detectRuntimeVendor", () => {
  it("returns 'qwen' when OMA_RUNTIME_VENDOR=qwen", () => {
    expect(detectRuntimeVendor({ OMA_RUNTIME_VENDOR: "qwen" })).toBe("qwen");
  });

  it("returns 'qwen' when QWEN_CODE_API_KEY is present in env", () => {
    expect(detectRuntimeVendor({ QWEN_CODE_API_KEY: "sk-test" })).toBe("qwen");
  });

  it("returns 'qwen' when QWEN_CODE=1", () => {
    expect(detectRuntimeVendor({ QWEN_CODE: "1" })).toBe("qwen");
  });

  it("returns 'antigravity' when ANTIGRAVITY_IDE=1", () => {
    expect(detectRuntimeVendor({ ANTIGRAVITY_IDE: "1" })).toBe("antigravity");
  });

  it("returns 'claude' when CLAUDECODE=1", () => {
    expect(detectRuntimeVendor({ CLAUDECODE: "1" })).toBe("claude");
  });

  it("returns 'unknown' when no known env vars are present", () => {
    expect(detectRuntimeVendor({})).toBe("unknown");
  });
});

describe("planDispatch — forced-external runtimes", () => {
  it("returns mode:'external' for qwen runtime", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "qwen" },
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("qwen");
    expect(plan.reason).toBe("qwen runtime has no native parallel dispatch");
    warnSpy.mockRestore();
  });

  it("returns mode:'external' for antigravity runtime", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { OMA_RUNTIME_VENDOR: "antigravity" },
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("antigravity");
    expect(plan.reason).toBe(
      "antigravity runtime has no native parallel dispatch",
    );
    warnSpy.mockRestore();
  });

  it("prints a WARN message when forced to external for qwen", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    planDispatch("test-agent", "claude", minimalVendorConfig, "-p", "hello", {
      OMA_RUNTIME_VENDOR: "qwen",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[runtime-dispatch] qwen runtime: all agents dispatched as external subprocess",
    );
    warnSpy.mockRestore();
  });

  it("prints a WARN message when forced to external for antigravity", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    planDispatch("test-agent", "claude", minimalVendorConfig, "-p", "hello", {
      OMA_RUNTIME_VENDOR: "antigravity",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[runtime-dispatch] antigravity runtime: all agents dispatched as external subprocess",
    );
    warnSpy.mockRestore();
  });
});

describe("planDispatch — regression: native paths unaffected", () => {
  it("claude runtime + claude target → mode:'native'", () => {
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      { CLAUDECODE: "1" },
    );
    expect(plan.mode).toBe("native");
    expect(plan.runtimeVendor).toBe("claude");
  });

  it("unknown runtime + claude target → mode:'external' (cross-vendor path)", () => {
    const plan = planDispatch(
      "test-agent",
      "claude",
      minimalVendorConfig,
      "-p",
      "hello",
      {},
    );
    expect(plan.mode).toBe("external");
    expect(plan.runtimeVendor).toBe("unknown");
  });
});
